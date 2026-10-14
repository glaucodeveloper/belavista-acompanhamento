import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('/admin reutiliza o raster, o contexto DWG e a orientação 3D de /leads', () => {
  const app = read('app.js');
  const components = (read('components/map/map-scene-composition-v1.mjs') + read('components.js'));
  const context = read('public-leads-context-v521.mjs');
  const publicForm = read('public-lead-form.mjs');

  const shell = app.match(/this\.innerHTML=`[\s\S]*?`;/)?.[0] || '';
  assert.match(shell, /data-admin-public-map="true"/);
  assert.match(shell, /data-public-satellite-base="true"/);
  assert.match(shell, /data-public-static-capture="\/assets\/public\/dwg-satellite-treated-v5411\.png"/);
  assert.doesNotMatch(shell, /data-admin-shared-public-map/);

  assert.match(app, /public-leads-context-v521\.mjs\?v=admin-public-map-raster-v1/);
  assert.match(context, /PUBLIC_SATELLITE_DWG_ZOOM=18/);
  assert.match(context, /map\.setAttribute\('data-public-satellite-base','true'\)/);
  assert.match(context, /map\.refreshMapSurface\?\.\(theme/);
  assert.match(publicForm, /data-public-static-capture="\/assets\/public\/dwg-satellite-treated-v5411\.png"/);

  assert.match(components, /isAdminPublicMapV1\(\)/);
  assert.match(components, /if \(this\.isAdminPublicMapV1\(\)\) return false/);
  assert.match(components, /MODEL_EXTRA_Y_ROTATION_DEG/);
  assert.match(components, /PUBLIC_MODEL_HORIZONTAL_FLIP/);
});

test('/admin mantém a interação administrativa sobre o renderer público', () => {
  const components = (read('components/map/map-scene-composition-v1.mjs') + read('components.js'));
  const runtime = read('admin-runtime-v11.js');

  assert.match(components, /this\.isPublicCustomerExperience\(\) && !this\.isAdminPublicMapV1\(\)/);
  assert.match(components, /isPublicCameraPreset\(\)[\s\S]*isAdminPublicMapV1\(\)/);
  assert.match(runtime, /data-public-presentation'.*&&!this\.isAdminPublicMapV1/);
  assert.match(runtime, /mapControls='admin-map-enabled'/);
});
