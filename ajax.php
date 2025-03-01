<?php require_once('query.php');
$sql = new chooser_query();
header('Content-Type: application/json; charset=utf-8');

//Disable caching
$now = gmdate("D, d M Y H:i:s");
header("Expires: Tue, 03 Jul 2001 06:00:00 GMT");
header("Cache-Control: max-age=0, no-cache, must-revalidate, proxy-revalidate");
header("Last-Modified: {$now} GMT");

$req = $_POST['req'] ?? $_GET['req'];

switch ($req) {

	//=========
	// CLASSES
	//=========

	case 'updateclassinfo':
		$response = $sql->edit_class($_GET['class'], $_GET['title'] ?? null, $_GET['semester'] ?? null, $_GET['year'] ?? null, $_GET['activeuntil'] ?? null, $_GET['schema'] ?? null);
		if ($response) {
			$schema = $sql->get_schema($_GET['schema']);
			echo json_encode([
				'weights' => $schema->items,
				'css' => $schema->output_css(false, false),
				'limits' => $schema->limits
			]);
		}
		else http_response_code(403);
		break;
	
	case 'getschemabuttons':
		$schema = $sql->get_schema($_GET['schema']);
		echo $schema->output_buttons(true);
		break;
	
	case 'newquestion':
		echo $sql->new_question($_GET['class'], $_GET['text']);
		break;
	
	case 'editquestion':
		echo $sql->edit_question($_GET['id'], $_GET['text']);
		break;
	
	case 'deletequestion':
		echo $sql->delete_question($_GET['id']);
		break;
	
	case 'archivequestion':
		echo $sql->archive_question($_GET['id'], (bool)$_GET['archive']);
		break;
	
	//==========
	// STUDENTS
	//==========

	case 'editstudent':
		$response = $sql->edit_student($_GET['student'], $_GET['fname'], $_GET['lname'], $_GET['note']);
		if ($response) echo $response;
		else http_response_code(403);
		break;
	
	case 'addstudent':
		$id = $sql->add_student($_GET['classid'], $_GET['fname'], $_GET['lname'], $_GET['note']);
		if ($id) echo $id;
		else http_response_code(403);
		break;
	
	case 'deletestudent':
		echo $sql->delete_student($_GET['id']);
		break;
	
	case 'studentexcused':
		echo $sql->student_excused($_GET['id'], $_GET['excused'] ?: null);
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

	case 'writeevent':
		$q = $_GET['q'] ?? null;
		$q = ($q && is_numeric($q)) ? (int)$q : null;
		echo $sql->new_event($_GET['rosterid'], $_GET['result'], $q);
		break;
	
	case 'updateevent':
		$q = $_GET['q'] ?? null;
		if ($q) $q = $q=='null' ? 0 : $q; //Pass 0 to clear, pass null to leave unchanged
		echo $sql->edit_event($_GET['event'], $_GET['result'], $q);
		break;
	
	case 'deleteevent':
		echo $sql->delete_event($_GET['event']);
		break;
	
	//=========
	// SCHEMAE
	//=========

	case 'updateschema':
		echo $sql->edit_schema($_GET['id'], $_GET['name']);
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
		if (!in_array($_GET['k'], ['email'])) $response = False;
		else $response = $sql->edit_user($_GET['k'], $_GET['v']);

		if ($response) echo json_encode($response);
		if (!$response || !is_numeric($response)) http_response_code(403);
		break;
	
	case 'editpw':
		echo json_encode($sql->edit_pw($_GET['current'], $_GET['new']));
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