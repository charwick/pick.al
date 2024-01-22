"use strict";
document.addEventListener('DOMContentLoaded', () => {
	function fieldData(inputs) { return ['req=edituser', 'k='+inputs[0].name, 'v='+inputs[0].value] }
	makeEditable(document.getElementById('email'), {type: 'email', placeholder: 'Email Address', request: 'edituser', data: fieldData});

	const password = document.querySelector('#password');

	function inlineError(element, message) {
		let error = dce('span', 'inlineError');
		error.textContent = message;
		element.append(error);
	}

	function pwerror(response, inputs) {
		inputs[0].classList.add('error');
		inlineError(inputs[0].parentNode.parentNode, 'Current password is incorrect.');
	}
	function pwafter(response) {
		let i=0;
		for (const span of password.querySelectorAll('.field')) {
			span.textContent = i ? '' : '••••••••';
			i++;
		}
		const now = new Date();
		password.dataset.date = now.toLocaleDateString('en-us', {month: 'long', day: 'numeric', year: 'numeric'})+' at '+now.clockTime();
	}

	function pwedit(e) {
		e.preventDefault();
		const element = e.target.parentNode.parentNode,
			fields = Array.from(element.querySelectorAll('.field'));
		if (e.target.classList.contains('edit')) {
			let pwnone = false;
			if (document.getElementById('oldpw').textContent == 'None') pwnone = true;
			makeInput(fields, {
				type: 'password',
				placeholder: ['Current Password', 'New Password', 'Confirm New Password'],
				actionsbox: document.querySelector('#password .actions')
			});
			if (pwnone) {
				const opwi = element.querySelector('#oldpw input');
				opwi.style.display = 'none';
				opwi.validate = false;
			}
			
			for (const inp of element.querySelectorAll('input')) {
				inp.value = '';

				inp.parentNode.save = function() {
					element.querySelector('.inlineError')?.remove();
					const oldpw = element.querySelector('input[name="oldpw"]'),
						newpw = element.querySelector('input[name="newpw"]'),
						confirmpw = element.querySelector('input[name="confirmpw"]');
					if (newpw.value != confirmpw.value) {
						newpw.classList.add('error');
						confirmpw.classList.add('error');
						return inlineError(element, 'Passwords do not match.');
					}  else if (newpw.value.length < 5) {
						newpw.classList.add('error');
						return inlineError(element, 'Password must be at least 5 characters.');
					} else if (newpw.value.toLowerCase().includes(document.querySelector('h1 .num').textContent.toLowerCase())) {
						newpw.classList.add('error');
						return inlineError(element, 'Password cannot contain the username.');
					}
					sendInfo(fields, ['req=editpw', 'current='+(oldpw ? oldpw.value : ''), 'new='+newpw.value], ['edit'], pwafter, pwerror);
				}
			}
		
		} else if (e.target.classList.contains('cancel')) element.querySelector('.field').cancel();
		else if (e.target.classList.contains('save')) element.querySelector('.field').save();
	}
	password.addEventListener('click', pwedit);

	const oid = document.querySelector('#orcid');
	oid.addEventListener('click', function(e) {
		if (!e.target.classList.contains('cancel')) return;
		e.preventDefault();
		if (document.getElementById('oldpw').textContent == 'None') {
			alert('Cannot disconnect OrcID without a password set. Please set a password and then try again.');
			return;
		}
		if (!confirm('Are you sure you want to disconnect your OrcID?')) return;

		sendInfo(null, ['req=deleteorcid'], null, function() {
			oid.querySelector('a').remove();
			oid.querySelector('.actions').remove();
		});
	});

	//Delete user
	document.querySelector('h1 .delete').addEventListener('click', function(e) {
		e.preventDefault();
		let confirm = '@@@';
		while (confirm && confirm.toLowerCase()!=document.querySelector('h1 .num').textContent.toLowerCase())
			confirm = prompt('Are you sure you want to PERMANENTLY delete this account? All classes, students, and participation records will also be deleted.\n\nType your username to confirm.');
		if (confirm.toLowerCase()==document.querySelector('h1 .num').textContent.toLowerCase())
			document.getElementById('deleteform').submit();
	})
});