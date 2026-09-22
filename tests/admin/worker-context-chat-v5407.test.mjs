import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const workers=read('admin-workers.html');
const chat=read('worker-context-chat.mjs');
const chatCss=read('worker-context-chat.css');
const components=read('components.js');
const app=read('app.js');
const leadForm=read('public-lead-form.mjs');

test('monitor de workers carrega o chat fora do shell reconstruído',()=>{
  assert.match(workers,/worker-context-chat\.css\?v=worker-chat-v5407/);
  assert.match(workers,/worker-context-chat\.mjs\?v=worker-chat-v5407/);
  assert.match(chat,/document\.body\.insertAdjacentHTML/);
  assert.match(chat,/data-worker-context-assistant/);
  assert.match(chat,/data-worker-context-fade/);
  assert.match(chat,/showContextualFade/);
  assert.match(chatCss,/position:fixed/);
});

test('chat dos workers cobre entrada, edição e indisponibilidade explícita do endpoint',()=>{
  assert.match(chat,/localStorage/);
  assert.match(chat,/startEdit\(id\)/);
  assert.match(chat,/Entrada editada pelo usuário/);
  assert.match(chat,/fetch\('\/api\/ai'/);
  assert.doesNotMatch(chat,/fallbackReply/);
  assert.match(chat,/Nenhuma resposta local foi usada/);
  assert.match(chat,/data-worker-chat-action="cycle"/);
  assert.match(chat,/data-worker-chat-action="tests"/);
});

test('chat observa navegação, workers, ciclo, caixa, registros e eventos de teste',()=>{
  for(const pattern of [
    /popstate/,
    /MutationObserver/,
    /belavista:test-case-completed/,
    /belavista:worker-cycle-completed/,
    /belavista:worker-state-changed/,
    /O caixa mestre foi atualizado/,
    /O histórico de registros mudou/
  ]) assert.match(chat,pattern);
});

test('chat administrativo e atendimento público possuem áudio opt-in',()=>{
  assert.match(components,/data-chat-voice-toggle/);
  assert.match(components,/CHAT_VOICE_STORAGE_KEY_V1/);
  assert.match(components,/speakText\(text\)/);
  assert.match(chat,/data-worker-chat-voice/);
  assert.match(chat,/SpeechSynthesisUtterance/);
  assert.match(leadForm,/WELCOME_MESSAGE/);
});

test('as superfícies pública e administrativa mantêm conversa contextual',()=>{
  assert.match(app,/<ai-chat><\/ai-chat>/);
  assert.match(leadForm,/<public-lead-chat><\/public-lead-chat>/);
  assert.match(leadForm,/Peça disponibilidade ou reserva no chat/);
  assert.match(components,/data-chat-context-fade/);
  assert.match(components,/contextFadeTimer/);
});

test('ações seguras do chat apontam para os controles existentes do monitor',()=>{
  assert.match(chat,/data-run-cycle/);
  assert.match(chat,/data-run-suite/);
  assert.match(chat,/data-notification-toggle/);
  assert.match(chat,/data-requirements-catalog/);
});
