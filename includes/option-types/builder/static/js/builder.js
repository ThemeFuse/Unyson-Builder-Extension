jQuery(document).ready(function($){
	/** Some functions */
	{
		/**
		 * Loop recursive through all items in given collection
		 */
		function forEachItemRecursive(collection, callback) {
			collection.each(function(item){
				callback(item);

				forEachItemRecursive(item.get('_items'), callback);
			});
		}
	}

	var Builder = Backbone.Model.extend({
		defaults: {
			type: null // required
		},
		/**
		 * Extract item type from class
		 * @param {this.classes.Item} ItemClass
		 * @returns {String}
		 */
		getItemClassType: function(ItemClass) {
			return (typeof ItemClass.prototype.defaults === 'function')
				? ItemClass.prototype.defaults().type
				: ItemClass.prototype.defaults.type;
		},
		/**
		 * @param {String} type
		 * @returns {this.classes.Item}
		 */
		getRegisteredItemClassByType: function(type) {
			return this.registeredItemsClasses[type];
		},
		/**
		 * Register Item Class (with unique type)
		 * @param {this.classes.Item} ItemClass
		 * @returns {boolean}
		 */
		registerItemClass: function(ItemClass) {
			if (!(ItemClass.prototype instanceof this.classes.Item)) {
				console.error('Tried to register Item Type Class that does not extend this.classes.Item', ItemClass);
				return false;
			}

			var type = this.getItemClassType(ItemClass);

			if (typeof type != 'string') {
				console.error('Invalid Builder Item type: '+ type, ItemClass);
				return false;
			}

			if (typeof this.registeredItemsClasses[type] != 'undefined') {
				console.error('Builder Item type "'+ type +'" already registered', ItemClass);
				return false;
			}

			this.registeredItemsClasses[type] = ItemClass;

			return true;
		},
		/**
		 * Find Item instance recursive in Items collection
		 * @param {Object} itemAttr (can be specified cid)
		 * @param {this.classes.Items} [items]
		 * @return {this.classes.Item|null}
		 */
		findItemRecursive: function (itemAttr, items) {
			if (arguments.length < 2) {
				items = this.rootItems;
			}

			var item = items.get(itemAttr);

			if (item) {
				return item;
			}

			var that = this;

			items.each(function(_item){
				if (item) {
					// stop search if item found
					return false;
				}

				/** @var {builder.classes.Item} _item */
				item = that.findItemRecursive(
					itemAttr,
					_item.get('_items')
				);
			});

			return item;
		},
		/**
		 * ! Do not rewrite this (it's final)
		 * @private
		 *
		 * Properties created in initialize():
		 *
		 * Classes to extend
		 * - classes.Item
		 * - classes.ItemView
		 * - classes.Items
		 * - classes.ItemsView
		 *
		 * From this classes will be created items instances
		 * { 'type' => Class }
		 * - registeredItemsClasses
		 *
		 * Reference to root this.classes.Items Collection instance that contains all items
		 * - rootItems
		 *
		 * Hidden input that stores JSON.stringify(this.rootItems)
		 * - $input
		 */
		initialize: function(attributes, options) {
			var builder = this;

			/**
			 * todo: To be able to extend and customize for e.g. only Item class. To not rewrite entire .initialize()
			 * this.__definePrivateMethods()
			 * this.__defineItem()
			 * this.__defineItemView()
			 * this.__defineItems()
			 * this.__defineItemsView()
			 */

			/**
			 * Assign a value to define this property inside this, not in prototype
			 * Instances of Builder should not share items
			 */
			this.registeredItemsClasses = {};

			/** Define private functions accessible only within this method */
			{
				/**
				 * (Re)Create Items from json
				 *
				 * Used on collection.reset([...]) to create nested items
				 *
				 * @param {this.classes.Item} item
				 * @param {Array} _items
				 * @returns {boolean}
				 * @private
				 */
				function createItemsFromJSON(item, _items) {
					if (!_items) {
						return false;
					}

					_.each(_items, function(_item) {
						var ItemClass = builder.getRegisteredItemClassByType(_item['type']);

						if (!ItemClass) {
							return;
						}

						var __items = _item['_items'];

						delete _item['_items'];

						var subItem = new ItemClass(_item);

						item.get('_items').add(subItem);

						createItemsFromJSON(subItem, __items);
					});

					return true;
				}

				// Mark new added items with special class, to be able to add css effects to it
				{
					var markItemAsNew;

					(function(){
						var lastNewItem = false;

						var rootItemsInitialized = false;

						var removeClassTimeout;
						var removeClassAfter = 700;

						markItemAsNew = function (item) {
							clearTimeout(removeClassTimeout);

							if (lastNewItem) {
								lastNewItem.view.$el.removeClass('new-item');
							}

							item.view.$el.addClass('new-item');

							lastNewItem = item;

							removeClassTimeout = setTimeout(function(){
								if (lastNewItem) {
									lastNewItem.view.$el.removeClass('new-item');
								}
							}, removeClassAfter);

							if (!rootItemsInitialized) {
								builder.rootItems.on('builder:change', function(){
									if (lastNewItem) {
										lastNewItem.view.$el.removeClass('new-item');
									}

									lastNewItem = false;
								});

								rootItemsInitialized = true;
							}
						}
					})();
				}
			}

			/** Define classes */
			{
				this.classes = {};

				/** Items */
				{
					this.classes.Items = Backbone.Collection.extend({
						/**
						 * Guess which item type to create from json
						 * (usually called on .reset())
						 */
						model: function(attrs, options) {
							do {
								if (typeof attrs == 'function') {
									// It's a class. Check if has correct type
									if (builder.getItemClassType(attrs)) {
										return attrs;
									} else {
										break;
									}
								} else if (typeof attrs == 'object') {
									/**
									 * it's an object with attributes for new instance
									 * check if has correct type in it (get registered class with this type)
									 */

									var ItemClass = builder.getRegisteredItemClassByType(attrs['type']);

									if (!ItemClass) {
										break;
									}

									var _items = attrs['_items'];

									delete attrs['_items'];

									var item = new ItemClass(attrs);

									createItemsFromJSON(item, _items);

									return item;
								}
							} while(false);

							console.error('Cannot detect Item type', attrs, options);

							return new builder.classes.Item;
						},
						/**
						 * View that contains items views
						 */
						view: null,
						initialize: function() {
							this.defaultInitialize();

							this.view = new builder.classes.ItemsView({
								collection: this
							});
						},
						/**
						 * It is required to call this method in .initialize()
						 */
						defaultInitialize: function() {
							this.on('add', function(item) {
								// trigger custom event on rootItems to update input value
								builder.rootItems.trigger('builder:change');

								markItemAsNew(item);
							});

							this.on('remove', function(item) {
								// trigger custom event on rootItems to update input value
								builder.rootItems.trigger('builder:change');
							});
						}
					});

					this.classes.ItemsView = Backbone.View.extend({
						// required

						collection: null,

						// end: required

						tagName: 'div',
						className: 'builder-items fw-row fw-border-box-sizing',
						template: _.template(''),
						events: {},
						initialize: function() {
							this.defaultInitialize();
						},
						/**
						 * It is required to call this method in .initialize()
						 */
						defaultInitialize: function() {
							this.listenTo(this.collection, 'add change remove reset', this.render);

							this.render();
						},
						render: function() {
							/**
							 * First .detach() elements
							 * to prevent them to be removed (reset) on .html('...') replace
							 */
							this.collection.each(function(item) {
								item.view.$el.detach();
							});

							this.$el.html(this.template({
								items: this.collection
							}));

							this.collection.each(_.bind(function(item) {
								this.$el.append(item.view.$el);
							}, this));

							return this;
						}
					});
				}

				/** Item */
				{
					this.classes.Item = Backbone.RelationalModel.extend({
						// required

						defaults: {
							/** @type {String} Your item unique type (withing the builder) */
							type: null
						},

						/** @type {builder.classes.ItemView} */
						view: null,

						// end: required

						/** ! Do not overwrite this property */
						relations: [
							{
								type: Backbone.HasMany,
								key: '_items',
								//relatedModel: builder.classes.Item, // class does not exists at this point, initialized below
								collectionType: builder.classes.Items,
								collectionKey: '_item'
							}
						],
						initialize: function(){
							this.view = new builder.classes.ItemView({
								id: 'fw-builder-item-'+ this.cid,
								model: this
							});

							this.defaultInitialize();
						},
						/**
						 * It is required to call this method in .initialize()
						 */
						defaultInitialize: function() {
							// trigger custom event on rootItems to update input value
							this.on('change', function() {
								builder.rootItems.trigger('builder:change');
							});
						},
						/**
						 * Item decide if allows an incoming item type to be placed inside it's _items
						 *
						 * @param {String} type
						 * @returns {boolean}
						 */
						allowIncomingType: function(type) {
							return false;
						},
						/**
						 * Item decide if allows to be placed into _items of another item type
						 *
						 * ! Do not use "this" in this method, it will be called without an instance via Class.prototype.allowDestinationType()
						 *
						 * @param {String|null} type String - item type; null - root items
						 * @returns {boolean}
						 */
						allowDestinationType: function(type) {
							return true;
						}
					});

					{
						this.classes.Item.prototype.relations[0].relatedModel = this.classes.Item;
					}

					this.classes.ItemView = Backbone.View.extend({
						// required

						/** @type {builder.classes.Item} */
						model: null,
						/** @type {String} 'any-string-'+ this.model.cid */
						id: null,

						// end: required

						tagName: 'div',
						className: 'builder-item fw-border-box-sizing fw-col-xs-12',
						template: _.template([
							'<div style="border: 1px solid #CCC; padding: 5px; color: #999; background: #fff;">',
							'<em class="fw-text-muted">Default View</em>',
							'<a href="#" onclick="return false;" class="dashicons fw-x"></a>',
							'<div class="builder-items"></div>',
							'</div>'
						].join('')),
						events: {
							'click a.dashicons.fw-x': 'defaultRemove'
						},
						initialize: function(){
							this.defaultInitialize();
							this.render();
						},
						/**
						 * It is required to call this method in .initialize()
						 */
						defaultInitialize: function() {
							this.listenTo(this.model, 'change', this.render);
						},
						render: function() {
							this.defaultRender();
						},
						defaultRender: function(templateData) {
							var _items = this.model.get('_items');

							/**
							 * First .detach() elements
							 * to prevent them to be removed (reset) on .html('...') replace
							 */
							_items.view.$el.detach();

							this.$el.html(
								this.template(
									templateData || {}
								)
							);

							/**
							 * replace <div class="builder-items"> with builder.classes.ItemsView.$el
							 */
							this.$el.find('.builder-items:first').replaceWith(
								_items.view.$el
							);

							return this;
						},
						defaultRemove: function() {
							this.remove();

							this.model.collection.remove(this.model);
						}
					});
				}
			}

			this.rootItems = new this.classes.Items;

			var dragulaHelpers = {
				/**
				 * object - item instance
				 * string - item type
				 */
				detectMoved: function(el) {
					var temp;

					if (!el) {
						return false;
					} else if (
						el.attributes.id
						&&
						(temp = el.attributes.id.value)
						&&
						(temp = temp.split('-').pop())
						&&
						(temp = builder.findItemRecursive({cid: temp}))
					) { // item instance
						return temp;
					} else if (
						el.classList.contains('builder-item-type')
						&&
						el.attributes['data-builder-item-type']
						&&
						(temp = el.attributes['data-builder-item-type'].value)
					) { // item type (thumbnail)
						return temp;
					}

					return false; // can't detect
				},
				/**
				 * object - item instance
				 * true - root items
				 */
				detectContainer: function(el) {
					var temp;

					if (!el) {
						return false;
					} else if (
						(temp = $(el).closest('.builder-item').get(0))
						&&
						temp.attributes.id
						&&
						(temp = temp.attributes.id.value)
						&&
						(temp = temp.split('-').pop())
						&&
						(temp = builder.findItemRecursive({cid: temp}))
					) { // item instance
						return temp;
					} else if (
						el.parentElement.classList.contains('builder-root-items')
					) { // root items
						return true;
					}

					return false; // can't detect
				}
			}, itemTypesContainers = options.$itemTypes.parent().toArray();
			var drake = dragula([this.rootItems.view.$el.get(0)].concat(itemTypesContainers), {
				//direction: 'horizontal', // https://github.com/bevacqua/dragula/issues/165#issuecomment-167121099
				isContainer: function(el){
					return el.classList.contains('builder-items') || _.indexOf(drake.containers, el) != -1;
				},
				accepts: function (el, target, source, sibling) { // fixme: this is called too often (on mouse move)
					if (_.indexOf(itemTypesContainers, target) != -1) {
						return false; // can't move items in thumbnails
					}

					var item = {
						moved: dragulaHelpers.detectMoved(el),
						container: dragulaHelpers.detectContainer(target)
					};

					if (!item.moved || !item.container || item.moved === item.container) {
						return false;
					}

					if (typeof item.moved == 'object') {
						if (typeof item.container == 'object') {
							item.container.view.$el
								.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type');

							if (
								item.container.allowIncomingType(item.moved.get('type'))
								&&
								item.moved.allowDestinationType(item.container.get('type'))
							) {
								item.container.view.$el
									.addClass('fw-builder-item-allow-incoming-type');
								return true;
							} else {
								item.container.view.$el
									.addClass('fw-builder-item-deny-incoming-type');
								return false;
							}
						} else if (item.container === true) {
							builder.rootItems.view.$el
								.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type');

							if (item.moved.allowDestinationType(null)) {
								builder.rootItems.view.$el
									.addClass('fw-builder-item-allow-incoming-type');
								return true;
							} else {
								builder.rootItems.view.$el
									.addClass('fw-builder-item-deny-incoming-type');
								return false;
							}
						}
					} else if (typeof item.moved == 'string') {
						var MovedItemTypeClass = builder.getRegisteredItemClassByType(item.moved);

						if (!MovedItemTypeClass) {
							console.warn('Unknown item type');
							return false;
						}

						if (typeof item.container == 'object') {
							item.container.view.$el
								.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type');

							if (
								item.container.allowIncomingType(item.moved)
								&&
								MovedItemTypeClass.prototype.allowDestinationType(item.container.get('type'))
							) {
								item.container.view.$el
									.addClass('fw-builder-item-allow-incoming-type');
								return true;
							} else {
								item.container.view.$el
									.addClass('fw-builder-item-deny-incoming-type');
								return false;
							}
						} else if (item.container === true) {
							builder.rootItems.view.$el
								.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type');

							if (MovedItemTypeClass.prototype.allowDestinationType(null)) {
								builder.rootItems.view.$el
									.addClass('fw-builder-item-allow-incoming-type');
								return true;
							} else {
								builder.rootItems.view.$el
									.addClass('fw-builder-item-deny-incoming-type');
								return false;
							}
						}
					}

					return false;
				},
				copy: function (el, source) {
					return _.indexOf(itemTypesContainers, source) != -1;
				},
				invalid: function (el) {
					return el.tagName === 'A';
				}
			}).on('shadow', function (el, container, source) {
				if (
					_.indexOf(itemTypesContainers, source) == -1
					||
					el.attributes['data-thumbnail-html']
				) {
					return;
				}

				var item = {
					moved: dragulaHelpers.detectMoved(el)
				};

				if (typeof item.moved != 'string') {
					return;
				}

				var MovedItemTypeClass = builder.getRegisteredItemClassByType(item.moved);

				if (!MovedItemTypeClass) {
					console.warn('Unknown item type');
					return false;
				}

				var thumbHtml = el.outerHTML;

				item.moved = new MovedItemTypeClass({}, {$thumb: $(thumbHtml)});

				/**
				 * Replace shadow attributes and inner elements with item
				 * without replacing the actual shadow because its reference is used in dragula
				 */
				{
					while (el.attributes.length) el.removeAttributeNode(el.attributes[0]);

					var itemEl = item.moved.view.$el.get(0),
						$el = $(el),
						i;

					$el.attr('data-thumbnail-html', thumbHtml).html('');

					for (i = 0; i < itemEl.attributes.length; i++) {
						$el.attr(itemEl.attributes[i].name, itemEl.attributes[i].value);
					}

					$el.append(item.moved.view.$el.find('> *'));

					$el.addClass('gu-transit'); // dragula class
				}
			}).on('dragend', function(el){
				builder.rootItems.view.$el
					.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type')
					.find('.builder-item')
					.removeClass('fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type');
			}).on('drop', function(el, target, source, sibling){
				var at = $(el).index(); // remember the index before the element is replaced

				if (el.attributes['data-thumbnail-html']) {
					el = $($(el).attr('data-thumbnail-html')).get(0);
				}

				var item = {
					moved: dragulaHelpers.detectMoved(el),
					container: dragulaHelpers.detectContainer(target)
				};

				if (!item.moved || !item.container || item.moved === item.container) {
					return false;
				}

				if (typeof item.moved == 'object') {
					item.moved.view.$el.detach(); // prevent events remove
					item.moved.collection.remove(item.moved);

					if (typeof item.container == 'object') {
						item.container.get('_items').add(item.moved, {at: at});
					} else {
						builder.rootItems.add(item.moved, {at: at});
					}
				} else if (typeof item.moved == 'string') {
					var MovedItemTypeClass = builder.getRegisteredItemClassByType(item.moved);

					if (!MovedItemTypeClass) {
						console.warn('Unknown item type');
						return false;
					}

					var $thumb = $(el);

					if (typeof item.container == 'object') {
						item.container.get('_items').add(
							new MovedItemTypeClass({}, {$thumb: $thumb}),
							{at: at}
						);
					} else {
						builder.rootItems.add(
							new MovedItemTypeClass({}, {$thumb: $thumb}),
							{at: at}
						);
					}
				}
			});

			// prepare this.$input
			{
				if (typeof options.$input == 'undefined') {
					console.warn('$input not specified. Items will no be saved');

					this.$input = $('<input type="hidden">');
				} else {
					this.$input = options.$input;
				}

				fwEvents.trigger('fw-builder:'+ this.get('type') +':register-items', this);

				// recover saved items from input
				{
					var savedItems = [];

					try {
						savedItems = JSON.parse(this.$input.val());
					} catch (e) {
						console.error('Failed to recover items from input', e);
					}

					this.rootItems.reset(savedItems);

					delete savedItems;
				}

				// listen to items changes and update input
				(function(){
					/**
					 * use timeout to not load browser/cpu when there are many changes at once (for e.g. on .reset())
					 */
					var saveTimeout = 0,
						saveBuilderValueToInput = function() {
							clearTimeout(saveTimeout);
							saveTimeout = 0; // prevent redundant save of form submit

							builder.$input
								.val(JSON.stringify(builder.rootItems))
								.trigger('fw-builder:input:change')
								.trigger('change');
						};

					builder.listenTo(builder.rootItems, 'builder:change', function(){
						clearTimeout(saveTimeout);
						saveTimeout = setTimeout(function(){
							saveBuilderValueToInput();
						}, 100);
					});

					/**
					 * Save value to input if there is a pending timeout on form submit
					 */
					builder.$input.closest('form').on('submit', function(){
						if (saveTimeout) {
							saveBuilderValueToInput();
						}
					});
				})();
			}
		}
	});

	/**
	 * Create qTips for elements with data-hover-tip="Tip Text" attribute
	 */
	var RootItemsTips = (function(rootItems){
		/**
		 * Store all created qTip instances APIs
		 */
		this.tipsAPIs = [];

		this.resetTimeout = 0;

		this.resetTips = function() {
			_.each(this.tipsAPIs, function(api) {
				api.destroy(true);
			});

			this.tipsAPIs = [];

			var that = this;

			rootItems.view.$el.find('[data-hover-tip]').each(function(){
				$(this).qtip({
					position: {
						at: 'top center',
						my: 'bottom center',
						viewport: rootItems.view.$el.parent()
					},
					style: {
						classes: 'qtip-fw qtip-fw-builder',
						tip: {
							width: 12,
							height: 5
						}
					},
					content: {
						text: $(this).attr('data-hover-tip')
					}
				});

				that.tipsAPIs.push(
					$(this).qtip('api')
				);
			});
		};

		// initialize
		{
			this.resetTips();

			var that = this;

			rootItems.on('builder:change', function(){
				clearTimeout(that.resetTimeout);

				that.resetTimeout = setTimeout(function(){
					that.resetTips();
				}, 100);
			});
		}
	});

	var fixedHeaderHelpers = {
		increment: 0,
		$adminBar: $('#wpadminbar'),
		getAdminBarHeight: function() {
			if (this.$adminBar.length && this.$adminBar.css('position') === 'fixed') {
				return this.$adminBar.height();
			} else {
				return 0;
			}
		},
		fix: function($header, $builder, $scrollParent){
			var topSpace = this.getAdminBarHeight(),
				scrollParentHeight = $scrollParent.height(),
				scrollParentScrollTop = $scrollParent.scrollTop(),
				scrollParentOffset = $scrollParent.offset(),
				builderHeight = $builder.get(0).clientHeight,
				builderOffsetTop = $builder.offset().top,
				headerHeight = $header.get(0).clientHeight;

			/**
			 * Fixes inside options modal
			 */
			if (scrollParentOffset) {
				builderOffsetTop -= scrollParentOffset.top;

				if (builderOffsetTop <= 0) {
					builderOffsetTop = topSpace;
				}
			}

			do {
				if (builderOffsetTop >= scrollParentScrollTop + topSpace) {
					// scroll top didn't reached the builder
					break;
				}

				if (builderHeight < scrollParentHeight - topSpace) {
					// the builder fits inside the scroll element
					break;
				}

				var bottomLimit = Math.floor(scrollParentHeight / 2);
				if (bottomLimit < headerHeight) {
					bottomLimit = headerHeight;
				}
				if (bottomLimit < 256) {
					bottomLimit = 256;
				}

				if (builderHeight < headerHeight + bottomLimit) {
					break;
				}

				if (scrollParentHeight < headerHeight + bottomLimit) {
					// the scroll element must have space to display header and bottomLimit
					break;
				}

				var headerTopShift = (scrollParentScrollTop + topSpace) - builderOffsetTop;

				if (headerTopShift + headerHeight + bottomLimit > builderHeight) {
					// do not allow header to cover last items
					headerTopShift -= headerTopShift + headerHeight + bottomLimit - builderHeight;
				}

				// set fixed header
				{
					if (!$builder.hasClass('fixed-header')) {
						$builder.addClass('fixed-header');
					}

					$builder.css({
						'padding-top': headerHeight +'px' // set ghost space in builder, like the header is still there
					});
					$header.css({
						'top': headerTopShift +'px'
					});

					return true;
				}
			} while(false);

			// remove fixed header
			{
				if ($builder.hasClass('fixed-header')) {
					$builder.removeClass('fixed-header');

					$builder.css({
						'padding-top': ''
					});
					$header.css({
						'top': ''
					});
				}

				return false;
			}
		}
	};

	fwEvents.on('fw:options:init', function (data) {
		var $options = data.$elements.find('.fw-option-type-builder:not(.initialized)');

		if (!$options.length) {
			return;
		}

		$options.closest('.fw-backend-option').addClass('fw-backend-option-type-builder');

		fwEvents.trigger('fw:option-type:builder:init', {
			$elements: $options
		});

		$options.each(function(){
			var $this = $(this),
				id    = $this.attr('id'),
				type  = $this.attr('data-builder-option-type');

			/**
			 * Create instance of Builder
			 */
			{
				var data = {
					type:         type,
					$option:      $this,
					$input:       $this.find('> input:first'),
					$types:       $this.find('.builder-items-types:first'),
					$rootItems:   $this.find('.builder-root-items:first'),
					$headerTools: $('<div class="fw-builder-header-tools fw-clearfix fw-hidden"></div>')
				};

				var eventData = $.extend({}, data, {
					/**
					 * In event you can extend (customize/change) and replace this (property) class
					 */
					Builder: Builder
				});

				fwEvents.trigger('fw-builder:'+ type +':before-create', eventData);

				$this.find('> .builder-items-types').append(data.$headerTools);

				var builder = new eventData.Builder(
					{
						type: data.type
					},
					{
						$input: data.$input,
						$itemTypes: $this.find('> .builder-items-types .builder-item-type')
					}
				);

				builder.rootItems.view.$el.appendTo(data.$rootItems);

				new RootItemsTips(builder.rootItems);
			}

			/**
			 * Add item on thumbnail click
			 */
			$this.find('.builder-items-types').on('click', '.builder-item-type', function(){
				var $itemType = $(this);

				var itemType = $itemType.attr('data-builder-item-type');

				if (itemType) {
					var ItemTypeClass = builder.getRegisteredItemClassByType(itemType);

					if (ItemTypeClass) {
						if (ItemTypeClass.prototype.allowDestinationType(null)) {
							builder.rootItems.add(
								new ItemTypeClass({}, {$thumb: $itemType})
							);

							// animation
							{
								// stop previous animation
								{
									clearTimeout($itemType.attr('data-animation-timeout-id'));
									$itemType.removeClass('fw-builder-animation-item-type-add');
								}

								$itemType.addClass('fw-builder-animation-item-type-add');

								$itemType.attr('data-animation-timeout-id',
									setTimeout(function(){
										$itemType.removeClass('fw-builder-animation-item-type-add');
									}, 500)
								);
							}

							// scroll to the bottom of the builder
							setTimeout(function(){
								var $builderOption = $this,
									$scrollParent = $builderOption.scrollParent();

								if ($scrollParent.get(0) === document || $scrollParent.get(0) === document.body) {
									$scrollParent = $(window);
								}

								if ($builderOption.height() <= $scrollParent.height() + 300) {
									/**
									 * Do not scroll if the builder can fit or is almost entirely visible
									 * To prevent "jumping" https://github.com/ThemeFuse/Unyson/issues/815
									 */
									return;
								}

								$scrollParent.scrollTop(
									$builderOption.offset().top
									+
									$builderOption.outerHeight()
									-
									$scrollParent.height()
								);
							}, 0);
						} else {
							console.warn('Item type "'+ itemType +'" is not allowed as first level item');
						}
					} else {
						console.error('Unregistered item type: '+ itemType);
					}
				} else {
					console.error('Cannot extract item type from element', $itemType);
				}
			});

			/**
			 * Add tips to thumbnails
			 */
			$this.find('.builder-items-types .builder-item-type [data-hover-tip]').each(function(){
				$(this).qtip({
					position: {
						at: 'top center',
						my: 'bottom center',
						viewport: $('body')
					},
					style: {
						classes: 'qtip-fw qtip-fw-builder',
						tip: {
							width: 12,
							height: 5
						}
					},
					content: {
						text: $(this).attr('data-hover-tip')
					}
				});
			});

			/**
			 * Make header follow you when you scroll down
			 */
			if ($this.attr('data-fixed-header')) {
				var fixedHeaderEventsNamespace = '.fw-builder-fixed-header-'+ (++fixedHeaderHelpers.increment),
					$fixedHeader = $this.find('> .builder-items-types:first'),
					/**
					 * In OptionsModal we must track the modal scroll not the window scroll
					 */
					$scrollParent;

				$scrollParent = $this.scrollParent();
				if ($scrollParent.get(0) === document || $scrollParent.get(0) === document.body) {
					$scrollParent = $(window);
				}

				/**
				 * Options modal fixed tabs are initialized after options init
				 */
				setTimeout(function(){
					$scrollParent = $this.scrollParent();
					if ($scrollParent.get(0) === document || $scrollParent.get(0) === document.body) {
						$scrollParent = $(window);
					}

					$scrollParent
						.on('scroll'+ fixedHeaderEventsNamespace, function(){
							fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);
						})
						.on('resize'+ fixedHeaderEventsNamespace, function(){
							fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);
						});

					fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);
				}, 0);

				/**
				 * On thumbnails tab change, the new tab may contain more thumbnails that previous
				 * thus having different height
				 */
				$fixedHeader.on('click'+ fixedHeaderEventsNamespace, '.fw-options-tabs-list a, .fullscreen-btn', function(){
					fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);

					/**
					 * When you scroll down to the last items (to the limit when the fixed header stops and begins to go under page)
					 * and you switch to a tab with a bigger height, there are some issues with positioning.
					 * Calling this send time fixes it
					 */
					fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);
				});

				/**
				 * Listen builder value/items change
				 * For e.g. when you delete an element from the builder (or press undo/redo buttons)
				 * its height is changed and the fixed header needs repositioning
				 */
				builder.$input.on('fw-builder:input:change'+ fixedHeaderEventsNamespace, function(){
					fixedHeaderHelpers.fix($fixedHeader, $this, $scrollParent);
				});

				/**
				 * Remove events from external elements
				 * In case the builder is created and remove dynamically multiple times, for e.g. inside fw.OptionsModal
				 */
				$this.on('remove', function(){
					$scrollParent.off(fixedHeaderEventsNamespace);
				});
			}

			$this.on('fw:option-type:builder:dump-json', function(e, data){
				if (typeof data != 'undefined' && typeof data.cid != 'undefined') {
					console.log('[Builder JSON Dump] Item '+ data.cid +'\n\n'+
						JSON.stringify(builder.findItemRecursive({cid: data.cid}))
					);
				} else {
					console.log('[Builder JSON Dump] Full\n\n'+
						JSON.stringify(builder.rootItems)
					);
				}
			});

			$this.trigger('fw:option-type:builder:init', $.extend({}, eventData, {
				builder: builder
			}));
		});

		// add special class for builders that has header tools div
		$options.find('> .builder-items-types .fw-builder-header-tools:not(.fw-hidden)')
			.closest('.fw-option-type-builder').addClass('has-header-tools')
			// Add "Save" post button if the builder is within edit post form
			.each(function(){
				var $postForm = $(this).closest('form#post');

				if (!$postForm.length) {
					return;
				}

				var isLocalStorageAvailable = function(){
						var test = 'test';
						try {
							localStorage.setItem(test, test);
							localStorage.removeItem(test);
							return true;
						} catch(e) {
							return false;
						}
					},
					localStorageKey = 'fw-ext-builder-save-scroll-position',
					$savePostButton = $postForm.find('input#publish'),
					$savePostBuilderButton = $(
						'<button'+
							' type="button"'+
							' class="button button-primary fw-pull-right fw-builder-header-post-save-button"'+
							' onclick="return false;">'+
						'</button>')
						.text($savePostButton.attr('value'))
						.on('click', function(){
							$(this).attr('disabled', 'disabled').off('click');

							if (isLocalStorageAvailable()) {
								localStorage.setItem(localStorageKey, $(window).scrollTop());
							}

							$savePostButton.trigger('click');
						});

				$(this).find('.fw-builder-header-tools:first')
					.prepend('<span class="pull-right">&nbsp;&nbsp;&nbsp;&nbsp;</span>')
					.prepend($savePostBuilderButton);

				if (isLocalStorageAvailable()) {
					var scrollTopOnLastSave = localStorage.getItem(localStorageKey);

					if (scrollTopOnLastSave !== null) {
						localStorage.removeItem(localStorageKey);

						// http://stackoverflow.com/a/16475234/1794248
						$('html, body').animate({scrollTop: scrollTopOnLastSave}, '100', 'swing');
					}
				}
			});

		$options.addClass('initialized');
	});
});
