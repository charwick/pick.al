"use strict";
document.addEventListener('DOMContentLoaded', () => {
	
	document.querySelectorAll('.editable').forEach(addEditIcon); //Make items editable
	
	//Action buttons
	const roster = document.querySelector('#roster tbody');
	if (roster) {
		for (const td of roster.querySelectorAll('.actions')) {
			td.append(...actionButtons(['edit', 'excuses', 'delete']));
			if ('excused' in td.parentNode.dataset) {
				const exc = new Date(td.parentNode.dataset.excused),
					modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1);
				td.querySelector('.excuses').title = "Excused until "+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
			}
		}
		
		roster.addEventListener('click', function(e) {
			if (!e.target.matches('.actions a, .score')) return;
			e.preventDefault();
			let tr = e.target.parentNode.parentNode;
			if (e.target.classList.contains('edit')) makeInput(tr);
			else if (e.target.classList.contains('save')) tr.save();
			else if (e.target.classList.contains('cancel')) tr.cancel();
			
			else if (e.target.classList.contains('delete')) {
				if (!confirm('Are you sure you want to delete the student '+tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent+'?')) return;
				const req = new XMLHttpRequest();
				req.open('GET', '../ajax.php?req=deletestudent&id='+tr.dataset.id, true);
				req.onload = function() {
					if (parseInt(this.response) != 1) req.onerror();
					else {
						tr.remove();
						const snum = document.getElementById('num_students');
						snum.textContent = parseInt(snum.textContent)-1;
					}
				};
				req.onerror = () => {  };
				req.send();
			
			} else if (e.target.classList.contains('excuses')) {
				if (tr.classList.contains('editing')) {
					clearPopups();
					return;
				}
				
				clearPopups();
				const popup = document.createElement('div'),
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
					
						const req = new XMLHttpRequest();
						req.open('GET', '../ajax.php?req=studentexcused&id='+tr.dataset.id+'&excused='+inp.value, true);
						req.onload = function() {
							if (parseInt(this.response) != 1) inp.classList.add('error');
							else {
								const exc = new Date(inp.value),
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
						req.onerror = () => { inp.classList.add('error'); };
						req.send();
					} else if (e2.key == "Escape") {
						e2.preventDefault();
						tr.classList.remove('editing', 'nottip')
						popup.remove();
					}
				});
			
			//Event detail modal
			} else if (e.target.classList.contains('score')) {
				tr = e.target.parentNode;
				const req = new XMLHttpRequest();
				req.open('GET', '../ajax.php?req=events&student='+tr.dataset.id, true);
				req.onload = function() {
					const events = JSON.parse(this.response),
						table = document.createElement('table'),
						tbody = document.createElement('tbody'),
						tfoot = document.createElement('tfoot');
					table.innerHTML = '<thead><tr><th>Date</th><th colspan="2">Result</th></tr></thead>';
					table.id = 'events';
					let num=0, den=0;
					for (const event of events) {
						const evtr = document.createElement('tr'),
							exc = new Date(event.date),
							modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000),
							res = {2:'good', 1:'meh', 0:'bad'}[event.result*2];
						evtr.eventid = event.id;
						evtr.innerHTML = '<td>'+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+modDate.clockTime()+'</td>'
							+'<td data-result="'+res+'"><div class="result-button '+res+'"></div><span class="numspan">'+event.result+'</span></td>'
							+'<td class="actions"></td>';
						evtr.querySelector('.actions').append(...actionButtons(['edit', 'delete']));
						tbody.append(evtr);
						num += event.result;
						den++;
					}
					
					//Event action buttons
					tbody.addEventListener('click', function(e) {
						if (!e.target.matches('.actions a')) return;
						e.preventDefault();
						
						const evrow = e.target.parentNode.parentNode,
							acttd = e.target.parentNode,
							restd = acttd.previousElementSibling,
							numspan = restd.querySelector('.numspan');
						
						//Edit event
						if (e.target.classList.contains('edit')) editEvent(evrow, restd.dataset.result);
						
						//Delete event
						else if (e.target.classList.contains('delete')) {
							if (confirm('Are you sure you want to delete this event?')) {
								const req = new XMLHttpRequest();
								req.open('GET', '../ajax.php?req=deleteevent&event='+evrow.eventid, true);
								req.onload = function() {
									evrow.remove();
									updateScore(tr, table);
								}
								req.onerror = () => {  };
								req.send();
							}
						
						//Cancel event edits
						} else if (e.target.classList.contains('cancel')) {
							if (evrow.eventid) {
								for (const b of restd.querySelectorAll('.unselected')) b.remove();
								evrow.classList.remove('editing');
								acttd.textContent = '';
								numspan.textContent = weights[restd.dataset.result];
								acttd.append(...actionButtons(['edit', 'delete']));
							} else {
								evrow.remove();
								tfoot.querySelector('.addnew a').classList.remove('disabled');
							}
						}
					});
					
					tfoot.innerHTML = '<tr><td>Total</td><td class="numtotal">'+(den ? Math.round(num/den*100)+'%' : '—')+'</td><td class="addnew"><a href="#">+</a></td></tr>';
					table.append(tbody, tfoot);
					
					//Add new event
					tfoot.querySelector('.addnew a').addEventListener('click', function(e) {
						e.preventDefault();
						if (this.classList.contains('disabled')) return;
						this.classList.add('disabled');
						
						const tr = document.createElement('tr'),
							date = new Date();
						tr.innerHTML = '<td>'+date.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+date.clockTime()+'</td><td></td><td class="actions"></td>';
						editEvent(tr);
						tbody.append(tr);
					});
					
					modal(tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent + ' <span class="num">'+events.length+'</span>', table).student = tr.dataset.id;
				};
				req.onerror = () => {  };
				req.send();
			}
		});
	}
	
	//Add new student
	const addStudent = document.querySelector('#roster .addnew a');
	if (addStudent) addStudent.addEventListener('click', function(e) {
		e.preventDefault();
		clearPopups();
		if (this.classList.contains('disabled')) return;
		this.classList.add('disabled');
		
		const tr = studentRow('','', ['cancel', 'save']);
		makeInput(tr);
		tr.cancel = function() {
			tr.remove();
			document.querySelector('#roster .addnew a').classList.remove('disabled');
		}
		tr.save = function() {
			const after = (response) => {
				tr.dataset.id = response;
				const snum = document.getElementById('num_students');
				snum.textContent = parseInt(snum.textContent)+1;
				document.querySelector('#roster .addnew a').classList.remove('disabled');
			}
			sendInfo(tr, 'addstudent', ['classid='+classid, 'fname='+tr.querySelector('.fname input').value, 'lname='+tr.querySelector('.lname input').value], after)
		}
	});
	
	//Handle CSV
	const csvElement = document.getElementById('csvfile');
	if (csvElement) {
		const label = document.querySelector('label[for="csvfile"]');
		label.addEventListener('dragenter', function(e) { this.classList.add('active'); });
		label.addEventListener('dragover', function(e) { e.preventDefault(); }); //Necessary to prevent the tab opening the dragged file
		label.addEventListener('dragleave', function(e) { this.classList.remove('active'); });
		label.addEventListener('drop', uploadCSV);
		csvElement.addEventListener('change', uploadCSV);
	}
	
	//Selector function change
	const selector = document.getElementById('selector');
	selector.oldValue = selector.value;
	selector.addEventListener('change', function(e) {
		if (document.body.classList.contains('admin-edit'))
			sendInfo(this.parentNode, 'updateclassinfo', ['class='+classid, 'k=selector', 'v='+this.value], selectorDesc);
		else selectorDesc();
	});
	selectorDesc();
	
	//Delete button
	const delform = document.getElementById('deleteform');
	if (delform) delform.addEventListener('submit', function(e) {
		if (!confirm('Are you sure you want to delete '+document.getElementById('name').firstChild.textContent+'?'))
			e.preventDefault();
	});
	
	//Validate new class
	const newform = document.querySelector('.admin-new #classinfo');
	if (newform) newform.addEventListener('submit', function (e) {
		let pass = true;
		for (const i of this.querySelectorAll('input')) {
			i.classList.remove('error');
			if (!i.value) {
				i.classList.add('error');
				pass = false;
			}
		}
		if (!pass) e.preventDefault();
	});
});

Date.prototype.clockTime = function() {
	let mins = this.getMinutes();
	if (mins < 10) mins = '0'+mins;
	return this.getHours()+':'+mins;
}

//=====================
// Modify HTML elements
//=====================

function addEditIcon(element) {
	const edit = actionButtons(['edit'])[0];
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		makeInput(element);
	});
	element.appendChild(edit);
}

var editables = {
		name: {placeholder: 'Class Name'},
		year: {min: 2023, max: 2100, placeholder: 'year'},
	},
	weights = {good: 1, meh: 0.5, bad: 0 };

//Turns an element into an input
function makeInput(element) {
	element.classList.add('editing');
	let inp;
	
	//Edit students
	if (element.tagName.toLowerCase() == 'tr') {
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
		if (element.dataset.inputtype=='select') {
			inp = document.createElement('select');
			let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
			for (const s of seasons) html += '<option value="'+s.toLowerCase()+'">'+s+'</option>';
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
	if (el.tagName.toLowerCase() != 'tr') addEditIcon(el);
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

//===================================
// Generate boilerplate HTML elements
//===================================

function infoElement(message, classname, tag) {
	const info = document.createElement(tag || 'p');
	info.classList.add('info');
	if (classname) info.classList.add(classname);
	info.textContent = message;
	return info;
}

function studentRow(col1, col2, actions=[]) {
	const stable = document.getElementById('roster').querySelector('tbody'),
		tr = document.createElement('tr');
	tr.innerHTML = '<td class="fname">'+col1+'</td><td class="lname">'+col2+'</td><td class="actions"></td><td class="nullscore">—</td>';
	tr.querySelector('.actions').append(...actionButtons(actions));
	stable.append(tr);
	return tr;
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

function modal(title, content) {
	const modalbg = document.createElement('div'),
		modal = document.createElement('div'),
		h2 = document.createElement('h2');
	modalbg.id = 'modalbg';
	modal.id = 'modal';
	h2.innerHTML = title;
	modal.append(h2, content);
	modalbg.addEventListener('click', function(e) {
		modal.remove();
		modalbg.remove();
		document.body.classList.remove('modal-active');
	});
	document.body.classList.add('modal-active');
	document.body.append(modalbg);
	document.body.append(modal);
	return modal;
}

function editEvent(row, selected) {
	const actionsCell = row.querySelector('.actions'),
		resultsCell = actionsCell.previousElementSibling;
	
	row.classList.add('editing');
	actionsCell.textContent = '';
	resultsCell.textContent = '';
	actionsCell.append(...actionButtons(['cancel']));
	const numspan = document.createElement('span');
	numspan.classList.add('numspan');
	if (selected) numspan.textContent = weights[selected];
	
	for (const i of ['good', 'meh', 'bad']) {
		const a = document.createElement('a');
		a.name = i;
		a.classList.add('result-button', i);
		if (i!=selected) a.classList.add('unselected');
		resultsCell.append(a);
		
		a.addEventListener('click', function(e) {
			const req = new XMLHttpRequest(),
				result = this.name;
			
			//Save event edits
			if (selected) req.open('GET', '../ajax.php?req=updateevent&event='+row.eventid+'&result='+weights[result], true);
			
			//Save new event
			else req.open('GET', '../ajax.php?req=writeevent&rosterid='+document.getElementById('modal').student+'&result='+weights[result], true);
			
			req.onload = function() {
				for (const b of resultsCell.querySelectorAll('.result-button')) {
					if (b.name == result) b.classList.remove('unselected');
					else b.remove();
				}
				numspan.textContent = weights[i];
				actionsCell.textContent = '';
				actionsCell.append(...actionButtons(['edit', 'delete']));
				resultsCell.dataset.result = result;
				row.classList.remove('editing');
				if (!selected) row.eventid = parseInt(this.response); //Save new event ID if necessary
				row.parentNode.parentNode.querySelector('.addnew a').classList.remove('disabled');
				updateScore(document.querySelector('#roster tr[data-id="'+document.getElementById('modal').student+'"]'), row.parentNode.parentNode);
			};
			
			req.onerror = () => {  };
			req.send();
		});
	}
	resultsCell.append(numspan);
}