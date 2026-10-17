import assert from 'node:assert/strict';
import * as persistence from '../../persistence.mjs';
import {runOperationalLoop} from '../../worker/src/operational-loop.js';
import {assertEventApplied,assertFullState,assertStrictNvidia} from './helpers.mjs';
import {validateEventEffect} from './fixtures/effect-validators.mjs';
import {applicationStateFingerprint,buildApplicationInferenceCases,readApplicationOperationalState} from './fixtures/application-state.mjs';

const apiKey=process.env.NVIDIA_API_KEY||process.env.NVIDIA_NIM_API_KEY||'';
const args=process.argv.slice(2);
const snapshotOnly=args.includes('--snapshot-only');
const requested=args.filter(arg=>arg!=='--snapshot-only').join(' ').trim().toLocaleLowerCase('pt-BR');
const safeMessage=value=>{
  const message=String(value||'erro sem mensagem').trim();
  return (apiKey?message.replaceAll(apiKey,'[REDACTED]'):message).slice(0,500);
};

let failed=0,passed=0,skipped=0;
try{
  const {state:baseState,sourceCounts}=await readApplicationOperationalState();
  const cases=buildApplicationInferenceCases(baseState);
  const selected=snapshotOnly?[]:(requested?cases.filter(s=>`${s.name} ${s.event.type}`.toLocaleLowerCase('pt-BR').includes(requested)):cases);
  assert.ok(snapshotOnly||selected.length,`Nenhum cenário corresponde ao filtro: ${requested}`);
  const beforeFingerprint=await applicationStateFingerprint();
  assert.ok(sourceCounts.stages>0&&sourceCounts.activities>0,'Snapshot local precisa conter etapas e atividades reais.');
  assert.ok(sourceCounts.materials>0&&sourceCounts.personnel>0,'Snapshot local precisa conter materiais e equipe reais.');
  assert.ok(baseState.cash.ledger.length>0,'Snapshot local precisa conter caixa persistido.');
  assert.ok(baseState.personnel.every(person=>!('email' in person)&&!('phone' in person)),'Snapshot não deve enviar contatos pessoais.');
  console.log(`Snapshot local: ${sourceCounts.stages} etapas, ${sourceCounts.activities} atividades, ${sourceCounts.materials} materiais, ${sourceCounts.personnel} colaboradores, ${sourceCounts.purchases} compras, ${sourceCounts.records} registros, ${sourceCounts.cashEntries} movimentos de caixa.`);
  console.log(snapshotOnly?'Snapshot validado; nenhuma inferência foi disparada.':`Cenários: ${selected.length}${requested?' (filtrados)':''}; provider: NVIDIA strict; gravação: desligada.`);
  if(!snapshotOnly&&apiKey)console.log(`Modelo strict: ${process.env.BELAVISTA_TEST_NVIDIA_STATE_MODEL||process.env.NVIDIA_STATE_MODEL||process.env.NVIDIA_REASONING_MODEL||process.env.NVIDIA_REASONING_VISION_MODEL||process.env.NVIDIA_MODEL||process.env.NVIDIA_NIM_MODEL||'padrão'}; camadas NVIDIA com lotes de até ${process.env.NVIDIA_STATE_ANALYSIS_BATCH_SIZE||'3'} atividades; timeout por chamada: ${process.env.NVIDIA_STATE_TIMEOUT_MS||'180000'} ms; tentativas máximas: ${process.env.NVIDIA_STATE_RETRIES||'1'}.`);

  for(const scenario of selected){
    if(!apiKey){
      skipped++;
      console.log(`SKIP ${scenario.event.type} — ${scenario.name}: NVIDIA_API_KEY não configurada.`);
      continue;
    }
    try{
      const previousState=scenario.createState();
      const env={
        NVIDIA_API_KEY:apiKey,
        NVIDIA_API_URL:process.env.NVIDIA_API_URL||process.env.NVIDIA_NIM_API_URL,
        NVIDIA_STATE_MODEL:process.env.BELAVISTA_TEST_NVIDIA_STATE_MODEL||process.env.NVIDIA_STATE_MODEL,
        NVIDIA_REASONING_MODEL:process.env.NVIDIA_REASONING_MODEL,
        NVIDIA_REASONING_VISION_MODEL:process.env.NVIDIA_REASONING_VISION_MODEL,
        NVIDIA_MODEL:process.env.NVIDIA_MODEL,
        NVIDIA_NIM_MODEL:process.env.NVIDIA_NIM_MODEL,
        NVIDIA_STATE_TIMEOUT_MS:process.env.NVIDIA_STATE_TIMEOUT_MS||'180000',
        NVIDIA_STATE_MAX_TOKENS:process.env.NVIDIA_STATE_MAX_TOKENS,
        NVIDIA_STATE_PATCH_MAX_TOKENS:process.env.NVIDIA_STATE_PATCH_MAX_TOKENS,
        NVIDIA_STATE_ANALYSIS_MAX_TOKENS:process.env.NVIDIA_STATE_ANALYSIS_MAX_TOKENS,
        NVIDIA_STATE_ANALYSIS_BATCH_SIZE:process.env.NVIDIA_STATE_ANALYSIS_BATCH_SIZE,
        NVIDIA_STATE_RECONCILE_MAX_TOKENS:process.env.NVIDIA_STATE_RECONCILE_MAX_TOKENS,
        NVIDIA_STATE_CRITIC_MAX_TOKENS:process.env.NVIDIA_STATE_CRITIC_MAX_TOKENS,
        NVIDIA_STATE_REASONING_BUDGET:process.env.NVIDIA_STATE_REASONING_BUDGET||'512',
        NVIDIA_STATE_REASONING_EFFORT:process.env.NVIDIA_STATE_REASONING_EFFORT||'low',
        NVIDIA_STATE_TEMPERATURE:process.env.NVIDIA_STATE_TEMPERATURE,
        NVIDIA_STATE_RETRIES:process.env.NVIDIA_STATE_RETRIES||'1'
      };
      console.log(`RUN ${scenario.event.type} — ${scenario.name}`);
      const payload=await runOperationalLoop(env,{mode:'strict-ai-state-transition',persist:false,dryRun:true,previousState,event:scenario.event,
        inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true}});
      assertStrictNvidia(payload);
      const nextState=assertFullState(payload,{previousState});
      assertEventApplied(payload,scenario.event);
      validateEventEffect(scenario.event.type,previousState,nextState,scenario.event);
      assert.equal(payload.effects?.persisted,false,'A rota persistiu um cenário que deveria ser dry-run.');
      const analysis=payload.analysis||{};
      const trace=analysis.metaTrace||analysis.metadataTrace||analysis.metaUsage||[];
      const traceIds=new Set(trace.map(item=>String(item.entityId||item.id||'')));
      for(const entity of [...previousState.stages,...previousState.activities])
        assert.ok(traceIds.has(String(entity.id)),`metaTrace não cita ${entity.id}.`);
      const decisions=analysis.possibleActivities||analysis.activityDecisions||analysis.decisions||[];
      assert.ok(decisions.length>=previousState.activities.length,'Nem todas as atividades reais foram reavaliadas.');
      passed++;
      console.log(`PASS ${scenario.event.type} — ${scenario.name} — ${payload.inference.model||'modelo NVIDIA'}`);
    }catch(error){
      failed++;
      console.log(`FAIL ${scenario.event.type} — ${scenario.name}: ${safeMessage(error?.message||error)}`);
    }
  }

  const afterFingerprint=await applicationStateFingerprint();
  assert.equal(afterFingerprint,beforeFingerprint,'A bateria alterou o banco local apesar de persist:false.');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} falhos, ${skipped} ignorados; banco local inalterado.`);
  if(failed||skipped)process.exitCode=1;
}catch(error){
  console.log(`FALHA DA BATERIA: ${safeMessage(error?.message||error)}`);
  process.exitCode=1;
}finally{
  persistence.db?.close?.();
}
