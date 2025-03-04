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
			else for (const c of element.children) if (c !== null) el.append(markup(c));
		}
	}
	return el;
}

class makeInput {
	elements = [];
	data = null; //A function that takes the inputs, and returns data to send to the server
	validate = null;
	actions = [];
	editActions = ['save', 'cancel']; //Additions should define a `action`func method attached to the object

	constructor(actionsbox=null) {
		this.actionsbox = actionsbox;
		if (!actionsbox) this.actionsbox = markup({tag: 'span', attrs: {class: 'actions'} });
		else {
			//Swap out actions but keep track of what to put back when we solidify
			for (const a of this.actionsbox.querySelectorAll('a'))
				this.actions.push(a.getAttribute('class'));
		}
		this.actionsbox.addEventListener('click', e => {
			e.preventDefault();
			if (e.target.classList.contains('edit')) this.edit();
			else if (this.editActions.includes(e.target.className)) this[e.target.className]();
		});
	}

	addElement(element, opts) {	this.elements.push([element, opts ?? {}]); }

	edit() {
		const inps = [];
		for (const [element, attrs] of this.elements) {
			let inp;
			const type = attrs.type ?? 'text';
			if (type=='select') {
				inp = markup({tag: 'select'});
				for (const s of attrs.opts) {
					let option;
					if (s===null) option = markup({tag: 'hr'});
					else if (typeof s == 'string') option = markup({tag: 'option', attrs: {value: s.toLowerCase()}, children: [s]});
					else {
						option = markup({tag: 'option', attrs: {value: s[0]}, children: [s[1]]});
						if (s.length>=3 && !s[2]) option.disabled = true;
					}
					inp.append(option);
				}
				inp.value = 'default' in element.dataset ? element.dataset.default : element.textContent.trim().toLowerCase();
			} else {
				if (type=='textarea') inp = markup({tag: 'textarea', children: element.textContent.trim()});
				else {
					inp = markup({tag: 'input', attrs: {type: type || 'text'}});
					if (inp.type=='date') inp.value = element.dataset.date;
					else if (inp.type!='password') inp.value = element.textContent.trim();
				}
				if (!('required' in attrs)) attrs['required'] = true;
				for (const attr of ['min', 'max', 'placeholder', 'required', 'autocomplete'])
					if (attr in attrs) {
						const val = attrs[attr] instanceof Array ? attrs[attr][i] : attrs[attr];
						if (val !== false) inp.setAttribute(attr, val);
					}
			}

			inp.name = element.id || element.getAttribute('class');
			element.classList.add('editing');
			inp.oldValue = inp.value;

			//Saving and cancelling
			inp.addEventListener('keydown', e => {
				if (e.key == "Enter") {
					e.preventDefault();
					this.save();
				} else if (e.key == "Escape") {
					e.preventDefault();
					this.cancel();
				}
			});

			this.actionsbox.textContent = '';
			this.actionsbox.append(...actionButtons(this.editActions));

			//Draw the input
			element.textContent = '';
			element.append(inp);
			if (!this.actionsbox.isConnected) this.elements[0][0].append(this.actionsbox);
			inps.push(inp);
		}
		inps[0].focus();
		if (this.editfunc instanceof Function) this.editfunc(inps);
	}

	cancel() {
		for (const [element, attrs] of this.elements) {
			const input = element.querySelector('input, select, textarea');
			input.value = input.oldValue;
			element.parentNode.querySelector('.inlineError')?.remove();
		}
		this.solidify();
		if (this.cancelfunc) this.cancelfunc();
	}

	save() {
		for (const [element, attrs] of this.elements)
			element.parentNode.querySelector('.inlineError')?.remove();
	
		//Check for blank values and only make a request if the value has changed
		const inps = [];
		for (const [element, attrs] of this.elements) inps.push(element.querySelector('input,select,textarea'));
		const valid = validate(inps);
		if (valid===0 || (this.validate instanceof Function && !this.validate(inps))) return;
		if (valid!=null || !inps.length) {
			onerror = response =>  {
				if (this.error instanceof Function) this.error(response, inps);
				else for (const inp of inps) inp.classList.add('error');
			};
	
			fetch('../ajax.php?'+(new URLSearchParams(this.data(inps)).toString()), {method: 'get'})
			.then(response => response.json()).then(response => {
				if (!response) onerror(response);
				else {
					const vals = [];
					for (const inp of inps) {
						vals.push(inp.value);
						if ('default' in inp.parentNode.dataset) inp.parentNode.dataset.default = inp.value;
					}
					this.solidify();
					if (this.after instanceof Function) this.after(response, vals);
				}
			}).catch(onerror);
			
		} else this.solidify();
	};

	//Turns inputs back into elements
	solidify() {
		for (const [el, attrs] of this.elements) {
			el.classList.remove('editing');
			const inp = el.querySelector('input, select, textarea');
			if (attrs.type=='select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
			else if (attrs.type == 'date' && inp.value) {
				el.dataset.date = inp.value;
				el.textContent = datetostr(inp.value);
			} else el.textContent = inp.value;
		}
		
		if (this.actions.length) {
			this.actionsbox.textContent = '';
			this.actionsbox.append(...actionButtons(this.actions));
			if (!this.actionsbox.isConnected) this.elements[0][0].append(this.actionsbox);
		} else this.actionsbox.remove();
	}
}

function actionButtons(list) {
	if (!list) return [];
	const buttons = {
		edit: {title: 'Edit'},
		save: {title: 'Save'},
		delete: {title: 'Delete'},
		cancel: {title: 'Cancel'},
		archive: {title: 'Archive'},
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
		if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) element = element.querySelector('input,select,textarea');
		element.classList.remove('error');
		if (element.value != element.oldValue) changed = true;
		if (Object.hasOwn(element, 'validate') && !element.validate) continue; //Let fields be skipped
		if (!element.validity.valid) { //Takes care of blank+required, num ranges, and email
			element.classList.add('error');
			element.focus();
			blank = true; //Don't return quite yet, so we can check all our inputs
		}
	}
	if (blank) return 0;	//Fail
	if (changed) return 1;	//Pass
	return null;			//Nothing changed
}

function modal(...content) {
	const modal = markup({tag: 'dialog', attrs: {class: 'transit'}, children: [markup({tag: 'div', children: content, attrs: {class: 'studentmodal'}})]});
	document.body.append(modal);
	modal.addEventListener('click', (e) => { //Click the backdrop to close (requires a div wrapper)
		if (e.target.nodeName === 'DIALOG') {
			if (
				modal.querySelector('input[name="fname"], input.fname') &&
				!confirm('Do you want to save the entered info? Press cancel to return or OK to close without saving.')
			) return;

			modal.classList.add('transit');
			setTimeout(() => { modal.remove(); }, 250);
		}
	});
	modal.addEventListener('close', modal.remove);
	modal.showModal();
	modal.classList.remove('transit');
	document.activeElement.blur() //The + button gets focused for some reason
	return modal;
}