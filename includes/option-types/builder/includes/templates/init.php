<?php if (!defined('FW')) die('Forbidden');

foreach (array('full') as $component_id) {
	require_once dirname(__FILE__) .'/components/'. $component_id .'/init.php';
}

FW_Ext_Builder_Templates::_init();