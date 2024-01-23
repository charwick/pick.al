"use strict";
var hist = [], //Reverse coded: current student = index[0]
	histIndex = null,
	currentAnim = false;

document.addEventListener('DOMContentLoaded', () => {
	if ('roster' in window) for (const s of roster) if (s.excuseduntil != null) {
		const exc = new Date(s.excuseduntil);
		s.excuseduntil = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1);
		if (isExcused(s)) document.querySelector('li[data-id="'+s.id+'"]').classList.add('excused');
	}
	document.getElementById('actions')?.addEventListener('click', function(e) {
		e.preventDefault();
		if (e.target.id=='back') buttonFunc('back')(e);
		else if (e.target.id=='forward') buttonFunc('forward')(e);
		else if (e.target.id=='snooze') {
			const now = new Date(),
				req = new XMLHttpRequest();
			let excdate, fn;
			if (!isExcused(hist[histIndex].info)) { //Set excused
				excdate = now.toISOString().split('T')[0];
				fn = function() {
					now.setHours(23); now.setMinutes(59);
					hist[histIndex].info.excuseduntil = now;
					e.target.dataset.excused = 'Excused until tomorrow';
				}
			} else { //Clear excused
				excdate = '';
				fn = function() {
					hist[histIndex].info.excuseduntil = null;
					delete e.target.dataset.excused
				}
			}
			req.open('GET', 'ajax.php?req=studentexcused&id='+hist[histIndex].info.id+'&excused='+excdate, true);
			req.onload = fn;
			req.send();
		}
	});
	document.getElementById('pick')?.addEventListener('click', buttonFunc('choose'));

	//Keyboard Navigation
	document.addEventListener('keydown', function(e) {
		if (!window.classid) return;
		if (e.key == ' ') buttonFunc('choose')();
		else if (e.key == 'ArrowLeft' && histIndex < hist.length-1) buttonFunc('back')();
		else if (e.key == 'ArrowRight' && histIndex) buttonFunc('forward')();
		else if (['1','2','3','4','5'].includes(e.key)) {
			const i = parseInt(e.key),
				buttons = hist[histIndex].element.querySelectorAll('button');
			if (buttons.length < i) return;
			buttons[i-1].click();
		} else if (e.key == '0') hist[histIndex].element.querySelector('button.picked')?.click();
		else if (e.key == 'x') document.getElementById('snooze').click();
		else if (e.key == 'r') {
			const roster = document.getElementById('roster');
			if (roster.classList.contains('open')) roster.classList.remove('open');
			else roster.classList.add('open');
		}
		else if (e.key == 'Escape' && document.getElementById('roster').classList.contains('open')) document.getElementById('roster').classList.remove('open')
	});

	//=============
	// ROSTER LIST
	//=============

	//Open
	document.getElementById('rosterlist')?.addEventListener('click', function(e) {
		e.preventDefault();
		document.getElementById('roster').classList.add('open');
	});

	document.getElementById('roster')?.addEventListener('click', function(e) {
		for (const s of roster) if (s.id==e.target.dataset.id) {
			new StudentEvent(s);
			this.style.right = null;
			break;
		}
	});
	//Close
	document.querySelector('#rosterclose a')?.addEventListener('click', function(e) {
		e.preventDefault();
		document.getElementById('roster').classList.remove('open');
	});
});

function StudentEvent(student) {
	this.info = student; //This will update the original roster data too
	this.event = null;
	this.result = null;
	this.excused = false;
	
	//Create the HTML
	this.element = document.createElement('div');
	this.element.classList.add('studentinfo');
	const h2 = document.createElement('h2'),
		note = document.createElement('p'),
		actionlist = document.createElement('ul'),
		lnspan = document.createElement('span'),
		actions = [];
	h2.innerHTML = this.info.fname+' ';
	lnspan.innerHTML = this.info.lname;

	//Check for duplicate first names, alert to read last name
	for (const n of roster) {
		if (this.info.id == n.id) continue;
		if (this.info.fname == n.fname) {
			lnspan.classList.add('dupename');
			break;
		}
	}

	h2.append(lnspan);
	note.classList.add('note');
	note.innerHTML = this.info.note;
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

	//Touch event handlers
	this.element.addEventListener('touchstart', (e) => {
		this.swipetime = new Date().getTime();
		this.swipepos = e.changedTouches[0].pageX;
		this.element.style.transition = 'none';
	});
	this.element.addEventListener('touchmove', (e) => {
		if (new Date().getTime() > this.swipetime + 100)
			this.element.style.left = 'calc(50% + '+(e.changedTouches[0].pageX-this.swipepos)+'px)';
	});
	this.element.addEventListener('touchend', (e) => {
		if (e.changedTouches[0].pageX-this.swipepos < -this.element.offsetWidth/3) {
			if (histIndex) buttonFunc('forward')();
			else buttonFunc('choose')();
		} else if (histIndex < hist.length-1 && e.changedTouches[0].pageX-this.swipepos > this.element.offsetWidth/3)
			buttonFunc('back')();
		this.element.style.transition = null;
		this.element.style.left = null;
	});

	this.send = function(result) {
		const req = new XMLHttpRequest(),
			that = this;
		let btn;
		for (const s in schema) if (schema[s].value==result) {
			btn = actionlist.querySelector('button[data-schema="'+s+'"]');
			break;
		}

		if (this.event) {
			//Undo button press
			if (result==this.result) {
				req.open('GET', 'ajax.php?req=deleteevent&event='+this.event, true);
				req.onload = function() {
					that.info.score -= that.result;
					that.info.denominator--;
					that.event = null;
					that.result = null;
					btn.classList.remove('picked');
					btn.parentNode.parentNode.classList.remove('picked');
					for (const btn2 of actions) btn2.disabled = false;
				}

			//Re-do button press (edit event)
			} else {
				req.open('GET', 'ajax.php?req=updateevent&event='+this.event+'&result='+result, true);
				req.onload = function() {
					for (const btn2 of actions) btn2.disabled = false;
					btn.classList.add('picked');
					that.info.score += result - that.result;
					that.result = result;
				}
			}
		
		//Send event (create new)
		} else {
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+this.info.id+'&result='+result, true);
			req.onload = function() {
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

	this.enter = function(left) {
		left = left ?? false;
		this.element.classList.add(left ? 'out' : 'in')
		document.getElementById('sinfo').append(this.element);

		const snoozeElement = document.getElementById('snooze');
		snoozeElement.classList.remove('disabled');
		if (isExcused(student)) snoozeElement.dataset.excused = 'Excused through '+student.excuseduntil.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
		else delete snoozeElement.dataset.excused;

		setTimeout(() => { this.element.classList.remove(left ? 'out' : 'in'); }, 1); //JS will skip the animation without the timeout
	}
	this.exit = function(right) {
		right = right ?? false;
		this.element.classList.add(right ? 'in' : 'out');
		setTimeout(() => {
			this.element.remove();
			this.element.classList.remove(right ? 'in' : 'out');
		}, 250);
	}

	//Make our entrance
	if (histIndex != null) hist[histIndex].exit();
	if (hist[0]?.event) hist.unshift(this);
	else hist[0] = this;
	histIndex = 0;
	this.enter();
}

//=================
// BUTTON BEHAVIOR
//=================

function buttonFunc(action) {
	return function(e) {
		if (currentAnim) return;
		currentAnim = true;
		setTimeout(() => { currentAnim = false; }, 250);

		if (action=='choose') new StudentEvent(studentSelect(roster));
		
		else if (action=='back') {
			hist[histIndex].exit(true);
			histIndex++;
			hist[histIndex].enter(true);
		
		} else if (action=='forward') {
			hist[histIndex].exit();
			histIndex--;
			hist[histIndex].enter();
		}
		setButtons();
	}
}

function setButtons() {
	if (histIndex < hist.length-1) document.getElementById('back').classList.remove('disabled');
	else document.getElementById('back').classList.add('disabled');
	if (histIndex) document.getElementById('forward').classList.remove('disabled');
	else document.getElementById('forward').classList.add('disabled');
}

Array.prototype.random = function () { return this[Math.floor((Math.random()*this.length))]; }

//Random choice among students that have been called on the least so far
function studentSelect(list) {
	const smallerList = [];
	list.sort((a,b) => {
		if (isExcused(a)) return 1; //Move excused to the end of the list
		if (isExcused(b)) return -1;
		return a.denominator > b.denominator ? 1 : -1;
	});
	for (const student of list)
		if (student.denominator == list[0].denominator && !isExcused(student))
			smallerList.push(student);
	
	return smallerList.random();
}

function isExcused(student) {
	const now = new Date();
	return student.excuseduntil?.getTime() > now.getTime();
}