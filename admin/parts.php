<?php function userbar($sql, $backlink=null, $backtext=null): void {
	global $user;
	$user = $sql->current_user();
	if (!$user) {
		header("Location: /");
		die();
	} ?>
	<div id="userbar">
		<?php if ($backlink) echo "<a href='{$backlink}' id='backlink'>← <span>Back to</span> {$backtext}</a>"; ?>
		<a href="/" id="logo">Pick.al</a>
		<div id="rightside">
			<a href="user.php">
				<img src="https://www.gravatar.com/avatar/<?php echo md5(strtolower(trim($user->email))); ?>?s=40&d=mp" class="gravatar" />
				<?php echo $user->username; ?>
			</a>
			<a href="../login/login.php?action=logout">Log out</a>
		</div>
	</div>
<?php }

function footer(): void {
	global $user; ?>
	<footer id="footer">
		<span>Pick.al is developed and maintained by <a href="https://cameronharwick.com">Cameron Harwick</a></span>
		<?php if ($user) { ?>
			<span><a href="https://github.com/charwick/pick.al/issues">Report a bug / Suggest a feature</a></span>
		<?php } ?>
	</footer>
<?php }

function headermeta($admin=false): void {
	if ($admin) embed_asset('admin.css');
	?><meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	
	<link rel="icon" type="image/png" sizes="32x32" href="/icon/icon-32.png">
	<link rel="shortcut icon" sizes="196x196" href="/icon/icon-196.png">
	<link rel="apple-touch-icon" href="/icon/icon-196.png">
	<meta name="msapplication-TileImage" content="/icon/icon-196.png">
<?php }

//Increment version to invalidate cache
function embed_asset(string $asset): void {
	$assets = [ // filename => [path, version]
		'ajax.js' => ['/admin/js', 2],
		'class.js' => ['/admin/js', 3],
		'search.js' => ['/admin/js', 1],
		'user.js' => ['/admin/js', 1],
		'schema.js' => ['/admin/js', 1],
		'admin.css' => ['/admin', 2],
		'picker.js' => ['', 1],
		'picker.css' => ['', 1],
		'login.js' => ['/login', 1],
		'login.css' => ['/login', 1]
	];

	if (!isset($assets[$asset])) return;
	$ext = explode('.', $asset)[1];
	$path = $assets[$asset][0];
	$version = $assets[$asset][1];
	if ($ext=='js') echo "<script type='text/javascript' src='{$path}/{$asset}?version={$version}'></script>";
	elseif ($ext=='css') echo "<link rel='stylesheet' type='text/css' href='{$path}/{$asset}?version={$version}' media='all'>";
}