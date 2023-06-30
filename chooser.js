"use strict";
var currentStudent = null,
	lastEvent = null;

document.addEventListener('DOMContentLoaded', () => {
	const actions = document.querySelectorAll('#actions button');
	
	//Chooser button
	document.getElementById('pick')?.addEventListener('click', function(e) {
		currentStudent = studentSelect(roster);
		document.getElementById('sinfo').style.visibility = 'visible';
		document.getElementById('sname').innerHTML = currentStudent.fname+' '+currentStudent.lname;
		for (const btn of actions) btn.classList.remove('picked');
		document.getElementById('actions').classList.remove('picked');
	});

	//Result buttons
	for (const btn of actions) btn.addEventListener('click', function(e) {
		for (const btn2 of actions) {
			btn2.disabled = true;
			btn2.classList.remove('picked');
		}
		const req = new XMLHttpRequest();
		
		//Re-do button press (edit event)
		if (btn.parentNode.parentNode.classList.contains('picked')) {
			req.open('GET', 'ajax.php?req=updateevent&event='+lastEvent+'&result='+schema[this.dataset.schema].value, true);
			req.onload = function() {
				for (const btn2 of actions) btn2.disabled = false;
				btn.classList.add('picked');
			}
		
		//Send event (create new)
		} else {
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+currentStudent.id+'&result='+schema[this.dataset.schema].value, true);
			req.onload = function() {
				btn.parentNode.parentNode.classList.add('picked');
				for (const btn2 of actions) btn2.disabled = false;
				btn.classList.add('picked');
				btn.parentNode.parentNode.classList.add('picked');
				lastEvent = parseInt(this.response);
				if (currentStudent.score == null) currentStudent.score = 0;
				currentStudent.score += schema[btn.dataset.schema].value;
				currentStudent.denominator++;
			};
		}
		req.onerror = () => { console.log('There was an error'); };
		req.send();
	});

});

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