(function ($, fwe, _, localized) {
	fwe.one('fw:option-type:builder:init', function () {
		// if at least there is one builder init, start listening dom event on body
		$(document.body).on('fw:option-type:builder:init', function(e, data) {
			var inst = {
				$el: {
					builder: $(e.target),
					tooltipContent: $('<div class="fw-builder-templates-tooltip-content"></div>'),
					tooltipLoading: $('<div class="fw-builder-templates-tooltip-loading"></div>')
				},
				builder: data.builder,
				isBusy: false,
				tooltipLoading: {
					show: function() {
						inst.$el.tooltipContent.prepend(inst.$el.tooltipLoading);
					},
					hide: function() {
						inst.$el.tooltipLoading.detach();
					}
				},
				refresh: function() {
					if (this.isBusy) {
						console.log('Working... Try again later');
						return;
					}

					this.isBusy = true;
					this.tooltipLoading.show();

					$.ajax({
						type: 'post',
						dataType: 'json',
						url: ajaxurl,
						data: {
							'action': 'fw_builder_templates_render',
							'builder_type': this.builder.get('type')
						}
					})
						.done(_.bind(function(json){
							this.isBusy = false;
							this.tooltipLoading.hide();

							if (!json.success) {
								console.error('Failed to render builder templates', json);
								return;
							}

							this.$el.tooltipContent.html(json.data.html);

							/**
							 * Html was replaced
							 * Components that have html in tooltip, must init js events
							 */
							fwe.trigger('fw:option-type:builder:templates:init', {
								$elements: this.$el.tooltipContent,
								builder: this.builder,
								tooltipLoading: this.tooltipLoading,
								tooltipRefreshCallback: _.bind(this.refresh, this)
							});
						}, this))
						.fail(_.bind(function(xhr, status, error){
							this.isBusy = false;
							this.tooltipLoading.hide();

							console.error('Ajax error', error);
						}, this));
				}
			};

			inst.$el.builder.find('> .builder-items-types > .fw-builder-header-tools')
				.removeClass('fw-hidden')
				.append(
					'<div class="template-container fw-pull-right">' +
						'<a class="template-btn" href="#" onclick="return false;">'+ localized.l10n.templates +'</a>' +
					'</div>'
				);

			inst.$el.builder
				.find('> .builder-items-types > .fw-builder-header-tools .template-container .template-btn')
				.qtip({
					show: 'click',
					hide: 'unfocus',
					position: {
						at: 'bottom center',
						my: 'top center',
						viewport: $(document.body)
					},
					events: {
						show: function () {
							inst.refresh();
						}
					},
					style: {
						classes: 'qtip-fw qtip-fw-builder',
						tip: {
							width: 12,
							height: 5
						},
						width: 180
					},
					content: {
						text: inst.$el.tooltipContent
					}
				});
		});
	});
})(jQuery, fwEvents, _, _fw_option_type_builder_templates);