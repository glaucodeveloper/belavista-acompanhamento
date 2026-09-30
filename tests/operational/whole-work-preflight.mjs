import assert from 'node:assert/strict';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';
import {WorkerConversationClient} from '../../desktop/system-model/conversational-worker-client.mjs';
import {inferWholeWorkState} from '../../desktop/system-model/whole-work-inference.mjs';
import {createWholeSubdivisionZeroState,buildWholeSubdivisionJourneySteps} from './whole-work-journey-fixture.mjs';

try{
  const openjev=new OpenJevClient();
  const health=await openjev.health();

  assert.equal(health.ready,true,'OpenJEV não está ready.');
  assert.match(String(health.model||''),/minicpm/i);

  const state=createWholeSubdivisionZeroState();
  const inference=await inferWholeWorkState({
    state,
    client:openjev,
    event:null,
    demonstrationMode:true
  });

  console.log('[PREFLIGHT MiniCPM]');
  console.log(JSON.stringify({
    model:health.model,
    globalProjectionChars:inference.diagnostics.globalProjectionChars,
    nextActivityProjectionChars:inference.diagnostics.nextActivityProjectionChars,
    nextActivityCandidateCount:inference.diagnostics.nextActivityCandidateCount,
    focusProjectionChars:inference.diagnostics.focusProjectionChars,
    executionStateRaw:inference.inference.executionStateRaw,
    executionState:inference.inference.executionState,
    executionStateFactGuard:inference.inference.executionStateFactGuard,
    nextActivityId:inference.inference.nextActivityId,
    requiredFocusAction:inference.inference.requiredFocusAction,
    nextActionRaw:inference.inference.nextActionRaw,
    nextAction:inference.inference.nextAction,
    nextActionFactGuard:inference.inference.nextActionFactGuard,
    agendaActionRaw:inference.inference.agendaActionRaw,
    agendaAction:inference.inference.agendaAction,
    agendaActionFactGuard:inference.inference.agendaActionFactGuard
  },null,2));

  assert.equal(inference.inference.executionState,'not_started');
  assert.equal(inference.inference.nextActivityId,'topografia-mobilizacao');
  assert.equal(inference.inference.nextAction,'fund');
  assert.equal(inference.inference.agendaAction,'none');

  if(process.env.BELAVISTA_CONVERSATION_LIVE==='1'){
    const client=new WorkerConversationClient();
    client.assertReady();

    const journeySteps=buildWholeSubdivisionJourneySteps();
    const first=journeySteps[0];
    const conversation=await client.askJourneyStep({
      snapshot:inference.snapshot,
      systemInference:inference.inference,
      event:null,
      step:first,
      plannedNextEvent:journeySteps[1]?.event||null
    });

    console.log('\n[PREFLIGHT NVIDIA]');
    console.log('Worker: '+client.baseUrl);
    console.log('Provider: '+conversation.provider);
    console.log(conversation.text);

    assert.equal(conversation.provider,'nvidia-api');
    assert.match(conversation.text,/estado atual da obra/i);
    assert.match(conversation.text,/próximo passo|proximo passo/i);
  }

  console.log('\n[OK] preflight concluído.');
}catch(error){
  console.error('\n[PREFLIGHT FAIL]',error?.stack||error);
  process.exitCode=1;
}
