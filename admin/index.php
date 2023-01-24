<?php require_once('../query.php');
$sql = new chooser_query(); ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Student-Chooser Admin</title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body>
	<a href="../" id="backlink">← Back to Chooser</a>
	<h1>Student Chooser Admin</h1>
	<h2>Classes</h2>
	<ul id="classes">
		<?php foreach ($sql->get_classes() as $class) {
			echo "<li>";
				echo "<a href='edit.php?class={$class->id}'>{$class->name}</a> — ";
				echo "<span class='semester'>".ucwords($class->semester)." {$class->year}</span> / ";
				echo "<span class='students'>{$class->students} students</span>";
			echo "</li>";
		} ?>
	</ul>
	
	<p><a class="button" href="edit.php">New class</a></p>
</body>
</html>