<?php require_once('query.php');
$sql = new chooser_query();
header('Content-Type: application/json; charset=utf-8');

//Disable caching
$now = gmdate("D, d M Y H:i:s");
header("Expires: Tue, 03 Jul 2001 06:00:00 GMT");
header("Cache-Control: max-age=0, no-cache, must-revalidate, proxy-revalidate");
header("Last-Modified: {$now} GMT");

$req = isset($_POST['req']) ? $_POST['req'] : $_GET['req'];

switch ($req) {
	case 'writeevent':
		echo $sql->new_event($_GET['rosterid'], $_GET['result']);
		break;
	
	case 'uploadroster':
		$i=0;
		$added = [];
		$rows = preg_split('/\r\n|\r|\n/', $_POST['csv']);
		foreach ($rows as $row) {
			if (!$row) continue;
			$row = str_getcsv($row);
			if (!$i) {
				$fnkey = array_search('fname', $row);
				$lnkey = array_search('lname', $row);
				
				//Invalid CSV
				if ($fnkey===false || $lnkey===false) {
					echo 'false';
					exit;
				}
			} else {
				$id = $sql->add_student($row[$fnkey], $row[$lnkey], $_POST['class']);
				if ($id) $added[] = ['id'=>$id, 'fname'=>$row[$fnkey], 'lname'=>$row[$lnkey]];
			}
			$i++;
		}
		echo json_encode($added);
		break;
	
	case 'updateclassinfo':
		$response = $sql->edit_class($_GET['class'], $_GET['k'], $_GET['v']);
		if ($response) echo $response;
		else http_response_code(403);
		break;
	
	case 'editstudent':
		$response = $sql->edit_student($_GET['student'], $_GET['fname'], $_GET['lname']);
		if ($response) echo $response;
		else http_response_code(403);
		break;
	
	case 'addstudent':
		$id = $sql->add_student($_GET['fname'], $_GET['lname'], $_GET['classid']);
		if ($id) echo $id;
		else http_response_code(403);
		break;
	
	case 'deletestudent':
		echo $sql->delete_student($_GET['id']);
		break;
	
	case 'studentexcused':
		echo $sql->student_excused($_GET['id'], $_GET['excused']);
		break;
	
	case 'events':
		echo json_encode($sql->get_events($_GET['student']));
		break;
	
	case 'updateevent':
		echo $sql->edit_event($_GET['event'], $_GET['result']);
		break;
	
	case 'deleteevent':
		echo $sql->delete_event($_GET['event']);
		break;
	
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
		$result = $sql->edit_user('orcid', null);
		$sql->user_add_option('orcid_data', null);
		echo json_encode($result);
		break;
}