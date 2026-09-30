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
  assert.match(components,/priorityChatRequestV1/);
  assert.match(components,/chat\.respond\(priorityChatRequestV1\(action\), null,/);
  assert.match(components,/source: "control-ai-priority"/);
});

test('toda requisição de chat leva política de execução e ferramentas de agenda/documento',async()=>{
  const [components,worker,routes,server]=await Promise.all([
    read('components.js'),read('worker/src/nvidia.js'),read('worker/src/routes.js'),read('server.mjs')
  ]);
  assert.match(components,/CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/);
  assert.match(components,/instruction: CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/);
  assert.match(components,/name === "agenda\.create_pending"/);
  assert.match(components,/name === "documents\.open_form"/);
  assert.match(worker,/OPERATIONAL_CHAT_EXECUTION_POLICY_V1/);
  assert.match(worker,/agenda\.create_pending/);
  assert.match(worker,/documents\.open_form/);
  assert.match(routes,/instruction:payload\.instruction,requestContext:payload\.requestContext/);
  assert.match(server,/agenda\.create_pending/);
});
