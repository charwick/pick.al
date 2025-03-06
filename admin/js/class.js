"use strict";
var recentTable;
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
				const snote = markup({tag: 'p', attrs: {class: 'note'}, children: tr.querySelector('.note').innerHTML}),
					excused = markup({tag: 'p', attrs: {class: 'excused'}, children: ('excused' in tr.dataset ? [
						{tag: 'span', attrs: {class: 'mtx'}, children: 'Excused through '},
						{tag: 'span', attrs: {'data-date': tr.dataset.excused}, children: [datetostr(tr.dataset.excused)]}
					] : [{tag: 'span'}])}),
					actions = markup({tag: 'div', attrs: {class: 'actions'}, children: actionButtons(['edit', 'excuses', 'delete'])}),
					nevents = markup({tag: 'span', attrs: {class: 'num'}, children: [events.length]}),
					table = new EventsTable(events);
				smodal.querySelector('h2').append(nevents);
				table.student = tr.dataset.id;
				
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

				const qspan = excused.querySelector('span:not(.mtx)');
				function clearacts() {
					if (!('excused' in tr.dataset)) excused.querySelector('.mtx')?.remove(); //the Excused Until text
				};
				const excInput = new makeInput();
				excInput.addElement(qspan, {type: 'date'});
				excInput.data = inps => { return {req: 'studentexcused', id: tr.dataset.id, excused: inps[0].value}; };
				excInput.cancelfunc = clearacts;
				excInput.editActions.push('delete');
				excInput.delete = () => { 							/* STILL HAVING PROBLEMS. See the }else{ block in excInpit.after. */
					const inp = qspan.querySelector('input');
					inp.value = '';
					inp.validate = false;
					delete qspan.dataset.date;
					excInput.save();
					if (!inp.oldValue) excInput.after();
				}

				//Update roster
				excInput.after = (response, vals) => {
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
					} else {
						qspan.textContent = '';
						delete tr.dataset.excused;
						tr.querySelector('.lname .excuses')?.remove();
					};
					clearacts();
				};

				actions.addEventListener('click', function(e) {
					e.preventDefault();

					//Delete student
					if (e.target.classList.contains('delete')) {
						if (!confirm('Are you sure you want to remove '+fname.textContent+' '+lname.textContent+' from the class roster?')) return;
						post('../ajax.php', {req: 'deletestudent', id: tr.dataset.id}, response => {
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
						});

					//Set Excused Absences
					} else if (e.target.classList.contains('excuses')) {
						if (!excused.textContent) excused.prepend(markup({tag: 'span', attrs: {class: 'mtx'}, children: 'Excused through '}));
						excInput.edit();
					}
				});
				
				smodal.querySelector('.loader').remove();
				smodal.children[0].append(actions, snote, excused, table.markup());
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
	let classEvents = document.getElementById('recentevents');
	if (classEvents) {
		recentTable = new EventsTable(events);
		recentTable.footer = false;
		recentTable.sortable = false;
		classEvents.append(recentTable.markup());
		if (!events.length) document.getElementById('recentevents').style.display = 'none';
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

				post('../ajax.php', {req: 'addstudent', classid: classid, fname: fname.value, lname: lname.value, note: note.value}, sid => {
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

	//Open question modal
	const qlist = document.querySelector('#questionlist');
	qlist?.addEventListener('click', function(e) {
		const li = e.target.closest('li');
		if (!li) return;
		const question = li.childNodes[0].textContent.trim(),
			h3 = markup({tag: 'h3', children: question}),
			actions = markup({tag: 'div', attrs: {class: 'actions'}, children: actionButtons(['edit', 'archive', 'delete'])}),
			qedit = new makeInput(actions);
		qedit.addElement(h3, {placeholder: 'Question', required: true, type: 'textarea'});
		qedit.data = inps => ({req: 'editquestion', id: li.dataset.id, text: inps[0].value});
		qedit.editfunc = inps => {
			const shrink = e => { inps[0].style.height = ""; inps[0].style.height = (inps[0].scrollHeight+6) + "px"; };
			inps[0].addEventListener('input', shrink);
			shrink();
		}
		qedit.after = response => { li.childNodes[0].textContent = h3.textContent+' '; };

		const m = modal(h3, actions, {tag: 'div', attrs: {class: 'loader'}});
		m.classList.add('question');
		if (li.classList.contains('inactive')) m.classList.add('inactive');

		const params = new URLSearchParams({req: 'eventsbyquestion', question: li.dataset.id}).toString();
		fetch('/ajax.php?'+params, {method: 'GET'})
		.then(response => response.json()).then(data => {
			const container = m.querySelector('.studentmodal'),
				table = new EventsTable(data);
			container.querySelector('.loader').remove();
			container.append(table.markup());
		});
		
		actions.addEventListener('click', function(e2) {
			e2.preventDefault();
								
			//Archive or unarchive question
			if (e2.target.classList.contains('archive')) {
				const li = e.target.closest('li'),
					active = + li.classList.contains('inactive');
				post('/ajax.php', {req: 'archivequestion', id: li.dataset.id, archive: active}, data => {
					if (active) {
						li.classList.remove('inactive');
						m.classList.remove('inactive');
						if (!document.querySelectorAll('#questionlist .inactive').length)
							document.querySelector('#qactions .expand').classList.add('disabled');
					} else {
						li.classList.add('inactive');
						m.classList.add('inactive');
						document.querySelector('#qactions .expand').classList.remove('disabled');
					}

					//Sort inactive at bottom, and then descending by ID
					const ul = li.parentNode,
						lis = Array.from(ul.querySelectorAll('li'));
					lis.sort((a, b) => {
						if (a.classList.contains('addnew')) return 1;
						if (b.classList.contains('addnew')) return -1;
						const aInactive = a.classList.contains('inactive'),
							bInactive = b.classList.contains('inactive');
						if (aInactive && !bInactive) return 1;
						if (!aInactive && bInactive) return -1;
						return parseInt(b.dataset.id) - parseInt(a.dataset.id);
					});
					for (const li of lis) ul.appendChild(li);
				});
			
			//Delete question
			} else if (e2.target.classList.contains('delete')) {
				const li = e.target.closest('li');
				if (confirm('Are you sure you want to delete this question rather than archiving it?')) {
					post('/ajax.php', {req: 'deletequestion', id: li.dataset.id}, data => {
						if (data == "1") {
							for (const event of document.querySelectorAll('.events tr[data-question="'+li.dataset.id+'"]')) {
								delete event.dataset.question;
								event.querySelector('.q')?.remove();
							}
							li.remove();
							m.close();
						} else console.error('Error deleting the question.');
					});
				}
			}
		});
	});

	//Add new question
	document.querySelector('#qactions .addnew')?.addEventListener('click', e => {
		e.preventDefault();
		const title = markup({tag: 'h2', children: ['New Question']}),
			textarea = markup({tag: 'textarea', attrs: {placeholder: 'Question', required: 'true'}}),
			actions = markup({tag: 'div', attrs: {class: 'actions expand'}, children: actionButtons(['save', 'cancel'])});

		function questionSave() {
			if (validate([textarea])) {
				post('/ajax.php', {req: 'newquestion', class: classid, text: textarea.value}, data => {
					const date = new Date().toLocaleDateString(),
						li = markup({tag: 'li', children: `${textarea.value} <span class="date">${datetostr(date)} — 0 events</span>`});
					li.dataset.id = data;
					qlist.prepend(li);
					document.querySelector('dialog').close();
				});
			}
		}

		textarea.addEventListener('keydown', e2 => {
			if (e2.key == "Enter") {
				e2.preventDefault();
				questionSave();
			}
		});
		actions.addEventListener('click', e => {
			e.preventDefault();
			if (e.target.classList.contains('cancel')) document.querySelector('dialog').close();
			else if (e.target.classList.contains('save')) questionSave();
		});

		modal(title, actions, textarea);
		textarea.focus();
	})

	const qexpand = document.querySelector('#qactions .expand');
	function toggleQuestions() {
		if (!qexpand || qexpand.classList.contains('disabled')) return;
		
		if (localStorage['hide-inactive-qs'] == 'true') {
			qlist.classList.remove('hiding');
			qexpand.title = "Hide inactive questions";
		} else {
			qlist.classList.add('hiding');
			qexpand.title = "Show inactive questions";
		}
	}

	//Show/hide inactive questions
	toggleQuestions();
	qexpand?.addEventListener('click', function(e) {
		e.preventDefault();
		localStorage['hide-inactive-qs'] = localStorage['hide-inactive-qs'] == 'true' ? 'false' : 'true';
		toggleQuestions();
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
		const tbody = table.querySelector('tbody'),
			rows = Array.from(tbody.querySelectorAll('tr')),
			parseIf = val => parseInt(val)==val ? parseInt(val) : val;
		rows.sort((a,b) => {
			const acell = a.querySelector('.'+sortby),
				bcell = b.querySelector('.'+sortby),
				atext = 'sort' in acell.dataset ? parseIf(acell.dataset.sort) : acell.textContent,
				btext = 'sort' in bcell.dataset ? parseIf(bcell.dataset.sort) : bcell.textContent;
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

class EventsTable {
	events = [];
	student = null;
	footer = true;
	addnew = true;
	sortable = true;

	constructor(events) { this.events = events; }

	markup() {
		let num=0, den=0;
		const tbody = markup({tag: 'tbody'});
		for (const event of this.events) {
			tbody.append(this.row(event));
			num += event.result;
			den++;
		}
		const table = markup({tag: 'table', attrs: {class: 'events'}, children: [
			{tag: 'thead', children: [{tag: 'tr', children: [
				{tag: 'th', attrs: {class: 'm-date'}, children: ['Date']},
				this.student ? null : {tag: 'th', attrs: {class: 'm-name'}, children: ['Student']},
				{tag: 'th', attrs: {colspan: 2}, children: ['Result']}
			]}]}, tbody,
			this.footer ? {tag: 'tfoot', children: [{tag: 'tr', children: [
				{tag: 'td', children: ['Total'], attrs: {colspan: this.student ? 1 : 2}},
				{tag: 'td', attrs: {class: 'numtotal', colspan: this.student ? 1 : 2}, children: [(den ? Math.round(num/den*100)+'%' : '—')]},
				this.student ? {tag: 'td', attrs: {class: 'addnew'}, children: [{tag: 'a', attrs: {href: '#'}, children: ['+']}]} : null
			]}]} : null
		]});
		
		//Event action buttons
		tbody.addEventListener('click', e => {
			if (!e.target.matches('.actions a')) return;
			e.preventDefault();
			
			const evrow = e.target.closest('tr'),
				acttd = e.target.closest('.actions'),
				restd = acttd.previousElementSibling,
				numspan = restd.querySelector('.numspan');
			
			//Edit event
			if (e.target.classList.contains('edit')) this.edit(evrow);
			
			//Delete event
			else if (e.target.classList.contains('delete')) {
				if (confirm('Are you sure you want to delete this event?')) {
					post('../ajax.php', {req: 'deleteevent', event: evrow.dataset.id}, response => {
						const result = evrow.querySelector('td[data-val]').dataset.val,
							evrows = document.querySelectorAll('.events tr[data-id="'+evrow.dataset.id+'"]'); //Remove it from the recents list too if applicable
						if ('question' in evrow.dataset) {
							const qinfo = document.querySelector('#questionlist li[data-id="'+evrow.dataset.question+'"] .date'),
								match = qinfo.textContent.match(/(\d+) Events/);
							if (match) {
								const eventCount = parseInt(match[1]) - 1;
								qinfo.textContent = qinfo.textContent.replace(/\d+ Events/, `${eventCount} Events`);
							}
						}
						for (const row of evrows) row.remove();
						
						updateScore(evrow.dataset.student, {action: 'delete', oldval: result});
					});
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
					evrow.closest('table').querySelector('tfoot')?.querySelector('.addnew a').classList.remove('disabled');
					evrow.remove();
				}
			}
		});
		if (this.sortable) makeSortable(table, 'm-date', true);

		//Add new event
		if (this.footer && this.student) table.querySelector('.addnew a').addEventListener('click', e => {
			e.preventDefault();
			if (e.target.classList.contains('disabled')) return;
			e.target.classList.add('disabled');
			
			const date = new Date(),
				evtr = markup({tag: 'tr', attrs: {'data-student': this.student}, children: [
					{tag: 'td', attrs: {class: 'm-date', 'data-sort': Math.round(date.getTime()/1000)}, children: [date.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+date.clockTime()]},
					{tag: 'td'},
					{tag: 'td', attrs: {class: 'actions'}}
				]});
			this.edit(evtr);
			if (table.direction) tbody.prepend(evtr);
			else tbody.append(evtr);
		});
		return table;
	}

	row(event) {
		const exc = 'date' in event ? new Date(event.date) : new Date(), //Apparently it's impossible to pass any value to Date() that makes it now
			modDate = new Date(exc.getTime() + exc.getTimezoneOffset()*60000),
			tr = markup({tag: 'tr', attrs: {'data-id': event.id, 'data-student': event.student}, children: [
				{tag: 'td', attrs: {class: 'm-date', 'data-sort': modDate.getTime()/1000}, children: [
					modDate.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'})+' at '+modDate.clockTime(),
					event.question ? {tag: 'span', attrs: {title: document.querySelector('#questionlist li[data-id="'+event.question+'"]')?.childNodes[0].textContent.trim(), class: 'q'}} : null
				]},
				this.student ? null : {tag: 'td', attrs: {'data-sort': event.lname, class: 'm-name'}, children: event.fname+' '+event.lname},
				{tag: 'td', attrs: {'data-val': event.result}, children: '<div class="result-button" data-schemaval="'+event.result+'"></div><span class="numspan">'+event.result+'</span>'},
				{tag: 'td', attrs: {class: 'actions'}, children: actionButtons(['edit', 'delete'])}
			]});
		if (event.question) tr.dataset.question = event.question;
		return tr;
	}

	edit(row) {
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
			
			a.addEventListener('click', e => {
				const result = a.dataset.schemaval;
				let url;
				
				const solidifyEvent = response => {
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
						document.querySelector('#recentevents tbody').prepend(recentTable.row({
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
				
				let params;
				if (curval) params = {req: 'updateevent', event: row.dataset.id, result: result};
				else params = {req: 'writeevent', rosterid: document.querySelector('dialog').student, result: result};
	
				post('../ajax.php', params, solidifyEvent);
			});
		}
		resultsCell.append(numspan);
	}
}

function uploadCSV(e) {
	e.preventDefault();
	const files = this.files || e.dataTransfer.items,
		reader = new FileReader(),
		csvElement = document.getElementById('csvfile');
	if (files.length == 0) return;
	document.querySelector('.info')?.remove();
	
	reader.onload = function(e) {
		post("../ajax.php", {req: 'uploadroster', csv: e.target.result, class: ''+classid}, response => {
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