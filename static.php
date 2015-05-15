<?php if (!defined('FW')) die('Forbidden');

if (!is_admin()) {
	wp_register_style(
		'fw-ext-builder-frontend-grid',
		fw_ext('builder')->get_uri('/static/css/frontend-grid.css'),
		array(),
		fw_ext('builder')->manifest->get_version()
	);
}
