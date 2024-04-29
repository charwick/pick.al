<?php require_once('../query.php');
require_once('parts.php');
$sql = new chooser_query();

//Login-wall
if (!$sql->current_user()) {
	header("Location: ../");
	exit;
}

//In case of no class
$classid = $_GET['class'] ?? null;
if ($classid) {
	$class = $sql->get_class($classid);
	if (!$class) {
		require_once('../404.php');
		exit;
	}
}
$error = false;

//Create new class
if (isset($_POST['name'])) {
	$id = $sql->new_class($_POST['name'], $_POST['semester'], $_POST['year'], $_POST['activeuntil'], $_POST['schema']);
	if ($id) {
		$url = "class.php?class={$id}";
		header("Location: {$url}");
		exit;
	} else $error = true;
} ?>

<!DOCTYPE html>
<html lang="en-US">
<head>
	<title><?php echo $classid ? "Editing {$class->name} ({$class->semester} {$class->year})" : "New Class"; ?> | Pick.al</title>
	<script type="text/javascript">
		var classid = <?php echo $classid ?: 'null'; ?>;
		<?php if ($classid) {
			$schemae = [$class->schema->name => $class->schema];
			echo "var schema = '{$class->schema->name}', schemabuttons = { '{$class->schema->name}': '".addslashes($class->schema->output_buttons(true))."'};";
		} else $schemae = $sql->get_available_schemae();
		echo 'var schemae = {';
			foreach ($schemae as $schema) echo "'{$schema->name}': ".$schema->output_js(false).',';
		echo '}, schemabuttons = {};'; ?>
	</script>
	<script type="text/javascript" src="js/ajax.js"></script>
	<script type="text/javascript" src="js/class.js"></script>
	<?php if ($classid) echo $class->schema->output_css(true, false);
	else {
		echo '<style type="text/css" class="schema-css">';
		foreach ($schemae as $schema) echo $schema->output_css(false, false);
		echo '</style>';
	}

	headermeta(true); ?>
</head>

<body class="admin-<?php echo $classid ? 'edit' : 'new'; ?>">
	<?php userbar($sql, '.', 'Admin'); ?>
	<main>
		<form id="classinfo" action="" method="post">
			<?php if ($error) echo '<p class="error">There was an error saving your class. Please try again.</p>';
			
			if ($classid) {
				echo "<input type='hidden' name='classid' value='{$classid}'>";
				echo "<h1 id='name'>{$class->name}</h1>";
			} else {
				echo '<h1>New Class</h1>';
				echo '<p id="name"><input type="text" name="name" placeholder="Class Name" value="'.($error ? $_POST['name'] : '').'" required=""></p>';
			} ?>
			
			<?php if ($classid) { ?>
				<p>
					<span id="semester"> <?php echo ucwords($class->semester); ?></span>
					<span id="year"><?php echo $class->year; ?></span>
					<?php echo time() < strtotime($class->activeuntil) ? 'Active until' : 'Inactive since'; ?>
					<span id="activeuntil" data-date="<?php echo $class->activeuntil; ?>"><?php echo date('M j, Y', strtotime($class->activeuntil)); ?></span>
				</p>
				<p id="schemaselect" data-schemaname="<?php echo $class->schema->name; ?>">
					Button schema: <span class="schemalist"><?php echo $class->schema->output_buttons(true); ?></span>
					<span class="actions"><a href="#" class="edit" title="Edit"></a></span>
				</p>
			<?php } else {
				$seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
				if ($error) $selected = $_POST['semester'];
				else $selected = date('n')<6 ? 'spring' : 'fall'; ?>
				<p>
					<select name="semester" id="semester">
						<?php foreach ($seasons as $season)
							echo "<option value='".strtolower($season)."'".($selected==strtolower($season) ? ' selected' : '').">{$season}</option>"; ?>
					</select>
					<input type="number" min="2023" max="2100" name="year" value="<?php echo $error ? $_POST['year'] : date("Y"); ?>" required="">
					Active until <input type="date" name="activeuntil" value="<?php echo $error ? $_POST['activeuntil'] : ''; ?>" required="">
				</p>
				<p id="schemaselect">
					Button schema:
					<select name="schema">
						<?php foreach ($schemae as $schema) echo "<option value='{$schema->name}'>{$schema->name}</option>"; ?>
						<option disabled>Custom schemae coming soon</option>
					</select>
					<span class="schemalist"></span>
				</p>
			<?php } ?>
			
			<?php if (!$classid) { ?>
				<p><input type="submit" name="submit" value="Create Class"></p>
			<?php } ?>
		</form>
		
		<?php if ($classid) {
			$roster = $sql->get_roster($classid); ?>
			<section id="students">
				<h2>
					Roster <span class="num" id="num_students"><?php echo count($roster); ?></span>
					<?php if ($roster) echo '<a href="csv.php?class='.$classid.'" class="deemph-link" id="csvdown">CSV</a>'; ?>
				</h2>
			
				<table id="roster">
					<thead>
						<tr>
							<th class="fname">First name</th>
							<th class="lname">Last name</th>
							<th class="note">Note</th>
							<th class="score">Score</th>
						</tr>
					</thead>
					<tbody><?php
						 $row=0;
						foreach ($roster as $student) {
							$excused = $student->excuseduntil && strtotime($student->excuseduntil)+24*3600 > time();
							echo "<tr data-id='{$student->id}'".($excused ? " data-excused='{$student->excuseduntil}'" : '').">"; //Be inclusive of the day
								echo "<td class='fname'>{$student->fname}</td>";
								echo "<td class='lname'>{$student->lname}";
									if ($excused) echo '<span class="excuses" title="Excused until '.date('M j, Y', strtotime($student->excuseduntil)).'"></span>';
								echo "</td>";
								echo "<td class='note'>{$student->note}</td>";
								$scorepct = $student->denominator ? round($student->score/$student->denominator*100) : '-1';
								echo '<td class="score'.($student->score===null ? ' nullscore' : '').'" data-sort="'.$scorepct.'">';
									if ($student->score!==null) echo "{$student->score}/{$student->denominator}";
								echo "</td>";
							echo "</tr>";
							$row = !$row;
						}
					?></tbody>
					<tfoot>
						<tr>
							<td colspan="3" class="addnew"><a href="#" title="New Student">+</a></td>
							<td class="uploadcsv"><a href="#" title="Upload CSV">CSV</a></td>
						</tr>
					</tfoot>
				</table>
			</section>

			<?php $events = $sql->get_events_by_class($classid, 10);
			//Render in JS because PHP doesn't know the right timezone ?>
			<script type="text/javascript">var events = <?php echo json_encode($events); ?>;</script>
			<section id="recentevents">
				<h2>Recent Participation Events</h2>
				<table class="events">
					<thead>
						<tr>
							<th>Date</th>
							<th>Student</th>
							<th colspan="2">Result</th>
						</tr>
					</thead>
					<tbody><!--Filled in with JS--></tbody>
				</table>
			</section>
			
			<form id="deleteform" action="." method="post">
				<input type="hidden" name="action" value="delete" />
				<input type="hidden" name="class" value="<?php echo $classid; ?>" />
			</form>
		
		<?php } ?>
	</main>
	<?php footer(); ?>
</body>
</html>