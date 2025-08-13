"use strict";
var timeouts = [],
	cache = {};

document.addEventListener('DOMContentLoaded', () => {
	const search = document.getElementById('search'),
		list = document.getElementById('autocomplete');

	search.addEventListener('input', function(e) {
		for (const t of timeouts) clearTimeout(t); //Cancel any keypresses <250ms ago
		timeouts = [];
		const val = search.value;

		if (!val) {
			list.textContent = '';
			return;
		} else if (val in cache) {
			drawList(cache[val]);
			return;
		}

		timeouts.push(setTimeout(() => {
			fetch('../ajax.php?'+(new URLSearchParams({req: 'searchstudent', phrase: val}).toString()), {method: 'get'})
			.then(interThen).then(response => {
				cache[val] = response;
				drawList(response);
			}).catch(console.error);
		}, 250));
	});

	//Keyboard nav over autocomplete list
	search.addEventListener('keydown', function(e) {
		if (e.key=='Escape') search.blur();
		if (e.key in ['ArrowDown', 'ArrowUp', 'Enter']) return;

		const curSelect = list.querySelector('.selected');
		if (e.key=='Enter') {
			curSelect?.click();
			return;
		}

		let newSelect;
		if (e.key=='ArrowDown') newSelect = curSelect ? curSelect.nextElementSibling : list.querySelector('a');
		if (e.key=='ArrowUp') newSelect = curSelect ? curSelect.previousElementSibling : list.querySelector('a:last-of-type');
		if (newSelect) {
			curSelect?.classList.remove('selected');
			newSelect.classList.add('selected');
		} 
	});

	search.addEventListener('focus', function(e) {
		list.style.opacity = 1;
		list.style.transition = '0.25s opacity';
		list.style.display = 'block';
	});
	search.addEventListener('blur', function(e) {
		list.style.opacity = 0;
		
		setTimeout(() => {
			list.style.display = 'none';
			list.style.transition = null;
		}, 250); //Don't hide list before we can click it
	});

	function drawList(response) {
		list.textContent = ''; //Clear existing results
		for (const student of response) {
			const li = markup({tag: 'a', attrs: {href: `/admin/class/${student.classid}#student-${student.id}`}, children: [
				{tag: 'span', attrs: {class: 'student'}, children: student.fname+' '+student.lname},
				{tag: 'span', attrs: {class: 'class'}, children: student.name+`<span class="semester">${student.semester} ${student.year}</span>`},
			]});
			li.addEventListener('mouseover', function(e) {
				for (const a of list.querySelectorAll('a')) a.classList.remove('selected');
				li.classList.add('selected');
			});
			student.semester = student.semester[0].toUpperCase() + student.semester.slice(1);
			list.append(li);
		}
		if (!response.length)
			list.append(markup({tag: 'span', attrs: {class: 'none'}, children: ['No students']}));
	}

	//Expand and collapse inactive classes
	setInactives();
	document.getElementById('collapse')?.addEventListener('click', function() {
		localStorage['hide-inactive'] = localStorage['hide-inactive'] == 'true' ? 'false' : 'true';
		setInactives();
	});

	//Focus search on / key
	document.addEventListener('keydown', function(e) {
		if (e.key == '/' && document.activeElement.tagName !== 'INPUT') {
			e.preventDefault();
			document.getElementById('search').focus();
		}
	});

	document.getElementById('newschema').addEventListener('click', newSchema);
	if (window.location.hash === '#newschema') newSchema();
});

function setInactives() {
	const body = document.querySelector('body');
	if (localStorage['hide-inactive'] == 'true') body.classList.add('hide-inactive');
	else body.classList.remove('hide-inactive');
}