### Create new component

* Create a class that extends `FW_Ext_Builder_Templates_Component`

	```php
	class FW_Ext_Builder_Templates_Component_Demo extends FW_Ext_Builder_Templates_Component {
	    // Create all required abstract methods ...
	}
	```

* Register the class on special action

	```php
	add_action('fw_ext_builder:template_components_register', '_action_fw_ext_builder_template_component_demo');
	function _action_fw_ext_builder_template_component_demo() {
		require_once dirname(__FILE__) .'/.../path/to/class.php';

		FW_Ext_Builder_Templates::register_component(
			new FW_Ext_Builder_Templates_Component_Demo()
		);
	}
	```

* In javascript, init the html returned by `FW_Ext_Builder_Templates_Component_Demo::_render()`

	```javascript
	fwEvents.on('fw:option-type:builder:templates:init', function(data){
		data.$elements.find('.fw-builder-templates-type-COMPONENT_TYPE .whatever-element a').on('click', function(){
			alert('Hello World!');
		});
	});
	```