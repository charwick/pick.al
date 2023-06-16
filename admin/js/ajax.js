function makeEditable(element, attrs) {
	const edit = actionButtons(['edit'])[0];
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		makeInput(element);
	});
	element.appendChild(edit);
    element.pickalAttrs = attrs;
}

//Turns an element into an input
function makeInput(element) {
	element.classList.add('editing');
	let inp;
	
	//Edit students
	if (element.tagName.toLowerCase() == 'tr') {
		clearPopups();
		inp = document.createElement('input');
		const inp2 = document.createElement('input'),
			ftd = element.querySelector('.fname'),
			ltd = element.querySelector('.lname');
		inp.value = ltd.textContent;
		inp2.value = ftd.textContent;
		inp.placeholder = 'Last Name';
		inp2.placeholder = 'First Name';
	
		element.save = function() { sendInfo(element, 'editstudent', ['student='+element.dataset.id, 'fname='+inp2.value, 'lname='+inp.value]); }
		const actions = element.querySelector('.actions');
		actions.textContent = '';
		actions.append(...actionButtons(['save', 'cancel']));
	
		ftd.textContent = ''; ltd.textContent = '';
		ftd.append(inp2); ltd.append(inp);
		inp2.focus();
	
	//Edit class info
	} else {
		const item = element.id;
		if (element.pickalAttrs.type=='select') {
			inp = document.createElement('select');
			let html = '';
			for (const s of element.pickalAttrs.opts) html += '<option value="'+s.toLowerCase()+'">'+s+'</option>';
			inp.innerHTML = html;
			inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
		} else {
			inp = document.createElement('input');
			inp.type = element.pickalAttrs.type || 'text';
			inp.value = element.textContent.replace('✎','');
            for (const attr of ['min', 'max', 'placeholder'])
                if (attr in element.pickalAttrs)
                    element.setAttribute(attr, element.pickalAttrs[attr])
		}
		
		inp.name = item;
		if (item) inp.id = item;
		inp.classList.add('submittable');
        inp.pickalAttrs = element.pickalAttrs
		
		element.save = function() { sendInfo(element, 'updateclassinfo', ['class='+classid, 'k='+inp.name, 'v='+inp.value]); };
		inp.addEventListener('blur', element.save);
		element.textContent = '';
		element.append(inp);
		inp.focus();
	}
	
	//Revert any changes
	element.cancel = function() {
		for (const input of element.querySelectorAll('input,select')) input.value = input.oldValue;
		solidify(element);
		document.querySelector('#roster .addnew a').classList.remove('disabled');
	}
	
	for (const input of element.querySelectorAll('input,select')) {
		input.oldValue = input.value;
		input.addEventListener('keydown', function(e) {
			if (e.key == "Enter") {
				e.preventDefault();
				element.save();
			} else if (e.key == "Escape") {
				e.preventDefault();
				element.cancel();
			}
		});
	}
	
	return inp;
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

//Turns an input back into an element
function solidify(el) {
	if (el.querySelector('#selector')) return;
	el.classList.remove('editing');
	for (const inp of el.querySelectorAll('input, select')) {
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else inp.parentNode.textContent = inp.value;
	}
	if (el.tagName.toLowerCase() != 'tr') makeEditable(el, el.pickalAttrs);
	else {
		const actions = el.querySelector('.actions');
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

function selectorDesc() {
	const val = document.getElementById('selector').value,
		descs = {
			rand: 'Random with replacement',
			even: 'Preferentially choose students that have been called on the least so far',
			order: 'Rotate through the class in order (your place is saved across sessions)'
		};
	document.getElementById('selector-desc').textContent = descs[val];
}

//============================
// Communicate with the server
//============================

function sendInfo(element, command, data, after) {
	let inputs = element.querySelectorAll('input,select'), blank, changed;
	
	//Check for blank values
	for (const inp of inputs) {
		inp.classList.remove('error');
		if (inp.value == '') {
			inp.classList.add('error');
			inp.focus();
			blank = true; //Don't return quite yet, so we can check all our inputs
		}
		if (inp.value != inp.oldValue) changed = true;
	}
	if (blank) return;
		
	//Only make a request if the value has changed
	if (changed) {
		const req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?req='+command+'&'+data.join('&'), true);
		req.onload = function() {
			if (!parseInt(this.response)) req.onerror();
			else {
				solidify(element);
				if (after instanceof Function) after(parseInt(this.response));
			}
		};
		req.onerror = () => { for (const inp of inputs) inp.classList.add('error'); };
		req.send();
	} else solidify(element);
}

function uploadCSV(e) {
	e.preventDefault();
	const files = this.files || e.dataTransfer.items,
		reader = new FileReader(),
		csvElement = document.getElementById('csvfile'),
		error = document.querySelector('#csvupload .info');
	if (files.length == 0) return;
	if (error) error.remove();
	
	reader.onload = function(e) {
		const formData = new FormData(),
			req = new XMLHttpRequest();
		
		formData.append("csv", e.target.result);
		formData.append("req", "uploadroster");
		formData.append("class", ''+classid);
		req.open("POST", "../ajax.php", true);
		req.onload = function() {
			response = JSON.parse(this.response);
			if (!response) {
				const error = infoElement("No valid students found. Make sure the headers are correct.", 'error');
				csvElement.parentNode.parentNode.insertBefore(error, csvElement.parentNode);
			} else {
				const info = infoElement("Uploaded "+response.length+" students")
				csvElement.parentNode.parentNode.insertBefore(info, csvElement.parentNode);
				for (const row of response) {
					const tr = studentRow(row['fname'], row['lname'], ['edit', 'excuses', 'delete']);
					tr.dataset.id = row['id'];
				}
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
			}
		};
		req.onerror = function() {
			const error = document.createElement('span');
			error.textContent = 'There was an error uploading this CSV.';
			csvElement.parentNode.insertBefore(error, csvElement);
		}
		req.send(formData);
	};
	file = files[0] instanceof File ? files[0] : files[0].getAsFile(); //Dragging gives us a DataTransferItem object instead of a file
	document.querySelector('label[for="csvfile"]').classList.remove('active');
	if (!file.type.includes('csv')) {
		const error = infoElement("This file isn't a CSV!", 'error');
		csvElement.parentNode.parentNode.insertBefore(error, csvElement.parentNode);
	} else reader.readAsText(file);
}