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
if ($classid && $classid !== 0) {
	$class = $sql->get_class($classid);
	if (!$class) {
		require_once('404.php');
		exit;
	}
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title><?php if (!$classid) echo 'Available Classes | '; ?>Pick.al</title>

	<?php include('admin/parts.php');
	embed_asset('picker.css');
	embed_asset('picker.js');
	headermeta(); ?>
</head>

<body>
	<?php if ($classid != null) { ?>
		<div id="bodywrap"><!-- Necessary because Samsung Browser dosn't respect overflow:hidden on <body> -->

			<div id="logo">Pick.al</div>
			<h1 id="classname"></h1>
			<a href="/" title="Back" id="backbutton">←</a>
			<p class="subtitle"></p>
			<a href="#" title="Roster" id="rosterlist">Roster</a>

			<div class="actions">
				<a href="#" class="back disabled">Back</a>
				<a href="#" class="snooze disabled">Snooze</a>
				<a href="#" class="forward disabled">Forward</a>
			</div>

			<div id="sinfo"></div>

			<div id="question">
				<div class="actions">
					<a href="#" class="back" class="disabled">Back</a>
					<a href="#" class="archive">Archive</a>
					<a href="#" class="clear">Clear</a>
					<a href="#" class="forward" class="disabled">Forward</a>
				</div>
				<div id="qtext"></div>
			</div>
			<a href="#" id="q-queue"></a>

			<div id="roster">
				<div id="topbar">
					<a href="/admin/" id="rosteredit" class="button">Manage</a>
					<a href="#" id="rosterclose">×</a>
				</div>
				<ul>
					<li class="head">Students</li>
				</ul>
			</div>
		</div>

		<div id="bottom-anchor">
			<button id="pick">Choose Student</button>
		</div>

	<?php } else { ?>
		<a href="admin/" id="adminbutton" class="button hollow">Manage Classes</a>

		<h1 id="logo">Pick.al</h1>
		
		<div id="bottom-anchor"></div>
	<?php } ?>
	<dialog id="shortcuts">
		<a class="close" href="#">&times;</a>
		<h2>Keyboard Shortcuts</h2>
		<ul>
			<li>Choose student <span><kbd>space</kbd></span></li>
			<li>Previous chosen student <span><kbd>&larr;</kbd></span></li>
			<li>Next chosen student <span><kbd>&rarr;</kbd></span></li>
			<li>Evaluate student <span><kbd>1</kbd>-<kbd id="maxkey">5</kbd></span></li>
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