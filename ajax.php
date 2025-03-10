<?php require_once('query.php');
$sql = new chooser_query();
header('Content-Type: application/json; charset=utf-8');

//Disable caching
$now = gmdate("D, d M Y H:i:s");
header("Expires: Tue, 03 Jul 2001 06:00:00 GMT");
header("Cache-Control: max-age=0, no-cache, must-revalidate, proxy-revalidate");
header("Last-Modified: {$now} GMT");

$req = $_POST['req'] ?? $_GET['req'];

//Error if we're not logged in
if (!$sql->userid && !in_array($req, ['userexists', 'resetpwlink'])) {
	http_response_code(401);
	exit();
}

switch ($req) {

	//=========
	// CLASSES
	//=========

	case 'updateclassinfo':
		$response = $sql->edit_class($_POST['class'], $_POST['title'] ?? null, $_POST['semester'] ?? null, $_POST['year'] ?? null, $_POST['activeuntil'] ?? null, $_POST['schema'] ?? null);
		if ($response) {
			$schema = $sql->get_schema($_POST['schema']);
			echo json_encode([
				'weights' => $schema->items,
				'css' => $schema->output_css(false, false),
				'limits' => $schema->limits
			]);
		}
		else http_response_code(403);
		break;
	
	case 'newquestion':
		echo $sql->new_question($_POST['class'], $_POST['text']);
		break;
	
	case 'editquestion':
		echo $sql->edit_question($_POST['id'], $_POST['text']);
		break;
	
	case 'deletequestion':
		echo $sql->delete_question($_POST['id']);
		break;
	
	case 'archivequestion':
		echo $sql->archive_question($_POST['id'], (bool)$_POST['archive']);
		break;
	
	//==========
	// STUDENTS
	//==========

	case 'editstudent':
		$response = $sql->edit_student($_POST['student'], $_POST['fname'], $_POST['lname'], $_POST['note']);
		if ($response) echo $response;
		else http_response_code(403);
		break;
	
	case 'addstudent':
		$id = $sql->add_student($_POST['classid'], $_POST['fname'], $_POST['lname'], $_POST['note']);
		if ($id) echo $id;
		else http_response_code(403);
		break;
	
	case 'deletestudent':
		echo $sql->delete_student($_POST['id']);
		break;
	
	case 'studentexcused':
		echo $sql->student_excused($_POST['id'], $_POST['excused'] ?: null);
		break;

	case 'uploadroster':
		$i=0;
		$added = [];
		$rows = preg_split('/\r\n|\r|\n/', $_POST['csv']);
		foreach ($rows as $row) {
			if (!$row) continue;
			$row = str_getcsv($row, escape: "\\");
			foreach ($row as &$cell) $cell = trim($cell);
			if (!$i) {
				$fnkey = array_search('fname', $row);
				$lnkey = array_search('lname', $row);
				$notekey = array_search('note', $row);
				
				//Invalid CSV
				if ($fnkey===false || $lnkey===false) {
					echo 'false';
					exit;
				}
			} else {
				$note = $notekey!==false ? $row[$notekey] : null;
				$id = $sql->add_student($_POST['class'], $row[$fnkey], $row[$lnkey], $note);
				if ($id) $added[] = ['id'=>$id, 'fname'=>$row[$fnkey], 'lname'=>$row[$lnkey], 'note'=>$note];
			}
			$i++;
		}
		echo json_encode($added);
		break;
	
	case 'searchstudent':
		echo json_encode($sql->student_search($_GET['phrase']));
		break;
	
	//========
	// EVENTS
	//========

	case 'events':
		echo json_encode($sql->get_events($_GET['student']));
		break;
	
	case 'eventsbyquestion':
		echo json_encode($sql->get_events_by_question($_GET['question']));
		break;

	case 'writeevent':
		$q = $_POST['q'] ?? null;
		$q = ($q && is_numeric($q)) ? (int)$q : null;
		echo $sql->new_event($_POST['rosterid'], $_POST['result'], $q);
		break;
	
	case 'updateevent':
		$q = $_POST['q'] ?? null;
		if ($q) $q = $q=='null' ? 0 : $q; //Pass 0 to clear, pass null to leave unchanged
		echo $sql->edit_event($_POST['event'], $_POST['result'], $q);
		break;
	
	case 'deleteevent':
		echo $sql->delete_event($_POST['event']);
		break;
	
	//=========
	// SCHEMAE
	//=========

	case 'updateschema':
		echo $sql->edit_schema($_POST['id'], $_POST['name']);
		break;
	
	case 'editschemaitems':
		$p = json_decode($_POST['params'], true);

		$newids = [];
		foreach ($p['delete'] as $del) $sql->delete_schema_item($del);
		foreach ($p['new'] as &$new) {
			$new['id'] = $sql->new_schema_item($p['schema'], $new['color'], $new['text'], $new['value']);
			if ($new['id']) $newids[$new['id']] = $new;
		}
		foreach ($p['update'] as $up) $sql->edit_schema_item($up['id'], $up['color'], $up['text'], $up['value'] ?? null);
		echo json_encode($newids);
		break;
	
	//Compatibility by schema
	case 'compatibleschemae':
		//Figure out the pattern a schema has to fit
		$schema = $sql->get_schema($_GET['schema']);
		$values = [];
		foreach ($schema->items as $item) $values["{$item['value']}"] = true;

		$schemae = $sql->get_available_schemae();
		$result = [];
		foreach ($schemae as $sch) {
			if ($sch->id==$schema->id) continue;
			if ($sch->contains_values(array_keys($values))) {
				$scharr = (array)$sch;
				$scharr['markup'] = $sch->output_buttons(true);
				$result[] = $scharr;
			}
		}
		echo json_encode($result);
		break;

	case 'getschemabuttons':
		$schema = $sql->get_schema($_GET['schema']);
		echo $schema->output_buttons(true);
		break;

	//========
	// USERS
	//========
	
	case 'userexists':
		$fields = [];
		if (isset($_GET['username'])) $fields['username'] = ($sql->get_user_by('username', $_GET['username']) ? 1 : 0);
		if (isset($_GET['email'])) $fields['email'] = ($sql->get_user_by('email', $_GET['email']) ? 1 : 0);
		echo json_encode($fields);
		break;
	
	case 'edituser':
		if (!in_array($_POST['k'], ['email'])) $response = False;
		else $response = $sql->edit_user($_POST['k'], $_POST['v']);

		if ($response) echo json_encode($response);
		if (!$response || !is_numeric($response)) http_response_code(403);
		break;
	
	case 'editpw':
		echo json_encode($sql->edit_pw($_POST['current'], $_POST['new']));
		break;
	
	case 'deleteorcid':
		if (!$sql->current_user()->password) return false; //Don't allow disconnection unless a password is set
		$result = $sql->edit_user('orcid', null);
		$sql->user_add_option('orcid_data', null);
		echo json_encode($result);
		break;
	
	case 'resetpwlink':
		$result = $sql->generate_reset_link($_GET['username']);
		if (!is_numeric($result)) http_response_code(500);
		echo $result;
		break;
}

// sleep(1); //Simulate slow network
// x=5/0; //Simulate PHP error