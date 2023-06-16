function makeEditable(element, attrs) {
	if (!element) return;
	const edit = actionButtons(['edit'])[0];
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		makeInput(element, attrs);
	});
	element.appendChild(edit);
}

//Turns a set of elements into inputs
function makeInput(elements, attrs) {
	let inps = [], i=0;
	if (!(elements instanceof Array)) elements = [elements]

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
			solidify(elements);
			const addnew = document.querySelector('#roster .addnew a');
			if (addnew) addnew.classList.remove('disabled');
		}
		element.save = function() { sendInfo(elements, attrs.data(inps), 'after' in attrs ? attrs.after : null); };

		if (elements.length==1) inp.addEventListener('blur', elements[0].save);
		else {
			//Hackish, fix eventually
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

function updateScore(rostertr, evtable) {
	const results = [],
		evcell = evtable.querySelector('.numtotal'),
		rostercell = rostertr.querySelector('.score');
	for (const n of evtable.querySelectorAll('.numspan')) results.push(parseFloat(n.textContent));
	if (results.length) {
		const sum = results.reduce((a,b) => a+b);
		evcell.textContent = Math.round(sum/results.length*100)+'%';
		rostercell.textContent = sum+'/'+results.length+' ('+Math.round(sum/results.length*100)+'%)';
		rostercell.classList.remove('nullscore');
	} else {
		evcell.textContent = '—';
		rostercell.textContent = '—';
		rostercell.classList.add('nullscore');
	}
	document.querySelector('#modal span.num').textContent = results.length;
}

//Turns a set of inputs back into elements
function solidify(els) {
	if (els[0].querySelector('#selector')) return; //Don't solidify the selector dropdown
	for (const el of els) {
		el.classList.remove('editing');
		const inp = el.querySelector('input, select');
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else inp.parentNode.textContent = inp.value;
	}

	if (els.length == 1) makeEditable(els[0], els[0].pickalAttrs);
	else {
		const actions = els[0].parentNode.querySelector('.actions');
		actions.textContent = '';
		actions.append(...actionButtons(['edit', 'excuses', 'delete']));
	}
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

//============================
// Communicate with the server
//============================

function sendInfo(elements, data, after) {
	let blank, changed, inputs=[];
	if (!(elements instanceof Array)) elements = [elements]
	
	//Check for blank values
	for (const element of elements) {
		const inp = element.querySelector('input,select');
		inp.classList.remove('error');
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
	if (changed) {
		const req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?'+data.join('&'), true);
		req.onload = function() {
			if (!parseInt(this.response)) req.onerror();
			else {
				solidify(elements);
				if (after instanceof Function) after(parseInt(this.response));
			}
		};
		req.onerror = () => { for (const inp of inputs) inp.classList.add('error'); };
		req.send();
	} else solidify(elements);
}