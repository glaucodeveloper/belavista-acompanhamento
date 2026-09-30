const DEFAULT_WORKER_URL='https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';

function validWorkerUrl(value){
  const text=String(value||'').trim();
  if(!text||/SEU-WORKER|YOUR-WORKER|example\.com/i.test(text))return DEFAULT_WORKER_URL;
  return text.replace(/\/+$/,'');
}

function validToken(value){
  const text=String(value||'').trim();
  if(!text||/^<.*>$/.test(text)||/token vigente|YOUR_TOKEN/i.test(text))return '';
  return text;
}

function formatBRLFromCents(value){
  const cents=Number(value||0);
  return (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function conversationalCash(cash){
  if(!cash)return null;
  return {
    current:formatBRLFromCents(cash.currentCents),
    committed:formatBRLFromCents(cash.committedCents),
    reserve:formatBRLFromCents(cash.reserveCents),
    free:formatBRLFromCents(cash.freeCents),
    availableForNewDecisions:formatBRLFromCents(cash.availableForNewDecisionsCents)
  };
}

function conversationalPlannedEvent(event){
  if(!event)return null;
  const p=event.payload||{};
  const out={type:event.type,id:event.id||null};

  if(event.type==='cash.inflow.recorded'||event.type==='cash.outflow.recorded'){
    out.amount=formatBRLFromCents(p.amountCents);
    out.description=p.description||null;
  }

  if(event.type==='purchase.invoice.recorded'){
    out.purchaseId=p.purchaseId||null;
    out.amount=formatBRLFromCents(p.document?.amountCents??p.amountCents??p.paidAmountCents);
    out.paymentStatus=p.paymentStatus||null;
    out.items=(p.items||[]).map(item=>({
      materialId:item.materialId,quantity:item.quantity,received:item.received!==false
    }));
  }

  if(event.type==='purchase.receipt.received'){
    out.purchaseId=p.purchaseId||null;
    out.items=(p.items||[]).map(item=>({
      materialId:item.materialId,quantity:item.quantity
    }));
  }

  if(event.type.startsWith('service.')){
    out.activityId=p.activityId||null;
    out.assignmentId=p.assignmentId||null;
    if(p.progressPercent!=null)out.progressPercent=p.progressPercent;
    if(p.evidenceId)out.evidenceId=p.evidenceId;
  }

  return out;
}

function previousConversationRecurrenceV16(previousConversation,systemInference){
  if(!previousConversation)return null;
  const previous=typeof previousConversation==='string'?{text:previousConversation}:previousConversation;
  const currentActivityId=systemInference?.nextActivityId??null;
  const currentAction=systemInference?.nextAction??null;
  const hasIdentity=previous?.nextActivityId!=null&&previous?.nextAction!=null;
  const sameDecision=Boolean(
    hasIdentity&&
    String(previous.nextActivityId)===String(currentActivityId??'')&&
    String(previous.nextAction)===String(currentAction??'')
  );
  return {
    role:'previous_narration_only',
    authority:'none',
    previousStepIndex:previous?.stepIndex??null,
    previousEventId:previous?.eventId??null,
    previousActivityId:previous?.nextActivityId??null,
    previousAction:previous?.nextAction??null,
    currentActivityId,
    currentAction,
    sameDecision,
    text:sameDecision?String(previous?.text||'').slice(-1200):null,
    rule:sameDecision
      ?'Continuidade textual apenas. Evento/snapshot/decisão atuais têm precedência.'
      :'Decisão mudou: descarte integralmente a narrativa anterior.'
  };
}

export class WorkerConversationClient {
  constructor({
    baseUrl=process.env.BELAVISTA_WORKER_URL||process.env.BELAVISTA_API_BASE||DEFAULT_WORKER_URL,
    token=process.env.BELAVISTA_API_TOKEN||process.env.BELAVISTA_ADMIN_ID_TOKEN||'',
    timeoutMs=Number(process.env.BELAVISTA_CONVERSATION_TIMEOUT_MS||120000)
  }={}){
    this.baseUrl=validWorkerUrl(baseUrl);
    this.token=validToken(token);
    this.timeoutMs=timeoutMs;
  }

  assertReady(){
    if(!this.token){
      throw new Error(
        'A conversa LIVE exige BELAVISTA_API_TOKEN ou BELAVISTA_ADMIN_ID_TOKEN válido. '+
        'Não use o literal <token vigente>.'
      );
    }
  }

  async askJourneyStep({snapshot,systemInference,event,step,previousConversation=null,
    plannedNextEvent=null}){
    const previousConversationForContext=previousConversationRecurrenceV16(previousConversation,systemInference);
    this.assertReady();

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),this.timeoutMs);

    try{
      const nextActivity=(snapshot.activities||[])
        .find(a=>a.id===systemInference.nextActivityId)||null;

      const cashForConversation=conversationalCash(snapshot.cash);
      const plannedNextOperation=conversationalPlannedEvent(plannedNextEvent);
      const nextActivityForConversation=nextActivity?{
        id:nextActivity.id,
        title:nextActivity.title,
        stageId:nextActivity.stageId,
        status:nextActivity.status,
        progressPercent:nextActivity.progressPercent,
        minimumFreeCash:formatBRLFromCents(nextActivity.minimumFreeCashCents),
        hardGateSatisfied:nextActivity.hardGateSatisfied,
        hardBlockers:nextActivity.hardBlockers,
        materialChecks:nextActivity.materialChecks
      }:null;

      const message=
        `Checkpoint ${step.index}/${step.total}: ${step.title}. `+
        `Evento mais recente: ${event?.type||'estado inicial'}. `+
        'Explique primeiro em que estado a obra do loteamento se encontra AGORA. '+
        'Depois informe o próximo passo operacional.';

      const context={
        scope:'whole-subdivision-work-journey',
        checkpoint:{
          index:step.index,total:step.total,id:step.id,title:step.title,
          event:event?{id:event.id,type:event.type,payload:event.payload||{}}:null
        },
        wholeWork:{
          execution:snapshot.execution,
          cash:cashForConversation,
          stages:(snapshot.stages||[]).map(stage=>({
            id:stage.id,name:stage.name,status:stage.status,
            progressPercent:stage.progressPercent,counts:stage.counts
          })),
          constraints:{
            hardBlockerCount:snapshot.constraints?.hardBlockerCount||0,
            hardBlockers:(snapshot.constraints?.hardBlockers||[]).slice(0,20),
            materialDeficits:(snapshot.constraints?.materialDeficits||[]).slice(0,20),
            pendingEvidence:(snapshot.constraints?.pendingEvidence||[]).slice(0,20)
          },
          agenda:{active:(snapshot.agenda?.active||[]).slice(0,20)}
        },
        systemInference,
        authoritativeNextStep:{
          activityId:systemInference.nextActivityId,
          activityTitle:nextActivity?.title||null,
          activity:nextActivityForConversation,
          action:systemInference.nextAction,
          actionReason:systemInference.requiredFocusAction?.reason||null,
          agendaAction:systemInference.agendaAction,
          notify:systemInference.notify,
          notifyRaw:systemInference.notifyRaw,
          plannedNextOperation
        },
        previousConversation:previousConversationForContext?String(previousConversation).slice(-1200):null
      };

      const instruction=[
        'Você é a camada conversacional da obra do loteamento.',
        'wholeWork contém os fatos atuais.',
        'systemInference contém a decisão do MiniCPM/System Model.',
        'Não invente nem substitua fatos ou decisões.',
        '',
        'Responda obrigatoriamente nesta ordem:',
        'ESTADO ATUAL DA OBRA:',
        'Explique o ponto atual da obra inteira, progresso e restrições relevantes.',
        'Explique o efeito do evento mais recente.',
        '',
        'PRÓXIMO PASSO:',
        'Explique a ação authoritativeNextStep, por que ela vem agora e o que libera depois.',
        '',
        'Use português brasileiro.'
      ].join('\n');

      const response=await fetch(`${this.baseUrl}/api/ai?explain=1`,{
        method:'POST',
        headers:{
          'content-type':'application/json',
          authorization:`Bearer ${this.token}`
        },
        body:JSON.stringify({
          message,
          view:'assistant',
          instruction,
          requireNvidia:true,
          requestContext:{
            scope:'whole-subdivision-work-journey',
            intent:'explain-current-work-state-and-next-step',
            readOnly:true
          },
          context
        }),
        signal:controller.signal
      });

      const raw=await response.text();
      let payload={};
      try{payload=raw?JSON.parse(raw):{};}catch{}

      if(!response.ok){
        throw new Error(`Worker conversation HTTP ${response.status}: ${raw.slice(0,1800)}`);
      }

      const text=payload?.text||payload?.summary||payload?.reply||(typeof payload==='string'?payload:'');

      return {
        payload,
        text:String(text||'').trim(),
        provider:payload?.provider||null,
        model:payload?.model||null,
        endpoint:payload?.endpoint||null
      };
    }finally{
      clearTimeout(timer);
    }
  }
}
