'use strict';
var inputs = {
	username: {type: 'text', placeholder: 'Username'},
	password: {type: 'password', placeholder: 'Password'},
	confirm: {type: 'password', placeholder: 'Confirm Password'},
	uoremail: {name: 'username', type: 'text', placeholder: 'Username or Email'},
	email: {type: 'email', placeholder: 'Email Address'},
}, radios, inpContainer;

document.addEventListener('DOMContentLoaded', () => {
	radios = document.querySelectorAll('input[name="action"]');
	inpContainer = document.getElementById('entries');
	
	for (const radio of radios) radio.addEventListener('change', switchInputs);
	switchInputs(false);
	
	document.querySelector('form').addEventListener('submit', function(e) {
		if (document.body.classList.contains('resetpw')) return;
		let pass = true;
		const tab = whichTab();
		e.preventDefault();
		for (const box of document.querySelectorAll('.info')) box.remove(); //Clear errors
		
		for (const i of inpContainer.querySelectorAll('input')) {
			i.classList.remove('error');
			if (tab=='register' && i.name=='username' && i.value.includes('@')) {
				i.classList.add('error');
				infoElement('Username cannot contain \'@\'.', 'error');
				pass = false;
			}
		}
		
		//Validate password, if applicable
		if (tab=='register' || document.body.classList.contains('choosepw')) {
			const uname = inpContainer.querySelector('input[name="username"]'),
				pw = inpContainer.querySelector('input[name="password"]'),
				pwconfirm = inpContainer.querySelector('input[name="confirm"]');
			if (pw.value != pwconfirm.value) {
				pass = false;
				infoElement('The passwords do not match.', 'error');
				pw.classList.add('error');
				pwconfirm.classList.add('error');
			} else if (pw.value.length < 5) {
				pass = false;
				infoElement('Password must be at least 5 characters.', 'error');
				pw.classList.add('error');
			} else if (pw.value.toLowerCase().includes(uname.value.toLowerCase())) {
				pass = false;
				infoElement('Password cannot contain the username.', 'error');
				pw.classList.add('error');
			}
		}
		if (!pass) return;
		
		//Check for existing email and/or username
		if (document.body.classList.contains('choosepw')) document.querySelector('form').submit();
		else {
			const req = new XMLHttpRequest(),
				un = inpContainer.querySelector('input[name="username"]');
			let data = [(un.value.includes('@') ? 'email' : 'username')+'='+un.value]
			if (tab == 'register') data.push('email='+inpContainer.querySelector('input[name="email"]').value);
			req.open('GET', 'ajax.php?req=userexists&'+data.join('&'), true);
			req.onload = function() {
				const result = JSON.parse(this.response);
				let pass = true;
				
				if (tab=='register') {
					for (const [inp, matches] of Object.entries(result)) if (matches) {
						pass = false;
						const input = inpContainer.querySelector('input[name="'+inp+'"]');
						input.classList.add('error');
						infoElement('The '+inp+' \''+input.value+'\' is already taken. Please choose another.', 'error');
					}
				
				} else if (tab=='login') {
					if (!Object.entries(result)[0][1]) {
						pass = false;
						infoElement('The '+Object.entries(result)[0][0]+' \''+un.value+'\' does not exist.', 'error');
					}
				}
				
				if (pass) document.querySelector('form').submit();
			};
			req.onerror = () => { for (const inp of inpContainer.querySelectorAll('input')) inp.classList.add('error'); };
			req.send();
		}
	});

	let rpwform = document.querySelector('.resetpw form');
	if (rpwform) {
		rpwform.submitted = false;
		rpwform.addEventListener('submit', function(e) {
			e.preventDefault();
			if (rpwform.submitted) return; //Don't allow to hit more than once
			rpwform.submitted = true;
			const req = new XMLHttpRequest();
			req.open('GET', 'ajax.php?req=resetpwlink&username='+rpwform.querySelector('input[name="username"]').value, true);
			req.onload = function() {
				if (this.status != 200) {
					req.onerror();
					return;
				}
				infoElement('Check your email for the reset link. It will be valid for 24 hours.');
			};
			req.onerror = () => { infoElement('There was an error sending the reset email. Please try again later.', 'error'); };
			req.send();
		});
	}
});

function whichTab() {
	for (const radio of radios) if (radio.checked) return radio.value;
}

//Change inputs on tab
function switchInputs(clearInfo=true) {
	const val = whichTab(),
		inpContainer = document.getElementById('entries');
	if (!val) return;
	if (clearInfo) for (const box of document.querySelectorAll('.info')) box.remove();
	
	if (val=='login') {
		drawInputs(inpContainer, ['uoremail', 'password']);
		document.getElementById('resetlink').style.display = 'inline';
	} else if (val=='register') {
		drawInputs(inpContainer, ['username', 'email', 'password', 'confirm']);
		document.getElementById('resetlink').style.display = 'none';
	}

	document.querySelector('input[type="submit"]').value = (val=='login' ? 'Log in' : 'Register');
}

function drawInputs(container, list) {
	const inps = [];
	for (const inp of list) {
		const inpname = ('name' in inputs[inp] ? inputs[inp].name : inp);
		let el = container.querySelector('input[name="'+inpname+'"]'), li;
		
		if (el) li = el.parentNode;
		else {
			el = document.createElement('input');
			li = document.createElement('li');
			el.name = inpname;
			el.required = true;
			li.append(el);
		}
		for (const [attr, val] of Object.entries(inputs[inp])) el[attr] = val;
		inps.push(li);
	}
	container.textContent = '';
	container.append(...inps);
}

function infoElement(message, classname, tag) {
	const info = document.createElement(tag || 'p');
	info.classList.add('info');
	if (classname) info.classList.add(classname);
	info.textContent = message;
	document.getElementById('formbody').prepend(info)
}