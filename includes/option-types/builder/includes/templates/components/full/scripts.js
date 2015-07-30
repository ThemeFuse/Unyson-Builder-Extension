(function($){
	fwEvents.on('fw:option-type:builder:templates:init', function(data){
		data.$elements.find('.fw-builder-templates-type-full')
			.on('click', 'a[data-load-template]', function(){
				var templateId = $(this).attr('data-load-template');

				console.log(templateId);
			})
			.on('click', 'a[data-delete-template]', function(){
				var templateId = $(this).attr('data-delete-template');

				console.log(templateId);
			});
	});
})(jQuery);