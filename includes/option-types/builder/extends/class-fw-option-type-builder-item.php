<?php if ( ! defined( 'FW' ) ) {
	die( 'Forbidden' );
}

abstract class FW_Option_Type_Builder_Item {
	/**
	 * Specify which builder type this item type belongs to
	 * @return string
	 */
	abstract public function get_builder_type();

	/**
	 * The item type
	 * @return string
	 */
	abstract public function get_type();

	/**
	 * The boxes that appear on top of the builder and can be dragged down or clicked to create items
	 * @return array(
	 *  array(
	 *      'html' =>
	 *          '<div class="item-type-icon-title">'.
	 *          '    <div class="item-type-icon"><span class="dashicons dashicons-smiley"></span></div>'.
	 *          '    <div class="item-type-title">Item Title</div>'.
	 *          '</div>',
	 *  ),
	 *  array(
	 *      'tab' => __('Tab Title', 'fw'),
	 *      'html' =>
	 *          '<div class="item-type-icon-title">'.
	 *          '    <div class="item-type-icon"><span class="dashicons dashicons-smiley"></span></div>'.
	 *          '    <div class="item-type-title">Item Title</div>'.
	 *          '</div>',
	 *  ),
	 *  ...
	 * )
	 */
	abstract public function get_thumbnails();

	/**
	 * Enqueue item type scripts and styles
	 */
	abstract public function enqueue_static();

	final public function __construct() {
		// Maybe in the future this method will have some functionality
	}

	/**
	 * @param FW_Access_Key $access_key
	 *
	 * @internal
	 * This must be called right after an instance of builder item type has been created
	 * and was added to the registered array, so it is available through
	 * builder->get_item_types()
	 */
	final public function _call_init( $access_key ) {
		if ( $access_key->get_key() !== 'fw_ext_builder_option_type' ) {
			trigger_error( 'Method call not allowed', E_USER_ERROR );
		}

		if ( method_exists( $this, '_init' ) ) {
			$this->_init();
		}
	}

	/**
	 * @see FW_Option_Type::storage_save()
	 *
	 * @param array $item
	 * @param array $params
	 *
	 * @return array $item
	 * @since 1.2.0
	 */
	final public function storage_save( array $item, array $params = array() ) {
		if ( $this->get_type() === $item['type'] ) {
			return $this->_storage_save( $item, $params );
		} else {
			return $item;
		}
	}

	/**
	 * @see FW_Option_Type::storage_load()
	 *
	 * @param array $item
	 * @param array $params
	 *
	 * @return array
	 * @since 1.2.0
	 */
	final public function storage_load( array $item, array $params = array() ) {
		if ( $this->get_type() === $item['type'] ) {
			return $this->_storage_load( $item, $params );
		} else {
			return $item;
		}
	}

	/**
	 * Overwrite this method if you want to change/fix attributes that comes from js
	 *
	 * @param $attributes array Backbone Item (Model) attributes
	 *
	 * @return mixed
	 */
	public function get_value_from_attributes( $attributes ) {
		return $attributes;
	}

	/**
	 * @see FW_Option_Type::_storage_save()
	 *
	 * @param array $item
	 * @param array $params
	 *
	 * @return array $item
	 * @since 1.2.0
	 * @internal
	 */
	protected function _storage_save( array $item, array $params ) {
		return $item;
	}

	/**
	 * @see FW_Option_Type::_storage_load()
	 *
	 * @param array $item
	 * @param array $params
	 *
	 * @return mixed
	 * @since 1.2.0
	 * @internal
	 */
	protected function _storage_load( array $item, array $params ) {
		return $item;
	}
}
