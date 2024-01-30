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
	if (strtotime($class->activeuntil) + 24*3600 >= time()) $active[] = $class;
	else $inactive[] = $class;
}

function classlist(array $classes, string $title): void {
	echo "<h2>{$title}</h2>";
	echo '<ul class="classes">';
		foreach ($classes as $class) {
			echo "<li>";
				echo "<a href='class.php?class={$class->id}' class='classbox'>
					<span class='title'>{$class->name}</span>
					<span class='semester'>".ucwords($class->semester)." {$class->year}</span>&nbsp; •&nbsp; 
					<span class='students'>{$class->students}</span>
				</a>";
			echo "</li>";
		}
	echo "</ul>";
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Pick.al Admin</title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body>
	<?php userbar($sql, '../', 'Picker'); ?>
	<main>
		<h1>Pick.al Admin Panel</h1>
		
		<?php if (isset($message)) echo $message;
		
		if ($active) classlist($active, 'Active Classes');
		if ($inactive) classlist($inactive, 'Inactive Classes'); ?>
		
		<p><a class="button" href="class.php">New class</a></p>
	</main>

	<?php footer(); ?>
</body>
</html>