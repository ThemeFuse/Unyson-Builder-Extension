<?php

/**
 * Builder templates functionality
 */
final class FW_Ext_Builder_Templates
{
	/**
	 * @var FW_Ext_Builder_Templates_Component[]
	 */
	private static $components;

	private static $registration_is_allowed = false;

	/**
	 * @internal
	 */
	public static function _init()
	{
		add_action('fw_ext_builder:option_type:builder:enqueue', array(__CLASS__, '_action_builder_enqueue'));
		add_action('wp_ajax_fw_builder_templates_render', array(__CLASS__, '_action_ajax_render'));
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_render()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		$html = array();

		foreach (self::get_components() as $component) {
			$html[] =
				'<div class="fw-builder-template-'. esc_attr($component->get_id()) .'">'
				. $component->_render()
				. '</div>';
		}

		wp_send_json_success(array(
			'html' => implode('', $html)
		));
	}

	/**
	 * @internal
	 */
	public static function _action_builder_enqueue($data)
	{
		if (!$data['option']['template_saving']) {
			return;
		}

		$uri = $data['uri'] .'/includes/templates/static';

		wp_enqueue_style(
			'fw-option-builder-template-saving',
			$uri .'/styles.css',
			array('fw-option-builder'),
			$data['version']
		);

		wp_enqueue_script(
			'fw-option-builder-template-saving',
			$uri .'/scripts.js',
			array('fw-option-builder'),
			$data['version'],
			true
		);

		wp_localize_script(
			'fw-option-builder-template-saving',
			'_fw_option_type_builder_templates',
			array(
				'l10n' => array(
					'templates' => __('Templates', 'fw'),
				),
			)
		);

		foreach (self::get_components() as $component) {
			$component->_enqueue();
		}
	}

	public static function register_component(FW_Ext_Builder_Templates_Component $component)
	{
		if (!self::$registration_is_allowed) {
			trigger_error('Registration is not allowed. Tried to register component: '. $component->get_id(), E_USER_ERROR);
		}

		if (isset(self::$components[ $component->get_id() ])) {
			trigger_error('Component already registered: '. $component->get_id(), E_USER_ERROR);
		}

		self::$components[ $component->get_id() ] = $component;
	}

	/**
	 * @return FW_Ext_Builder_Templates_Component[]
	 */
	private static function get_components()
	{
		if (is_null(self::$components)) {
			self::$components = array();

			self::$registration_is_allowed = true;
			do_action('fw_ext_builder:template_components_register');
			self::$registration_is_allowed = false;

			foreach (self::$components as $component) {
				$component->_init();
			}
		}

		return self::$components;
	}
}

FW_Ext_Builder_Templates::_init();
