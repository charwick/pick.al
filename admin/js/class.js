"use strict";
document.addEventListener('DOMContentLoaded', () => {

	//Make class info editable
	if (document.body.classList.contains('admin-edit')) {
		const title = document.getElementById('name'),
			classedit = new makeInput(title.querySelector('.actions'));

		const schemaOpts = [];
		for (const s of allschemae) schemaOpts.push([s.id, s.name, s.compatible]);
		schemaOpts.push(null);
		schemaOpts.push(['__addnew__','Add new schema']);

		classedit.addElement(title, {placeholder: 'Class Name'});
		classedit.addElement(document.getElementById('semester'), {type: 'select', opts: ['Spring', 'Fall', 'Winter', 'Summer']});
		classedit.addElement(document.getElementById('year'), {type: 'number', min: 2023, max: 2100, placeholder: 'Year'});
		classedit.addElement(document.getElementById('activeuntil'), {type: 'date'});
		classedit.addElement(document.getElementById('selectgoeshere'), {type: 'select', opts: schemaOpts});
		classedit.data = inputs => ({req: 'updateclassinfo', class: classid, title: inputs[0].value, semester: inputs[1].value, year: inputs[2].value, activeuntil: inputs[3].value, schema: inputs[4].value});
		classedit.after = (response, vals) => {
			document.querySelector('.schema-css').textContent = response.css;
			document.getElementById('selectgoeshere').textContent = '';
			const oldmax = window.schemae[window.schema].limits[1];
			window.schema = vals[4];
			window.schemae[window.schema] = {id: window.schema, items: response.weights, limits: response.limits};
			for (const td of document.querySelectorAll('#roster tbody td.score')) updateScore(td, {action: 'schema', oldmax: oldmax});
		}
		classedit.cancelfunc = () => {
			addSchemaButtons();
			document.getElementById('selectgoeshere').textContent = '';
		}

		//Delete button
		title.addEventListener('click', function(e) {
			e.preventDefault();
			if (!e.target.classList.contains('delete')) return;
			const delform = document.getElementById('deleteform');
			if (confirm('Are you sure you want to delete '+title.textContent.trim()+' and all its students?')) delform.submit();
		});
	
	} else addSchemaButtons();

	document.querySelector('#schemaselect').addEventListener('change', addSchemaButtons);

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
			let tr = e.target.closest('TR');

			const fname = markup({tag: 'span', attrs: {class: 'fname'}, children: [tr.querySelector('.fname').textContent]}),
				lname = markup({tag: 'span', attrs: {class: 'lname'}, children: [tr.querySelector('.lname').textContent]}),
				smodal = modal(
					{tag: 'h2', children: [fname, ' ', lname, ' ']},
					{tag: 'div', attrs: {class: 'loader'}}
				);

			function studentmodal(events) {
				const tbody = markup({tag: 'tbody'}),
					snote = markup({tag: 'p', attrs: {class: 'note'}, children: tr.querySelector('.note').innerHTML}),
					excused = markup({tag: 'p', attrs: {class: 'excused'}, children: ('excused' in tr.dataset ? ['Excused through ', {tag: 'span', attrs: {'data-date': tr.dataset.excused}, children: [datetostr(tr.dataset.excused)]}] : [])}),
					actions = markup({tag: 'div', attrs: {class: 'actions'}, children: actionButtons(['edit', 'excuses', 'delete'])}),
					nevents = markup({tag: 'span', attrs: {class: 'num'}, children: [events.length]});
				smodal.querySelector('h2').append(nevents);
				let num=0, den=0;
				for (const event of events) {
					event.student = tr.dataset.id;
					tbody.append(eventRow(event, false));
					num += event.result;
					den++;
				}
				const table = markup({tag: 'table', attrs: {class: 'events'}, children: [
						{tag: 'thead', children: [{tag: 'tr', children: [
							{tag: 'th', attrs: {class: 'm-date'}, children: ['Date']},
							{tag: 'th', attrs: {colspan: 2}, children: ['Result']}
						]}]}, tbody,
						{tag: 'tfoot', children: [{tag: 'tr', children: [
							{tag: 'td', children: ['Total']},
							{tag: 'td', attrs: {class: 'numtotal'}, children: [(den ? Math.round(num/den*100)+'%' : '—')]},
							{tag: 'td', attrs: {class: 'addnew'}, children: [{tag: 'a', attrs: {href: '#'}, children: ['+']}]}
						]}]}
					]});
				
				tbody.addEventListener('click', eventActions); //Event action buttons
				makeSortable(table, 'm-date', true);
				
				const studentedit = new makeInput(actions);
				studentedit.addElement(fname, {placeholder: 'First Name'});
				studentedit.addElement(lname, {placeholder: 'Last name'});
				studentedit.addElement(snote, {placeholder: 'Note', required: false});
				studentedit.data = inputs => ({req: 'editstudent', student: tr.dataset.id, fname: inputs[0].value, lname: inputs[1].value, note: inputs[2].value});
				
				//Update roster with any changes
				studentedit.after = (response, vals) => {
					tr.querySelector('.fname').innerHTML = vals[0];
					tr.querySelector('.lname').innerHTML = vals[1];
					tr.querySelector('.note').innerHTML = vals[2];
				}

				actions.addEventListener('click', function(e) {
					e.preventDefault();

					//Delete student
					if (e.target.classList.contains('delete')) {
						if (!confirm('Are you sure you want to remove '+fname.textContent+' '+lname.textContent+' from the class roster?')) return;
						fetch('../ajax.php?req=deletestudent&id='+tr.dataset.id, {method: 'get'})
						.then((response) => response.json()).then((response) => {
							if (response != 1) console.error('There was an error deleting the student.');
							else {
								//Delete recent participation events
								const evrows = document.querySelectorAll('#recentevents tr[data-student="'+tr.dataset.id+'"]');
								for (const evrow of evrows) evrow.remove();

								tr.remove(); //Delete roster row
								const snum = document.getElementById('num_students');
								snum.textContent = parseInt(snum.textContent)-1;
								document.querySelector('dialog').remove();
							}
						}).catch(console.error);

					} else if (e.target.classList.contains('save')) fname.save();
					else if (e.target.classList.contains('cancel')) fname.cancel();

					//Set Excused Absences
					else if (e.target.classList.contains('excuses')) {
						if (!excused.textContent) excused.innerHTML = 'Excused through <span></span>';
						const qspan = excused.querySelector('span');

						const xacts = markup({tag: 'span', attrs: {class: 'actions'}, children: actionButtons(['save', 'cancel', 'delete'])});
						function clearExcuse() {
							excused.textContent = '';
							delete tr.dataset.excused;
							tr.querySelector('.lname .excuses')?.remove();
						}
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
									excbut = markup({tag: 'span', attrs: {class: 'excuses'}});
									tr.querySelector('.lname').append(excbut);
								}
								excbut.title = through;
							} else clearExcuse();
							clearacts();
						}
						makeInput(qspan, {
							data: (inps) => { return {req: 'studentexcused', id: tr.dataset.id, excused: inps[0].value}; },
							actions: null,
							type: 'date',
							blur: false, //Don't save on blur since we're adding action buttons
							after: updateRosterExcuse, cancel: clearacts
						});
					}
				});
				
				//Add new event
				table.querySelector('.addnew a').addEventListener('click', function(e) {
					e.preventDefault();
					if (this.classList.contains('disabled')) return;
					this.classList.add('disabled');
					
					const date = new Date(),
						evtr = markup({tag: 'tr', attrs: {'data-student': tr.dataset.id}, children: [
							{tag: 'td', attrs: {class: 'm-date', 'data-sort': Math.round(date.getTime()/1000)}, children: [date.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+date.clockTime()]},
							{tag: 'td'},
							{tag: 'td', attrs: {class: 'actions'}}
						]});
					editEvent(evtr);
					if (table.direction) tbody.prepend(evtr);
					else tbody.append(evtr);
				});
				
				smodal.querySelector('.loader').remove();
				smodal.children[0].append(actions, snote, excused, table);
				smodal.student = tr.dataset.id;
			}
			
			function smError() {
				smodal.querySelector('.loader').remove();
				const p = document.createElement('p');
				p.classList.add('error');
				p.innerHTML = 'Server error. Please try again later, or <a href="https://github.com/charwick/pick.al/issues">file a bug report</a>.';
				smodal.append(p);
			}

			if (tr.querySelector('.score').textContent)
				fetch('../ajax.php?req=events&student='+tr.dataset.id, {method: 'get'})
				.then((response) => response.json()).then(studentmodal).catch(smError);
			else studentmodal([]);
		});

		//CSV Upload
		document.querySelector('.uploadcsv a').addEventListener('click', function(e) {
			e.preventDefault();
			const content = markup({tag: 'div', children: [
					{tag: 'p', children: 'Upload a CSV file with columns labelled <code>fname</code>, <code>lname</code>, and (optionally) <code>note</code> in the header row.'},
					{tag: 'p', children: '<label for="csvfile">Click here or drag a CSV file to upload</label><input type="file" id="csvfile" name="csvfile" accept="text/csv">'}
				]}),
				h2 = markup({tag: 'h2', children: ['Upload Students']}),
				csvElement = content.querySelector('#csvfile'),
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

		const title = markup({tag: 'h2', children: ['New Student']}),
			h2 = markup({tag: 'h2', children: [
				{tag: 'input', attrs: {type: 'text', class: 'fname', placeholder: 'First Name', required: 'true'}}, ' ',
				{tag: 'input', attrs: {type: 'text', class: 'lname', placeholder: 'Last Name', required: 'true'}},
			]}),
			note = markup({tag: 'input', attrs: {class: 'note', placeholder: 'Note', type: 'text'}}),
			actions = markup({tag: 'div', attrs: {class: 'actions expand'}, children: actionButtons(['save', 'cancel'])}),
			fname = h2.querySelector('.fname'),
			lname = h2.querySelector('.lname');
		
		function studentSave() {
			if (validate([fname, lname, note])) {
				onerror = (response) => {
					if (errorfn) errorfn(response, inputs);
					else for (const inp of inputs) inp.classList.add('error');
				};

				const params = new URLSearchParams({req: 'addstudent', classid: classid, fname: fname.value, lname: lname.value, note: note.value}).toString()
				fetch('../ajax.php?'+params, {method: 'get'})
				.then((response) => response.json()).then((sid) => {
					if (!sid) onerror(sid);
					else {
						studentRow(sid, fname.value, lname.value, note.value);
						const snum = document.getElementById('num_students'),
							roster = document.getElementById('roster');
						roster.sort(roster.sortby, roster.direction);
						snum.textContent = parseInt(snum.textContent)+1; //Increment roster counter
						document.querySelector('dialog').close();
					}
				});
			}
		}
		
		for (const inp of [fname, lname, note]) inp.addEventListener('keydown', e2 => {
			if (e2.key == "Enter") {
				e2.preventDefault();
				studentSave();
			}
		});

		actions.addEventListener('click', e => {
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

	//Highlight student from autocomplete
	if (window.location.hash.includes('#student-')) {
		const student = parseInt(window.location.hash.replace('#student-', ''));
		document.querySelector('#roster tr[data-id="'+student+'"]')?.classList.add('new');
	}
});

function addSchemaButtons() {
	const target = document.getElementById('schemaselect'),
		schema = target.querySelector('select')?.value ?? window.schema;
	
	if (schema=='__addnew__') {
		window.location.href = '/admin/schema.php';
		return;
	}

	function drawButtons(html) {
		const cont = target.querySelector('.schemalist');
		cont.textContent = '';
		cont.innerHTML = html;
	}
	
	if (schema in schemabuttons) drawButtons(schemabuttons[schema]);
	else {
		fetch('../ajax.php?req=getschemabuttons&schema='+schema, {method: 'get'})
		.then((response) => response.text()).then((response) => {
			schemabuttons[schema] = response;
			drawButtons(response);
		});
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
			const acell = a.querySelector('.'+sortby),
				bcell = b.querySelector('.'+sortby),
				atext = 'sort' in acell.dataset ? parseInt(acell.dataset.sort) : acell.textContent,
				btext = 'sort' in bcell.dataset ? parseInt(bcell.dataset.sort) : bcell.textContent;
			if (typeof atext=='number' && typeof btext=='number') return (atext-btext) * (desc ? -1 : 1);
			else if (!atext && btext) return (desc ? 1 : -1);
			else if (atext && !btext) return (desc ? -1 : 1);
			else return atext.localeCompare(btext) * (desc ? 1 : -1);
		});
		for (const row of rows) tbody.append(row);
	}

	table.sort(defaultsort, defaultdesc);

	table.querySelector('thead').addEventListener('click', function(e) {
		const sortby = e.target.getAttribute('class');
		if (!sortby) return;
		let desc = true;
		if (sortby == table.sortby) desc = !table.direction;
		table.sort(sortby, desc);
	});
}

//Student can be a student ID, or a td.score cell
function updateScore(rostercell, opts) {
	if (!(rostercell instanceof Element)) rostercell = document.querySelector('#roster tr[data-id="'+rostercell+'"] .score');

	const evcell = document.querySelector('dialog td.numtotal'),
		scoretext = rostercell.textContent;
	let num, den;
	
	if (scoretext) {
		const match = scoretext.match(/^(\-?\d+(\.\d+)?)\/(\d+(\.\d+)?)$/);
		num = parseFloat(match[1]);
		den = parseFloat(match[3]);
	} else {
		num = 0; den = 0;
	}

	if (opts.action=='delete') {
		den -= schemae[schema].limits[1];
		num -= parseFloat(opts.oldval);
	} else if (opts.action=='new') {
		den += schemae[schema].limits[1];
		num += parseFloat(opts.newval);
	} else if (opts.action=='update') num += parseFloat(opts.newval) - parseFloat(opts.oldval);
	else if (opts.action=='schema') den *= schemae[schema].limits[1]/opts.oldmax;

	rostercell.textContent = den ? (Math.round(num*100)/100)+'/'+den : '';
	rostercell.dataset.sort = den ? Math.round(num/den*100) : -1;
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
	if (e.target.classList.contains('edit')) editEvent(evrow, restd.dataset.val);
	
	//Delete event
	else if (e.target.classList.contains('delete')) {
		if (confirm('Are you sure you want to delete this event?')) {
			fetch('../ajax.php?req=deleteevent&event='+evrow.dataset.id, {method: 'get'})
			.then((response) => {
				const student = evrow.dataset.student,
					result = evrow.querySelector('td[data-val]').dataset.val,
					evrows = document.querySelectorAll('.events tr[data-id="'+evrow.dataset.id+'"]'); //Remove it from the recents list too if applicable
				for (const row of evrows) row.remove();
				updateScore(student, {action: 'delete', oldval: result});
			}).catch(console.error);
		}
	
	//Cancel event edits
	} else if (e.target.classList.contains('cancel')) {
		if (evrow.dataset.id) {
			for (const b of restd.querySelectorAll('.unselected')) b.remove();
			restd.classList.remove('editing');
			acttd.textContent = '';
			numspan.textContent = restd.dataset.val;
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
	const info = markup({tag: tag || 'p', attrs: {class: 'info'}, children: [message]});
	if (classname) info.classList.add(classname);
	return info;
}

function studentRow(id, col1, col2, col3) {
	const tr = markup({tag: 'tr', attrs: {class: 'new', 'data-id': id}, children: [
		{tag: 'td', attrs: {class: 'fname'}, children: [col1]},
		{tag: 'td', attrs: {class: 'lname'}, children: [col2]},
		{tag: 'td', attrs: {class: 'note'}, children: [col3 ?? '']},
		{tag: 'td', attrs: {class: 'score', 'data-sort': -1}},
	]});
	document.getElementById('roster').querySelector('tbody').append(tr);
	setTimeout(() => { //Flash row
		tr.style.transition = '1s background';
		tr.classList.remove('new');
		setTimeout(() => { tr.style.transition = null; }, 1000);
	}, 250);
	return tr;
}

function eventRow(event, namecol) {
	const exc = 'date' in event ? new Date(event.date) : new Date(), //Apparently it's impossible to pass any value to Date() that makes it now
		modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000),
		tds = [
			markup({tag: 'td', attrs: {class: 'm-date', 'data-sort': modDate.getTime()/1000}, children: modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+modDate.clockTime()}),
			markup({tag: 'td'}),
			markup({tag: 'td', attrs: {'data-val': event.result}, children: '<div class="result-button" data-schemaval="'+event.result+'"></div><span class="numspan">'+event.result+'</span>'}),
			markup({tag: 'td', attrs: {class: 'actions'}, children: actionButtons(['edit', 'delete'])})
		];
	if (namecol) tds[1].innerHTML = event.fname+' '+event.lname; //Use InnerHTML so the HTML entities evaluate
	else tds.splice(1,1);
	return markup({tag: 'tr', attrs: {'data-id': event.id, 'data-student': event.student}, children: tds});
}

function editEvent(row) {
	const actionsCell = row.querySelector('.actions'),
		resultsCell = actionsCell.previousElementSibling,
		curval = resultsCell.querySelector('.result-button')?.dataset.schemaval;
	
	resultsCell.classList.add('editing');
	actionsCell.textContent = '';
	resultsCell.textContent = '';
	actionsCell.append(...actionButtons(['cancel']));
	const numspan = markup({tag: 'span', attrs: {class: 'numspan'}, children: (curval ? [curval] : [])});
	
	for (const i of schemae[schema].items) {
		const a = markup({tag: 'a', attrs: {class: 'result-button', 'data-schemaval': i.value}});
		if (i.value!=curval) a.classList.add('unselected');
		resultsCell.append(a);
		
		a.addEventListener('click', function(e) {
			const result = this.dataset.schemaval;
			let url;
			
			const solidifyEvent = function(response) {
				for (const b of resultsCell.querySelectorAll('.result-button')) {
					if (b.dataset.schemaval == result) b.classList.remove('unselected');
					else b.remove();
				}
				numspan.textContent = result;
				actionsCell.textContent = '';
				actionsCell.append(...actionButtons(['edit', 'delete']));
				resultsCell.dataset.val = result;
				resultsCell.classList.remove('editing');
				let opts;
				
				//Add to or update class events table
				if (!curval) {
					opts = {action: 'new', newval: result};
					row.dataset.id = response; //Save new event ID if necessary
					const studentRow = document.querySelector('#roster tr[data-id="'+row.dataset.student+'"]');
					document.querySelector('#recentevents tbody').prepend(eventRow({
						id: row.dataset.id,
						student: row.dataset.student,
						fname: studentRow.querySelector('.fname').innerHTML,
						lname: studentRow.querySelector('.lname').innerHTML,
						result: result
					}, true))
				} else {
					opts = {action: 'update', oldval: curval, newval: result};
					const recent = document.querySelector('#recentevents tr[data-id="'+row.dataset.id+'"] td[data-val]');
					if (recent) {
						recent.dataset.val = result;
						recent.querySelector('.result-button').dataset.schemaval = result;
						recent.querySelector('.numspan').textContent = result;
					}
				}
				
				row.parentNode.parentNode.querySelector('.addnew a')?.classList.remove('disabled');
				updateScore(row.dataset.student, opts);
			};

			if (curval) url ='../ajax.php?req=updateevent&event='+row.dataset.id+'&result='+result; //Save event edits
			else url = '../ajax.php?req=writeevent&rosterid='+document.querySelector('dialog').student+'&result='+result; //Save new event

			fetch(url, {method: 'get'}).then((response) => response.json()).then(solidifyEvent);
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
		const formData = new FormData();
		formData.append("csv", e.target.result);
		formData.append("req", "uploadroster");
		formData.append("class", ''+classid);
		fetch("../ajax.php", {method: 'post', body: formData})
		.then((response) => response.json()).then((response) => {
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
		}).catch((response) => {
			const error = infoElement('There was an error uploading this CSV.', 'error');
			csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
		});
	};
	let file = files[0] instanceof File ? files[0] : files[0].getAsFile(); //Dragging gives us a DataTransferItem object instead of a file
	document.querySelector('label[for="csvfile"]').classList.remove('active');
	if (file.type.toLowerCase().includes('csv') || file.name.toLowerCase().slice(-4) == '.csv') reader.readAsText(file);
	else {
		const error = infoElement("This file isn't a CSV!", 'error');
		csvElement.parentNode.insertBefore(error, csvElement.parentNode.querySelector('label'));
	}
}