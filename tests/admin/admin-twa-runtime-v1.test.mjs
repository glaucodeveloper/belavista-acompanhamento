import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('admin TWA manifest is mobile-oriented and requests Android notification permission',async()=>{
  const manifest=JSON.parse(await read('admin-twa-manifest.webmanifest'));
  const twa=JSON.parse(await read('mobile/twa/admin-twa-manifest.json'));
  assert.equal(manifest.id,'./admin?twa=admin');
  assert.equal(manifest.orientation,'portrait-primary');
  assert.match(manifest.start_url,/admin\?twa=admin/);
  assert.equal(twa.enableNotifications,true);
  assert.equal(twa.orientation,'portrait');
});

test('admin TWA runtime connects auth, service worker, device registration and explicit permission',async()=>{
  const runtime=await read('admin-twa-runtime.mjs');
  const index=await read('index.html');
  const firebase=await read('firebase.mjs');
  for(const contract of ['BELAVISTA_ADMIN_AUTH_READY','navigator.serviceWorker.register','registerOperationalDevice','Notification.permission','Ativar notificações'])assert.ok(runtime.includes(contract),`missing TWA contract: ${contract}`);
  assert.match(index,/admin-twa-runtime\.mjs\?v=admin-twa-runtime-v1/);
  assert.match(firebase,/setPersistence/);
  assert.match(firebase,/browserLocalPersistence/);
  assert.match(firebase,/operationalDevices/);
});

test('service worker renders push notifications with published icon assets',async()=>{
  const sw=await read('sw.js');
  assert.match(sw,/assets\/icons\/icon-192\.png/);
  assert.match(sw,/showNotification/);
  assert.match(sw,/notificationclick/);
});
