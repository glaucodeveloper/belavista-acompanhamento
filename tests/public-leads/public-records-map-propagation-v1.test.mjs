import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('registros de campo carregam o mapa Three.js com import map completo', () => {
  for (const file of ['public-records.html', 'index.html', 'public-leads.html']) {
    const html = read(file);
    assert.match(html, /"three":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/build\/three\.module\.js"/);
    assert.match(html, /"three\/addons\/":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/examples\/jsm\/"/);
  }
});

test('registro público preserva a área e os partIds na submissão', () => {
  const html = read('public-records.html');
  const module = read('public-records.js');
  const persistence = read('persistence.mjs');
  const workerStorage = read('worker/src/storage.js');
  const workerMigration = read('worker/migrations/0007_record_map_area.sql');
  assert.match(html, /name="mapArea"/);
  assert.match(html, /name="partIds"/);
  assert.match(module, /setMapSelectionFields\(area\)/);
  assert.match(module, /recordPaintArea/);
  assert.match(module, /mapArea:normalizedMapArea\?JSON\.stringify\(normalizedMapArea\):''/);
  assert.match(module, /partIds\)/);
  assert.match(persistence, /serializeMapArea/);
  assert.match(persistence, /input\.partIds/);
  assert.match(workerStorage, /map_area AS mapArea/);
  assert.match(workerStorage, /mapAreaValue/);
  assert.match(workerMigration, /ADD COLUMN map_area/);
});

test('renderer administrativo usa fallback quando WebGL não está disponível', () => {
  const components = read('components.js');
  assert.match(components, /WebGL indisponível no mapa administrativo/);
  assert.match(components, /context: webglContext/);
});
