import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../components.js', import.meta.url), 'utf8')
  + fs.readFileSync(new URL('../../components/records/materials-workspace-v1.mjs', import.meta.url), 'utf8');

test('Dashboard e Materiais usam a coleção compartilhada', () => {
  const sidebarSource = fs.readFileSync(new URL('../../components/shared/app-sidebar.mjs', import.meta.url), 'utf8');
  assert.match(sidebarSource, /\["control", "table-properties", "Dashboard"\]/);
  assert.doesNotMatch(sidebarSource, /\["map",\s*"house",\s*"Dashboard inicial"\]|\["control",\s*"table-properties",\s*"Central operacional"\]/);
  assert.match(source, /ViewLayer\.prototype\.materials = function \(\)/);
  assert.match(source, /all = controlCenterMaterialRowsV1\(state\)/);
  assert.match(source, /materialCatalogAdditions/);
});

test('canvas e lista oferecem exploração e CRUD com auditoria', () => {
  for (const marker of ['data-materials-canvas', 'data-material-search', 'data-material-stage-filter', 'data-material-status-filter', 'data-material-page', 'data-material-form', 'data-material-edit', 'data-material-delete']) {
    assert.ok(source.includes(marker), `${marker} ausente`);
  }
  assert.match(source, /controlCenterRecordChangeV1\("Material salvo"/);
  assert.match(source, /controlCenterPublishV1\("control\.material\.deleted"/);
  for (const column of ['<th>ID</th>', '<th>Etapa</th>', '<th>Atividade</th>', '<th>Quantidade</th>', '<th>Unidade</th>', '<th>Situação</th>']) {
    assert.ok(source.includes(column), `${column} ausente na lista corrida`);
  }
  assert.match(source, /state\.materialsPageTab/);
});

test('canvas liga materiais a etapas por cabo Bézier e preserva a alocação', () => {
  for (const marker of ['data-material-link-card', 'data-material-link-start', 'data-material-drop-stage', 'data-materials-links']) {
    assert.ok(source.includes(marker), `${marker} ausente no canvas`);
  }
  assert.match(source, /M \$\{from\.x\} \$\{from\.y\} C \$\{from\.x \+ bend\}/);
  assert.match(source, /handle\.setPointerCapture\(event\.pointerId\)/);
  assert.match(source, /document\.elementFromPoint\(event\.clientX, event\.clientY\)/);
  assert.match(source, /controlMaterialOverrides: \{[\s\S]*?\[id\]: \{[^\n]*stageKey: stage\.key, stageName: stage\.name/);
  assert.match(source, /controlCenterRecordChangeV1\("Material vinculado à etapa"/);
  assert.match(source, /controlCenterPublishV1\("control\.material\.updated"/);
});

test('Lista corrida permite edição inline e abre o formulário pelo número da linha', () => {
  assert.match(source, /materials-sheet-table/);
  assert.match(source, /data-material-sheet-row/);
  assert.match(source, /data-material-sheet-cell/);
  assert.match(source, /materials-sheet-inline-editor/);
  assert.match(source, /if \(event\.key === "Enter"/);
  assert.match(source, /patch\(\{ materialsEditId: header\.dataset\.materialSheetRow \}\)/);
  assert.match(source, /confirm\(`Salvar alteração em/);
  assert.match(source, /controlCenterPublishV1\("control\.material\.updated"/);
});
