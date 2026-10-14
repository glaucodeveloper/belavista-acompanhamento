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

test('a rota Pessoal instala o diretório ativo de encarregados',()=>{
  const components=read('components.js');
  const viewLayer=read('components/shared/view-layer-v1.mjs');
  const registration=read('components/planning/personnel-page-registration-v1.mjs');
  const foremen=read('components/planning/foremen-directory-v1.mjs');
  assert.match(viewLayer,/personnel: \["Pessoal", "Formação de equipes e unidades de produção"\]/);
  assert.match(components,/installPersonnelPageRegistrationV1\(\{/);
  assert.match(registration,/installForemenDirectoryPageV1\(ViewLayer/);
  assert.match(registration,/publishOperationalEvent,/);
  assert.match(registration,/ViewLayer\.prototype\.collaborators = function \(\) \{\s*return this\.personnel\(\);/);
  assert.match(foremen,/ViewLayer\.prototype\.personnel = function \(\)/);
  assert.match(foremen,/Encarregados de atividade/);
});

test('cadastro ativo de encarregados preserva vínculo e publicação de eventos',()=>{
  const foremen=read('components/planning/foremen-directory-v1.mjs');
  assert.match(foremen,/data-foreman-form/);
  assert.match(foremen,/name="stages"/);
  assert.match(foremen,/personnelPublishV5372\(editing \? "foreman\.updated" : "foreman\.created"/);
  assert.doesNotMatch(read('components.js'),/personnelStageTeamV5372|data-personnel-estimate-file/);
});

test('tela de pessoal possui edição de formação e layout responsivo',()=>{
  const styles=read('styles.css');
  assert.match(styles,/\.personnel-team-form-v5372/);
  assert.match(styles,/view-layer\[data-view="personnel"\]/);
  assert.match(styles,/@media\(max-width:760px\)/);
  assert.match(styles,/@media\(max-width:460px\)/);
});
