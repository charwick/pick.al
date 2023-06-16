<?php $message = null;

if (isset($_GET['action']) && $_GET['action']=='logout') {
	session_start();
	$_SESSION = [];
	session_destroy();
	header("Location: ../"); //This script is called directly and not included
	exit;
}

elseif (!isset($sql)) exit; //Only run from the front page

elseif (isset($_POST['action'])) {
	if ($_POST['action']=='register') {
		//Some server-side validation just in case
		//Should have already checked all of these client-side
		if ($_POST['password'] != $_POST['confirm']) $message = 'The passwords did not match.';
		elseif (!$_POST['password'] || !$_POST['username'] || !$_POST['email']) $message = 'All fields are required.';
		elseif ($sql->get_user_by('username', $_POST['username'])) $message = "The user {$_POST['username']} already exists. Please choose another.";
		elseif ($sql->get_user_by('email', $_POST['email'])) $message = "The email address {$_POST['email']} is already registered. Did you mean to log in?";
		elseif (str_contains($_POST['username'], '@')) $message = 'Username cannot contain \'@\'.';
		
		if (!$message) {
			$result = $sql->new_user($_POST['username'], $_POST['email'], $_POST['password']);
			if ($result) {
				$_SESSION['user'] = $result;
				header("Location: admin/");
				exit;
			} else $message = 'There was an error registering.';
		}
		
	} elseif ($_POST['action']=='login') {
		if (!$_POST['password'] || !$_POST['username']) $message = 'All fields are required.';
		$loginby = str_contains($_POST['username'], '@') ? 'email' : 'username';
		
		$user = $sql->get_user_by($loginby, $_POST['username']);
		if (password_verify($_POST['password'], $user->password)) {
			$_SESSION['user'] = $user->id;
			header("Location: .");
		} else $message = "The password was incorrect.";
	}
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Pick.al | Login</title>
	<link rel="stylesheet" href="admin/admin.css" type="text/css" media="all">
	<link rel="stylesheet" href="login/login.css" type="text/css" media="all">
	<script type="text/javascript" src="login/login.js"></script>
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body id="login">
	<main>
		<h1 id="logo">Pick.al</h1>
		<section id="split">
			<div id="desc">is a lightweight app for selecting students at random and recording participation.</div>

			<form action="" method="post">		
				<ul id="tabs">
					<li>
						<input type="radio" name="action" value="register" id="tab_register" checked />
						<label for="tab_register">Register</label>
					</li>
					<li>
						<input type="radio" name="action" value="login" id="tab_login" />
						<label for="tab_login">Log in</label>
					</li>
				</ul>
				
				<div id="formbody">
					<?php if ($message) echo "<p class='info error'>{$message}</p>"; ?>
					<ul id="entries"><!--Filled by JS--></ul>
					
					<input type="submit" value="Register" />
				</div>
			</form>
		</section>
	</main>

	<?php require_once('admin/parts.php');
	footer(); ?>
</body>
</html>