import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const state=read('state.js');
const components=read('components.js');
const filterCatalog=read('components/map/dashboard-filter-catalog-v1.mjs');
const topbar=read('components/shared/app-topbar.mjs');
const sidebar=read('components/shared/app-sidebar.mjs');
const styles=read('dashboard-map-tabs-v3.css');
const html=read('index.html');

test('a barra superior informa acompanhamento sem seletor de projeto ou modo',()=>{
  assert.match(state,/tracking:\{label:'Acompanhamento'/);
  assert.match(state,/dashboardMode:'tracking'/);
  assert.match(state,/\.\.\.restoredUiState,[\s\S]*dashboardMode:'tracking'/);
  assert.match(components,/const dashboardModeKeyV1 = \(\) => "tracking"/);
  assert.match(topbar,/dashboard-mode-status/);
  assert.doesNotMatch(components,/project-switch/);
  assert.doesNotMatch(components,/dashboard-mode-trigger/);
  assert.doesNotMatch(components,/dashboard-mode-menu/);
  assert.doesNotMatch(components,/data-dashboard-mode="\$\{key\}"/);
  assert.match(sidebar,/Execução e acompanhamento/);
  assert.match(sidebar,/sidebar-mode-label/);
});

test('a superfície e os filtros do mapa permanecem no modo tracking',()=>{
  assert.match(filterCatalog,/const dashboardModeFiltersV1 = \{/);
  assert.match(filterCatalog,/dashboardModeFiltersV1\[dashboardModeKeyV1\(mode\)\]/);
  assert.match(components,/const dashboardModeKeyV1 = \(\) => "tracking"/);
  assert.doesNotMatch(topbar,/dashboard-mode-trigger/);
  assert.match(styles,/BELAVISTA_TRACKING_MODE_PERMANENT_V1/);
  assert.match(styles,/dashboard-mode-status/);
  assert.doesNotMatch(styles,/dashboard-mode-trigger/);
  assert.doesNotMatch(styles,/dashboard-mode-menu/);
});

test('o navegador continua carregando a folha e o componente principal',()=>{
  assert.match(html,/dashboard-map-tabs-v3\.css\?v=map-dashboard-modes-v2/);
  assert.match(read('app.js'),/components\.js\?v=mobile-agenda-v1/);
  assert.match(read('bootstrap/admin-application-entry.mjs'),/app\.js\?v=pdf-original-perimeter-v3/);
});
