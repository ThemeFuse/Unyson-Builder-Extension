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
		add_action('wp_ajax_fw_builder_load_templates', array(__CLASS__, '_action_ajax_load_templates'));
		add_action('wp_ajax_fw_builder_save_template', array(__CLASS__, '_action_ajax_save_template'));
		add_action('wp_ajax_fw_builder_delete_template', array(__CLASS__, '_action_ajax_delete_template'));

		add_action('fw_ext_builder:option_type:builder:enqueue', array(__CLASS__, '_action_builder_enqueue'));
		add_action('wp_ajax_fw_builder_templates_render', array(__CLASS__, '_action_ajax_render'));
	}

	private static function get_templates($builder_type)
	{
		return fw_get_db_extension_data('builder', 'templates/'. $builder_type, array());
	}

	private static function set_templates($builder_type, $templates)
	{
		fw_set_db_extension_data('builder', 'templates/'. $builder_type, $templates);
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_render()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		wp_send_json_success(array(
			'html' => '<p>Hello World!</p>'
		));
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_load_templates()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		wp_send_json_success(array(
			'templates' => self::get_templates((string)FW_Request::POST('builder_type'))
		));
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_save_template()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		$builder_type = (string)FW_Request::POST('builder_type');
		if (
			empty($builder_type)
			||
			!fw()->backend->option_type($builder_type)
			||
			!(fw()->backend->option_type($builder_type) instanceof FW_Option_Type_Builder)
		) {
			wp_send_json_error();
		}

		$post_title = trim((string)FW_Request::POST('template_name'));
		$post_title = empty($post_title) ? __('No Title', 'fw') : $post_title;

		$template = array('title' => $post_title, 'json' => (string)FW_Request::POST('builder_json'));
		if (empty($template['json'])) {
			wp_send_json_error();
		}

		$templates = self::get_templates($builder_type);

		$id = uniqid() .':'. time();
		$templates[$id] = $template;

		self::set_templates($builder_type, $templates);

		wp_send_json_success(array_merge(array('id' => $id), $template));
	}

	/**
	 * @internal
	 */
	public static function _action_ajax_delete_template()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		$builder_type = (string)FW_Request::POST('builder_type');
		if (
			empty($builder_type)
			||
			!fw()->backend->option_type($builder_type)
			||
			!(fw()->backend->option_type($builder_type) instanceof FW_Option_Type_Builder)
		) {
			wp_send_json_error();
		}

		$templates = self::get_templates($builder_type);
		unset($templates[ (string)FW_Request::POST('uniqid') ]);
		self::set_templates($builder_type, $templates);

		wp_send_json_success();
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
					'no_templates_saved' => __('0 Templates Saved', 'fw'),
					'template_name' => __('Template Name', 'fw'),
					'template_name_desc' => __('Must have at least 3 characters (Whitespace, A-Z, 0-9, -_)', 'fw'),
					'save_template' => __('Save Template', 'fw'),
					'load_template' => __('Load Template', 'fw'),
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
