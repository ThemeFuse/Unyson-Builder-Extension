<?php if (!defined('FW')) die('Forbidden');

class FW_Extension_Builder extends FW_Extension
{
	/**
	 * @internal
	 */
	protected function _init()
	{
		add_action('fw_option_types_init', array($this, '_action_option_types_init'),
			9 // Other option types requires it
		);
	}

	public function _action_option_types_init() {
		require dirname( __FILE__ ) . '/includes/option-types/builder/builder.php';
	}
}