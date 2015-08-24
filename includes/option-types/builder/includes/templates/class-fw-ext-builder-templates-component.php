<?php

abstract class FW_Ext_Builder_Templates_Component
{
	/**
	 * Unique type
	 * @return string
	 */
	abstract public function get_type();

	/**
	 * @return string
	 */
	abstract public function get_title();

	/**
	 * @param array $data {'builder_type': '...'}
	 * @return string HTML for tooltip
	 * @internal
	 */
	abstract public function _render($data);

	/**
	 * Enqueue css and js
	 * @param array $data {'builder_type': '...'}
	 * @internal
	 */
	abstract public function _enqueue($data);

	/**
	 * Called right after the component was fully registered
	 * @internal
	 */
	public function _init() {}

	/**
	 * @param string $builder_type Builder option type
	 * @return bool
	 */
	protected function builder_type_is_valid($builder_type)
	{
		if (
			empty($builder_type)
			||
			!fw()->backend->option_type($builder_type)
			||
			!(fw()->backend->option_type($builder_type) instanceof FW_Option_Type_Builder)
		) {
			return false;
		} else {
			return true;
		}
	}

	/**
	 * @param string $builder_type
	 * @return array|mixed
	 * @since 1.1.14
	 */
	protected function get_predefined_templates($builder_type)
	{
		$cache_id = 'fw_ext_builder/predefined_templates/'. $builder_type .'/'. $this->get_type();

		try {
			return FW_Cache::get($cache_id);
		} catch (FW_Cache_Not_Found_Exception $e) {
			$templates = array();

			foreach(apply_filters('fw_ext_builder:predefined_templates:'. $builder_type .':'. $this->get_type(), array(
				// 'id' => array('title' => 'Title', 'json' => '[]')
			)) as $id => $template) {
				if (
					isset($template['title']) && is_string($template['title'])
					&&
					isset($template['json']) && is_string($template['json']) && null !== json_decode($template['json'])
				) {
					$templates[ $id ] = array(
						'title' => $template['title'],
						'json' => $template['json'],
						'type' => 'predefined'
					);
				} else {
					trigger_error('Invalid predefined template: '. $id, E_USER_WARNING);
				}
			}

			FW_Cache::set($cache_id, $templates);

			return $templates;
		}
	}
}

