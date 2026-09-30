import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {renderOperationalAiPrioritiesV1, renderStageHomePageV1} from '../../stage-home-page-v1.mjs';

const root = 'F:/belavista-acompanhamento';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('landing deixa o topo para a linha do tempo compartilhada e organiza registros e calendário', () => {
  const module = read('stage-home-page-v1.mjs');

  for (const marker of [
    'data-stage-home-page',
    'data-stage-home-section="records"',
    'data-stage-home-section="calendar"',
  ]) {
    assert.match(module, new RegExp(marker.replace(/["\\]/g, '\\$&')));
  }

  const sections = [
    '01 · CALENDÁRIO DE ATIVIDADES',
    '02 · REGISTROS DE ATIVIDADES',
  ];
  let cursor = -1;
  for (const section of sections) {
    const position = module.indexOf(section);
    assert.ok(position > cursor, `${section} deve aparecer após a seção anterior`);
    cursor = position;
  }
  assert.doesNotMatch(module, /data-stage-home-section="raid"/);
  assert.doesNotMatch(module, /data-stage-home-section="actions"/);
  assert.doesNotMatch(module, /data-stage-home-timeline/);
  assert.match(module, /data-stage-home-view="activities"/);
});

test('landing mantém cronograma e registros navegáveis', () => {
  const components = read('components.js');
  const page = read('stage-home-page-v1.mjs');

  assert.match(components, /stageHomeSnapshotV1/);
  assert.match(components, /executionModel\.stages/);
  assert.match(components, /operationalRaid\(\)/);
  assert.match(components, /operationalActions\(\)/);
  assert.match(components, /data-stage-home-stage/);
  assert.match(components, /anchor\.insertAdjacentHTML\("afterend", stagePersistentTimelineMarkupV1\(\)\)/);
  assert.match(components, /data-stage-persistent-timeline/);
  assert.match(page, /stage-home-record-card/);
  assert.match(page, /stage-home-canvas-event/);
  assert.match(page, /data-stage-home-calendar-shift/);
  assert.doesNotMatch(page, /03 — 09 de junho de 2024/);
});

test('prioridades IA aparecem na Central como cards sem clique', () => {
  const components = read('components.js');
  const home = renderStageHomePageV1({stages: [], actions: [{id: 'a1', label: 'Revisar frente'}]});
  const board = renderOperationalAiPrioritiesV1([{id: 'a1', label: 'Revisar frente', impact: 4, readiness: 70}]);
  assert.doesNotMatch(home, /data-stage-home-section="actions"/);
  assert.match(board, /control-center-section stage-home-section stage-home-ai control-ai-priorities/);
  assert.match(board, /<article class="stage-home-ai-card/);
  assert.match(board, /Revisar frente/);
  assert.doesNotMatch(board, /<button|data-stage-home-ai=/);
  assert.match(components, /renderOperationalAiPrioritiesV1\(operationalActions\(\)\)/);
  assert.doesNotMatch(components, /querySelectorAll\("\[data-stage-home-ai\]"\)/);
});

test('cards do cronograma abrem a subpágina dedicada da etapa', () => {
  const components = read('components.js');

  assert.match(components, /data-stage-home-stage/);
  assert.match(components, /selectedStageV9: stage\.key,[\s\S]{0,120}selectedStage: record\?\.id \|\| stage\.key,[\s\S]{0,80}activityDedicated: true/);
  assert.match(components, /data-persistent-stage-key/);
  assert.match(components, /selectedStage: record\?\.id \|\| stage\.key,[\s\S]{0,80}selectedStageV9: key,[\s\S]{0,80}activityDedicated: true/);
});

test('agenda usa a mesma linha do tempo após instalar seu calendário', () => {
  const components = read('components.js');
  assert.match(components, /ViewLayer\.prototype\.agenda = function \(\) \{\s*return stagePersistentTimelineMarkupV1\(\) \+ agendaCalendarMarkupV3\(extensionStage\(\)\);/);
});

test('calendário-canvas ocupa o primeiro bloco e posiciona compromisso pela data', () => {
  const page = renderStageHomePageV1({
    stages: [{key: 'earthwork', name: 'Terraplenagem', owner: 'Equipe', progress: 30}],
    calendarLabel: '20 — 26 de setembro',
    calendar: [20, 21, 22, 23, 24, 25, 26].map(day => ({iso: `2026-09-${day}`, date: String(day), weekday: 'dia'})),
    calendarEvents: [{id: 'a1', stageKey: 'earthwork', date: '2026-09-22', start: '09:00', title: 'Medição', owner: 'Equipe', status: 'Planejado'}],
  });
  assert.ok(page.indexOf('data-stage-home-section="calendar"') < page.indexOf('stage-home-kpis'));
  assert.match(page, /data-stage-home-calendar-event="a1"/);
  assert.match(page, /left:calc\(2 \* 100% \/ 7/);
  assert.match(page, /20 — 26 de setembro/);
});
