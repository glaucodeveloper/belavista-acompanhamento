import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('modelo de pessoal possui formações, pessoas e vínculos por etapa',()=>{
  const state=read('state.js');
  assert.match(state,/export const personnelModel = \{/);
  assert.match(state,/teams: \[/);
  assert.match(state,/memberCount:12/);
  assert.match(state,/assignments: \{/);
  assert.match(state,/personnelTeams:structuredClone\(personnelModel\.teams\)/);
});

test('admin expõe a rota Pessoal e a unidade de produção assistida',()=>{
  const components=read('components.js');
  assert.match(components,/\['personnel','users-round','Pessoal'\]/);
  assert.match(components,/personnel:\['Pessoal','Formação de equipes e unidades de produção'\]/);
  assert.match(components,/ViewLayer\.prototype\.personnel=function\(\)/);
  assert.match(components,/adjustedRate/);
  assert.match(components,/predictedDays:calc\.days/);
});

test('documento de estimativas fica como fonte de calibração protegida',()=>{
  const components=read('components.js');
  assert.match(components,/data-personnel-estimate-file/);
  assert.match(components,/personnel\.estimates\.received/);
  assert.match(components,/revisão humana necessária antes da calibração/);
});

test('tela de pessoal possui edição de formação e layout responsivo',()=>{
  const styles=read('styles.css');
  assert.match(styles,/\.personnel-team-form-v5372/);
  assert.match(styles,/view-layer\[data-view="personnel"\]/);
  assert.match(styles,/@media\(max-width:760px\)/);
  assert.match(styles,/@media\(max-width:460px\)/);
});
