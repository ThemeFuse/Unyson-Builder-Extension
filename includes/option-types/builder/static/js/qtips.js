/**
 * Create qTips for elements with data-hover-tip="Tip Text" attribute
 */
window.fwExtBuilderRootItemsTips = (function(rootItems){
	var $ = jQuery,
		/**
		 * Store all created qTip instances APIs
		 */
		tipsAPIs = [],
		destroyTips = function(){
			_.each(tipsAPIs, function(api) { api.destroy(true); });

			tipsAPIs = [];
		},
		makeTip = function($el){
			if ($el.attr('data-hasqtip')) {
				return;
			}

			$el.qtip({
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
					text: $el.attr('data-hover-tip')
				}
			});

			tipsAPIs.push($el.qtip('api'));

			$el.qtip('api').show();
		};

	rootItems.view.$el.on('mouseenter', '[data-hover-tip]', function(){
		makeTip($(this));
	});

	rootItems.on('builder:change', function(){
		destroyTips();
	});
});
