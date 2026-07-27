<?php require_once('query.php');
$sql = new chooser_query();
$req = $_POST['req'] ?? $_GET['req'];

//Error if we're not logged in
if (!$sql->userid && !in_array($req, ['userexists', 'resetpwlink', 'classdata', 'classlist'])) {
	http_response_code(401);
	exit();
}

switch ($req) {

	//=========
	// CLASSES
	//=========

	case 'classdata':
		$classid = isset($_GET['class']) ? (int)$_GET['class'] : 0;
		if (!$classid) { http_response_code(400); exit(); }

		$class = $sql->get_class($classid);
		if (!$class || ($class->user && $class->user != $sql->userid)) { http_response_code(401); exit(); }

		$class->roster = $sql->get_roster($classid);
		$class->questions = $sql->get_questions($classid, true, 'ASC');
		$class->schemaCss = $class->schema ? $class->schema->output_css() : '';
		$class->demo = !$sql->userid;

		$json_response = json_encode($class);
		break;
	
	case 'classlist':
		$classes = $sql->get_classes();
		$response = [
			'active' => [],
			'inactive' => [],
			'username' => $sql->current_user()->username ?? null
		];
		foreach ($classes as $id => $class) {
			if ($class->active) $response['active'][] = $class;
			else $response['inactive'][] = $class;
		}
		$json_response = json_encode($response);
		break;

	case 'updateclassinfo':
		$response = $sql->edit_class($_POST['class'], $_POST['title'] ?? null, $_POST['semester'] ?? null, $_POST['year'] ?? null, $_POST['activeuntil'] ?? null, $_POST['schema'] ?? null);
		if ($response) {
			$schema = $sql->get_schema($_POST['schema']);
			$json_response = json_encode([
				'weights' => $schema->items,
				'css' => $schema->output_css(false, false),
				'limits' => $schema->limits
			]);
		}
		else { http_response_code(403); exit(); }
		break;
	
	case 'publicize':
		$json_response = $sql->edit_class($_POST['class'], null, null, null, null, null, $_POST['public']=='true');
		break;
	
	case 'newquestion':
		$json_response = $sql->new_question($_POST['class'], $_POST['text']);
		break;
	
	case 'editquestion':
		$json_response = $sql->edit_question($_POST['id'], $_POST['text']);
		break;
	
	case 'deletequestion':
		$json_response = $sql->delete_question($_POST['id']);
		break;
	
	case 'archivequestion':
		$json_response = $sql->archive_question($_POST['id'], (bool)$_POST['archive']);
		break;
	
	//==========
	// STUDENTS
	//==========

	case 'editstudent':
		$response = $sql->edit_student($_POST['student'], $_POST['fname'], $_POST['lname'], $_POST['note']);
		if ($response) $json_response = $response;
		else { http_response_code(403); exit(); }
		break;
	
	case 'addstudent':
		$id = $sql->add_student($_POST['classid'], $_POST['fname'], $_POST['lname'], $_POST['note']);
		if ($id) $json_response =  $id;
		else { http_response_code(403); exit(); }
		break;
	
	case 'deletestudent':
		$json_response = $sql->delete_student($_POST['id']);
		break;
	
	case 'studentexcused':
		$json_response = $sql->student_excused($_POST['id'], $_POST['excused'] ?: null);
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
		$json_response = json_encode($added);
		break;
	
	case 'searchstudent':
		$json_response = json_encode($sql->student_search($_GET['phrase']));
		break;
	
	//========
	// EVENTS
	//========

	case 'events':
		$json_response = json_encode($sql->get_events($_GET['student']));
		break;
	
	case 'eventsbyquestion':
		$json_response = json_encode($sql->get_events_by_question($_GET['question']));
		break;

	case 'writeevent':
		$q = $_POST['q'] ?? null;
		$q = ($q && is_numeric($q)) ? (int)$q : null;
		$json_response = $sql->new_event($_POST['rosterid'], $_POST['result'], $q);
		break;
	
	case 'updateevent':
		$q = $_POST['q'] ?? null;
		if ($q) $q = $q=='null' ? 0 : $q; //Pass 0 to clear, pass null to leave unchanged
		$json_response = $sql->edit_event($_POST['event'], $_POST['result'], $q);
		break;
	
	case 'deleteevent':
		$json_response = $sql->delete_event($_POST['event']);
		break;
	
	//=========
	// SCHEMAE
	//=========

	case 'updateschema':
		$json_response = $sql->edit_schema($_POST['id'], $_POST['name']);
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
		$json_response = json_encode($newids);
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
		$json_response = json_encode($result);
		break;

	case 'getschemabuttons':
		$schema = $sql->get_schema($_GET['schema']);
		$json_response = $schema->output_buttons(true);
		break;

	//========
	// USERS
	//========
	
	case 'userexists':
		$fields = [];
		if (isset($_GET['username'])) $fields['username'] = ($sql->get_user_by('username', $_GET['username']) ? 1 : 0);
		if (isset($_GET['email'])) $fields['email'] = ($sql->get_user_by('email', $_GET['email']) ? 1 : 0);
		$json_response = json_encode($fields);
		break;
	
	case 'edituser':
		if (!in_array($_POST['k'], ['email'])) $response = False;
		else $response = $sql->edit_user($_POST['k'], $_POST['v']);

		if ($response) $json_response = json_encode($response);
		if (!$response || !is_numeric($response)) { http_response_code(403); exit(); }
		break;
	
	case 'editpw':
		$json_response = json_encode($sql->edit_pw($_POST['current'], $_POST['new']));
		break;
	
	case 'deleteorcid':
		if (!$sql->current_user()->password) return false; //Don't allow disconnection unless a password is set
		$result = $sql->edit_user('orcid', null);
		$sql->user_add_option('orcid_data', null);
		$json_response = json_encode($result);
		break;
	
	case 'resetpwlink':
		$result = $sql->generate_reset_link($_GET['username']);
		if (!is_numeric($result)) http_response_code(500);
		$json_response = $result;
		break;
	
	case 'updateoption':
		if (!in_array($_POST['opt'], ['publicapi'])) { //whitelist
			$json_response = '0'; break;
		}
		$val = $_POST['val']=='false' ? null : $_POST['val'];
		$json_response = $sql->user_add_option($_POST['opt'], $val);
		break;
	
	case 'api':
		$user = $sql->get_user_by('id', (int)$_GET['user']);
		if (!$user || !($user->options->publicapi ?? false)) {
			http_response_code(403);
			exit();
		}
		$classes = $sql->get_classes(false, $user->id);
		foreach ($classes as $id => $class)
			if (!$class->apipublic) unset($classes[$id]);
		$json_response = json_encode($classes);
		break;
}

//Send an ETag to safely cache
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
	$etag = '"'.md5($json_response).'"';
	if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        header("ETag: {$etag}");
        http_response_code(304);
        exit();
    }
	header("Cache-Control: no-cache, must-revalidate");
    header("ETag: {$etag}");
} else header("Cache-Control: no-store, no-cache, must-revalidate");

echo $json_response;

// sleep(1); //Simulate slow network
// x=5/0; //Simulate PHP error