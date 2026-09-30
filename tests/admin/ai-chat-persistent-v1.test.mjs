import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const components=read('components.js');
const styles=read('styles.css');
const html=read('index.html');
const bootstrap=read('admin-original-bootstrap-v5351.mjs');
const worker=read('sw.js');

test('shell administrativo não monta o chat flutuante global',()=>{
  assert.match(app,/map-scene[\s\S]*view-layer[\s\S]*<\/main>/);
  assert.doesNotMatch(app,/<ai-chat><\/ai-chat>/);
  assert.match(app,/records-activity-drill-in-v5377/);
  assert.match(bootstrap,/app\.js\?v=map-pdf-texture-bright-aligned-v26-20260915/);
});

test('histórico e monitoramento reagem à navegação e ao estado do sistema',()=>{
  assert.match(components,/CHAT_HISTORY_STORAGE_KEY/);
  assert.match(components,/restoreChatHistory\(\)/);
  assert.match(components,/observeSystemState\(state\)/);
  assert.match(components,/belavista:test-case-completed/);
  assert.match(components,/Navegação detectada/);
  assert.match(components,/O caixa mestre foi atualizado/);
});

test('respostas manuais e contexto do mapa entram no histórico',()=>{
  assert.match(components,/appendConversationMessage\('user',userMessage\)/);
  assert.match(components,/this\.persistChatMessage\('assistant',answerText\)/);
  assert.match(components,/appendConversationMessage\('user','🗺️ Contexto de lotes 3D aberto'\)/);
});

test('sidebar fica identificada como pronta e continua acessível no shell',()=>{
  assert.match(components,/aria-label="Navegação principal"/);
  assert.match(components,/this\.dataset\.sidebarReady='true'/);
  assert.match(styles,/BELAVISTA_AI_CHAT_SHELL_PERSISTENT_V1/);
  assert.match(styles,/app-shell:not\(\.print-mode\) app-sidebar/);
  assert.match(styles,/chat-monitoring-dot/);
});

test('cache do shell acompanha a versão da instância persistente',()=>{
  assert.match(html,/styles\.css\?v=stage-home-raid-ai-records-calendar-v8-20260915/);
  assert.match(worker,/state\.js\?v=map-dashboard-modes-v8-20260914/);
});
