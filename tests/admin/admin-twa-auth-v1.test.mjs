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

test('login operacional valida PAT e sessão no serviço autoritativo',()=>{
  const auth=read('admin-auth.mjs');
  const service=read('auth-service.mjs');
  const server=read('server.mjs');
  const app=read('app.js');
  assert.match(auth,/api\/auth\/session/);
  assert.match(auth,/new AbortController\(\)/);
  assert.match(auth,/controller\.abort\(\),15000/);
  assert.match(auth,/O serviço de autenticação não respondeu em 15 segundos/);
  assert.match(auth,/saveGithubPat/);
  assert.match(auth,/readGithubPat/);
  assert.match(service,/BELAVISTA_API_BASE/);
  assert.match(service,/foreman/);
  assert.match(service,/developer/);
  assert.match(server,/['"]\/api\/auth\/session['"]/);
  assert.match(service,/requireRoles/);
  assert.match(app,/BELAVISTA_ADMIN_AUTH_READY/);
  assert.match(read('api-client.mjs'),/Authorization/);
  assert.match(read('api-client.mjs'),/BELAVISTA_GET_ID_TOKEN/);
});

test('autenticação administrativa não expõe portal próprio de encarregado',()=>{
  assert.doesNotMatch(read('admin-auth.mjs'),/encarregados\.html|isFieldPortal|FIELD_PORTAL_ROLES/);
  assert.match(read('mobile/twa/admin-assetlinks.json.template'),/com\.belavista\.aliancapark\.admin/);
});

test('notificação de WhatsApp é pseudo e nunca faz entrega HTTP',()=>{
  const worker=read('worker/src/whatsapp.js');
  assert.match(worker,/externalDelivery:false/);
  assert.match(worker,/firebase-realtime-listener/);
  assert.doesNotMatch(worker,/fetch\(/);
});
