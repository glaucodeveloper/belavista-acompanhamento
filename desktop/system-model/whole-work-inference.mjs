import {deriveActivityFacts,deriveStageFacts} from './operational-core.mjs';

const clone=value=>structuredClone(value);
const n=value=>{
  const x=Number(value);
  return Number.isFinite(x)?x:0;
};
const pct=value=>Math.max(0,Math.min(100,n(value)));
const isCompleted=value=>/^(completed|complete|concluido|concluído)$/i.test(String(value||''));
const cut=(value,max=120)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);

function avg(values){
  const xs=values.map(n);
  return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
}

function stageProgress(state,stage){
  const rows=(state.stageSectorState||[]).filter(row=>String(row?.stageId||'')===String(stage.id));
  if(rows.length)return pct(avg(rows.map(row=>row.progress)));
  const activities=(state.activities||[]).filter(a=>String(a?.stageId||'')===String(stage.id));
  if(activities.length)return pct(avg(activities.map(a=>a.progressPercent)));
  return isCompleted(stage.status)?100:0;
}

function latestAssignment(state,activityId){
  return [...(state.serviceAssignments||[])]
    .reverse()
    .find(item=>String(item?.activityId||'')===String(activityId))||null;
}

function evidenceSummary(state,activityId){
  const rows=(state.evidence||[]).filter(e=>String(e?.activityId||'')===String(activityId));
  return {
    total:rows.length,
    pending:rows.filter(e=>/pending/i.test(String(e?.status||''))).length,
    verified:rows.filter(e=>/verified|supported|approved/i.test(String(e?.status||''))).length
  };
}

function purchaseForMaterial(state,activityId,materialId){
  const rows=(state.purchases||[]).filter(p=>
    (!p?.activityId||String(p.activityId)===String(activityId))&&
    (
      String(p?.materialId||'')===String(materialId)||
      (Array.isArray(p?.items)&&p.items.some(i=>String(i?.materialId||'')===String(materialId)))
    )
  );
  const row=rows.at(-1);
  return row?{
    id:row.id,
    status:row.status||null,
    expectedAt:row.expectedAt||null
  }:null;
}

function statusCounts(items){
  const out={completed:0,in_progress:0,planned:0,blocked:0,other:0};
  for(const item of items){
    const s=String(item?.status||'').toLowerCase();
    if(/completed|complete|conclu/.test(s))out.completed++;
    else if(/in_progress|progress|execu/.test(s))out.in_progress++;
    else if(/planned|plan|pending|aguard/.test(s))out.planned++;
    else if(/blocked|hold|bloque/.test(s))out.blocked++;
    else out.other++;
  }
  return out;
}

export function buildWholeWorkSnapshot(state){
  const activities=Array.isArray(state?.activities)?state.activities:[];
  const stages=Array.isArray(state?.stages)?state.stages:[];

  const activityFacts=Object.fromEntries(
    activities.map(activity=>[activity.id,deriveActivityFacts(state,activity)])
  );

  const stageFacts=Object.fromEntries(
    stages.map(stage=>[stage.id,deriveStageFacts(state,stage)])
  );

  const activitySummaries=activities.map(activity=>{
    const facts=activityFacts[activity.id]||{};
    const assignment=latestAssignment(state,activity.id);
    const evidence=evidenceSummary(state,activity.id);

    return {
      id:activity.id,
      stageId:activity.stageId||null,
      title:activity.title||activity.name||activity.id,
      status:activity.status||'unknown',
      progressPercent:pct(activity.progressPercent),
      minimumFreeCashCents:n(activity.minimumFreeCashCents),
      hardGateSatisfied:Boolean(facts.hardGateSatisfied),
      hardBlockers:(facts.hardBlockers||[]).map(blocker=>({
        kind:blocker.kind||'unknown',
        reason:cut(blocker.reason||blocker.message||blocker.description||'',100)
      })),
      materialChecks:(facts.materialChecks||[]).map(check=>({
        materialId:check.materialId,
        name:check.name,
        unit:check.unit,
        stock:n(check.stock),
        required:n(check.required),
        deficit:n(check.deficit),
        satisfied:Boolean(check.satisfied),
        purchase:purchaseForMaterial(state,activity.id,check.materialId)
      })),
      dependencyChecks:(facts.dependencyChecks||[]).map(dep=>({
        activityId:dep.activityId,
        status:dep.status,
        satisfied:Boolean(dep.satisfied)
      })),
      assignment:assignment?{
        id:assignment.id,
        status:assignment.status||null
      }:null,
      evidence,
      completionEvidenceSatisfied:Boolean(facts.completionEvidenceSatisfied),
      activeAgenda:(facts.activeAgenda||[]).map(item=>({
        id:item.id,status:item.status||null
      }))
    };
  });

  const stageSummaries=stages.map(stage=>{
    const acts=activitySummaries.filter(a=>String(a.stageId||'')===String(stage.id));
    return {
      id:stage.id,
      name:stage.name||stage.id,
      status:stage.status||'unknown',
      progressPercent:stageProgress(state,stage),
      mayComplete:Boolean(stageFacts[stage.id]?.mayComplete),
      counts:statusCounts(acts)
    };
  });

  const hardBlockers=activitySummaries.flatMap(a=>
    a.hardBlockers.map(blocker=>({
      stageId:a.stageId,
      activityId:a.id,
      activityTitle:a.title,
      kind:blocker.kind,
      reason:blocker.reason
    }))
  );

  const materialDeficits=activitySummaries.flatMap(a=>
    a.materialChecks.filter(check=>!check.satisfied).map(check=>({
      activityId:a.id,
      activityTitle:a.title,
      materialId:check.materialId,
      name:check.name,
      stock:check.stock,
      required:check.required,
      deficit:check.deficit,
      unit:check.unit,
      purchase:check.purchase
    }))
  );

  const overallProgress=activities.length
    ?pct(avg(activities.map(activity=>activity.progressPercent)))
    :pct(avg(stageSummaries.map(stage=>stage.progressPercent)));

  return {
    scope:'whole-subdivision-work',
    version:state?.version||null,
    project:{
      id:state?.project?.id||state?.projectId||'belavista',
      name:state?.project?.name||'Belavista'
    },
    execution:{
      overallProgressPercent:Number(overallProgress.toFixed(2)),
      stageCount:stages.length,
      activityCount:activities.length,
      completedActivities:activities.filter(a=>isCompleted(a.status)).length,
      stageCounts:statusCounts(stages),
      activityCounts:statusCounts(activities)
    },
    cash:state?.cash?{
      currentCents:n(state.cash.currentCents),
      committedCents:n(state.cash.committedCents),
      reserveCents:n(state.cash.reserveCents),
      freeCents:n(state.cash.freeCents),
      availableForNewDecisionsCents:n(state.cash.availableForNewDecisionsCents)
    }:null,
    stages:stageSummaries,
    activities:activitySummaries,
    constraints:{
      hardBlockerCount:hardBlockers.length,
      hardBlockers,
      materialDeficits,
      delayedPurchases:(state?.purchases||[]).filter(p=>/delay/i.test(String(p?.status||''))).map(p=>({
        id:p.id,
        activityId:p.activityId||null,
        materialId:p.materialId||null,
        expectedAt:p.expectedAt||null,
        status:p.status
      })),
      pendingEvidence:(state?.evidence||[]).filter(e=>/pending/i.test(String(e?.status||''))).map(e=>({
        id:e.id,
        activityId:e.activityId||null,
        status:e.status
      }))
    },
    agenda:{
      active:(state?.agenda||[]).filter(item=>!/completed|cancelled/i.test(String(item?.status||''))).map(item=>({
        id:item.id,
        activityId:item.activityId||null,
        stageId:item.stageId||null,
        status:item.status||null
      }))
    },
    notifications:{
      count:(state?.notifications||[]).length,
      recent:(state?.notifications||[]).slice(-5).map(item=>({
        activityId:item.activityId||null,
        message:cut(item.message,140)
      }))
    }
  };
}

function blockerKind(blocker){
  return cut(blocker?.kind||blocker?.type||'unknown',40);
}

function globalProjection(snapshot,event){
  return {
    event:event?{type:event.type,activityId:event.payload?.activityId||null,stageId:event.payload?.stageId||null}:null,
    progress:snapshot.execution.overallProgressPercent,
    done:`${snapshot.execution.completedActivities}/${snapshot.execution.activityCount}`,
    cashFree:snapshot.cash?.freeCents??0,
    stages:snapshot.stages.map(s=>({
      id:s.id,
      status:s.status,
      progress:s.progressPercent
    })),
    activities:snapshot.activities.map(a=>({
      id:a.id,
      stage:a.stageId,
      status:a.status,
      progress:a.progressPercent,
      gate:a.hardGateSatisfied,
      blockers:a.hardBlockers.map(blockerKind).slice(0,4),
      depsPending:a.dependencyChecks.filter(d=>!d.satisfied).map(d=>d.activityId).slice(0,4)
    })),
    deficits:snapshot.constraints.materialDeficits.slice(0,12).map(d=>({
      a:d.activityId,m:d.materialId,def:d.deficit,p:d.purchase?.status||null
    })),
    pendingEvidence:snapshot.constraints.pendingEvidence.slice(0,12).map(e=>e.activityId),
    agenda:snapshot.agenda.active.slice(0,12).map(a=>({a:a.activityId,s:a.status}))
  };
}

function focusProjection(snapshot,activityId,event){
  const a=snapshot.activities.find(item=>String(item.id)===String(activityId));
  if(!a)return null;

  return {
    event:event?{type:event.type}:null,
    cashFree:snapshot.cash?.freeCents??0,
    activity:{
      id:a.id,
      stage:a.stageId,
      status:a.status,
      progress:a.progressPercent,
      minimumFreeCashCents:a.minimumFreeCashCents,
      gate:a.hardGateSatisfied,
      blockers:a.hardBlockers.map(b=>({k:blockerKind(b),r:cut(b.reason,70)})),
      materials:a.materialChecks.map(m=>({
        id:m.materialId,
        stock:m.stock,
        required:m.required,
        deficit:m.deficit,
        satisfied:m.satisfied,
        purchase:m.purchase?.status||null
      })),
      dependencies:a.dependencyChecks,
      assignment:a.assignment?.status||null,
      evidence:a.evidence,
      completionEvidenceSatisfied:a.completionEvidenceSatisfied,
      activeAgenda:a.activeAgenda
    }
  };
}

function dependencyFrontier(snapshot){
  const incomplete=snapshot.activities.filter(a=>!isCompleted(a.status));
  const frontier=incomplete.filter(a=>
    !a.dependencyChecks.length ||
    a.dependencyChecks.every(dep=>dep.satisfied===true)
  );
  return frontier.length?frontier:incomplete;
}

function nextActivityDecisionState(snapshot,event){
  const frontier=dependencyFrontier(snapshot);
  return {
    event:event?{type:event.type}:null,
    overallProgress:snapshot.execution.overallProgressPercent,
    freeCashCents:snapshot.cash?.freeCents??0,
    candidates:frontier.map(a=>({
      id:a.id,
      title:cut(a.title,70),
      stageId:a.stageId,
      sequenceIndex:snapshot.activities.findIndex(x=>x.id===a.id),
      status:a.status,
      progress:a.progressPercent,
      hardGateSatisfied:a.hardGateSatisfied,
      blockers:a.hardBlockers.map(blockerKind).slice(0,4),
      materialDeficits:a.materialChecks
        .filter(m=>!m.satisfied)
        .map(m=>({materialId:m.materialId,deficit:m.deficit,purchase:m.purchase?.status||null}))
        .slice(0,6)
    }))
  };
}

function nextActivityQuestion(snapshot){
  const frontier=dependencyFrontier(snapshot);
  const criteria=Object.fromEntries([
    ...frontier.map(a=>[
      a.id,
      cut(a.title,65)+
        '; sequenceIndex='+snapshot.activities.findIndex(x=>x.id===a.id)+
        '; status='+a.status+
        '; gate='+a.hardGateSatisfied+
        '; blockers='+(a.hardBlockers.map(blockerKind).join(',')||'none')
    ]),
    ['none','Nenhuma atividade incompleta deve receber foco operacional agora']
  ]);

  return {
    type:'choice',
    instructions:
      'Escolha a ÚNICA atividade que deve receber o próximo foco operacional. '+
      'Somente candidatos cuja cadeia de dependências já foi satisfeita aparecem aqui. '+
      'Uma atividade bloqueada apenas por caixa ou material continua sendo um foco válido, pois o próximo passo pode ser financiar/comprar. '+
      'Quando houver mais de um candidato equivalente, respeite sequenceIndex menor como ordem construtiva planejada. '+
      'Não escolha none enquanto houver candidato incompleto válido.',
    criteria
  };
}

function globalQuestions(snapshot,{event=null,demonstrationMode=false}={}){
  const questions={
    'work:execution_state':{
      type:'choice',
      instructions:
        `Obra inteira: progresso=${snapshot.execution.overallProgressPercent}%; `+
        `concluídas=${snapshot.execution.completedActivities}/${snapshot.execution.activityCount}; `+
        `hardBlockers=${snapshot.constraints.hardBlockerCount}. Classifique o estado global atual.`,
      criteria:{
        not_started:'Nenhuma atividade física foi iniciada',
        partially_executing:'Parte está em execução e parte ainda aguarda recursos/dependências',
        executing:'Diversas frentes estão executando normalmente',
        finishing:'Predominam atividades concluídas e restam poucas frentes',
        completed:'Todas as atividades da obra estão concluídas',
        globally_blocked:'Nenhuma frente útil pode avançar agora'
      }
    },
    'work:attention_level':{
      type:'choice',
      instructions:'Avalie a atenção global a partir de caixa, blockers, materiais, dependências e evidências.',
      criteria:{
        normal:'Sem restrição operacional relevante',
        attention:'Há restrições localizadas que exigem acompanhamento',
        critical:'Há restrição com impacto global ou em várias frentes'
      }
    },
    'work:dominant_constraint':{
      type:'choice',
      instructions:'Escolha a restrição dominante atual da obra inteira.',
      criteria:{
        none:'Nenhuma restrição dominante',
        funding:'Caixa/financiamento',
        material:'Material faltante ou não recebido',
        personnel:'Equipe/pessoal',
        dependency:'Dependências técnicas',
        evidence:'Evidência/verificação',
        schedule:'Agenda/reprogramação',
        mixed:'Múltiplas restrições sem uma única dominante'
      }
    },
    'work:can_advance':{
      type:'noul',
      instructions:'Existe pelo menos uma frente útil que pode avançar agora sem violar hard gates?',
      criteria:{true:'Sim',false:'Não'}
    },
    'work:notify':{
      type:'noul',
      instructions:demonstrationMode
        ?`Checkpoint demonstrativo após ${event?.type||'snapshot inicial'}. A mudança deve gerar notificação operacional?`
        :'A mudança atual deve gerar notificação operacional?',
      criteria:{true:'Sim',false:'Não'}
    }
  };

  return questions;
}

function actionLabel(action){
  return {
    fund:'Adicionar/provisionar caixa para liberar a atividade',
    purchase:'Registrar a compra do material faltante',
    receive:'Registrar o recebimento físico do material já comprado',
    assign:'Atribuir equipe/responsável à atividade',
    accept_assignment:'Registrar o aceite da atribuição',
    start:'Iniciar a execução física',
    report:'Registrar avanço físico da execução',
    submit_evidence:'Enviar evidência/foto da execução',
    verify_evidence:'Verificar a evidência/foto pendente',
    confirm:'Confirmar a conclusão física da atividade',
    hold:'Manter a atividade parada'
  }[action]||String(action);
}

function deriveRequiredFocusAction(focusState){
  const a=focusState?.activity;
  if(!a)return {action:'hold',reason:'atividade foco ausente'};

  if(Number(focusState.cashFree)<Number(a.minimumFreeCashCents||0)){
    return {
      action:'fund',
      reason:'caixa livre abaixo do mínimo factual da atividade'
    };
  }

  const missing=(a.materials||[]).filter(m=>!m.satisfied);
  if(missing.length){
    const first=missing[0];
    const purchaseStatus=String(first.purchase?.status||first.purchase||'').toLowerCase();
    const purchased=/recorded|ordered|paid|approved|in_transit|received/.test(purchaseStatus);
    return purchased
      ?{action:'receive',reason:'material continua em falta, mas já existe compra registrada'}
      :{action:'purchase',reason:'material continua em falta e ainda não existe compra registrada'};
  }

  const assignment=String(a.assignment||'').toLowerCase();
  const evidence=a.evidence||{total:0,pending:0,verified:0};

  if(Number(evidence.pending)>0){
    return {action:'verify_evidence',reason:'há evidência enviada aguardando verificação'};
  }

  if(Number(evidence.verified)>0 && !/completed|complete|conclu/i.test(String(a.status||''))){
    return {action:'confirm',reason:'há evidência verificada e a atividade ainda não foi confirmada como concluída'};
  }

  if(Number(a.progress)>=90 && Number(evidence.total)===0){
    return {action:'submit_evidence',reason:'execução foi relatada em nível alto e ainda falta evidência'};
  }

  if(!assignment){
    return {action:'assign',reason:'recursos factuais estão disponíveis e ainda não existe assignment'};
  }

  if(assignment==='assigned'){
    return {action:'accept_assignment',reason:'assignment foi criado e ainda aguarda aceite'};
  }

  if(assignment==='accepted'){
    return {action:'start',reason:'assignment foi aceito e a execução física ainda precisa iniciar'};
  }

  if(
    assignment==='in_progress' ||
    assignment==='reported' ||
    /in_progress|progress|execu/i.test(String(a.status||''))
  ){
    if(Number(a.progress)<90){
      return {action:'report',reason:'atividade está em execução e precisa registrar avanço físico'};
    }
    if(Number(evidence.total)===0){
      return {action:'submit_evidence',reason:'atividade avançou e precisa de evidência para o fechamento'};
    }
  }

  if(a.hardGateSatisfied===false){
    return {action:'hold',reason:'há hard gate factual ainda não resolvido'};
  }

  return {action:'assign',reason:'atividade está factualmente liberada e precisa de responsável'};
}

function focusQuestions(focusState,required){
  const action=required.action;
  const actionCriteria={
    [action]:actionLabel(action),
    hold:'Não executar a ação indicada pelos fatos e manter a atividade parada'
  };

  let agendaCriteria;
  let agendaInstructions;

  if(['fund','purchase','receive','hold'].includes(action)){
    agendaCriteria={
      none:'Não criar agenda enquanto o recurso factual ainda não foi liberado',
      schedule:'Criar agenda agora apesar do recurso factual ainda pendente'
    };
    agendaInstructions=
      'A atividade ainda depende de recurso factual. Agenda operacional de execução só deve existir depois da liberação do recurso.';
  }else if((focusState.activity.activeAgenda||[]).length){
    agendaCriteria={
      keep:'Manter a agenda ativa existente',
      reschedule:'Reprogramar a agenda existente'
    };
    agendaInstructions=
      'A atividade já tem agenda ativa. Decida se os fatos atuais permitem mantê-la ou exigem reprogramação.';
  }else{
    agendaCriteria={
      schedule:'Criar agenda para a atividade que ficou executável',
      none:'Não criar agenda mesmo com a atividade operacionalmente liberada'
    };
    agendaInstructions=
      'A atividade está na fase operacional e não possui agenda ativa. Decida se deve ser programada agora.';
  }

  return {
    'work:next_action':{
      type:'choice',
      instructions:
        'A análise factual determinou requiredAction='+action+
        ' porque '+required.reason+'. '+
        'Escolha a ação coerente com esses fatos. Não pule etapas e não trate compra como recebimento.',
      criteria:actionCriteria
    },
    'work:agenda_action':{
      type:'choice',
      instructions:agendaInstructions,
      criteria:agendaCriteria
    }
  };
}

function answerChoice(response,id){
  return response?.answers?.[id]?.choice||null;
}

function answerConfidence(response,id){
  return response?.answers?.[id]?.confidence??null;
}

function answerNoul(response,id){
  return response?.answers?.[id]?.noul;
}

function lifecyclePhaseGuardV16(event){
  const type=String(event?.type||'');
  const payload=event?.payload||{};
  const exact={
    'service.assignment.created':{action:'accept_assignment',reason:'atribuição já criada; não regressar para assign'},
    'service.assignment.accepted':{action:'start',reason:'atribuição já aceita; próxima fase é iniciar execução'},
    'service.execution.started':{action:'report',reason:'execução já iniciada; próxima fase é reportar andamento'},
    'service.execution.reported':{action:'submit_evidence',reason:'andamento já reportado; próxima fase é submeter evidência'},
    'service.evidence.image.submitted':{action:'verify_evidence',reason:'evidência já submetida; próxima fase é verificá-la'}
  };
  if(exact[type])return exact[type];
  if(type==='service.evidence.image.verified'){
    const verdict=String(payload.verdict||payload.status||'').toLowerCase();
    if(!verdict||/supported|verified|approved|confirm|ok|valid/.test(verdict)){
      return {action:'confirm',reason:'evidência verificada; próxima fase é confirmação física'};
    }
    return {action:'submit_evidence',reason:'evidência rejeitada/não confirmada; exige nova submissão'};
  }
  return null;
}

export async function inferWholeWorkState({state,client,event=null,demonstrationMode=false}){
  const snapshot=buildWholeWorkSnapshot(state);
  const globalState=globalProjection(snapshot,event);
  const globalStateChars=JSON.stringify(globalState).length;

  if(globalStateChars>5200){
    throw new Error('MiniCPM global projection grande demais para contexto local: '+globalStateChars+' chars');
  }

  const globalQs=globalQuestions(snapshot,{event,demonstrationMode});
  const globalResponse=await client.decide({
    state:{
      policy:[
        'Fatos fornecidos são autoridade.',
        'Não invente caixa, estoque, progresso ou conclusão.',
        'Avalie a obra inteira.'
      ],
      work:globalState
    },
    questions:globalQs
  });

  const done=snapshot.execution.completedActivities>=snapshot.execution.activityCount;
  const anyPhysicalProgress=snapshot.activities.some(a=>
    Number(a.progressPercent)>0 ||
    /in_progress|completed|complete|conclu/i.test(String(a.status||''))
  );

  const rawExecutionState=answerChoice(globalResponse,'work:execution_state');
  const executionState=done
    ?'completed'
    :(!anyPhysicalProgress?'not_started':rawExecutionState);

  let nextActivityId='none';
  let nextActivityConfidence=done?1:null;
  let nextActivityResponse=null;
  let nextActivityState=null;

  if(!done){
    nextActivityState=nextActivityDecisionState(snapshot,event);
    const candidateCount=nextActivityState.candidates.length;

    if(candidateCount<1){
      throw new Error('Nenhuma atividade incompleta disponível para escolha de próximo foco.');
    }

    const stateChars=JSON.stringify(nextActivityState).length;
    if(stateChars>3200){
      throw new Error('MiniCPM next-activity projection grande demais: '+stateChars+' chars');
    }

    nextActivityResponse=await client.decide({
      state:{
        policy:[
          'Escolha somente entre os candidatos fornecidos.',
          'Respeite dependências já filtradas e a ordem construtiva sequenceIndex.',
          'Falta de caixa/material não remove a atividade do foco; ela muda a próxima ação.'
        ],
        nextActivity:nextActivityState
      },
      questions:{
        'work:next_activity':nextActivityQuestion(snapshot)
      }
    });

    nextActivityId=answerChoice(nextActivityResponse,'work:next_activity');
    nextActivityConfidence=answerConfidence(nextActivityResponse,'work:next_activity');

    if(!nextActivityId){
      throw new Error(
        'MiniCPM não retornou work:next_activity. answers='+
        JSON.stringify(Object.keys(nextActivityResponse?.answers||{}))
      );
    }
  }

  let focusResponse=null;
  let focusState=null;
  const lifecyclePhaseV16=lifecyclePhaseGuardV16(event);
  let stateNextActionV16='none';
  let nextAction=lifecyclePhaseV16?.action||stateNextActionV16;
  let nextActionRaw='none';
  let stateNextActionFactGuardV16=false;
  const lifecyclePhaseFactGuardV16=Boolean(lifecyclePhaseV16&&String(nextActionRaw??'')!==String(nextAction??''));
  let nextActionFactGuard=Boolean(stateNextActionFactGuardV16||lifecyclePhaseFactGuardV16);
  let requiredFocusAction={action:'none',reason:'obra concluída'};
  let agendaAction='none';
  let agendaActionRaw='none';
  let agendaActionFactGuard=false;

  if(nextActivityId&&nextActivityId!=='none'){
    focusState=focusProjection(snapshot,nextActivityId,event);

    if(!focusState){
      throw new Error('Atividade foco não encontrada no snapshot: '+nextActivityId);
    }

    const focusChars=JSON.stringify(focusState).length;
    if(focusChars>3600){
      throw new Error('MiniCPM focus projection grande demais: '+focusChars+' chars');
    }

    const required=deriveRequiredFocusAction(focusState);
    const qs=focusQuestions(focusState,required);

    focusResponse=await client.decide({
      state:{
        policy:[
          'Fatos fornecidos são autoridade.',
          'A requiredAction foi derivada de invariantes factuais e deve ser respeitada.',
          'Compra não é recebimento.',
          'Assignment/nota/relato não é conclusão física.',
          'Evidência pending ainda precisa ser verificada.'
        ],
        requiredAction:required,
        focus:focusState
      },
      questions:qs,
      method:'generation'
    });

    const rawNextAction=answerChoice(focusResponse,'work:next_action');
    const rawAgendaAction=answerChoice(focusResponse,'work:agenda_action');

    if(!rawNextAction){
      throw new Error(
        'MiniCPM não retornou work:next_action. answers='+
        JSON.stringify(Object.keys(focusResponse?.answers||{}))
      );
    }

    if(!rawAgendaAction){
      throw new Error(
        'MiniCPM não retornou work:agenda_action. answers='+
        JSON.stringify(Object.keys(focusResponse?.answers||{}))
      );
    }

    nextActionRaw=rawNextAction;
    agendaActionRaw=rawAgendaAction;
    requiredFocusAction=required;

    nextAction=required.action;
    nextActionFactGuard=rawNextAction!==required.action;

    const mustHaveNoAgenda=['fund','purchase','receive','hold'].includes(required.action);
    agendaAction=mustHaveNoAgenda?'none':rawAgendaAction;
    agendaActionFactGuard=mustHaveNoAgenda&&rawAgendaAction!=='none';
  }

  const canAdvanceValue=answerNoul(globalResponse,'work:can_advance');
  const notifyValue=answerNoul(globalResponse,'work:notify');

  const notifyRaw=typeof notifyValue==='number'?notifyValue>=0.5:null;
  const notificationEventTypes=new Set([
    'cash.inflow.recorded',
    'cash.outflow.recorded',
    'purchase.invoice.recorded',
    'purchase.receipt.received',
    'purchase.delivery.delayed',
    'service.assignment.created',
    'service.assignment.accepted',
    'service.execution.started',
    'service.execution.reported',
    'service.evidence.image.submitted',
    'service.evidence.image.verified',
    'service.execution.confirmed'
  ]);
  const notificationRequiredByEvent=Boolean(
    demonstrationMode && event?.type && notificationEventTypes.has(event.type)
  );
  const notify=notificationRequiredByEvent?true:notifyRaw;
  const notifyFactGuard=notificationRequiredByEvent && notifyRaw!==true;


    // LIFECYCLE FINALIZER V18
  // O MiniCPM continua produzindo nextActionRaw/state action, mas o evento factual
  // já materializado não pode regredir de fase antes da publicação do resultado.
  if(lifecyclePhaseV16?.action){
    const nextActionBeforeLifecycleFinalizerV18=nextAction;
    nextAction=lifecyclePhaseV16.action;
    nextActionFactGuard=Boolean(
      nextActionFactGuard ||
      String(nextActionRaw??nextActionBeforeLifecycleFinalizerV18??'')!==String(nextAction)
    );
  }

return {
    snapshot,
    response:{
      model:globalResponse.model||nextActivityResponse?.model||focusResponse?.model||null,
      global:globalResponse,
      nextActivity:nextActivityResponse,
      focus:focusResponse
    },
    diagnostics:{
      globalProjectionChars:globalStateChars,
      nextActivityProjectionChars:nextActivityState?JSON.stringify(nextActivityState).length:0,
      nextActivityCandidateCount:nextActivityState?.candidates?.length||0,
      focusProjectionChars:focusState?JSON.stringify(focusState).length:0,
      globalQuestionCount:Object.keys(globalQs).length,
      nextActivityQuestionCount:nextActivityResponse?1:0,
      focusQuestionCount:focusResponse?2:0
    },
    inference:{
      executionState,
      executionStateRaw:rawExecutionState,
      executionStateFactGuard:executionState!==rawExecutionState,
      attentionLevel:answerChoice(globalResponse,'work:attention_level'),
      attentionConfidence:answerConfidence(globalResponse,'work:attention_level'),
      dominantConstraint:answerChoice(globalResponse,'work:dominant_constraint'),
      dominantConstraintConfidence:answerConfidence(globalResponse,'work:dominant_constraint'),
      canAdvance:typeof canAdvanceValue==='number'?canAdvanceValue>=0.5:null,
      canAdvanceProbability:canAdvanceValue??null,
      nextActivityId,
      nextActivityConfidence,
      nextAction,
      nextActionRaw,
      nextActionFactGuard,
      requiredFocusAction:lifecyclePhaseV16||requiredFocusAction,
      nextActionConfidence:done?1:answerConfidence(focusResponse,'work:next_action'),
      agendaAction,
      agendaActionRaw,
      agendaActionFactGuard,
      agendaActionConfidence:done?1:answerConfidence(focusResponse,'work:agenda_action'),
      notify,
      notifyRaw,
      notifyFactGuard,
      notifyReason:notificationRequiredByEvent
        ?'checkpoint operacional auditável exige notificação'
        :'decisão semântica do MiniCPM',
      notifyProbability:notifyValue??null,
      model:globalResponse.model||nextActivityResponse?.model||focusResponse?.model||null,
      clientMeta:{
        global:globalResponse.clientMeta||null,
        nextActivity:nextActivityResponse?.clientMeta||null,
        focus:focusResponse?.clientMeta||null
      }
    }
  };
}

export function materializeWholeWorkDerivedState(state,{inference,event,stepId}){
  const next=clone(state);
  if(!Array.isArray(next.agenda))next.agenda=[];
  if(!Array.isArray(next.notifications))next.notifications=[];

  const activityId=inference.nextActivityId&&inference.nextActivityId!=='none'
    ?inference.nextActivityId
    :null;

  if(event?.type==='service.execution.confirmed'){
    const completedActivityId=event.payload?.activityId;
    for(const item of next.agenda){
      if(
        String(item.activityId||'')===String(completedActivityId||'')&&
        !/cancelled/i.test(String(item.status||''))
      ){
        item.status='completed';
        item.completedAt=event.at||new Date().toISOString();
      }
    }
  }

  if(activityId){
    const activity=(next.activities||[]).find(a=>String(a.id)===String(activityId));
    const existing=next.agenda.find(item=>
      String(item.activityId||'')===String(activityId)&&
      !/completed|cancelled/i.test(String(item.status||''))
    );

    if(inference.agendaAction==='schedule'&&!existing){
      next.agenda.push({
        id:`journey-agenda-${stepId}-${activityId}`,
        activityId,
        stageId:activity?.stageId||null,
        localityId:activity?.localityId||null,
        status:'proposed',
        source:'whole-work-system-model',
        sourceEventId:event?.id||stepId
      });
    }else if(inference.agendaAction==='reschedule'&&existing){
      existing.status='needs_reschedule';
      existing.sourceEventId=event?.id||stepId;
    }
  }

  if(inference.notify===true){
    next.notifications.push({
      id:`journey-notification-${stepId}`,
      status:'unread',
      destination:'operations',
      activityId,
      source:'whole-work-system-model',
      sourceEventId:event?.id||stepId,
      message:
        `Obra=${inference.executionState}; foco=${activityId||'nenhum'}; `+
        `ação=${inference.nextAction}; agenda=${inference.agendaAction}; `+
        `restrição=${inference.dominantConstraint}`
    });
  }

  next.wholeWorkInference={
    ...inference,
    sourceEventId:event?.id||stepId,
    at:new Date().toISOString()
  };

  return next;
}

export async function settleCompletableStages({state,client,event=null}){
  const next=clone(state);
  if(!Array.isArray(next.stageSectorState))next.stageSectorState=[];
  const decisions=[];

  for(const stage of next.stages||[]){
    if(isCompleted(stage.status))continue;

    const facts=deriveStageFacts(next,stage);
    if(!facts.mayComplete)continue;

    const id=`stage:${stage.id}:completion`;
    const response=await client.decide({
      state:{
        event:event?{type:event.type}:null,
        stage:{
          id:stage.id,
          name:stage.name||stage.id,
          mayComplete:true,
          activities:facts.activityStates
        }
      },
      questions:{
        [id]:{
          type:'choice',
          instructions:'Todas as atividades e evidências obrigatórias desta etapa estão completas. Decida o fechamento da etapa.',
          criteria:{
            complete:'Fechar a etapa agora',
            hold:'Manter aberta apesar dos fatos completos'
          }
        }
      }
    });

    const choice=response.answers?.[id]?.choice||'hold';
    decisions.push({stageId:stage.id,choice,response});

    if(choice==='complete'){
      stage.status='completed';
      const rows=next.stageSectorState.filter(row=>String(row.stageId||'')===String(stage.id));
      if(rows.length){
        for(const row of rows){
          row.progress=100;
          row.complete=true;
        }
      }else{
        next.stageSectorState.push({
          stageId:stage.id,
          localityId:null,
          progress:100,
          complete:true
        });
      }
    }
  }

  return {state:next,decisions};
}
