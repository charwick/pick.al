<?php http_response_code(404);
require_once('admin/parts.php'); ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>404 Not Found | Student Chooser</title>
	
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	<link rel="stylesheet" href="/admin/admin.css" type="text/css" media="all">
</head>

<body>
	<?php userbar($sql, '.', 'Admin'); ?>
	<p>Sorry, there's nothing here. You can go back to the <a href=".">Picker</a> or the <a href="admin/">admin panel</a>.</p>
</body>
</html>