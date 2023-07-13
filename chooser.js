"use strict";
var hist = [], //Reverse coded: current student = index[0]
	histIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
	const actions = document.querySelectorAll('#actions button');
	
	//Chooser button
	document.getElementById('pick')?.addEventListener('click', function(e) {
		const student = new StudentEvent(studentSelect(roster));
		if (hist[0]?.event) hist.unshift(student);
		else hist[0] = student;
		histIndex = 0;

		document.getElementById('sinfo').style.visibility = 'visible';
		document.getElementById('sname').innerHTML = student.info.fname+' '+student.info.lname;
		document.querySelector('.note').innerHTML = student.info.note;
		for (const btn of actions) btn.classList.remove('picked');
		document.getElementById('actions').classList.remove('picked');
	});

	//Result buttons
	for (const btn of actions) btn.addEventListener('click', function(e) {
		for (const btn2 of actions) {
			btn2.disabled = true;
			btn2.classList.remove('picked');
		}
		hist[histIndex].send(schema[this.dataset.schema].value)
	});

});

function StudentEvent(student) {
	this.info = student; //This will update the original roster data too
	this.event = null;
	this.result = null;

	this.send = function(result) {
		const req = new XMLHttpRequest(),
			actions = document.querySelectorAll('#actions button'),
			that = this;
		let btn;
		for (const s in schema) if (schema[s].value==result) {
			btn = document.querySelector('#actions button[data-schema="'+s+'"]');
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