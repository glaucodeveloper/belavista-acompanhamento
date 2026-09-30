import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
function read(rel){try{return fs.readFileSync(path.join(ROOT,rel),'utf8');}catch{return '';}}
const workerFiles=['worker/src/routes.js','worker/src/nvidia.js','worker/src/planning-service.js','worker/src/orchestrator.js','worker/src/operational-loop.js','worker/src/operational-state.js'];
const source=workerFiles.map(f=>`\n/* ${f} */\n${read(f)}`).join('\n');
const strictSource=read('worker/src/strict-nvidia-state.js');

test('strict state selects reasoning model and bounds reasoning budget',()=>{
  assert.match(strictSource,/NVIDIA_STATE_MODEL\|\|env\.NVIDIA_REASONING_MODEL\|\|env\.NVIDIA_REASONING_VISION_MODEL/);
  assert.match(strictSource,/NVIDIA_STATE_REASONING_BUDGET/);
  assert.match(strictSource,/requestBody\.reasoning_budget/);
  assert.match(strictSource,/requestBody\.reasoning_effort/);
});

test('strict transition is layered and keeps global schedule reconciliation inside NVIDIA',()=>{
  assert.match(strictSource,/eventPatchSystemPrompt/);
  assert.match(strictSource,/activityAnalysisSystemPrompt/);
  assert.match(strictSource,/scheduleReconciliationSystemPrompt/);
  assert.match(strictSource,/strategy:'layered'/);
  assert.match(strictSource,/noDeterministicFallback:true/);
});

test('existe /api/operational-loop',()=>assert.match(read('worker/src/routes.js'),/\/api\/operational-loop/));
test('endpoint recebe previousState + event e exige estado total',()=>{assert.match(source,/(previousState|previous_state)/);assert.match(source,/\bevent\b/);assert.match(source,/(requireFullState|fullState|estado completo|estado total)/i);});
test('operational-loop usa NVIDIA para produzir a racionalidade e o próximo estado',()=>{assert.match(source,/(NVIDIA_API_KEY|nvidiaRequest|nvidia-api)/i);assert.match(source,/(metaTrace|metadataTrace|metaUsage|fieldsUsed)/i);});
test('strict AI não aceita fallback determinístico',()=>{assert.match(source,/(noDeterministicFallback|strict.*nvidia|strict-ai-state-transition)/i);});
test('eventos de domínio não disparam planejamento automático por queue',()=>{const routes=read('worker/src/routes.js');assert.doesNotMatch(routes,/queuePlanning\s*\(/,'routes.js ainda programa planejamento automaticamente ao receber eventos.');assert.doesNotMatch(routes,/BELAVISTA_QUEUE[^\n]+planning\.run/,'routes.js ainda agenda planning.run automaticamente.');});
test('modelo contém localidade explícita em atividade e pessoal',()=>assert.match(source,/(localityId|localidadeObraId|workFrontId|frenteObraId)/));
