import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const components=read('components.js');
const topbar=read('components/shared/app-topbar.mjs');
const sidebar=read('components/shared/sidebar-shell-v1.mjs');
const html=read('index.html');
const bootstrap=read('bootstrap/admin-application-entry.mjs');

test('estrutura de layout do ZIP substitui o shell anterior e preserva as páginas e rotas',()=>{
  const shell=read('atlas-zip-shell-v2.css');
  assert.match(app,/class="app" id="app" data-layout="atlas-zip"/);
  assert.doesNotMatch(app,/atlas-app|class="app app-shell|querySelector\('\.app-shell'\)|sidebar-collapsed/);
  assert.match(app,/<app-sidebar><\/app-sidebar><div id="sidebarOverlay" class="sidebar-overlay" data-sidebar-overlay aria-hidden="true"><\/div><main class="workspace app-main atlas-workspace"><app-topbar><\/app-topbar><section class="scene"><view-layer><\/view-layer><\/section><\/main>/);
  assert.doesNotMatch(app,/class="atlas-quickbar"/);
  assert.match(topbar,/class="atlas-toolbar"/);
  assert.match(topbar,/class="atlas-topbar-leading"/);
  assert.match(topbar,/class="icon-btn menu-toggle" data-sidebar-menu-toggle/);
  assert.doesNotMatch(topbar,/atlas-mobile-bottom/);
  assert.match(app,/<main class="workspace app-main atlas-workspace"><app-topbar><\/app-topbar><section class="scene"><view-layer><\/view-layer><\/section><\/main><nav class="mobile-bottom atlas-mobile-bottom" aria-label="Navegação mobile">/);
  assert.match(app,/data-sidebar-menu-toggle/);
  assert.match(app,/setMobileNavigationOpen\(open\)/);
  assert.doesNotMatch(html,/atlas-shell-v1\.css/);
  assert.match(html,/atlas-zip-shell-v2\.css\?v=atlas-zip-front-structure-v5/);
  assert.match(html,/bootstrap\/admin-application-entry\.mjs\?v=admin-map-modules-v39/);
  assert.match(bootstrap,/app\.js\?v=atlas-zip-front-structure-v5/);
  assert.doesNotMatch(html,/atlas-zip-frontend-v1\.css/);
  const atlasPages=read('atlas-application-v1.css');
  assert.doesNotMatch(atlasPages,/atlas-quickbar|top:52px/);
  assert.match(shell,/grid-template-columns: 300px minmax\(0, 1fr\) !important/);
  assert.match(shell,/width: 100% !important/);
  assert.match(shell,/padding: 20px 20px 20px 0 !important/);
  assert.match(shell,/border-radius: 32px !important/);
  assert.match(shell,/overflow-y: auto !important/);
  assert.match(shell,/\.atlas-mobile-bottom \{ position: fixed/);
  assert.match(sidebar,/class="logo-name">atlas<span>\.<\/span>/);
  assert.doesNotMatch(sidebar,/sidebar-toggle|sidebarToggle|Recolher menu/);
  assert.match(shell,/\.app\[data-layout="atlas-zip"\] app-sidebar > \.sidebar/);
  assert.match(sidebar,/class="sidebar" id="sidebar"/);
  assert.match(shell,/\.atlas-topbar \.menu-toggle \{ display: inline-flex/);
  assert.match(shell,/background: #101010 !important/);
  assert.match(shell,/background: var\(--atlas-panel\) !important/);
  assert.match(shell,/padding: 0 clamp\(25px, 3\.2vw, 58px\) 50px !important/);
  assert.match(shell,/\.atlas-workspace/);
  assert.match(shell,/\.atlas-workspace > \.scene/);
  assert.match(shell,/:has\(> app-sidebar\.mobile-open\) > \.sidebar-overlay/);
  assert.match(html,/<meta name="color-scheme" content="light"\s*\/>/);
  assert.doesNotMatch(shell,/sidebar-collapsed|\.atlas-quickbar/);
});

test('raiz do mapa depende do catálogo já registrado antes da composição do elemento',()=>{
  const registration=read('components/shared/application-elements-registration-v1.mjs');
  const mapCatalog=registration.indexOf('registerMap({'),
    mapElement=registration.indexOf('customElementsRef.define("map-scene", MapScene);');
  assert.ok(mapCatalog >= 0 && mapCatalog < mapElement);
  assert.match(components,/registerApplicationElementsV1\(\{/);
});

test('atalhos do shell respeitam autorização de rota e estado ativo',()=>{
  assert.match(topbar,/actorCanOpenView\(state\.currentActor\s*\|\|\s*\{\},\s*view\)/);
  assert.match(topbar,/button\.hidden\s*=\s*!allowed/);
  assert.match(topbar,/button\.classList\.toggle\("active",\s*active\)/);
});
