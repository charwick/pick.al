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
		let pass = true;
		const tab = whichTab();
		e.preventDefault();
		for (const box of document.querySelectorAll('.info')) box.remove(); //Clear errors
		
		//Validate for blank values
		for (const i of inpContainer.querySelectorAll('input')) {
			i.classList.remove('error');
			if (!i.value || (tab=='register' && i.name=='username' && i.value.includes('@'))) {
				i.classList.add('error');
				if (i.value) infoElement('Username cannot contain \'@\'.', 'error');
				pass = false;
			}
		}
		
		//Validate for password match, if applicable
		if (tab=='register') {
			const pw = inpContainer.querySelector('input[name="password"]'),
				pwconfirm = inpContainer.querySelector('input[name="confirm"]');
			if (pw.value != pwconfirm.value) {
				pass = false;
				infoElement('The passwords do not match.', 'error');
				pw.classList.add('error');
				pwconfirm.classList.add('error');
			}
		}
		if (!pass) return;
		
		//Check for existing email and/or username
		const req = new XMLHttpRequest(),
			un = inpContainer.querySelector('input[name="username"]');
		let data = [(un.value.includes('@') ? 'email' : 'username')+'='+un.value]
		if (tab == 'register') data.push('email='+inpContainer.querySelector('input[name="email"]').value);
		req.open('GET', '../ajax.php?req=userexists&'+data.join('&'), true);
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
	});
});

function whichTab() {
	for (const radio of radios) if (radio.checked) return radio.value;
}

//Change inputs on tab
function switchInputs(clearInfo=true) {
	const val = whichTab();
	if (clearInfo) for (const box of document.querySelectorAll('.info')) box.remove();
	
	entries.textContent = '';
	if (val=='login') entries.append(...drawInputs(['uoremail', 'password']));
	else if (val=='register') entries.append(...drawInputs(['username', 'email', 'password', 'confirm']));

	const submit = document.querySelector('input[type="submit"]');
	submit.value = (val=='login' ? 'Log in' : 'Register');
}

function drawInputs(list) {
	const inps = [];
	for (const inp of list) {
		const el = document.createElement('input'),
			li = document.createElement('li');
		el.name = ('name' in inputs[inp] ? inputs[inp].name : inp);
		for (const [attr, val] of Object.entries(inputs[inp])) el[attr] = val;
		li.append(el);
		inps.push(li);
	}
	return inps;
}

function infoElement(message, classname, tag) {
	const info = document.createElement(tag || 'p');
	info.classList.add('info');
	if (classname) info.classList.add(classname);
	info.textContent = message;
	document.getElementById('formbody').prepend(info)
}