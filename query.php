<?php require_once('connect.php'); //Not included in git, but contains the vars to pass to __construct()

//Returns the SQL object
class chooser_query extends mysqli {
	private static $user = 1; //Replace with login system later
	
	function __construct() {
		parent::__construct(...connectionvars());
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	}

	function get_classes() {
		$q = "SELECT classes.*, COUNT(students.class) AS students
			FROM classes
			LEFT JOIN students ON students.class=classes.id
			WHERE classes.user=?
			GROUP BY id
			ORDER BY year DESC";
		$pq = $this->prepare($q);
		$pq->bind_param('i', self::$user);
		$pq->execute();
		$result = $pq->get_result();
		
		$classes = [];
		while ($class = $result->fetch_object()) $classes[] = $class;
		return $classes;
	}

	//Get info on one class. Returns a single row by ID
	function get_class($id) {
		$pq = $this->prepare("SELECT * FROM classes WHERE id=? and user=?");
		$pq->bind_param('ii', $id, self::$user);
		$pq->execute();
		$result = $pq->get_result();
		return $result->fetch_object();
	}

	//Get the roster for a class. Returns an array of objects
	function get_roster($classid) {
		$pq = $this->prepare("SELECT * FROM students WHERE class=? AND user=?");
		$pq->bind_param('ii', $classid, self::$user);
		$pq->execute();
		$students = $pq->get_result();

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	function write_event($rosterid, $result) {
		$pq = $this->prepare("INSERT INTO events (student, `date`, result) VALUES (?, NOW(), ?)");
		$pq->bind_param('id', $rosterid, $result);
		$pq->execute();
		
		return $pq->insert_id;
	}
	
	function add_student($fname, $lname, $class) {
		$q = "INSERT INTO students (fname, lname, class, user) VALUES (?, ?, ?, ?)";
		$pq = $this->prepare($q);
		$pq->bind_param('ssii', $fname, $lname, $class, self::$user);
		$pq->execute();
		
		return $pq->insert_id;
	}
	
	function update_class_info($class, $key, $val) {
		$keys = ['name', 'semester', 'year'];
		if (!in_array($key, $keys)) return False;
		
		$pq = $this->prepare("UPDATE classes SET {$key}=? WHERE id=? AND user=?");
		$pq->bind_param('sii', $val, $class, self::$user);
		$pq->execute();
		return true;
	}
}