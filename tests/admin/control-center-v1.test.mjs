import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Central administrativa reúne as tabelas operacionais',()=>{
  const components=read('components.js');
  assert.match(components,/CONTROL_CENTER_V1/);
  assert.match(components,/controlCenterMaterialRowsV1/);
  assert.match(components,/controlCenterFinanceRowsV1/);
  assert.match(components,/Finanças, materiais, etapas e comissões/);
  assert.match(components,/data-control-material-field/);
  assert.match(components,/data-control-commission-field/);
  assert.match(components,/controlStageUnifiedFormMarkupV1/);
  assert.match(components,/controlStagePropertyGridMarkupV1/);
  assert.match(components,/data-front-stage-tab/);
  assert.match(components,/data-control-stage-context-form/);
  assert.match(components,/controlChangeLog/);
});

test('alterações de materiais e comissões publicam eventos auditáveis',()=>{
  const components=read('components.js');
  const firebase=read('firebase.mjs');
  assert.match(components,/control\.material\.updated/);
  assert.match(components,/control\.commission-rule\.updated/);
  assert.match(components,/publishOperationalEvent/);
  assert.match(firebase,/subscribeOperationalControlCenter/);
  assert.match(firebase,/agentBridgeEvents/);
  assert.match(firebase,/operationalSnapshots/);
});

test('dashboard expõe o atalho da Central e o layout é responsivo',()=>{
  const components=read('components.js');
  const css=read('styles.css');
   assert.match(components,/\["control", "table-properties", "Central operacional"\],\s*\["materials", "package-check", "Materiais"\]/);
  assert.match(components,/data-view=\"\$\{view\}\"/);
  assert.match(css,/view-layer\[data-view="control"\]/);
  assert.match(css,/\.control-center-kpis\{/);
  assert.match(css,/\.control-stage-unified-section\{/);
  assert.match(css,/\.control-stage-property-grid\{/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*control-center-head/);
});
