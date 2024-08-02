"use strict";
function markup(element) {
	let el;
	if (element instanceof HTMLElement) el = element;
	else if (['string', 'number'].includes(typeof element)) el = document.createTextNode(element);
	else {
		el = document.createElement(element.tag);
		if ('attrs' in element) for (const a in element.attrs) el.setAttribute(a, element.attrs[a]);
		if ('children' in element) {
			if (typeof element.children == 'string') el.innerHTML = element.children;
			else for (const c of element.children) el.append(markup(c));
		}
	}
	return el;
}

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
	attrs = attrs || {};

	//Keep track of what actions to put back when we solidify
	if (!('actions' in attrs)) {
		attrs['actions'] = [];
		if (!('actionsbox' in attrs)) attrs['actionsbox'] = elements[0].querySelector('.actions');
		for (const a of attrs['actionsbox'].querySelectorAll('a'))
			attrs['actions'].push(a.getAttribute('class'));
	}
	if (!('required' in attrs)) attrs['required'] = true;

	for (const element of elements) {
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
			if (inp.type=='date') inp.value = element.dataset.date;
			else inp.value = element.textContent.replace('✎','');
			for (const attr of ['min', 'max', 'placeholder', 'required', 'autocomplete'])
				if (attr in attrs) {
					const val = attrs[attr] instanceof Array ? attrs[attr][i] : attrs[attr];
					if (val !== false) inp.setAttribute(attr, val);
				}
		}

		inp.name = element.id || element.getAttribute('class');
		element.classList.add('editing');
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
			element.parentNode.querySelector('.inlineError')?.remove();
			if ('cancel' in attrs) attrs.cancel();
		}
		element.save = function() {
			element.parentNode.querySelector('.inlineError')?.remove();
			sendInfo(elements, attrs.data(inps), attrs['actions'], 'after' in attrs ? attrs.after : null);
		};

		if (elements.length==1) {
			if  (!('blur' in attrs && !attrs['blur'])) inp.addEventListener('blur', elements[0].save);
		} else {
			const actions = attrs['actionsbox'];
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
	if (!els.length) return;
	for (const el of els) {
		el.classList.remove('editing');
		const inp = el.querySelector('input, select');
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else if (inp.type == 'date') {
			inp.parentNode.dataset.date = inp.value;
			inp.parentNode.textContent = datetostr(inp.value);
		} else inp.parentNode.textContent = inp.value;
	}
	
	let actions;
	if (els.length == 1) {
		actions = document.createElement('span');
		actions.classList.add('actions');
		els[0].append(actions);
	} else if (els.length > 1) {
		actions = els[0].pickalAttrs['actionsbox'];
		actions.textContent = '';
	}
	actions.append(...actionButtons(actionList));
}

function actionButtons(list) {
	if (!list) return [];
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

function invertSchema() {
	let array = {};
	for (const id in schemae[schema]) array[schemae[schema][id].value] = id;
	return array;
}

Date.prototype.clockTime = function() {
	let mins = this.getMinutes();
	if (mins < 10) mins = '0'+mins;
	return this.getHours()+':'+mins;
}

//Returns a timezone-adjusted Month Day, Year string from a YYYY-MM-DD
function datetostr(datestr) {
	const exc = new Date(datestr),
		modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1); //Be inclusive of the set day. Also timezone offset.
	return modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
}

//Returns 1=valid, 0=invalid, null=no change for each element
function validate(elements) {
	let blank, changed;
	for (let element of elements) {
		if (!['INPUT', 'SELECT'].includes(element.tagName)) element = element.querySelector('input,select');
		element.classList.remove('error');
		if (element.value != element.oldValue) changed = true;
		if (Object.hasOwn(element, 'validate') && !element.validate) continue; //Let fields be skipped
		if (element.required && element.value == '') {
			element.classList.add('error');
			element.focus();
			blank = true; //Don't return quite yet, so we can check all our inputs
		}
	}
	if (blank) return 0;	//Fail
	if (changed) return 1;	//Pass
	return null;			//Nothing changed
}

//============================
// Communicate with the server
//============================

function sendInfo(elements, data, actions, after, errorfn) {
	if (elements == null) elements = [];
	else if (!(elements instanceof Array)) elements = [elements];
	
	//Check for blank values and only make a request if the value has changed
	const valid = validate(elements);
	if (valid===0) return;
	if (valid!=null || !elements.length) {
		onerror = function(response)  {
			const inputs = [];
			for (const inp of elements)
				if (['INPUT', 'SELECT'].includes(inp.tagName)) inputs.push(inp);
				else inputs.push(inp.querySelector('input,select'));
			if (errorfn) errorfn(response, inputs);
			else for (const inp of inputs) inp.classList.add('error');
		};

		fetch('../ajax.php?'+(new URLSearchParams(data).toString()), {method: 'get'})
		.then((response) => response.json()).then((response) => {
			if (!response) onerror(response);
			else {
				solidify(elements, actions);
				if (after instanceof Function) after(response);
			}
		}).catch(onerror);
		
	} else solidify(elements, actions);
}