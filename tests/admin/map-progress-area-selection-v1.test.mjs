import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=read('components.js');
const state=read('state.js');
const styles=read('styles.css');

test('modo Progresso seleciona polígonos por clique e por retângulo',()=>{
  assert.match(components,/this\.mapSelectionMode==='progress'/);
  assert.match(components,/toggleProgressAreaSelectionV1/);
  assert.match(components,/setProgressAreaSelectionV1\(parts,\{append:true,announce:true\}\)/);
  assert.match(components,/progressMapPartsV1/);
  assert.match(components,/progressSelectionMaterial/);
  assert.match(components,/clearCurrentMapSelectionV1/);
  assert.match(components,/if\(!picked\)this\.clearCurrentMapSelectionV1\(true\)/);
  assert.match(components,/if\(parts\.length\)return this\.setProgressAreaSelectionV1/);
  assert.match(components,/return this\.clearCurrentMapSelectionV1\(true\)/);
  assert.match(components,/mapFilters:\[\],mapFilter:null,mapFilterWidget:null/);
  assert.match(components,/Seleção e filtros do mapa removidos/);
});

test('widget lista áreas selecionadas e progresso de todas as etapas',()=>{
  assert.match(state,/mapProgressSelection:\[\]/);
  assert.match(state,/mapProgressSelection/);
  assert.match(components,/mapProgressSummaryMarkupV1/);
  assert.match(components,/map-filter-progress-list/);
  assert.match(components,/data-map-progress-start/);
  assert.match(components,/data-map-progress-entry/);
  assert.match(components,/data-map-progress-clear/);
  assert.match(styles,/MAP_PROGRESS_AREA_LIST_V1/);
  assert.match(styles,/\.map-filter-progress-stage\.selected/);
});
