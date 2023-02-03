<?php require_once('connect.php'); //Not included in git, but contains the vars to pass to __construct()

//Returns the SQL object
class chooser_query extends mysqli {
	private static $user = 1; //Replace with login system later
	
	function __construct() {
		parent::__construct(...connectionvars());
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	}

	function get_classes($active=false) {
		$aw = $active ? ' AND activeuntil >= NOW()' : '';
		
		$q = "SELECT classes.*, COUNT(students.class) AS students
			FROM classes
			LEFT JOIN students ON students.class=classes.id
			WHERE classes.user=? {$aw}
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
	
	function new_class($name, $semester, $year, $activeuntil, $selector='even') {
		$pq = $this->prepare("INSERT INTO classes (name, semester, year, activeuntil, user, selector) VALUES (?, ?, ?, ?, ?, ?)");
		$pq->bind_param('ssisis', $name, $semester, $year, $activeuntil, self::$user, $selector);
		$pq->execute();
		
		return $pq->insert_id;
	}
	
	function edit_class($class, $key, $val) {
		$keys = ['name', 'semester', 'year', 'activeuntil', 'selector'];
		if (!in_array($key, $keys)) return False;
		
		$pq = $this->prepare("UPDATE classes SET {$key}=? WHERE id=? AND user=?");
		$pq->bind_param('sii', $val, $class, self::$user);
		$pq->execute();
		return $pq->affected_rows;
	}
	
	function delete_class($class) {
		foreach ($this->get_roster($class) as $student) $this->delete_student($student->id);
		$pq = $this->prepare("DELETE FROM classes WHERE id=? AND user=?");
		$pq->bind_param('ii', $class, self::$user);
		$pq->execute();
		return $pq->affected_rows;
	}

	//Get the roster for a class. Returns an array of objects
	function get_roster($classid, $all=false) {
		$wand = $all ? '' : " AND (excuseduntil IS NULL OR NOW() > DATE_ADD(excuseduntil, INTERVAL 1 DAY))";
		$q="SELECT students.*, SUM(events.result) AS score, COUNT(events.student) AS denominator
			FROM students
			LEFT JOIN events ON events.student=students.id
			WHERE class=? AND user=? $wand
			GROUP BY students.id
			ORDER BY students.lname";
		$pq = $this->prepare($q);
		$pq->bind_param('ii', $classid, self::$user);
		$pq->execute();
		$students = $pq->get_result();

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	function new_event($rosterid, $result) {
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
	
	function edit_student($id, $fname, $lname) {
		$pq = $this->prepare("UPDATE students SET fname=?, lname=? WHERE id=? AND user=?");
		$pq->bind_param('ssii', $fname, $lname, $id, self::$user);
		$pq->execute();
		
		return $pq->affected_rows;
	}
	
	function delete_student($id) {
		$pq = $this->prepare("DELETE FROM students WHERE id=? AND user=?");
		$pq->bind_param('ii', $id, self::$user);
		$pq->execute();
		if ($pq->affected_rows) {
			$pq2 = $this->prepare("DELETE FROM events WHERE student=?");
			$pq2->bind_param('i', $id);
			$pq2->execute();
		}
		
		return $pq->affected_rows;
	}
	
	function student_excused($id, $excused) {
		$pq = $this->prepare("UPDATE students SET excuseduntil=? WHERE id=? AND user=?");
		if (!$excused) $excused = null;
		$pq->bind_param('sii', $excused, $id, self::$user);
		$pq->execute();
		return $pq->affected_rows;
	}
}