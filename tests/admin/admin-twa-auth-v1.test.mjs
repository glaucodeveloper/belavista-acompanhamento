import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('TWA administrativo aponta para /admin e usa orientação mobile',()=>{
  const manifest=JSON.parse(read('admin-twa-manifest.webmanifest'));
  const twa=JSON.parse(read('mobile/twa/admin-twa-manifest.json'));
  assert.match(manifest.start_url,/admin\?twa=admin/);
  assert.equal(manifest.orientation,'portrait-primary');
  assert.equal(twa.packageId,'com.belavista.aliancapark.admin');
  assert.match(twa.startUrl,/\/admin\?twa=admin/);
  assert.match(twa.webManifestUrl,/admin-twa-manifest/);
});

test('login operacional valida Firebase Auth e claims de função',()=>{
  const auth=read('admin-auth.mjs');
  const firebase=read('firebase.mjs');
  const service=read('auth-service.mjs');
  const app=read('app.js');
  assert.match(auth,/signInOperationalUser/);
  assert.match(auth,/allowedRoles/);
  assert.match(auth,/foreman/);
  assert.match(auth,/admin/);
  assert.match(auth,/developer/);
  assert.match(auth,/TI · Desenvolvimento/);
  assert.match(firebase,/getIdTokenResult/);
  assert.match(firebase,/custom claim `role`/);
  assert.match(firebase,/icaroglaucooliveira@gmail\.com/);
  assert.match(service,/localhost only/);
  assert.match(service,/requireRoles/);
  assert.match(app,/BELAVISTA_ADMIN_AUTH_READY/);
  assert.match(read('api-client.mjs'),/Authorization/);
  assert.match(read('api-client.mjs'),/BELAVISTA_GET_ID_TOKEN/);
});

test('portal de campo carrega o mesmo gate de autenticação',()=>{
  assert.match(read('encarregados.html'),/admin-auth\.mjs\?v=admin-auth-v3/);
  assert.match(read('mobile/twa/admin-assetlinks.json.template'),/com\.belavista\.aliancapark\.admin/);
});

test('notificação de WhatsApp é pseudo e nunca faz entrega HTTP',()=>{
  const worker=read('worker/src/whatsapp.js');
  assert.match(worker,/externalDelivery:false/);
  assert.match(worker,/firebase-realtime-listener/);
  assert.doesNotMatch(worker,/fetch\(/);
});
