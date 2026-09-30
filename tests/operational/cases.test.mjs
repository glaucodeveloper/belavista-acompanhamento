import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFactualEvent,runSystemTransition,createBaseOperationalState} from '../../desktop/system-model/operational-core.mjs';
import {operationalCase} from './terminal-logic-graph.mjs';

class FakeSystemModel {
  constructor(resolver){this.resolver=resolver;}
  async decide({state,questions}){
    const answers={};
    for(const id of Object.keys(questions)){
      const value=this.resolver(id,state,questions[id]);
      if(questions[id].type==='noul')answers[id]={type:'noul',noul:value===true?0.95:value===false?0.05:Number(value??0.05),method:'direct'};
      else answers[id]={type:'choice',choice:String(value||'blocked'),method:'direct'};
    }
    return {model:'MiniCPM5-2B-test-double',answers,elapsedMs:1,usage:{input_tokens:0,output_tokens:0}};
  }
}
const modelFor=(overrides={})=>new FakeSystemModel((id,state)=>{
  if(id in overrides)return overrides[id];
  if(id.endsWith(':execution_gate'))return 'allow';
  if(id.endsWith(':notify'))return false;
  if(id.endsWith(':agenda'))return 'keep';
  if(id.endsWith(':action'))return 'continue';
  const activityId=id.split(':')[1];
  const activity=(state.activities||[]).find(x=>x.id===activityId);
  if(activity?.status==='completed')return 'completed';
  if(activity?.status==='in_progress')return 'in_progress';
  return 'ready';
});
const flow=(eventLabel,extra=[])=>[
  {point:'FIELD/CAPACITOR',label:eventLabel},
  {point:'FACT REDUCER',label:'aplica fatos financeiros/físicos exatamente uma vez'},
  {point:'MINICPM/OpenJEV',label:'decide readiness, agenda, notificação e ação da etapa'},
  {point:'RECONCILER',label:'materializa somente efeitos derivados do system model'},
  ...extra,
  {point:'GITHUB REGISTRY',label:'estado versionado é persistido após validação'}
];
const material=(state,id)=>state.materials.find(x=>x.id===id);
const activity=(state,id='act-drenagem')=>state.activities.find(x=>x.id===id);

test('cash.outflow: caixa factual + reavaliação operacional',async t=>operationalCase(t,{id:'cash.outflow',title:'Saída reduz caixa, preserva materiais e pode exigir notificação',flow:flow('cash.outflow.recorded')},async g=>{
  const base=createBaseOperationalState(); const beforeStock=material(base,'mat-cimento').stock;
  const event={id:'EV-CASH-OUT',type:'cash.outflow.recorded',payload:{amountCents:1500000,description:'Serviço extraordinário'}};
  const result=await runSystemTransition({previousState:base,event,client:modelFor({'activity:act-drenagem:notify':true,'activity:act-drenagem:agenda':'reschedule'})});
  g.check('currentCents diminui',result.state.cash.currentCents===8500000,String(result.state.cash.currentCents));
  g.check('ledger contém o evento',result.state.cash.ledger.some(x=>x.eventId===event.id));
  g.check('material não muda',material(result.state,'mat-cimento').stock===beforeStock);
  g.check('system model cria notificação',result.state.notifications.some(x=>x.sourceEventId===event.id));
  g.check('agenda é reavaliada',result.state.agenda.some(x=>x.status==='needs_reschedule'));
}));

test('cash.inflow: aporte aumenta saldo sem inventar estoque',async t=>operationalCase(t,{id:'cash.inflow',title:'Entrada de caixa aumenta disponibilidade e não altera material',flow:flow('cash.inflow.recorded')},async g=>{
  const base=createBaseOperationalState(); const event={id:'EV-CASH-IN',type:'cash.inflow.recorded',payload:{amountCents:2000000,description:'Aporte'}}; const next=applyFactualEvent(base,event);
  g.check('saldo aumenta',next.cash.currentCents===12000000,String(next.cash.currentCents));
  g.check('freeCents recalculado',next.cash.freeCents===9000000,String(next.cash.freeCents));
  g.check('estoque preservado',material(next,'mat-brita').stock===20);
  g.check('ledger registra entrada',next.cash.ledger.some(x=>x.eventId===event.id&&x.kind==='inflow'));
}));

test('cash.reserve: reserva recalcula free/available sem tocar ledger',async t=>operationalCase(t,{id:'cash.reserve',title:'Mudança de reserva altera disponibilidade, não cria movimento financeiro',flow:flow('cash.reserve.changed')},async g=>{
  const base=createBaseOperationalState(); const ledgerBefore=base.cash.ledger.length; const next=applyFactualEvent(base,{id:'EV-RESERVE',type:'cash.reserve.changed',payload:{reserveCents:4000000}});
  g.check('reserveCents factual',next.cash.reserveCents===4000000,String(next.cash.reserveCents));
  g.check('freeCents = current-committed-reserve',next.cash.freeCents===5000000,String(next.cash.freeCents));
  g.check('available não negativo',next.cash.availableForNewDecisionsCents===5000000);
  g.check('ledger não cresce',next.cash.ledger.length===ledgerBefore);
}));

test('purchase.receipt: recebimento conta material e não consome caixa',async t=>operationalCase(t,{id:'purchase.receipt',title:'Recebimento incrementa stock/receivedQuantity e reavalia execução',flow:flow('purchase.receipt.received')},async g=>{
  const base=createBaseOperationalState(); const beforeCash=base.cash.currentCents;
  const next=applyFactualEvent(base,{id:'EV-RECEIPT',type:'purchase.receipt.received',payload:{purchaseId:'purchase-cimento',items:[{materialId:'mat-cimento',quantity:20}],evidence:[{id:'NF-001'}]}});
  g.check('stock +20',material(next,'mat-cimento').stock===30,String(material(next,'mat-cimento').stock));
  g.check('receivedQuantity +20',material(next,'mat-cimento').receivedQuantity===30);
  g.check('usedQuantity preservado',material(next,'mat-cimento').usedQuantity===0);
  g.check('caixa não muda',next.cash.currentCents===beforeCash);
  g.check('documento/evidência registrado',next.evidence.some(x=>x.id==='NF-001'));
}));

test('material.consumption: consumo baixa estoque e aumenta usedQuantity',async t=>operationalCase(t,{id:'material.consumption',title:'Consumo físico altera somente estoque/uso do material declarado',flow:flow('material.consumption.recorded')},async g=>{
  const base=createBaseOperationalState(); const next=applyFactualEvent(base,{id:'EV-CONSUME',type:'material.consumption.recorded',payload:{items:[{materialId:'mat-brita',quantity:7}]}});
  g.check('stock -7',material(next,'mat-brita').stock===13,String(material(next,'mat-brita').stock));
  g.check('usedQuantity +7',material(next,'mat-brita').usedQuantity===7);
  g.check('receivedQuantity preservado',material(next,'mat-brita').receivedQuantity===20);
}));

test('inventory.adjustment: correção física muda stock sem falsificar recebido/usado',async t=>operationalCase(t,{id:'inventory.adjustment',title:'Ajuste de contagem física altera só stock',flow:flow('inventory.adjustment.recorded')},async g=>{
  const base=createBaseOperationalState(); const next=applyFactualEvent(base,{id:'EV-COUNT',type:'inventory.adjustment.recorded',payload:{materialId:'mat-brita',deltaQuantity:5}});
  g.check('stock +5',material(next,'mat-brita').stock===25);
  g.check('receivedQuantity preservado',material(next,'mat-brita').receivedQuantity===20);
  g.check('usedQuantity preservado',material(next,'mat-brita').usedQuantity===0);
}));

test('purchase.delay: atraso altera compra e system model pode reagendar/notificar',async t=>operationalCase(t,{id:'purchase.delay',title:'Atraso de fornecedor muda expectedAt e propaga agenda/notificação',flow:flow('purchase.delivery.delayed')},async g=>{
  const base=createBaseOperationalState(); base.agenda=[{id:'agenda-act',activityId:'act-drenagem',status:'confirmed'}];
  const event={id:'EV-DELAY',type:'purchase.delivery.delayed',payload:{purchaseId:'purchase-cimento',expectedAt:'2026-10-03'}};
  const result=await runSystemTransition({previousState:base,event,client:modelFor({'activity:act-drenagem:execution_gate':'hold','activity:act-drenagem:agenda':'reschedule','activity:act-drenagem:notify':true})});
  g.check('expectedAt alterado',result.state.purchases[0].expectedAt==='2026-10-03');
  g.check('blocker derivado',result.state.blockers.some(x=>x.activityId==='act-drenagem'&&x.status==='active'));
  g.check('agenda needs_reschedule',result.state.agenda.some(x=>x.id==='agenda-act'&&x.status==='needs_reschedule'));
  g.check('notificação derivada',result.state.notifications.some(x=>x.sourceEventId===event.id));
}));

test('purchase.cancel: cancelamento não apaga estoque nem histórico',async t=>operationalCase(t,{id:'purchase.cancel',title:'Cancelamento muda status da compra sem mutações físicas retroativas',flow:flow('purchase.cancelled')},async g=>{
  const base=createBaseOperationalState(); const stock=material(base,'mat-cimento').stock; const next=applyFactualEvent(base,{id:'EV-CANCEL',type:'purchase.cancelled',payload:{purchaseId:'purchase-cimento',reason:'Fornecedor desistiu'}});
  g.check('compra cancelada',next.purchases[0].status==='cancelled'); g.check('motivo preservado',next.purchases[0].cancelReason==='Fornecedor desistiu'); g.check('estoque não muda',material(next,'mat-cimento').stock===stock);
}));

test('purchase.invoice: nota paga contabiliza caixa + material uma única vez',async t=>operationalCase(t,{id:'purchase.invoice',title:'Nota de compra paga alimenta caixa, estoque e evidência com idempotência',flow:flow('purchase.invoice.recorded',[{point:'IDEMPOTENCY',label:'event.id impede dupla contagem da mesma nota'}])},async g=>{
  const base=createBaseOperationalState(); const event={id:'EV-NF-COMPRA',type:'purchase.invoice.recorded',payload:{document:{number:'NF-2026-100',supplier:'Materiais Alfa',amountCents:500000},paymentStatus:'paid',paidAmountCents:500000,activityId:'act-drenagem',stageId:'stage-drenagem',items:[{materialId:'mat-cimento',quantity:8}]}};
  const once=applyFactualEvent(base,event); const twice=applyFactualEvent(once,event);
  g.check('caixa -500000',once.cash.currentCents===9500000,String(once.cash.currentCents));
  g.check('stock +8',material(once,'mat-cimento').stock===18);
  g.check('evidência fiscal criada',once.evidence.some(x=>x.kind==='purchase-invoice'));
  g.check('segunda aplicação não desconta caixa',twice.cash.currentCents===once.cash.currentCents);
  g.check('segunda aplicação não duplica material',material(twice,'mat-cimento').stock===18);
}));

test('service.invoice: nota de serviço afeta caixa/progresso sem criar material',async t=>operationalCase(t,{id:'service.invoice',title:'NFS paga registra evidência e avanço declarado, sem inventar estoque',flow:flow('service.invoice.recorded')},async g=>{
  const base=createBaseOperationalState(); const stock=material(base,'mat-cimento').stock; const next=applyFactualEvent(base,{id:'EV-NFS',type:'service.invoice.recorded',payload:{document:{number:'NFS-77',supplier:'Terraplanagem X',amountCents:700000},paymentStatus:'paid',activityId:'act-drenagem',stageId:'stage-drenagem',reportedProgressPercent:45}});
  g.check('caixa reduzido',next.cash.currentCents===9300000,String(next.cash.currentCents));
  g.check('progresso declarado 45%',activity(next).progressPercent===45,String(activity(next).progressPercent));
  g.check('atividade não é concluída pela nota',activity(next).status!=='completed',activity(next).status);
  g.check('material não é criado/alterado',material(next,'mat-cimento').stock===stock);
  g.check('NFS vira evidência',next.evidence.some(x=>x.kind==='service-invoice'));
}));

test('service.assignment.accepted: aceite confirma serviço, não execução',async t=>operationalCase(t,{id:'service.assignment.accepted',title:'Serviço assinalado/aceito não conclui atividade',flow:flow('service.assignment.created → service.assignment.accepted')},async g=>{
  const base=createBaseOperationalState(); const created=applyFactualEvent(base,{id:'EV-ASSIGN',type:'service.assignment.created',payload:{assignmentId:'asg-1',activityId:'act-drenagem',stageId:'stage-drenagem',localityId:'frente-norte',assigneeIds:['enc-1']}}); const accepted=applyFactualEvent(created,{id:'EV-ACCEPT',type:'service.assignment.accepted',payload:{assignmentId:'asg-1'}});
  g.check('assignment accepted',accepted.serviceAssignments[0].status==='accepted'); g.check('atividade ainda não completed',activity(accepted).status!=='completed',activity(accepted).status); g.check('progresso físico não sobe',activity(accepted).progressPercent===0);
}));

test('service execution: start/report registra andamento sem conclusão implícita',async t=>operationalCase(t,{id:'service.execution',title:'Início e relato de execução atualizam andamento, preservando gate de confirmação',flow:flow('service.execution.started → service.execution.reported')},async g=>{
  let state=createBaseOperationalState(); state=applyFactualEvent(state,{id:'EV-A1',type:'service.assignment.created',payload:{assignmentId:'asg-1',activityId:'act-drenagem'}}); state=applyFactualEvent(state,{id:'EV-A2',type:'service.execution.started',payload:{assignmentId:'asg-1',activityId:'act-drenagem'}}); state=applyFactualEvent(state,{id:'EV-A3',type:'service.execution.reported',payload:{assignmentId:'asg-1',activityId:'act-drenagem',progressPercent:70}});
  g.check('atividade in_progress',activity(state).status==='in_progress'); g.check('progresso 70%',activity(state).progressPercent===70); g.check('assignment reported',state.serviceAssignments[0].status==='reported'); g.check('não concluiu sem confirmação',activity(state).status!=='completed');
}));

test('image evidence: foto precisa ser verificada antes de confirmar serviço',async t=>operationalCase(t,{id:'service.image.confirmation',title:'Imagem enviada → verificada → confirmação da execução',flow:[{point:'CAPACITOR CAMERA',label:'service.evidence.image.submitted'},{point:'EVIDENCE STORE',label:'foto fica pending_verification'},{point:'VISION/HUMAN VERIFY',label:'service.evidence.image.verified'},{point:'FACT REDUCER',label:'service.execution.confirmed exige evidência verificada'},{point:'MINICPM/OpenJEV',label:'reavalia atividade, etapa, agenda e notificações'},{point:'GITHUB REGISTRY',label:'estado final auditável'}]},async g=>{
  let state=createBaseOperationalState(); state=applyFactualEvent(state,{id:'EV-ASG',type:'service.assignment.created',payload:{assignmentId:'asg-1',activityId:'act-drenagem'}}); state=applyFactualEvent(state,{id:'EV-IMG',type:'service.evidence.image.submitted',payload:{evidenceId:'img-1',assignmentId:'asg-1',activityId:'act-drenagem',uri:'local://img-1.jpg'}});
  g.check('foto pendente',state.evidence[0].status==='pending_verification'); assert.throws(()=>applyFactualEvent(state,{id:'EV-CONF-FAIL',type:'service.execution.confirmed',payload:{assignmentId:'asg-1',activityId:'act-drenagem',evidenceIds:['img-1']}})); g.check('confirmação antes da verificação é rejeitada',true);
  state=applyFactualEvent(state,{id:'EV-IMG-OK',type:'service.evidence.image.verified',payload:{evidenceId:'img-1',verdict:'supported'}}); state=applyFactualEvent(state,{id:'EV-CONF',type:'service.execution.confirmed',payload:{assignmentId:'asg-1',activityId:'act-drenagem',stageId:'stage-drenagem',localityId:'frente-norte',stageProgressPercent:80,evidenceIds:['img-1']}});
  g.check('atividade completed',activity(state).status==='completed'); g.check('atividade 100%',activity(state).progressPercent===100); g.check('etapa recebe progresso factual',state.stageSectorState[0].progress===80);
}));

test('agenda + notification inference: system model deriva reação sem alterar fatos',async t=>operationalCase(t,{id:'system-model.agenda-notification',title:'MiniCPM decide bloqueio/reagendamento/notificação sobre estado factual',flow:flow('evento factual já aplicado')},async g=>{
  const base=createBaseOperationalState(); base.agenda=[{id:'agenda-1',activityId:'act-drenagem',status:'confirmed'}]; const event={id:'EV-AGENDA',type:'cash.outflow.recorded',payload:{amountCents:100000}};
  const result=await runSystemTransition({previousState:base,event,client:modelFor({'activity:act-drenagem:execution_gate':'hold','activity:act-drenagem:agenda':'reschedule','activity:act-drenagem:notify':true,'stage:stage-drenagem:action':'hold'})});
  g.check('blocker do system model',result.state.blockers.some(x=>x.status==='active')); g.check('agenda marcada para reagendar',result.state.agenda[0].status==='needs_reschedule'); g.check('notificação gerada',result.state.notifications.length===1); g.check('stage hold',result.state.stages[0].systemAction==='hold');
}));

test('stage progress inference: etapa só completa quando system model decide complete',async t=>operationalCase(t,{id:'stage.progress',title:'Confirmação física completa atividade; conclusão da etapa continua decisão separada',flow:[{point:'FIELD',label:'serviço confirmado + evidência'},{point:'FACT REDUCER',label:'atividade vira completed'},{point:'MINICPM/OpenJEV',label:'stage action = complete somente se critérios estiverem satisfeitos'},{point:'RECONCILER',label:'stageSectorState complete/progress=100'},{point:'REGISTRY',label:'novo estado versionado'}]},async g=>{
  let state=createBaseOperationalState(); state=applyFactualEvent(state,{id:'EV-ASG-S',type:'service.assignment.created',payload:{assignmentId:'asg-s',activityId:'act-drenagem'}}); state=applyFactualEvent(state,{id:'EV-IMG-S',type:'service.evidence.image.submitted',payload:{evidenceId:'img-s',activityId:'act-drenagem'}}); state=applyFactualEvent(state,{id:'EV-IMG-S2',type:'service.evidence.image.verified',payload:{evidenceId:'img-s',verdict:'supported'}});
  const event={id:'EV-CONF-S',type:'service.execution.confirmed',payload:{assignmentId:'asg-s',activityId:'act-drenagem',stageId:'stage-drenagem',localityId:'frente-norte',stageProgressPercent:90,evidenceIds:['img-s']}};
  const result=await runSystemTransition({previousState:state,event,client:modelFor({'activity:act-drenagem:execution_gate':'allow','activity:act-drenagem:agenda':'cancel','stage:stage-drenagem:action':'complete'})});
  g.check('atividade completed factual',activity(result.state).status==='completed'); g.check('stage complete por decisão separada',result.state.stages[0].status==='completed'); g.check('stageSector complete',result.state.stageSectorState[0].complete===true); g.check('stage progress 100',result.state.stageSectorState[0].progress===100);
}));
