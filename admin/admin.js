document.addEventListener('DOMContentLoaded', function() {
	
	//Make items editable
	document.querySelectorAll('.editable').forEach(addEditIcon);
	document.querySelectorAll('td.lname').forEach(addEditIcon);
	
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
				console.log(this.response);
				response = JSON.parse(this.response);
				csvElement.parentNode.innerHTML = "Uploaded "+response.length+" students";
				
				let stable = document.getElementById('roster').querySelector('tbody'),
					i = stable.childElementCount>0 && !stable.lastElementChild.classList.contains('odd');
				response.forEach(function(row) {
					let tr = document.createElement('tr');
					if (i) tr.classList.add('odd');
					tr.dataset.id = row['id'];
					tr.innerHTML = '<td class="fname">'+row['fname']+'</td><td class="lname">'+row['lname']+'</td><td class="nullscore">—</td>';
					stable.appendChild(tr);
					i = !i;
				});
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
			};
			req.onerror = function() {
				console.log(this.response);
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