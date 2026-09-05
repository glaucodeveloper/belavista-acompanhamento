import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const report=fs.readFileSync(path.join(root,'scripts','generate-broker-report.py'),'utf8');

test('central de corretores usa cards, editor de regras e períodos de repasse',()=>{
  assert.match(components,/broker-control-grid/);
  assert.match(components,/broker-rule-editor/);
  assert.match(components,/data-v8-reason-form/);
  assert.match(components,/data-v7-period/);
  assert.match(components,/data-v7-open-broker/);
});

test('carteira dedicada exibe tabela e aplicação de regras fora da impressão',()=>{
  assert.match(components,/broker-profile-dedicated/);
  assert.match(components,/data-broker-apply-rules/);
  assert.match(components,/commission-ledger-table/);
  assert.match(components,/mensais 70% Warley \/ 30% contraparte/);
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
  assert.match(components,/dashboard-carbon-home/);
  assert.match(components,/dashboard-top-action-row/);
  assert.match(components,/dashboard-initial-widget-bar/);
  assert.match(components,/\['brokers','users-round','Corretores'\]/);
});
