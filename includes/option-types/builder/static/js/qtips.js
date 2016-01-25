/**
* Create qTips for elements with data-hover-tip="Tip Text" attribute
*/
window.RootItemsTips = (function(rootItems){
	var $ = jQuery;

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
