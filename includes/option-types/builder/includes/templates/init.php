<?php if (!defined('FW')) die('Forbidden');

require_once dirname(__FILE__) .'/class-fw-ext-builder-templates-component.php';
require_once dirname(__FILE__) .'/class-fw-ext-builder-templates.php';

foreach (array('full') as $component_id) {
	require_once dirname(__FILE__) .'/components/'. $component_id .'/init.php';
}

FW_Ext_Builder_Templates::_init();