<?php if ( ! defined( 'FW' ) ) {
	die( 'Forbidden' );
}

spl_autoload_register( '_fw_ext_builder_includes_autoload' );
function _fw_ext_builder_includes_autoload( $class ) {
	switch ( $class ) {
		case 'FW_Option_Type_Builder' :
			require_once dirname( __FILE__ ) . '/option-types/builder/extends/class-fw-option-type-builder.php';
			break;
		case 'FW_Option_Type_Builder_Item' :
			require_once dirname( __FILE__ ) . '/option-types/builder/extends/class-fw-option-type-builder-item.php';
			break;
		case '_FW_Ext_Builder_Fullscreen' :
			require_once dirname( __FILE__ ) . '/option-types/builder/includes/fullscreen.php';
			break;
		case 'FW_Ext_Builder_Templates' :
			require_once dirname( __FILE__ ) . '/option-types/builder/includes/templates/class-fw-ext-builder-templates.php';
			break;
		case 'FW_Ext_Builder_Templates_Component' :
			require_once dirname( __FILE__ ) . '/option-types/builder/includes/templates/class-fw-ext-builder-templates-component.php';
			break;
		case 'FW_Ext_Builder_Templates_Component_Full' :
			require_once dirname( __FILE__ ) . '/option-types/builder/includes/templates/components/full/class-fw-ext-builder-templates-component-full.php';
			break;
	}
}