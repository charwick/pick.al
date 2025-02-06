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
	$deleted = $sql->delete_class($_POST['class']);
	if ($deleted) $message = '<div class="info">Class successfully deleted.</div>';
	else $message = '<div class="info error">Failed to delete class '.$_POST['class'].'.</div>';
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
	<?php headermeta(true); ?>
	<script src="js/ajax.js?version=1" type="text/javascript"></script>  <?php //Increment version to invalidate cache ?>
	<script src="js/search.js?version=1" type="text/javascript"></script>
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
		
		<p><a class="button" href="class.php">New class</a></p>
	</main>

	<?php footer(); ?>
</body>
</html>