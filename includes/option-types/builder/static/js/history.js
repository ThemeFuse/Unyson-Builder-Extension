(function ($, fwe, _, localized) {

	$(document.body).on('fw:option-type:builder:init', function (e, data) {
		var elements = {
				$builder: $(e.target),
				$undo: $('<a class="disabled undo" href="#">'+ localized.l10n.undo +'</a>'),
				$redo: $('<a class="disabled redo" href="#">'+ localized.l10n.redo +'</a>')
			},
			saveStateFlag = true,
			builder = data.builder,
			type = builder.get('type');

		data.$headerTools
			.removeClass('fw-hidden')
			.append('<div class="history-container"></div>')
			.find('> .history-container')
			.append(elements.$undo)
			.append(elements.$redo);

		var utils = {
			disableUndo: function () {
				elements.$undo.addClass('disabled');
			},
			enableUndo: function () {
				elements.$undo.removeClass('disabled');
			},
			disableRedo: function () {
				elements.$redo.addClass('disabled');
			},
			enableRedo: function () {
				elements.$redo.removeClass('disabled');
			}
		};

		var history = {
			storage: [],
			activeIndex: 0,
			undo: function () {
				--this.activeIndex;

				if ((this.activeIndex === 0)) {
					utils.disableUndo();
				}

				return this.storage[this.activeIndex];
			},
			redo: function () {
				++this.activeIndex;
				if (this.activeIndex === this.storage.length - 1) {
					utils.disableRedo();
				}

				return this.storage[this.activeIndex];
			},
			saveState: function (item) {
				this.storage = _.initial(this.storage, (this.storage.length-1) - this.activeIndex);
				this.storage.push(item);
				this.activeIndex = this.storage.length - 1;
			}
		};

		history.saveState(builder.$input.val());

		builder.$input.on('fw-builder:input:change', function () {
			if (true === saveStateFlag) {
				history.saveState($(this).val());
				utils.enableUndo();
				utils.disableRedo();
			} else {
				saveStateFlag = true;
			}
		});

		elements.$undo.on('click', function (e) {
			e.preventDefault();

			if ($(this).hasClass('disabled')) {
				return;
			}

			utils.enableUndo();
			utils.enableRedo();

			saveStateFlag = false;

			var undoSnapshot = history.undo();

			if (undoSnapshot !== undefined) {
				var parsedUndoSnaphot = JSON.parse(undoSnapshot);
				builder.rootItems.reset(parsedUndoSnaphot);

				if ( parsedUndoSnaphot.length === 0 ) {
					builder.$input.val('[]');
				}
			} else {
				utils.disableUndo();
			}
		});

		elements.$redo.on('click', function (e) {
			e.preventDefault();

			if ($(this).hasClass('disabled')) {
				return;
			}

			utils.enableRedo();
			utils.enableUndo();

			saveStateFlag = false;

			var redoSnapshot = history.redo();

			if (redoSnapshot !== undefined) {
				builder.rootItems.reset(JSON.parse(redoSnapshot));
			} else {
				utils.disableRedo();
			}
		});
	});
})(jQuery, fwEvents, _, _fw_option_type_builder_history);