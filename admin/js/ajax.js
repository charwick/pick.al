function makeEditable(element, attrs) {
	if (!element) return;
	const actions = document.createElement('span'),
		edit = actionButtons(['edit'])[0];
	actions.classList.add('actions');
	actions.append(edit);
	if (!element.editable) {
		element.addEventListener('click', function(e) {
			if (!e.target.classList.contains('edit')) return;
			e.preventDefault();
			makeInput(element, attrs);
		});
		element.editable = true;
	}
	element.appendChild(actions);
}

//Turns a set of elements into inputs
function makeInput(elements, attrs) {
	let inps = [], i=0;
	if (!(elements instanceof Array)) elements = [elements];

	//Keep track of what actions to put back when we solidify
	if (!('actions' in attrs)) {
		attrs['actions'] = [];
		const container = elements.length==1 ? elements[0] : elements[0].parentNode;
		for (const a of container.querySelectorAll('.actions a'))
			attrs['actions'].push(a.getAttribute('class'));
	}

	clearPopups();
	for (const element of elements) {
		element.classList.add('editing');
		let inp;	
		if (attrs.type=='select') {
			inp = document.createElement('select');
			let html = '';
			for (const s of attrs.opts) html += '<option value="'+s.toLowerCase()+'">'+s+'</option>';
			inp.innerHTML = html;
			inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
		} else {
			inp = document.createElement('input');
			inp.type = attrs.type || 'text';
			inp.value = element.textContent.replace('✎','');
			for (const attr of ['min', 'max', 'placeholder'])
				if (attr in attrs)
					inp.setAttribute(attr, attrs[attr] instanceof Array ? attrs[attr][i] : attrs[attr])
		}

		inp.name = element.id;
		element.pickalAttrs = attrs
		inp.oldValue = inp.value;

		//Saving and cancelling
		inp.addEventListener('keydown', function(e) {
			if (e.key == "Enter") {
				e.preventDefault();
				element.save();
			} else if (e.key == "Escape") {
				e.preventDefault();
				element.cancel();
			}
		});
		element.cancel = function() {
			for (const input of inps) input.value = input.oldValue;
			solidify(elements, attrs['actions']);
			const addnew = document.querySelector('#roster .addnew a'),
				error = element.parentNode.querySelector('.inlineError');
			if (addnew) addnew.classList.remove('disabled');
			if (error) error.remove();
		}
		element.save = function() {
			const error = element.parentNode.querySelector('.inlineError');
			if (error) error.remove();
			sendInfo(elements, attrs.data(inps), attrs['actions'], 'after' in attrs ? attrs.after : null);
		};

		if (elements.length==1) inp.addEventListener('blur', elements[0].save);
		else {
			const actions = element.parentNode.querySelector('.actions');
			actions.textContent = '';
			actions.append(...actionButtons(['save', 'cancel']));
		}

		//Draw the input
		element.textContent = '';
		element.append(inp)
		inps.push(inp);
		i++;
	}

	inps[0].focus();
	return inps;
}

//Turns a set of inputs back into elements
function solidify(els, actionList) {
	// if (els[0].querySelector('#selector')) return; //Don't solidify the selector dropdown
	if (!els.length) return;
	for (const el of els) {
		el.classList.remove('editing');
		const inp = el.querySelector('input, select');
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else inp.parentNode.textContent = inp.value;
	}
	
	let actions;
	if (els.length == 1) {
		actions = document.createElement('span');
		actions.classList.add('actions');
		els[0].append(actions);
	} else if (els.length > 1) {
		actions = els[0].parentNode.querySelector('.actions');
		actions.textContent = '';
	}
	actions.append(...actionButtons(actionList));
}

function clearPopups() {
	for (const pp of document.querySelectorAll('.popup')) pp.remove();
	for (const tr of document.querySelectorAll('#roster tr'))
		if (tr.classList.contains('editing') && !tr.querySelector('input'))
			tr.classList.remove('editing', 'nottip');
}

function actionButtons(list) {
	const buttons = {
		edit: {title: 'Edit'},
		save: {title: 'Save'},
		delete: {title: 'Delete'},
		cancel: {title: 'Cancel'},
		excuses: {title: 'Set excused absences'}
	}, actions = [];
	for (const item of list) {
		const a = document.createElement('a');
		a.classList.add(item);
		a.href = '#';
		a.title = buttons[item].title;
		actions.push(a);
	}
	return actions;
}

Date.prototype.clockTime = function() {
	let mins = this.getMinutes();
	if (mins < 10) mins = '0'+mins;
	return this.getHours()+':'+mins;
}

//============================
// Communicate with the server
//============================

function sendInfo(elements, data, actions, after, errorfn) {
	let blank, changed, inputs=[];
	if (elements == null) elements = [];
	else if (!(elements instanceof Array)) elements = [elements];
	
	//Check for blank values
	for (const element of elements) {
		const inp = element.querySelector('input,select');
		inp.classList.remove('error');
		if (Object.hasOwn(inp, 'validate') && !inp.validate) continue;
		if (inp.value == '') {
			inp.classList.add('error');
			inp.focus();
			blank = true; //Don't return quite yet, so we can check all our inputs
		}
		if (inp.value != inp.oldValue) changed = true;
		inputs.push(inp);
	}
	if (blank) return;
		
	//Only make a request if the value has changed
	if (changed || !elements.length) {
		const req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?'+data.join('&'), true);
		req.onload = function() {
			if (!parseInt(this.response)) req.onerror();
			else {
				solidify(elements, actions);
				if (after instanceof Function) after(parseInt(this.response));
			}
		};
		req.onerror = () => {
			if (errorfn) errorfn(this.response, inputs);
			else for (const inp of inputs) inp.classList.add('error');
		};
		req.send();
	} else solidify(elements, actions);
}