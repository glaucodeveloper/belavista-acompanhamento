import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=(read('components/map/map-scene-composition-v1.mjs') + read('components.js'));
const selection=read('components/map/map-selection-v1.mjs');
const filterCatalog=read('components/map/dashboard-filter-catalog-v1.mjs');
const state=read('state.js');
const styles=read('styles.css');

test('modo Progresso seleciona polígonos por clique e por retângulo',()=>{
  assert.match(components,/this\.mapSelectionMode\s*===\s*"progress"/);
  assert.match(selection,/toggleProgressAreaSelectionV1/);
  assert.match(selection,/setProgressAreaSelectionV1\(parts,/);
  assert.match(selection,/progressMapPartsV1/);
  assert.match(selection,/progressSelectionMaterial/);
  assert.match(selection,/clearCurrentMapSelectionV1/);
  assert.match(components,/if\s*\(!picked\)\s*this\.clearCurrentMapSelectionV1\(true\)/);
  assert.match(selection,/if \(parts\.length\)[\s\S]{0,50}setProgressAreaSelectionV1/);
  assert.match(selection,/return this\.clearCurrentMapSelectionV1\(true\)/);
  assert.match(selection,/mapFilters:\s*\[\],\s*mapFilter:\s*null,\s*mapFilterWidget:\s*null/);
  assert.match(selection,/Seleção e filtros do mapa removidos/);
});

test('widget lista áreas selecionadas e progresso de todas as etapas',()=>{
  assert.match(state,/mapProgressSelection:\[\]/);
  assert.match(state,/mapProgressSelection/);
  assert.match(filterCatalog,/mapProgressSummaryMarkupV1/);
  assert.match(filterCatalog,/map-filter-progress-list/);
  assert.match(filterCatalog,/data-map-progress-start/);
  assert.match(filterCatalog,/data-map-progress-entry/);
  assert.match(filterCatalog,/data-map-progress-clear/);
  assert.match(styles,/MAP_PROGRESS_AREA_LIST_V1/);
  assert.match(styles,/\.map-filter-progress-stage\.selected/);
});
