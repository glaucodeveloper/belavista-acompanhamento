const clone=value=>structuredClone(value);

function ensureArray(state,key){
  if(!Array.isArray(state[key]))state[key]=[];
  return state[key];
}
function upsert(list,item,key='id'){
  const id=item?.[key];
  if(id==null){list.push(item);return item;}
  const i=list.findIndex(x=>String(x?.[key])===String(id));
  if(i>=0)list[i]={...list[i],...item}; else list.push(item);
  return i>=0?list[i]:item;
}
function byId(list,id){return (Array.isArray(list)?list:[]).find(x=>String(x?.id)===String(id));}
function num(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function recomputeCash(cash={}){
  const next={...cash};
  next.currentCents=num(next.currentCents); next.committedCents=num(next.committedCents); next.reserveCents=num(next.reserveCents);
  next.freeCents=next.currentCents-next.committedCents-next.reserveCents;
  next.availableForNewDecisionsCents=Math.max(0,next.freeCents);
  next.inflows30dCents=num(next.inflows30dCents); next.outflows30dCents=num(next.outflows30dCents);
  if(!Array.isArray(next.ledger))next.ledger=[];
  return next;
}
function pushLedger(state,event,{kind,amountCents,description}){
  state.cash=recomputeCash(state.cash);
  upsert(state.cash.ledger,{id:`ledger-${event.id}`,eventId:event.id,kind,amountCents:num(amountCents),description:description||event.type,at:event.at||new Date().toISOString()});
}
function mutateMaterial(state,materialId,fn){
  const current=byId(ensureArray(state,'materials'),materialId);
  if(!current)throw new Error(`Material não encontrado: ${materialId}`);
  fn(current);
}
function applyPaidAmount(state,event,amountCents,description){
  const amount=num(amountCents); if(amount<=0)return;
  state.cash=recomputeCash(state.cash); state.cash.currentCents-=amount; state.cash.outflows30dCents+=amount;
  pushLedger(state,event,{kind:'outflow',amountCents:amount,description}); state.cash=recomputeCash(state.cash);
}
function addEvidence(state,evidence){if(evidence?.id)upsert(ensureArray(state,'evidence'),evidence);}
function stageSector(state,stageId,localityId){
  const rows=ensureArray(state,'stageSectorState');
  let row=rows.find(x=>String(x.stageId)===String(stageId)&&String(x.localityId??'')===String(localityId??''));
  if(!row){row={stageId,localityId:localityId??null,complete:false,progress:0};rows.push(row);} return row;
}

export function applyFactualEvent(previousState,event){
  if(!event?.id||!event?.type)throw new Error('event.id e event.type são obrigatórios.');
  const state=clone(previousState||{}); const applied=ensureArray(state,'appliedEventIds');
  if(applied.includes(event.id))return state;
  const p=event.payload||{}; state.lastEvent=clone(event); state.version=`${state.version||'S'}>${event.id}`;

  switch(event.type){
    case 'cash.outflow.recorded': {
      const amount=num(p.amountCents); state.cash=recomputeCash(state.cash); state.cash.currentCents-=amount; state.cash.outflows30dCents+=amount;
      pushLedger(state,event,{kind:'outflow',amountCents:amount,description:p.description}); state.cash=recomputeCash(state.cash); break;
    }
    case 'cash.inflow.recorded': {
      const amount=num(p.amountCents); state.cash=recomputeCash(state.cash); state.cash.currentCents+=amount; state.cash.inflows30dCents+=amount;
      pushLedger(state,event,{kind:'inflow',amountCents:amount,description:p.description}); state.cash=recomputeCash(state.cash); break;
    }
    case 'cash.reserve.changed': state.cash=recomputeCash(state.cash); state.cash.reserveCents=num(p.reserveCents??p.valueCents??p.amountCents); state.cash=recomputeCash(state.cash); break;
    case 'purchase.receipt.received': {
      for(const item of p.items||[])mutateMaterial(state,item.materialId,m=>{m.stock=num(m.stock)+num(item.quantity);m.receivedQuantity=num(m.receivedQuantity)+num(item.quantity);});
      if(p.purchaseId){const purchase=byId(state.purchases,p.purchaseId);if(purchase)Object.assign(purchase,{status:p.status||'received',receivedAt:event.at});}
      for(const evidence of p.evidence||[])addEvidence(state,{...evidence,kind:evidence.kind||'purchase-receipt'}); break;
    }
    case 'material.consumption.recorded': {
      for(const item of p.items||[])mutateMaterial(state,item.materialId,m=>{m.stock=num(m.stock)-num(item.quantity);m.usedQuantity=num(m.usedQuantity)+num(item.quantity);}); break;
    }
    case 'inventory.adjustment.recorded': mutateMaterial(state,p.materialId,m=>{m.stock=num(m.stock)+num(p.deltaQuantity);}); break;
    case 'purchase.delivery.delayed': {
      const purchase=byId(state.purchases,p.purchaseId); if(!purchase)throw new Error(`Compra não encontrada: ${p.purchaseId}`);
      purchase.expectedAt=p.expectedAt; purchase.status=p.status||'delayed'; break;
    }
    case 'purchase.cancelled': {
      const purchase=byId(state.purchases,p.purchaseId); if(!purchase)throw new Error(`Compra não encontrada: ${p.purchaseId}`);
      purchase.status='cancelled'; purchase.cancelReason=p.reason||''; break;
    }
    case 'purchase.invoice.recorded': {
      const document=p.document||{};
      addEvidence(state,{id:p.evidenceId||`invoice-${event.id}`,kind:'purchase-invoice',document,activityId:p.activityId||null,stageId:p.stageId||null,status:'recorded',at:event.at});
      upsert(ensureArray(state,'purchases'),{id:p.purchaseId||`purchase-${event.id}`,documentNumber:document.number||document.key||event.id,supplier:document.supplier||'',status:p.paymentStatus==='paid'?'paid':'recorded',amountCents:num(document.amountCents??p.amountCents),activityId:p.activityId||null,stageId:p.stageId||null,materialId:p.materialId||((p.items||[]).length===1?p.items[0].materialId:null),items:clone(p.items||[])});
      for(const item of p.items||[]){if(item.received===false)continue;mutateMaterial(state,item.materialId,m=>{m.stock=num(m.stock)+num(item.quantity);m.receivedQuantity=num(m.receivedQuantity)+num(item.quantity);});}
      if(p.paymentStatus==='paid'||num(p.paidAmountCents)>0)applyPaidAmount(state,event,p.paidAmountCents??document.amountCents??p.amountCents,'nota de compra');
      break;
    }
    case 'service.invoice.recorded': {
      const document=p.document||{};
      addEvidence(state,{id:p.evidenceId||`service-invoice-${event.id}`,kind:'service-invoice',document,activityId:p.activityId||null,stageId:p.stageId||null,status:'recorded',at:event.at});
      if(p.paymentStatus==='paid'||num(p.paidAmountCents)>0)applyPaidAmount(state,event,p.paidAmountCents??document.amountCents??p.amountCents,'nota de serviço');
      if(p.activityId&&p.reportedProgressPercent!=null){const activity=byId(state.activities,p.activityId);if(!activity)throw new Error(`Atividade não encontrada: ${p.activityId}`);activity.progressPercent=Math.max(num(activity.progressPercent),num(p.reportedProgressPercent));if(activity.status==='planned')activity.status='in_progress';}
      break;
    }
    case 'service.assignment.created': upsert(ensureArray(state,'serviceAssignments'),{id:p.assignmentId||`assignment-${event.id}`,activityId:p.activityId,stageId:p.stageId||null,localityId:p.localityId||null,assigneeIds:clone(p.assigneeIds||[]),status:'assigned',createdAt:event.at}); break;
    case 'service.assignment.accepted': {const assignment=byId(state.serviceAssignments,p.assignmentId);if(!assignment)throw new Error(`Assignment não encontrado: ${p.assignmentId}`);assignment.status='accepted';assignment.acceptedAt=event.at;break;}
    case 'service.execution.started': {
      const assignment=byId(state.serviceAssignments,p.assignmentId);if(assignment){assignment.status='in_progress';assignment.startedAt=event.at;}
      const activity=byId(state.activities,p.activityId||assignment?.activityId);if(activity)activity.status='in_progress';break;
    }
    case 'service.execution.reported': {
      const assignment=byId(state.serviceAssignments,p.assignmentId);if(assignment){assignment.status='reported';assignment.reportedAt=event.at;}
      const activity=byId(state.activities,p.activityId||assignment?.activityId);if(activity&&p.progressPercent!=null){activity.progressPercent=Math.max(num(activity.progressPercent),num(p.progressPercent));if(activity.status==='planned')activity.status='in_progress';}
      for(const evidence of p.evidence||[])addEvidence(state,{...evidence,activityId:p.activityId||assignment?.activityId,status:evidence.status||'pending_verification'});break;
    }
    case 'service.evidence.image.submitted': addEvidence(state,{id:p.evidenceId,kind:'image',activityId:p.activityId,assignmentId:p.assignmentId||null,uri:p.uri||null,status:'pending_verification',at:event.at}); break;
    case 'service.evidence.image.verified': {const evidence=byId(state.evidence,p.evidenceId);if(!evidence)throw new Error(`Evidência não encontrada: ${p.evidenceId}`);evidence.status=p.verdict||'verified';evidence.verifiedAt=event.at;evidence.observations=clone(p.observations||[]);break;}
    case 'service.execution.confirmed': {
      const assignment=byId(state.serviceAssignments,p.assignmentId); const activityId=p.activityId||assignment?.activityId; const evidenceIds=p.evidenceIds||[];
      if(p.requiresEvidence!==false){const valid=evidenceIds.some(id=>{const e=byId(state.evidence,id);return e&&/verified|supported|approved/i.test(String(e.status));});if(!valid)throw new Error('Serviço não pode ser confirmado sem evidência verificada.');}
      if(assignment){assignment.status='confirmed';assignment.confirmedAt=event.at;}
      const activity=byId(state.activities,activityId);if(activity){activity.status='completed';activity.progressPercent=100;}
      if(p.stageProgressPercent!=null){const row=stageSector(state,p.stageId||activity?.stageId,p.localityId||activity?.localityId);row.progress=Math.max(num(row.progress),num(p.stageProgressPercent));}
      break;
    }
    default: throw new Error(`Evento factual ainda não implementado no desktop system model: ${event.type}`);
  }
  applied.push(event.id); return state;
}


function verifiedEvidenceForActivity(state,activityId){
  return (state.evidence||[]).some(e=>
    String(e?.activityId||'')===String(activityId)&&
    /^(supported|verified|approved)$/i.test(String(e?.status||''))
  );
}

export function deriveActivityFacts(state,activity){
  const materials=Array.isArray(activity?.materials)?activity.materials:[];
  const materialChecks=materials.map(req=>{
    const material=byId(state.materials,req.materialId);
    const stock=num(material?.stock);
    const required=num(req.quantity);
    return {
      materialId:req.materialId,
      name:material?.name||req.materialId,
      unit:req.unit||material?.unit||null,
      stock,required,
      deficit:Math.max(0,required-stock),
      satisfied:stock>=required
    };
  });

  const minimumFreeCashCents=num(activity?.minimumFreeCashCents);
  const freeCents=num(state.cash?.availableForNewDecisionsCents??state.cash?.freeCents);
  const cashCheck=minimumFreeCashCents>0
    ?{freeCents,minimumFreeCashCents,satisfied:freeCents>=minimumFreeCashCents}
    :null;

  const requiredRoles=Array.isArray(activity?.requiredRoles)?activity.requiredRoles:[];
  const personnelChecks=requiredRoles.map(role=>{
    const candidates=(state.personnel||[]).filter(p=>
      String(p?.role||'').toLowerCase()===String(role).toLowerCase()&&
      p?.active!==false&&p?.available!==false&&
      (!activity?.localityId||!p?.localityId||String(p.localityId)===String(activity.localityId))
    );
    return {role,available:candidates.length>0,candidateIds:candidates.map(x=>x.id)};
  });

  const dependencyChecks=(Array.isArray(activity?.dependsOn)?activity.dependsOn:[]).map(id=>{
    const dep=byId(state.activities,id);
    return {
      activityId:id,
      status:dep?.status||'missing',
      satisfied:/^(completed|complete|concluido|concluído)$/i.test(String(dep?.status||''))
    };
  });

  const explicitBlockers=(state.blockers||[])
    .filter(b=>(!b?.activityId||String(b.activityId)===String(activity.id))&&!/^(cleared|resolved|inactive)$/i.test(String(b?.status||'active')))
    .map(b=>({kind:b.kind||'explicit',id:b.id||null,reason:b.reason||b.message||b.description||'explicit blocker'}));

  const hardBlockers=[
    ...materialChecks.filter(x=>!x.satisfied).map(x=>({kind:'material',materialId:x.materialId,reason:`${x.name}: stock ${x.stock} < required ${x.required}`})),
    ...(cashCheck&&!cashCheck.satisfied?[{kind:'cash',reason:`free cash ${cashCheck.freeCents} < minimum ${cashCheck.minimumFreeCashCents}`}]:[]),
    ...personnelChecks.filter(x=>!x.available).map(x=>({kind:'personnel',role:x.role,reason:`no available ${x.role}`})),
    ...dependencyChecks.filter(x=>!x.satisfied).map(x=>({kind:'dependency',activityId:x.activityId,reason:`dependency ${x.activityId} not completed`})),
    ...explicitBlockers
  ];

  const requiresVerifiedEvidence=
    activity?.requiresVerifiedEvidence===true||
    (Array.isArray(activity?.evidenceRequirements)&&activity.evidenceRequirements.length>0);
  const hasVerifiedEvidence=verifiedEvidenceForActivity(state,activity.id);

  const activeAgenda=(state.agenda||[]).filter(item=>
    String(item?.activityId||'')===String(activity.id)&&
    !/^(completed|cancelled)$/i.test(String(item?.status||''))
  );

  const requiredMaterialIds=new Set(materials.map(x=>String(x.materialId)));
  const delayedPurchases=(state.purchases||[]).filter(p=>
    /delay/i.test(String(p?.status||''))&&
    (!p?.materialId||requiredMaterialIds.has(String(p.materialId)))
  ).map(p=>({id:p.id,materialId:p.materialId||null,expectedAt:p.expectedAt||null,status:p.status}));

  return {
    activityId:activity.id,
    title:activity.title||activity.name||activity.id,
    lifecycleStatus:activity.status||'unknown',
    progressPercent:num(activity.progressPercent),
    materialChecks,cashCheck,personnelChecks,dependencyChecks,
    hardBlockers,
    hardGateSatisfied:hardBlockers.length===0,
    requiresVerifiedEvidence,
    hasVerifiedEvidence,
    completionEvidenceSatisfied:!requiresVerifiedEvidence||hasVerifiedEvidence,
    activeAgenda,
    delayedPurchases
  };
}

export function deriveStageFacts(state,stage){
  const activities=(state.activities||[]).filter(a=>String(a?.stageId||'')===String(stage.id));
  const activityFacts=activities.map(a=>deriveActivityFacts(state,a));
  const allActivitiesCompleted=activities.length>0&&activities.every(a=>
    /^(completed|complete|concluido|concluído)$/i.test(String(a?.status||''))
  );
  const allCompletionEvidenceSatisfied=activityFacts.every(x=>x.completionEvidenceSatisfied);
  return {
    stageId:stage.id,
    name:stage.name||stage.id,
    activityStates:activities.map(a=>({id:a.id,status:a.status,progressPercent:num(a.progressPercent)})),
    allActivitiesCompleted,
    allCompletionEvidenceSatisfied,
    mayComplete:allActivitiesCompleted&&allCompletionEvidenceSatisfied
  };
}

function operationalPolicy(event){
  return {
    eventType:event?.type||null,
    rules:[
      'Facts are already applied. Never overwrite physical or financial facts.',
      'execution_gate MUST be hold when activityFacts[activityId].hardGateSatisfied is false.',
      'execution_gate may be allow only when hardGateSatisfied is true and lifecycleStatus is not completed.',
      'Lifecycle status is factual. Assignment acceptance, invoice, or pending image never means completed.',
      'stage action complete is allowed only when stageFacts[stageId].mayComplete is true.',
      'Delayed required purchase plus active agenda means reschedule, not schedule.'
    ]
  };
}
export function compactSystemState(state,event){
  return {
    policy:operationalPolicy(event),
    version:state.version,
    event:{id:event?.id,type:event?.type,payload:event?.payload||{}},
    activityFacts:Object.fromEntries((state.activities||[]).map(a=>[a.id,deriveActivityFacts(state,a)])),
    stageFacts:Object.fromEntries((state.stages||[]).map(s=>[s.id,deriveStageFacts(state,s)])),
    cash:state.cash,
    materials:state.materials,
    purchases:state.purchases,
    personnel:state.personnel,
    activities:state.activities,
    stages:state.stages,
    agenda:state.agenda,
    blockers:state.blockers,
    evidence:state.evidence,
    serviceAssignments:state.serviceAssignments,
    stageSectorState:state.stageSectorState
  };
}

export function buildSystemQuestions(state,event){
  const questions={};
  for(const activity of state.activities||[]){
    const id=activity.id;
    const facts=deriveActivityFacts(state,activity);

    questions[`activity:${id}:execution_gate`]={
      type:'choice',
      instructions:
        `Decide whether execution of ${facts.title} may proceed now. `+
        `Read policy.rules and activityFacts["${id}"]. `+
        `hardGateSatisfied=${facts.hardGateSatisfied}. `+
        `If hardGateSatisfied=false the mandatory answer is hold. `+
        `If lifecycleStatus=completed answer hold. Otherwise, if all hard gates are satisfied, answer allow.`,
      criteria:{
        allow:'ALLOW: all hard factual gates are satisfied and execution may proceed',
        hold:'HOLD: at least one hard factual gate is unsatisfied or activity is already closed'
      }
    };

    questions[`activity:${id}:agenda`]={
      type:'choice',
      instructions:
        `Decide the agenda action for ${facts.title}. activeAgenda=${JSON.stringify(facts.activeAgenda)}; `+
        `delayedPurchases=${JSON.stringify(facts.delayedPurchases)}; hardBlockers=${JSON.stringify(facts.hardBlockers)}. `+
        `If a delayed purchase affects required material and an active agenda exists choose reschedule. `+
        `Use schedule only if there is no active agenda to preserve or change.`,
      criteria:{
        keep:'KEEP existing active agenda',
        schedule:'SCHEDULE a new agenda item',
        reschedule:'RESCHEDULE an existing agenda because operational conditions changed',
        cancel:'CANCEL the planned execution'
      }
    };

    questions[`activity:${id}:notify`]={
      type:'noul',
      instructions:`Does event ${event?.type||'current'} create new operational information that should notify someone about ${facts.title}?`,
      criteria:{
        true:'Yes, there is a relevant operational change',
        false:'No new notification is necessary'
      }
    };
  }

  for(const stage of state.stages||[]){
    const facts=deriveStageFacts(state,stage);
    questions[`stage:${stage.id}:action`]={
      type:'choice',
      instructions:
        `Decide stage action for ${facts.name}. stageFacts["${stage.id}"].mayComplete=${facts.mayComplete}. `+
        `Never choose complete when mayComplete=false. Choose continue if valid work remains, hold if work must stop, `+
        `unlock_dependents only when dependencies may be released, and complete only when mayComplete=true.`,
      criteria:{
        continue:'CONTINUE stage work',
        hold:'HOLD stage work',
        unlock_dependents:'UNLOCK_DEPENDENTS without declaring stage complete',
        complete:'COMPLETE because all required activities/evidence are done'
      }
    };
  }
  return questions;
}

function answerChoice(answers,id,fallback){return String(answers?.[id]?.choice||fallback);}
function answerYes(answers,id){
  const a=answers?.[id];
  if(typeof a?.noul==='number')return a.noul>=0.5;
  if(typeof a?.choice==='string')return /true|yes|sim|notify/i.test(a.choice);
  return false;
}
function relatedAgenda(state,activityId){
  return (state.agenda||[]).find(item=>String(item.activityId)===String(activityId)&&!/completed|cancelled/i.test(String(item.status||'')));
}

export function reconcileSystemAnswers(factualState,event,response){
  const state=clone(factualState);
  const answers=response?.answers||{};
  ensureArray(state,'agenda');ensureArray(state,'notifications');ensureArray(state,'blockers');ensureArray(state,'stageSectorState');
  if(!Array.isArray(state.systemWarnings))state.systemWarnings=[];

  for(const activity of state.activities||[]){
    const facts=deriveActivityFacts(factualState,activity);
    const modelGate=answerChoice(answers,`activity:${activity.id}:execution_gate`,'hold');
    const completed=/^(completed|complete|concluido|concluído)$/i.test(String(facts.lifecycleStatus));
    const effectiveGate=completed?'hold':(facts.hardGateSatisfied?modelGate:'hold');

    activity.systemDecision={
      executionGate:effectiveGate,
      modelExecutionGate:modelGate,
      hardGateSatisfied:facts.hardGateSatisfied,
      hardBlockers:clone(facts.hardBlockers),
      sourceEventId:event.id
    };

    if(modelGate!==effectiveGate){
      state.systemWarnings.push({
        id:`warning-gate-${activity.id}-${event.id}`,
        kind:'model-hard-gate-disagreement',
        activityId:activity.id,
        modelDecision:modelGate,
        enforcedDecision:effectiveGate,
        hardBlockers:clone(facts.hardBlockers)
      });
    }

    const blockerId=`system-${activity.id}`;
    if(effectiveGate==='hold'&&!completed){
      upsert(state.blockers,{id:blockerId,activityId:activity.id,kind:'system-model',status:'active',reasons:clone(facts.hardBlockers),sourceEventId:event.id});
    }else{
      const blocker=byId(state.blockers,blockerId);
      if(blocker)blocker.status='cleared';
    }

    const agendaAction=answerChoice(answers,`activity:${activity.id}:agenda`,'keep');
    const agenda=relatedAgenda(state,activity.id);
    if(agendaAction==='schedule'&&!agenda){
      upsert(state.agenda,{id:`agenda-${activity.id}-${event.id}`,activityId:activity.id,stageId:activity.stageId||null,status:'proposed',source:'system-model',sourceEventId:event.id});
    }else if(agendaAction==='reschedule'){
      if(agenda){agenda.status='needs_reschedule';agenda.sourceEventId=event.id;}
      else upsert(state.agenda,{id:`agenda-${activity.id}-${event.id}`,activityId:activity.id,stageId:activity.stageId||null,status:'needs_reschedule',source:'system-model',sourceEventId:event.id});
    }else if(agendaAction==='cancel'&&agenda){
      agenda.status='cancelled';agenda.sourceEventId=event.id;
    }

    if(answerYes(answers,`activity:${activity.id}:notify`)){
      upsert(state.notifications,{id:`notification-${activity.id}-${event.id}`,activityId:activity.id,status:'unread',destination:'operations',message:`${activity.title||activity.id}: reavaliada após ${event.type}`,source:'system-model',sourceEventId:event.id});
    }
  }

  for(const stage of state.stages||[]){
    const facts=deriveStageFacts(factualState,stage);
    const modelAction=answerChoice(answers,`stage:${stage.id}:action`,'hold');
    let effectiveAction=modelAction;
    if(modelAction==='complete'&&!facts.mayComplete){
      effectiveAction=facts.activityStates.some(x=>/in_progress/i.test(String(x.status)))?'continue':'hold';
      state.systemWarnings.push({id:`warning-stage-${stage.id}-${event.id}`,kind:'model-stage-completion-disagreement',stageId:stage.id,modelDecision:modelAction,enforcedDecision:effectiveAction});
    }

    const rows=(state.stageSectorState||[]).filter(x=>String(x.stageId)===String(stage.id));
    if(effectiveAction==='complete'&&facts.mayComplete){
      if(rows.length)for(const row of rows){row.complete=true;row.progress=100;}
      else {const row=stageSector(state,stage.id,null);row.complete=true;row.progress=100;}
      stage.status='completed';
    }else if(effectiveAction==='continue'&&stage.status==='planned'){
      stage.status='in_progress';
    }
    stage.systemAction=effectiveAction;
    stage.modelSystemAction=modelAction;
  }

  state.systemInference={engine:'openjev',model:response?.model||'MiniCPM5-2B',sourceEventId:event.id,elapsedMs:response?.elapsedMs??response?.clientElapsedMs??null,at:new Date().toISOString()};
  return state;
}

export async function runSystemTransition({previousState,event,client}){
  const factualState=applyFactualEvent(previousState,event);
  const questions=buildSystemQuestions(factualState,event);
  const decisionState=compactSystemState(factualState,event);

  // OpenJEV só interpreta state/questions/options. Regras precisam estar
  // dentro do state ou das instructions de cada question.
  const response=await client.decide({state:decisionState,questions});

  return {factualState,decisionState,decisionResponse:response,state:reconcileSystemAnswers(factualState,event,response)};
}

export function createBaseOperationalState(){
  return {version:'S0',project:{id:'belavista-test'},cash:{currentCents:10000000,committedCents:1000000,reserveCents:2000000,freeCents:7000000,availableForNewDecisionsCents:7000000,inflows30dCents:0,outflows30dCents:0,ledger:[]},materials:[{id:'mat-cimento',name:'Cimento',stock:10,receivedQuantity:10,usedQuantity:0},{id:'mat-brita',name:'Brita',stock:20,receivedQuantity:20,usedQuantity:0}],purchases:[{id:'purchase-cimento',materialId:'mat-cimento',status:'ordered',quantity:20,expectedAt:'2026-09-28'}],personnel:[{id:'enc-1',name:'Encarregado 1',role:'encarregado',localityId:'frente-norte',active:true}],stages:[{id:'stage-drenagem',name:'Drenagem',status:'in_progress'}],activities:[{id:'act-drenagem',stageId:'stage-drenagem',localityId:'frente-norte',title:'Executar drenagem',status:'planned',progressPercent:0}],agenda:[],notifications:[],blockers:[],evidence:[],serviceAssignments:[],stageSectorState:[{stageId:'stage-drenagem',localityId:'frente-norte',complete:false,progress:0}],appliedEventIds:[]};
}
