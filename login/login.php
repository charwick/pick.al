<?php $message = null;
$defaulttab = 'register';
require_once((str_contains(getcwd(), 'login') ? '../' : '').'orcid.php'); //Because it's relative to the including script, and not this file
$bodyclass = '';
$orcid = new orcid_api();

//Some server-side registration validation just in case
//Should have already checked all of these client-side
function validate() {
	global $sql;
	if (isset($_POST['password']) && $_POST['password'] != $_POST['confirm']) return 'The passwords did not match.';
	elseif (!((isset($_POST['password']) && $_POST['password']) || isset($_SESSION['orcid'])) || !$_POST['username'] || !$_POST['email']) return 'All fields are required.';
	elseif (isset($_POST['password']) && strlen($_POST['password']) < 5 && !isset($_SESSION['orcid'])) return 'Password must be at least 5 characters.';
	elseif (isset($_POST['password']) && str_contains(strtolower($_POST['password']), strtolower(trim($_POST['username'])))) return 'Password cannot contain the username.';
	elseif ($sql->get_user_by('username', $_POST['username'])) return "The username {$_POST['username']} already exists. Please choose another.";
	elseif ($sql->get_user_by('email', $_POST['email'])) {
		$message = "The email address {$_POST['email']} is already registered. ";
		if (isset($_SESSION['orcid']) && !isset($_POST['password'])) $message .= "<a href='/'>Log in with your email address</a> and add your OrcID on the user page.";
		else $message .= "Did you mean to log in?";
		return $message;
	} elseif (str_contains($_POST['username'], '@')) return 'Username cannot contain \'@\'.';
}

if (isset($_SESSION['message'])) {
	$message = $_SESSION['message'];
	unset($_SESSION['message']);
}

if (isset($_GET['action']) && $_GET['action']=='logout') {
	session_start();
	$_SESSION = [];
	session_destroy();
	header("Location: ../"); //This script is called directly and not included
	exit;
}

elseif (!isset($sql)) exit; //Only run from the front page

//Request a password reset
elseif (isset($_GET['action']) && $_GET['action']=='resetpw') {
	$bodyclass = 'resetpw';

//Prompt the user for a new password
} elseif (isset($_GET['action']) && $_GET['action']=='pwreset') {
	$user = $sql->get_user_by('id', $_GET['user']);
	if (!$user || $user->options->pwreset->key!=$_GET['key'] || (int)$user->options->pwreset->key > time()) $message = 'Invalid password reset link. Please request another.';
	else $bodyclass = 'choosepw';

} elseif (isset($_POST['action'])) {
	//Make the reset happen
	if ($_POST['action']=='resetpw') {
		$user = $sql->get_user_by('id', $_POST['user']);
		if (!$user || $user->options->pwreset->key!=$_POST['key'] || (int)$user->options->pwreset->key > time()) $message = 'Invalid password reset link. Please request another.';
		else {
			$reset = $sql->edit_pw('', $_POST['password'], $user->id, true);
			if ($reset) $message = 'Password has been reset. You may now log in with your new password.';
			else $message = 'There was a problem with your new password. Please try again.'; //Javascript should enforce pw reqs on the frontend, so a user should never see this unless trying to do something fishy
			$defaulttab = 'login';
		}

	} elseif ($_POST['action']=='register') {
		$message = validate();
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
		} else {
			$message = "The password was incorrect.";
			$defaulttab = 'login';
		}
	}

//Finalize OrcID registration
} elseif (isset($_POST['username']) && isset($_POST['email']) && !isset($_POST['password']) && isset($_SESSION['orcid'])) {
	$bodyclass = 'orcid_register'; $username = $_POST['username']; $email = $_POST['email'];
	$message = validate();
	if (!$message) {
		$result = $sql->new_user($_POST['username'], $_POST['email'], '', $_SESSION['orcid']);
		if ($result) {
			unset($_SESSION['orcid']);
			$_SESSION['user'] = $result;
			header("Location: admin/");
			exit;
		} else $message = 'There was an error registering.';
	}

//Authenticate via OrcID
} elseif (isset($_GET['code'])) {
	$response = $orcid->get_auth_token($_GET['code']);
	if (isset($response->error)) $message = $response->error;
	if (isset($response->orcid)) {
		$user = $sql->get_user_by('orcid', $response->orcid);
		$orcid_data = [
			'access_token' => $response->access_token,
			'refresh_token' => $response->refresh_token,
			'expires_in' => $response->expires_in
		];

		//Login
		if ($user) {
			$_SESSION['user'] = $user->id;
			$sql->user_add_option('orcid_data', $orcid_data);
			header("Location: .");
			exit;
		
		//Register
		} else {
			$record = $orcid->get_record();
			$bodyclass = 'orcid_register';
			$username = $record->person->name->{'given-names'}->value.$record->person->name->{'family-name'}->value;
			$email = $record->person->emails->email[0]->email ?? '';

			//Avoid username collisions
			$unoriginal = $username; $uninc = 1;
			while ($sql->get_user_by('username',$username)) {
				$username = $unoriginal.$uninc;
				$uninc++;
			}
			$_SESSION['orcid'] = $response->orcid; //Don't do a hidden input so the user can't change the OrcID
		}
	}
}
require_once('admin/parts.php'); ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>Pick.al | Login</title>
	<?php headermeta(true); ?>
	<link rel="stylesheet" href="login/login.css" type="text/css" media="all">
	<script type="text/javascript" src="login/login.js"></script>
	<meta name="description" content="Pick.al is a lightweight app for selecting students at random and recording participation.">
</head>

<body id="login" class="<?php echo $bodyclass; ?>">
	<main>
		<h1 id="logo">Pick.al</h1>
		<section id="split">
			<div id="desc">
				<?php if ($bodyclass=='orcid_register') echo 'One more step to complete your registration.';
				elseif ($bodyclass=='resetpw') echo 'Enter your username or email and we\'ll send you a link to reset your password.';
				elseif ($bodyclass=='choosepw') echo "Welcome back, {$user->username}. Choose a new password and you'll be on your way.";
				else { ?>
					is a lightweight app for selecting students at random and recording participation.
					<div id="demo">
						<video autoplay muted loop disablePictureInPicture="true">
							<source src="/login/pickal.mp4" type="video/mp4">
						</video>
						<img src="/login/phone-mask.png" alt="Phone">
					</div>
				<?php } ?>
			</div>

			<form action="/" method="post">
				<?php if ($bodyclass=='orcid_register') { ?>
					<div id="formbody">
						<?php if ($message) echo "<p class='info error'>{$message}</p>"; ?>
						<ul id="entries">
							<li><input name="username" type="text" placeholder="Username" value="<?php echo $username; ?>"></li>
							<li><input name="email" type="email" placeholder="Email Address" value="<?php echo $email; ?>"></li>
							<li id="orcid">
								OrcId: <?php echo $_SESSION['orcid']; ?>
								<span class="actions"><a href="/" class="cancel" title="Remove OrcID"></a></span>
							</li>
						</ul>
						<input type="submit" value="Register" />
					</div>

				<?php } elseif ($bodyclass=='resetpw') { ?>
					<div id="formbody">
						<ul id="entries"><li><input name="username" type="text" placeholder="Username or Email Address" required=""></li></ul>
						<input type="submit" value="Submit" />
					</div>

				<?php } elseif ($bodyclass=='choosepw') { ?>
					<div id="formbody">
						<ul id="entries">
							<li><input name="password" type="password" placeholder="New Password" required=""></li>
							<li><input name="confirm" type="password" placeholder="Confirm Password" required=""></li>
						</ul>
						<input type="hidden" name="action" value="resetpw" />
						<input type="hidden" name="user" value="<?php echo $_GET['user']; ?>" />
						<input type="hidden" name="key" value="<?php echo $_GET['key']; ?>" />
						<input type="submit" value="Submit" />
					</div>

				<?php } else { ?>
					<ul id="tabs">
						<li>
							<input type="radio" name="action" value="register" id="tab_register" <?php echo $defaulttab=='register' ? 'checked' : ''; ?> />
							<label for="tab_register">Register</label>
						</li>
						<li>
							<input type="radio" name="action" value="login" id="tab_login" <?php echo $defaulttab=='login' ? 'checked' : ''; ?> />
							<label for="tab_login">Log in</label>
						</li>
					</ul>
					
					<div id="formbody">
						<?php if ($message) echo "<p class='info error'>{$message}</p>"; ?>
						<ul id="entries"><!--Filled by JS--></ul>
						
						<a href="/?action=resetpw" id="resetlink">Forgot password?</a>
						<a href="#" id="terms">Terms & Conditions</a>
						<input type="submit" value="Register" />
					</div>

					<div id="actionbuttons">
						<a href="<?php echo $orcid->auth_url('https://pick.al'); ?>" class="button" id="orcid">Log in or register with OrcID</a>
						<a href="/?try" class="button" id="try">Try a Demo</a>
					</div>
				<?php } ?>
			</form>
		</section>
	</main>

	<?php footer(); ?>
	<dialog><div><?php include('terms.html'); ?></div></dialog>
</body>
</html>