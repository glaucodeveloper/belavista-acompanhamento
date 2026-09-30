import * as persistence from '../../../persistence.mjs';

const asArray=value=>Array.isArray(value)?value:[];
const safeNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const dateDurationMinutes=(start,end)=>{
  const a=Date.parse(start||''),b=Date.parse(end||'');
  return Number.isFinite(a)&&Number.isFinite(b)&&b>a?Math.max(60,Math.round((b-a)/60000)):60;
};
const pick=(rows,predicate)=>rows.find(predicate)||rows[0]||null;
const has=(value,term)=>String(value||'').toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR'));

export async function readApplicationOperationalState(){
  const [stagesRaw,activitiesRaw,materialsRaw,peopleRaw,purchasesRaw,recordsRaw,cashRaw,cashSummary]=await Promise.all([
    persistence.listStagesAdmin(),persistence.listActivities(),persistence.listMaterials(),
    persistence.listCollaborators(),persistence.listPurchases(),persistence.listRecords(),
    persistence.listCashFlowEntries(),persistence.cashFlowSummary()
  ]);
  const stages=asArray(stagesRaw).map(stage=>({
    id:String(stage.id),name:String(stage.name||`Etapa ${stage.id}`),status:String(stage.status||'planejado'),
    progress:safeNumber(stage.progress),week:stage.week??null,
    executionDescription:String(stage.name||'Etapa cadastrada'),peculiarities:[],requirements:[],
    evidenceRequirements:[],notificationDestinations:[]
  }));
  const activities=asArray(activitiesRaw).map(activity=>{
    const properties=activity.properties&&typeof activity.properties==='object'?activity.properties:{};
    const operationalProperties=Object.fromEntries(Object.entries({
      source:properties.source,kind:properties.kind,unit:properties.unit,
      plannedQuantity:properties.plannedQuantity,remainingQuantity:properties.remainingQuantity,
      adjustedRate:properties.adjustedRate,rateUnit:properties.rateUnit,
      materialShortfalls:asArray(properties.materialShortfalls).map(item=>({quantity:item.quantity,unit:item.unit})),
      relations:asArray(properties.relations).map(item=>({type:item.type,direction:item.direction}))
    }).filter(([,value])=>value!==undefined));
    return {
      id:String(activity.id),stageId:String(activity.stageId),title:String(activity.name||activity.id),
      category:String(activity.category||''),executionDescription:String(activity.name||activity.id),
      peculiarities:[],requirements:[],evidenceRequirements:[],status:String(activity.status||'pendente'),
      progress:safeNumber(activity.progress),plannedStart:activity.plannedStart||null,plannedEnd:activity.plannedEnd||null,
      durationMinutes:dateDurationMinutes(activity.plannedStart,activity.plannedEnd),properties:operationalProperties
    };
  });
  const materials=asArray(materialsRaw).map(material=>{
    const received=safeNumber(material.receivedQuantity),used=safeNumber(material.usedQuantity);
    return {
      id:String(material.id),name:String(material.name||material.id),unit:String(material.unit||'un'),
      stock:received-used,receivedQuantity:received,usedQuantity:used,
      plannedNextNeed:Math.max(0,safeNumber(material.plannedQuantity)-used),status:String(material.status||'')
    };
  });
  const purchases=asArray(purchasesRaw).map(purchase=>({
    id:String(purchase.id),stage:String(purchase.stage||''),status:String(purchase.status||''),
    expectedAt:purchase.expectedDate||null,valueCents:safeNumber(purchase.valueCents),quantity:null,materialId:null
  }));
  const evidence=asArray(recordsRaw).map(record=>({
    id:String(record.id),type:'activity-record',status:String(record.status||'registrado'),
    activityId:String(record.activityId||''),stageId:record.stageId==null?null:String(record.stageId),date:record.data||null
  }));
  const ledger=asArray(cashRaw).map(entry=>({
    id:String(entry.id),date:entry.date||null,kind:String(entry.kind||''),category:String(entry.category||''),
    amountCents:safeNumber(entry.amountCents),stage:String(entry.stage||'')
  }));
  const entriesCents=safeNumber(cashSummary?.entriesCents),exitsCents=safeNumber(cashSummary?.exitsCents);
  const balanceCents=safeNumber(cashSummary?.balanceCents);
  const personnel=asArray(peopleRaw).map(person=>({
    id:String(person.id),role:String(person.role||''),specialty:String(person.specialty||''),
    active:person.active!==false,localityId:null,skills:person.specialty?[String(person.specialty)]:[],availability:[]
  }));
  const state={
    schemaVersion:3,version:`application-snapshot-${Date.now().toString(36)}`,
    project:{id:String(stagesRaw?.[0]?.projectId||'project-alianca-park'),name:'Aliança Park',currency:'BRL',timezone:'America/Sao_Paulo'},
    clock:{now:new Date().toISOString(),horizonDays:90,workday:{start:'07:00',end:'17:00'}},
    localities:[],personnel,stages,activities,materials,
    cash:{currentCents:balanceCents,committedCents:0,reserveCents:0,freeCents:balanceCents,
      availableForNewDecisionsCents:balanceCents,inflows30dCents:entriesCents,outflows30dCents:exitsCents,ledger},
    purchases,evidence,agenda:[],notifications:[],resourceRequests:[],cashRequests:[],diary:[],blockers:[],
    stageSectorState:[],constraints:[],commercial:{sales:[],commissions:[],brokers:[]}
  };
  return {state,sourceCounts:{stages:stages.length,activities:activities.length,materials:materials.length,
    personnel:personnel.length,purchases:purchases.length,records:evidence.length,cashEntries:ledger.length}};
}

export function buildApplicationInferenceCases(state){
  const stages=state.stages,activities=state.activities,materials=state.materials,people=state.personnel,purchases=state.purchases;
  const drainage=pick(activities,a=>has(stages.find(s=>s.id===a.stageId)?.name,'drenagem'));
  const electrical=pick(activities,a=>has(stages.find(s=>s.id===a.stageId)?.name,'elétrica')||has(stages.find(s=>s.id===a.stageId)?.name,'eletrica'));
  const stage=pick(stages,s=>has(s.name,'drenagem'));
  const stageWithActivities=pick(stages,s=>activities.some(a=>a.stageId===s.id));
  const material=pick(materials,m=>has(m.name,'tubo')||has(m.name,'cabo'));
  const secondMaterial=materials.find(m=>m.id!==material?.id)||material;
  const purchase=pick(purchases,p=>has(p.stage,'água')||has(p.stage,'agua'));
  const firstPerson=people[0]||{id:'qa-person-placeholder',role:'equipe',specialty:'',active:true};
  const selectedRecord=state.evidence[0]||{id:'QA-RECORD-EVIDENCE',activityId:drainage?.id||activities[0]?.id||''};
  const selectedActivity=drainage||activities[0]||{id:'qa-activity-placeholder',stageId:stage?.id||stages[0]?.id||'qa-stage'};
  const consumptionActivity=has(material?.name,'cabo')?(electrical||selectedActivity):selectedActivity;
  const localityId='frente-principal';
  const ts='2026-09-24T12:00:00-03:00';
  const make=(id,type,payload)=>({id:`QA-${id}`,type,at:ts,actor:{id:'qa-inference-runner',role:'admin'},payload});
  const receipt=(suffix,items)=>make(`receipt-${suffix}`,'purchase.receipt.received',{
    purchaseId:purchase?.id||purchases[0]?.id||'QA-PURCHASE',supplier:'fornecedor do projeto',
    documentNumber:`QA-NF-${suffix}`,totalAmountCents:10000,items:items.map(m=>({
      materialId:m.id,name:m.name,quantity:1,unit:m.unit,unitPriceCents:10000
    })),receiptEvidenceId:`QA-RECEIPT-${suffix}`
  });
  const agendaId=`QA-AGENDA-${selectedActivity.id}`;
  const scenarios=[
    {name:'solicitação de estado operacional inicial',event:make('initial','operation.state.requested',{goal:'Analisar o estado persistido do projeto, todas as etapas, atividades, materiais, caixa e pendências para produzir o estado operacional completo.'})},
    {name:'entrada de saída de caixa',event:make('cash-out','cash.outflow.recorded',{amountCents:10000,category:'despesa de teste',description:'Lançamento isolado de QA; não persistir.'})},
    {name:'entrada de receita de caixa',event:make('cash-in','cash.inflow.recorded',{amountCents:10000,category:'receita de teste',description:'Lançamento isolado de QA; não persistir.'})},
    {name:'alteração de reserva financeira',event:make('reserve','cash.reserve.changed',{reserveCents:10000,reason:'cenário isolado de QA'})},
    {name:'recebimento de material com um item',event:receipt('single',[material].filter(Boolean))},
    {name:'recebimento de material com múltiplos itens',event:receipt('multi',[material,secondMaterial].filter(Boolean))},
    {name:'consumo de material por atividade',event:make('consume','material.consumption.recorded',{localityId,activityId:consumptionActivity.id,items:[{materialId:material?.id,quantity:1,unit:material?.unit}].filter(x=>x.materialId)})},
    {name:'ajuste de inventário',event:make('inventory','inventory.adjustment.recorded',{materialId:material?.id,deltaQuantity:1,unit:material?.unit,reason:'conferência isolada de QA'})},
    {name:'atraso de entrega de compra',event:make('supplier-delay','purchase.delivery.delayed',{purchaseId:purchase?.id||purchases[0]?.id||'QA-PURCHASE',newExpectedAt:'2026-09-27T08:00:00-03:00',reason:'cenário isolado de QA'})},
    {name:'diário de campo com conclusão e evidência',event:make('diary-complete','field.diary.recorded',{localityId,foremanId:firstPerson.id,activityId:selectedActivity.id,status:'completed',progressPercent:100,services:['verificação de execução'],evidence:[{id:'QA-DIARY-EVIDENCE',type:'field-confirmation',description:'Evidência temporária de QA'}],notes:'Registro isolado para validar a propagação da atividade.'})},
    {name:'diário de campo com avanço parcial',event:make('diary-progress','field.diary.recorded',{localityId,foremanId:firstPerson.id,activityId:(electrical||selectedActivity).id,status:'in-progress',progressPercent:35,services:['atualização de avanço'],evidence:[],notes:'Registro temporário de QA.'})},
    {name:'foto de campo associada à atividade',event:make('field-photo','field.photo.registered',{localityId,activityId:selectedActivity.id,evidence:{id:'QA-FIELD-PHOTO',type:'photo',description:'Anexo temporário de QA'}})},
    {name:'abertura de impedimento de atividade',event:make('blocker-open','activity.blocker.reported',{activityId:selectedActivity.id,localityId,kind:'equipment',description:'Impedimento temporário para validação de QA',blocksExecution:true})},
    {name:'resolução de impedimento existente',event:make('blocker-clear','activity.blocker.cleared',{activityId:selectedActivity.id,blockerKind:'equipment',description:'Resolução temporária de QA'}),prepare:s=>s.blockers.push({id:'QA-BLOCKER-EXISTING',activityId:selectedActivity.id,kind:'equipment',description:'Pré-condição isolada de QA',status:'active',blocksExecution:true})},
    {name:'reestimativa de duração de atividade',event:make('duration','activity.duration.reestimated',{activityId:selectedActivity.id,durationMinutes:75,reason:'reestimativa isolada de QA'})},
    {name:'registro de ausência de colaborador',event:make('absence','personnel.absence.reported',{personId:firstPerson.id,from:'2026-09-25T07:00:00-03:00',to:'2026-09-25T17:00:00-03:00',reason:'cenário temporário de QA'})},
    {name:'retorno de colaborador ausente',event:make('return','personnel.returned',{personId:firstPerson.id,at:'2026-09-26T07:00:00-03:00'}),prepare:s=>{const p=s.personnel.find(x=>x.id===firstPerson.id);if(p){p.active=false;p.availability=[];p.absence={from:'2026-09-25T07:00:00-03:00',to:'2026-09-25T17:00:00-03:00'};}}},
    {name:'transferência de colaborador entre frentes',event:make('locality-change','personnel.locality.changed',{personId:firstPerson.id,fromLocalityId:localityId,toLocalityId:'QA-FRENTE-DESTINO',effectiveAt:ts,reason:'transferência temporária de QA'}),prepare:s=>s.localities.push({id:'QA-FRENTE-DESTINO',name:'Frente destino temporária de QA',status:'active'})},
    {name:'atualização de disponibilidade de colaborador',event:make('availability','personnel.availability.updated',{personId:firstPerson.id,active:firstPerson.active===false,localityId,availability:[{date:'2026-09-25',start:'07:00',end:'17:00'}]})},
    {name:'alteração de metadados de etapa',event:make('stage-meta','stage.meta.updated',{stageId:stage?.id||stages[0]?.id,patch:{peculiarities:['Regra temporária inserida para o teste de inferência; não persistir.']}})},
    {name:'alteração de metadados de atividade',event:make('activity-meta','activity.meta.updated',{activityId:selectedActivity.id,patch:{requirements:['Requisito temporário inserido para o teste de inferência; não persistir.']}})},
    {name:'aprovação de comprovante existente',event:make('evidence-approved','evidence.approved',{evidence:{id:selectedRecord.id,type:'activity-record',status:'approved',activityId:selectedRecord.activityId||selectedActivity.id}})},
    {name:'rejeição de comprovante existente',event:make('evidence-rejected','evidence.rejected',{evidenceId:selectedRecord.id,reason:'Rejeição temporária de QA; não persistir.'})},
    {name:'declaração de novo requisito de material',event:make('material-declared','material.requirement.declared',{activityId:selectedActivity.id,material:{id:'QA-MATERIAL-REQUIREMENT',name:'Recurso temporário de QA',unit:material?.unit||'un',quantity:1}})},
    {name:'declaração de nova atividade',event:make('activity-declared','activity.declared',{activity:{id:'QA-ACTIVITY-DECLARED',stageId:stageWithActivities?.id||stages[0]?.id,title:'Atividade temporária de QA',executionDescription:'Atividade usada apenas para validar a entrada de declaração.',durationMinutes:60,status:'planned'}})},
    {name:'negação de solicitação financeira pendente',event:make('cash-denied','cash.request.denied',{requestId:'QA-CASH-REQUEST',reason:'Negação temporária para validar o fluxo; não persistir.'}),prepare:s=>s.cashRequests.push({id:'QA-CASH-REQUEST',status:'pending',amountCents:10000,description:'Pré-condição temporária de QA'})},
    {name:'aprovação de solicitação de compra',event:make('purchase-approved','purchase.request.approved',{requestId:'QA-PURCHASE-REQUEST',approvedQuantity:1,materialId:material?.id,approvedAmountCents:10000}),prepare:s=>s.resourceRequests.push({id:'QA-PURCHASE-REQUEST',status:'pending',quantity:1,materialId:material?.id,amountCents:10000})},
    {name:'cancelamento de compra existente',event:make('purchase-cancelled','purchase.cancelled',{purchaseId:purchase?.id||purchases[0]?.id||'QA-PURCHASE',reason:'Cancelamento temporário de QA'})},
    {name:'criação de localidade operacional',event:make('locality-created','locality.created',{locality:{id:'QA-LOCALITY-CREATED',name:'Localidade temporária de QA',status:'active'}})},
    {name:'atribuição de colaborador à frente principal',event:make('person-assigned','personnel.assigned',{person:{id:firstPerson.id,role:firstPerson.role,specialty:firstPerson.specialty,active:true,localityId}})},
    {name:'aceite de item de agenda',event:make('agenda-accepted','agenda.item.accepted',{agendaItemId:agendaId,personId:firstPerson.id}),prepare:s=>s.agenda.push({id:agendaId,activityId:selectedActivity.id,title:selectedActivity.title,status:'scheduled',personId:firstPerson.id,plannedStart:selectedActivity.plannedStart})},
    {name:'conclusão de item de agenda',event:make('agenda-completed','agenda.item.completed',{agendaItemId:agendaId,personId:firstPerson.id,activityId:selectedActivity.id}),prepare:s=>s.agenda.push({id:agendaId,activityId:selectedActivity.id,title:selectedActivity.title,status:'accepted',personId:firstPerson.id,plannedStart:selectedActivity.plannedStart})},
    {name:'registro de observação operacional',event:make('operational-note','operation.note.recorded',{text:'Observação temporária de QA para verificar propagação no diário operacional.'})}
  ];
  return scenarios.map(scenario=>({...scenario,createState:()=>{
    const copy=structuredClone(state);
    scenario.prepare?.(copy);
    return copy;
  }}));
}

export async function applicationStateFingerprint(){
  const sources=await Promise.all([
    persistence.listStagesAdmin(),persistence.listActivities(),persistence.listMaterials(),persistence.listCollaborators(),
    persistence.listPurchases(),persistence.listRecords(),persistence.listCashFlowEntries(),
    persistence.listServiceRequests(),persistence.listPurchaseReceipts(),persistence.listOutsourcingReceipts(),
    persistence.listWorkbenchActivityLocations(),persistence.listWorkbenchDiary()
  ]);
  return JSON.stringify(sources);
}
