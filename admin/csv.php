<?php //Get roster
require_once('../query.php');
$sql = new chooser_query();
$classid = $_GET['class'] ?? null;
if ($classid) $class = $sql->get_class($classid);
if (!$classid || !$class) {
	require_once('../404.php');
	exit;
}

function escape_csv(?string $str): ?string { return str_replace('"', '""', $str); }

//Disable caching
$now = gmdate("D, d M Y H:i:s");
header("Expires: Tue, 03 Jul 2001 06:00:00 GMT");
header("Cache-Control: max-age=0, no-cache, must-revalidate, proxy-revalidate");
header("Last-Modified: {$now} GMT");

//Force download  
header("Content-Type: application/force-download");
header("Content-Type: application/octet-stream");
header("Content-Type: application/download");
header('Content-Type: text/csv');

//Disposition / encoding on response body
header("Content-Disposition: attachment;filename=".str_replace(' ', '-', strtolower($class->name)).'.csv');
header("Content-Transfer-Encoding: binary");

//Output CSV
echo '"fname", "lname", "note", "numerator", "denominator", "score"'.PHP_EOL;
foreach ($sql->get_roster($classid, true) as $student) {
	echo '"'.escape_csv(html_entity_decode($student->fname)).'",';
	echo '"'.escape_csv(html_entity_decode($student->lname)).'",';
	echo '"'.escape_csv(html_entity_decode($student->note ?? '')).'",';
	echo '"'.($student->score ?: '').'",';
	echo "\"{$student->denominator}\",";
	echo '"'.($student->denominator ? round($student->score/$student->denominator*100) : '').'"'.PHP_EOL;
}