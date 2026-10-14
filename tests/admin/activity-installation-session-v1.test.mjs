import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const state=read('state.js');
const components=read('components.js');
const agenda=read('components/planning/agenda-calendar-v8.mjs');
const installation=read('components/planning/activity-installation-session-v1.mjs');
const styles=read('styles.css');

test('a sessão de instalação mantém um rascunho limpo e persistido',()=>{
  assert.match(state,/export const activityInstallationDefaults = \{/);
  assert.match(state,/activityInstallation:structuredClone\(activityInstallationDefaults\)/);
  assert.match(state,/['"]activityInstallation['"]/);
  for(const key of ['entry','materials','edit','rationalize','cards'])assert.match(installation,new RegExp(`['"]${key}['"]`));
});

test('a instalação cobre entrada, materiais, edição, racionalização e cards',()=>{
  for(const marker of ['data-installation-entry-form','data-installation-material','data-installation-edit-form','data-installation-rationalize','data-installation-finalize','data-installation-card-board'])assert.match(installation,new RegExp(marker));
  assert.match(installation,/Sem conflito/);
  assert.match(installation,/PERT · papéis · prioridade · agenda/);
  assert.match(installation,/Criar dependências no PERT/);
  assert.match(installation,/Cadastrar papéis/);
  assert.match(installation,/Determinar prioridades com IA/);
  assert.match(installation,/renderActivityFormGroupsV1/);
  assert.match(installation,/activity-install-worker-preview/);
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
  assert.match(installation,/stages-organizer-raid/);
  assert.match(installation,/RAID para decisão do administrador/);
  assert.match(installation,/Instalar atividades/);
  assert.match(installation,/data-installation-open.*data-cmd="activity-installation".*wand-sparkles.*Instalar atividades/);
  assert.match(installation,/localSqlState\?\.clean\s*!==\s*true/);
  assert.match(installation,/Sessão de instalação indisponível/);
  assert.match(components,/installStageAgendaApplicationCompositionV1\(\{/);
  assert.match(read('components/planning/stage-agenda-application-composition-v1.mjs'),/installActivityInstallationSessionV1\(ViewLayer/);
  assert.match(read('components/shared/application-navigation-routes-v1.mjs'),/"activity-installation"/);
  assert.match(read('app.js'),/requestedView==='activity-installation'&&clean/);
});

test('Agenda fornece uma grade semanal de calendário',()=>{
  assert.match(agenda,/agenda-week-page-v8/);
  assert.match(agenda,/agenda-week-days-v8/);
  assert.match(agenda,/agenda-mobile-day-v8/);
  assert.equal((agenda.match(/ViewLayer\.prototype\.agenda = function/g)||[]).length,1);
  assert.match(styles,/\.stage-agenda-week-grid/);
});

test('a nova superfície atualiza o cache busting do shell administrativo',()=>{
  assert.match(read('app.js'),/components\.js\?v=components-primitive-elements-registration-v1/);
  assert.match(read('index.html'),/styles\.css\?v=limited-role-surface-v1/);
  assert.match(read('components.js'),/state\.js\?v=system-metrics-v1-20260919/);
});
