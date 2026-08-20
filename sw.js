const SHELL = 'belavista-shell-v4';
const RUNTIME = 'belavista-runtime-v4';
const APP_SHELL = [
  './', './index.html', './styles.css', './app.js', './components.js', './state.js',
  './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/reference/dashboard.png', './assets/reference/cronograma.png',
  './assets/reference/inventario.png', './assets/reference/leads.png', './assets/reference/compras.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(APP_SHELL.filter(Boolean))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL,RUNTIME].includes(k)).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.github.com') return; // never cache token-backed GitHub responses

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(caches.open(RUNTIME).then(async cache => {
      const cached = await cache.match(req);
      const network = fetch(req).then(resp => { if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone()); return resp; }).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    const copy = resp.clone(); caches.open(RUNTIME).then(cache => cache.put(req, copy)); return resp;
  })));
});
