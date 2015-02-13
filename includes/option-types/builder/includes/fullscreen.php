<?php

/**
 * Builder FullScreen functionality
 * @internal
 */
final class _FW_Ext_Builder_Fullscreen
{
	public static function init()
	{
		add_action('wp_ajax_fw_builder_fullscreen_set_storage_item', array(__CLASS__, '_action_ajax_set_storage_item'));
		add_action('wp_ajax_fw_builder_fullscreen_unset_storage_item', array(__CLASS__, '_action_ajax_unset_storage_item'));

		add_filter('fw_builder_fullscreen_add_classes', array(__CLASS__, '_filter_add_builder_classes'));
		add_action('fw_builder_fullscreen_add_backdrop', array(__CLASS__, '_action_add_builder_backdrop'));
	}

	private static function get_storage_items()
	{
		return fw_get_db_extension_data('builder', 'fullscreen', array());
	}

	private static function set_storage_items($items)
	{
		fw_set_db_extension_data('builder', 'fullscreen', $items);
	}

	public static function _action_ajax_set_storage_item()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		self::set_storage_items(
			array_unique(
				array_merge(
					self::get_storage_items(),
					array( (int)FW_Request::POST('post_id') )
				)
			)
		);

		wp_send_json_success();
	}

	public static function _action_ajax_unset_storage_item()
	{
		if (!current_user_can('edit_posts')) {
			wp_send_json_error();
		}

		$storage_items = self::get_storage_items();
		$key = array_search(
			(int)FW_Request::POST('post_id'),
			$storage_items
		);
		unset($storage_items[$key]);

		self::set_storage_items($storage_items);

		wp_send_json_success();
	}

	public static function is_fullscreen_on()
	{
		$post_id = get_the_ID();
		return (false !== $post_id && in_array($post_id, self::get_storage_items()));
	}

	public static function _filter_add_builder_classes($str)
	{
		return self::is_fullscreen_on() ? ($str . ' builder-fullscreen') : $str;
	}

	public static function _action_add_builder_backdrop()
	{
		echo
		'<div class="fw-option-type-builder-fullscreen-backdrop' . (self::is_fullscreen_on() ? '' : ' fw-hidden') . '" >'.
		'    <div class="buttons-wrapper">'.
		'        <span class="spinner"></span>'.
		'        <a class="preview button">'. __('Preview Changes', 'fw') .'</a>'.
		'        <a class="button button-primary">'. __('Update', 'fw') .'</a>'.
		'    </div>'.
		'</div>';
	}
}

_FW_Ext_Builder_Fullscreen::init();

