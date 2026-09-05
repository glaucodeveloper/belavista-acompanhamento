import test from 'node:test';
import assert from 'node:assert/strict';
import {applyLiveTestEvent} from '../../worker/src/live-test-session.js';
import {buildRealScenario} from '../real/fixtures/obra-real.mjs';
import {buildCommercialScenario} from '../real/fixtures/comercial.mjs';
import {createMockExternalServices} from '../real/mocks/external-services.mjs';
import {runReferenceOperationalLoop} from '../real/reference/operational-loop-reference.mjs';
import {assertNoOverlap,findByActivity,reasonText} from '../real/helpers.mjs';

const purchase={
  id:'PO-MANILHA-MOCK-001',type:'purchase.ordered',stageId:'stage-drenagem',stageName:'Drenagem Pluvial',
  activityId:'act-drenagem-conferencia',materialName:'Manilha de concreto 800 mm',quantity:75,unit:'m',
  unitCostCents:10_000,totalCostCents:750_000,expectedArrival:'2026-09-03'
};
const receipt={
  id:'RCPT-MANILHA-MOCK-001',type:'purchase.receipt',purchaseId:purchase.id,
  materialName:purchase.materialName,quantity:75,unit:'m',totalCostCents:750_000
};

function liveSession(){
  return {
    id:'PURCHASE-MOCK',today:'2026-09-01',
    configuration:{stages:{stages:[],stageState:{}},personnel:{people:[]}},
    state:{cashEntries:[],inventoryMovements:[],purchaseRequests:[],fieldReturns:[]},history:[]
  };
}

function pick(value,keys){
  return Object.fromEntries(keys.map(key=>[key,value[key]]));
}

function orderedScenario(quantity=75){
  const state=buildRealScenario(`PURCHASE-${quantity}`);
  state.runToken=`PURCHASE-${quantity}`;
  state.purchases=[{id:purchase.id,materialId:'mat-manilha',quantity,status:'ordered',expectedAt:purchase.expectedArrival}];
  return state;
}

function receivedScenario(quantity=75){
  const state=orderedScenario(quantity);
  state.purchases[0].status='received';
  state.materials.find(item=>item.id==='mat-manilha').stock+=quantity;
  state.cash.currentCents-=quantity*10_000;
  return state;
}

test('pedido mock é registrado com logística, vínculo e histórico',()=>{
  const next=applyLiveTestEvent(liveSession(),purchase);
  assert.equal(next.state.purchaseRequests.length,1);
  assert.deepEqual(pick(next.state.purchaseRequests[0],[
    'id','status','stageId','activityId','quantity','unit','expectedArrival'
  ]),{
    id:purchase.id,status:'ordered',stageId:'stage-drenagem',activityId:'act-drenagem-conferencia',
    quantity:75,unit:'m',expectedArrival:'2026-09-03'
  });
  assert.equal(next.history.at(-1).type,'purchase.ordered');
});

test('recebimento propaga uma vez para compra, estoque e caixa',()=>{
  const ordered=applyLiveTestEvent(liveSession(),purchase);
  const received=applyLiveTestEvent(ordered,receipt);
  assert.equal(received.state.purchaseRequests[0].status,'received');
  assert.deepEqual(pick(received.state.inventoryMovements[0],[
    'kind','quantity','unit','sourceType','sourceId'
  ]),{
    kind:'entrada',quantity:75,unit:'m',sourceType:'live-test-receipt',sourceId:purchase.id
  });
  assert.deepEqual(pick(received.state.cashEntries[0],[
    'id','kind','amountCents','category'
  ]),{
    id:`CASH-${purchase.id}`,kind:'saida',amountCents:750_000,category:'Compra recebida'
  });
  const replayed=applyLiveTestEvent(received,receipt);
  assert.equal(replayed.state.inventoryMovements.length,1,'reenvio não pode duplicar estoque');
  assert.equal(replayed.state.cashEntries.length,1,'reenvio não pode duplicar caixa');
});

test('compra pendente evita pedido duplicado mas não libera atividade sem estoque físico',()=>{
  const loop=runReferenceOperationalLoop(orderedScenario());
  assert.equal(Boolean(findByActivity(loop.schedule,'act-drenagem-conferencia')),false);
  assert.match(reasonText(findByActivity(loop.blocked,'act-drenagem-conferencia')),/material|estoque/i);
  assert.equal(loop.purchasing.proposals.some(item=>item.materialId==='mat-manilha'),false);
});

test('recebimento parcial mantém bloqueio e recalcula somente o saldo faltante',()=>{
  const loop=runReferenceOperationalLoop(receivedScenario(30));
  assert.equal(Boolean(findByActivity(loop.schedule,'act-drenagem-conferencia')),false);
  const proposal=loop.purchasing.proposals.find(item=>item.materialId==='mat-manilha');
  assert.deepEqual(pick(proposal,['missingQuantity','purchaseQuantity','action']),{
    missingQuantity:45,purchaseQuantity:45,action:'purchase_suggested'
  });
});

test('recebimento integral libera atividade e produz agenda com horários válidos',()=>{
  const loop=runReferenceOperationalLoop(receivedScenario());
  const item=findByActivity(loop.schedule,'act-drenagem-conferencia');
  assert.ok(item,'atividade deveria entrar no cronograma após material recebido');
  assert.equal(item.foremanId,'enc-jose');
  assert.equal(item.localityId,'frente-norte');
  assert.ok(Date.parse(item.end)>Date.parse(item.start));
  assertNoOverlap(loop.schedule,'enc-jose');
  assertNoOverlap(loop.schedule,'enc-marcos');
  assert.ok(loop.notifications.some(note=>note.activityId===item.activityId&&note.recipientId==='enc-jose'));
});

test('caixa disponível limita compra sem consumir a reserva operacional',()=>{
  const state=buildRealScenario('PURCHASE-CASH');
  state.runToken='PURCHASE-CASH';
  state.cash.currentCents=state.cash.committedCents+state.cash.reserveCents+300_000;
  const loop=runReferenceOperationalLoop(state);
  const proposal=loop.purchasing.proposals.find(item=>item.materialId==='mat-manilha');
  assert.deepEqual(pick(proposal,['missingQuantity','purchaseQuantity','action','costCents']),{
    missingQuantity:75,purchaseQuantity:30,action:'purchase_partial',costCents:300_000
  });
  assert.equal(loop.purchasing.remainingCents,0);
});

test('commit propaga agenda, snapshot e notificações individualizadas no RTDB mock',async()=>{
  const scenario=receivedScenario();
  scenario.materials.find(item=>item.id==='mat-manilha').nextCycleNeed=200;
  const services=createMockExternalServices({scenario,commercial:buildCommercialScenario('PURCHASE-MOCK')});
  const request=new Request('https://mock.worker.local/api/operational-loop',{
    method:'POST',headers:{authorization:`Bearer ${services.adminToken}`,'content-type':'application/json'},
    body:JSON.stringify({mode:'commit',context:scenario,options:{persist:true,explain:true}})
  });
  const response=await services.workerFetch(request);
  const payload=await response.json();
  assert.equal(response.status,201);
  assert.ok(payload.realtime.eventId);
  assert.ok(services.firebaseDb.operationalEvents?.[payload.realtime.eventId]);
  assert.ok(services.firebaseDb.operationalSnapshots?.operationalLoop);
  assert.ok(services.firebaseDb.agenda?.['enc-jose']?.['act-drenagem-conferencia']);
  assert.ok(services.firebaseDb.notifications?.foreman?.['enc-jose']);
  assert.ok(services.firebaseDb.notifications?.supplies);
});

test('repetir o commit atualiza as mesmas chaves de agenda e notificação',async()=>{
  const scenario=receivedScenario();
  const services=createMockExternalServices({scenario,commercial:buildCommercialScenario('PURCHASE-REPLAY')});
  const commit=async()=>{
    const response=await services.workerFetch(new Request('https://mock.worker.local/api/operational-loop',{
      method:'POST',headers:{authorization:`Bearer ${services.adminToken}`,'content-type':'application/json'},
      body:JSON.stringify({mode:'commit',context:scenario,options:{persist:true}})
    }));
    assert.equal(response.status,201);
  };
  await commit();
  const agendaBefore=Object.keys(services.firebaseDb.agenda?.['enc-jose']||{}).sort();
  const notificationsBefore=Object.keys(services.firebaseDb.notifications?.foreman?.['enc-jose']||{}).sort();
  await commit();
  assert.deepEqual(Object.keys(services.firebaseDb.agenda?.['enc-jose']||{}).sort(),agendaBefore);
  assert.deepEqual(Object.keys(services.firebaseDb.notifications?.foreman?.['enc-jose']||{}).sort(),notificationsBefore);
});
