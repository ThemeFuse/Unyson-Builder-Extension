<?php if (!defined('FW')) die('Forbidden');

/**
 * @var string $id
 * @var  array $option
 * @var  array $data
 * @var  array $thumbnails
 */

{
	$tabs_options = array();

	foreach ($thumbnails as $thumbnails_tab_title => &$thumbnails_tab_thumbnails) {
		$tabs_options[ 'random-'. fw_unique_increment() ] = array(
			'type'    => 'tab',
			'title'   => $thumbnails_tab_title,
			'attr'    => array(
				'class' => 'fw-option-type-builder-thumbnails-tab',
			),
			'options' => array(
				fw_rand_md5() => array(
					'type'  => 'html',
					'label' => false,
					'desc'  => false,
					'html'  => implode("\n", $thumbnails_tab_thumbnails),
				),
			),
		);
	}
}

{
	$div_attr = $option['attr'];

	unset(
		$div_attr['value'],
		$div_attr['name']
	);

	$div_attr['class'] .= ' fw-option-type-builder-tabs-count-'. count($tabs_options);
}
?>
<div <?php echo fw_attr_to_html($div_attr) ?>>
	<?php
		echo fw()->backend->option_type('hidden')->render(
			$id,
			array(),
			array(
				'value' => $data['value']['json'],
				'id_prefix' => $data['id_prefix'] .'input--',
				'name_prefix' => $data['name_prefix']
			)
		);
	?>
	<div class="builder-items-types fw-clearfix">
		<?php echo fw()->backend->render_options($tabs_options) ?>
	</div>
	<div class="builder-root-items"></div>

	<?php do_action('fw_builder:' . $option['type'] . ':content_below_root_items'); ?>
</div>

<?php
// do action once to add one backdrop for all builders in page
if ($option['fullscreen']) {
	do_action('fw_builder_fullscreen_add_backdrop');
}
?>

