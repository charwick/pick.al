<?php function userbar($sql, $backlink=null, $backtext=null): void {
	global $user;
	$user = $sql->current_user(); ?>
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
	if ($admin) { ?><link rel="stylesheet" href="/admin/admin.css?version=1" type="text/css" media="all"><?php } ?>
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	
	<link rel="icon" type="image/png" sizes="32x32" href="/icon/icon-32.png">
	<link rel="shortcut icon" sizes="196x196" href="/icon/icon-196.png">
	<link rel="apple-touch-icon" href="/icon/icon-196.png">
	<meta name="msapplication-TileImage" content="/icon/icon-196.png">
<?php }