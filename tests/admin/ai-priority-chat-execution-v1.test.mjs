import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('prioridades da Central são uma lista clicável enviada ao chat operacional',async()=>{
  const [page,components,styles]=await Promise.all([
    read('stage-home-page-v1.mjs'),read('components.js'),read('styles.css')
  ]);
  assert.match(page,/data-stage-home-ai-action=/);
  assert.match(page,/Lista executável/);
  assert.match(styles,/control-ai-priorities \.stage-home-ai-grid\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(components,/installControlCenterPriorityChatV1\(ViewLayer/);
  const priorityChat=await read('components/planning/control-center-priority-chat-v1.mjs');
  assert.match(priorityChat,/priorityChatRequestV1/);
  assert.match(priorityChat,/chat\.submit\(priorityChatRequestV1\(action\), null,/);
  assert.match(priorityChat,/source: "stage-home-ai-priority"/);
});

test('toda requisição de chat leva política de execução e ferramentas de agenda/documento',async()=>{
  const [components,worker,routes,server]=await Promise.all([
    read('components.js'),read('worker/src/nvidia.js'),read('worker/src/routes.js'),read('server.mjs')
  ]);
  assert.match(components,/CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/);
  const priorityChat=await read('components/planning/control-center-priority-chat-v1.mjs');
  assert.match(priorityChat,/CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/);
  assert.match(priorityChat,/instruction: CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/);
  assert.match(worker,/OPERATIONAL_CHAT_EXECUTION_POLICY_V1/);
  assert.match(worker,/agenda\.create_pending/);
  assert.match(worker,/documents\.open_form/);
  assert.match(routes,/instruction:payload\.instruction,requestContext:modelRequestContextV21/);
  assert.match(server,/agenda\.create_pending/);
  assert.match(server,/documents\.open_form/);
});
