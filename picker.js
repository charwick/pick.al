"use strict";
var hist = [], //Reverse coded: current student = index[0]
	histIndex = null,
	currentAnim = false,
	currentQ = null,
	activeVis = true;

document.addEventListener('DOMContentLoaded', () => {
	if ('roster' in window) for (const s of roster) if (s.excuseduntil != null) {
		const exc = new Date(s.excuseduntil);
		s.excuseduntil = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1);
		if (isExcused(s)) document.querySelector(`li[data-id="${s.id}"]`).classList.add('excused');
	}
	document.querySelector('#bodywrap > .actions')?.addEventListener('click', function(e) {
		e.preventDefault();
		if (e.target.classList.contains('back')) buttonFunc('back')(e);
		else if (e.target.classList.contains('forward')) buttonFunc('forward')(e);
		else if (e.target.classList.contains('snooze')) {
			const now = new Date();
			let excdate, fn;
			if (!isExcused(hist[histIndex].info)) { //Set excused
				excdate = now.toLocaleDateString('en-CA');
				fn = function() {
					now.setHours(23); now.setMinutes(59);
					hist[histIndex].info.excuseduntil = now;
					e.target.dataset.excused = 'Excused until tomorrow';
					document.querySelector(`#roster [data-id="${hist[histIndex].info.id}"]`).classList.add('excused');
				}
			} else { //Clear excused
				excdate = '';
				fn = function() {
					hist[histIndex].info.excuseduntil = null;
					delete e.target.dataset.excused
					document.querySelector(`#roster [data-id="${hist[histIndex].info.id}"]`).classList.remove('excused');
				}
			}
			fetchif(!demo, 'ajax.php', {req: 'studentexcused', id: hist[histIndex].info.id, excused: excdate}, fn);
		}
	});
	document.getElementById('pick')?.addEventListener('click', buttonFunc('choose'));

	function firstQuestion(e) {
		if (e) e.preventDefault();
		const nextQ = document.querySelector('#roster li[data-q]');
		currentQ = nextQ.dataset.q;
		document.getElementById('question').classList.add('active');
		document.getElementById('qtext').textContent = nextQ.textContent;
		setQbuttons();
	}
	document.getElementById('q-queue')?.addEventListener('click', firstQuestion);

	//Keyboard Navigation
	document.addEventListener('keydown', function(e) {
		if (e.key == '?') {
			const d = document.getElementById('shortcuts');
			if (d.open) d.close();
			else d.show();
		} else if (e.key == 'm') {
			if (!window.classid) window.location.href = '/admin';
			else window.location.href = '/admin/class.php?class='+classid;
		}

		if (!window.classid) return;

		if (e.key == ' ') buttonFunc('choose')();
		else if (e.key == 'ArrowLeft' && histIndex < hist.length-1) buttonFunc('back')();
		else if (e.key == 'ArrowRight' && histIndex) buttonFunc('forward')();
		else if (['1','2','3','4','5'].includes(e.key) && histIndex != null) {
			const i = parseInt(e.key),
				buttons = hist[histIndex].element.querySelectorAll('button');
			if (buttons.length < i) return;
			buttons[i-1].click();
		} else if (e.key == '0' && histIndex != null) hist[histIndex].element.querySelector('button.picked')?.click();
		else if (e.key == 'z') document.querySelector('.snooze').click();
		else if (e.key == 'r') {
			const roster = document.getElementById('roster');
			if (roster.classList.contains('open')) roster.classList.remove('open');
			else roster.classList.add('open');
		} else if (e.key == 'q') {
			if (currentQ) {
				const nextQ = document.querySelector(`#roster li[data-q="${currentQ}"]`).nextElementSibling;
				if ('q' in nextQ.dataset) {
					currentQ = nextQ.dataset.q;
					document.getElementById('qtext').textContent = nextQ.textContent;
				} else {
					currentQ = null;
					document.getElementById('question').classList.remove('active');
				}
				setQbuttons();
			} else firstQuestion();
		} else if (e.key == 'Escape') {
			if (document.getElementById('roster').classList.contains('open')) document.getElementById('roster').classList.remove('open');
			if (document.getElementById('shortcuts').open) document.getElementById('shortcuts').close();
		}
	});

	//Active/inactive class list switcher
	for (const i of document.querySelectorAll('.switchable')) i.addEventListener('click', function(e) {
		activeVis = !activeVis;
		for (const j of document.querySelectorAll('.active')) j.style.display = activeVis ? 'block' : 'none';
		for (const j of document.querySelectorAll('.inactive')) j.style.display = activeVis ? 'none' : 'block';
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
		if ('id' in e.target.dataset) {
			const index = roster.findIndex(item => item.id==e.target.dataset.id);
			new StudentEvent(roster[index]);
			this.style.right = null;
			this.classList.remove('open');
		} else if ('q' in e.target.dataset) {
			document.getElementById('question').classList.add('active');
			document.getElementById('qtext').textContent = e.target.textContent;
			this.classList.remove('open');
			currentQ = e.target.dataset.q;
			setQbuttons();
		}
	});
	//Close
	document.getElementById('rosterclose')?.addEventListener('click', function(e) {
		e.preventDefault();
		document.getElementById('roster').classList.remove('open');
	});

	//==================
	// QUEUED QUESTIONS
	//==================

	document.querySelector('#question .actions')?.addEventListener('click', e => {
		e.preventDefault();
		if (e.target.classList.contains('back') || e.target.classList.contains('forward')) {
			const newq = document.querySelector(`#roster li[data-q="${e.target.dataset.q}"]`);
			document.getElementById('qtext').textContent = newq.textContent;
			currentQ = e.target.dataset.q;
			setQbuttons();

		} else if (e.target.classList.contains('clear')) {
			document.getElementById('question').classList.remove('active');
			currentQ = null;

		} else if (e.target.classList.contains('archive')) {
			const archived = document.getElementById('question').classList.contains('archived') ? 1 : 0;
			fetchif(!demo, 'ajax.php', {req: 'archivequestion', archive: archived, id: currentQ}, response => {

				//If we're unarchiving
				if (archived) {
					document.getElementById('question').classList.remove('archived');
					const qs = document.querySelector('#roster li[data-q]');
					let lihead;
					if (!qs) {
						lihead = document.createElement('li');
						lihead.classList.add('head');
						lihead.textContent='Questions';
						document.querySelector('#roster ul').prepend(lihead);
					} else lihead = document.querySelector('#roster li.head');
					const li = document.createElement('li');
					li.dataset.q = currentQ;
					li.textContent = document.getElementById('qtext').textContent;
					lihead.insertAdjacentElement('afterend', li);
				} else {
					document.querySelector(`#roster li[data-q="${currentQ}"]`).remove()
					let newq = document.querySelector('#question .actions .forward').dataset.q;
					if (!newq) newq = document.querySelector('#question .actions .back').dataset.q;
					
					//If we're on an existing result, show it's archived but don't remove
					if (histIndex!==null && hist[histIndex].result !== null) {
						document.getElementById('question').classList.add('archived');
						if (!document.querySelector('#roster li[data-q]')) document.querySelector('#roster li.head')?.remove();
					
					//If we have more questions, swap to the next question
					} else if (newq) {
						document.getElementById('qtext').textContent = document.querySelector(`#roster li[data-q="${newq}"]`).textContent;
						currentQ = newq;
						setQbuttons();
					
					//If there are no more questions, hide the question box
					} else {
						document.getElementById('question').classList.remove('active');
						currentQ = null;
						document.querySelector('#roster li.head').remove();
						document.querySelector('#q-queue').remove();
					}
				}
			});
		}
	});
	
});

class StudentEvent {
	event = null;
	result = null;
	excused = false;
	qid = null;
	qtext = null;
	#actionlist;
	#actions = [];

	constructor(student) {
		if (student == undefined) return;
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
				this.element.style.left = `calc(50% + ${e.changedTouches[0].pageX-this.swipepos}px)`;
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
			btn = this.#actionlist.querySelector(`button[data-schemaval="${s.value}"]`);
			break;
		}

		if (this.event) {
			//Undo button press
			if (result==this.result) {
				fetchif(!demo, 'ajax.php', {req: 'deleteevent', event: this.event}, id => {
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
				this.qid = currentQ;
				this.qtext = currentQ ? document.getElementById('qtext').textContent : null;

				fetchif(!demo, 'ajax.php', {req: 'updateevent', event: this.event, result: result, q: currentQ}, id => {
					for (const btn2 of this.#actions) btn2.disabled = false;
					btn.classList.add('picked');
					this.info.score += result - this.result;
					this.result = result;
				});
			}
		
		//Send event (create new)
		} else {
			this.qid = currentQ;
			this.qtext = currentQ ? document.getElementById('qtext').textContent : null;

			fetchif(!demo, 'ajax.php',{req: 'writeevent', rosterid: this.info.id, result: result, q: currentQ}, id => {
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

		const snoozeElement = document.querySelector('.snooze');
		snoozeElement.classList.remove('disabled');
		if (isExcused(this.info)) snoozeElement.dataset.excused = 'Excused through '+this.info.excuseduntil.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
		else delete snoozeElement.dataset.excused;

		setTimeout(() => { this.element.classList.remove(left ? 'out' : 'in'); }, 1); //JS will skip the animation without the timeout

		//Recall the attached question if applicable, but leave the existing question up for new presses, unless it's archived
		const qel = document.getElementById('question');
		if (this.qid) {
			currentQ = this.qid;
			document.getElementById('qtext').textContent = this.qtext;
			qel.classList.add('active');
			setQbuttons();
		} else if (this.event || qel.classList.contains('archived')) {
			currentQ = null;
			qel.classList.remove('active');
			qel.classList.remove('archived');
		}
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
	if (histIndex < hist.length-1) document.querySelector('#bodywrap > .actions .back').classList.remove('disabled');
	else document.querySelector('#bodywrap > .actions .back').classList.add('disabled');
	if (histIndex) document.querySelector('#bodywrap > .actions .forward').classList.remove('disabled');
	else document.querySelector('#bodywrap > .actions .forward').classList.add('disabled');
}

function setQbuttons() {
	const qs = Array.from(document.querySelectorAll('#roster li[data-q]')),
		n = qs.findIndex(item => item.dataset.q == currentQ);
	let prev, next;
	if (n==-1) {
		prev = null;
		next = qs.length ? qs[0] : null;
		document.getElementById('question').classList.add('archived');
	} else {
		prev = qs[n].previousElementSibling;
		next = qs[n].nextElementSibling;
		document.getElementById('question').classList.remove('archived');
	}
	const b = document.querySelector('#question .back'),
		f = document.querySelector('#question .forward');

	if (prev && 'q' in prev.dataset) {
		b.classList.remove('disabled');
		b.dataset.q = prev.dataset.q;
	} else {
		b.classList.add('disabled');
		delete b.dataset.q;
	}
	if (next && 'q' in next.dataset) {
		f.classList.remove('disabled');
		f.dataset.q = next.dataset.q;
	} else {
		f.classList.add('disabled');
		delete f.dataset.q;
	}
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

function fetchif(cond, url, data, then) {
	if (!cond) return then(-1);
	const formData = new FormData();
	for (const key in data) formData.append(key, data[key]);
	fetch(url, {method: 'POST', body: formData})
		.then(response => {
			if (response.status === 401) {
				window.location.href = '/login/login.php?action=logout';
				return;
			}
			if (!response.ok) throw {status: response.status};
			return response.json();
		}).then(then)
		.catch(console.error);
}