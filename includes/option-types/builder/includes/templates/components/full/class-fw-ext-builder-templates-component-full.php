<?php if (!defined('FW')) die('Forbidden');

class FW_Ext_Builder_Templates_Component_Full extends FW_Ext_Builder_Templates_Component
{
	public function get_id()
	{
		return 'full';
	}

	public function _render()
	{
		return 'Hello';
	}

	public function _enqueue()
	{
		array(
			'no_templates_saved' => __('0 Templates Saved', 'fw'),
			'template_name' => __('Template Name', 'fw'),
			'template_name_desc' => __('Must have at least 3 characters (Whitespace, A-Z, 0-9, -_)', 'fw'),
			'save_template' => __('Save Template', 'fw'),
			'load_template' => __('Load Template', 'fw'),
		);
	}

	public function _init()
	{
		add_action('wp_ajax_fw_builder_load_templates', array(__CLASS__, '_action_ajax_load_templates'));
		add_action('wp_ajax_fw_builder_save_template', array(__CLASS__, '_action_ajax_save_template'));
		add_action('wp_ajax_fw_builder_delete_template', array(__CLASS__, '_action_ajax_delete_template'));
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
}
