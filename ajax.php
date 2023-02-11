<?php require_once('query.php');
$sql = new chooser_query();
header('Content-Type: application/json; charset=utf-8');

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
	
	case 'events';
		echo json_encode($sql->get_events($_GET['student']));
		break;
	
	case 'updateevent';
		echo $sql->edit_event($_GET['event'], $_GET['result']);
		break;
	
	case 'deleteevent';
		echo $sql->delete_event($_GET['event']);
		break;
}