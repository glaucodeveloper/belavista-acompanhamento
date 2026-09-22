import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STAGE_WORKBENCH} from '../../stage-workbench-data.mjs';

const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');

test('todas as atividades têm especificação operacional ponta a ponta', () => {
  const activities = STAGE_WORKBENCH.flatMap(stage => stage.activities);
  assert.equal(STAGE_WORKBENCH.length, 8);
  assert.equal(activities.length, 45);
  for (const activity of activities) {
    const spec = activity.operational;
    assert.ok(spec, `${activity.id} sem especificação operacional`);
    assert.ok(spec.responsibility?.primary, `${activity.id} sem responsável principal`);
    assert.ok(spec.responsibility?.support, `${activity.id} sem equipe de apoio`);
    assert.ok(spec.responsibility?.approval, `${activity.id} sem responsável pelo aceite`);
    assert.ok(spec.legalBasis?.length, `${activity.id} sem base legal/técnica`);
    assert.ok(spec.entryConditions?.length, `${activity.id} sem condições de entrada`);
    assert.ok(spec.procedure?.length >= 4, `${activity.id} sem passo a passo`);
    assert.ok(spec.production?.method && spec.production?.formula, `${activity.id} sem medição/fórmula`);
    assert.ok(spec.evidence?.length, `${activity.id} sem evidências`);
    assert.ok(spec.acceptance?.length, `${activity.id} sem critério de aceite`);
    assert.ok(spec.conditions?.length, `${activity.id} sem impedimentos`);
    assert.ok(spec.notifications?.length, `${activity.id} sem disparos`);
    assert.ok(spec.outputs?.length, `${activity.id} sem saída`);
  }
});

test('catálogo operacional é exposto na etapa, na atividade e na inferência', async () => {
  const [client, server, css] = await Promise.all([
    read('stage-workbench.mjs'),
    read('server.mjs'),
    read('stage-workbench.css')
  ]);
  assert.match(client, /operationalStageMarkup/);
  assert.match(client, /operationalActivityMarkup/);
  assert.match(client, /FICHA OPERACIONAL · RESPONSABILIDADE E CONFORMIDADE/);
  assert.match(client, /PASSO A PASSO DE CAMPO/);
  assert.match(client, /EVIDÊNCIAS OBRIGATÓRIAS/);
  assert.match(client, /IMPEDIMENTOS E NOTIFICAÇÕES/);
  assert.match(server, /operationalProduction/);
  assert.match(server, /operational:structured\.operational/);
  assert.match(server, /Operação, responsabilidades e aceite/);
  assert.match(server, /configured=Array\.isArray\(operational\.conditions\)/);
  assert.match(css, /\.operational-journey/);
  assert.match(css, /\.operational-activity-panel/);
  assert.match(css, /\.operational-detail-columns/);
});
