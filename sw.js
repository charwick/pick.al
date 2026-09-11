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
	'eye-slash.svg',				'eye.svg',						'orcid.svg',
	'wifi-off.svg/D88'
]) STATIC_ASSETS.push('/icon/'+i);

//Download static assets
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(STATIC_ASSETS))
			.then(() => self.skipWaiting())
	);
});

//Delete all caches except those matching CACHE_NAME
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys => Promise.all(
			keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
		)).then(() => self.clients.claim())
	);
});

//Network first, fall back to cached version
self.addEventListener('fetch', event => {
	if (event.request.method !== 'GET') return; //Ignore POSTs
	const requestURL = new URL(event.request.url);
	if (requestURL.origin !== self.location.origin) return;

	if (event.request.mode === 'navigate' && requestURL.pathname === '/') {
		event.respondWith(fetch(event.request).catch(() => caches.match('/')));
	} else if (event.request.mode === 'navigate' && requestURL.pathname.startsWith('/class/')) {
		event.respondWith(fetch(event.request).catch(() => caches.match('/class/0')));
	} else if (STATIC_ASSETS.includes(requestURL.pathname)) {
		event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
	}
});