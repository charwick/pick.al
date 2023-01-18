<?php require_once('query.php');
$sql = new chooser_query();
$classid = $_GET['class']; ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<?php $class = $sql->get_class($classid); ?>
	<title><?php echo "{$class->name} ".ucwords($class->semester)." {$class->year}"; ?></title>
	<link rel="stylesheet" href="chooser.css" type="text/css" media="all">
	<script type="text/javascript">
		var classid = <?php echo $classid; ?>,
			roster = <?php echo json_encode($sql->get_roster($classid)); ?>;
	</script>
	<script type="text/javascript" src="ajax.js"></script>
</head>

<body>
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
</body>
</html>