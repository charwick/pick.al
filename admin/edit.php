<?php require_once('../query.php');
$sql = new chooser_query();
$classid = isset($_GET['class']) ? $_GET['class'] : null;
if ($classid) {
	$class = $sql->get_class($classid);
	if (!$class) {
		require_once('../404.php');
		exit;
	}
}
$error = false;

if (isset($_POST['name'])) {
	$id = $sql->new_class($_POST['name'], $_POST['semester'], $_POST['year'], $_POST['activeuntil']);
	if ($id) {
		$url = "edit.php?class={$id}";
		header("Location: {$url}");
		exit;
	} else $error = true;
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title><?php echo $classid ? "Editing {$class->name} ({$class->semester} {$class->year})" : "New class"; ?></title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<script type="text/javascript">var classid = <?php echo $classid ? $classid : 'null'; ?>;</script>
	<script type="text/javascript" src="admin.js"></script>
	<meta name="viewport" content="width=device-width, maximum-scale=1, minimum-scale=1" />
</head>

<body>
	<form id="classinfo" action="" method="post">
		<?php if ($error) echo '<p class="error">There was an error saving your class. Please try again.</p>';
		
		if ($classid) {
			echo "<input type='hidden' name='classid' value='{$classid}'>";
			echo "<h1 id='name' class='editable' data-inputtype='text'>{$class->name}</h1>";
		} else {
			echo '<h1>New class</h1>';
			echo '<p><input type="text" id="name" name="name" placeholder="Class name" value="'.($error ? $_POST['name'] : '').'"></p>';
		} ?>
		
		<p>
			<?php if ($classid) { ?>
				<span class="editable" id="semester" data-inputtype='select'> <?php echo ucwords($class->semester); ?></span>
				<span class="editable" id="year" data-inputtype='number'><?php echo $class->year; ?></span>
				<?php echo time() < strtotime($class->activeuntil) ? 'Active until' : 'Inactive since'; ?>
				<span class="editable" id="activeuntil" data-inputtype='date'><?php echo $class->activeuntil; ?></span>
			<?php } else {
				$seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
				if ($error) $selected = $_POST['semester'];
				else $selected = date('n')<6 ? 'spring' : 'fall'; ?>
				<select name="semester" id="semester">
					<?php foreach ($seasons as $season)
						echo "<option value='".strtolower($season)."'".($selected==strtolower($season) ? ' selected' : '').">{$season}</option>"; ?>
				</select>
				<input type="number" min="2023" max="2100" name="year" value="<?php echo $error ? $_POST['year'] : date("Y"); ?>">
				Active until <input type="date" name="activeuntil" value="<?php echo $error ? $_POST['activeuntil'] : ''; ?>">
			<?php } ?>
		</p>
		
		<?php if (!$classid) { ?>
			<p><input type="submit" name="submit" value="Submit"></p>
		<?php } ?>
	</form>
	
	<?php if ($classid) {
		$roster = $sql->get_roster($classid); ?>
		<h2>Student Roster (<span id="num_students"><?php echo count($roster); ?></span>)</h2>
		
		<table id="roster">
			<thead>
				<tr>
					<th>First name</th>
					<th>Last name</th>
					<th>Score</th>
				</tr>
			</thead>
			<tbody>
				<?php $row=0;
				foreach ($roster as $student) {
					echo "<tr class='".($row?'odd':'')."' data-id='{$student->id}'>";
						echo "<td class='fname'>{$student->fname}</td>";
						echo "<td class='lname'>{$student->lname}</td>";
						echo "<td".($student->score===null ? ' class="nullscore"' : '').">";
							if ($student->score===null) echo '—';
							else echo "{$student->score}/{$student->denominator} (".round($student->score/$student->denominator*100)."%)";
						echo "</td>";
					echo "</tr>";
					$row = !$row;
				} ?>
			</tbody>
			<tfoot>
				<tr id="addnew"><td colspan="3"><a href="#">+</a></td></tr>
			</tfoot>
		</table>
		
		<h2>Upload Students</h2>
		<p>Upload a CSV file with columns labelled <code>fname</code> and <code>lname</code> in the header row.</p>
		
		<p><input type="file" id="csvfile" name="csvfile" accept="text/csv"></p>
	<?php } ?>
</body>
</html>