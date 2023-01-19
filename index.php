<?php require_once('query.php');
$sql = new chooser_query();
$classid = isset($_GET['class']) ? $_GET['class'] : null; ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<?php if ($classid) {
		$class = $sql->get_class($classid); ?>
		<title><?php echo "{$class->name} ".ucwords($class->semester)." {$class->year}"; ?> | Student Chooser</title>
		<script type="text/javascript">
			var classid = <?php echo $classid; ?>,
				roster = <?php echo json_encode($sql->get_roster($classid)); ?>;
		</script>
	<?php } else { ?>
		<title>Available Classes | Student Chooser</title>
	<?php } ?>
	
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	<link rel="stylesheet" href="chooser.css" type="text/css" media="all">
	<script type="text/javascript" src="ajax.js"></script>
</head>

<body>
	<?php if ($classid) { ?>
		<h1 id="classname"><?php echo $class->name; ?></h1>
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
			<?php foreach ($sql->get_classes(true) as $class) {
				echo "<li><a href='?class={$class->id}'>{$class->name} <span>".ucwords($class->semester)." {$class->year}</span></a></li>";
			} ?>
		</ul>
	<?php }?>
</body>
</html>