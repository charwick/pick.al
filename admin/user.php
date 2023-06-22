<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();
$user = $sql->current_user();
$orcidvars = orcidvars();

//Authorize OrcID
if (isset($_GET['code']) && !$user->orcid) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL,"https://orcid.org/oauth/token");
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['code' => $_GET['code'], 'client_id' => $orcidvars['id'], 'client_secret' => $orcidvars['secret'], 'grant_type' => 'authorization_code']));
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$response = curl_exec($ch);
	curl_close($ch);
	if ($response) {
		$response = json_decode($response);
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
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>User profile: <?php echo $user->username; ?> | Pick.al</title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<script type="text/javascript" src="js/ajax.js"></script>
	<script type="text/javascript" src="js/user.js"></script>
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body class="admin-user">
	<?php userbar($sql, '.', 'Back to Admin'); ?>
	<main>
		<a href="http://gravatar.com/" id="gravatar-link" target="_gravatar">
			<img src="https://www.gravatar.com/avatar/<?php echo md5(strtolower(trim($user->email))); ?>?s=160&d=mp" class="gravatar" />
		</a>
		<h1>User profile  <span class="num"><?php echo $user->username; ?></span></h1>

		<p>Email: <span id="email"><?php echo $user->email; ?></span></p>
		<p id="password" data-date="<?php echo date('F j, Y \a\t H:i', strtotime($user->pwchanged)); ?>">
			Password:
			<span class="field" id="oldpw">••••••••</span><span class="field" id="newpw"></span><span class="field" id="confirmpw"></span>
			<span class="actions"><a href="#" class="edit" title="Edit"></a></span>
		</p>

		<?php $orcid_url = "https://orcid.org/oauth/authorize?client_id=".$orcidvars['id']."&response_type=code&scope=/authenticate&redirect_uri=https://pick.al/admin/user.php&show_login=true"; ?>
		<p id="orcid">OrcId:
			<?php if ($user->orcid) echo "<span>{$user->orcid}</span>" . ' <span class="actions"><a class="cancel" href="#" title="Disconnect"></a></span>'; ?>
			<a class="button" href="<?php echo $orcid_url; ?>">Connect</a>
		</p>
	</main>
	<?php footer(); ?>
</body>
</html>