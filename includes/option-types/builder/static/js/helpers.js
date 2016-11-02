var FwBuilderComponents = {
	Item: {},
	ItemView: {},
	Items: {},
	ItemsView: {}
};

/**
 * Change item width
 *
 * Usage:
 *
 * // in ItemView.initialize()
 *
 * this.widthChangerView = new FwBuilderComponents.ItemView.WidthChanger({
 *  model: this.model,
 *  view:  this,
 *  widths: [
 *      {
 *          title:          '1/12',
 *          id:             '1_12',
 *          backend_class:  'fw-col-sm-1',
 *          frontend_class: 'col-sm-1'
 *      },
 *      ...
 *      {
 *          title:          '12/12',
 *          id:             '12_12',
 *          backend_class:  'fw-col-sm-12',
 *          frontend_class: 'col-sm-12'
 *      }
 *  ],
 *  modelAttribute: 'width',
 * });
 *
 * // in ItemView.render()
 *
 * this.$('.some-class').append( this.widthChangerView.$el );
 *
 * this.widthChangerView.delegateEvents(); // rebind events after element "remove" happened
 */
FwBuilderComponents.ItemView.WidthChanger = Backbone.View.extend({
	tagName: 'div',
	className: 'fw-builder-item-width-changer',
	template: _.template(
		'<a href="#" class="decrease-width dashicons '+ (
			jQuery(document.body).hasClass('rtl') ? 'dashicons-arrow-right-alt2' : 'dashicons-arrow-left-alt2'
		) +'"'+
		/**//**/' onclick="return false;"></a>'+
		' <span class="current-width fw-wp-link-color"><%- title %></span> '+
		'<a href="#" class="increase-width dashicons '+ (
			jQuery(document.body).hasClass('rtl') ? 'dashicons-arrow-left-alt2' : 'dashicons-arrow-right-alt2'
		) +'"'+
		/**//**/' onclick="return false;"></a>'
	),
	events: {
		'click .decrease-width': 'decreaseWidth',
		'click .increase-width': 'increaseWidth'
	},
	widths: _fw_option_type_builder_helpers['item_widths'],
	/**
	 * The attribute name that will be changed in item on width changes
	 * this.model.set(this.modelAttribute, this.widths[N].id)
	 */
	modelAttribute: 'width',
	initialize: function(options) {
		_.extend(this, _.pick(options,
			'view',
			'widths',
			'modelAttribute'
		));

		// set special properties for first and last width
		{
			this.widths[0].first = true;
			this.widths[ this.widths.length - 1 ].last = true;
		}

		this.listenTo(this.model, 'change:' + this.modelAttribute, this.render);

		this.render();
	},
	render: function() {
		this.updateWidth();

		var widthId    = this.model.get(this.modelAttribute);
		var width      = _.findWhere(this.widths, {id: widthId});
		var widthTitle = '?';

		if (width) {
			widthTitle = width.title;
		}

		{
			this.$el.removeClass('is-first is-last');

			if (!!width.first) {
				this.$el.addClass('is-first');
			}

			if (!!width.last) {
				this.$el.addClass('is-last');
			}
		}

		this.$el.html(
			this.template({
				title: widthTitle
			})
		);
	},
	decreaseWidth: function(e) {
		e.stopPropagation();

		var widthId           = this.model.get(this.modelAttribute);
		var widthsIds         = _.pluck(this.widths, 'id');
		var currentWidthIndex = _.indexOf(widthsIds, widthId);

		if (currentWidthIndex == -1) {
			// Current id does not exists (invalid) set first width
			widthId = widthsIds[0];
		} else if (currentWidthIndex == 0) {
			// Do nothing, this is the smallest width
		} else {
			// Set smaller width
			widthId = widthsIds[currentWidthIndex - 1];
		}

		this.updateWidth(widthId);
	},
	increaseWidth: function(e) {
		e.stopPropagation();

		var widthId           = this.model.get(this.modelAttribute);
		var widthsIds         = _.pluck(this.widths, 'id');
		var currentWidthIndex = _.indexOf(widthsIds, widthId);

		if (currentWidthIndex == -1) {
			// Current id does not exists (invalid) set last width
			widthId = widthsIds[ widthsIds.length - 1 ];
		} else if (currentWidthIndex == widthsIds.length - 1) {
			// Do nothing, this is the biggest width
		} else {
			// Set bigger width
			widthId = widthsIds[currentWidthIndex + 1];
		}

		this.updateWidth(widthId);
	},
	updateWidth: function(widthId) {
		if (typeof widthId == 'undefined') {
			widthId = this.model.get(this.modelAttribute);
		}

		var widthsIds = _.pluck(this.widths, 'id');

		// check if correct
		if (-1 == _.indexOf(widthsIds, widthId)) {
			// set default
			widthId = widthsIds[
				parseInt(widthsIds.length / 2) // middle width
			];
		}

		if (widthId != this.model.get(this.modelAttribute)) {
			// set only when is different, to prevent trigger actions on those who listens to model 'change'
			this.model.set(this.modelAttribute, widthId);
		}

		this.view.$el
			.removeClass(
				_.pluck(this.widths, 'backend_class').join(' ')
			)
			.addClass(
				_.findWhere(this.widths, {id: widthId})['backend_class']
			);
	}
});

/**
 * Usage:
 *
 * // in ItemView.initialize()
 *
 * this.inlineEditor = new FwBuilderComponents.ItemView.InlineTextEditor({
 *  model: item,
 *  editAttribute: 'model_attr_name' // also is available nested attribute property notation: 'a/b/c' will do {a: {b: {c: 'value'}}}
 * })
 *
 * // in ItemView.render()
 *
 * this.$('.some-class').append( this.inlineEditor.$el );
 *
 * this.inlineEditor.delegateEvents(); // rebind events after element "remove" happened
 */
FwBuilderComponents.ItemView.InlineTextEditor = Backbone.View.extend({
	tagName: 'div',
	className: 'fw-builder-item-inline-text-editor',
	template: _.template(
		'<input type="text" style="width: auto;" value="<%- value %>" onclick="return false;">&nbsp;<button class="button" onclick="return false;"><%- save %></button>'
	),
	events: {
		'change input': 'update',
		'focusout input': 'hide'
	},
	render: function() {
		var localized = _fw_option_type_builder_helpers;

		this.$el.html(
			this.template({
				value: this.editAttributeWitoutRoot
					? fw.opg(this.editAttributeWitoutRoot, this.model.get(this.editAttributeRoot))
					: this.model.get(this.editAttributeRoot),
				save: localized.l10n.save
			})
		);

		this.$el.addClass('fw-hidden');
	},
	initialize: function(options) {
		_.extend(this, _.pick(options,
			'editAttribute'
		));

		this.delimiter = '/';

		/**
		 * From 'a/b/c', extract: 'a' and 'b/c'
		 */
		{
			var editAttributeSplit = this.editAttribute.split(this.delimiter);

			this.editAttributeRoot       = editAttributeSplit.shift();
			this.editAttributeWitoutRoot = editAttributeSplit.join(this.delimiter);
		}

		this.listenTo(this.model, 'change:'+ this.editAttributeRoot, this.render);

		this.render();
	},
	update: function() {
		var val = this.$el.find('input').val();

		var value = this.editAttributeWitoutRoot
			? fw.ops(this.editAttributeWitoutRoot, val,
				// clone to not change by reference, else values will be equal and model.set() will not trigger 'change'
				_.clone(this.model.get(this.editAttributeRoot)))
			: val;

		this.model.set(this.editAttributeRoot, value);
	},
	hide: function() {
		this.$el.addClass('fw-hidden');

		this.trigger('hide');
	},
	show: function() {
		this.$el.removeClass('fw-hidden');
		this.$el.find('input').focus();
		return this;
	}
});

FwBuilderComponents.ItemView.iconToHtml = function(icon) {
	if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(icon)) {
		// http://.../image.png
		return jQuery('<div>').append(
			jQuery('<img />')
				.attr('class', 'fw-ext-builder-icon')
				.attr('src', icon)
		).html();
	} else if (/^[a-zA-Z0-9\-_ ]+$/.test(icon)) {
		// 'font-icon font-icon-class'
		return jQuery('<div>').append(
			jQuery('<span></span>')
				.attr('class', 'fw-ext-builder-icon '+ jQuery.trim(icon))
		).html();
	} else {
		// can't detect. maybe it's raw html '<span ...'
		return icon;
	}
};