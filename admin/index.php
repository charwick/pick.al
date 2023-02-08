<?php require_once('../query.php');
$sql = new chooser_query();

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

function classlist($classes, $title) {
	echo "<h2>{$title}</h2>";
	echo '<ul class="classes">';
		foreach ($classes as $class) {
			echo "<li>";
				echo "<a href='edit.php?class={$class->id}'>{$class->name}</a> — ";
				echo "<span class='semester'>".ucwords($class->semester)." {$class->year}</span> / ";
				echo "<span class='students'>{$class->students} students</span>";
			echo "</li>";
		}
	echo "</ul>";
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Student-Chooser Admin</title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body>
	<a href="../" id="backlink" class="deemph-link">← Back to Chooser</a>
	<h1>Student Chooser Admin</h1>
	
	<?php if (isset($message)) echo $message;
	
	if ($active) classlist($active, 'Active Classes');
	if ($inactive) classlist($inactive, 'Inactive Classes'); ?>
	
	<p><a class="button" href="edit.php">New class</a></p>
</body>
</html>