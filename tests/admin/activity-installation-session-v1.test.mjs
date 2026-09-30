import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const state=read('state.js');
const components=read('components.js');
const styles=read('styles.css');

test('a sessão de instalação mantém um rascunho limpo e persistido',()=>{
  assert.match(state,/export const activityInstallationDefaults = \{/);
  assert.match(state,/activityInstallation:structuredClone\(activityInstallationDefaults\)/);
  assert.match(state,/['"]activityInstallation['"]/);
  for(const key of ['entry','materials','edit','rationalize','cards'])assert.match(components,new RegExp(`['"]${key}['"]`));
});

test('a instalação cobre entrada, materiais, edição, racionalização e cards',()=>{
  for(const marker of ['data-installation-entry-form','data-installation-material','data-installation-edit-form','data-installation-rationalize','data-installation-finalize','data-installation-card-board'])assert.match(components,new RegExp(marker));
  assert.match(components,/Sem conflito/);
  assert.match(components,/PERT · papéis · prioridade · agenda/);
  assert.match(components,/Criar dependências no PERT/);
  assert.match(components,/Cadastrar papéis/);
  assert.match(components,/Determinar prioridades com IA/);
  assert.match(components,/renderActivityFormGroupsV1/);
  assert.match(components,/activity-install-worker-preview/);
});

test('a ficha do worker compartilha os grupos da instalação e preserva a edição',()=>{
  const worker=read('stage-workbench.mjs'),shared=read('activity-form-groups-v1.mjs');
  assert.match(worker,/workerActivityEditMarkup/);
  assert.match(worker,/data-activity-edit-form/);
  assert.match(worker,/statePayload/);
  assert.match(worker,/responsible:String\(item\?\.responsible/);
  assert.match(shared,/Identidade e vínculo/);
  assert.match(shared,/Descrição, medição e local/);
  assert.match(shared,/Responsabilidade e saída/);
  assert.match(read('stage-workbench.css'),/WORKER_ACTIVITY_EDITOR_GROUPS_V1/);
});

test('novo registro abre uma página dedicada no contexto da atividade',()=>{
  const worker=read('stage-workbench.mjs'),recordPage=read('activity-record-page-v1.mjs');
  assert.match(worker,/renderActivityRecord/);
  assert.match(worker,/activityRecordLink/);
  assert.match(worker,/activity\/record/);
  assert.match(recordPage,/data-activity-record-form/);
  assert.match(recordPage,/Registrar e propagar/);
  assert.match(read('admin-workers.js'),/activity\\\/record/);
  assert.match(read('server.mjs'),/admin\/workers\/activity\/record/);
  assert.match(read('stage-workbench.css'),/ACTIVITY_RECORD_PAGE_V1/);
});

test('Etapas apresenta a saída RAID e a instalação entra na navegação contextual',()=>{
  assert.match(components,/stages-organizer-raid/);
  assert.match(components,/RAID para decisão do administrador/);
  assert.match(components,/Instalar atividades/);
  assert.match(components,/activity-installation.*wand-sparkles.*Instalação/);
  assert.match(components,/localSqlState\?\.clean===true/);
  assert.match(components,/Sessão de instalação indisponível/);
  assert.match(read('app.js'),/directViewsV1/);
  assert.match(read('app.js'),/requestedView==='activity-installation'\?\'stages\':requestedView/);
});

test('Agenda fornece uma grade semanal de calendário',()=>{
  assert.match(components,/stage-agenda-calendar-v1/);
  assert.match(components,/stage-agenda-week-grid/);
  assert.match(components,/03 — 09 de junho de 2024/);
  assert.match(styles,/\.stage-agenda-week-grid/);
});

test('a nova superfície atualiza o cache busting do shell administrativo',()=>{
  assert.match(read('app.js'),/components\.js\?v=map-pdf-texture-bright-aligned-v26-20260915/);
  assert.match(read('index.html'),/styles\.css\?v=stage-home-raid-ai-records-calendar-v8-20260915/);
  assert.match(read('components.js'),/state\.js\?v=map-dashboard-modes-v8-20260914/);
});
