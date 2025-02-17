<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();

//Login-wall
if (!$sql->current_user()) {
	header("Location: ../");
	exit;
}

//Add or edit
$schemaid = $_GET['schema'] ?? null;
if ($schemaid) {
	$schema = $sql->get_schema($schemaid);
	if (!$schema) {
		require_once('../404.php');
		exit;
	}
}
$error = false;

//Create new schema
if (isset($_POST['name'])) {
	$id = $sql->new_schema($_POST['name']);
	if ($id) {
		$url = "schema.php?schema={$id}";
		header("Location: {$url}");
		exit;
	} else $error = true;
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title><?php echo $schemaid ? "Editing Schema {$schema->name}" : "New Schema"; ?> | Pick.al</title>
	<?php if ($schemaid) { ?>
		<style type="text/css" id="previewcss">/*filled by JS*/</style>
		<script type="text/javascript">
			<?php $classes = $sql->classes_by_schema($schemaid);
			foreach ($classes as $class)
				foreach ($class->values as $val)
					foreach ($schema->items as &$item)
						if ($item['value']==$val)
							$item['locked'] = true;
			echo "var schemaid = {$schemaid},
				schema = ".json_encode($schema).",
				classes = ".count($classes).",
				icons = ".json_encode($schema::$icons).";"; ?>
		</script>
	<?php }

	embed_asset('ajax.js');
	embed_asset('schema.js');
	headermeta(true); ?>

</head>

<body class="admin-<?php echo $schemaid ? 'edit' : 'new'; ?> admin-schema">
	<?php userbar($sql, '.', 'Admin');
	if ($error) echo '<p class="error">There was an error saving your class. Please try again.</p>'; ?>
	<main>
		<?php if ($schemaid) { ?>
			<input type='hidden' name='schemaid' value='<?php echo $schemaid; ?>'>
			<h1 id='name'><?php echo $schema->name; ?></h1>
			<p id="classmeta">
				<?php if (!$classes) echo 'No classes using this schema.';
				else {
					echo 'Schema used by ';
					$ff1 = array_slice($classes, 0, 2);
					$ff2 = array_slice($classes, 2);
					$cstrs = [];
					foreach ($ff1 as $class) $cstrs[] = cstr($class);
					echo implode(count($ff1)==2 ? ', ' : ' and ', $cstrs);
					if (count($ff2) > 1) echo ', and '.count($ff2).' other classes';
					elseif (count($ff2)) echo ', and '.cstr($ff2[0]);
					echo '.';
					if ($schema->global) echo '<br /><em><small>This is a global schema. It can be duplicated, but not modified.</small></em>';
				} ?>
			</p>

			<section id="items">
				<h2>Items</h2>
				<table id="schemaitems">
					<thead>
						<tr>
							<th>Symbol</th>
							<th>Value</th>
							<th colspan="2">Color</th>
						</tr>
					</thead>
					<tbody><!--Filled in by JS--></tbody>
					<tfoot>
						<tr><td class="addnew" colspan="4">
							<a href="#"<?php if ($schema->global || count($schema->items) >= 5) echo ' class="disabled"'; ?>>+</a>
						</td></tr>
					</tfoot>
				</table>
			</section>

			<button id="save" disabled>Saved</button>
			
			<section id="preview">
				<h2>Preview</h2>
				<div class="studentinfo">
					<h2>Stuart <span>Denton</span></h2>
					<p class="note">A model student.</p>
					<ul><!--Filled in by JS--></ul>
				</div>
			</section>

			<details<?php if (!count($schema->items)) echo ' open'; ?>>
				<summary><h2>Why Can't I—?</h2></summary>
				<ul>
					<li>Schemae must have a minimum of one item, and a maximum of five.</li>
					<li>Schema items are ordered high to low point value.</li>
					<li>Schema item point values must be between zero and one, and may not be repeated within a schema.</li>
					<li>Schema items cannot be deleted, or their values changed, if any classes with that schema have events registered with that item value. Schema items can always be added, up to the maximum of 5.</li>
					<li>Schema 1 is <em>compatible</em> with Schema 2 if all of Schema 2's point values have a corresponding item in Schema 1.</li>
					<li>Schemae can only be deleted if (1) there are no classes using it, OR (2) there is at least one compatible schema to replace it with.</li>
					<li>Classes can only switch to schemae that have items covering the point values of all events in that class. This includes any compatible schemae, but inclusive of schemae compatible with the subset of events already registered in that class. Classes with no events can be switched to any schema.</li>
				</ul>
			</details>

			<form id="deleteform" action="." method="post">
				<input type="hidden" name="action" value="delete" />
				<input type="hidden" name="schema" value="<?php echo $schemaid; ?>" />
			</form>
			<template id="schemaitem">
				<tr>
					<td><input name="text" type="text" required /></td>
					<td class="value"><input name="value" type="number" min="0" max="1" step="0.05" required /></td>
					<td>
						<input name="color" type="color" />
						<span class="colortext">#000000</span>
					</td>
					<td><span class="actions"><a class="delete" href="#" title="Delete"></a></td>
				</tr>
			</template>
		<?php } else { ?>
			<h1>New Schema</h1>
			<form action="" method="post">
				<p id="name"><input type="text" name="name" placeholder="Schema Name" value="<?php echo $error ? $_POST['name'] : ''; ?>" required=""></p>
				<p><input type="submit" name="submit" value="Create Schema"></p>
			</form>
		<?php } ?>
	</main>
	<?php footer(); ?>
</body>
</html>

<?php function cstr($class) {
	return "<a href='/admin/class.php?class={$class->id}'>{$class->name}</a>";
}