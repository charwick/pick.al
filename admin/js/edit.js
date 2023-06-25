"use strict";
var weights = {good: 1, meh: 0.5, bad: 0 };
document.addEventListener('DOMContentLoaded', () => {

	//Make class info editable
	if (document.body.classList.contains('admin-edit')) {
		const title = document.getElementById('name');
		function infoData(inps) { return ['req=updateclassinfo', 'class='+classid, 'k='+inps[0].name, 'v='+inps[0].value]; };

		makeEditable(title, {placeholder: 'Class Name', data: infoData})
		makeEditable(document.getElementById('semester'), {type: 'select', opts: ['Spring', 'Fall', 'Winter', 'Summer'], data: infoData})
		makeEditable(document.getElementById('year'), {type: 'number', min: 2023, max: 2100, placeholder: 'Year', data: infoData})
		makeEditable(document.getElementById('activeuntil'), {type: 'date', data: infoData})

		//Delete button
		title.querySelector('.actions').append(...actionButtons(['delete']));
		title.addEventListener('click', function(e) {
			e.preventDefault();
			if (!e.target.classList.contains('delete')) return;
			const delform = document.getElementById('deleteform');
			if (confirm('Are you sure you want to delete '+title.textContent+' and all its students?')) delform.submit();
		});
	}

	//Action buttons
	const roster = document.querySelector('#roster tbody');
	if (roster) {
		makeSortable(document.getElementById('roster'), 'lname', 'desc');
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
			let tr = e.target.parentNode.parentNode,
				td_fn = tr.querySelector('.fname'),
				td_ln = tr.querySelector('.lname');
			if (e.target.classList.contains('edit'))
				makeInput([td_fn, td_ln], {placeholder: ['First Name', 'Last Name'], data: function(inputs) {
					return ['req=editstudent', 'student='+inputs[0].parentNode.parentNode.dataset.id, 'fname='+inputs[0].value, 'lname='+inputs[1].value];
				}});
			else if (e.target.classList.contains('save')) td_fn.save();
			else if (e.target.classList.contains('cancel')) td_fn.cancel();
			
			else if (e.target.classList.contains('delete')) {
				if (!confirm('Are you sure you want to delete the student '+tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent+'?')) return;
				const req = new XMLHttpRequest();
				req.open('GET', '../ajax.php?req=deletestudent&id='+tr.dataset.id, true);
				req.onload = function() {
					if (parseInt(this.response) != 1) req.onerror();
					else {
						const evrows = document.querySelectorAll('#recentevents tr[data-student="'+tr.dataset.id+'"]');
						for (const evrow of evrows) evrow.remove();
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
					table.classList.add('events');
					let num=0, den=0;
					for (const event of events) {
						event.student = tr.dataset.id;
						tbody.append(eventRow(event, false));
						num += event.result;
						den++;
					}
					
					tbody.addEventListener('click', eventActions); //Event action buttons
					tfoot.innerHTML = '<tr><td>Total</td><td class="numtotal">'+(den ? Math.round(num/den*100)+'%' : '—')+'</td><td class="addnew"><a href="#">+</a></td></tr>';
					table.append(tbody, tfoot);
					
					//Add new event
					tfoot.querySelector('.addnew a').addEventListener('click', function(e) {
						e.preventDefault();
						if (this.classList.contains('disabled')) return;
						this.classList.add('disabled');
						
						const evtr = document.createElement('tr'),
							date = new Date();
						evtr.dataset.student = tr.dataset.id;
						evtr.innerHTML = '<td>'+date.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+date.clockTime()+'</td><td></td><td class="actions"></td>';
						editEvent(evtr);
						tbody.prepend(evtr);
					});
					
					modal(tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent + ' <span class="num">'+events.length+'</span>', table).student = tr.dataset.id;
				};
				req.onerror = () => {  };
				req.send();
			}
		});

		//CSV Upload
		document.querySelector('.uploadcsv a').addEventListener('click', function(e) {
			e.preventDefault();
			let content = document.createElement('div');
			content.innerHTML = '<p>Upload a CSV file with columns labelled <code>fname</code> and <code>lname</code> in the header row.</p>'
				+'<p><label for="csvfile">Click here or drag a CSV file to upload</label><input type="file" id="csvfile" name="csvfile" accept="text/csv"></p>';
			
			const csvElement = content.querySelector('#csvfile'),
				label = content.querySelector('label[for="csvfile"]');
			label.addEventListener('dragenter', function(e) { this.classList.add('active'); });
			label.addEventListener('dragover', function(e) { e.preventDefault(); }); //Necessary to prevent the tab opening the dragged file
			label.addEventListener('dragleave', function(e) { this.classList.remove('active'); });
			label.addEventListener('drop', uploadCSV);
			csvElement.addEventListener('change', uploadCSV);
			modal('Upload Students', content);
		});
	}

	//Class recent events
	let classEvents = document.querySelector('#recentevents .events tbody');
	if (classEvents) {
		for (const event of events) classEvents.append(eventRow(event, true));
		classEvents.addEventListener('click', eventActions);
		if (!classEvents.children.length) document.getElementById('recentevents').style.display = 'none';
	}
	
	//Add new student
	const addStudent = document.querySelector('#roster .addnew a');
	if (addStudent) addStudent.addEventListener('click', function(e) {
		e.preventDefault();
		clearPopups();
		if (this.classList.contains('disabled')) return;
		this.classList.add('disabled');
		
		const tr = studentRow('','', ['cancel', 'save']),
			tds = [tr.querySelector('.fname'), tr.querySelector('.lname')],
			after = (response) => {
				tr.dataset.id = response;
				const snum = document.getElementById('num_students');
				snum.textContent = parseInt(snum.textContent)+1;
				document.querySelector('#roster .addnew a').classList.remove('disabled');
				tr.querySelector('.nullscore').classList.add('score');
			}
		makeInput(tds, {placeholder: ['First Name', 'Last Name'], actions: ['edit', 'excuses', 'delete'], after: after, data: function(inputs) { return ['req=addstudent', 'classid='+classid, 'fname='+inputs[0].value, 'lname='+inputs[1].value]; }});
		for (const td of tds) {
			td.cancel = function() {
				tr.remove();
				document.querySelector('#roster .addnew a').classList.remove('disabled');
			}
		}
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

function makeSortable(table, defaultsort, defaultdesc) {
	table.classList.add('sortable');

	table.sort = function(sortby, desc) {
		table.direction = desc;
		table.sortby = sortby;

		for (const th of table.querySelectorAll('th')) {
			if (th.getAttribute('class')==sortby) th.dataset.sort = desc ? 'desc' : 'asc';
			else delete th.dataset.sort;
		}
		const tbody = table.querySelector('tbody');
		let rows = Array.from(tbody.querySelectorAll('tr'));
		rows.sort(function(a,b) {
			if (sortby!='score') return a.querySelector('.'+sortby).textContent.localeCompare(b.querySelector('.'+sortby).textContent) * (desc ? 1 : -1);
			else {
				const regex = /^(\d+(\.\d+)?)\/(\d+)\s+\((\d+)%?\)$/;
				let vals = [];
				for (const element of [a, b]) {
					const text = element.querySelector('.'+sortby).textContent;
					vals.push(text=='—' ? -1 : parseInt(text.match(regex)[4]));
				}
				return (vals[1] - vals[0])  * (desc ? 1 : -1);
			}
		});
		for (const row of rows) tbody.append(row);
	}

	table.sort(defaultsort, defaultdesc);

	table.querySelector('thead').addEventListener('click', function(e) {
		const sortby = e.target.getAttribute('class');
		let desc = true;
		if (sortby == table.sortby) desc = !table.direction;
		table.sort(sortby, desc);
	});
}

function updateScore(student, opts) {
	const evcell = document.querySelector('#modal td.numtotal'),
		rostercell = document.querySelector('#roster tr[data-id="'+student+'"] .score'),
		scoretext = rostercell.textContent;
	let num, den;
	
	if (scoretext=='—') {
		num = 0; den = 0;
	} else {
		const match = scoretext.match(/^(\d+(\.\d+)?)\/(\d+)\s+\(\d+%?\)$/);
		num = parseFloat(match[1]);
		den = parseInt(match[3]);
	}

	if (opts.action=='delete') {
		den--;
		num -= weights[opts.oldval];
	} else if (opts.action=='new') {
		den++;
		num += weights[opts.newval];
	} else if (opts.action=='update') num += weights[opts.newval] - weights[opts.oldval];

	if (den) {
		rostercell.textContent = num+'/'+den+' ('+Math.round(num/den*100)+'%)';
		rostercell.classList.remove('nullscore');
	} else {
		rostercell.textContent = '—';
		rostercell.classList.add('nullscore');
	}
	document.getElementById('recentevents').style.display = document.querySelector('#recentevents tbody').children.length ? 'block' : 'none';

	//Update modal totals if necessary
	if (evcell) {
		evcell.textContent = den ? Math.round(num/den*100)+'%' : '—'
		const spannum = document.querySelector('#modal span.num');
		if (spannum) spannum.textContent = den;
	}
}

function eventActions(e) {
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
			req.open('GET', '../ajax.php?req=deleteevent&event='+evrow.dataset.id, true);
			req.onload = function() {
				const student = evrow.dataset.student,
					result = evrow.querySelector('td[data-result]').dataset.result,
					evrows = document.querySelectorAll('.events tr[data-id="'+evrow.dataset.id+'"]'); //Remove it from the recents list too if applicable
				for (const row of evrows) row.remove();
				updateScore(student, {action: 'delete', oldval: result});
			}
			req.onerror = () => {  };
			req.send();
		}
	
	//Cancel event edits
	} else if (e.target.classList.contains('cancel')) {
		if (evrow.dataset.id) {
			for (const b of restd.querySelectorAll('.unselected')) b.remove();
			evrow.classList.remove('editing');
			acttd.textContent = '';
			numspan.textContent = weights[restd.dataset.result];
			acttd.append(...actionButtons(['edit', 'delete']));
		} else {
			const tfoot = evrow.parentNode.parentNode.querySelector('tfoot');
			if (tfoot) tfoot.querySelector('.addnew a').classList.remove('disabled');
			evrow.remove();
		}
	}
}

document.addEventListener('keyup', function(e) {
	if (e.code=='Escape') clearModal();
});

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

function eventRow(event, namecol) {
	const evtr = document.createElement('tr'),
		exc = 'date' in event ? new Date(event.date) : new Date(), //Apparently it's impossible to pass any value to Date() that makes it now
		modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000),
		res = {2:'good', 1:'meh', 0:'bad'}[event.result*2];
	evtr.dataset.id = event.id;
	evtr.dataset.student = event.student;
	evtr.innerHTML = '<td>'+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+modDate.clockTime()+'</td>'
		+(namecol ? '<td>'+event.fname+' '+event.lname+'</td>' : '')
		+'<td data-result="'+res+'"><div class="result-button '+res+'"></div><span class="numspan">'+event.result+'</span></td>'
		+'<td class="actions"></td>';
	evtr.querySelector('.actions').append(...actionButtons(['edit', 'delete']));
	return evtr;
}

function modal(title, content) {
	const modalbg = document.createElement('div'),
		modal = document.createElement('div'),
		h2 = document.createElement('h2');
	modalbg.id = 'modalbg';
	modal.id = 'modal';
	h2.innerHTML = title;
	modal.append(h2, content);
	modalbg.addEventListener('click', clearModal);
	document.body.classList.add('modal-active');
	document.body.append(modalbg);
	document.body.append(modal);
	return modal;
}

function clearModal() {
	if (document.body.classList.contains('modal-active')) {
		document.body.classList.remove('modal-active');
		document.getElementById('modal').remove();
		document.getElementById('modalbg').remove();
	}
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
			if (selected) req.open('GET', '../ajax.php?req=updateevent&event='+row.dataset.id+'&result='+weights[result], true);
			
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
				const oldval = resultsCell.dataset.result;
				resultsCell.dataset.result = result;
				row.classList.remove('editing');
				let opts;
				
				//Add to or update class events table
				if (!selected) {
					opts = {action: 'new', newval: result};
					row.dataset.id = parseInt(this.response); //Save new event ID if necessary
					const studentRow = document.querySelector('#roster tr[data-id="'+row.dataset.student+'"]');
					document.querySelector('#recentevents tbody').prepend(eventRow({
						id: row.dataset.id,
						student: row.dataset.student,
						fname: studentRow.querySelector('.fname').textContent,
						lname: studentRow.querySelector('.lname').textContent,
						result: weights[result]
					}, true))
				} else {
					opts = {action: 'update', oldval: oldval, newval: result};
					const recent = document.querySelector('#recentevents tr[data-id="'+row.dataset.id+'"] td[data-result]');
					if (recent) {
						recent.dataset.result = result;
						recent.querySelector('.result-button').setAttribute('class', 'result-button '+result);
						recent.querySelector('.numspan').textContent = weights[result];
					}
				}
				
				const addnew = row.parentNode.parentNode.querySelector('.addnew a');
				if (addnew) addnew.classList.remove('disabled');
				updateScore(row.dataset.student, opts);
			};
			
			req.onerror = () => {  };
			req.send();
		});
	}
	resultsCell.append(numspan);
}

function uploadCSV(e) {
	e.preventDefault();
	const files = this.files || e.dataTransfer.items,
		reader = new FileReader(),
		csvElement = document.getElementById('csvfile'),
		error = document.querySelector('.info');
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
			const response = JSON.parse(this.response);
			if (!response) {
				const error = infoElement("No valid students found. Make sure the headers are correct.", 'error');
				csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
			} else {
				const info = infoElement("Uploaded "+response.length+" students")
				document.querySelector('#students h2').after(info);
				for (const row of response) {
					const tr = studentRow(row['fname'], row['lname'], ['edit', 'excuses', 'delete']);
					tr.querySelector('.nullscore').classList.add('score');
					tr.dataset.id = row['id'];
				}
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
				clearModal();
			}
		};
		req.onerror = function() {
			const error = infoElement('There was an error uploading this CSV.', 'error');
			csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
		}
		req.send(formData);
	};
	let file = files[0] instanceof File ? files[0] : files[0].getAsFile(); //Dragging gives us a DataTransferItem object instead of a file
	document.querySelector('label[for="csvfile"]').classList.remove('active');
	if (!file.type.includes('csv')) {
		const error = infoElement("This file isn't a CSV!", 'error');
		csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
	} else reader.readAsText(file);
}