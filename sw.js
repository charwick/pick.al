const CACHE_NAME = 'pickal-v1';
const STATIC_ASSETS = [
	'/',
	'/class/0',
	'/picker.css',
	'/picker.js',
	'/manifest.webmanifest',
];

for (const i of [
	'icon-32.png',					'icon-192.png',					'icon-512.png',
	'caret-left-fill.svg/FFF',		'caret-left-fill.svg/777',		'caret-right-fill.svg/777',
	'caret-right-fill.svg/FFF',		'moon-fill.svg/FFF',			'archive.svg/FFF',
	'unarchive.svg/FFF',			'x-lg.svg',						'x-lg.svg/FFF',
	'question-circle-fill.svg/FFF',	'question-circle-fill.svg/777',	'logo.svg/FFF',
	'arrow-left.svg/FFF',			'list.svg/FFF',					'download.svg',
	'person-fill.svg',				'upload.svg',					'chevron-up.svg/777',
	'chevron-down.svg/777',			'pencil-fill.svg',				'check-lg.svg',
	'check-lg.svg/FFF',				'trash3-fill.svg',				'moon-fill.svg',
	'copy.svg',						'archive.svg',					'unarchive.svg',
	'eye-slash.svg',				'eye.svg',						'orcid.svg'
]) STATIC_ASSETS.push('/icon/'+i);

//Download static assets
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(STATIC_ASSETS))
			.catch(err => {
				console.error("Service worker install failed:", err);
				throw err;
			})
	);
	self.skipWaiting(); //Don't wait for tabs to close
});

//Delete all caches except those matching CACHE_NAME
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys => Promise.all(
			keys.filter(key => key !== CACHE_NAME)
					.map(key => caches.delete(key))
		))
	);
	self.clients.claim(); //Don't wait for reload
});

self.addEventListener('fetch', event => {
	if (event.request.method !== 'GET') return; //Ignore POSTs
	const requestURL = new URL(event.request.url);
	if (requestURL.origin !== self.location.origin) return; //Ignore third-party requests

	// Static assets matching URL (including / and /icons/*): serve from cache
	if (STATIC_ASSETS.includes(requestURL.pathname)) {
		event.respondWith(
			caches.match(requestURL.pathname)
			// .then(response => response || fetch(event.request))
		);
		return;

	// /class/:id routes: serve the '/class/0' asset from cache
	} else if (requestURL.pathname.startsWith('/class/')) {
		event.respondWith(
			caches.match('/class/0')
			// .then(response => response || fetch(event.request))
		);
		return;
	}

	// Everything else: fetch from network without caching
	event.respondWith(fetch(event.request));
});