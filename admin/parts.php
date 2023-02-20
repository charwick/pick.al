<?php function userbar($sql, $backlink=null, $backtext=null) {
	$user = $sql->current_user(); ?>
	<div id="userbar">
		<?php if ($backlink) echo "<a href='{$backlink}' id='backlink'>← {$backtext}</a>"; ?>
		<div id="rightside">
			<a href="user.php">
				<img src="https://www.gravatar.com/avatar/<?php echo md5(strtolower(trim($user->email))); ?>?s=40&d=mp" class="gravatar" />
				<?php echo $user->username; ?>
			</a>
			<a href="../login/login.php?action=logout">Log out</a>
		</div>
	</div>
<?php }

function footer() { ?>
	<footer id="footer">
		<span>Pick.al is developed and maintained by <a href="https://cameronharwick.com">Cameron Harwick.</a></span>
		<span><a href="https://github.com/charwick/student-chooser/issues">Report a bug / Suggest a feature</a></span>
	</footer>
<?php }