"use strict";
var deleted = [];
document.addEventListener('DOMContentLoaded', () => {

	//Make schema info editable
	if (document.body.classList.contains('admin-edit') && !schema.global) {
		const title = document.getElementById('name');

		makeEditable(title, {placeholder: 'Schema Name', data: inps => ({req: 'updateschema', id: schemaid, name: inps[0].value})})

		//Delete button
		title.querySelector('.actions').append(...actionButtons(['delete']));
		title.addEventListener('click', function(e) {
			e.preventDefault();
			if (!e.target.classList.contains('delete')) return;
			const delform = document.getElementById('deleteform');
			if (!classes) {
				if (confirm('Are you sure you want to delete '+title.textContent+'?')) delform.submit();
			} else {
				//Dialog of compatible schemae
			}
		});
	}

	//Populate and add schema items
	document.querySelector('#schemaitems .addnew a')?.addEventListener('click', function(e) {
		e.preventDefault();
		if (!this.classList.contains('disabled')) addSchemaItem();
		if (document.querySelectorAll('#schemaitems tbody tr').length >= 5) this.classList.add('disabled');
	});
	if ('schema' in window) {
		for (const item of schema.items) addSchemaItem(item);
		if (!document.querySelectorAll('#schemaitems tbody tr').length) addSchemaItem();
	}
	preview();

	//Delete schema items
	const tbody = document.querySelector('#schemaitems tbody');
	tbody?.addEventListener('click', function(e) {
		if (!e.target.classList.contains('delete')) return;
		e.preventDefault();
		const tr = e.target.closest('TR');
		if ('id' in tr.dataset) deleted.push(tr.dataset.id);
		tr.remove();
		dirty();
		document.querySelector('#schemaitems .addnew a').classList.remove('disabled');
	});

	//Update color text and enforce single grapheme
	tbody?.addEventListener('input', function(e) {
		if (e.target.name=='color')
			e.target.parentNode.querySelector('.colortext').textContent = e.target.value;
		else if (e.target.name=='text') {
			const gphm = [...new Intl.Segmenter().segment(e.target.value)];
			if (gphm.length > 1) e.target.value = gphm[0].segment;
		}
		dirty(e);
	});

	//Save item info
	document.getElementById('save')?.addEventListener('click', function(e) {
		if (!validate(tbody.querySelectorAll('input'))) return;
		this.textContent = 'Saving...';
		this.disabled = true;

		const formData = new FormData();
		formData.append("req", "editschemaitems");
		const params = {'schema': schemaid, 'delete': deleted, 'new': [], 'update': []};

		for (const tr of tbody.querySelectorAll('tr')) {
			if (!tr.dataset.dirty) continue;
			const trdata = {};
			if ('id' in tr.dataset) trdata.id = tr.dataset.id;
			for (const i of tr.querySelectorAll('input')) trdata[i.name] = i.value.replace('#','');
			if ('id' in tr.dataset) params.update.push(trdata);
			else params.new.push(trdata);
		}
		formData.append('params', JSON.stringify(params));
		fetch('../ajax.php', {
			method: 'post',
			body: formData
		}).then((response) => response.json()).then((response) => {
			this.textContent = 'Saved';
			deleted = [];
			for (const tr of tbody.querySelectorAll('tr')) {
				delete tr.dataset.dirty;

				//Add id to new rows
				if (!('id' in tr.dataset))
					for (const r in response)
						if (tr.querySelector('input[name=text]').value==response[r].text && tr.querySelector('input[name=value]').value==response[r].value && tr.querySelector('input[name=color]').value=='#'+response[r].color) {
							tr.dataset.id = r;
							break;
						}
			}
		}).catch(console.log);
	});

	//Confirm before closing if dirty
	window.addEventListener('beforeunload', function(e) {
		if (!document.getElementById('save')?.disabled)
			e.preventDefault();
	});
});

function addSchemaItem(item) {
	const template = document.getElementById('schemaitem'),
		clone = template.content.cloneNode(true).querySelector('tr');

	if (item !== undefined) {
		clone.dataset.id = item.id;
		const inputs = clone.querySelectorAll('input');
		inputs[0].value = item.text;
		inputs[2].value = '#'+item.color;
		clone.querySelector('.colortext').textContent = '#'+item.color;
		if (schema.global || ('locked' in item && item.locked)) {
			clone.querySelector('.delete').remove();
			inputs[1].closest('TR').classList.add('locked');
			inputs[1].parentNode.textContent = item.value;
		} else inputs[1].value = item.value;
	}

	document.querySelector('#schemaitems tbody').appendChild(clone);
}

function dirty(e) {
	if (e !== undefined) e.target.closest('tr').dataset.dirty = true;
	const btn = document.getElementById('save');
	btn.disabled = false;
	btn.textContent = 'Save';
	preview();
}

function preview() {
	const ul = document.querySelector('.studentinfo ul'),
		trs = Array.from(document.querySelectorAll('#schemaitems tbody tr'));
	trs.sort((a, b) => trval(b) > trval(a));
	ul.innerHTML = '';
	let css = '';
	for (const tr of trs) {
		const trv = trval(tr),
			color = tr.querySelector('input[name="color"]').value,
			symbol = tr.querySelector('input[type="text"]').value,
			btn = markup({tag: 'li', children: [{tag: 'button', attrs: {'data-schemaval': trv}, children: symbol}]});
		ul.append(btn);
		css += 'button[data-schemaval="'+trv+'"] { background: '+color+'; }';
		css += 'button[data-schemaval="'+trv+'"]:hover { background-color: color(from '+color+' srgb calc(r * 0.85) calc(g * 0.85) calc(b * 0.85)) !important; }';
		if (symbol in icons)
			css += 'button[data-schemaval="'+trv+'"] { text-indent: -9999em; background-image: url("/icon/svg.php?icon='+icons[symbol]+'&color=FFF"); }';
		document.getElementById('previewcss').textContent = css;
	}
}

//Get the value of the row whether it's solidified or not
function trval(tr) {
	const valinp = tr.querySelector('.value input');
	return parseFloat(valinp ? valinp.value : tr.querySelector('.value').textContent);
}