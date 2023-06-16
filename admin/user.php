<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();
$user = $sql->current_user(); ?>

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

        <p>Email: <span class="editable" id="email" data-inputtype="email"><?php echo $user->email; ?></span></p>
    </main>
	<?php footer(); ?>
</body>
</html>