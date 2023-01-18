document.addEventListener('DOMContentLoaded', function() {
	
	//Make items editable
	document.querySelectorAll('.editable').forEach(function(element) {
		let item = element.id,
			edit = document.createElement('a');
		edit.classList.add('edit');
		edit.textContent="✎";
		edit.href='#';
		edit.addEventListener('click', function(e) {
			e.preventDefault();
			let inp = document.createElement(item=='semester' ? 'select' : 'input');
			inp.name = item;
			inp.id = item;
			if (item=='classname') {
				inp.placeholder = "Class name";
				inp.type = 'text';
			} else if (item=='year') {
				inp.placeholder = "year";
				inp.type = 'number';
				inp.min = '2023';
				inp.max = '2100';
			} else if (item=='semester') {
				let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
				seasons.forEach(function(s) { html += '<option value="'+s.toLowerCase()+'">'+s+'</option>'; })
				inp.innerHTML = html;
			}
			if (item=='semester') inp.value = element.textContent.replace('✎','').toLowerCase(); //To do, not working
			else inp.value = element.textContent.replace('✎','');

			element.parentNode.insertBefore(inp, element)
			element.remove();
			inp.focus();
		});
		element.appendChild(edit);
	});
	
	//Handle CSV
	let csvElement = document.getElementById('csvfile');
	csvElement.addEventListener('change', function(e) {
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
					i = !stable.lastElementChild.classList.contains('odd');
				response.forEach(function(row) {
					let tr = document.createElement('tr');
					if (i) tr.classList.add('odd');
					tr.innerHTML = '<td>'+row['fname']+'</td><td>'+row['lname']+'</td>';
					stable.appendChild(tr);
					i = !i;
				});
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