import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {applyFactualEvent} from '../../desktop/system-model/operational-core.mjs';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';
import {WorkerConversationClient} from '../../desktop/system-model/conversational-worker-client.mjs';
import {
  inferWholeWorkState,
  materializeWholeWorkDerivedState,
  settleCompletableStages,
  buildWholeWorkSnapshot
} from '../../desktop/system-model/whole-work-inference.mjs';
import {
  JOURNEY_ACTIVITIES,
  createWholeSubdivisionZeroState,
  buildWholeSubdivisionJourneySteps
} from './whole-work-journey-fixture.mjs';

const SYSTEM_LIVE=process.env.BELAVISTA_OPENJEV_LIVE==='1';
const CONVERSATION_LIVE=process.env.BELAVISTA_CONVERSATION_LIVE==='1';
const STRICT=process.env.BELAVISTA_JOURNEY_STRICT!=='0';

let systemClient;
let conversationClient;
let state;
let previousConversation=null;
let transcript=[];
let transcriptPath='';

const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const line=(label,value='')=>console.log(`${String(label).padEnd(31)} ${value}`);

function stageCompletedCount(value){
  return (value.stages||[]).filter(x=>/completed|complete|conclu/i.test(String(x.status||''))).length;
}

function recentAgendaFor(value,activityId){
  return [...(value.agenda||[])].reverse().find(x=>String(x.activityId||'')===String(activityId))||null;
}

function assertExpected(step,result){
  const actual=result.inference;
  const exp=step.expect||{};

  if(exp.nextActivityId){
    assert.equal(actual.nextActivityId,exp.nextActivityId,
      `${step.id}: nextActivity esperado=${exp.nextActivityId}, recebido=${actual.nextActivityId}`);
  }
  if(exp.nextAction){
    assert.equal(actual.nextAction,exp.nextAction,
      `${step.id}: nextAction esperado=${exp.nextAction}, recebido=${actual.nextAction}`);
  }
  if(exp.agendaAction){
    assert.equal(actual.agendaAction,exp.agendaAction,
      `${step.id}: agendaAction esperado=${exp.agendaAction}, recebido=${actual.agendaAction}`);
  }
  if(exp.notify===true){
    assert.equal(actual.notify,true,`${step.id}: deveria gerar notificação`);
  }
}

function printCheckpoint({step,result,conversation,stageDecisions}){
  const s=result.snapshot;
  const i=result.inference;

  console.log('');
  console.log('='.repeat(118));
  console.log(`PASSO ${String(step.index).padStart(3,'0')}/${step.total} — ${step.title}`);
  console.log('='.repeat(118));
  line('EVENTO',step.event?`${step.event.type} / ${step.event.id}`:'snapshot inicial');
  line('CAIXA ATUAL',money(s.cash?.currentCents));
  line('CAIXA LIVRE',money(s.cash?.freeCents));
  line('PROGRESSO GLOBAL',`${s.execution.overallProgressPercent}%`);
  line('ATIVIDADES CONCLUÍDAS',`${s.execution.completedActivities}/${s.execution.activityCount}`);
  line('ETAPAS CONCLUÍDAS',`${stageCompletedCount(state)}/${state.stages.length}`);
  line('HARD BLOCKERS',String(s.constraints.hardBlockerCount));
  line('MiniCPM PROJECTION',`${result.diagnostics.globalProjectionChars} chars global / ${result.diagnostics.focusProjectionChars} focus`);
  line('ESTADO DA OBRA',`${i.executionState} conf=${i.executionStateConfidence}`);
  line('RESTRIÇÃO DOMINANTE',`${i.dominantConstraint} conf=${i.dominantConstraintConfidence}`);
  line('PRÓXIMA ATIVIDADE',i.nextActivityId);
  line('PRÓXIMA AÇÃO',`${i.nextAction} conf=${i.nextActionConfidence}`);
  line('AGENDA',`${i.agendaAction} conf=${i.agendaActionConfidence}`);
  line('NOTIFICAR',`${i.notify} raw=${i.notifyRaw} guard=${i.notifyFactGuard} p=${i.notifyProbability}`);

  const agenda=recentAgendaFor(state,i.nextActivityId);
  if(agenda)line('AGENDA MATERIALIZADA',`${agenda.status} / ${agenda.id}`);
  for(const decision of stageDecisions||[]){
    line('ETAPA / SYSTEM MODEL',`${decision.stageId} => ${decision.choice}`);
  }

  console.log('-'.repeat(118));
  console.log('[NVIDIA — ESTADO ATUAL DA OBRA + PRÓXIMO PASSO]');
  console.log(conversation.text);
  console.log('='.repeat(118));
}

before(async()=>{
  if(!SYSTEM_LIVE||!CONVERSATION_LIVE)return;

  systemClient=new OpenJevClient();
  const health=await systemClient.health();
  assert.equal(health.ready,true);
  assert.match(String(health.model||''),/minicpm/i);

  conversationClient=new WorkerConversationClient();
  conversationClient.assertReady();

  state=createWholeSubdivisionZeroState();

  const dir=path.resolve('test-results');
  fs.mkdirSync(dir,{recursive:true});
  transcriptPath=path.join(
    dir,
    `whole-work-journey-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
  );
});

after(()=>{
  if(transcriptPath&&transcript.length){
    fs.writeFileSync(transcriptPath,JSON.stringify({
      generatedAt:new Date().toISOString(),
      steps:transcript
    },null,2)+'\n','utf8');
    console.log(`\n[JOURNEY REPORT] ${transcriptPath}`);
  }
});

test('OBRA COMPLETA — jornada incremental conversacional do zero à entrega',async t=>{
  if(!SYSTEM_LIVE||!CONVERSATION_LIVE){
    t.skip('Defina BELAVISTA_OPENJEV_LIVE=1 e BELAVISTA_CONVERSATION_LIVE=1');
    return;
  }

  const steps=buildWholeSubdivisionJourneySteps();

  for(const step of steps){
    let fatal=null;

    await t.test(`${String(step.index).padStart(3,'0')} — ${step.title}`,async()=>{
      const before=structuredClone(state);

      try{
        if(step.event){
          step.event.at=new Date(Date.UTC(2026,8,27,12,0,0)+step.index*60000).toISOString();
          state=applyFactualEvent(state,step.event);
        }

        let stageDecisions=[];
        if(step.event?.type==='service.execution.confirmed'){
          const settled=await settleCompletableStages({
            state,
            client:systemClient,
            event:step.event
          });
          state=settled.state;
          stageDecisions=settled.decisions;

          for(const decision of stageDecisions){
            assert.equal(decision.choice,'complete',
              `${step.id}: etapa ${decision.stageId} pronta mas não encerrada`);
          }
        }

        const result=await inferWholeWorkState({
          state,
          client:systemClient,
          event:step.event,
          demonstrationMode:true
        });

        if(STRICT)assertExpected(step,result);

        state=materializeWholeWorkDerivedState(state,{
          inference:result.inference,
          event:step.event,
          stepId:step.id
        });

        const snapshot=buildWholeWorkSnapshot(state);

        if(step.expect?.agendaAction==='schedule'){
          assert.ok(
            recentAgendaFor(state,step.expect.nextActivityId),
            `${step.id}: agenda não foi materializada`
          );
        }

        if(step.expect?.notify===true){
          assert.ok(
            (state.notifications||[]).some(n=>String(n.sourceEventId||'')===String(step.event?.id||step.id)),
            `${step.id}: notificação não foi materializada`
          );
        }

        const conversation=await conversationClient.askJourneyStep({
          snapshot,
          systemInference:result.inference,
          event:step.event,
          step,
          previousConversation,
          plannedNextEvent:steps[step.index]?.event||null
        });

        console.log('NVIDIA PROVIDER'.padEnd(32),conversation.provider||'');
        console.log('NVIDIA MODEL'.padEnd(32),conversation.model||'');
        console.log('NVIDIA ENDPOINT'.padEnd(32),conversation.endpoint||'');
        assert.equal(conversation.provider,'nvidia-api',
          `${step.id}: explicação não veio da NVIDIA real`);
        assert.match(conversation.text,/estado atual da obra/i,
          `${step.id}: NVIDIA não explicou ESTADO ATUAL DA OBRA`);
        assert.match(conversation.text,/próximo passo|proximo passo/i,
          `${step.id}: NVIDIA não explicou PRÓXIMO PASSO`);

        previousConversation={

          text:conversation.text,

          stepIndex:step.index,

          eventId:step.event?.id||null,

          nextActivityId:result.inference.nextActivityId,

          nextAction:result.inference.nextAction

        };
        transcript.push({
          step:{index:step.index,total:step.total,id:step.id,title:step.title},
          event:step.event,
          diagnostics:result.diagnostics,
          systemInference:result.inference,
          stageDecisions:stageDecisions.map(d=>({stageId:d.stageId,choice:d.choice})),
          conversation:{
            provider:conversation.provider,
            model:conversation.model,
            text:conversation.text
          }
        });

        printCheckpoint({
          step,
          result:{...result,snapshot},
          conversation,
          stageDecisions
        });
      }catch(error){
        state=before;
        fatal=error;
        throw error;
      }
    });

    if(fatal)throw fatal;
  }

  const final=buildWholeWorkSnapshot(state);
  assert.equal(final.execution.completedActivities,JOURNEY_ACTIVITIES.length);
  assert.equal(stageCompletedCount(state),state.stages.length);
  assert.equal(final.execution.overallProgressPercent,100);

  console.log('');
  console.log('#'.repeat(118));
  console.log('LOTEAMENTO COMPLETO');
  console.log('#'.repeat(118));
  line('PROGRESSO',`${final.execution.overallProgressPercent}%`);
  line('ATIVIDADES',`${final.execution.completedActivities}/${final.execution.activityCount}`);
  line('ETAPAS',`${stageCompletedCount(state)}/${state.stages.length}`);
  line('NOTIFICAÇÕES',String(state.notifications.length));
  line('AGENDA',String(state.agenda.length));
  console.log('#'.repeat(118));
});
