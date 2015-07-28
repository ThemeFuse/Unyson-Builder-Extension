(function ($, fwe, _, localized) {
	fwe.one('fw:option-type:builder:init', function (data) {
		if (!data.$elements.length) {
			return;
		}

		var $builders = data.$elements;

		$builders.each(function(){
			var elements = {
				$builder: $(this),
				$input: $(this).find('> input:first'),
				$defaultLi: $('<li class="default-li">'+ localized.l10n.no_templates_saved +'</li>')
			},
			builderType = $(this).attr('data-builder-option-type');

			/**
			 * Create wrapper if not exists
			 * Note: The same wrapper may be created by the Undo/Redo script
			 */
			{
				elements.$navigation = elements.$builder.find('> .builder-items-types > .fw-builder-header-tools');

				if (elements.$navigation.length === 0) {
					elements.$builder.find('> .builder-items-types').append('<div class="fw-builder-header-tools fw-clearfix"></div>');
					elements.$navigation = elements.$builder.find('> .builder-items-types > .fw-builder-header-tools');
				}
			}

			elements.$navigation.append('<div class="template-container"><a class="template-btn">'+ localized.l10n.templates +'</a></div>');

			var utils = {
				modal: new fw.OptionsModal({
					title: localized.l10n.save_template,
					options: [
						{'template_name': {
							'type': 'text',
							'label': localized.l10n.template_name,
							'desc': localized.l10n.template_name_desc
						}}
					],
					values: ''
				}),
				generateList: function (json) {
					var ul = $('<ul/>');
					if (json.length === 0) {
						return ul.append(elements.$defaultLi);
					}
					var documentFragment = $(document.createDocumentFragment());

					$.each(json, function (key, value) {
						var li = $('<li>' + value.title + '<a class="template-delete dashicons fw-x" href="#"></a></li>').data('template-state', {'id': key, 'json': value.json});
						documentFragment.append(li);
					});

					return ul.append(documentFragment);
				}
			};

			utils.modal.on('change:values', function (modal, values) {
				$.ajax({
					type: "post",
					dataType: "json",
					url: ajaxurl,
					data: {
						'action': 'fw_builder_save_template',
						'template_name': values.template_name,
						'builder_json': elements.$input.val(),
						'builder_type': builderType
					}
				}).done(function (json) {
					if (!json.success) {
						console.error('Failed to save builder template', json);
						return;
					}

					var li = $(
						'<li>' + json.data.title + '<a class="template-delete dashicons fw-x" href="#"></a></li>'
					).data('template-state', {'id': json.data.id, 'json': json.data.json});
					elements.qtipApi.elements.tooltip.find('.default-li').remove();
					elements.qtipApi.elements.tooltip.find('ul').append(li);
					utils.modal.set('values', {}, {silent: true});
				})
				.fail(function (xhr, status, error) {});
			});

			var initTooltip = function (content) {
				elements.$builder.find('.template-btn').qtip({
					show: 'click',
					hide: 'unfocus',
					position: {
						at: 'bottom center',
						my: 'top center',
						viewport: $('body')
					},
					events: {
						render: function (e, api) {
							elements.qtipApi = api;
							api.elements.tooltip.find('.save-template').on('click', function (e) {
								e.preventDefault();
								utils.modal.open();
								api.hide();
							});

							api.elements.tooltip.on('click', 'li:not(.default-li)', function () {
								elements.builder.rootItems.reset(JSON.parse($(this).data('template-state').json));
							});

							api.elements.tooltip.on('click', '.template-delete', function (e) {
								e.preventDefault();
								e.stopPropagation();

								var self = $(this);

								$.ajax({
									type: "post",
									dataType: "json",
									url: ajaxurl,
									data: {
										'action': 'fw_builder_delete_template',
										'builder_type': builderType,
										'uniqid': $(this).closest('li').data('template-state').id
									}
								}).done(function (json) {
									if (!json.success) {
										console.error('Failed to delete builder template', json);
										return;
									}

									if (self.closest('ul').children().length === 1) {
										self.closest('ul').append(elements.$defaultLi);
									}
									self.closest('li').remove();
									api.reposition();
								});
							});
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
						text: content
					}
				});
			};

			$.ajax({
				type: "post",
				dataType: "json",
				url: ajaxurl,
				data: {
					'action': 'fw_builder_load_templates',
					'builder_type': builderType
				}
			})
			.done(function (json) {
				if (!json.success) {
					console.error('Failed to load builder templates', json);
					return;
				}

				var list = utils.generateList(json.data.templates),
					$wrapper = $(
						'<div class="fw-builder-templates-wrapper">' +
						'    <div class="navigation"><a href="#" class="save-template">'+ localized.l10n.save_template +'</a></div>' +
						'    <div class="templates-list">' +
						'        <div class="head-text"><i>'+ localized.l10n.load_template +':</i></div>' +
						'    </div>' +
						'</div>'
					);

				$wrapper.find('.templates-list').append(list);

				initTooltip($wrapper);
			});

			fwe.one('fw-builder:' + builderType + ':register-items', function (builder) {
				elements.builder = builder;
			});
		});
	});
})(jQuery, fwEvents, _, _fw_option_type_builder_templates);