(function ($, fwe, _, localized) {
	$(document.body).on('fw:option-type:builder:init', function(e, data) {
		var inst = {
			$el: {
				builder: $(e.target),
				tooltipContent: $('<div class="fw-builder-templates-tooltip-content"></div>'),
				tooltipLoading: $(
					'<div class="fw-builder-templates-tooltip-loading">'+
					/**/'<div class="loading-icon fw-animation-rotate-reverse-180 unycon unycon-unyson-o"></div>'+
					'</div>'
				),
				headerTools: data.$headerTools
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
			tooltipApi: null, // initialized below
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
						tooltipRefreshCallback: _.bind(this.refresh, this),
						tooltipHideCallback: _.bind(function(){ this.tooltipApi.hide(); }, this)
					});

					this.$el.tooltipContent.trigger('fw:option-type:builder:templates:after-html-replace');
				}, this))
				.fail(_.bind(function(xhr, status, error){
					this.isBusy = false;
					this.tooltipLoading.hide();

					fw.soleModal.show(
						'fw-builder-templates-error',
						'<h4>Ajax Error</h4><p class="fw-text-danger">'+ String(error) +'</p>',
						{showCloseButton: false}
					);
				}, this));
			}
		};

		inst.$el.headerTools
			.removeClass('fw-hidden')
			.append(
				'<div class="template-container fw-pull-right">' +
				/**/'<a class="template-btn" href="#" onclick="return false;">'+ localized.l10n.templates +'</a>' +
				'</div>'
			);

		inst.tooltipApi = inst.$el.headerTools
			.find('.template-container .template-btn')
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
			})
			.qtip('api');

			/**
			 * Accordion
			 */
			inst.$el.tooltipContent
				.on(
					'click',
					'.fw-builder-templates-types > .fw-builder-templates-type > .fw-builder-templates-type-title',
					function() {
						var $wrapper = $(this).closest('.fw-builder-templates-type'),
							$content = $wrapper.find('> .fw-builder-templates-type-content'),
							$root = $wrapper.closest('.fw-builder-templates-types'),
							specialClass = 'current';

						if ($root.hasClass('is-busy')) {
							return;
						} else {
							$root.addClass('is-busy');
						}

						$content.addClass(specialClass);

						$root
							.find('> .fw-builder-templates-type > .fw-builder-templates-type-content:not(.'+specialClass+'):not(.fw-hidden)')
							.slideUp(function(){
								$(this).addClass('fw-hidden').removeAttr('style');
							});

						$content.removeClass(specialClass);
						inst.$el.tooltipContent.removeAttr('data-open-type');

						if ($content.hasClass('fw-hidden')) {
							$content
								.css('display', 'none')
								.removeClass('fw-hidden')
								.slideDown(function(){
									$root.removeClass('is-busy');
									$(this).removeAttr('style');
									inst.$el.tooltipContent.attr('data-open-type', $wrapper.attr('data-type'));
								});
						} else {
							$content.slideUp(function(){
								$root.removeClass('is-busy');
								$(this).addClass('fw-hidden').removeAttr('style');
							});
						}
					}
				)
				.on('fw:option-type:builder:templates:after-html-replace', function(){
					// reopen accordion type that was open before tooltip html replace
					{
						var openType = inst.$el.tooltipContent.attr('data-open-type');

						if (openType) {
							inst.$el.tooltipContent // close all
								.find('.fw-builder-templates-types > .fw-builder-templates-type > .fw-builder-templates-type-content')
								.addClass('fw-hidden');

							inst.$el.tooltipContent // open one
								.find('.fw-builder-templates-types > .fw-builder-templates-type-'+ openType +' > .fw-builder-templates-type-content')
								.removeClass('fw-hidden');
						}
					}
				});
	});
})(jQuery, fwEvents, _, _fw_option_type_builder_templates);
