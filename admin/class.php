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
	$events = $sql->get_events_by_class($classid);
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
	<title><?php echo $classid ? "Editing {$class->name} (".ucfirst($class->semester)." {$class->year})" : "New Class"; ?> | Pick.al</title>
	<script type="text/javascript">
		var classid = <?php echo $classid ?: 'null'; ?>;
		<?php if ($classid) {
			$schemae = [$class->schema->name => $class->schema];
			
			//Figure out the pattern a schema has to fit
			$values = [];
			foreach ($events as $event) $values["$event->result"] = true;

			$allschemae = $sql->get_available_schemae();
			$result = [];
			foreach ($allschemae as $schema) $result[] = [
				'name' => $schema->name,
				'id' => $schema->id,
				'compatible' => $schema->contains_values(array_keys($values))
			]; 
			echo 'allschemae='.json_encode($result).',';
			echo "schema = '{$class->schema->id}', schemabuttons = { '{$class->schema->name}': '".addslashes($class->schema->output_buttons(true))."'};";
		} else $schemae = $sql->get_available_schemae();
		echo 'var schemae = {';
			foreach ($schemae as $schema) echo "'{$schema->id}': ".json_encode($schema).",";
		echo "}, schemabuttons = ".($classid ? json_encode([$class->schema->id => $class->schema->output_buttons(true)]) : '{}').';'; ?>
	</script>
	<?php embed_asset('ajax.js');
	embed_asset('class.js');
	if ($classid) echo $class->schema->output_css(true, false);
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
			
			if ($classid) { ?>
				<input type='hidden' name='classid' value='<?php echo $classid; ?>'>
				<h1 id='name'>
					<?php echo $class->name;
					?><span class="actions"><a class="edit" href="#" title="Edit"></a><a class="delete" href="#" title="Delete"></a></span>
				</h1>
			<?php } else {
				echo '<h1>New Class</h1>';
				echo '<p id="name"><input type="text" name="name" placeholder="Class Name" value="'.($error ? $_POST['name'] : '').'" required=""></p>';
			} ?>
			
			<?php if ($classid) { ?>
				<p id="classmeta">
					<span class="meta-item">
						<span id="semester"> <?php echo ucwords($class->semester); ?></span>
						<span id="year"><?php echo $class->year; ?></span>
					</span>
					<span class="meta-item">
						<?php echo time() < strtotime($class->activeuntil) ? 'Active until' : 'Inactive since'; ?>
						<span id="activeuntil" data-date="<?php echo $class->activeuntil; ?>"><?php echo date('M j, Y', strtotime($class->activeuntil)); ?></span>
					</span>
					<span class="meta-item" id="schemaselect">
						Button schema: <span id="selectgoeshere" data-default="<?php echo $class->schema->id; ?>"></span> <span class="schemalist"><?php echo $class->schema->output_buttons(true); ?></span>
					</span>
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
						<?php foreach ($schemae as $schema) echo "<option value='{$schema->id}'".($schema->id==1 ? ' selected="selected"' : '').">{$schema->name}</option>"; ?>
						<hr />
						<option value="__addnew__">Add new schema</option>
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
								$den = $student->denominator * $schema->limits[1];
								$scorepct = $student->denominator ? round($student->score/$den*100) : '-9999';
								echo '<td class="score" data-sort="'.$scorepct.'">';
									if ($student->score!==null) echo round($student->score,2)."/{$den}";
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

			<section id="questions">
				<h2 class="new-feature">Queued Questions</h2>
				<p><em><small>Queued questions can be staged during class in the sidebar of the picker.</small></em></p>
				<ul id="questionlist"><?php
					$inactives = 0;
					foreach ($sql->get_questions($classid) as $question) { ?>
						<li data-id="<?php echo $question->id; ?>"<?php if (!$question->active) echo ' class="inactive"'; ?>>
							<?php echo $question->text; ?>
							<span class="date"><?php echo date('M j, Y', strtotime($question->date)); ?> — <?php echo $question->events; ?> Event<?php echo $question->events != 1 ? 's' : ''; ?></span>
							<?php if (!$question->active) $inactives++; ?>
						</li>
					<?php }
				?></ul>
				<div id="qactions">
					<a href="#" class="addnew" title="New Question">+</a>
					<a href="#" class="expand<?php if (!$inactives) echo ' disabled'; ?>" title="Show Inactive Questions">^</a>
				</div>
			</section>

			<?php //Render in JS because PHP doesn't know the right timezone
			array_splice($events, 10); ?>
			<script type="text/javascript">var events = <?php echo json_encode($events); ?>;</script>
			<section id="recentevents">
				<h2>Recent Participation Events</h2>
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