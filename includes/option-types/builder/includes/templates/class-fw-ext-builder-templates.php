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
		add_action('init', array(__CLASS__, '_action_init'));
	}

	/**
	 * @internal
	 */
	public static function _action_init()
	{
		if (defined('DOING_AJAX') && DOING_AJAX === true) {
			/**
			 * Load and init components
			 * Some of them may have add_action('wp_ajax_...')
			 */
			self::get_components();
		}
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_render()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		$builder_type = (string)FW_Request::POST('builder_type');

		if (!fw()->backend->option_type($builder_type)) {
			wp_send_json_error();
		}

		$first = true;

		$html = '<div class="fw-builder-templates-types">';

		foreach (self::get_components() as $component) {
			$component_html = $component->_render(array('builder_type' => $builder_type));

			if (empty($component_html)) {
				continue;
			}

			$html .=
				'<div class="fw-builder-templates-type fw-builder-templates-type-'. esc_attr($component->get_type()) .'"'.
					' data-type="'. esc_attr($component->get_type()) .'">'
					. '<a class="fw-builder-templates-type-title" href="#" onclick="return false;">'
						. $component->get_title()
					. '</a>'
					. '<div class="fw-builder-templates-type-content'. ($first ? '' : ' fw-hidden') .'">'
						. $component_html
					. '</div>'
				. '</div>';

			$first = false;

			unset($component_html);
		}

		$html .= '</div>';

		wp_send_json_success(array(
			'html' => $html
		));
	}

	/**
	 * @internal
	 */
	public static function _action_builder_enqueue($data)
	{
		if (!
			apply_filters(
				'fw_builder_has_template_saving_feature',
				$data['option']['template_saving'],
				$data['option']
			)
		) {
			return;
		}

		$uri = $data['uri'] .'/includes/templates/static';

		wp_enqueue_style(
			'fw-option-builder-templates',
			$uri .'/styles.css',
			array('fw-option-builder'),
			$data['version']
		);

		wp_enqueue_script(
			'fw-option-builder-templates',
			$uri .'/scripts.js',
			array('fw-option-builder'),
			$data['version'],
			true
		);

		wp_localize_script(
			'fw-option-builder-templates',
			'_fw_option_type_builder_templates',
			array(
				'l10n' => array(
					'templates' => __('Templates', 'fw'),
				),
			)
		);

		foreach (self::get_components() as $component) {
			$component->_enqueue(array('builder_type' => $data['option']['type']));
		}
	}

	public static function register_component(FW_Ext_Builder_Templates_Component $component)
	{
		if (!self::$registration_is_allowed) {
			trigger_error('Registration is not allowed. Tried to register component: '. $component->get_type(), E_USER_ERROR);
		}

		if (isset(self::$components[ $component->get_type() ])) {
			trigger_error('Component already registered: '. $component->get_type(), E_USER_ERROR);
		}

		self::$components[ $component->get_type() ] = $component;
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
