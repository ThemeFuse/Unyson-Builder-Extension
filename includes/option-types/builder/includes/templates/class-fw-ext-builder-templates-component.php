<?php

abstract class FW_Ext_Builder_Templates_Component
{
	/**
	 * Unique id
	 * @return string
	 */
	abstract public function get_id();

	/**
	 * @return string HTML for tooltip
	 * @internal
	 */
	abstract public function _render();

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

