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
	
	//=========
	// CLASSES
	//=========

	function get_classes(bool $active=false): array {
		$aw = $active ? ' AND activeuntil >= NOW()' : '';
		
		$q = "SELECT classes.*, COUNT(students.class) AS students
			FROM classes
			LEFT JOIN students ON students.class=classes.id
			WHERE classes.user=? {$aw}
			GROUP BY id
			ORDER BY year DESC";
		$result = $this->execute_query($q, [$_SESSION['user']]);
		
		$classes = [];
		while ($class = $result->fetch_object()) $classes[] = $class;
		return $classes;
	}

	//Get info on one class. Returns a single row by ID
	function get_class(int $id) {
		$q = "SELECT * FROM classes WHERE id=? and user=?";
		$pq = $this->execute_query($q, [$id, $_SESSION['user']]);
		$obj = $pq->fetch_object();
		$obj->schema = $this->get_schema($obj->schema);
		return $obj;
	}
	
	function new_class(string $name, string $semester, int $year, string $activeuntil, string $schema): int {
		$q = "INSERT INTO classes (name, semester, year, activeuntil, user, `schema`) VALUES (?, ?, ?, ?, ?, ?)";
		$this->execute_query($q, [sanitize($name), $semester, $year, $activeuntil, $_SESSION['user'], $schema]);
		return $this->insert_id;
	}
	
	function edit_class(int $class, string $key, $val): int {
		$keys = ['name', 'semester', 'year', 'activeuntil', 'schema'];
		if (!in_array($key, $keys)) return False;
		
		$q = "UPDATE classes SET `{$key}`=? WHERE id=? AND user=?";
		$this->execute_query($q, [sanitize($val), $class, $_SESSION['user']]);
		return $this->affected_rows;
	}
	
	function delete_class(int $class): int {
		foreach ($this->get_roster($class) as $student) $this->delete_student($student->id);
		$q = "DELETE FROM classes WHERE id=? AND user=?";
		$this->execute_query($q, [$class, $_SESSION['user']]);
		return $this->affected_rows;
	}

	function get_schema(string $name): Schema {
		$q="SELECT * FROM schemae WHERE `schema`=? AND (user=? OR user=0) ORDER BY value DESC";
		$pq = $this->execute_query($q, [$name, $_SESSION['user']]);
		$result = [];
		while ($item = $pq->fetch_object()) $result[] = $item;
		return new Schema($result);
	}

	function get_available_schemae(): array {
		$q = "SELECT * FROM schemae WHERE user=0 OR user=?";
		$schemae = $this->execute_query($q, [$_SESSION['user']]);
		$result = []; $return = [];
		while ($item = $schemae->fetch_object()) $result[$item->schema][] = $item;
		foreach ($result as $schema) $return[] = new Schema($schema);
		return $return;
	}

	//==========
	// STUDENTS
	//==========

	//Get the roster for a class. Returns an array of objects
	//Doesn't return excused students by default
	function get_roster(int $classid, bool $all=false): array {
		$wand = $all ? '' : " AND (excuseduntil IS NULL OR NOW() > DATE_ADD(excuseduntil, INTERVAL 1 DAY))";
		$q="SELECT students.*, SUM(events.result) AS score, COUNT(events.student) AS denominator
			FROM students
			LEFT JOIN events ON events.student=students.id
			WHERE class=? AND user=? $wand
			GROUP BY students.id
			ORDER BY students.lname";
		$students = $this->execute_query($q, [$classid, $_SESSION['user']]);

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	function add_student(int $class, string $fname, string $lname, ?string $note=null): int {
		$q = "INSERT INTO students (fname, lname, note, class, user) VALUES (?, ?, ?, ?, ?)";
		$this->execute_query($q, [sanitize($fname), sanitize($lname), sanitize($note), $class, $_SESSION['user']]);
		return $this->insert_id;
	}
	
	function edit_student(int $id, string $fname, string $lname, ?string $note=null): int {
		$q = "UPDATE students SET fname=?, lname=?, note=? WHERE id=? AND user=?";
		$this->execute_query($q, [sanitize($fname), sanitize($lname), sanitize($note), $id, $_SESSION['user']]);
		return $this->affected_rows;
	}
	
	function delete_student(int $id): int {
		$q1 = "DELETE FROM students WHERE id=? AND user=?";
		$this->execute_query($q1, [$id, $_SESSION['user']]);
		$affect = $this->affected_rows;
		if ($affect) {
			$q2 = "DELETE FROM events WHERE student=?";
			$this->execute_query($q2, [$id]);
		}
		return $affect;
	}
	
	function student_excused(int $id, ?string $excused): int {
		$q = "UPDATE students SET excuseduntil=? WHERE id=? AND user=?";
		$this->execute_query($q, [$excused, $id, $_SESSION['user']]);
		return $this->affected_rows;
	}

	//========
	// EVENTS
	//========

	function new_event(int $rosterid, $result): int {
		$q = "INSERT INTO events (student, `date`, result) VALUES (?, NOW(), ?)";
		$this->execute_query($q, [$rosterid, $result]);
		return $this->insert_id;
	}
	
	function edit_event(int $id, $result): int {
		$q1="SELECT events.* FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE events.id=? AND students.user=?";
		if ($this->execute_query($q1, [$id, $_SESSION['user']])->num_rows) {
			$q2 = "UPDATE events SET result=? WHERE id=?";
			$this->execute_query($q2, [$result, $id]);
			return $this->affected_rows;
		} else return 0;
	}
	
	function delete_event(int $id): int {
		$q1="SELECT events.* FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE events.id=? AND students.user=?";
		if ($this->execute_query($q1, [$id, $_SESSION['user']])->num_rows) {
			$q2 = "DELETE FROM events WHERE id=?";
			$this->execute_query($q2, [$id]);
			return $this->affected_rows;
		} else return 0;
	}
	
	function get_events(int $student): array {
		$q = "SELECT events.id, date, result FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE student=? and user=?
			ORDER BY date DESC";
		$events = $this->execute_query($q, [$student, $_SESSION['user']]);

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	function get_events_by_class(int $class, int $limit=0): array {
		$q = "SELECT events.id, date, result, student, students.fname, students.lname FROM events
			LEFT JOIN students ON students.id=events.student
			WHERE class=? and user=?
			ORDER BY date DESC";
		if ($limit) $q .= " LIMIT {$limit}";
		$events = $this->execute_query($q, [$class, $_SESSION['user']]);

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	//=======
	// USERS
	//=======
	
	function get_user_by(string $field, $val) {
		$fields = ['username', 'email', 'id', 'orcid'];
		if (!in_array($field, $fields)) return False;
		
		$q = "SELECT * FROM users WHERE {$field}=?";
		$user = $this->execute_query($q, [trim($val)])->fetch_object();
		if ($user && $user->options) $user->options = json_decode($user->options);
		return $user;
	}

	function current_user() {
		if (!isset($_SESSION['user'])) return false;
		return $this->get_user_by('id', $_SESSION['user']);
	}

	//$v=null to delete an option
	function user_add_option(string $k, $v, int $user=null): int {
		if (!$user) $user = $_SESSION['user'];
		$q = "SELECT options FROM users WHERE id=?";
		$options = $this->execute_query($q, [$user])->fetch_object()->options;
		$options = $options ? json_decode($options) : new stdClass();
		if ($v != null) $options->{$k} = $v;
		else unset($options->{$k});
		$q2 = "UPDATE users SET options=? WHERE id=?";
		$this->execute_query($q2, [json_encode($options), $user]);
		return $this->affected_rows;
	}
	
	function new_user(string $username, string $email, string $password='', ?string $orcid=null): int {
		if (!$password && !$orcid) return false;
		$q = "INSERT INTO users (username, email, password, orcid, registered) VALUES (?, ?, ?, ?, NOW())";
		$this->execute_query($q, [sanitize($username), sanitize($email), $password ? password_hash($password, PASSWORD_DEFAULT) : '', $orcid]);
		return $this->insert_id;
	}

	function edit_user(string $key, ?string $val): int {
		$keys = ['email', 'orcid'];
		if (!in_array($key, $keys) || !isset($_SESSION['user'])) return False;
		if ($key == 'email' && $this->get_user_by('email', $val)) return "Email already exists";
		
		$q = "UPDATE users SET {$key}=? WHERE id=?";
		$this->execute_query($q, [$val ? sanitize($val) : $val, $_SESSION['user']]);
		return $this->affected_rows;
	}

	function edit_pw(string $old, string $new, ?int $userid=null, bool $reset=false): int {
		$user = $userid ? $this->get_user_by('id', $userid) : $this->current_user();
		if (
			(!$reset && $user->password && !password_verify($old, $user->password))
			|| strlen($new) < 5
			|| str_contains(strtolower($new), strtolower(trim($user->username)))
		) return false;
		if ($old==$new) return 1;
		$q = "UPDATE users SET password=?, pwchanged=NOW() WHERE id=?";
		$this->execute_query($q, [password_hash($new, PASSWORD_DEFAULT), $user->id]);
		$affect = $this->affected_rows;
		if ($affect) $this->user_add_option('pwreset', null, $user->id);
		return $affect;
	}

	function generate_reset_link(int $userid) {
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

class Schema {
	public string $name;
	public array $items = [];
	public bool $global;
	public static array $icons = [
		'✓' => 'check-lg',
		'×' => 'x-lg'
	];

	function __construct($data) {
		$this->name = $data[0]->schema;
		$this->global = $data[0]->user==0;
		foreach ($data as $key => $item) $this->items[$item->id] = [
			'color' => $item->color,
			'hovercolor' => adjustBrightness($item->color, -0.15),
			'text' => $item->text,
			'value' => $item->value
		];
	}

	function output_item_css($id) {
		$item = $this->items[$id];
		$css = ["background-color: #{$item['color']}"];
		if (isset(self::$icons[$item['text']]))
			$css = [...$css, ...["text-indent: -9999px", "background-image: url(\"/icon/svg.php?icon=".self::$icons[$item['text']]."&color=FFF\")"]];
		return implode('; ', $css);
	}

	function output_css(bool $standalone=true, bool $hover=true): string {
		$css = '';
		$textindent = 'text-indent: -9999px;';
		foreach ($this->items as $id => $item) {
			$css .= "[data-schema=\"{$id}\"] { {$this->output_item_css($id)} }\r\n";
			if ($hover) $css .= "[data-schema=\"{$id}\"]:hover { background-color: #{$item['hovercolor']}; }\r\n";
		}
		return $standalone ? "<style type='text/css' class='schema-css'>{$css}</style>" : $css;
	}

	function output_js(bool $standalone=true): string {
		$js = json_encode($this->items);
		return $standalone ? "var schema = {$js};" : $js;
	}

	function output_buttons(bool $inline_css=false): string {
		$html = '';
		foreach ($this->items as $id => $item) {
			$html .= "<span class='result-button'";
			if ($inline_css) $html .= " style='{$this->output_item_css($id)}'";
			$html .= ">{$item['text']}</span>";
		}
		return $html;
	}

	function contains_values(array $values): bool {
		//Invert $schema
		$schema_items = [];
		foreach ($this->items as $item) $schema_items[] = $item['value'];

		$pass = true;
		foreach ($values as $value)
			if (!in_array($value, $schema_items)) {
				$pass = false;
				break;
			}
		return $pass;
	}
}

//==================
// HELPER FUNCTIONS
//==================

function sanitize(string $string): string {
	return trim(htmlspecialchars($string));
}

//https://stackoverflow.com/questions/3512311/how-to-generate-lighter-darker-color-with-php
function adjustBrightness(string $hexCode, $adjustPercent): string {
    if (strlen($hexCode) == 3) $hexCode = $hexCode[0] . $hexCode[0] . $hexCode[1] . $hexCode[1] . $hexCode[2] . $hexCode[2];
    $hexCode = array_map('hexdec', str_split($hexCode, 2));

    foreach ($hexCode as &$color) {
        $adjustableLimit = $adjustPercent < 0 ? $color : 255 - $color;
        $adjustAmount = ceil($adjustableLimit * $adjustPercent);
        $color = str_pad(dechex($color + $adjustAmount), 2, '0', STR_PAD_LEFT);
    }
    return implode($hexCode);
}

function send_email(?string $toname, string $toaddress, ?string $fromname, string $subject, string $message) {
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

function get_root_directory(): string  {
	$dirs = explode('/', getcwd());
	$tripped = false;
	$relative = [];
	foreach ($dirs as $dir) {
		if ($tripped) $relative[] = '..';
		if ($dir=='pick.al') $tripped = true;
	}
	return implode('/', $relative);
}