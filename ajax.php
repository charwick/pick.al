<?php require_once('query.php');
$sql = new chooser_query();
header('Content-Type: application/json; charset=utf-8');

$req = isset($_POST['req']) ? $_POST['req'] : $_GET['req'];

switch ($req) {
	case 'writeevent':
		echo $sql->write_event($_GET['rosterid'], $_GET['result']);
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
}