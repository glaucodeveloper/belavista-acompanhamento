import assert from 'node:assert/strict';
import {findMaterial,findActivity,findPersonnel} from '../helpers.mjs';

export function validateEventEffect(type,before,after,event){
  const p=event.payload||{};
  switch(type){
    case 'cash.outflow.recorded': assert.equal(after.cash.currentCents,before.cash.currentCents-p.amountCents); break;
    case 'cash.inflow.recorded': assert.equal(after.cash.currentCents,before.cash.currentCents+p.amountCents); break;
    case 'cash.reserve.changed': assert.equal(after.cash.reserveCents,p.reserveCents); break;
    case 'purchase.receipt.received':
      for(const item of p.items||[])assert.equal(findMaterial(after,item.materialId).stock,findMaterial(before,item.materialId).stock+item.quantity);
      break;
    case 'material.consumption.recorded':
      for(const item of p.items||[])assert.equal(findMaterial(after,item.materialId).stock,findMaterial(before,item.materialId).stock-item.quantity);
      break;
    case 'inventory.adjustment.recorded': assert.equal(findMaterial(after,p.materialId).stock,findMaterial(before,p.materialId).stock+p.deltaQuantity); break;
    case 'purchase.delivery.delayed': {
      const po=after.purchases.find(x=>x.id===p.purchaseId);assert.equal(po?.expectedAt,p.newExpectedAt);break;
    }
    case 'field.diary.recorded':
      assert.ok(after.diary.some(x=>x.activityId===p.activityId));
      if(/complete|conclu/i.test(p.status||''))assert.match(String(findActivity(after,p.activityId)?.status),/complete|conclu/i);
      for(const ev of p.evidence||[])assert.ok(after.evidence.some(x=>x.id===ev.id));
      break;
    case 'field.photo.registered': assert.ok(after.evidence.some(x=>x.id===p.evidence?.id)); break;
    case 'activity.blocker.reported': assert.ok(after.blockers.some(x=>x.activityId===p.activityId&&String(x.status||'active')!=='cleared')); break;
    case 'activity.blocker.cleared': assert.ok(!after.blockers.some(x=>x.activityId===p.activityId&&String(x.status||'active')==='active')||after.blockers.some(x=>x.activityId===p.activityId&&/clear|resolv/i.test(String(x.status)))); break;
    case 'activity.duration.reestimated': assert.equal(findActivity(after,p.activityId)?.durationMinutes,p.durationMinutes); break;
    case 'personnel.absence.reported': assert.ok(findPersonnel(after,p.personId)?.absence||findPersonnel(after,p.personId)?.active===false||findPersonnel(after,p.personId)?.availability?.length===0); break;
    case 'personnel.returned': assert.notEqual(findPersonnel(after,p.personId)?.active,false); break;
    case 'personnel.locality.changed': assert.equal(findPersonnel(after,p.personId)?.localityId,p.toLocalityId); break;
    case 'personnel.availability.updated': assert.equal(findPersonnel(after,p.personId)?.active,p.active); break;
    case 'stage.meta.updated': {
      const st=after.stages.find(x=>x.id===p.stageId);assert.ok(st);for(const [k,v] of Object.entries(p.patch||{}))assert.deepEqual(st[k],v);break;
    }
    case 'activity.meta.updated': {
      const a=after.activities.find(x=>x.id===p.activityId);assert.ok(a);for(const [k,v] of Object.entries(p.patch||{}))assert.deepEqual(a[k],v);break;
    }
    case 'evidence.approved': assert.ok(after.evidence.some(x=>x.id===p.evidence?.id&&/approv|aprov/i.test(String(x.status||'approved')))); break;
    case 'evidence.rejected': assert.ok(after.evidence.some(x=>x.id===p.evidenceId&&/reject|rejeit/i.test(String(x.status||'')))); break;
    case 'material.requirement.declared': assert.ok(after.materials.some(x=>x.id===p.material?.id)); break;
    case 'activity.declared': assert.ok(after.activities.some(x=>x.id===p.activity?.id)); break;
    case 'cash.request.denied': assert.ok(after.cashRequests.some(x=>x.id===p.requestId&&/denied|negad/i.test(String(x.status)))); break;
    case 'purchase.request.approved': assert.ok(after.resourceRequests.some(x=>x.id===p.requestId&&/approv|aprov|ordered|pedido/i.test(String(x.status)))||after.purchases.some(x=>x.materialId===p.materialId&&x.quantity>=p.approvedQuantity)); break;
    case 'purchase.cancelled': assert.ok(after.purchases.some(x=>x.id===p.purchaseId&&/cancel/i.test(String(x.status)))); break;
    case 'locality.created': assert.ok(after.localities.some(x=>x.id===p.locality?.id)); break;
    case 'personnel.assigned': assert.ok(after.personnel.some(x=>x.id===p.person?.id&&x.localityId===p.person.localityId)); break;
    case 'agenda.item.accepted': assert.ok(after.agenda.some(x=>x.id===p.agendaItemId&&/accept|aceit|confirm/i.test(String(x.status)))); break;
    case 'agenda.item.completed': assert.ok(after.agenda.some(x=>x.id===p.agendaItemId&&/complete|conclu/i.test(String(x.status)))); break;
    case 'operation.note.recorded': assert.ok(after.diary.length>=before.diary.length||after.notifications.length>=before.notifications.length); break;
  }
}
