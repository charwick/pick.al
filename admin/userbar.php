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
<?php } ?>