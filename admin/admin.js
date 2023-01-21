document.addEventListener('DOMContentLoaded', function() {
	
	//Make items editable
	document.querySelectorAll('.editable').forEach(addEditIcon);
	document.querySelectorAll('td.lname').forEach(addEditIcon);
	
	//Add new student
	let addStudent = document.querySelector('#addnew a');
	if (addStudent) addStudent.addEventListener('click', function(e) {
		e.preventDefault();
		if (this.classList.contains('disabled')) return;
		this.classList.add('disabled');
		
		let inp1 = '<input type="text" name="fname" placeholder="First name">',
			inp2 = '<input type="text" name="lname" placeholder="Last name"> <a href="#" class="save">✓</a><a href="#" class="cancel">×</a>',
			tr = studentRow(inp1, inp2);
		
		tr.querySelector('.cancel').addEventListener('click', function(e) {
			e.preventDefault();
			tr.remove();
			document.querySelector('#addnew a').classList.remove('disabled');
		});
		
		tr.querySelector('.save').addEventListener('click', function(e) {
			e.preventDefault();
			let data = ['classid='+classid], go=true;
			tr.querySelectorAll('input').forEach(function(inp) {
				inp.classList.remove('error');
				if (inp.value == '') { //Basic validation
					inp.classList.add('error');
					go = false; //Can't return since it would only return from this inner forEach function
				}
				data.push(inp.name+'='+inp.value);
				inp.oldTagName='td';
			});
			if (!go) return;
			
			let req = new XMLHttpRequest();
			req.open('GET', '../ajax.php?req=addstudent&'+data.join('&'), true);
			function error() { tr.querySelectorAll('input').forEach(function(inp) { inp.classList.add('error'); }); }
			req.onload = function() {
				let studentid =  parseInt(this.response);
				if (!studentid) {
					error();
					return;
				}
				tr.dataset.id = studentid;
				let snum = document.getElementById('num_students');
				snum.textContent = parseInt(snum.textContent)+1
				tr.querySelectorAll('input').forEach(function(inp) { solidify(inp); });
				document.querySelector('#addnew a').classList.remove('disabled');
			};
			req.onerror = error;
			req.send();
		});
	});
	
	//Handle CSV
	let csvElement = document.getElementById('csvfile');
	if (csvElement) csvElement.addEventListener('change', function(e) {
		if (this.files.length == 0) return;
		let reader = new FileReader();
		
		reader.onload = function(e) {
			let formData = new FormData(),
				req = new XMLHttpRequest();
			
			formData.append("csv", e.target.result);
			formData.append("req", "uploadroster");
			formData.append("class", ''+classid);
			req.open("POST", "../ajax.php", true);
			req.onload = function() {
				response = JSON.parse(this.response);
				csvElement.parentNode.innerHTML = "Uploaded "+response.length+" students";
				response.forEach(function(row) {
					let tr = studentRow(row['fname'], row['lname']);
					tr.dataset.id = row['id'];
				});
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
			};
			req.onerror = function() {
				let error = document.createElement('span');
				error.textContent = 'There was an error uploading this CSV.';
				csvElement.parentNode.insertBefore(error, csvElement);
			}
			req.send(formData);
		};
		reader.readAsText(this.files[0]);
	});
});

var editables = {
	name: {placeholder: 'Class Name'},
	year: {min: 2023, max: 2100, placeholder: 'year'},
}
function addEditIcon(element) {
	let edit = document.createElement('a');
	edit.classList.add('edit');
	edit.textContent="✎";
	edit.href='#';
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		
		//Create an input element
		let inp = makeInput(element);
		
		//Do the same for the first name if necessary, and add an explicit save button since we have 2 inputs
		if (element.tagName.toLowerCase() == 'td') {
			let inp2 = makeInput(element.previousElementSibling);
			let save = document.createElement('a');
			save.classList.add('save');
			save.textContent="✓";
			save.href='#';
			save.addEventListener('click', function(e) {
				e.preventDefault();
				inp.classList.remove('error');
				inp2.classList.remove('error');
				if (inp.value=='') inp.classList.add('error');
				if (inp2.value=='') inp2.classList.add('error');
				if (inp.value=='' || inp2.value=='') return;
				
				//Only make a request if the value has changed
				if (inp.value != inp.oldValue || inp2.value != inp2.oldValue) {
					let req = new XMLHttpRequest();
					req.open('GET', '../ajax.php?req=editstudent&student='+element.parentNode.dataset.id+'&fname='+inp2.value+'&lname='+inp.value, true);
					req.onload = function() {
						elLname = solidify(inp);
						elFname = solidify(inp2);
					};
					req.onerror = function() { inp.addClass('error'); };
					req.send();
				} else {
					solidify(inp);
					solidify(inp2);
				}
			});
			element.append(save);
			inp2.focus();
		} else {
	
			//Save on blur
			inp.addEventListener('blur', function(e) {
				if (inp.value == '') { //Validate
					inp.classList.add('error');
					inp.focus();
					return;
				}
					
				//Only make a request if the value has changed
				if (inp.value != inp.oldValue) {
					let req = new XMLHttpRequest();
					req.open('GET', '../ajax.php?req=updateclassinfo&class='+classid+'&k='+inp.name+'&v='+inp.value, true);
					req.onload = function() {
						el = solidify(inp);
					};
					req.onerror = function() { inp.addClass('error'); };
					req.send();
				} else solidify(inp);
			});
			inp.focus();
		}
	});
	element.appendChild(edit);
}

//Turns an element into an input
function makeInput(element) {
	let inp, item = element.id;
	if (element.dataset.inputtype=='select') {
		inp = document.createElement('select');
		let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
		seasons.forEach(function(s) { html += '<option value="'+s.toLowerCase()+'">'+s+'</option>'; })
		inp.innerHTML = html;
	} else {
		inp = document.createElement(item=='semester' ? 'select' : 'input');
		inp.type = element.dataset.inputtype;
	}
	inp.name = item;
	inp.id = item;
	inp.oldTagName = element.tagName.toLowerCase(); //Save to recreate later
	inp.classList.add('submittable');
	if (item in editables)
		for (const [attr,val] of Object.entries(editables[item]))
			inp.setAttribute(attr, val);

	if (item=='semester') inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
	else inp.value = element.textContent.replace('✎','');
	inp.oldValue = inp.value;
	
	if (element.tagName.toLowerCase() == 'td') {
		element.innerHTML = '';
		element.append(inp);
	} else {
		element.parentNode.insertBefore(inp, element)
		element.remove();
	}
	return inp;
}

//Turns an input back into an element
function solidify(iel) {
	let el;
	if (iel.oldTagName == 'td') {
		el = iel.parentNode;
		el.textContent = iel.value;
		if (el.classList.contains('lname')) addEditIcon(el);
	} else {
		el = document.createElement(iel.oldTagName);
		el.classList.add('editable');
		el.id = iel.name;
		if (iel.tagName.toLowerCase() == 'select') {
			el.textContent = iel.querySelector('[value="'+iel.value+'"]').textContent;
			el.dataset.inputtype = iel.tagName.toLowerCase();
		} else {
			el.textContent = iel.value;
			el.dataset.inputtype = iel.type;
		}
		iel.parentNode.insertBefore(el, iel);
		addEditIcon(el);
	}
	iel.remove();
	return el;
}

function studentRow(col1, col2) {
	let stable = document.getElementById('roster').querySelector('tbody'),
		tr = document.createElement('tr');
	if (stable.childElementCount>1 && !stable.lastElementChild.previousElementSibling.classList.contains('odd')) tr.classList.add('odd');
	tr.innerHTML = '<td class="fname">'+col1+'</td><td class="lname">'+col2+'</td><td class="nullscore">—</td>';
	stable.insertBefore(tr, stable.lastElementChild);
	return tr;
}