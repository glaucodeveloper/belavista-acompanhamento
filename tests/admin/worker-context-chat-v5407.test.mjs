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
const components=read('components/index.mjs');
const aiChatRegistration=read('components/chat/admin-ai-chat-registration-v1.mjs');
const aiChatComposition=read('components/chat/belavista-ai-chat-composition-v1.mjs');
const aiChatProviders=read('components/chat/belavista-ai-chat-providers-v1.mjs');
const aiChat=read('components/chat/ai-chat.mjs');
const aiChatStorage=read('components/chat/storage.mjs');
const app=read('app.js');
const leadForm=read('public-lead-form.mjs');
const index=read('index.html');

test('monitor de workers carrega o chat fora do shell reconstruído',()=>{
  assert.match(workers,/worker-context-chat\.css\?v=codex-floating-v3/);
  assert.match(workers,/worker-context-chat\.mjs\?v=codex-floating-v2/);
  assert.match(chat,/document\.body\.insertAdjacentHTML/);
  assert.match(chat,/data-worker-context-assistant/);
  assert.match(chat,/data-worker-context-fade/);
  assert.match(chat,/showContextualFade/);
  assert.match(chatCss,/position:fixed/);
});

test('chat móvel inicia recolhido sem remover acesso ao assistente',()=>{
  assert.match(chat,/mobileDefaultCollapsed = globalThis\.matchMedia\?\.\('\(max-width: 760px\)'\)\.matches === true \|\|/);
  assert.match(chat,/new URLSearchParams\(location\.search\)\.get\('view'\) === 'lot-development'/);
  assert.match(chat,/worker-context-assistant\$\{mobileDefaultCollapsed \? ' is-collapsed' : ''\}/);
  assert.match(chat,/data-worker-context-assistant/);
  assert.match(chat,/setCollapsed\(collapsed\)/);
});

test('chat dos workers cobre texto, imagem multimodal, conversa de trabalho e indisponibilidade explícita do endpoint',()=>{
  assert.match(chat,/localStorage/);
  assert.match(chat,/startEdit\(id\)/);
  assert.match(chat,/if\(kind === 'user'\) return null/);
  assert.match(chat,/const endpoint = attachment \? '\/api\/ai\/vision-reasoning' : '\/api\/ai'/);
  assert.match(chat,/data-worker-chat-file-input accept="image\/png,image\/jpeg,image\/webp/);
  assert.match(chat,/data-worker-chat-camera-input accept="image\/\*" capture="environment"/);
  assert.match(chat,/data-worker-chat-camera aria-label="Tirar foto"/);
  assert.match(chat,/data-worker-chat-camera\].*cameraInput\?\.click\(\)/);
  assert.match(chat,/readImage\(file, source\)/);
  assert.match(chat,/worker-context-chat-input-shell/);
  assert.match(chat,/data-worker-chat-file aria-label="Anexar arquivo"/);
  assert.match(chat,/this\.root\.addEventListener\('paste'/);
  assert.match(chat,/attachment: attachment \? \{ name: attachment\.name, mimeType: attachment\.mimeType, dataUrl: attachment\.dataUrl \}/);
  assert.doesNotMatch(chat,/fallbackReply/);
  assert.match(chat,/Nenhuma resposta local foi usada/);
  assert.match(chat,/data-worker-chat-action="cycle"/);
  assert.match(chat,/data-worker-chat-action="tests"/);
});

test('chat administrativo flutua centralizado e mantém resposta e compositor sem deslocar a página',()=>{
  assert.match(chatCss,/WORKER_CHAT_CODEX_FLOATING_V2/);
  assert.match(chatCss,/top:50%!important;left:50%!important;right:auto!important;bottom:auto!important/);
  assert.match(chatCss,/transform:translate\(-50%,-50%\)!important/);
  assert.match(chatCss,/worker-context-chat-log\{flex:1 1 auto;min-height:0;max-height:none!important;overflow:auto/);
  assert.doesNotMatch(chatCss,/\.app-main\{[^}]*padding-right:calc\(var\(--worker-chat-sidebar-width\)/);
  assert.match(chat,/this\.messages\.at\(-1\)/);
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
  assert.match(index,/worker-context-chat\.mjs\?v=codex-floating-v2/);
  assert.match(chat,/const next = `Observando/);
  assert.match(chat,/monitor\.textContent !== next/);
});

test('chat administrativo e atendimento público possuem áudio opt-in',()=>{
  assert.match(aiChat,/data-chat-voice-toggle/);
  assert.match(components,/registerBelavistaAdminAiChatV1/);
  assert.match(aiChatRegistration,/registerBelavistaAiChatElementV1\(/);
  assert.match(aiChatComposition,/createBelavistaAiChatProvidersV1/);
  assert.match(aiChatProviders,/createAiChatStoragePortV1/);
  assert.match(aiChatStorage,/CHAT_VOICE_STORAGE_KEY_V1/);
  assert.match(aiChat,/speakText\(text\)/);
  assert.match(chat,/data-worker-chat-voice/);
  assert.match(chat,/data-worker-chat-speaker/);
  assert.match(chat,/SPEAKER_PROFILE_KEY/);
  assert.match(chat,/SPEAKER_PROFILES/);
  assert.match(chat,/SpeechSynthesisUtterance/);
  assert.match(leadForm,/WELCOME_MESSAGE/);
});

test('as superfícies pública e administrativa mantêm conversa contextual',()=>{
  assert.doesNotMatch(app,/<ai-chat><\/ai-chat>/);
  assert.match(leadForm,/<public-lead-chat><\/public-lead-chat>/);
  assert.match(leadForm,/Peça disponibilidade ou reserva no chat/);
  assert.match(aiChat,/data-chat-context-fade/);
  assert.match(aiChat,/contextFadeTimer/);
});

test('ações seguras do chat apontam para os controles existentes do monitor',()=>{
  assert.match(chat,/data-run-cycle/);
  assert.match(chat,/data-run-suite/);
  assert.match(chat,/data-notification-toggle/);
  assert.match(chat,/data-requirements-catalog/);
});
