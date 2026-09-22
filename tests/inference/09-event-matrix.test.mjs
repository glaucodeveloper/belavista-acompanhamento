import test from 'node:test';import assert from 'node:assert/strict';
import {buildBaseState} from './fixtures/base-state.mjs';import {E} from './fixtures/events.mjs';import {prepareStateForEvent} from './fixtures/preconditions.mjs';import {validateEventEffect} from './fixtures/effect-validators.mjs';
import {ADMIN_TOKEN,infer,assertStrictNvidia,assertFullState,assertEventApplied,metaTrace,decisions} from './helpers.mjs';
const cases=[
  ['cash.outflow',E.cashShock],['cash.inflow',E.cashInflow],['cash.reserve',E.reserveChange],['receipt.single',E.receiptManilha],['receipt.multi',E.receiptBritaAreia],['material.consume',E.consumeMaterial],['inventory.adjust',E.inventoryCorrection],['supplier.delay',E.supplierDelay],['field.diary',E.drainageConferenceDiary],['field.photo',E.photoEvidence],['blocker.reported',E.blocker],['blocker.cleared',E.blockerCleared],['duration.reestimated',E.durationChange],['absence',E.marcosAbsent],['return',E.marcosReturns],['locality.transfer',E.explicitTransfer],['availability',E.paisagistaActive],['stage.meta',E.stageMeta],['activity.meta',E.activityMeta],['evidence.approved',E.evidenceApproved],['evidence.rejected',E.evidenceRejected],['material.declared',E.newMaterial],['activity.declared',E.newActivity],['cash.denied',E.purchaseDenied],['purchase.approved',E.purchaseApproved],['purchase.cancelled',E.purchaseCancelled],['locality.created',E.localityCreated],['personnel.assigned',E.foremanAssigned],['agenda.accepted',E.agendaAccepted],['agenda.completed',E.agendaCompleted],['operational.note',E.operationalNote]
];
for(const [name,make] of cases){
  test(`evento ${name} → NVIDIA aplica o fato + devolve NOVO ESTADO COMPLETO + reanalisa obra`,async t=>{
    if(!ADMIN_TOKEN){t.skip();return;}
    const ev=make();const raw=buildBaseState(`MATRIX-${name.replace(/\W/g,'')}-${Date.now().toString(36)}`);const prev=prepareStateForEvent(raw,ev.type);
    const r=await infer(prev,ev);assertStrictNvidia(r);const next=assertFullState(r,{previousState:prev});assertEventApplied(r,ev);assert.notEqual(next.version,prev.version,'Versão do estado não mudou após o evento.');
    validateEventEffect(ev.type,prev,next,ev);
    assert.ok(metaTrace(r).length,`Evento ${ev.type} não devolveu metaTrace: a bateria não consegue provar releitura das metadescrições.`);
    assert.ok(decisions(r).length>=prev.activities.length,`Evento ${ev.type} não reanalisou todas as atividades.`);
  });
}
