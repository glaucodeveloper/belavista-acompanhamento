import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.env.BELAVISTA_ROOT;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const mapModules=fs.readdirSync(path.join(root,'components/map')).filter(name=>name.endsWith('.mjs')).map(name=>read(`components/map/${name}`));

test('mapa administrativo mantém orientação fixa de 180 graus',()=>{
  const components=[(read('components/map/map-scene-composition-v1.mjs') + read('components.js')),...mapModules].join('\n');
  const bridge=read('admin-public-map-surface-v5352.mjs');
  const publicMap=read('public-leads-map-v50.mjs');

  assert.match(components,/const ADMIN_FIXED_MAP_ROTATION_DEG=180/);
  assert.match(components,/const ADMIN_PDF_DISPLAY_Y_ROTATION_DEG=0/);
  assert.match(components,/alianca-park-aerial-realistic-preview-v2\.jpg/);
  assert.match(components,/ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1=\{left:\.315,top:\.070,right:\.646,bottom:\.771\}/);
  assert.match(components,/this\.sceneManualRotation=isAdminReferenceAerial\?ADMIN_FIXED_MAP_ROTATION_DEG/);
  assert.match(components,/safeRotation=this\.hasAttribute\('data-admin-shared-public-map'\)\?ADMIN_FIXED_MAP_ROTATION_DEG/);
  assert.match(components,/const normalized=this\.hasAttribute\('data-admin-shared-public-map'\)/);
  assert.match(components,/rotation:this\.hasAttribute\('data-admin-shared-public-map'\)\?ADMIN_FIXED_MAP_ROTATION_DEG/);
  assert.match(components,/dwg-affine\|source-xz-frame\|flipX-1\|y\+\$\{extraRotationDeg\}deg\|north=loading-reference/);
  assert.match(bridge,/map\.sceneManualRotation=180/);
  assert.match(bridge,/map\.setSceneVisual\?\.\(22,180,1\.62\)/);
  assert.match(publicMap,/const rotation=adminShared\?180:PUBLIC_VIEW\.rotation/);
});
