(function($){
	fwEvents.on('fw:option-type:builder:templates:init', function(data){
		var loading = data.tooltipLoading,
			builderType = data.builderType,
			builder = data.builder;

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
						'builder_type': builderType,
						'template_id': templateId
					}
				})
					.done(function(json){
						loading.hide();

						if (!json.success) {
							console.error('Failed to load builder template', json);
							return;
						}

						builder.rootItems.reset(JSON.parse(json.data.json));
					})
					.fail(function(xhr, status, error){
						loading.hide();

						console.error('Ajax error', error);
					});
			})
			.on('click', 'a[data-delete-template]', function(){
				var templateId = $(this).attr('data-delete-template');

				console.log(templateId);
			});
	});
})(jQuery);