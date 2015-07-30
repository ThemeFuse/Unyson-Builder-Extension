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
}

