"use strict";
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
	
	} else addSchemaButtons();

	//Action buttons
	const roster = document.querySelector('#roster tbody');
	if (roster) {
		makeSortable(document.getElementById('roster'), 'lname', 'desc');
		for (const td of roster.querySelectorAll('.actions')) {
			td.append(...actionButtons(['excuses']));
			if ('excused' in td.parentNode.dataset)
				td.querySelector('.excuses').title = "Excused through "+datetostr(td.parentNode.dataset.excused);
		}
	
		//Student details modal
		roster.addEventListener('click', function(e) {
			let tr = e.target;
			while (tr.tagName != 'TR') tr = tr.parentNode;
						
			const req = new XMLHttpRequest();
			req.open('GET', '../ajax.php?req=events&student='+tr.dataset.id, true);
			req.onload = function() {
				const events = JSON.parse(this.response),
					table = dce('table'),
					tbody = dce('tbody'),
					tfoot = dce('tfoot'),
					snote = dce('p', 'note'),
					excused = dce('p', 'excused'),
					actions = dce('div', 'actions'),
					fname = dce('span', 'fname'),
					lname = dce('span', 'lname'),
					numspan = dce('span', 'num'),
					h2 = dce('h2');
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
				snote.innerHTML = tr.querySelector('.note').innerHTML;
				actions.append(...actionButtons(['edit', 'excuses', 'delete']));

				fname.innerHTML = tr.querySelector('.fname').innerHTML;
				lname.innerHTML = tr.querySelector('.lname').innerHTML;
				numspan.textContent = events.length;
				h2.append(fname, ' ', lname, ' ', numspan);
				if ('excused' in tr.dataset)
					excused.innerHTML = 'Excused through <span data-date="'+tr.dataset.excused+'">'+datetostr(tr.dataset.excused)+'</span>';

				actions.addEventListener('click', function(e) {
					e.preventDefault();

					//Edit student
					if (e.target.classList.contains('edit')) {
						makeInput([fname, lname, snote], {
							placeholder: ['First Name', 'Last Name', 'Note'], required: [true, true, false],
							data: function(inputs) {
								return ['req=editstudent', 'student='+tr.dataset.id, 'fname='+inputs[0].value, 'lname='+inputs[1].value, 'note='+inputs[2].value];
							},
							actionsbox: actions,
							after: function(response) {
								tr.querySelector('.fname').innerHTML = fname.innerHTML;
								tr.querySelector('.lname').innerHTML = lname.innerHTML;
								tr.querySelector('.note').innerHTML = snote.innerHTML;
							}
						});
					}

					//Delete student
					else if (e.target.classList.contains('delete')) {
						if (!confirm('Are you sure you want to remove '+fname.textContent+' '+lname.textContent+' from the class roster?')) return;
						const req = new XMLHttpRequest();
						req.open('GET', '../ajax.php?req=deletestudent&id='+tr.dataset.id, true);
						req.onload = function() {
							if (parseInt(this.response) != 1) req.onerror();
							else {
								//Delete recent participation events
								const evrows = document.querySelectorAll('#recentevents tr[data-student="'+tr.dataset.id+'"]');
								for (const evrow of evrows) evrow.remove();

								tr.remove(); //Delete roster row
								const snum = document.getElementById('num_students');
								snum.textContent = parseInt(snum.textContent)-1;
								document.querySelector('dialog').remove();
							}
						};
						req.onerror = () => {  };
						req.send();

					} else if (e.target.classList.contains('save')) fname.save();
					else if (e.target.classList.contains('cancel')) fname.cancel();

					//Set Excused Absences
					else if (e.target.classList.contains('excuses')) {
						if (!excused.textContent) excused.innerHTML = 'Excused through <span></span>';
						const qspan = excused.querySelector('span');

						const xacts = dce('span','actions');
						function clearExcuse() {
							excused.textContent = '';
							delete tr.dataset.excused;
							tr.querySelector('.lname .excuses')?.remove();
						}
						xacts.append(...actionButtons(['save', 'cancel', 'delete']));
						excused.append(xacts);
						xacts.addEventListener('click', function(e) {
							e.preventDefault();
							if (e.target.classList.contains('cancel')) qspan.cancel();
							else if (e.target.classList.contains('save')) qspan.save();
							else if (e.target.classList.contains('delete')) {
								const inp = qspan.querySelector('input');
								inp.value = '';
								inp.validate = false;
								qspan.save();
								clearExcuse();
							}
						});

						function clearacts() {
							xacts.remove();
							if (!('excused' in tr.dataset)) excused.textContent = '';
						};
						function updateRosterExcuse(response) {
							const exc = new Date(qspan.dataset.date),
								now = new Date(),
								modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1); //Be inclusive of the set day. Also timezone offset.
							if (modDate > now) {
								tr.dataset.excused = qspan.dataset.date;
								const through = "Excused through "+modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
								let excbut = tr.querySelector('.lname .excuses');
								if (!excbut) {
									excbut = dce('span', 'excuses');
									tr.querySelector('.lname').append(excbut);
								}
								excbut.title = through;
							} else clearExcuse();
							clearacts();
						}
						makeInput(qspan, {
							data: (inps) => { return ['req=studentexcused', 'id='+tr.dataset.id, 'excused='+inps[0].value]; },
							actions: null,
							type: 'date',
							blur: false, //Don't save on blur since we're adding action buttons
							after: updateRosterExcuse, cancel: clearacts
						});
					}
				});
				
				//Add new event
				tfoot.querySelector('.addnew a').addEventListener('click', function(e) {
					e.preventDefault();
					if (this.classList.contains('disabled')) return;
					this.classList.add('disabled');
					
					const evtr = dce('tr'),
						date = new Date();
					evtr.dataset.student = tr.dataset.id;
					evtr.innerHTML = '<td>'+date.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+date.clockTime()+'</td><td></td><td class="actions"></td>';
					editEvent(evtr);
					tbody.prepend(evtr);
				});
				
				modal(h2, actions, snote, excused, table).student = tr.dataset.id;
			};
			req.onerror = () => {  };
			req.send();
		});

		//CSV Upload
		document.querySelector('.uploadcsv a').addEventListener('click', function(e) {
			e.preventDefault();
			const content = dce('div'),
				h2 = dce('h2');
			h2.textContent = 'Upload Students';
			content.innerHTML = '<p>Upload a CSV file with columns labelled <code>fname</code>, <code>lname</code>, and (optionally) <code>note</code> in the header row.</p>'
				+'<p><label for="csvfile">Click here or drag a CSV file to upload</label><input type="file" id="csvfile" name="csvfile" accept="text/csv"></p>';
			
			const csvElement = content.querySelector('#csvfile'),
				label = content.querySelector('label[for="csvfile"]');
			label.addEventListener('dragenter', function(e) { this.classList.add('active'); });
			label.addEventListener('dragover', function(e) { e.preventDefault(); }); //Necessary to prevent the tab opening the dragged file
			label.addEventListener('dragleave', function(e) { this.classList.remove('active'); });
			label.addEventListener('drop', uploadCSV);
			csvElement.addEventListener('change', uploadCSV);
			modal(h2, content);
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

		const title = dce('h2'),
			h2 = dce('h2'),
			note = dce('input', 'note'),
			actions = dce('div', ['actions', 'expand']);
		note.placeholder = 'Note';
		title.textContent = 'New Student';
		note.type = 'text';
		h2.innerHTML = '<input type="text" class="fname" placeholder="First Name" required="true" /> <input type="text" class="lname" placeholder="Last Name" required="true" />';
		actions.append(...actionButtons(['save', 'cancel']));
		const fname = h2.querySelector('.fname'),
			lname = h2.querySelector('.lname');
		
		function studentSave() {
			if (validate([fname, lname, note])) {
				const req = new XMLHttpRequest();
				req.open('GET', '../ajax.php?req=addstudent&classid='+classid+'&fname='+fname.value+'&lname='+lname.value+'&note='+note.value, true);
				req.onload = function() {
					const sid = parseInt(this.response);
					if (!sid) req.onerror();
					else {
						studentRow(sid, fname.value, lname.value, note.value);
						const snum = document.getElementById('num_students'),
							roster = document.getElementById('roster');
						roster.sort(roster.sortby, roster.direction);
						snum.textContent = parseInt(snum.textContent)+1; //Increment roster counter
						document.querySelector('dialog').close();
					}
				};
				req.onerror = () => {
					if (errorfn) errorfn(this.response, inputs);
					else for (const inp of inputs) inp.classList.add('error');
				};
				req.send();
			}
		}
		
		for (const inp of [fname, lname, note]) inp.addEventListener('keydown', function(e2) {
			if (e2.key == "Enter") {
				e2.preventDefault();
				studentSave();
			}
		});

		actions.addEventListener('click', function(e) {
			e.preventDefault();
			if (e.target.classList.contains('cancel')) document.querySelector('dialog').close();
			else if (e.target.classList.contains('save')) studentSave();
		});

		modal(title, actions, h2, note);
		fname.focus();
	});
	
	//Validate new class
	document.querySelector('.admin-new #classinfo')?.addEventListener('submit', function (e) {
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

	//Schema select
	document.getElementById('schemaselect').addEventListener('click', function(e) {
		if (!e.target.classList.contains('edit')) return;
		e.preventDefault();
		const req = new XMLHttpRequest(),
			schemaselect = this;
		req.open('GET', '../ajax.php?req=schemae&class='+classid, true);
		req.onload = function() {
			const actions = schemaselect.querySelector('.actions'),
				select = dce('select');
			select.stop = false;
			actions.textContent = '';
			// actions.append(...actionButtons(['cancel', 'save']));
			
			let html = '';
			for (const schema of JSON.parse(this.response))
				html += '<option value="'+schema.name+'"'+(schema.compatible ? '' : ' disabled')+(schema.name==schemaselect.dataset.schemaname ? ' selected' : '')+'>'+schema.name+'</option>'
			html += '<option disabled>Custom schemae coming soon</option>';
			select.innerHTML = html;
			schemaselect.insertBefore(select, schemaselect.querySelector('.schemalist'));

			select.save = function() {
				const savereq = new XMLHttpRequest();
				savereq.open('GET', '../ajax.php?req=editschema&class='+classid+'&schema='+select.value, true);
				savereq.onload = function() {
					const response = JSON.parse(this.response),
						oldschema = schemae[schema];
					document.querySelector('.schema-css').textContent = response.css;
					window.schema = select.value;
					window.schemae[schema] = response.weights;
					schemaselect.dataset.schemaname = select.value;

					const inv = invertSchema();
					for (const el of document.querySelectorAll('[data-schema]')) {
						el.dataset.schema = inv[oldschema[el.dataset.schema].value];
						el.textContent = schemae[schema][el.dataset.schema].text;
					}
					for (const el of document.querySelectorAll('td[data-result]'))
						el.dataset.result = inv[oldschema[el.dataset.result].value];
					select.solidify();
				}
				savereq.send();
			}
			select.solidify = function() {
				select.remove();
				addSchemaButtons();
				actions.append(...actionButtons(['edit']));
			}
			function onchange() {
				if (select.value==schemaselect.dataset.schemaname) select.solidify();
				else select.save();
			}
			select.addEventListener('keydown', function(e) {
				if (e.key == "Enter") { select.stop = true; onchange(); }
				else if (e.key == "Escape") { select.stop = true; select.solidify(); }
			});
			select.addEventListener('blur', function(e) {
				if (select.stop) return; //Because Chrome fires both the blur and the keydown
				onchange();
			});
			select.focus();
		};
		req.send();
	});
	document.querySelector('#schemaselect').addEventListener('change', function(e) { addSchemaButtons(); });

});

function addSchemaButtons() {
	const target = document.getElementById('schemaselect'),
		schema = target.querySelector('select')?.value ?? window.schema;

	function drawButtons(html) {
		const cont = target.querySelector('.schemalist');
		cont.textContent = '';
		cont.innerHTML = html;
	}
	
	if (schema in schemabuttons) drawButtons(schemabuttons[schema]);
	else {
		const req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?req=getschemabuttons&schema='+schema, true);
		req.onload = function() {
			schemabuttons[schema] = this.response;
			drawButtons(this.response);
		}
		req.send();
	}
}

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
			if (sortby!='score') {
				const atext = a.querySelector('.'+sortby).textContent, btext = b.querySelector('.'+sortby).textContent;
				if (!atext && btext) return (desc ? 1 : -1);
				else if (atext && !btext) return (desc ? -1 : 1);
				else return atext.localeCompare(btext) * (desc ? 1 : -1);
			} else {
				const regex = /^(\d+(\.\d+)?)\/(\d+)\s+\((\d+)%?\)$/;
				let vals = [];
				for (const element of [a, b]) {
					const text = element.querySelector('.'+sortby).textContent;
					vals.push(text=='' ? -1 : parseInt(text.match(regex)[4]));
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
	const evcell = document.querySelector('dialog td.numtotal'),
		rostercell = document.querySelector('#roster tr[data-id="'+student+'"] .score'),
		scoretext = rostercell.textContent;
	let num, den;
	
	if (scoretext) {
		const match = scoretext.match(/^(\d+(\.\d+)?)\/(\d+)\s+\(\d+%?\)$/);
		num = parseFloat(match[1]);
		den = parseInt(match[3]);
	} else {
		num = 0; den = 0;
	}

	if (opts.action=='delete') {
		den--;
		num -= schemae[schema][opts.oldval].value;
	} else if (opts.action=='new') {
		den++;
		num += schemae[schema][opts.newval].value;
	} else if (opts.action=='update') num += schemae[schema][opts.newval].value - schemae[schema][opts.oldval].value;

	rostercell.textContent = den ? num+'/'+den+' ('+Math.round(num/den*100)+'%)' : '';
	document.getElementById('recentevents').style.display = document.querySelector('#recentevents tbody').children.length ? 'block' : 'none';

	//Update modal totals if necessary
	if (evcell) {
		evcell.textContent = den ? Math.round(num/den*100)+'%' : '—'
		const spannum = document.querySelector('dialog span.num');
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
			restd.classList.remove('editing');
			acttd.textContent = '';
			numspan.textContent = schemae[schema][restd.dataset.result].value;
			acttd.append(...actionButtons(['edit', 'delete']));
		} else {
			evrow.parentNode.parentNode.querySelector('tfoot')?.querySelector('.addnew a').classList.remove('disabled');
			evrow.remove();
		}
	}
}

//===================================
// Generate boilerplate HTML elements
//===================================

function infoElement(message, classname, tag) {
	const info = dce(tag || 'p', 'info');
	if (classname) info.classList.add(classname);
	info.textContent = message;
	return info;
}

function studentRow(id, col1, col2, col3) {
	const tr = dce('tr', 'new');
	tr.dataset.id = id;
	tr.innerHTML = '<td class="fname">'+col1+'</td><td class="lname">'+col2+'</td><td class="note">'+(col3 ?? '')+'</td><td class="score"></td>';
	document.getElementById('roster').querySelector('tbody').append(tr);
	setTimeout(() => { //Flash row
		tr.style.transition = '1s background';
		tr.classList.remove('new');
		setTimeout(() => { tr.style.transition = null; }, 1000);
	}, 250);
	return tr;
}

function eventRow(event, namecol) {
	const evtr = dce('tr'),
		exc = 'date' in event ? new Date(event.date) : new Date(), //Apparently it's impossible to pass any value to Date() that makes it now
		modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000),
		res = invertSchema()[event.result];
	evtr.dataset.id = event.id;
	evtr.dataset.student = event.student;

	let tds = [];
	for (let i=0; i<4; i++) tds.push(dce('td'));
	tds[0].textContent = modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+modDate.clockTime();
	tds[2].dataset.result = res;
	tds[2].innerHTML = '<div class="result-button" data-schema="'+res+'">'+schemae[schema][res].text+'</div><span class="numspan">'+event.result+'</span>';
	tds[3].classList.add('actions');
	tds[3].append(...actionButtons(['edit', 'delete']));
	if (namecol) tds[1].innerHTML = event.fname+' '+event.lname; //Use InnerHTML so the HTML entities evaluate
	else tds.splice(1,1);
	evtr.append(...tds);
	return evtr;
}

function modal(...content) {
	const modal = dce('dialog', 'transit'),
		mwrap = dce('div');
	mwrap.append(...content);
	modal.append(mwrap);
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
	modal.addEventListener('close', function(e) { modal.remove(); });
	modal.showModal();
	modal.classList.remove('transit');
	document.activeElement.blur() //The + button gets focused for some reason
	return modal;
}

function editEvent(row, selected) {
	const actionsCell = row.querySelector('.actions'),
		resultsCell = actionsCell.previousElementSibling;
	
	resultsCell.classList.add('editing');
	actionsCell.textContent = '';
	resultsCell.textContent = '';
	actionsCell.append(...actionButtons(['cancel']));
	const numspan = dce('span', 'numspan');
	if (selected) numspan.textContent = schemae[schema][selected].value;
	
	for (const i in schemae[schema]) {
		const a = dce('a', 'result-button');
		a.textContent = schemae[schema][i].text;
		a.dataset.schema = i;
		if (i!=selected) a.classList.add('unselected');
		resultsCell.append(a);
		
		a.addEventListener('click', function(e) {
			const req = new XMLHttpRequest(),
				result = this.dataset.schema;
			
			//Save event edits
			if (selected) req.open('GET', '../ajax.php?req=updateevent&event='+row.dataset.id+'&result='+schemae[schema][result].value, true);
			
			//Save new event
			else req.open('GET', '../ajax.php?req=writeevent&rosterid='+document.querySelector('dialog').student+'&result='+schemae[schema][result].value, true);
			
			req.onload = function() {
				for (const b of resultsCell.querySelectorAll('.result-button')) {
					if (b.dataset.schema == result) b.classList.remove('unselected');
					else b.remove();
				}
				numspan.textContent = schemae[schema][i].value;
				actionsCell.textContent = '';
				actionsCell.append(...actionButtons(['edit', 'delete']));
				const oldval = resultsCell.dataset.result;
				resultsCell.dataset.result = result;
				resultsCell.classList.remove('editing');
				let opts;
				
				//Add to or update class events table
				if (!selected) {
					opts = {action: 'new', newval: result};
					row.dataset.id = parseInt(this.response); //Save new event ID if necessary
					const studentRow = document.querySelector('#roster tr[data-id="'+row.dataset.student+'"]');
					document.querySelector('#recentevents tbody').prepend(eventRow({
						id: row.dataset.id,
						student: row.dataset.student,
						fname: studentRow.querySelector('.fname').innerHTML,
						lname: studentRow.querySelector('.lname').innerHTML,
						result: schemae[schema][result].value
					}, true))
				} else {
					opts = {action: 'update', oldval: oldval, newval: result};
					const recent = document.querySelector('#recentevents tr[data-id="'+row.dataset.id+'"] td[data-result]');
					if (recent) {
						recent.dataset.result = result;
						recent.querySelector('.result-button').dataset.schema = result;
						recent.querySelector('.result-button').textContent = schemae[schema][result].text;
						recent.querySelector('.numspan').textContent = schemae[schema][result].value;
					}
				}
				
				row.parentNode.parentNode.querySelector('.addnew a')?.classList.remove('disabled');
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
		csvElement = document.getElementById('csvfile');
	if (files.length == 0) return;
	document.querySelector('.info')?.remove();
	
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
				const info = infoElement("Uploaded "+response.length+" students"),
					roster = document.getElementById('roster');
				document.querySelector('#students h2').after(info);
				for (const row of response) studentRow(row['id'], row['fname'], row['lname'], row['note']);
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
				document.getElementsByTagName('dialog')[0].remove();
				roster.sort(roster.sortby, roster.direction);
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
	if (file.type.toLowerCase().includes('csv') || file.name.toLowerCase().slice(-4) == '.csv') reader.readAsText(file);
	else {
		const error = infoElement("This file isn't a CSV!", 'error');
		csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
	}
}