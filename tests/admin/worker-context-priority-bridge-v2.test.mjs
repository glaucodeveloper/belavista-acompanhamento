import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=read('components.js');
const workerChat=read('worker-context-chat.mjs');

test('cards do grid de prioridades enviam cadeia guiada ao assistente operacional via API',()=>{
  const block=components.slice(components.indexOf('const bindBeforeControlAiPriorityChatV1'),components.indexOf('// MATERIALS_AI_APPLICATION_PREVIEW_V7'));
  assert.match(block,/globalThis\.belavistaWorkerAssistant/);
  assert.match(block,/\.stage-home-ai-grid \[data-stage-home-ai-action\]/);
  assert.match(block,/chat\.submit\(priorityChatRequestV1/);
  assert.match(block,/mode: "priority"/);
  assert.match(block,/source: "stage-home-ai-priority"/);
  assert.match(block,/workflow: "guided-operational-action-chain"/);
  assert.match(block,/executionChain: \[/);
  assert.match(block,/cardTone:/);
  assert.doesNotMatch(block,/document\.querySelector\("ai-chat"\)/);
  const prompt=components.slice(components.indexOf('const priorityChatRequestV1'),components.indexOf('const bindBeforeControlAiPriorityChatV1'));
  assert.match(prompt,/Conduza pelo chat a execução encadeada/);
  assert.match(prompt,/tone-done do card não prova/);
});

test('worker-context-assistant recebe política e pula fila de service-request para prioridade executável',()=>{
  assert.match(workerChat,/WORKER_OPERATIONAL_EXECUTION_INSTRUCTION_V2/);
  assert.match(workerChat,/options\?\.mode === 'priority'/);
  assert.match(workerChat,/if\(!directOperational&&this\.isServiceRequest\(text\)\)/);
  assert.match(workerChat,/instruction: String\(options\?\.instruction \|\| WORKER_OPERATIONAL_EXECUTION_INSTRUCTION_V2\)/);
  assert.match(workerChat,/requestContext: options\?\.requestContext/);
});

test('worker-context-assistant executa apontamento pendente e solicitação documental',()=>{
  assert.match(workerChat,/call\?\.name === 'agenda\.create_pending'/);
  assert.match(workerChat,/belavista\.agenda-calendar\.v3/);
  assert.match(workerChat,/status:'Pendente'/);
  assert.match(workerChat,/call\?\.name === 'documents\.open_form'/);
  assert.match(workerChat,/documentsEditId:'new'/);
});
