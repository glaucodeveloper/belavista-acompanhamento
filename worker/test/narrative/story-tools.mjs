import assert from 'node:assert/strict';
import {DEFAULT_STAGES_CONFIG,DEFAULT_PERSONNEL_CONFIG} from '../../src/demo-defaults.js';
import {buildConstraintSchedule} from '../../src/operational-loop.js';
import {applyOperationalEvent,createOperationalModel} from '../../src/operational-state.js';

export const clone=value=>JSON.parse(JSON.stringify(value));
export const reais=value=>Math.round(Number(value||0)*100);
export const dinheiro=centavos=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(centavos)||0)/100);

export function obraInteiraParaFazer(){
  const stagesConfig=clone(DEFAULT_STAGES_CONFIG);
  stagesConfig.stageState={};
  for(const stage of stagesConfig.stages){
    stagesConfig.stageState[stage.id]={
      progress:0,
      completed:false,
      criteria:Object.fromEntries((stage.entryCriteria||[]).map(item=>[item.id,false])),
      evidence:[]
    };
  }
  const state={
    projectId:stagesConfig.projectId,
    cashEntries:[],inventoryMovements:[],purchaseRequests:[],fieldReturns:[],completedActivities:[]
  };
  return createOperationalModel({stagesConfig,state});
}

export function planejar(model,today='2026-09-01'){
  return buildConstraintSchedule({
    stagesConfig:model.stagesConfig,
    personnelConfig:DEFAULT_PERSONNEL_CONFIG,
    cashEntries:model.state.cashEntries,
    inventoryMovements:model.state.inventoryMovements,
    purchaseRequests:model.state.purchaseRequests,
    completedActivities:model.state.completedActivities,
    today
  });
}

export function aplicar(model,event){
  return applyOperationalEvent(model,event);
}

export function pedidosDaAtividade(report,activityId){
  return (report.materialRequests||[]).filter(item=>item.activityId===activityId);
}

export function solicitarCompras(model,report,activityId,expectedArrival){
  let next=model;
  for(const item of pedidosDaAtividade(report,activityId)){
    next=aplicar(next,{
      type:'purchase.requested',
      purchaseRequestId:`BUY-${activityId}-${item.materialName.replace(/\W+/g,'-')}`,
      stageId:item.stageId,activityId:item.activityId,
      materialName:item.materialName,quantity:item.quantity,unit:item.unit,
      unitCostCents:item.averageUnitCostCents,totalCents:item.estimatedTotalCents,
      expectedArrival,status:'ordered'
    });
  }
  return next;
}

export function receberComprasDaAtividade(model,activityId,paid=true){
  let next=model;
  const requests=next.state.purchaseRequests.filter(item=>item.activityId===activityId&&item.status!=='received');
  for(const request of requests){
    next=aplicar(next,{
      type:'purchase.receipt',purchaseRequestId:request.id,receiptId:`RCPT-${request.id}`,
      materialName:request.materialName,quantity:request.quantity,unit:request.unit,
      paidCents:paid?request.totalCents:0,stageId:request.stageId,
      notes:`Recibo recebido para ${request.materialName}`
    });
  }
  return next;
}

export function diario(model,{stageId,activityId,progress,completed=false,criteriaConfirmed=[],evidence=[],consumption=[],notes=''}){
  return aplicar(model,{type:'work.diary',id:`DIARY-${activityId}-${progress}`,stageId,activityId,progress,completed,criteriaConfirmed,evidence,consumption,responsible:'Warley',notes});
}

export function confirmar(model,stageId,criterionId){
  return aplicar(model,{type:'criterion.confirmed',stageId,criterionId});
}

export function entrada(model,valor,descricao){
  return aplicar(model,{type:'cash.entry',id:`CASH-IN-${model.state.cashEntries.length+1}`,amountCents:reais(valor),description:descricao});
}

export function saida(model,valor,descricao){
  return aplicar(model,{type:'cash.exit',id:`CASH-OUT-${model.state.cashEntries.length+1}`,amountCents:reais(valor),description:descricao});
}

export function titulo(texto){
  console.log(`\n\n════════════════════════════════════════════════════════════`);
  console.log(texto);
  console.log(`════════════════════════════════════════════════════════════`);
}

export function explicar(report){
  console.log(`Estado UI: ${report.uiState.phase} · conclusão ${report.uiState.completionPercent}%`);
  console.log(`Caixa: ${dinheiro(report.cash.balanceCents)} · reserva ${dinheiro(report.cash.reserveCents)} · provisionável ${dinheiro(report.cash.spendableCents)}`);
  if(report.canDoNow.length){
    console.log('Pode fazer agora:');
    for(const item of report.canDoNow)console.log(`  • ${item.stageName} → ${item.title}`);
  }
  if(report.materialRequests.length){
    console.log('Pedidos de material compreendidos:');
    for(const item of report.materialRequests)console.log(`  • ${item.stageName} → ${item.quantity} ${item.unit} ${item.materialName} @ ${dinheiro(item.averageUnitCostCents)} = ${dinheiro(item.estimatedTotalCents)} [${item.status}]`);
  }
  if(report.fundingChoices.length){
    console.log('Combinações de provisão por importância e menor custo:');
    for(const item of report.fundingChoices)console.log(`  • ${item.recommended?'✓':'×'} ${item.stageName} / ${item.activityTitle} · ${item.importance} · ${dinheiro(item.estimatedTotalCents)}`);
  }
  if(report.blocked.length){
    console.log('Bloqueios:');
    for(const item of report.blocked.slice(0,8))console.log(`  • ${item.stageName}${item.title?` / ${item.title}`:''}: ${(item.reasons||[]).join('; ')}`);
  }
  if(report.notifications.length){
    console.log('Repasses/notificações:');
    for(const item of report.notifications.slice(0,8))console.log(`  • [${item.role}] ${item.title}: ${item.message}`);
  }
}

export function esperar(condition,message){assert.ok(condition,message);}
export {assert};
