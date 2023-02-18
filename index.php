<?php require_once('query.php');
$sql = new chooser_query();

if (!$sql->current_user()) {
	require_once('login/login.php');
	exit;
}

$classid = isset($_GET['class']) ? $_GET['class'] : null;
if ($classid) {
	$class = $sql->get_class($classid);
	if (!$class) {
		require_once('404.php');
		exit;
	}
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<?php if ($classid) { ?>
		<title><?php echo "{$class->name} ".ucwords($class->semester)." {$class->year}"; ?> | Student Chooser</title>
		<script type="text/javascript">
			var classid = <?php echo $classid; ?>,
				roster = <?php echo json_encode($sql->get_roster($classid)); ?>,
				selector = '<?php echo $class->selector; ?>';
		</script>
	<?php } else { ?>
		<title>Available Classes | Student Chooser</title>
	<?php } ?>
	
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	<link rel="stylesheet" href="chooser.css" type="text/css" media="all">
	<script type="text/javascript" src="chooser.js"></script>
</head>

<body>
	<?php if ($classid) { ?>
		<h1 id="classname"><?php echo $class->name; ?></h1>
		<a href="." title="Back" id="backbutton">←</a>
		<p class="subtitle"><?php echo ucwords($class->semester)." {$class->year}"; ?></p>
	
		<div id="sinfo">
			<h2 id="sname"><!-- Filled in by JS --></h2>
		
			<ul id="actions">
				<li><button id="good">✓</button></li>
				<li><button id="meh">?</button></li>
				<li><button id="bad">×</button></li>
			</ul>
		</div>
	
		<div id="pickwrap">
			<button id="pick">Choose Student</button>
		</div>

	<?php } else { ?>
		<h1>Available Classes</h1>
		<a href="admin/" id="adminbutton" class="button hollow">Admin</a>
		
		<ul id="classlist">
			<?php $classes = $sql->get_classes(true);
			if (!$classes) echo '<li class="noclasses">No active classes <a href="admin/edit.php" class="button" id="pick">New Class</a></li>';
			else foreach ($classes as $class) {
				echo "<li><a href='?class={$class->id}'>{$class->name} <span>".ucwords($class->semester)." {$class->year}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{$class->students} Students</span></a></li>";
			} ?>
		</ul>
	<?php }?>
</body>
</html>