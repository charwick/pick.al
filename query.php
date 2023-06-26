<?php require_once('connect.php'); //Not included in git, but contains the vars to pass to __construct()
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

//Returns the SQL object
class chooser_query extends mysqli {
	function __construct() {
		parent::__construct(...connectionvars());
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
	}
	
	function run_query($query, $vars) {
		$q = $this->prepare($query);
		$types = '';
		$typemap = [ 'integer' => 'i', 'string' => 's', 'double' => 'd', 'NULL' => 'i' ];
		foreach ($vars as $var) {
			if (is_numeric($var)) $var += 0; //GET comes in as all strings; convert to numeric if necessary
			$types .= $typemap[gettype($var)];
		}
		if ($q->bind_param($types, ...$vars)) $q->execute();
		return $q;
	}
	
	//======================
	// DATA FETCH FUNCTIONS
	//======================

	function get_classes($active=false) {
		$aw = $active ? ' AND activeuntil >= NOW()' : '';
		
		$q = "SELECT classes.*, COUNT(students.class) AS students
			FROM classes
			LEFT JOIN students ON students.class=classes.id
			WHERE classes.user=? {$aw}
			GROUP BY id
			ORDER BY year DESC";
		$result = $this->run_query($q, [$_SESSION['user']])->get_result();
		
		$classes = [];
		while ($class = $result->fetch_object()) $classes[] = $class;
		return $classes;
	}

	//Get info on one class. Returns a single row by ID
	function get_class($id) {
		$q = "SELECT * FROM classes WHERE id=? and user=?";
		$pq = $this->run_query($q, [$id, $_SESSION['user']])->get_result();
		return $pq->fetch_object();
	}
	
	function new_class($name, $semester, $year, $activeuntil) {
		$q = "INSERT INTO classes (name, semester, year, activeuntil, user) VALUES (?, ?, ?, ?, ?)";
		$pq = $this->run_query($q, [trim($name), $semester, $year, $activeuntil, $_SESSION['user']]);
		return $pq->insert_id;
	}
	
	function edit_class($class, $key, $val) {
		$keys = ['name', 'semester', 'year', 'activeuntil', 'selector'];
		if (!in_array($key, $keys)) return False;
		
		$q = "UPDATE classes SET {$key}=? WHERE id=? AND user=?";
		$pq = $this->run_query($q, [trim($val), $class, $_SESSION['user']]);
		return $pq->affected_rows;
	}
	
	function delete_class($class) {
		foreach ($this->get_roster($class) as $student) $this->delete_student($student->id);
		$q = "DELETE FROM classes WHERE id=? AND user=?";
		$pq = $this->run_query($q, [$class, $_SESSION['user']]);
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
		$students = $this->run_query($q, [$classid, $_SESSION['user']])->get_result();

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	function new_event($rosterid, $result) {
		$q = "INSERT INTO events (student, `date`, result) VALUES (?, NOW(), ?)";
		$pq = $this->run_query($q, [$rosterid, $result]);
		return $pq->insert_id;
	}
	
	function edit_event($id, $result) {
		$q1="SELECT events.* FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE events.id=? AND students.user=?";
		if ($this->run_query($q1, [$id, $_SESSION['user']])->get_result()->num_rows) {
			$q2 = "UPDATE events SET result=? WHERE id=?";
			$pq2 = $this->run_query($q2, [$result, $id]);
			return $pq2->affected_rows;
		} else return 0;
	}
	
	function delete_event($id) {
		$q1="SELECT events.* FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE events.id=? AND students.user=?";
		if ($this->run_query($q1, [$id, $_SESSION['user']])->get_result()->num_rows) {
			$q2 = "DELETE FROM events WHERE id=?";
			$pq2 = $this->run_query($q2, [$id]);
			return $pq2->affected_rows;
		} else return 0;
	}
	
	function get_events($student) {
		$q = "SELECT events.id, date, result FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE student=? and user=?
			ORDER BY date DESC";
		$events = $this->run_query($q, [$student, $_SESSION['user']])->get_result();

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	function get_events_by_class($class, $limit=false) {
		$q = "SELECT events.id, date, result, student, students.fname, students.lname FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE class=? and user=?
			ORDER BY date DESC";
		if ($limit) $q .= " LIMIT {$limit}";
		$events = $this->run_query($q, [$class, $_SESSION['user']])->get_result();

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}
	
	function add_student($fname, $lname, $class) {
		$q = "INSERT INTO students (fname, lname, class, user) VALUES (?, ?, ?, ?)";
		$pq = $this->run_query($q, [trim($fname), trim($lname), $class, $_SESSION['user']]);
		return $pq->insert_id;
	}
	
	function edit_student($id, $fname, $lname) {
		$q = "UPDATE students SET fname=?, lname=? WHERE id=? AND user=?";
		$pq = $this->run_query($q, [trim($fname), trim($lname), $id, $_SESSION['user']]);
		return $pq->affected_rows;
	}
	
	function delete_student($id) {
		$q1 = "DELETE FROM students WHERE id=? AND user=?";
		$pq = $this->run_query($q1, [$id, $_SESSION['user']]);
		if ($pq->affected_rows) {
			$q2 = "DELETE FROM events WHERE student=?";
			$pq2 = $this->run_query($q2, [$id]);
		}
		return $pq->affected_rows;
	}
	
	function student_excused($id, $excused) {
		$q = "UPDATE students SET excuseduntil=? WHERE id=? AND user=?";
		if (!$excused) $excused = null;
		$pq = $this->run_query($q, [$excused, $id, $_SESSION['user']]);
		return $pq->affected_rows;
	}
	
	function get_user_by($field, $val) {
		$fields = ['username', 'email', 'id', 'orcid'];
		if (!in_array($field, $fields)) return False;
		
		$q = "SELECT * FROM users WHERE {$field}=?";
		$pq = $this->run_query($q, [trim($val)]);
		$user = $pq->get_result()->fetch_object();
		if ($user && $user->options) $user->options = json_decode($user->options);
		return $user;
	}

	//$v=null to delete an option
	function user_add_option($k, $v, $user=null) {
		if (!$user) $user = $_SESSION['user'];
		$q = "SELECT options FROM users WHERE id=?";
		$options = $this->run_query($q, [$user])->get_result()->fetch_object()->options;
		$options = $options ? json_decode($options) : new stdClass();
		if ($v != null) $options->{$k} = $v;
		else unset($options->{$k});
		$q2 = "UPDATE users SET options=? WHERE id=?";
		$pq = $this->run_query($q2, [json_encode($options), $user]);
		return $pq->affected_rows;
	}
	
	function current_user() {
		if (!isset($_SESSION['user'])) return false;
		return $this->get_user_by('id', $_SESSION['user']);
	}
	
	function new_user($username, $email, $password='', $orcid=null) {
		if (!$password && !$orcid) return false;
		$q = "INSERT INTO users (username, email, password, orcid, registered) VALUES (?, ?, ?, ?, NOW())";
		$pq = $this->run_query($q, [$username, $email, $password ? password_hash($password, PASSWORD_DEFAULT) : '', $orcid]);
		return $pq->insert_id;
	}

	function edit_user($key, $val) {
		$keys = ['email', 'orcid'];
		if (!in_array($key, $keys) || !isset($_SESSION['user'])) return False;
		if ($key == 'email' && $this->get_user_by('email', $val)) return "Email already exists";
		
		$q = "UPDATE users SET {$key}=? WHERE id=?";
		$pq = $this->run_query($q, [$val ? trim($val) : $val, $_SESSION['user']]);
		return $pq->affected_rows;
	}

	function edit_pw($old, $new, $userid=null, $reset=false) {
		$user = $userid ? $this->get_user_by('id', $userid) : $this->current_user();
		if (!$reset && $user->password && !password_verify($old, $user->password)) return false;
		if ($old==$new) return 1;
		$q = "UPDATE users SET password=?, pwchanged=NOW() WHERE id=?";
		$pq = $this->run_query($q, [password_hash($new, PASSWORD_DEFAULT), $user->id]);
		if ($pq->affected_rows) $this->user_add_option('pwreset', null, $user->id);
		return $pq->affected_rows;
	}

	function generate_reset_link($userid) {
		$user = $this->get_user_by(str_contains($userid, '@') ? 'email' : 'username', $userid);
		if (!$user) return 0;

		if ($user->password) {
			$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
			$key = '';
			for ($i = 0; $i<16; $i++) $key .= $characters[rand(0, strlen($characters)-1)];
			$this->user_add_option('pwreset', ['key'=>$key, 'expires'=>time()+3600*24], $user->id);
			$link = "https://pick.al?action=pwreset&user={$user->id}&key={$key}";

			$emailtext = "<p>A password reset has been requested for your Pick.al account. If this was not you, delete this email and do nothing.</p>"
				."<p>If this was you, you can click <a href=\"{$link}\">this link</a> to reset your password or paste the following link into your browser.</p>"
				."<p>{$link}</p> <p>This link is valid for 24 hours.</p>";
			if ($user->orcid) $emailtext .= "<p>This account is also linked to an OrcID, so you can log in that way too.</p>";
		} else {
			$emailtext = "<p>A password reset has been requested for your Pick.al account. However, no password is set for this account because it was registered with an OrcID. Please log into Pick.al with your OrcID to set a password, or <a href=\"https://orcid.org/reset-password\">reset your OrcID password</a> and then log in.</p>";
		}

		return send_email($user->username, $user->email, 'Pick.al Mail', 'Your Pick.al password reset request', $emailtext);
	}
}

function send_email($toname, $toaddress, $fromname, $subject, $message) {
	require(get_root_directory().'phpmailer/Exception.php');
	require(get_root_directory().'phpmailer/PHPMailer.php');
	require(get_root_directory().'phpmailer/SMTP.php');

	$mail = new PHPMailer(true);
	try {
		//$mail->SMTPDebug = 2;	//Verbose debug output
		$mail->isSMTP();
		$mail->Host = 'smtp.dreamhost.com';
		$mail->SMTPAuth = true;
		$mail->Username = smtpvars()['username'];
		$mail->Password = smtpvars()['password'];
		$mail->SMTPSecure = 'ssl';
		$mail->Port = 465;

		$mail->setFrom(smtpvars()['username'], $fromname);
		$mail->addAddress($toaddress, $toname);
		$mail->isHTML(true);
		$mail->Subject = $subject;
		$mail->Body = $message;

		$mail->send();
		return 1;
	} catch (Exception $e) { return $mail->ErrorInfo; }
}

function get_root_directory() {
	$dirs = explode('/', getcwd());
	$tripped = false;
	$relative = [];
	foreach ($dirs as $dir) {
		if ($tripped) $relative[] = '..';
		if ($dir=='pick.al') $tripped = true;
	}
	return implode('/', $relative);
}