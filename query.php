<?php require_once('connect.php'); //Not included in git, but contains the vars to pass to __construct()
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

//Returns the SQL object
class chooser_query extends mysqli {
	public ?int $userid;

	function __construct() {
		parent::__construct(...connectionvars());
		$this->set_charset("utf8mb4");
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

		//Check & set session
		$sessions = new PickalSessions($this);
		session_set_save_handler($sessions);
		session_start();
		if (($_SESSION['ua'] ?? null) != ua()) session_unset();
		$this->userid = $_SESSION['user'] ?? null;
	}
	
	//=========
	// CLASSES
	//=========

	function get_classes(bool $active=false): array {
		$aw = $active ? ' AND activeuntil >= NOW()' : '';

		$q = "SELECT classes.*, COUNT(students.class) AS students
			FROM classes
			LEFT JOIN students ON students.class=classes.id
			WHERE classes.user".($this->userid ? "=?" : " IS NULL")." {$aw}
			GROUP BY id
			ORDER BY year DESC, semester DESC, activeuntil DESC";
		$result = $this->execute_query($q, $this->userid ? [$this->userid] : []);
		
		$classes = [];
		while ($class = $result->fetch_object()) {
			$classes[] = $class;
			$class->active = $active || strtotime($class->activeuntil) + 24*3600 >= time();
		}
		return $classes;
	}

	//Get info on one class. Returns a single row by ID
	function get_class(int $id) {
		$q = "SELECT * FROM classes WHERE id=? and user".($this->userid ? "=?" : " IS NULL");
		$pq = $this->execute_query($q, $this->userid ? [$id, $this->userid] : [$id]);
		$obj = $pq->fetch_object();
		if ($obj) {
			$obj->schema = $this->get_schema($obj->schema);
			$obj->active = strtotime($obj->activeuntil) + 24*3600 >= time();
		}
		return $obj;
	}
	
	function new_class(string $name, string $semester, int $year, string $activeuntil, string $schema): int {
		$q = "INSERT INTO classes (name, semester, year, activeuntil, user, `schema`) VALUES (?, ?, ?, ?, ?, ?)";
		$this->execute_query($q, [sanitize($name), $semester, $year, $activeuntil, $this->userid, $schema]);
		return $this->insert_id;
	}
	
	function edit_class(int $class, ?string $name=null, ?string $semester=null, ?int $year=null, ?string $activeuntil=null, ?int $schema=null): int {
		$params = []; $cols = [];
		if ($name) { $params[] = sanitize($name); $cols[] = '`name`=?'; }
		if ($semester) { $params[] = $semester; $cols[] = '`semester`=?'; }
		if ($year) { $params[] = $year; $cols[] = '`year`=?'; }
		if ($activeuntil) { $params[] = $activeuntil; $cols[] = '`activeuntil`=?'; }
		if ($schema) { $params[] = $schema; $cols[] = '`schema`=?'; }

		$params = array_merge($params, [$class, $this->userid]);
		$cols = implode(', ', $cols);
		$q = "UPDATE classes SET {$cols} WHERE id=? AND user=?";
		$this->execute_query($q, $params);
		return $this->affected_rows;
	}

	//Students cascade delete in SQL
	function delete_class(int $class): int {
		$q = "DELETE FROM classes WHERE id=? AND user=?";
		$this->execute_query($q, [$class, $this->userid]);
		return $this->affected_rows;
	}

	function get_questions(int $class, bool $onlyactive=false, string $sort='DESC'): array {
		$u = $this->current_user();
		$oaclause = $u ? '=?' : 'IS NULL';
		if ($onlyactive) $oaclause .= ' AND active=1';
		
		$q="SELECT questions.*, COUNT(events.id) AS events FROM questions
			LEFT JOIN classes ON questions.class=classes.id
			LEFT JOIN events ON events.question=questions.id
			WHERE class=? AND user {$oaclause}
			GROUP BY questions.id
			ORDER BY active {$sort}, `date` {$sort}";
		$qs = $this->execute_query($q, $u ? [$class, $this->userid] : [$class]);
		$questions = [];
		while ($question = $qs->fetch_object()) $questions[] = $question;
		return $questions;
	}

	function new_question(int $class, string $text): int {
		if (!$this->get_class($class)) return false;
		$q="INSERT INTO questions (`class`, `text`) VALUES (?, ?)";
		$this->execute_query($q, [$class, $text]);
		return $this->insert_id;
	}

	function edit_question(int $id, string $text): int {
		$q="UPDATE questions
			LEFT JOIN classes ON questions.class=classes.id
			SET `text`=? WHERE questions.id=? AND classes.user=?";
		$this->execute_query($q, [$text, $id, $this->userid]);
		return $this->affected_rows;
	}

	function archive_question(int $id, bool $active): int {
		$q="UPDATE questions
			LEFT JOIN classes ON questions.class=classes.id
			SET `active`=? WHERE questions.id=? AND classes.user=?";
		
		//Have to do it the verbose way because execute_query coerces everything into a string, which makes it impossible to update a BIT(1) field
		$stmt = $this->prepare($q);
		$stmt->bind_param('iii', $active, $id, $this->userid);
		$stmt->execute();
		return $stmt->affected_rows;
	}

	function delete_question(int $id): int {
		$q="DELETE questions FROM questions
			LEFT JOIN classes ON classes.id=questions.class
			WHERE questions.id=? AND classes.user=?";
		$this->execute_query($q, [$id, $this->userid]);
		return $this->affected_rows;
	}

	//==========
	// STUDENTS
	//==========

	//Get the roster for a class. Returns an array of objects
	function get_roster(int $classid): array {
		$u = $this->current_user();
		//$wand = $all ? '' : " AND (excuseduntil IS NULL OR NOW() > DATE_ADD(excuseduntil, INTERVAL 1 DAY))";
		$q="SELECT students.*, SUM(events.result) AS score, COUNT(events.student) AS denominator
			FROM students
			LEFT JOIN events ON events.student=students.id
			LEFT JOIN classes ON classes.id=students.class
			WHERE class=? AND classes.user".($u ? "=?" : " IS NULL")."
			GROUP BY students.id
			ORDER BY students.lname";
		$students = $this->execute_query($q, $u ? [$classid, $this->userid] : [$classid]);

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	function add_student(int $class, string $fname, string $lname, ?string $note=null): int {
		if ($this->get_class($class)->user != $this->userid) return 0;

		$q = "INSERT INTO students (fname, lname, note, class) VALUES (?, ?, ?, ?)";
		$this->execute_query($q, [sanitize($fname), sanitize($lname), sanitize($note), $class]);
		return $this->insert_id;
	}
	
	function edit_student(int $id, string $fname, string $lname, ?string $note=null): int {
		$q="UPDATE students
			LEFT JOIN classes ON classes.id=students.class
			SET fname=?, lname=?, note=?
			WHERE students.id=? AND classes.user=?";
		$this->execute_query($q, [sanitize($fname), sanitize($lname), sanitize($note), $id, $this->userid]);
		return $this->affected_rows;
	}
	
	//Events cascade delete in SQL
	function delete_student(int $id): int {
		$q1="DELETE students FROM students
			LEFT JOIN classes ON classes.id=students.class
			WHERE students.id=? AND classes.user=?";
		$this->execute_query($q1, [$id, $this->userid]);
		return $this->affected_rows;
	}
	
	function student_excused(int $id, ?string $excused): int {
		$q="UPDATE students
			LEFT JOIN classes ON classes.id=students.class
			SET excuseduntil=? WHERE students.id=? AND classes.user=?";
		$this->execute_query($q, [$excused, $id, $this->userid]);
		return $this->affected_rows;
	}

	function student_search(string $search) {
		$phrases = explode(' ', $search);
		$conds = [];
		foreach ($phrases as &$phrase) {
			$phrase = "%{$phrase}%";
			$conds[] = 'haystack LIKE LOWER(?)';
		}
		$conds = implode(' AND ', $conds);

		$q="SELECT students.*, name, semester, year, activeuntil, classes.id AS classid, LOWER(CONCAT(fname,' ',lname,' ',COALESCE(note,''),' ',classes.name)) AS haystack
			FROM students
			LEFT JOIN classes ON classes.id=students.class
			WHERE user=? HAVING {$conds}
			ORDER BY year DESC, semester DESC, lname ASC
			LIMIT 10";
		$students = $this->execute_query($q, array_merge([$this->userid], $phrases));

		$result = [];
		while ($student = $students->fetch_object()) $result[] = $student;
		return $result;
	}

	//========
	// EVENTS
	//========

	function new_event(int $rosterid, $result, ?int $question=null): int {
		$q1 = $this->execute_query("SELECT user FROM students LEFT JOIN classes ON students.class=classes.id WHERE students.id=?", [$rosterid]);
		if ($q1->fetch_object()->user != $this->userid) return -1;

		if ($question) {
			$q = "INSERT INTO events (student, `date`, result, question) VALUES (?, NOW(), ?, ?)";
			$this->execute_query($q, [$rosterid, $result, $question]);
		} else {
			$q = "INSERT INTO events (student, `date`, result) VALUES (?, NOW(), ?)";
			$this->execute_query($q, [$rosterid, $result]);
		}
		return $this->insert_id;
	}
	
	function edit_event(int $id, $result, ?int $question=null): int {
		if ($question===0) $qclause = ', question=NULL';
		elseif ($question===null) $qclause = '';
		else $qclause = ', question=?';

		$q="UPDATE events
			LEFT JOIN students ON students.id=events.student
			LEFT JOIN classes ON classes.id=students.class
			SET result=? {$qclause}
			WHERE events.id=? AND classes.user=?";
		$params = $question ? [$result, $question, $id, $this->userid] : [$result, $id, $this->userid];
		$this->execute_query($q, $params);
		return $this->affected_rows;
	}
	
	function delete_event(int $id): int {
		$q="DELETE events FROM events
			LEFT JOIN students ON students.id=events.student
			LEFT JOIN classes ON classes.id=students.class
			WHERE events.id=? AND classes.user=?";
		$this->execute_query($q, [$id, $this->userid]);
		return $this->affected_rows;
	}
	
	function get_events(int $student): array {
		$q="SELECT events.* FROM events
			LEFT JOIN students ON students.id=events.student
			LEFT JOIN classes ON classes.id=students.class
			WHERE student=? and classes.user=?
			ORDER BY date DESC";
		$events = $this->execute_query($q, [$student, $this->userid]);

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	function get_events_by_class(int $class, int $limit=0): array {
		$q="SELECT events.id, date, result, student, students.fname, students.lname, question FROM events
			LEFT JOIN students ON students.id=events.student
			LEFT JOIN classes ON classes.id=students.class
			WHERE class=? and classes.user=?
			ORDER BY date DESC";
		if ($limit) $q .= " LIMIT {$limit}";
		$events = $this->execute_query($q, [$class, $this->userid]);

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	function get_events_by_question(int $question): array {
		$q="SELECT events.id, events.date, result, student, students.fname, students.lname FROM events
			LEFT JOIN questions ON questions.id=events.question
			LEFT JOIN students ON students.id=events.student
			LEFT JOIN classes ON classes.id=questions.class AND classes.id=students.class
			WHERE question=? and classes.user=?
			ORDER BY date DESC";
		$events = $this->execute_query($q, [$question, $this->userid]);

		$result = [];
		while ($event = $events->fetch_object()) $result[] = $event;
		return $result;
	}

	//=========
	// SCHEMAE
	//=========

	function get_schema(int $id): ?Schema {
		$q="SELECT schemae.*, schemaitems.id AS itemid, `color`, `text`, `value` FROM schemae
			LEFT JOIN schemaitems ON schemaitems.schema=schemae.id
			WHERE schemae.id=? AND (user=? OR user IS NULL)
			ORDER BY value DESC";
		$pq = $this->execute_query($q, [$id, $this->userid ?? null]);
		$result = [];
		while ($item = $pq->fetch_object()) $result[] = $item;
		return $result ? new Schema($result) : null;
	}

	function get_available_schemae(): array {
		$q="SELECT schemae.*, schemaitems.id AS itemid, `color`, `text`, `value` FROM schemae
			LEFT JOIN schemaitems ON schemaitems.schema=schemae.id
			WHERE user IS NULL OR user=?
			ORDER BY user DESC, schemae.id, value DESC";
		$schemae = $this->execute_query($q, [$this->userid]);
		$result = []; $return = [];
		while ($item = $schemae->fetch_object()) $result[$item->id][] = $item; //Organize by schema
		foreach ($result as $schema) $return[] = new Schema($schema);
		return $return;
	}

	function new_schema(string $name): int {
		$q='INSERT INTO schemae (`user`, `name`) VALUES (?,?)';
		$this->execute_query($q, [$this->userid, $name]);
		return $this->insert_id;
	}

	function edit_schema(int $id, string $name): int {
		$q="UPDATE schemae SET `name`=? WHERE id=? AND user=?";
		$this->execute_query($q, [$name, $id, $this->userid]);
		return $this->affected_rows;
	}

	function delete_schema(int $id, ?int $replace=null): int {
		if ($replace) {
			$q="UPDATE classes SET `schema`=? WHERE `schema`=? AND `user`=?";
			$this->execute_query($q, [$replace, $id, $this->userid]);
		}
		$q="DELETE schemae FROM schemae
			LEFT JOIN classes ON classes.schema=schemae.id
			WHERE schemae.id=? AND schemae.user=? AND classes.id IS NULL"; //Don't delete if there are any classes using it
		$this->execute_query($q, [$id, $this->userid]);
		return $this->affected_rows;
	}

	function classes_by_schema(int $id): array {
		$q="SELECT * FROM classes WHERE `schema`=? AND `user`=? ORDER BY year, semester DESC";
		$classes = $this->execute_query($q, [$id, $this->userid]);
		$result = [];
		while ($class = $classes->fetch_object()) {
			$q="SELECT DISTINCT result
				FROM students
				RIGHT JOIN events ON events.student=students.id
				WHERE class=?";
			$vals = $this->execute_query($q, [$class->id]);
			$class->values = [];
			while ($val = $vals->fetch_object()) $class->values[] = $val->result;
			$result[] = $class;
		}
		return $result;
	}

	function edit_schema_item(int $id, string $color, string $text, $value=null): int {
		$q="SELECT user FROM schemaitems LEFT JOIN schemae ON schemaitems.schema=schemae.id WHERE schemaitems.id=?";
		if ($this->execute_query($q, [$id])->fetch_object()->user != $this->userid) return -1;

		$vq = $value!==null ? ', `value`=?' : '';
		$q="UPDATE schemaitems SET `color`=?, `text`=? {$vq} WHERE id=?";
		$this->execute_query($q, $value!==null ? [$color, $text, $value, $id] : [$color, $text, $id]);
		return $this->affected_rows;
	}

	function new_schema_item(int $schema, string $color, string $text, $value): int {
		$q="SELECT user FROM schemae WHERE id=?";
		if ($this->execute_query($q, [$schema])->fetch_object()->user != $this->userid) return -1;
		$q="SELECT COUNT(`schema`) AS count FROM schemaitems WHERE `schema`=?";
		if ($this->execute_query($q, [$schema])->fetch_object()->count >= 5) return -2;

		$q="INSERT INTO schemaitems (`schema`, `color`, `text`, `value`) VALUES (?,?,?,?)";
		$this->execute_query($q, [$schema, $color, $text, $value]);
		return $this->insert_id;
	}

	function delete_schema_item(int $id): int {
		//Only delete schema items that are (1) unused and (2) from the user's own schemae
		$q="DELETE schemaitems FROM schemaitems
			LEFT JOIN schemae ON schemaitems.schema=schemae.id
			LEFT JOIN classes ON classes.schema=schemae.id
			LEFT JOIN students ON students.class=classes.id
			LEFT JOIN events ON events.student=students.id AND events.result=schemaitems.value
			WHERE schemaitems.id=? AND schemae.user=? AND events.id IS NULL";
		$this->execute_query($q, [$id, $this->userid]);
		return $this->affected_rows;
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
		static $user = false;
		if ($user) return $user;
		if (!$this->userid) return false;

		$user = $this->get_user_by('id', $this->userid);
		return $user;
	}

	//$v=null to delete an option
	function user_add_option(string $k, $v, ?int $user=null): int {
		if (!$user) $user = $this->userid;
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
		if (!in_array($key, $keys) || !$this->userid) return False;
		if ($key == 'email' && $this->get_user_by('email', $val)) return "Email already exists";
		
		$q = "UPDATE users SET {$key}=? WHERE id=?";
		$this->execute_query($q, [$val ? sanitize($val) : $val, $this->userid]);
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

	//Students, classes, and events deleted by SQL cascade
	function delete_user(): int {
		$this->execute_query('DELETE FROM users WHERE id=?', [$this->userid]);
		return $this->affected_rows;
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

//==========
// SESSIONS
//==========

class PickalSessions implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface {
	private mysqli $sql;

	function __construct(mysqli $sql) { $this->sql = $sql; }

	function open($save_path, $session_name): bool { return true; }
	function close(): bool { return true; }

	#[\ReturnTypeWillChange]
	function read($id) {
		$result = $this->sql->execute_query("SELECT data FROM sessions WHERE id = ?", [$id]);
		return ($row = $result->fetch_assoc()) ? $row['data'] : '';
	}

	function write($id, $data): bool {
		return $this->sql->execute_query("REPLACE INTO sessions (id, data) VALUES (?, ?)", [$id, $data]);
	}

	function destroy($id): bool {
		return $this->sql->execute_query("DELETE FROM sessions WHERE id = ?", [$id]);
	}

	#[\ReturnTypeWillChange]
	function gc($maxlifetime) {
		//Ignore maxlifetime
		return $this->sql->execute_query("DELETE FROM sessions WHERE `data`='' OR last_access < NOW() - INTERVAL 72 HOUR");
	}

	public function validateId(string $id): bool {
		return (bool) $this->sql->execute_query("SELECT 1 FROM sessions WHERE id = ? LIMIT 1", [$id])->fetch_row();
	}

	public function updateTimestamp(string $id, string $data): bool {
		return $this->sql->execute_query("UPDATE sessions SET last_access = NOW() WHERE id = ?", [$id]);
	}
}

class Schema {
	public int $id;
	public string $name;
	public array $items = [];
	public bool $global;
	public array $limits;
	public static array $icons = [
		'✓' => 'check-lg',
		'×' => 'x-lg',
		'^' => 'chevron-up'
	];

	function __construct($data) {
		$this->id = $data[0]->id;
		$this->name = $data[0]->name;
		$this->global = $data[0]->user==null;
		$this->limits = [null, null];
		foreach ($data as $key => $item) if ($item->text) {
			$this->items[] = [
				'id' => $item->itemid,
				'color' => $item->color,
				'hovercolor' => adjustBrightness($item->color, -0.15),
				'text' => $item->text,
				'value' => $item->value
			];
			if ($this->limits[0]===null || $item->value < $this->limits[0]) $this->limits[0] = $item->value;
			if ($this->limits[1]===null || $item->value > $this->limits[1]) $this->limits[1] = $item->value;
		}
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
			$css .= "[data-schemaval=\"{$item['value']}\"] { {$this->output_item_css($id)} }\r\n";
			$css .= "[data-schemaval=\"{$item['value']}\"]::after { content: '{$item['text']}' }\r\n";
			if ($hover) $css .= "[data-schemaval=\"{$item['value']}\"]:hover { background-color: #{$item['hovercolor']}; }\r\n";
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

function sanitize(?string $string): ?string {
	if ($string===null) return null;
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

function ua(): string {
	$ua = $_SERVER['HTTP_USER_AGENT'];
	if (stripos($ua, 'Firefox') !== false) return 'Firefox';
	if (stripos($ua, 'Chrome') !== false && stripos($ua, 'Edg') === false) return 'Chrome';
	if (stripos($ua, 'Safari') !== false && stripos($ua, 'Chrome') === false) return 'Safari';
	if (stripos($ua, 'Edg') !== false) return 'Edge';
	return 'Other';
}