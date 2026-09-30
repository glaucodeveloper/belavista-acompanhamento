import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('PERT cria card e relação somente após formulário, com prévia Bézier', () => {
  const source = read('components.js');
  assert.match(source, /const beginCardCanvasLinkV1 =/);
  assert.match(source, /path\.setAttribute\("d", `M .* C /);
  assert.match(source, /card-canvas-link-ghost/);
  assert.match(source, /data-pert-link-form/);
  assert.match(source, /pertCustomNodes: \[/);
  assert.match(source, /pertRelations: \[/);
});

test('Agenda preserva arraste de dia e hora e cria novo card vinculado', () => {
  const source = read('components.js');
  assert.match(source, /data-agenda-link-from/);
  assert.match(source, /if \(target\.closest\("\[data-agenda-link-from\]"\)\) return/);
  assert.match(source, /beginCardCanvasLinkV1\(\{[\s\S]*?surface: track/);
  assert.match(source, /form\.elements\.date\.value = day\.dataset\.agendaDayV3/);
  assert.match(source, /form\.elements\.start\.value = agendaCalendarHoursToTimeV3/);
  assert.match(source, /relatedFrom: agendaLinkSourceV1/);
  assert.match(source, /drawAgendaRelationsV1/);
});
