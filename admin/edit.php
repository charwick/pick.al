<?php require_once('../query.php');
$sql = new chooser_query();
$classid = isset($_GET['class']) ? $_GET['class'] : null;
if ($classid) $class = $sql->get_class($classid); ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title><?php echo $classid ? "Editing {$class->name} ({$class->semester} {$class->year})" : "New class"; ?></title>
	<link rel="stylesheet" href="admin.css" type="text/css" media="all">
	<script type="text/javascript">var classid = <?php echo $classid ? $classid : 'null'; ?>;</script>
	<script type="text/javascript" src="admin.js"></script>
</head>

<body>
	<form id="classinfo">
		<?php if ($classid) {
			echo "<input type='hidden' name='classid' value='{$classid}'>";
			echo "<h1 id='classname' class='editable'>{$class->name}</h1>";
		} else {
			echo '<input type="text" id="classname" name="classname" placeholder="Class name">';
		} ?>
		
		<p>
			<?php if ($classid) { ?>
				<span class="editable" id="semester"> <?php echo ucwords($class->semester); ?></span>
				<span class="editable" id="year"><?php echo $class->year; ?></span>
			<?php } else { ?>
				<select name="semester" id="semester">
					<option value="spring">Spring</option>
					<option value="fall">Fall</option>
					<option value="winter">Winter</option>
					<option value="summer">Summer</option>
				</select>
				<input type="number" min="2023" max="2100" value="<?php echo date("Y"); ?>" />
			<?php } ?>
		</p>
	</form>
	
	<?php if ($classid) {
		$roster = $sql->get_roster($classid); ?>
		<h2>Student Roster (<?php echo count($roster); ?>)</h2>
		
		<table id="roster">
			<thead>
				<tr>
					<th>First name</th>
					<th>Last name</th>
				</tr>
			</thead>
			<tbody>
				<?php $row=0;
				foreach ($roster as $student) {
					echo "<tr class='".($row?'odd':'')."'><td>{$student->fname}</td><td>{$student->lname}</td></tr>";
					$row = !$row;
				} ?>
			</tbody>
		</table>
		
		<h2>Upload Students</h2>
		<p>Upload a with columns labelled <code>fname</code> and <code>lname</code> in the header row.</p>
		
		<p><input type="file" id="csvfile" name="csvfile" accept="text/csv"></p>
	<?php } ?>
</body>
</html>