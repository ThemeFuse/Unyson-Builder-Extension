<?php

abstract class FW_Ext_Builder_Templates_Component
{
	/**
	 * Unique type
	 * @return string
	 */
	abstract public function get_type();

	/**
	 * @param array $data {'builder_type': '...'}
	 * @return string HTML for tooltip
	 * @internal
	 */
	abstract public function _render($data);

	/**
	 * Enqueue css and js
	 * @internal
	 */
	abstract public function _enqueue();

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
}

