function markup(element) {
	let el;
	if (element instanceof HTMLElement) el = element;
	else if (['string', 'number'].includes(typeof element)) el = document.createTextNode(element);
	else {
		el = document.createElement(element.tag);
		if ('attrs' in element) for (const a in element.attrs) el.setAttribute(a, element.attrs[a]);
		if ('children' in element && element.children !== null) {
			if (typeof element.children == 'string') el.innerHTML = element.children;
			else for (const c of element.children) if (c !== null) el.append(markup(c));
		}
	}
	return el;
}

class Data {
	DB_VERSION = 1;
	STORE_NAME = 'snapshots';
	namespace = null;
	reauthPromise = null;

	constructor(cache=true) {
		if (new URLSearchParams(location.search).has('try'))
			this.namespace = 'demo'; //Disable writes
		this.cache = cache;
	}

	//User-facing function to get data from the server or cache
	async get(req, params = {}) {
		const identifier = params.class ?? 'all';
		let result;
		try {
			result = await this.read(req, params);
		
		//If network fails, try to get a cached version
		} catch (error) {
			if (error.authentication) throw error;
			if (!this.namespace) {
				if (localStorage.userId) this.namespace = `user:${localStorage.userId}`;
				else throw error;
			}
			let cached;
			try {
				cached = await this.getSnapshot(req, identifier);
			} catch (storageError) {
				console.error('Unable to read picker snapshot', storageError);
				throw error;
			}
			if (!cached) throw error;
			document.body.classList.add('stale');
			document.getElementById('offline').textContent = 'Using saved data';
			return {data: cached.data, source: 'cache', revision: cached.revision, savedAt: cached.savedAt};
		}

		const {data, revision} = result,
			userId = data.userId ?? localStorage.userId;
		if (userId && this.namespace != 'demo') {
			this.namespace = `user:${userId}`;
			localStorage.userId = userId;
		}
		if (this.cache) await this.put(req, identifier, data, revision);

		document.body.classList.remove('stale');
		updateNetworkState();
		return {data, source: 'network', revision};
	}

	//Go to the server for data
	async read(req, params = {}) {
		const query = new URLSearchParams({req, ...params});
		let response = await fetch('/ajax.php?'+query.toString(), {method: 'GET'});
		
		if (response.status === 401) {
			await this.reauthenticate();
			response = await fetch('/ajax.php?'+query.toString(), {method: 'GET'});
		}
		return {
			data: await this.interThen(response),
			revision: response.headers.get('ETag')
		};
	}

	//Write data to server
	async write(data, then) {
		if (this.namespace=='demo') return then(-1);
		try {
			const formData = new FormData();
			for (const key in data) formData.append(key, data[key]);
			let response = await fetch('/ajax.php', {method: 'POST', body: formData});
			if (response.status === 401) {
				await this.reauthenticate();
				response = await fetch('/ajax.php', {method: 'POST', body: formData});
			}
			const result = await this.interThen(response);

			return then ? then(result) : result;
		} catch (error) {
			if (error.authentication) throw error;
		}
	}

	reauthenticate() {
		if (this.reauthPromise) return this.reauthPromise;
		const dialog = document.getElementById('reauth'),
			form = document.getElementById('reauth-form'),
			password = document.getElementById('reauth-password'),
			error = document.getElementById('reauth-error');

		this.reauthPromise = new Promise(resolve => {
			dialog.oncancel = event => event.preventDefault();
			form.onsubmit = async event => {
				event.preventDefault();
				const submit = form.querySelector('button[type="submit"]');
				submit.disabled = true;
				error.hidden = true;
				try {
					const result = await this.write({req: 'reauthenticate', password: password.value, userId: dialog.dataset.userId});
					if (!result.success) {
						error.textContent = 'The password was incorrect.';
						error.hidden = false;
						password.value = '';
						password.focus();
						password.classList.add('error');
						return;
					}
					if (Number(result.userId) !== Number(dialog.dataset.userId)) {
						window.location.href = '/';
						return;
					}
					dialog.close();
					password.value = '';
					resolve();
				} catch (requestError) {
					error.textContent = requestError.message || 'Unable to verify password. Try again.';
					error.hidden = false;
				} finally {
					submit.disabled = false;
				}
			};
			dialog.showModal();
			password.focus();
		}).finally(() => { this.reauthPromise = null; });
		return this.reauthPromise;
	}

	async interThen(response) {
		if (!response.ok) throw new Error('Network error: '+response.status);
		return await response.json();
	}

	open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('pickal', this.DB_VERSION);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains(this.STORE_NAME))
					request.result.createObjectStore(this.STORE_NAME, {keyPath: 'id'});
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	key(type, identifier) {
		return `${this.namespace}:${type}:${identifier}`;
	}

	normalize(data) {
		const snapshot = structuredClone(data); //Bad practice to mutate the response object?
		for (const student of snapshot.roster ?? []) {
			if (student.excuseduntil != null && !(student.excuseduntil instanceof Date))
				student.excuseduntil = new Date(student.excuseduntil);
		}
		return snapshot;
	}

	async put(type, identifier, data, revision) {
		const db = await this.open();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(this.STORE_NAME, 'readwrite');
			transaction.objectStore(this.STORE_NAME).put({
				id: this.key(type, identifier),
				namespace: this.namespace,
				type,
				identifier,
				data: this.normalize(data),
				revision,
				savedAt: new Date().toISOString()
			});
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	async getSnapshot(type, identifier) {
		const db = await this.open();
		return new Promise((resolve, reject) => {
			const request = db.transaction(this.STORE_NAME).objectStore(this.STORE_NAME).get(this.key(type, identifier));
			request.onsuccess = () => {
				const snapshot = request.result ?? null;
				if (snapshot) snapshot.data = this.normalize(snapshot.data);
				resolve(snapshot);
			};
			request.onerror = () => reject(request.error);
		});
	}
};