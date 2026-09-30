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
const index=read('index.html');

test('monitor de workers carrega o chat fora do shell reconstruído',()=>{
  assert.match(workers,/worker-context-chat\.css\?v=worker-chat-image-reasoning-v3/);
  assert.match(workers,/worker-context-chat\.mjs\?v=worker-chat-image-reasoning-v2/);
  assert.match(chat,/document\.body\.insertAdjacentHTML/);
  assert.match(chat,/data-worker-context-assistant/);
  assert.match(chat,/data-worker-context-fade/);
  assert.match(chat,/showContextualFade/);
  assert.match(chatCss,/position:fixed/);
});

test('chat dos workers cobre texto, imagem multimodal, edição e indisponibilidade explícita do endpoint',()=>{
  assert.match(chat,/localStorage/);
  assert.match(chat,/startEdit\(id\)/);
  assert.match(chat,/Entrada editada pelo usuário/);
  assert.match(chat,/const endpoint = attachment \? '\/api\/ai\/vision-reasoning' : '\/api\/ai'/);
  assert.match(chat,/data-worker-chat-camera-input accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(chat,/worker-context-chat-input-shell/);
  assert.match(chat,/worker-context-chat-image-button/);
  assert.match(chat,/this\.root\.addEventListener\('paste'/);
  assert.match(chat,/attachment: attachment \? \{ name: attachment\.name, mimeType: attachment\.mimeType, dataUrl: attachment\.dataUrl \}/);
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

test('monitor não reentra ao atualizar o próprio texto',()=>{
  assert.match(index,/worker-context-chat\.mjs\?v=worker-chat-image-loop-break-v1/);
  assert.match(chat,/const next = `Observando/);
  assert.match(chat,/monitor\.textContent !== next/);
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
  assert.doesNotMatch(app,/<ai-chat><\/ai-chat>/);
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
