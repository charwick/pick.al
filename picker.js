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
			const now = new Date();
			let excdate, fn;
			if (!isExcused(hist[histIndex].info)) { //Set excused
				excdate = now.toISOString().split('T')[0];
				fn = function() {
					now.setHours(23); now.setMinutes(59);
					hist[histIndex].info.excuseduntil = now;
					e.target.dataset.excused = 'Excused until tomorrow';
					document.querySelector('#roster [data-id="'+hist[histIndex].info.id+'"]').classList.add('excused');
				}
			} else { //Clear excused
				excdate = '';
				fn = function() {
					hist[histIndex].info.excuseduntil = null;
					delete e.target.dataset.excused
					document.querySelector('#roster [data-id="'+hist[histIndex].info.id+'"]').classList.remove('excused');
				}
			}
			fetchif(!demo, 'ajax.php?req=studentexcused&id='+hist[histIndex].info.id+'&excused='+excdate, fn);
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
	document.getElementById('rosterclose')?.addEventListener('click', function(e) {
		e.preventDefault();
		document.getElementById('roster').classList.remove('open');
	});
});

class StudentEvent {
	event = null;
	result = null;
	excused = false;
	#actionlist;
	#actions = [];

	constructor(student) {
		this.info = student; //This will update the original roster data too
		
		//Create the HTML
		this.element = document.createElement('div');
		this.element.classList.add('studentinfo');
		const h2 = document.createElement('h2'),
			note = document.createElement('p'),
			lnspan = document.createElement('span');
		this.#actionlist = document.createElement('ul'),
		h2.innerHTML = this.info.fname+' ';
		lnspan.innerHTML = this.info.lname;

		//Check for duplicate first names, alert to read last name
		if (roster.some(n => this.info.id != n.id && this.info.fname == n.fname))
			lnspan.classList.add('dupename');

		h2.append(lnspan);
		note.classList.add('note');
		note.innerHTML = this.info.note;
		for (const s of schema) {
			const li = document.createElement('li'),
				btn = document.createElement('button');
			btn.dataset.schemaval = s.value;
			btn.addEventListener('click', (e) => {
				for (const btn2 of this.#actions) {
					btn2.disabled = true;
					btn2.classList.remove('picked');
				}
				this.send(s.value)
			});
			li.append(btn);
			this.#actionlist.append(li);
			this.#actions.push(btn);
		}
		this.element.append(h2, note, this.#actionlist);

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

		//Make our entrance
		if (histIndex != null) hist[histIndex].exit();
		if (hist[0]?.event) hist.unshift(this);
		else hist[0] = this;
		histIndex = 0;
		this.enter();
	}

	send(result) {
		let btn;
		for (const s of schema) if (s.value==result) {
			btn = this.#actionlist.querySelector('button[data-schemaval="'+s.value+'"]');
			break;
		}

		if (this.event) {
			//Undo button press
			if (result==this.result) {
				fetchif(!demo, 'ajax.php?req=deleteevent&event='+this.event, (id) => {
					this.info.score -= this.result;
					this.info.denominator--;
					this.event = null;
					this.result = null;
					btn.classList.remove('picked');
					btn.parentNode.parentNode.classList.remove('picked');
					for (const btn2 of this.#actions) btn2.disabled = false;
				});

			//Re-do button press (edit event)
			} else {
				fetchif(!demo, 'ajax.php?req=updateevent&event='+this.event+'&result='+result, (id) => {
					for (const btn2 of this.#actions) btn2.disabled = false;
					btn.classList.add('picked');
					this.info.score += result - this.result;
					this.result = result;
				});
			}
		
		//Send event (create new)
		} else {
			fetchif(!demo, 'ajax.php?req=writeevent&rosterid='+this.info.id+'&result='+result, (id) => {
				for (const btn2 of this.#actions) btn2.disabled = false;
				btn.classList.add('picked');
				btn.parentNode.parentNode.classList.add('picked');
				this.event = id;
				this.result = result;
				if (this.info.score == null) this.info.score = 0;
				this.info.score += result;
				this.info.denominator++;
			});
		}
	};

	enter(left) {
		left = left ?? false;
		this.element.classList.add(left ? 'out' : 'in')
		document.getElementById('sinfo').append(this.element);

		const snoozeElement = document.getElementById('snooze');
		snoozeElement.classList.remove('disabled');
		if (isExcused(this.info)) snoozeElement.dataset.excused = 'Excused through '+this.info.excuseduntil.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
		else delete snoozeElement.dataset.excused;

		setTimeout(() => { this.element.classList.remove(left ? 'out' : 'in'); }, 1); //JS will skip the animation without the timeout
	}
	exit(right) {
		right = right ?? false;
		this.element.classList.add(right ? 'in' : 'out');
		setTimeout(() => {
			this.element.remove();
			this.element.classList.remove(right ? 'in' : 'out');
		}, 250);
	}
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

//=========
// UTILITY
//=========

function fetchif(cond, url, then) {
	if (!cond) return then(-1);
	fetch(url, {method: 'get'})
		.then((response) => response.json()).then(then)
		.catch(console.error);
}