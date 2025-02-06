<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();
$user = $sql->current_user();
$message = false;

//Login-wall
if (!$sql->current_user()) {
	header("Location: ../");
	exit;
}

require_once('../orcid.php');
$orcid = new orcid_api();

//Authorize OrcID
if (isset($_GET['code']) && !$user->orcid) {
	$response = $orcid->get_auth_token($_GET['code']);
	if (isset($response->orcid)) {
		if ($sql->get_user_by('orcid', $response->orcid)) $message = 'This OrcID is already linked to another Pick.al account.';
		else {
			$sql->edit_user('orcid', $response->orcid);
			$orcid_data = [
				'access_token' => $response->access_token,
				'refresh_token' => $response->refresh_token,
				'expires_in' => $response->expires_in
			];
			$sql->user_add_option('orcid_data', $orcid_data);
			$user->orcid = $response->orcid;
			$user->options->orcid_data = $orcid_data;
		}
	}

//Delete account
} elseif (isset($_POST['delete']) && $_POST['delete']) {
	if ($sql->delete_user()) {
		$_SESSION['message'] = "User '{$user->username}' successfully deleted.";
		header("Location: /");
	} else $message = 'Failed to delete user. Please try again shortly.';
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>User profile: <?php echo $user->username; ?> | Pick.al</title>
	<?php embed_asset('ajax.js');
	embed_asset('user.js');
	headermeta(true); ?>
</head>

<body class="admin-user">
	<?php userbar($sql, '.', 'Admin'); ?>
	<main>
		<a href="http://gravatar.com/" id="gravatar-link" target="_gravatar">
			<img src="https://www.gravatar.com/avatar/<?php echo md5(strtolower(trim($user->email))); ?>?s=160&d=mp" class="gravatar" />
		</a>
		<h1>
			Profile
			<span class="num"><?php echo $user->username; ?></span>
			<span class="actions"><a href="#" class="delete" title="Delete Account"></a></span>
		</h1>

		<p>Email: <span id="email"><?php echo $user->email; ?></span></p>
		<p id="password" data-date="<?php echo $user->password ? date('F j, Y \a\t H:i', strtotime($user->pwchanged)) : 'never'; ?>">
			Password:
			<span class="field" id="oldpw"><?php echo $user->password ? '••••••••' : 'None'; ?></span><span class="field" id="newpw"></span><span class="field" id="confirm_password"></span>
			<span class="actions"><a href="#" class="edit" title="Edit"></a></span>
		</p>

		<?php if ($message) echo '<div class="info error">'.$message.'</div>'; ?>
		<p id="orcid">OrcID:
			<?php if ($user->orcid) echo "<a href='https://orcid.org/{$user->orcid}'>{$user->orcid}</a>" . ' <span class="actions"><a class="cancel" href="#" title="Disconnect"></a></span>'; ?>
			<a class="button" href="<?php echo $orcid->auth_url('https://pick.al/admin/user.php'); ?>">Connect</a>
		</p>
	</main>
	<form id="deleteform" action="" method="post"><input type="hidden" name="delete" value="true" /></form>
	<?php footer(); ?>
</body>
</html>