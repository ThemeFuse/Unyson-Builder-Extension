(function($, localized){
	{
		var modals = {},
			getModal = function(builder){
				if (typeof modals[builder.cid] == 'undefined') {
					modals[builder.cid] = new fw.OptionsModal({
						title: localized.l10n.save_template,
						options: [
							{
								'template_name': {
									'type': 'text',
									'label': localized.l10n.template_name,
									'desc': localized.l10n.template_name_desc
								}
							}
						],
						values: ''
					});

					var loadingId = 'fw-builder-templates-full-save:'+ builder.get('type');

					modals[builder.cid].on('change:values', function (modal, values) {
						fw.loading.show(loadingId);

						$.ajax({
							type: 'post',
							dataType: 'json',
							url: ajaxurl,
							data: {
								'action': 'fw_builder_templates_full_save',
								'template_name': values.template_name,
								'builder_json': JSON.stringify(builder.rootItems),
								'builder_type': builder.get('type')
							}
						})
							.done(function (json) {
								fw.loading.hide(loadingId);

								if (!json.success) {
									console.error('Failed to save builder template', json);
									return;
								}

								modal.set('values', {}, {silent: true});
							})
							.fail(function (xhr, status, error) {
								fw.loading.hide(loadingId);

								console.error('Ajax save error', error);
							});
					});
				}

				return modals[builder.cid];
			};
	}

	fwEvents.on('fw:option-type:builder:templates:init', function(data){
		var loading = data.tooltipLoading,
			builder = data.builder,
			tooltipHideCallback = data.tooltipHideCallback,
			tooltipRefreshCallback = data.tooltipRefreshCallback;

		data.$elements.find('.fw-builder-templates-type-full')
			.on('click', 'a[data-load-template]', function(){
				var templateId = $(this).attr('data-load-template');

				loading.show();

				$.ajax({
					type: 'post',
					dataType: 'json',
					url: ajaxurl,
					data: {
						'action': 'fw_builder_templates_full_load',
						'builder_type': builder.get('type'),
						'template_id': templateId
					}
				})
					.done(function(json){
						loading.hide();

						if (!json.success) {
							console.error('Failed to load builder template', json);
							return;
						}

						if (JSON.stringify(builder.rootItems) === json.data.json) {
							console.log('Loaded value is the same as current');
						} else {
							builder.rootItems.reset(JSON.parse(json.data.json));
						}

						tooltipHideCallback();
					})
					.fail(function(xhr, status, error){
						loading.hide();

						console.error('Ajax error', error);
					});
			})
			.on('click', 'a[data-delete-template]', function(){
				var templateId = $(this).attr('data-delete-template');

				loading.show();

				$.ajax({
					type: 'post',
					dataType: 'json',
					url: ajaxurl,
					data: {
						'action': 'fw_builder_templates_full_delete',
						'builder_type': builder.get('type'),
						'template_id': templateId
					}
				})
					.done(function(json){
						loading.hide();

						if (!json.success) {
							console.error('Failed to delete builder template', json);
							return;
						}

						tooltipRefreshCallback();
					})
					.fail(function(xhr, status, error){
						loading.hide();

						console.error('Ajax error', error);
					});
			})
			.on('click', 'a.save-template', function () {
				tooltipHideCallback();
				getModal(builder).open();
			});
	});
})(jQuery, _fw_option_type_builder_templates_full);