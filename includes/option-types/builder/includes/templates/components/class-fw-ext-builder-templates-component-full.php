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
		//
	}

	public function _init()
	{
		//
	}
}
