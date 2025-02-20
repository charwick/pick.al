<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();

//Login-wall
if (!$sql->current_user()) {
	header("Location: ../");
	exit;
}

//Handle deleting classes
if (isset($_POST['action']) && $_POST['action']=='delete') {
	if (isset($_POST['class'])) {
		$deleted = $sql->delete_class($_POST['class']);
		if ($deleted) $message = '<div class="info">Class successfully deleted.</div>';
		else $message = '<div class="info error">Failed to delete class '.$_POST['class'].'.</div>';
	} elseif (isset($_POST['schema'])) {
		$deleted = $sql->delete_schema($_POST['schema'], $_POST['replacement'] ?? null);
		if ($deleted) $message = '<div class="info">Schema successfully deleted.</div>';
		else $message = '<div class="info error">Failed to delete schema '.$_POST['schema'].'.</div>';
	}
}

$active = []; $inactive = [];
foreach ($sql->get_classes() as $class) {
	if ($class->active) $active[] = $class;
	else $inactive[] = $class;
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Pick.al Admin</title>
	<?php headermeta(true);
	embed_asset('ajax.js');
	embed_asset('search.js'); ?>
</head>

<body>
	<?php userbar($sql, '../', 'Picker'); ?>
	<main>
		<h1>
			Manage Classes
			<div id="searchcontain">
				<input type="text" placeholder="Search Students..." id="search" autocomplete="off" aria-autocomplete="list" />
				<div id="autocomplete"></div>
			</div>
		</h1>

		<?php if (isset($message)) echo $message; ?>

		<ul class="classes">
			<?php foreach (['active', 'inactive'] as $classes) foreach ($$classes as $class) {
				echo "<li>";
				echo "<a href='class.php?class={$class->id}' class='classbox {$classes}'>
					<span class='title'>{$class->name}</span>
					<span class='semester'>".ucwords($class->semester)." {$class->year}</span>&nbsp; •&nbsp; 
					<span class='students'>{$class->students}</span>
				</a>";
				echo "</li>";
			}
			if ($inactive) echo '<li id="collapse"></li>'; ?>
		</ul>
		
		<?php if (!$inactive && !$active) { ?>
			<a id="welcome" class="classbox active" href="class.php">
				<h2 class="title">Welcome to Pick.al!</h2>
				<p>Get started by creating a class and uploading a roster.</p>
			</a>
		<?php } ?>
		<p><a class="button" href="class.php">New class</a></p>

		<h2 class="new-feature">Button Schemae</h2>

		<table id="schemae">
			<?php foreach ($sql->get_available_schemae() as $schema) {
				$count = 0;
				foreach (array_merge($active, $inactive) as $class) if ($class->schema==$schema->id) $count++; ?>
				<tr>
					<td>
						<?php if (!$schema->global) { ?><a href="/admin/schema.php?schema=<?php echo $schema->id; ?>"><?php }
						echo $schema->name;
						if (!$schema->global) echo '</a>'; ?>
					</td>
					<td><?php echo $schema->output_buttons(true); ?></td>
					<td><?php echo $count; ?> classes</td>
					<td class="actions"><a href="/admin/schema.php?schema=<?php echo $schema->id; ?>&duplicate=1" class="copy" title="Duplicate"></a></td>
				</tr>
			<?php } ?>
		</table>
		<p><a class="button" href="schema.php">New schema</a></p>

	</main>

	<?php footer(); ?>
</body>
</html>