<?php require_once('query.php');
$sql = new chooser_query();

$user = $sql->current_user();

//Redirect to root and show login
if (!$user && !isset($_GET['try'])) {
	if ($_SERVER['REQUEST_URI'] !== '/' && $_SERVER['REQUEST_URI'] !== '/index.php') header('Location: /');
	else require_once('login/login.php');
	exit;
}

$classid = $_GET['class'] ?? null;
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
	<?php if ($classid) {
		$roster = $sql->get_roster($classid); ?>
		<title><?php echo "{$class->name} ".ucwords($class->semester)." {$class->year}"; ?> | Pick.al</title>
		<script type="text/javascript">
			var classid = <?php echo $classid; ?>,
				roster = <?php echo json_encode($roster); ?>,
				demo = <?php echo $user ? 'false' : 'true'; ?>;
			<?php echo $class->schema->output_js(true); ?>
		</script>
		<?php 
		echo $class->schema->output_css();
	} else { ?>
		<title>Available Classes | Pick.al</title>
		<?php if ($user) { //Remember username on login page ?>
			<script type="text/javascript">localStorage.username = "<?php echo $user->username; ?>";</script>
		<?php }
	}
	
	include('admin/parts.php');
	embed_asset('picker.css');
	embed_asset('picker.js');
	headermeta(); ?>
</head>

<body class="<?php
	if (!$user) echo 'demo';
	elseif ($classid && !$class->active) echo 'inactive';
?>">
	<?php if ($classid) {
		$qs = $sql->get_questions($classid, true, 'ASC'); ?>
		<div id="bodywrap"><!-- //Necessary because Samsung Browser dosn't respect overflow:hidden on <body> -->

			<div id="logo">Pick.al</div>
			<h1 id="classname"><?php echo $class->name; ?></h1>
			<a href="/" title="Back" id="backbutton">←</a>
			<p class="subtitle"><?php echo ucwords($class->semester)." {$class->year}"; ?></p>
			<a href="#" title="Roster" id="rosterlist">Roster</a>

			<div class="actions">
				<a href="#" class="back disabled">Back</a>
				<a href="#" class="snooze disabled">Snooze</a>
				<a href="#" class="forward disabled">Forward</a>
			</div>

			<div id="sinfo">
				<?php if (!$roster) echo '<p class="noclasses" style="margin-top:4em">No students</p>'; ?>
			</div>

			<div id="question">
				<div class="actions">
					<a href="#" class="back" class="disabled">Back</a>
					<a href="#" class="archive">Archive</a>
					<a href="#" class="clear">Clear</a>
					<a href="#" class="forward" class="disabled">Forward</a>
				</div>
				<div id="qtext"></div>
			</div>
			<?php if ($qs) echo '<a href="#" id="q-queue"></a>'; ?>

			<div id="roster">
				<div id="topbar">
					<a href="/admin/class/<?php echo $classid; ?>" id="rosteredit" class="button">Manage</a>
					<a href="#" id="rosterclose">×</a>
				</div>
				<ul>
					<?php if ($qs) { ?>
						<li class="head">Questions</li>
						<?php foreach ($qs as $q) echo "<li data-q='{$q->id}'>{$q->text}</li>";
					} ?>
					<li class="head">Students</li>
					<?php foreach ($roster as $student) echo "<li data-id='{$student->id}'>{$student->fname} {$student->lname}</li>"; ?>
				</ul>
			</div>
		</div>

		<div id="bottom-anchor">
			<?php if ($roster) echo '<button id="pick">Choose Student</button>';
			else echo '<a href="/admin/class/'.$classid.'" id="pick" class="button">Add Students</a>'; ?>			
		</div>

	<?php } else { ?>
		<a href="admin/" id="adminbutton" class="button hollow">Manage Classes</a>

		<h1 id="logo">Pick.al</h1>
		
		<div id="bottom-anchor">
			<?php $active = []; $inactive = [];
			foreach ($sql->get_classes() as $class) if ($class->active) $active[] = $class; else $inactive[] = $class;
			if (!$active) echo '<div class="classlist active noclasses'.($inactive ? ' switchable' : '').'">No active classes <a href="/admin/class/new" class="button" id="pick">New Class</a></div>';
			else { ?>
				<h2 class="active<?php if ($inactive) echo ' switchable'; ?>">Active Classes <span>/ <?php echo $user ? $user->username : 'Demo User'; ?></span></h2>
				<ul class="classlist active">
					<?php foreach ($active as $class)
						echo "<li><a href='/class/{$class->id}".($user ? '' : '?try')."'>{$class->name} <span>".ucwords($class->semester)." {$class->year}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{$class->students} Students</span></a></li>"; ?>
				</ul>
			<?php }
			if ($inactive) { ?>
				<h2 class="switchable inactive">Inactive Classes <span>/ <?php echo $user ? $user->username : 'Demo User'; ?></span></h2>
				<ul class="classlist inactive">
					<?php foreach ($inactive as $class)
						echo "<li><a href='/class/{$class->id}".($user ? '' : '?try')."'>{$class->name} <span>".ucwords($class->semester)." {$class->year}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{$class->students} Students</span></a></li>"; ?>
				</ul>
			<?php } ?>
		</div>
	<?php } ?>
	<dialog id="shortcuts">
		<a class="close" href="#">&times;</a>
		<h2>Keyboard Shortcuts</h2>
		<ul>
			<?php $maxkey = $classid ? count($class->schema->items) : 5; ?>
			<li>Choose student <span><kbd>space</kbd></span></li>
			<li>Previous chosen student <span><kbd>&larr;</kbd></span></li>
			<li>Next chosen student <span><kbd>&rarr;</kbd></span></li>
			<li>Evaluate student <span><kbd>1</kbd>-<kbd><?php echo $maxkey; ?></kbd></span></li>
			<li>Clear evaluation <span><kbd>0</kbd></span></li>
			<li>Snooze student until tomorrow <span><kbd>Z</kbd></span></li>
			<li>Open/close roster <span><kbd>R</kbd></span></li>
			<li>Cycle through questions <span><kbd>Q</kbd></span></li>
			<li>Manage class <span><kbd>M</kbd></span></li>
			<li>Show keyboard shortcuts <span><kbd>?</kbd></span></li>
		</ul>
	</dialog>
</body>
</html>