<?php $message = null;
if (isset($_POST['action'])) {
	require_once('../query.php');
	$sql = new chooser_query();
	
	if ($_POST['action']=='register') {
		//Some server-side validation just in case
		//Should have already checked all of these client-side
		if ($_POST['password'] != $_POST['confirm']) $message = 'The passwords did not match.';
		elseif (!$_POST['password'] || !$_POST['username'] || !$_POST['email']) $message = 'All fields are required.';
		elseif ($sql->user_exists('username', $_POST['username'])) $message = "The user {$_POST['username']} already exists. Please choose another.";
		elseif ($sql->user_exists('email', $_POST['email'])) $message = "The email address {$_POST['email']} is already registered. Did you mean to log in?";
		elseif (str_contains($_POST['username'], '@')) $message = 'Username cannot contain \'@\'.';
					
		if (!$message) {
			$result = $sql->new_user($_POST['username'], $_POST['email'], $_POST['password']);
			print_r($result);
			if ($result) {
				echo "Ran the result";
				header("Location: ../admin/");
				exit;
			} else $message = 'There was an error registering.';
		}
		
	} elseif ($_POST['action']=='login') {
		if (!$_POST['password'] || !$_POST['username']) $message = 'All fields are required.';
		$loginby = str_contains($_POST['username'], '@') ? 'email' : 'username';
		
	}	
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Student Chooser Login</title>
	<link rel="stylesheet" href="../admin/admin.css" type="text/css" media="all">
	<link rel="stylesheet" href="login.css" type="text/css" media="all">
	<script type="text/javascript" src="login.js"></script>
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body>
	<form action="login.php" method="post">		
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
</body>
</html>