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
			const req = new XMLHttpRequest();
			req.open('GET', '../ajax.php?req=searchstudent&phrase='+val, true);
			req.onload = function() {
				const response = JSON.parse(this.response);
				cache[val] = response;
				drawList(response);
			};
			req.onerror = () => {  };
			req.send();
		}, 250));
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
			const li = dce('a');
			student.semester = student.semester[0].toUpperCase() + student.semester.slice(1);
			li.href = '/admin/class.php?class='+student.classid+'#student-'+student.id;
			li.innerHTML = '<span class="student">'+student.fname+' '+student.lname+'</span>'+
				'<span class="class">'+student.name+'<span class="semester">'+student.semester+' '+student.year+'</span></span>';
			list.append(li);
		}
		if (!response.length) {
			const span = dce('span', 'none');
			span.textContent = 'No students';
			list.append(span);
		}
	}

	//Expand and collapse inactive classes
	setInactives();
	document.getElementById('collapse')?.addEventListener('click', function() {
		localStorage['hide-inactive'] = localStorage['hide-inactive'] == 'true' ? 'false' : 'true';
		setInactives();
	});
});

function setInactives() {
	const body = document.querySelector('body');
	if (localStorage['hide-inactive'] == 'true') body.classList.add('hide-inactive');
	else body.classList.remove('hide-inactive');
}