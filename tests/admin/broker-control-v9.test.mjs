import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const brokerControl=fs.readFileSync(path.join(root,'components/commercial/broker-control-page-v1.mjs'),'utf8');
const brokersPage=fs.readFileSync(path.join(root,'components/commercial/brokers-page.mjs'),'utf8');
const dashboardHome=fs.readFileSync(path.join(root,'components/planning/dashboard-home-page-v1.mjs'),'utf8');
const sidebarNavigation=fs.readFileSync(path.join(root,'components/shared/sidebar-navigation-v1.mjs'),'utf8');
const sidebarCatalog=fs.readFileSync(path.join(root,'components/shared/sidebar-navigation-catalog-v1.mjs'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const report=fs.readFileSync(path.join(root,'scripts','generate-broker-report.py'),'utf8');

test('central de corretores usa cards, editor de regras e períodos de repasse',()=>{
  assert.match(brokerControl,/broker-control-grid/);
  assert.match(brokerControl,/broker-rule-editor/);
  assert.match(brokerControl,/data-v8-reason-form/);
  assert.match(brokerControl,/data-v7-period/);
  assert.match(brokerControl,/data-v7-open-broker/);
  assert.match(components,/createBrokerControlPageV1\(/);
  assert.doesNotMatch(components,/const brokersControlV8 = function/);
});

test('carteira dedicada exibe tabela e aplicação de regras fora da impressão',()=>{
  assert.match(brokersPage,/broker-profile-dedicated/);
  assert.match(brokersPage,/data-broker-apply-rules/);
  assert.match(brokersPage,/commission-ledger-table/);
  assert.match(brokerControl,/mensais 70% Warley \/ 30% contraparte/);
  assert.match(css,/\.broker-profile-toolbar[\s\S]*display:none!important/);
  assert.match(css,/\.broker-profile-rule-strip[\s\S]*display:none!important/);
});

test('relatórios Excel e PDF incluem a divisão do repasse',()=>{
  assert.match(report,/\.xlsx/);
  assert.match(report,/Warley/);
  assert.match(report,/Contraparte/);
  assert.match(report,/Parcelas mensais/);
  assert.match(report,/ALIANÇA PARK - REPASSE MENSAL POR CORRETOR/);
});

test('dashboard inicial mantém barra Carbon de widgets e ações superiores',()=>{
  assert.match(dashboardHome,/dashboard-carbon-home/);
  assert.match(dashboardHome,/dashboard-top-action-row/);
  assert.match(dashboardHome,/dashboard-initial-widget-bar/);
  assert.match(sidebarCatalog,/\[\s*"brokers",\s*"users-round",\s*"Corretores"\s*\]/);
});
