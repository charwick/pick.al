"use strict";
document.addEventListener('DOMContentLoaded', () => {
	const emailedit = new makeInput(document.querySelector('#email + .actions'));
	emailedit.addElement(document.getElementById('email'), {type: 'email', placeholder: 'Email address', autocomplete: 'email'});
	emailedit.data = inps => ({req: 'edituser', k: 'email', v: inps[0].value});

	function inlineError(element, message) {
		let error = markup({tag: 'span', attrs: {class: 'inlineError'}, children: [message]});
		element.append(error);
		return 0;
	}

	const pwelement = document.getElementById('password'),
		pwedit = new makeInput(pwelement.querySelector('.actions'));
	var pwnone = document.getElementById('oldpw').textContent == 'None';
	pwedit.addElement(document.getElementById('oldpw'), {type: 'password', placeholder: 'Current Password', autocomplete: 'current-password'});
	pwedit.addElement(document.getElementById('newpw'), {type: 'password', placeholder: 'New Password', autocomplete: 'new-password'});
	pwedit.addElement(document.getElementById('confirm_password'), {type: 'password', placeholder: 'Confirm New Password', autocomplete: 'new-password'});
	pwedit.data = inps => ({req: 'editpw', current: (inps[0].value), new: inps[1].value});
	pwedit.editfunc = inps => {
		if (pwnone) {
			inps[0].style.display = 'none';
			inps[0].validate = false;
		}
	}
	pwedit.validate = inps => {
		pwelement.querySelector('.inlineError')?.remove();
		if (inps[1].value != inps[2].value) {
			inps[1].classList.add('error');
			inps[2].classList.add('error');
			return inlineError(pwelement, 'Passwords do not match.');
		}  else if (inps[1].value.length < 5) {
			inps[1].classList.add('error');
			return inlineError(pwelement, 'Password must be at least 5 characters.');
		} else if (inps[1].value.toLowerCase().includes(document.querySelector('h1 .num').textContent.trim().toLowerCase())) {
			inps[1].classList.add('error');
			return inlineError(pwelement, 'Password cannot contain the username.');
		}
		return 1;
	}
	pwedit.error = (response, inputs) => {
		inputs[0].classList.add('error');
		inlineError(pwelement, 'Current password is incorrect.');
	}
	pwedit.cancelfunc = () => {
		let i=0;
		for (const span of pwelement.querySelectorAll('.field')) {
			span.textContent = i ? '' : '••••••••';
			i++;
		}
	}
	pwedit.after = (response, inps) => {
		pwedit.cancelfunc();
		const now = new Date();
		pwelement.dataset.date = now.toLocaleDateString('en-us', {month: 'long', day: 'numeric', year: 'numeric'})+' at '+now.clockTime();
		pwnone = false;
	}

	const oid = document.querySelector('#orcid');
	oid.addEventListener('click', function(e) {
		if (!e.target.classList.contains('cancel')) return;
		e.preventDefault();
		if (document.getElementById('oldpw').textContent == 'None') {
			alert('Cannot disconnect OrcID without a password set. Please set a password and then try again.');
			return;
		}
		if (!confirm('Are you sure you want to disconnect your OrcID?')) return;

		sendInfo(null, {req: 'deleteorcid'}, null, function() {
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
		if (confirm?.toLowerCase()==document.querySelector('h1 .num').textContent.toLowerCase())
			document.getElementById('deleteform').submit();
	})
});