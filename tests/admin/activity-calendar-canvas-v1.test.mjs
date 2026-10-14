import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const root = 'F:/belavista-acompanhamento';
const components = fs.readFileSync(`${root}/components.js`, 'utf8')
  + fs.readFileSync(`${root}/components/planning/stage-context-chrome-v1.mjs`, 'utf8')
  + fs.readFileSync(`${root}/components/planning/operational-intelligence-composition-v1.mjs`, 'utf8')
  + fs.readFileSync(`${root}/components/planning/activity-calendar-canvas-v1.mjs`, 'utf8');
const app = fs.readFileSync(`${root}/app.js`, 'utf8');
const routes = fs.readFileSync(`${root}/components/shared/application-navigation-routes-v1.mjs`, 'utf8');
const actionsPage = fs.readFileSync(`${root}/components/planning/actions-page-v1.mjs`, 'utf8');

test('navegação de etapas não oferece PERT, RAID ou RACI', () => {
  const tabs = components.match(/export const createStageViewTabsMarkupV1 = \(\{[\s\S]*?\n  \};/)?.[0];
  assert.ok(tabs);
  assert.doesNotMatch(tabs, /\["pert"|\["raid"|\["raci"/);
  assert.match(components, /stageViewTabs,/);
  assert.doesNotMatch(components, /ViewLayer\.prototype\.render = function \(\) \{\s*viewLayerRender\.call\(this\)/);
  assert.match(routes, /"agenda", "activities", "progress", "actions"/);
  assert.match(app, /resolveApplicationRouteV1\(rawRequestedView\)/);
});

test('canvas oferece URL de detalhe, grade, relações e persistência local', () => {
  assert.match(components, /data-activity-calendar=/);
  assert.match(components, /data-activity-canvas-open=/);
  assert.match(components, /activity=\$\{encodeURIComponent/);
  assert.match(components, /data-activity-board/);
  assert.match(components, /data-activity-canvas-connect/);
  assert.match(components, /setPointerCapture\(event\.pointerId\)/);
  assert.match(components, /localStorage\.setItem\(key, JSON\.stringify\(\{ positions, links \}\)\)/);
  assert.match(components, /data-activity-canvas-export/);
  assert.match(app, /stageActivityDedicatedV9:Boolean\(linkedActivity\)/);
});

test('Ações IA não oferece trilha de análise de risco', () => {
  const actions = components.match(/const ACTION_TRACK_STEPS = \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(actions);
  assert.doesNotMatch(actions, /Risco|mitigação|contenção/);
  assert.match(actionsPage, /data-action-matrix/);
  assert.doesNotMatch(actionsPage, /Análise de risco|análise de risco/i);
});
