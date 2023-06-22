<?php require_once('connect.php');

class orcid_api {
	public $client_id;
	public $secret;
	public $auth_url;
	public $token_url = "https://orcid.org/oauth/token";

	function __construct() {
		foreach (orcidvars() as $key => $var) $this->{$key} = $var;
		$this->auth_url = "https://orcid.org/oauth/authorize?client_id=".$this->client_id."&response_type=code&scope=/authenticate&show_login=true";
	}

	function auth_url($redirect) { return "{$this->auth_url}&redirect_uri={$redirect}"; }

	function get_auth_token($code) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $this->token_url);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['code' => $code, 'client_id' => $this->client_id, 'client_secret' => $this->secret, 'grant_type' => 'authorization_code']));
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$response = curl_exec($ch);
		curl_close($ch);
		return $response ? json_decode($response) : $response;
	}
}