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
						 * View that contains sortable with items views
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

								// markItemAsNew(item); // prevent glitches
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
						initSortableTimeout: 0,
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
							{
								this.collection.each(function(item) {
									item.view.$el.detach();
								});
							}

							if (this.$el.hasClass('ui-sortable')) {
								this.$el.sortable('destroy');
							}

							this.$el.html(this.template({
								items: this.collection
							}));

							var that = this;

							this.collection.each(function(item) {
								that.$el.append(item.view.$el);
							});

							/**
							 * init sortable with delay, after element added to DOM
							 * fixes bug: sortable sometimes not initialized if element is not in DOM
							 */
							{
								clearTimeout(this.initSortableTimeout);

								this.initSortableTimeout = setTimeout(function(){
									that.initSortable();
								}, 12);
							}

							return this;
						},
						initSortable: function(){
							var hasDragAndDrop = builder.rootItems.view.$el
								.closest('.fw-option-type-builder')
								.attr('data-drag-and-drop');

							if (! hasDragAndDrop) {
								return;
							}

							if (this.$el.hasClass('ui-sortable')) {
								// already initialized
								return false;
							}

							// remove "allowed" and "denied" classes from all items
							function itemsRemoveAllowedDeniedClasses() {
								builder.rootItems.view.$el.removeClass(
									'fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type'
								);

								forEachItemRecursive(builder.rootItems, function(item){
									item.view.$el.removeClass(
										'fw-builder-item-allow-incoming-type fw-builder-item-deny-incoming-type'
									);
								});
							}

							var rearrangeTimeout;

							this.$el.sortable({
								helper: 'clone',
								items: '> .builder-item',
								connectWith: '#'+ builder.$input.closest('.fw-option-type-builder').attr('id') +' .builder-root-items .builder-items',
								distance: 10,
								opacity: 0.6,
								scrollSpeed: 10,
								placeholder: 'fw-builder-placeholder',
								tolerance: 'pointer',
								start: function(event, ui) {
									{
										ui.placeholder
											.addClass(ui.item.attr('class'))
											.css('height', ui.helper.outerHeight());

										if (!parseInt(ui.placeholder.css('padding-top'))) {
											ui.placeholder.addClass('no-top');
										}

										if (ui.item.hasClass('builder-item-type')) {
											ui.placeholder
												.removeClass('builder-item-type')
												.css('width', '100%');
										}
									}

									// check if it is an exiting item (and create variables)
									{
										// extract cid from view id
										var movedItemCid = ui.item.attr('id');

										if (!movedItemCid) {
											// not an existing item, it's a thumbnail from draggable
											return;
										}

										movedItemCid = movedItemCid.split('-').pop();

										if (!movedItemCid) {
											// not an existing item, it's a thumbnail from draggable
											return;
										}

										var movedItem = builder.findItemRecursive({cid: movedItemCid});

										if (!movedItem) {
											console.warn('Item not found (cid: "'+ movedItemCid +'")');
											return;
										}

										// fixme: this is hardcode. need to think a better/general solution
										if (movedItem.attributes.type != 'column'
											&& movedItem.attributes.type != 'section') {
											ui.item.parents('.builder-root-items').addClass('fw-move-simple-item');
										}
									}

									var movedItemType = movedItem.get('type');

									/**
									 * add "allowed" classes to items vies where allowIncomingType(movedItemType) returned true
									 * else add "denied" class
									 */
									{
										{
											if (movedItem.allowDestinationType(null)) {
												builder.rootItems.view.$el.addClass('fw-builder-item-allow-incoming-type');
											} else {
												builder.rootItems.view.$el.addClass('fw-builder-item-deny-incoming-type');
											}
										}

										forEachItemRecursive(builder.rootItems, function(item){
											if (item.cid === movedItemCid) {
												// this is current moved item
												return;
											}

											if (
												item.allowIncomingType(movedItemType)
												&&
												movedItem.allowDestinationType(item.get('type'))
											) {
												item.view.$el.addClass('fw-builder-item-allow-incoming-type');
											} else {
												item.view.$el.addClass('fw-builder-item-deny-incoming-type');
											}
										});
									}

									// Freeze the container height
									{
										var container = builder.$input.closest('.fw-option-type-builder')
											.find( '.builder-root-items > .builder-items');

										container.css('min-height', container.height() +'px' );
									}
								},
								stop: function(event, ui) {
									clearTimeout(rearrangeTimeout);

									itemsRemoveAllowedDeniedClasses();

									ui.item.parents('.builder-root-items').removeClass('fw-move-simple-item');

									// unfreeze the container height
									{
										var container = builder.$input.closest('.fw-option-type-builder')
											.find( '.builder-root-items > .builder-items');

										container.css('min-height', '');
									}
								},
								receive: function(event, ui) {
									// sometimes the "stop" event is not triggered and classes remains
									itemsRemoveAllowedDeniedClasses();

									{
										var currentItemType = null; // will remain null if it is root collection
										var currentItem;

										if (this.collection._item) {
											currentItemType = this.collection._item.get('type');
											currentItem     = this.collection._item;
										}
									}

									var incomingItemType = ui.item.attr('data-builder-item-type');

									if (incomingItemType) {
										// received item type from draggable

										var IncomingItemClass = builder.getRegisteredItemClassByType(incomingItemType);

										if (IncomingItemClass) {
											if (
												IncomingItemClass.prototype.allowDestinationType(currentItemType)
												&&
												(
													!currentItemType
													||
													currentItem.allowIncomingType(incomingItemType)
												)
											) {
												this.collection.add(
													new IncomingItemClass({}, {
														$thumb: ui.item
													}),
													{
														at: this.$el.find('> .builder-item-type').index()
													}
												);
											} else {
												// replace all html, so dragged element will be removed
												this.render();
											}
										} else {
											console.error('Unregistered item type: '+ incomingItemType);

											this.render();
										}
									} else {
										// received existing item from another sortable

										if (!ui.item.attr('id')) {
											console.warn('Invalid view id', ui.item);
											return;
										}

										// extract cid from view id
										var incomingItemCid = ui.item.attr('id').split('-').pop();

										var incomingItem = builder.findItemRecursive({cid: incomingItemCid});

										if (!incomingItem) {
											console.warn('Item not found (cid: "'+ incomingItemCid +'")');
											return;
										}

										var incomingItemType = incomingItem.get('type');
										var IncomingItemClass = builder.getRegisteredItemClassByType(incomingItemType);

										if (
											IncomingItemClass.prototype.allowDestinationType(currentItemType)
											&&
											(
												!currentItemType
												||
												currentItem.allowIncomingType(incomingItemType)
											)
										) {
											// move item from one collection to another
											{
												var at = ui.item.index();

												// prevent 'remove', that will remove all events from the element
												incomingItem.view.$el.detach();

												incomingItem.collection.remove(incomingItem);

												this.collection.add(incomingItem, {
													at: at
												});
											}
										} else {
											console.warn('[Builder] Item move denied');
											ui.sender.sortable('cancel');
										}
									}
								}.bind(this),
								update: function (event, ui) {
									if (ui.item.attr('data-ignore-update-once')) {
										ui.item.removeAttr('data-ignore-update-once');
										return;
									}

									if (ui.item.attr('data-builder-item-type')) {
										// element just received from draggable, it is not builder item yet, do nothing
										return;
									}

									if (!ui.item.attr('id')) {
										console.warn('Invalid item, no id');
										return;
									}

									if (!$(this).find('> #'+ ui.item.attr('id') +':first').length) {
										// Item not in sortable, probably moved to another sortable, do nothing

										/**
										 * Right after this event, is expected to be next 'update' for on same item.
										 * But between this two 'update' is a 'receive' that takes care about item move from
										 * one collection to another and place ar right index position in destination model,
										 * so it is better to ignore next coming 'update'.
										 * Set a special attribute to ignore 'update' once
										 */
										ui.item.attr('data-ignore-update-once', 'true');

										return;
									}

									// extract cid from view id
									var itemCid = ui.item.attr('id').split('-').pop();

									var item = builder.findItemRecursive({cid: itemCid});

									if (!item) {
										console.warn('Item not found (cid: "'+ itemCid +'")');
										return;
									}

									var index = ui.item.index();

									// change item position in collection
									{
										var collection = item.collection;

										// prevent 'remove', that will remove all events from the element
										item.view.$el.detach();

										collection.remove(item);

										collection.add(item, {at: index});
									}
								}
							});

							/**
							 * Delay placeholder possition change to prevent "jumping"
							 * Fixes https://github.com/ThemeFuse/Unyson-PageBuilder-Extension/issues/25
							 * Original code https://github.com/jquery/jquery-ui/blob/1.12.0-rc.2/ui/widgets/sortable.js#L1384
							 * Note: Uses the above `var rearrangeTimeout;`
							 */
							this.$el.sortable('instance')._rearrange = function(event, i, a, hardRefresh) {
								clearTimeout(rearrangeTimeout);

								rearrangeTimeout = setTimeout(function(){
									/* The Original Code:
									 a ? a[0].appendChild(this.placeholder[0]) : i.item[0].parentNode.insertBefore(this.placeholder[0], (this.direction === "down" ? i.item[0] : i.item[0].nextSibling));
									 */
									if (this.a) {
										this.a[0].appendChild(this.instance.placeholder[0]);
									} else {
										if (this.instance.placeholder.parent().length) {
											this.i.item[0].parentNode.insertBefore(
												this.instance.placeholder[0],
												(this.direction === "down" ? this.i.item[0] : this.i.item[0].nextSibling)
											);
										} else {
											/**
											 * This happens for draggable items
											 * Do nothing to prevent DOM flood with orphaned placeholders
											 */
										}
									}

									/* The Original Code:
									 //Various things done here to improve the performance:
									 // 1. we create a setTimeout, that calls refreshPositions
									 // 2. on the instance, we have a counter variable, that get's higher after every append
									 // 3. on the local scope, we copy the counter variable, and check in the timeout, if it's still the same
									 // 4. this lets only the last addition to the timeout stack through
									 this.counter = this.counter ? ++this.counter : 1;
									 var counter = this.counter;

									 this._delay(function() {
									 if(counter === this.counter) {
									 this.refreshPositions(!hardRefresh); //Precompute after each DOM insertion, NOT on mousemove
									 }
									 });
									 */
									this.instance.refreshPositions(!this.hardRefresh);
								}.bind({
									instance: this,
									i: i,
									a: a,
									hardRefresh: hardRefresh,
									direction: this.direction
								}), 100);
							};

							return true;
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
							 * Sometimes sub items sortable view is not initialized or (destroyed if was initialized)
							 * Tell it to render and maybe it will fix itself
							 */
							if (!_items.view.$el.hasClass('ui-sortable')) {
								_items.view.render();
							}

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

			/**
			 * Something happened in WP 4.5 (or backbone.relational compatibility with latest backbone)
			 * and items restored from input doesn't have the .collection property
			 * and it's impossible to remove them from builder (console errors).
			 * So loop recursive and fix item.collection
			 */
			{
				function _fixItemsCollections(collection, c) {
					if (typeof collection.cid != 'undefined') {
						// it's a model, the second param is the collection
						collection = c;
					}

					collection.each(function(item){
						item.collection = collection;

						item.collection.off(null, _fixItemsCollections);
						item.collection.on('reset add', _fixItemsCollections);

						/**
						 * Sometimes item.get('_items') is empty at this point, wait a few milliseconds
						 * Bad solution, I home BackboneRelation will be fixed and this code will be removed
						 */
						setTimeout(_.bind(function(){ _fixItemsCollections(this.get('_items')); }, item), 0);
					});
				}

				this.rootItems.on('reset add', _fixItemsCollections);
			}

			// prepare this.$input
			{
				if (typeof options.$input == 'undefined') {
					console.warn('$input not specified. Items will no be saved');

					this.$input = $('<input type="hidden">');
				} else {
					this.$input = options.$input;
				}

				fwEvents.trigger('fw-builder:'+ this.get('type') +':register-items', this);

				// load saved items from input
				{
					try {
						this.rootItems.reset(JSON.parse(this.$input.val() || '[]'));

						fwEvents.trigger('fw-builder:'+ this.get('type') +':items-loaded', this);
					} catch (e) {
						console.error('Failed to recover items from input', e);
					}
				}

				// listen to items changes and update input
				(function(){
					function saveBuilderValueToInput() {
						builder.$input.val(JSON.stringify(builder.rootItems));
						builder.$input.trigger('fw-builder:input:change');
						builder.$input.trigger('change');
					}

					/**
					 * use timeout to not load browser/cpu when there are many changes at once (for e.g. on .reset())
					 */
					var saveTimeout = 0;

					builder.listenTo(builder.rootItems, 'builder:change', function(){
						clearTimeout(saveTimeout);

						saveTimeout = setTimeout(function(){
							saveTimeout = 0;

							saveBuilderValueToInput();
						}, 100);
					});

					/**
					 * Save value to input if there is a pending timeout on form submit
					 */
					builder.$input.closest('form').on('submit', function(){
						if (saveTimeout) {
							clearTimeout(saveTimeout);
							saveTimeout = 0;

							saveBuilderValueToInput();
						}
					});
				})();
			}
		}
	});

	fwExtBuilderInitialize.init(Builder);
});
