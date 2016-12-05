<?php if ( ! defined( 'FW' ) ) {
	die( 'Forbidden' );
}

abstract class FW_Option_Type_Builder extends FW_Option_Type {

	/**
	 * Registered item types of the current builder type
	 * @var array {item-type => item-instance}
	 */
	private static $item_types = array();

	/**
	 * @var FW_Access_Key
	 */
	private static $access_key;

	/**
	 * @param string|FW_Option_Type_Builder_Item $item_type_class
	 * @param $type $item_type_class
	 * @param string $builder_type
	 */
	public static function register_item_type( $item_type_class, $type = null, $builder_type = null ) {
		if ( empty( $type ) || empty( $builder_type ) ) {

			if ( ! is_subclass_of( $item_type_class, 'FW_Option_Type_Builder_Item' ) ) {
				trigger_error( "Invalid builder item type class $item_type_class", E_USER_WARNING );

				return;
			}

			$instance = $item_type_class instanceof FW_Option_Type_Builder_Item
				? $item_type_class
				: self::get_instance( $item_type_class );

			$type         = $instance->get_type();
			$builder_type = $instance->get_builder_type();

			unset( $instance );
		}

		if ( ! isset( self::$item_types[ $builder_type ] ) ) {
			if ( ! is_subclass_of( $item_type_class, 'FW_Option_Type_Builder_Item' ) ) {
				trigger_error( "Invalid builder type $builder_type", E_USER_WARNING );

				return;
			}
		}

		if ( isset( self::$item_types[ $builder_type ][ $type ] ) ) {
			if ( ! is_subclass_of( $item_type_class, 'FW_Option_Type_Builder_Item' ) ) {
				trigger_error( "Builder item type $type is already registered", E_USER_WARNING );

				return;
			}
		}

		if ( apply_filters(
			'fw_ext_builder:option_type:' . $builder_type . ':exclude_item_type:' . $type,
			false
		) ) {
			return;
		}

		self::$item_types[ $builder_type ][ $type ] = $item_type_class;
	}

	/**
	 * @param $type
	 *
	 * @return FW_Option_Type_Builder_Item
	 */
	protected function get_item_type( $type ) {
		try {
			return FW_Cache::get( "fw-option-type-builder:{$this->get_type()}:items:$type" );
		} catch ( FW_Cache_Not_Found_Exception $e ) {
			$instance = $this->get_item_instance( $type );
			FW_Cache::set( "fw-option-type-builder:{$this->get_type()}:items:$type", $instance );

			$instance->_call_init( self::get_access_key() );

			return $instance;
		}
	}

	/**
	 * @return FW_Option_Type_Builder_Item[]
	 */
	protected function get_item_types() {
		static $did_action = false;

		if ( ! $did_action ) {
			/**
			 * @since 1.2.4
			 */
			do_action( 'fw_option_type_builder:' . $this->get_type() . ':register_items' );
			$did_action = true;
		}

		return array_map( array( $this, 'get_item_type' ), array_keys( $this->get_items_classes() ) );
	}

	/**
	 * Get correct value from items
	 *
	 * @param array $items
	 *
	 * @return array
	 */
	public function get_value_from_items( $items ) {
		/**
		 * @var FW_Option_Type_Builder_Item[] $item_types
		 */
		$item_types = $this->get_item_types();

		$fixed_items = array();

		foreach ( $items as $item_attributes ) {
			if ( ! isset( $item_attributes['type'] ) || ! isset( $item_types[ $item_attributes['type'] ] ) ) {
				// invalid item type
				continue;
			}

			$fixed_item_attributes = $item_types[ $item_attributes['type'] ]
				->get_value_from_attributes( $item_attributes );

			if ( isset( $fixed_item_attributes['_items'] ) ) {
				$fixed_item_attributes['_items'] = $this->get_value_from_items( $fixed_item_attributes['_items'] );
			}

			$fixed_items[] = $fixed_item_attributes;
		}

		return $fixed_items;
	}

	/**
	 * @internal
	 */
	public function _get_backend_width_type() {
		return 'full';
	}

	private function fix_base_defaults( $option = array() ) {
		return array_merge( array(
			'fullscreen'      => false,
			'template_saving' => false,
			'history'         => false,
			/**
			 * Enable fixed header so it follows you on scroll down.
			 * It's convenient when you have many elements in builder and it's tedious to:
			 * scroll up -> add element -> scroll down -> configure it -> scroll up -> ...
			 */
			'fixed_header'    => false,
			/**
			 * Enable drag and drop manipulation of every collection from Builder.
			 * Sometimes, when your creating your own builder,
			 * it's convenient to throw it away in order to wire up your own
			 * drag and drop behavior.
			 */
			'drag_and_drop'   => true,

			/**
			 * Builder may be read_only. This may be necessary if we want
			 * to provide some content to user just for presentation,
			 * without the user to be able to interact with the items
			 * or change the way they are alligned.
			 *
			 * This is not some magick option that will make your builder
			 * read-only only by making it true. Every builder is responsible
			 * to give their read-only experience as they want.
			 * That's why it is turned off by default. You may not need this
			 * option.
			 *
			 * This option will add a data-read-only attribute to the builder
			 * if it's set to true. You are responsible to handle it
			 * accordingly in your client-side logic.
			 */
			'read_only'       => false
		),
			$option );
	}

	private function get_static_uri( $append = '' ) {
		return fw()->extensions->get( 'builder' )->get_uri( '/includes/option-types/builder/static' . $append );
	}

	private static function get_access_key() {
		if ( ! self::$access_key ) {
			self::$access_key = new FW_Access_Key( 'fw_ext_builder_option_type' );
		}

		return self::$access_key;
	}

	/**
	 * @return array
	 */
	protected function get_items_classes() {
		return fw_akg( $this->get_type(), self::$item_types, array() );
	}

	/**
	 * @param $type
	 *
	 * @return string
	 * @throws FW_Option_Type_Exception_Not_Found
	 */
	protected function get_item_class( $type ) {
		$class = fw_akg( $type, $this->get_items_classes() );

		if ( $class == null ) {
			throw new FW_Option_Type_Exception_Not_Found();
		}

		return $class;
	}

	/**
	 * @param $type
	 *
	 * @return FW_Option_Type_Builder_Item
	 * @throws FW_Option_Type_Exception_Not_Found
	 * @throws FW_Option_Type_Exception_Invalid_Class
	 */
	protected function get_item_instance( $type ) {
		$class = $this->get_item_class( $type );

		if ( ! is_subclass_of( $class, 'FW_Option_Type_Builder_Item' ) ) {
			throw new FW_Option_Type_Exception_Invalid_Class();
		}

		return $this->get_instance( $class );
	}

	/**
	 * @param $class
	 *
	 * @return mixed
	 */
	private static function get_instance( $class ) {
		return new $class();
	}

	/**
	 * Overwrite this method to force your builder type items to extend custom class or to have custom requirements
	 *
	 * @param FW_Option_Type_Builder_Item $item_type_instance
	 *
	 * @return bool
	 */
	protected function item_type_is_valid( $item_type_instance ) {
		return is_subclass_of( $item_type_instance, 'FW_Option_Type_Builder_Item' );
	}

	/**
	 * @internal
	 */
	protected function _get_defaults() {
		return $this->fix_base_defaults( array(
			'value' => array(
				'json' => '[]',
			),
		) );
	}

	/**
	 * @internal
	 * {@inheritdoc}
	 */
	protected function _enqueue_static( $id, $option, $data ) {
		$option  = $this->fix_base_defaults( $option );
		$version = fw_ext( 'builder' )->manifest->get_version();

		do_action( 'fw_ext_builder:option_type:builder:before_enqueue',
			array(
				'option'  => $option,
				'version' => $version,
			) );

		{
			wp_enqueue_style(
				'fw-option-builder',
				$this->get_static_uri( '/css/builder.css' ),
				version_compare( fw()->manifest->get_version(), '2.4.0', '<' )
					? array( 'fw' )
					: array( 'fw', 'fw-unycon' ),
				$version
			);

			wp_enqueue_script(
				'fw-option-builder',
				$this->get_static_uri( '/js/builder.js' ),
				array(
					'jquery-ui-draggable',
					'jquery-ui-sortable',
					'fw',
					'fw-events',
					'backbone',
					'backbone-relational'
				),
				$version,
				true
			);
		}

		wp_enqueue_media();

		{
			wp_enqueue_style(
				'fw-option-builder-helpers',
				$this->get_static_uri( '/css/helpers.css' ),
				array( 'fw-option-builder' ),
				$version
			);

			wp_enqueue_script(
				'fw-option-builder-helpers',
				$this->get_static_uri( '/js/helpers.js' ),
				array( 'fw-option-builder' ),
				$version,
				true
			);

			wp_enqueue_script(
				'fw-option-builder-qtips',
				$this->get_static_uri( '/js/qtips.js' ),
				array( 'fw-option-builder' ),
				$version,
				true
			);

			wp_enqueue_script(
				'fw-option-builder-initialize',
				$this->get_static_uri( '/js/initialize-builder.js' ),
				array( 'fw-option-builder' ),
				$version,
				true
			);

			wp_localize_script(
				'fw-option-builder-helpers',
				'_fw_option_type_builder_helpers',
				array(
					'l10n'        => array(
						'save' => __( 'Save', 'fw' ),
					),
					'item_widths' => fw_ext_builder_get_item_widths_for_js( $this->get_type() )
				)
			);
		}

		if ( $option['fullscreen'] ) {
			wp_enqueue_style(
				'fw-option-builder-fullscreen',
				$this->get_static_uri( '/css/fullscreen.css' ),
				array( 'fw-option-builder' ),
				$version
			);

			wp_enqueue_script(
				'fw-option-builder-fullscreen',
				$this->get_static_uri( '/js/fullscreen.js' ),
				array( 'fw-option-builder', ),
				$version,
				true
			);

			wp_localize_script(
				'fw-option-builder-fullscreen',
				'_fw_option_type_builder_fullscreen',
				array(
					'l10n' => array(
						'fullscreen'      => __( 'Full Screen', 'fw' ),
						'exit_fullscreen' => __( 'Exit Full Screen', 'fw' ),
					),
				)
			);
		}

		if ( $option['history'] ) {
			wp_enqueue_style(
				'fw-option-builder-history',
				$this->get_static_uri( '/css/history.css' ),
				array( 'fw-option-builder' ),
				$version
			);

			wp_enqueue_script(
				'fw-option-builder-history',
				$this->get_static_uri( '/js/history.js' ),
				array( 'fw-option-builder', ),
				$version,
				true
			);

			wp_localize_script(
				'fw-option-builder-history',
				'_fw_option_type_builder_history',
				array(
					'l10n' => array(
						'undo' => __( 'Undo', 'fw' ),
						'redo' => __( 'Redo', 'fw' ),
					),
				)
			);
		}

		do_action( 'fw_ext_builder:option_type:builder:enqueue',
			array(
				'option'  => $option,
				'version' => $version,
				'uri'     => fw()->extensions->get( 'builder' )->get_uri( '/includes/option-types/builder' )
			) );

		foreach ( $this->get_item_types() as $item ) {
			/** @var FW_Option_Type_Builder_Item $item */

			$item->enqueue_static();
		}
	}

	/**
	 * @internal
	 * {@inheritdoc}
	 */
	protected function _render( $id, $option, $data ) {
		$option = $this->fix_base_defaults( $option );

		/**
		 * array(
		 *  'Tab title' => array(
		 *      '<thumbnail html>',
		 *      '<thumbnail html>',
		 *      '<thumbnail html>',
		 *  ),
		 *  'Tab title' => array(
		 *      '<thumbnail html>',
		 *  )
		 * )
		 */
		$thumbnails = array();

		/**
		 * If you want to customize what css class your thumbnails receive
		 * you can implement `get_thumbnail_class` in your
		 * FW_Option_Type_Builder subclass. Whatever you return from this
		 * method is inserted right into html.
		 *
		 * You can add additional classes by concatenating them to the
		 * default class. You receive default class as an argument to the
		 * method.
		 *
		 * class Some_Cool_Builder extends FW_Option_Type_Builder {
		 *   // initialization
		 *
		 *   public function get_thumbnail_class ($default_css_class, $item) {
		 *     return $default_css_class . ' some-cool-class-that-you-really-need';
		 *   }
		 * }
		 *
		 * // Don't forget to register your builder
		 * FW_Option_Type::register('Some_Cool_Builder');
		 */
		foreach ( $this->get_item_types() as $item ) {
			/** @var FW_Option_Type_Builder_Item $item */

			$item_classes = 'builder-item-type';

			if ( method_exists( $this, 'get_thumbnail_class' ) ) {
				$item_classes = $this->get_thumbnail_class( $item_classes, $item );
			}

			$item_classes = esc_attr( $item_classes );

			foreach ( $item->get_thumbnails() as $key => $thumbnail ) {
				if ( ! isset( $thumbnail['tab'] ) ) {
					$tab_title = '~';
				} else {
					$tab_title = $thumbnail['tab'];
				}

				if ( ! isset( $thumbnails[ $tab_title ] ) ) {
					$thumbnails[ $tab_title ] = array();
				}

				if ( empty( $thumbnail['html'] ) ) {
					continue;
				}

				if ( ! isset( $thumbnails[ $tab_title ][ $key ] ) ) {
					$thumbnails[ $tab_title ][ $key ] =
						'<div class="' . $item_classes . '" data-builder-item-type="' . esc_attr( $item->get_type() ) . '">' .
						$thumbnail['html'] .
						'</div>';
				} else {
					$thumbnails[ $tab_title ][] =
						'<div class="' . $item_classes . '" data-builder-item-type="' . esc_attr( $item->get_type() ) . '">' .
						$thumbnail['html'] .
						'</div>';
				}
			}
		}

		foreach ( $thumbnails as &$type ) {
			ksort( $type );
		}

		if ( method_exists( $this, 'sort_thumbnails' ) ) {
			$this->sort_thumbnails( $thumbnails );
		}

		// prepare attr
		{
			$option['attr']['data-builder-option-type'] = $this->get_type();

			$option['attr']['class'] .= ' fw-option-type-builder';

			if ( $option['fullscreen'] ) {
				$option['attr']['class'] .= apply_filters( 'fw_builder_fullscreen_add_classes', '' );
			}

			if ( $option['fixed_header'] ) {
				$option['attr']['data-fixed-header'] = '~';
			}

			if ( $option['drag_and_drop'] ) {
				$option['attr']['data-drag-and-drop'] = '~';
			}

			if ( $option['read_only'] ) {
				$option['attr']['data-read-only'] = '~';
			}
		}

		return fw_render_view( dirname( __FILE__ ) . '/../view.php',
			array(
				'id'         => $id,
				'option'     => $option,
				'data'       => $data,
				'thumbnails' => $thumbnails,
			) );
	}

	/**
	 * {@inheritdoc}
	 */
	protected function _get_value_from_input( $option, $input_value ) {
		if ( empty( $input_value ) || ! is_string( $input_value ) ) {
			$input_value = $option['value']['json'];
		}

		$items = json_decode( $input_value, true );

		if ( ! $items ) {
			$items = array();
		}

		return array(
			'json' => json_encode(
				$this->get_value_from_items( $items )
			),
		);
	}

	/**
	 * {@inheritdoc}
	 */
	protected function _storage_save( $id, array $option, $value, array $params ) {
		$value['json'] = json_encode( $this->storage_save_recursive( json_decode( $value['json'], true ), $params ) );

		return fw_db_option_storage_save( $id, $option, $value, $params );
	}

	protected function storage_save_recursive( array $items, array $params ) {
		/**
		 * @var FW_Option_Type_Builder_Item[] $item_types
		 */
		$item_types = $this->get_item_types();

		foreach ( $items as &$atts ) {
			if ( ! isset( $atts['type'] ) || ! isset( $item_types[ $atts['type'] ] ) ) {
				continue; // invalid item
			}

			$atts = $item_types[ $atts['type'] ]->storage_save( $atts, $params );

			if ( isset( $atts['_items'] ) ) {
				$atts['_items'] = $this->storage_save_recursive( $atts['_items'], $params );
			}
		}

		return $items;
	}

	/**
	 * {@inheritdoc}
	 */
	protected function _storage_load( $id, array $option, $value, array $params ) {
		$value = fw_db_option_storage_load( $id, $option, $value, $params );

		$value['json'] = json_decode( $value['json'], true );
		$value['json'] = $this->storage_load_recursive( $value['json'] ? $value['json'] : array(), $params );
		$value['json'] = json_encode( $value['json'] );

		return $value;
	}

	protected function storage_load_recursive( array $items, array $params ) {
		/**
		 * @var FW_Option_Type_Builder_Item[] $item_types
		 */
		$item_types = $this->get_item_types();

		foreach ( $items as &$atts ) {
			if ( ! isset( $atts['type'] ) || ! isset( $item_types[ $atts['type'] ] ) ) {
				continue; // invalid item
			}

			$atts = $item_types[ $atts['type'] ]->storage_load( $atts, $params );

			if ( isset( $atts['_items'] ) ) {
				$atts['_items'] = $this->storage_load_recursive( $atts['_items'], $params );
			}
		}

		return $items;
	}
}
