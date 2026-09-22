import test from 'node:test';import assert from 'node:assert/strict';
import {buildConstraintSchedule} from '../src/operational-loop.js';
import {DEFAULT_STAGES_CONFIG,DEFAULT_PERSONNEL_CONFIG} from '../src/demo-defaults.js';

test('cronograma nasce das restrições; importância e custo só ordenam alternativas de provisão já possíveis',()=>{
  const cashEntries=[{kind:'entrada',amountCents:68000000},{kind:'saida',amountCents:21400000}];
  const inventoryMovements=[
    {kind:'entrada',materialName:'Tubo/manilha de drenagem',quantity:85},{kind:'entrada',materialName:'Brita',quantity:24},{kind:'entrada',materialName:'Areia',quantity:18},
    {kind:'entrada',materialName:'Tubo PEAD',quantity:620},{kind:'entrada',materialName:'Conexões PEAD',quantity:72},{kind:'entrada',materialName:'Ramais de água',quantity:46},{kind:'entrada',materialName:'Cavaletes',quantity:54},
    {kind:'entrada',materialName:'Poste',quantity:24},{kind:'entrada',materialName:'Cabo elétrico',quantity:1700},{kind:'entrada',materialName:'Transformador',quantity:1}
  ];
  const result=buildConstraintSchedule({stagesConfig:DEFAULT_STAGES_CONFIG,personnelConfig:DEFAULT_PERSONNEL_CONFIG,cashEntries,inventoryMovements,today:'2026-08-31'});
  assert.equal('priorityScore' in JSON.parse(JSON.stringify(result)),false);
  assert.ok(Array.isArray(result.fundingChoices),'o relatório deve expor combinações de provisão para a UI');
  assert.ok(result.schedule.some(i=>i.stageId==='drenagem'));
  assert.ok(result.schedule.some(i=>i.stageId==='agua'));
  assert.ok(result.schedule.some(i=>i.stageId==='eletrica'));
  assert.ok(result.blocked.some(i=>i.stageId==='pavimentacao'&&i.type==='stage-gate'));
  const allocations=new Map();
  for(const item of result.schedule)for(const [date,people] of Object.entries(item.personnelByDay||{}))for(const p of people){const key=`${p.id}|${date}`;assert.equal(allocations.has(key),false,`recurso duplicado em ${key}`);allocations.set(key,item.id);}
});
