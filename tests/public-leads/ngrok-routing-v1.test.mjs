import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('recursos públicos usam o prefixo do túnel e não URLs absolutas quebradas',()=>{
  const context=read('public-leads-context-v521.mjs');
  const activityLayer=read('activity-map-layer.mjs');
  const components=read('components.js');
  assert.match(context,/runtime-url-v1\.mjs/);
  assert.match(context,/runtimeUrlV1\('\/assets\/data\/dwg-georeference\.json'/);
  assert.match(context,/runtimeUrlV1\('\/assets\/data\/public-record-stage-state-v5330\.json'/);
  assert.match(context,/runtimeUrlV1\('\/api\/records'/);
  assert.match(context,/runtimeUrlV1\('\/assets\/public\/alianca-park-logo-mark-transparent-v551\.png\?edited=20260915'/);
  assert.match(activityLayer,/runtimeUrlV1\('\/api\/workbench\/state\?resource=activity-map'/);
  assert.match(components,/runtimeRouteV1\('\/assets\/model\/alianca_park_masterplan_preview\.glb'/);
});

test('build público inclui o resolvedor de URLs do ngrok',()=>{
  const build=read('scripts/build-public-pages.mjs');
  assert.match(build,/['"]runtime-url-v1\.mjs['"]/g);
  assert.match(read('public-leads.html'),/route=ngrok-route-v1/);
});
