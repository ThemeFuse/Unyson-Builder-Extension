(function ($, fwe, _, localized) {
	fwe.on('fw:option-type:builder:init', function (data) {
		if (!data.$elements.length) {
			return;
		}

		if (!$('#post_ID').length) {
			/**
			 * Don't enable fullscreen if not on post edit page
			 * Because this script requires the Publish and Preview post buttons
			 */
			return;
		}

		var elements = {
			$saveButton: $('#publish'),
			$previewButton: $('#post-preview')
		};

		var utils = {
			toogleFullscreen: function ($builder) {
				if ($builder.hasClass('builder-fullscreen')) {
					utils.fullscreenOff.call($builder);
					utils.unsetStorageItem();
				} else {
					utils.fullscreenOn.call($builder);
				}
			},
			getFullscreenHeight: function () {
				var $diffHeight = parseInt($('.builder-items-types').height() + 80);
				return parseInt($('body').height() - $diffHeight);
			},
			selectBackdrop: function ($builder) {
				return $builder.next('.fw-option-type-builder-fullscreen-backdrop');
			},
			fullscreenOn: function () {
				var $builder = $(this);

				utils.selectBackdrop($builder).removeClass('fw-hidden');
				$builder.addClass('builder-fullscreen');
				$(document.body).css('overflow-y', 'hidden'); // remove body scroll

				$builder.find('> .builder-items-types .fullscreen-btn .text').text(localized.l10n.exit_fullscreen);
				$builder.find('> .builder-items-types .fullscreen-btn .icon').removeClass('icon-fullscreen-on').addClass('icon-fullscreen-off');
				$builder.find('> .builder-root-items')
					.css({'max-height': utils.getFullscreenHeight() + 'px'})
					.on('scroll.builder-fullscreen', function(){
						$builder.find('> .builder-items-types').css(
							'border-bottom-color',
							$(this).scrollTop() ? '#eee' : ''
						);
					});
			},
			fullscreenOff: function () {
				var $builder = $(this);

				utils.selectBackdrop($builder).addClass('fw-hidden');
				$builder.removeClass('builder-fullscreen');
				$(document.body).css('overflow-y', '');

				$builder.find('> .builder-items-types .fullscreen-btn .text').text(localized.l10n.fullscreen);
				$builder.find('> .builder-items-types .fullscreen-btn .icon').removeClass('icon-fullscreen-off').addClass('icon-fullscreen-on');
				$builder.find('> .builder-root-items')
					.css({'max-height': ''})
					.off('.builder-fullscreen');
				$builder.find('> .builder-items-types').css('border-bottom-color', '');
			},
			getPostId: function () {
				return $('#post_ID').val();
			},
			setStorageItem: function () {
				return $.ajax({
					type: "post",
					dataType: "json",
					url: ajaxurl,
					data: {
						'action': 'fw_builder_fullscreen_set_storage_item',
						'post_id': utils.getPostId()
					}
				});
			},
			unsetStorageItem: function () {
				return $.ajax({
					type: "post",
					dataType: "json",
					url: ajaxurl,
					data: {
						'action': 'fw_builder_fullscreen_unset_storage_item',
						'post_id': utils.getPostId()
					}
				});
			}
		};

		data.$elements.each(function(){
			var $builder = $(this);

			$builder.find('.fw-options-tabs-list ul').before(
				'<div class="fullscreen-btn">'+
				'    <div class="icon icon-fullscreen-on"></div>'+
				'    <div class="text">'+ localized.l10n.fullscreen +'</div>'+
				'</div>'
			);

			$builder.find('> .builder-items-types .fullscreen-btn').on('click', function(e){
				e.preventDefault();
				utils.toogleFullscreen($builder);
			});

			utils.selectBackdrop($builder)
				.on('click', '.preview', function (e) {
					e.preventDefault();
					utils.setStorageItem();
					elements.$previewButton.trigger('click');
				})
				.one('click', '.button-primary', function (e) {
					e.preventDefault();
					utils.selectBackdrop($builder).removeClass('fw-hidden');
					utils.setStorageItem().done(function () {
						elements.$saveButton.focus().trigger('click');
					});
				});

			if ($builder.hasClass('builder-fullscreen')) {
				$builder.removeClass('builder-fullscreen');
				utils.toogleFullscreen($builder);
			}
		});
	});
})(jQuery, fwEvents, _, _fw_option_type_builder_fullscreen);

