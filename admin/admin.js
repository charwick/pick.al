document.addEventListener('DOMContentLoaded', function() {
	
	//Make items editable
	document.querySelectorAll('.editable').forEach(addEditIcon);
	
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
					tr.innerHTML = '<td>'+row['fname']+'</td><td>'+row['lname']+'</td><td class="nullscore">—</td>';
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
	name: {input: 'text', attrs: {placeholder: 'Class Name'}},
	semester: {input: 'select'},
	year: {input: 'number', attrs: {min: 2023, max: 2100, placeholder: 'year'}},
	activeuntil: {input: 'date'}
}
function addEditIcon(element) {
	let item = element.id,
		edit = document.createElement('a');
	edit.classList.add('edit');
	edit.textContent="✎";
	edit.href='#';
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		let inp;
		if (editables[item]['input']=='select') {
			inp = document.createElement('select');
			let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
			seasons.forEach(function(s) { html += '<option value="'+s.toLowerCase()+'">'+s+'</option>'; })
			inp.innerHTML = html;
		} else {
			inp = document.createElement(item=='semester' ? 'select' : 'input');
			inp.type = editables[item]['input'];
		}
		inp.name = item;
		inp.id = item;
		inp.oldTagName = element.tagName; //Save to recreate later
		inp.classList.add('submittable');
		if ('attrs' in editables[item])
			for (const [attr,val] of Object.entries(editables[item]['attrs']))
				inp.setAttribute(attr, val);

		if (item=='semester') inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
		else inp.value = element.textContent.replace('✎','');
		inp.oldValue = inp.value;
	
		//Allow saving on blur
		inp.addEventListener('blur', function(e) {
			function solidify(iel) {
				let el = document.createElement(iel.oldTagName);
				el.classList.add('editable');
				el.id = inp.name;
				el.textContent = iel.tagName.toLowerCase() == 'select' ? iel.querySelector('[value="'+inp.value+'"]').textContent : iel.value;
				iel.parentNode.insertBefore(el, iel);
				addEditIcon(el);
				iel.remove();
				return el;
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

		element.parentNode.insertBefore(inp, element)
		element.remove();
		inp.focus();
	});
	element.appendChild(edit);
}