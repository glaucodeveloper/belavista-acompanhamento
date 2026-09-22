import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');

test('etapa expõe entradas editáveis antes do fluxograma', async () => {
  const [html, client, css] = await Promise.all([
    read('admin-workers.html'),
    read('stage-workbench.mjs'),
    read('stage-workbench.css')
  ]);

  assert.match(html, /stage-input-sessions-v5379/);
  assert.match(client, /data-stage-inputs/);
  assert.match(client, /data-stage-input-add/);
  assert.match(client, /data-stage-calendar-date/);
  assert.match(client, /data-flow-cards/);
  assert.match(client, /data-stage-input-drag/);
  assert.match(client, /inputProgrammingModes/);
  assert.match(client, /data-stage-input-store/);
  assert.match(client, /data-stage-input-setting/);
  assert.match(client, /productionModeEnabled/);
  assert.match(client, /mapLocation/);
  assert.match(client, /requireAcceptance/);
  assert.match(client, /inputProductionMarkup/);
  assert.match(client, /inputProductionMarkupEditable/);
  assert.match(client, /data-stage-input-production-field/);
  assert.match(client, /data-stage-input-condition-field/);
  assert.match(client, /data-stage-input-condition-add/);
  assert.match(client, /data-stage-input-condition-remove/);
  assert.match(client, /data-stage-input-production/);
  assert.match(client, /defaultInputProperties/);
  assert.match(client, /data-stage-input-property-field/);
  assert.match(client, /data-stage-input-property-add/);
  assert.match(client, /data-stage-input-property-insert/);
  assert.match(client, /enhanceInputFieldLayouts/);
  assert.match(css, /\.stage-input-fields-split/);
  assert.match(css, /\.stage-input-properties/);
  assert.match(client, /dragstart/);
  assert.match(client, /drop/);
  assert.ok(client.includes('/api/workbench/infer'));
  assert.match(client, /source:'input-inference'/);
  assert.match(client, /calendarDate:stageContext\.calendarDate/);
  assert.match(css, /\.stage-inputs-panel/);
  assert.match(css, /\.stage-input-production/);
  assert.match(css, /\.stage-input-editor-grid/);
  assert.match(css, /gap:18px/);
  assert.match(css, /\.stage-input-condition-editor/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('inferência e persistência usam o mesmo contexto da etapa', async () => {
  const [server, persistence, client] = await Promise.all([
    read('server.mjs'),
    read('persistence.mjs'),
    read('stage-workbench.mjs')
  ]);

  assert.match(server, /function inferStageInput/);
  assert.match(server, /workbenchInferenceApi/);
  assert.match(server, /pathname==='\/api\/workbench\/infer'&&req\.method==='POST'/);
  assert.match(server, /local-ai-rules/);
  assert.match(server, /stageInputStructured/);
  assert.match(server, /yield-below-reference/);
  assert.match(server, /notificationPolicy/);
  assert.match(server, /Propriedades dinâmicas/);
  assert.match(persistence, /input_sessions_json/);
  assert.match(persistence, /calendar_date/);
  assert.match(persistence, /inputSessions/);
  assert.match(client, /normalizeInputSessions/);
  assert.match(client, /programming:normalizeInputProgramming/);
  assert.match(client, /buildScheduleContext/);
  assert.match(client, /Relação detectada/);
});

test('cron monitora condições estruturadas e entrega ao dono', async () => {
  const [engine, cron] = await Promise.all([
    read('operational-engine.mjs'),
    read('scripts/cron-jobs.mjs')
  ]);

  assert.match(engine, /export function evaluateActivityConditionNotifications/);
  assert.match(engine, /production-below-reference/);
  assert.match(engine, /activity-condition:/);
  assert.match(engine, /notifyRoles/);
  assert.match(cron, /activity-condition-notifications/);
});
