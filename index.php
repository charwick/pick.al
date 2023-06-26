<?php require_once('query.php');
$sql = new chooser_query();

$user = $sql->current_user();
if (!$user) {
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
		<title><?php echo "{$class->name} ".ucwords($class->semester)." {$class->year}"; ?> | Pick.al</title>
		<script type="text/javascript">
			var classid = <?php echo $classid; ?>,
				roster = <?php echo json_encode($sql->get_roster($classid)); ?>;
			<?php echo $class->schema->output_js(false); ?>
		</script>
		<?php 
		echo $class->schema->output_css();
	} else { ?>
		<title>Available Classes | Pick.al</title>
	<?php } ?>
	
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	<link rel="stylesheet" href="chooser.css" type="text/css" media="all">
	<script type="text/javascript" src="chooser.js"></script>
</head>

<body>
	<?php if ($classid) { ?>
		<div id="logo">Pick.al</div>
		<h1 id="classname"><?php echo $class->name; ?></h1>
		<a href="." title="Back" id="backbutton">←</a>
		<p class="subtitle"><?php echo ucwords($class->semester)." {$class->year}"; ?></p>
	
		<div id="sinfo">
			<h2 id="sname"><!-- Filled in by JS --></h2>
		
			<ul id="actions">
				<?php foreach ($class->schema->items as $id => $item)
					echo "<li><button data-schema='{$id}'>{$item['text']}</button></li>"; ?>
			</ul>
		</div>
	
		<div id="pickwrap">
			<button id="pick">Choose Student</button>
		</div>

	<?php } else { ?>
		<a href="admin/" id="adminbutton" class="button hollow">Admin</a>

		<h1 id="logo">Pick.al</h1>
		
		<ul id="classlist">
			<?php $classes = $sql->get_classes(true);
			if (!$classes) echo '<li class="noclasses">No active classes <a href="admin/edit.php" class="button" id="pick">New Class</a></li>';
			else {
				echo "<li><h2>Active Classes <span>/ {$user->username}</span></h2></li>";
				foreach ($classes as $class)
					echo "<li><a href='?class={$class->id}'>{$class->name} <span>".ucwords($class->semester)." {$class->year}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{$class->students} Students</span></a></li>";
			} ?>
		</ul>
	<?php }?>
</body>
</html>