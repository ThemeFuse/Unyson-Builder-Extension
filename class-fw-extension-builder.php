<?php if (!defined('FW')) die('Forbidden');

class FW_Extension_Builder extends FW_Extension
{
	/**
	 * @internal
	 */
	protected function _init()
	{
		add_action('fw_option_types_init', array($this, '_action_option_types_init'),
			9 // Other option types requires it
		);
		spl_autoload_register(array($this, '_spl_autoload'));
	}

	public function _action_option_types_init() {
		require_once dirname( __FILE__ ) . '/includes/option-types/builder/builder.php';
	}

	/**
	 * Backwards compatibility when builder-types and builder-item-types were registered right away
	 * @param string $class
	 */
	public function _spl_autoload($class) {
		if ('FW_Option_Type_Builder' === $class) {
			$this->_action_option_types_init();

			if (
				is_admin()
				&&
				// https://github.com/ThemeFuse/Unyson-Extensions-Approval/issues/258
				version_compare(fw()->manifest->get_version(), '2.6.2', '>')
			) {
				FW_Flash_Messages::add(
					'builder-option-type-register-wrong',
					__("Please register builder types on 'fw_option_types_init' action", 'fw'),
					'warning'
				);
			}
		} elseif ('FW_Option_Type_Builder_Item' === $class) {
			require_once dirname( __FILE__ ) . '/includes/option-types/builder/extends/class-fw-option-type-builder-item.php';

			if (
				is_admin()
				&&
				// https://github.com/ThemeFuse/Unyson-Extensions-Approval/issues/258
				version_compare(fw()->manifest->get_version(), '2.6.2', '>')
			) {
				FW_Flash_Messages::add(
					'builder-item-type-register-wrong',
					__("Please register builder item-types on 'fw_option_type_builder:{builder-type}:register_items' action", 'fw'),
					'warning'
				);
			}
		}
	}
}