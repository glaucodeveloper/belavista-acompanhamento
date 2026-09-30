import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const state=read('state.js');
const components=read('components.js');
const styles=read('dashboard-map-tabs-v3.css');
const html=read('index.html');

test('barra superior oferece os três modos operacionais e persiste a seleção',()=>{
  assert.match(state,/export const dashboardModes = \{/);
  assert.match(state,/tracking:\{label:'Acompanhamento'/);
  assert.match(state,/commercial:\{label:'Leads e lotes'/);
  assert.match(state,/social:\{label:'Comunicação'/);
  assert.match(state,/dashboardMode:'tracking'/);
  assert.match(state,/['"]dashboardMode['"]/);
  assert.match(components,/dashboard-mode-trigger/);
  assert.match(components,/data-dashboard-mode="\$\{key\}"/);
  assert.match(components,/dashboardMode:next,mapFilters:\[\],mapFilter:null,mapFilterWidget:null/);
  assert.match(components,/modeItems=\{/);
  assert.match(components,/Execução e acompanhamento/);
  assert.match(components,/Leads, lotes e contratos/);
  assert.match(components,/Comunicação e relacionamentos/);
  assert.match(components,/sidebar-mode-label/);
  assert.match(components,/data-sidebar-action="messages"/);
});

test('cada modo troca os widgets e mantém a regra de apenas um resumo ativo',()=>{
  assert.match(components,/const dashboardModeFiltersV1=\{/);
  for(const key of ['commercial-leads','commercial-contracts','commercial-lots','commercial-reservations','commercial-installments','commercial-paid','social-instagram','social-personal','social-clients','social-brokers','social-staff-operating','social-staff-services','social-staff-planned']){
    assert.match(components,new RegExp(key));
  }
  assert.match(components,/mapFilters:\[key\],mapFilter:key,mapFilterWidget:key/);
  assert.match(components,/dashboard-social-contact-bar/);
  assert.match(components,/DESTAQUE DA CONVERSA/);
});

test('paleta do mapa traduz status comerciais e status da equipe',()=>{
  assert.match(components,/dashboardLotHighlightV1=\{/);
  for(const key of ['commercial-reservations','commercial-installments','commercial-paid','social-staff-operating','social-staff-services','social-staff-planned']){
    assert.match(components,new RegExp(`['"]?${key}['"]?`));
  }
  assert.match(components,/statuses:\['lead','reserved','installments','paid'\]/);
  assert.match(components,/dashboardLotMatchesV1/);
  assert.match(components,/commercialSales:sales,publicReservations:reservations/);
  assert.match(components,/staffStatus\?staffStatus===config\.staffStatus/);
  assert.match(components,/this\.syncDashboardModeHighlightV1\?\./);
  assert.match(styles,/BELAVISTA_DASHBOARD_MODES_V1/);
});

test('o navegador carrega a versão do modo junto com a folha de estilos',()=>{
  assert.match(html,/dashboard-map-tabs-v3\.css\?v=map-dashboard-modes-v2/);
  assert.match(read('app.js'),/components\.js\?v=map-pdf-texture-bright-aligned-v26-20260915/);
  assert.match(read('admin-original-bootstrap-v5351.mjs'),/app\.js\?v=map-pdf-texture-bright-aligned-v26-20260915/);
});
