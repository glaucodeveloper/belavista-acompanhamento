import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMaterialPlan} from '../src/orchestrator.js';

const base={
  projects:[{id:'obra-a',priority:5,reserveCents:10_000,status:'active'}],
  activities:[{id:'atv-a',projectId:'obra-a',title:'Fundação',priority:5,critical:1,status:'planned'}],
  dependencies:[],
  inventoryMovements:[],
  purchaseRequests:[],
  cashForecasts:[],
  materialRequirements:[{
    id:'req-a',projectId:'obra-a',activityId:'atv-a',stageName:'Fundação',materialName:'Cimento',quantity:100,
    unit:'sc',unitCostCents:4_000,neededBy:'2026-09-01',status:'planned'
  }]
};

test('libera a compra completa quando o caixa cobre material e reserva',()=>{
  const plan=buildMaterialPlan({...base,cashEntries:[{kind:'entrada',amountCents:500_000}]},{today:'2026-08-27'});
  assert.equal(plan.cashState,'green');
  assert.equal(plan.decisions[0].action,'purchase_suggested');
  assert.equal(plan.decisions[0].purchaseQuantity,100);
});

test('divide a compra quando o caixa cobre parte da necessidade',()=>{
  const plan=buildMaterialPlan({...base,cashEntries:[{kind:'entrada',amountCents:250_000}]},{today:'2026-08-27'});
  assert.equal(plan.cashState,'yellow');
  assert.equal(plan.decisions[0].action,'purchase_partial');
  assert.equal(plan.decisions[0].purchaseQuantity,60);
});

test('bloqueia a compra quando só existe a reserva de segurança',()=>{
  const plan=buildMaterialPlan({...base,cashEntries:[{kind:'entrada',amountCents:10_000}]},{today:'2026-08-27'});
  assert.equal(plan.cashState,'red');
  assert.equal(plan.decisions[0].action,'blocked_cash');
});

test('desconta estoque e pedidos em aberto da necessidade',()=>{
  const plan=buildMaterialPlan({
    ...base,
    cashEntries:[{kind:'entrada',amountCents:500_000}],
    inventoryMovements:[{projectId:'obra-a',materialName:'Cimento',unit:'sc',kind:'entrada',quantity:30}],
    purchaseRequests:[{requirementId:'req-a',status:'ordered',quantity:70,totalCostCents:280_000}]
  },{today:'2026-08-27'});
  assert.equal(plan.materialNeedCents,0);
  assert.equal(plan.decisions[0].action,'activity_ready');
});
