"use strict";
var hist = [], //Reverse coded: current student = index[0]
	histIndex = null;

document.addEventListener('DOMContentLoaded', () => {
	
	//Chooser button
	document.getElementById('pick')?.addEventListener('click', function(e) {
		const student = new StudentEvent(studentSelect(roster));
		if (histIndex != null) {
			let element = hist[histIndex].element;
			element.classList.add('out');
			setTimeout(function() { element.remove(); }, 250);
		}
		if (hist[0]?.event) hist.unshift(student);
		else hist[0] = student;
		histIndex = 0;

		document.getElementById('sinfo').append(student.element);
		setTimeout(function() { student.element.classList.remove('in'); }, 1); //JS will skip the animation without the timeout
		this.disabled = true;
		setTimeout(() => { this.disabled = false; }, 250);
		
	});
});

function StudentEvent(student) {
	this.info = student; //This will update the original roster data too
	this.event = null;
	this.result = null;
	
	//Create the HTML
	this.element = document.createElement('div');
	const h2 = document.createElement('h2'),
		note = document.createElement('p'),
		actionlist = document.createElement('ul'),
		actions = [];
	h2.id = 'sname';
	h2.innerHTML = this.info.fname+' '+this.info.lname;
	note.classList.add('note');
	note.innerHTML = this.info.note;
	actionlist.id = 'actions';
	for (const s in schema) {
		const li = document.createElement('li'),
			btn = document.createElement('button');
		btn.dataset.schema = s;
		btn.innerHTML = schema[s].text;
		btn.addEventListener('click', (e) => {
			for (const btn2 of actions) {
				btn2.disabled = true;
				btn2.classList.remove('picked');
			}
			this.send(schema[s].value)
		});
		li.append(btn);
		actionlist.append(li);
		actions.push(btn);
	}
	this.element.append(h2, note, actionlist);
	this.element.classList.add('in');

	this.send = function(result) {
		const req = new XMLHttpRequest(),
			that = this;
		let btn;
		for (const s in schema) if (schema[s].value==result) {
			btn = actionlist.querySelector('button[data-schema="'+s+'"]');
			break;
		}

		//Re-do button press (edit event)
		if (this.event) {
			req.open('GET', 'ajax.php?req=updateevent&event='+this.event+'&result='+result, true);
			req.onload = function() {
				for (const btn2 of actions) btn2.disabled = false;
				btn.classList.add('picked');
				that.info.score += result - that.result;
				that.result = result;
			}
		
		//Send event (create new)
		} else {
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+this.info.id+'&result='+result, true);
			req.onload = function() {
				btn.parentNode.parentNode.classList.add('picked');
				for (const btn2 of actions) btn2.disabled = false;
				btn.classList.add('picked');
				btn.parentNode.parentNode.classList.add('picked');
				that.event = parseInt(this.response);
				that.result = result;
				if (that.info.score == null) that.info.score = 0;
				that.info.score += result;
				that.info.denominator++;
			};
		}

		req.onerror = () => { console.log('There was an error'); };
		req.send();
	};
}

Array.prototype.random = function () { return this[Math.floor((Math.random()*this.length))]; }

//Random choice among students that have been called on the least so far
function studentSelect(list) {
	list.sort((a,b) => { return a.denominator > b.denominator });
	const smallerList = [];
	for (const student of list)
		if (student.denominator == list[0].denominator)
			smallerList.push(student);
	
	return smallerList.random();
}