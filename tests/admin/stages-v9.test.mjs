import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('Etapas V9 expõe árvore de diretrizes e gatilhos da IA',()=>{
  assert.match(components,/STAGES_V9/);
  assert.match(components,/stage-v9-tree/);
  assert.match(components,/Fato \/ registro/);
  assert.match(components,/Pedido \/ organização/);
  assert.match(components,/data-stage-v9/);
  assert.match(components,/stageV9ProfileFor/);
});

test('Etapa dedicada abre fluxo de atividades com linhagem e materiais',()=>{
  assert.match(components,/stage-v9-dedicated-page/);
  assert.match(components,/stage-v9-activity-card/);
  assert.match(components,/data-activity-v9/);
  assert.match(components,/stage-v9-status-lines/);
  assert.match(components,/stage-v9-material-list/);
  assert.match(components,/stageActivityDedicatedV9/);
});

test('Atividade dedicada mantém orçamento, responsável, gatilho e diário de obra',()=>{
  assert.match(components,/stage-v9-activity-detail/);
  assert.match(components,/GATILHO DO AGENTE/);
  assert.match(components,/ORÇAMENTO REFERENCIAL/);
  assert.match(components,/DIÁRIO DE OBRA/);
  assert.match(components,/stage-v9-diary-table/);
  assert.match(components,/data-activity-v9-back/);
});

test('layout Carbon de Etapas é responsivo para cards e fluxograma',()=>{
  assert.match(css,/\.stage-v9-tree\{/);
  assert.match(css,/\.stage-v9-stage-grid\{/);
  assert.match(css,/\.stage-v9-activity-card\{/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*stage-v9-tree/);
  assert.match(css,/@media\(max-width:460px\)[\s\S]*stage-v9-stage-grid/);
});
