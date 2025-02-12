<?php http_response_code(404);
require_once('admin/parts.php');
if (!isset($sql)) {
	require_once('query.php');
	$sql = new chooser_query();
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title>404 Not Found | Student Chooser</title>
	
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
	<?php embed_asset('admin.css'); ?>
</head>

<body>
	<?php userbar($sql, '.', 'Picker'); ?>
	<p>Sorry, there's nothing here. You can go back to the <a href=".">Picker</a> or the <a href="admin/">admin panel</a>.</p>
</body>
</html>