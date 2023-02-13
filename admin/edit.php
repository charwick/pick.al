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
	$id = $sql->new_class($_POST['name'], $_POST['semester'], $_POST['year'], $_POST['activeuntil'], $_POST['selector']);
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

<body class="admin-<?php echo $classid ? 'edit' : 'new'; ?>">
	<a href="." id="backlink" class="deemph-link">← Back to Admin</a>
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
		
		<p>
			Selector:
			<select id="selector" name="selector">
				<?php foreach (['even' => 'Even', 'rand' => 'Random', 'order' => 'In order'] as $opt => $title)
					echo "<option value='{$opt}'".($class->selector==$opt ? ' selected' : '').">{$title}</option>"; ?>
			</select>
			<span id="selector-desc"></span>
		</p>
		
		<?php if (!$classid) { ?>
			<p><input type="submit" name="submit" value="Create Class"></p>
		<?php } ?>
	</form>
	
	<?php if ($classid) {
		$roster = $sql->get_roster($classid, true); ?>
		<section id="students">
			<h2>
				Student Roster <span class="num" id="num_students"><?php echo count($roster); ?></span>
				<?php if ($roster) echo '<a href="csv.php?class='.$classid.'" class="deemph-link" id="csvdown">CSV</a>'; ?>
			</h2>
		
			<table id="roster">
				<thead>
					<tr>
						<th>First name</th>
						<th colspan="2">Last name</th>
						<th>Score</th>
					</tr>
				</thead>
				<tbody>
					<?php $row=0;
					foreach ($roster as $student) {
						if ($student->excuseduntil && strtotime($student->excuseduntil) > time()) $trclasses[] = 'excused';
						echo "<tr data-id='{$student->id}'".($student->excuseduntil && strtotime($student->excuseduntil)+24*3600 > time() ? " data-excused='{$student->excuseduntil}'" : '').">"; //Be inclusive of the day
							echo "<td class='fname'>{$student->fname}</td>";
							echo "<td class='lname'>{$student->lname}</td>";
							echo '<td class="actions"></td>';
							echo '<td class="score'.($student->score===null ? ' nullscore' : '').'">';
								if ($student->score===null) echo '—';
								else echo "{$student->score}/{$student->denominator} (".round($student->score/$student->denominator*100)."%)";
							echo "</td>";
						echo "</tr>";
						$row = !$row;
					} ?>
				</tbody>
				<tfoot>
					<tr><td colspan="4" class="addnew"><a href="#">+</a></td></tr>
				</tfoot>
			</table>
		</section>
		
		<section id="csvupload">
			<h2>Upload Students</h2>
			<p>Upload a CSV file with columns labelled <code>fname</code> and <code>lname</code> in the header row.</p>
		
			<p>
				<label for="csvfile">Click here or drag a CSV file to upload</label>
				<input type="file" id="csvfile" name="csvfile" accept="text/csv">
			</p>
		</section>
		
		<form id="deleteform" action="." method="post">
			<input type="hidden" name="action" value="delete" />
			<input type="hidden" name="class" value="<?php echo $classid; ?>" />
			<input type="submit" value="Delete class" />
		</form>
			
	<?php } ?>
</body>
</html>