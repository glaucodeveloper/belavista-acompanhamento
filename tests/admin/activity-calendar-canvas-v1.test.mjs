import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const root = 'F:/belavista-acompanhamento';
const components = fs.readFileSync(`${root}/components.js`, 'utf8');
const app = fs.readFileSync(`${root}/app.js`, 'utf8');

test('navegação de etapas não oferece PERT, RAID ou RACI', () => {
  const tabs = components.match(/const stageViewTabs = \(active\) => \{[\s\S]*?const stage = extensionStage\(\);[\s\S]*?const tabs = \[([\s\S]*?)\];/)?.[1];
  assert.ok(tabs);
  assert.doesNotMatch(tabs, /\["pert"|\["raid"|\["raci"/);
  assert.match(tabs, /\["activities"/);
  assert.match(app, /\['pert','raid','raci'\]\.includes\(rawRequestedView\)\?'stages'/);
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
  assert.doesNotMatch(components.match(/ViewLayer\.prototype\.actions = function \(\) \{[\s\S]*?\n\};/)?.[0] || '', /Análise de risco|análise de risco/i);
});
