var currentStudent = null,
	weights = {good: 1, meh: 0.5, bad: 0 };

document.addEventListener('DOMContentLoaded', function() {
	var actions = document.querySelectorAll('#actions button');
	
	//Chooser button
	let pick = document.getElementById('pick');
	if (pick) pick.addEventListener('click', function(e) {
		currentStudent = selectorFuncs[selector](roster);
		sinfo = document.getElementById('sinfo');
		sinfo.style.visibility = 'visible';
		document.getElementById('sname').innerHTML = currentStudent.fname+' '+currentStudent.lname;
		actions.forEach(function(btn) {
			btn.disabled = false;
			btn.classList.remove('picked');
		});
	});

	//Result buttons
	actions.forEach(function(btn) {
		btn.addEventListener('click', function(e) {
			actions.forEach(function(btn2) { btn2.disabled = true; });
			this.classList.add('picked');
			let req = new XMLHttpRequest(),
				button = this;
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+currentStudent.id+'&result='+weights[this.id], true);
			
			req.onload = function() {
				if (currentStudent.score == null) currentStudent.score = 0;
				currentStudent.score += weights[button.id];
				currentStudent.denominator++;
			};
			req.onerror = function() { console.log('There was an error'); };
			req.send();
		});
	});

});

Array.prototype.random = function () { return this[Math.floor((Math.random()*this.length))]; }
const selectorFuncs = {
	//Unbiased random with replacement.
	rand: function(list) { return list.random(); },
	
	//Random choice among students that have been called on the least so far.
	even: function(list) {
		list.sort((a,b) => { return a.denominator > b.denominator });
		let smallerList = [];
		for (const student of list)
			if (student.denominator == list[0].denominator)
				smallerList.push(student);
		
		return smallerList.random();
	},
	
	//Cycles through alphabetically, saving the position locally for the next session
	order: function(list) {
		if (!('lastStudent' in localStorage)) localStorage.lastStudent = list[list.length-1].id;
		let next = false;
		for (const student of list) {
			if (next) {
				localStorage.lastStudent = student.id;
				return student;
			}
			if (student.id == parseInt(localStorage['lastStudent'])) next = true;
		}
		localStorage.lastStudent = list[0].id;
		return list[0];
	}
}