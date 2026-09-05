const SHELL = 'belavista-shell-admin-runtime-v5384-solar-clock';
const RUNTIME = 'belavista-runtime-admin-runtime-v5384-solar-clock';
const APP_SHELL = [
  './public-runtime-polish-v5332.mjs?v=5.3.32',
  './admin-lots-canvas-v1.css',
  './admin-lots-canvas-v1.js?v=admin-lots-canvas-v1',
  './', './index.html', './styles.css?v=solar-clock-hover-v5384', './map-page-widgets-v5.css?v=operations-v19', './app.js?v=solar-clock-hover-v5384',
  './components.js?v=solar-clock-hover-v5384&route=ngrok-route-v1', './runtime-url-v1.mjs?v=ngrok-route-v1', './public-leads-map-v50.mjs?v=admin-public-map-parity-v1&route=ngrok-route-v1', './admin-public-map-surface-v5352.mjs?v=5.3.53', './admin-brand-style-v1.css?v=alianza-brand-v2-satellite-ground-5381', './state.js?v=solar-clock-hover-v5384', './map-page-widgets-v5.js?v=operations-v19', './assets/data/dwg-georeference.json?v=dwg-georef-v1', './assets/model/alianca_park_masterplan_preview.glb?v=gpu-staged-5367', './reservation-flow.mjs?v=7', './encarregados.html', './encarregados.css?v=1', './encarregados.js?v=operations-v19', './firebase.mjs?v=operations-v19',
  './execution-planning-v8.css?v=8', './execution-planning-v8.js?v=navigation-state-v22', './admin-auth.mjs?v=admin-auth-v3', './admin-twa-manifest.webmanifest',
  './stage-admin-v10.js?v=stage-admin-v10-primary',
  './dashboard-map-tabs-v3.css?v=map-tabs-v3', './dashboard-map-tabs-v3.js?v=map-tabs-v3', './admin-runtime-v11.js?v=admin-runtime-v11', './admin-runtime-v11.css?v=admin-runtime-v11', './manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(APP_SHELL.filter(Boolean))).then(() => self.skipWaiting()));
});

self.addEventListener('push',event=>{
  let payload={};try{payload=event.data?.json?.()||{};}catch{payload={notification:{title:'Aliança Park',body:event.data?.text?.()||'Nova atualização operacional.'}};}
  const notification=payload.notification||payload.data||{},data=payload.data||{};
  event.waitUntil(self.registration.showNotification(notification.title||data.title||'Aliança Park',{body:notification.body||data.message||'Nova atualização operacional.',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:data.notificationId||'belavista-operational',data:{url:data.actionUrl||'/'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>client.url.startsWith(self.location.origin));if(existing){existing.navigate(target);return existing.focus();}return self.clients.openWindow(target);}));
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
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname.endsWith('public-records.html')?'./public-records.html':'./index.html')));
    return;
  }

  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('arcgisonline.com') || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
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
