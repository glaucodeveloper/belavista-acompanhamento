import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('registros expõe navegação drill-in de etapa para atividade e apontamento', () => {
  const module = read('records-activity-drill-in-v5377.mjs');
  const app = read('app.js');
  const html = read('index.html');
  assert.match(app, /records-activity-drill-in-v5377\.mjs/);
  assert.match(app, /ensureDeferredExtensions/);
  assert.match(app, /installBelavistaRecordsActivityDrillInV5377/);
  assert.match(app, /Extensões administrativas renderizadas/);
  assert.match(html, /records-activity-drill-in-v5377\.css/);
  assert.match(html, /records-activity-drill-in-v5377\.mjs\?v=record-detail-page-v3/);
  assert.match(module, /data-records-drill-stage/);
  assert.match(module, /data-records-drill-activity/);
  assert.match(module, /activity-record-form-v5377/);
  assert.match(module, /records-drill-layout-v5377/);
  assert.match(module, /records-drill-workspace-v5377/);
  assert.match(module, /records-drill-registration-v5377/);
  assert.match(module, /records-drill-map-panel-v5377/);
  assert.match(module, /data-record-drill-paint/);
  assert.match(module, /data-record-drill-fit/);
  assert.match(module, /data-record-drill-clear/);
  assert.match(module, /name="mapArea"/);
  assert.match(module, /PROPRIEDADES DINÂMICAS/);
  assert.match(module, /Área assinalada no mapa/);
  assert.match(module, /data-record-property-add/);
  assert.match(module, /data-record-property-map/);
  assert.match(module, /collectRecordPropertiesV1/);
  assert.match(module, /RecordDetailViewV1/);
  assert.match(module, /data-record-open/);
  assert.match(module, /data-record-detail-back/);
  assert.match(module, /querySelector\('\.records-drill-page-v5377'\)/);
  assert.match(module, /Saída da seleção do mapa/);
  assert.match(module, /apiFetch\('\/api\/records'/);
  assert.match(module, /selectedRecordsStageV5377/);
  assert.match(module, /selectedRecordsActivityV5377/);
  assert.match(module, /data-records-open-new/);
  assert.match(read('components.js'), /data-records-open-new/);
});

test('propriedades dinâmicas de registros persistem localmente e no worker', () => {
  const persistence = read('persistence.mjs');
  const worker = read('worker/src/storage.js');
  const migration = read('worker/migrations/0008_record_properties.sql');
  assert.match(persistence, /properties_json/);
  assert.match(persistence, /serializeRecordProperties/);
  assert.match(worker, /recordPropertiesValue/);
  assert.match(worker, /hydrateRecord/);
  assert.match(migration, /ALTER TABLE records ADD COLUMN properties_json/);
});

test('materiais permanecem no contexto único de caixa com comprovação', () => {
  const module = read('records-activity-drill-in-v5377.mjs');
  const cash = read('admin-runtime-v11.js');
  assert.match(module, /Caixa e materiais/);
  assert.match(module, /central de caixa e materiais/);
  assert.match(module, /arquivo\/assinatura financeira/);
  assert.match(cash, /data-cash-evidence-v11/);
  assert.match(cash, /data-cash-signature/);
  assert.match(cash, /cashProof/);
});

test('superfície de registros é responsiva para lançamento em celular', () => {
  const css = `${read('records-activity-drill-in-v5377.css')}\n${read('styles.css')}`;
  assert.match(css, /records-drill-page-v5377/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /activity-record-form-v5377/);
  assert.match(css, /records-drill-layout-v5377/);
  assert.match(css, /grid-template-columns:minmax\(220px,25%\)/);
  assert.match(css, /records-drill-map-panel-v5377/);
  assert.match(css, /width:100%/);
});
