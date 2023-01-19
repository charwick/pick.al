var currentStudent = null,
	weights = {good: 1, meh: 0.5, bad: 0 };
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

document.addEventListener('DOMContentLoaded', function() {
	var actions = document.querySelectorAll('#actions button');
	
	//Chooser button
	let pick = document.getElementById('pick');
	if (pick) pick.addEventListener('click', function(e) {
		student = roster.random();
		currentStudent = student.id;
		sinfo = document.getElementById('sinfo');
		sinfo.style.visibility = 'visible';
		document.getElementById('sname').innerHTML = student.fname+' '+student.lname;
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
			let req = new XMLHttpRequest();
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+currentStudent+'&result='+weights[this.id], true);
			
			req.onload = function() { console.log(this.response); };
			req.onerror = function() { console.log('There was an error'); };
			req.send();
		});
	});

});