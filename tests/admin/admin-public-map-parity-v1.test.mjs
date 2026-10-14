import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mapModules=fs.readdirSync(path.join(root,'components/map')).filter(name=>name.endsWith('.mjs')).map(name=>fs.readFileSync(path.join(root,'components/map',name),'utf8'));
const components=[(fs.readFileSync(path.resolve('components/map/map-scene-composition-v1.mjs'), 'utf8') + (fs.readFileSync(path.join(root, 'components/map/map-scene-composition-v1.mjs'), 'utf8') + fs.readFileSync(path.join(root, 'components.js'), 'utf8'))),...mapModules].join('\n');
const activityMapEditor=fs.readFileSync(path.join(root,'activity-map-editor.mjs'),'utf8');
const bridge=fs.readFileSync(path.join(root,'admin-public-map-surface-v5352.mjs'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'admin-brand-style-v1.css'),'utf8');

test('dashboard admin abre na superfície estática e deixa WebGL sob ativação explícita',()=>{
  assert.match(components,/if\(this\.isAdminStandalone3DV5370\(\)\)\{/);
  assert.match(components,/this\.dataset\.admin3dAutostart = "disabled-explicit-activation"/);
  assert.match(components,/ADMIN_REFERENCE_AERIAL_ASSET_V1/);
  assert.match(components,/data-map-3d-loading.*setAttribute\("hidden"/);
  assert.match(components,/if \(this\.hasAttribute\("data-admin-shared-public-map"\)\) return isAdminRoute/);
  assert.match(components,/this\.dataset\.modelBootPhase='admin-shell-ready-static'/);
  assert.match(components,/this\.isPublicMapVisual\(\)\&&!this\.hasAttribute\('data-admin-shared-public-map'\)/);
  assert.match(components,/isPublicCameraPreset\(\)/);
  assert.match(components,/if\(!publicPresentation\)this\.bindSceneControls\(\)/);
});

test('admin monta o shell antes de iniciar Leaflet, WebGL e o GLB',()=>{
  assert.match(components,/waitForAdminShellViewportV5376\(\)/);
  assert.match(components,/this\.dataset\.modelBootPhase='waiting-admin-shell'/);
  assert.match(components,/\(!app\|\|!app\.hidden\)/);
  assert.match(components,/rect\.width>32&&rect\.height>32/);
  assert.match(components,/this\.dataset\.adminModelLifecycle='shell-visible-viewport-ready'/);
  assert.match(components,/Promise\.resolve\(this\.initThree\(\)\)\.catch/);
});

test('base pública administrativa é alinhada pelo manifesto DWG',()=>{
  assert.match(bridge,/data-public-satellite-base/);
  assert.match(bridge,/assets\/data\/dwg-georeference\.json/);
  assert.match(bridge,/map\._publicGeoTheme=theme/);
  assert.match(bridge,/map\.refreshMapSurface\?\.\(theme/);
  assert.match(bridge,/adminPublicPreset='pan0,0-rotation180-zoom1\.62'/);
  assert.match(bridge,/adminMapRotationLock='180deg-fixed'/);
  assert.match(bridge,/adminPublicCameraPreset='true'/);
});

test('admin carrega a mesma calibração visual do /leads sem importar o atendimento',()=>{
  assert.match(fs.readFileSync(path.join(root,'app.js'),'utf8'),/public-leads-map-v50\.mjs\?v=admin-public-map-fixed-180-v1/);
  assert.doesNotMatch(html,/public-leads-map-v50\.mjs\?v=admin-public-map-fixed-180-v1/);
  assert.doesNotMatch(html,/public-leads-context-v521\.mjs/);
  assert.match(css,/data-admin-shared-public-map\] \.map-category-switcher/);
  assert.doesNotMatch(css,/alianca-park-grass-hires-v5319\.webp/);
});

test('map-scene alterna extensão de etapas e seleção de polígonos nos registros',()=>{
  assert.match(components,/this\.dataset\.dashboardProgressMap=view==='assistant'\|\|view==='map'\?'enabled':'available'/);
  assert.match(components,/this\.dataset\.recordPolygonSelection=view==='records'\?'enabled':'available'/);
  assert.match(components,/if\(view==='records'\)\{/);
  assert.match(components,/this\.setStageOverlay\(stage\.name,false\)/);
  assert.match(components,/this\.sceneStage\?\.updateMatrixWorld\(true\);this\.renderActiveSceneV5370\(\);return true;/);
  assert.match(activityMapEditor,/activityMapStandaloneParts\?\.some\(part=>part\?\.userData\?\.partKind==='lots'\)/);
});

test('admin executa o app uma única vez pelo bootstrap original',()=>{
  assert.match(html,/bootstrap\/admin-application-entry\.mjs/);
  assert.doesNotMatch(html,/app\.js\?v=/);
  assert.match(fs.readFileSync(path.join(root,'bootstrap/admin-application-entry.mjs'),'utf8'),/app\.js\?v=map-multi-layer-v1/);
});

test('extensões administrativas são carregadas depois do shell',()=>{
  const body=html.slice(html.indexOf('<body'));
  const scripts=[...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(scripts,[
    './admin-auth.mjs?v=admin-auth-v3',
    './admin-twa-runtime.mjs?v=admin-twa-runtime-v1',
    './bootstrap/admin-application-entry.mjs?v=map-multi-layer-v1',
    './records-activity-drill-in-v5377.mjs?v=records-stage-entry-v3',
    './admin-test-controls.mjs?v=1',
    './activity-map-layer.mjs?v=1',
    './worker-context-chat.mjs?v=worker-chat-image-reasoning-v1',
    './admin-communications.mjs?v=admin-messages-v1'
  ]);
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  for(const module of ['execution-planning-v8.js','map-page-widgets-v5.js','admin-public-map-surface-v5352.mjs','belavista-final-ui-v5362.mjs']){
    assert.ok(app.includes(`./${module}`),`${module} não foi movido para o carregamento pós-shell`);
  }
});
