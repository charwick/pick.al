document.addEventListener('DOMContentLoaded', function() {
	
	document.querySelectorAll('.editable').forEach(addEditIcon); //Make items editable
	
	//Action buttons
	let roster = document.querySelector('#roster tbody');
	if (roster) {
		roster.querySelectorAll('.actions').forEach(function(td) {
			td.append(...actionButtons(['edit', 'excuses', 'delete']));
			if ('excused' in td.parentNode.dataset) {
				let exc = new Date(td.parentNode.dataset.excused),
					modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1);
				td.querySelector('.excuses').title = "Excused until "+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
			}
		});
		
		roster.addEventListener('click', function(e) {
			if (!e.target.matches('.actions a')) return;
			e.preventDefault();
			let tr = e.target.parentNode.parentNode;
			if (e.target.classList.contains('edit')) makeInput(tr);
			else if (e.target.classList.contains('save')) tr.save();
			else if (e.target.classList.contains('cancel')) tr.cancel();
			else if (e.target.classList.contains('delete')) {
				if (!confirm('Are you sure you want to delete the student '+tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent+'?')) return;
				let req = new XMLHttpRequest();
				req.open('GET', '../ajax.php?req=deletestudent&id='+tr.dataset.id, true);
				req.onload = function() {
					if (parseInt(this.response) != 1) req.onerror();
					else {
						//Re-stripe the table
						let subsequent = tr;
						while (subsequent.nextElementSibling) {
							if (subsequent.nextElementSibling.classList.contains('odd')) subsequent.nextElementSibling.classList.remove('odd');
							else subsequent.nextElementSibling.classList.add('odd');
							subsequent = subsequent.nextElementSibling;
						}
						tr.remove();
						let snum = document.getElementById('num_students');
						snum.textContent = parseInt(snum.textContent)-1;
					}
				};
				req.onerror = function() {  };
				req.send();
			} else if (e.target.classList.contains('excuses')) {
				if (tr.classList.contains('editing')) {
					clearPopups();
					return;
				}
				
				clearPopups();
				let popup = document.createElement('div'),
					inp = document.createElement('input'),
					erect = e.target.getBoundingClientRect();
			
				tr.classList.add('editing', 'nottip');
				popup.textContent = 'Excused until ';
				popup.classList.add('popup');
				inp.type = 'date';
				inp.value = tr.dataset.excused;
				inp.oldValue = inp.value;
				popup.appendChild(inp);
				popup.style.top = (erect.top+window.pageYOffset-40)+'px';
				document.body.appendChild(popup);
				popup.style.left = Math.round(erect.left+window.pageXOffset-popup.getBoundingClientRect().width/2+erect.width/2)+'px';
				inp.focus();
			
				inp.addEventListener('keydown', function(e2) {
					if (e2.key == "Enter") {
						e2.preventDefault();
						if (inp.value == inp.oldValue) {
							popup.remove();
							return;
						}
					
						let req = new XMLHttpRequest();
						req.open('GET', '../ajax.php?req=studentexcused&id='+tr.dataset.id+'&excused='+inp.value, true);
						req.onload = function() {
							if (parseInt(this.response) != 1) inp.classList.add('error');
							else {
								let exc = new Date(inp.value),
									now = new Date(),
									modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1); //Be inclusive of the set day. Also timezone offset.
								if (modDate > now) {
									tr.dataset.excused = inp.value;
									e.target.title = "Excused until "+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
								} else {
									delete tr.dataset.excused;
									e.target.title = "Set excused absences";
								}
								tr.classList.remove('editing', 'nottip');
								popup.remove();
							}
						};
						req.onerror = function() { inp.classList.add('error'); };
						req.send();
					} else if (e2.key == "Escape") {
						e2.preventDefault();
						tr.classList.remove('editing', 'nottip')
						popup.remove();
					}
				});
			}
		});
	}
	
	//Add new student
	let addStudent = document.querySelector('#addnew a');
	if (addStudent) addStudent.addEventListener('click', function(e) {
		e.preventDefault();
		clearPopups();
		if (this.classList.contains('disabled')) return;
		this.classList.add('disabled');
		
		let tr = studentRow('','', ['cancel', 'save']);
		makeInput(tr);
		tr.cancel = function() {
			tr.remove();
			document.querySelector('#addnew a').classList.remove('disabled');
		}
		tr.save = function() {
			let after = function(response) {
				tr.dataset.id = response;
				let snum = document.getElementById('num_students');
				snum.textContent = parseInt(snum.textContent)+1;
				document.querySelector('#addnew a').classList.remove('disabled');
			}
			sendInfo(tr, 'addstudent', ['classid='+classid, 'fname='+tr.querySelector('.fname input').value, 'lname='+tr.querySelector('.lname input').value], after)
		}
	});
	
	//Handle CSV
	let csvElement = document.getElementById('csvfile');
	if (csvElement) {
		let label = document.querySelector('label[for="csvfile"]');
		label.addEventListener('dragenter', function(e) { this.classList.add('active'); });
		label.addEventListener('dragover', function(e) { e.preventDefault(); }); //Necessary to prevent the tab opening the dragged file
		label.addEventListener('dragleave', function(e) { this.classList.remove('active'); });
		label.addEventListener('drop', uploadCSV);
		csvElement.addEventListener('change', uploadCSV);
	}
	
	//Selector function change
	let selector = document.getElementById('selector');
	selector.oldValue = selector.value;
	selector.addEventListener('change', function(e) {
		if (document.body.classList.contains('admin-edit'))
			sendInfo(this.parentNode, 'updateclassinfo', ['class='+classid, 'k=selector', 'v='+this.value], selectorDesc);
		else selectorDesc();
	});
	selectorDesc();
});

//=====================
// Modify HTML elements
//=====================

function addEditIcon(element) {
	let edit = actionButtons(['edit'])[0];
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		makeInput(element);
	});
	element.appendChild(edit);
}

var editables = {
	name: {placeholder: 'Class Name'},
	year: {min: 2023, max: 2100, placeholder: 'year'},
}

//Turns an element into an input
function makeInput(element) {
	element.classList.add('editing');
	let inp;
	
	//Edit students
	if (element.tagName.toLowerCase() == 'tr') {
		inp = document.createElement('input');
		let inp2 = document.createElement('input'),
			ftd = element.querySelector('.fname'),
			ltd = element.querySelector('.lname');
		inp.value = ltd.textContent;
		inp2.value = ftd.textContent;
		inp.placeholder = 'Last Name';
		inp2.placeholder = 'First Name';
	
		element.save = function() { sendInfo(element, 'editstudent', ['student='+element.dataset.id, 'fname='+inp2.value, 'lname='+inp.value]); }
		let actions = element.querySelector('.actions');
		actions.textContent = '';
		actions.append(...actionButtons(['save', 'cancel']));
	
		ftd.textContent = ''; ltd.textContent = '';
		ftd.append(inp2); ltd.append(inp);
		inp2.focus();
	
	//Edit class info
	} else {
		let item = element.id;
		if (element.dataset.inputtype=='select') {
			inp = document.createElement('select');
			let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
			seasons.forEach(function(s) { html += '<option value="'+s.toLowerCase()+'">'+s+'</option>'; })
			inp.innerHTML = html;
			inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
		} else {
			inp = document.createElement('input');
			inp.type = element.dataset.inputtype || 'text';
			inp.value = element.textContent.replace('✎','');
		}
		
		inp.name = item;
		if (item) inp.id = item;
		inp.classList.add('submittable');
		if (item in editables)
			for (const [attr,val] of Object.entries(editables[item]))
				inp.setAttribute(attr, val);
		
		element.save = function() { sendInfo(element, 'updateclassinfo', ['class='+classid, 'k='+inp.name, 'v='+inp.value]); };
		inp.addEventListener('blur', element.save);
		element.textContent = '';
		element.append(inp);
		inp.focus();
	}
	
	//Revert any changes
	element.cancel = function() {
		element.querySelectorAll('input,select').forEach(function(input) { input.value = input.oldValue; });
		solidify(element);
	}
	
	element.querySelectorAll('input,select').forEach(function(input) {
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
	});
	
	return inp;
}

//Turns an input back into an element
function solidify(el) {
	if (el.querySelector('#selector')) return;
	el.classList.remove('editing');
	let inps = el.querySelectorAll('input, select');
	inps.forEach(function(inp) {
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else inp.parentNode.textContent = inp.value;
	});
	if (el.tagName.toLowerCase() != 'tr') addEditIcon(el);
	else {
		let actions = el.querySelector('.actions');
		actions.textContent = '';
		actions.append(...actionButtons(['edit', 'excuses', 'delete']));
	}
}

function clearPopups() {
	document.querySelectorAll('.popup').forEach(function(pp) { pp.remove(); });
	document.querySelectorAll('#roster tr').forEach(function(tr) {
		if (tr.classList.contains('editing') && !tr.querySelector('input')) tr.classList.remove('editing', 'nottip');
	});
}

function selectorDesc() {
	let val = document.getElementById('selector').value,
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
	inputs.forEach(function(inp) {
		inp.classList.remove('error');
		if (inp.value == '') {
			inp.classList.add('error');
			inp.focus();
			blank = true; //Can't return since it would only return from this inner forEach function
		}
		if (inp.value != inp.oldValue) changed = true;
	});
	if (blank) return;
		
	//Only make a request if the value has changed
	if (changed) {
		let req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?req='+command+'&'+data.join('&'), true);
		req.onload = function() {
			if (!parseInt(this.response)) req.onerror();
			else {
				solidify(element);
				if (after instanceof Function) after(parseInt(this.response));
			}
		};
		req.onerror = function() { inputs.forEach(function(inp) { inp.classList.add('error'); }); };
		req.send();
	} else solidify(element);
}

function uploadCSV(e) {
	e.preventDefault();
	let files = this.files || e.dataTransfer.items,
		reader = new FileReader(),
		csvElement = document.getElementById('csvfile'),
		error = document.querySelector('#csvupload .info');
	if (files.length == 0) return;
	if (error) error.remove();
	
	reader.onload = function(e) {
		let formData = new FormData(),
			req = new XMLHttpRequest();
		
		formData.append("csv", e.target.result);
		formData.append("req", "uploadroster");
		formData.append("class", ''+classid);
		req.open("POST", "../ajax.php", true);
		req.onload = function() {
			response = JSON.parse(this.response);
			if (!response) {
				let error = infoElement("No valid students found. Make sure the headers are correct.", 'error');
				csvElement.parentNode.parentNode.insertBefore(error, csvElement.parentNode);
			} else {
				let info = infoElement("Uploaded "+response.length+" students")
				csvElement.parentNode.parentNode.insertBefore(info, csvElement.parentNode);
				response.forEach(function(row) {
					let tr = studentRow(row['fname'], row['lname'], ['edit', 'excuses', 'delete']);
					tr.dataset.id = row['id'];
				});
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
			}
		};
		req.onerror = function() {
			let error = document.createElement('span');
			error.textContent = 'There was an error uploading this CSV.';
			csvElement.parentNode.insertBefore(error, csvElement);
		}
		req.send(formData);
	};
	file = files[0] instanceof File ? files[0] : files[0].getAsFile(); //Dragging gives us a DataTransferItem object instead of a file
	document.querySelector('label[for="csvfile"]').classList.remove('active');
	if (!file.type.includes('csv')) {
		let error = infoElement("This file isn't a CSV!", 'error');
		csvElement.parentNode.parentNode.insertBefore(error, csvElement.parentNode);
	} else reader.readAsText(file);
}

//===================================
// Generate boilerplate HTML elements
//===================================

function infoElement(message, classname, tag) {
	let info = document.createElement(tag || 'p');
	info.classList.add('info');
	if (classname) info.classList.add(classname);
	info.textContent = message;
	return info;
}

function studentRow(col1, col2, actions=[]) {
	let stable = document.getElementById('roster').querySelector('tbody'),
		tr = document.createElement('tr');
	if (stable.childElementCount>1 && !stable.lastElementChild.classList.contains('odd')) tr.classList.add('odd');
	tr.innerHTML = '<td class="fname">'+col1+'</td><td class="lname">'+col2+'</td><td class="actions"></td><td class="nullscore">—</td>';
	tr.querySelector('.actions').append(...actionButtons(actions));
	stable.append(tr);
	return tr;
}

function actionButtons(list) {
	buttons = {
		'edit': {title: 'Edit'},
		'save': {title: 'Save'},
		'delete': {title: 'Delete'},
		'cancel': {title: 'Cancel'},
		'excuses': {title: 'Set excused absences'}
	}
	
	let actions = [];
	list.forEach(function(item) {
		let a = document.createElement('a');
		a.classList.add(item);
		a.href = '#';
		a.title = buttons[item].title;
		actions.push(a);
	});
	return actions;
}