export function prepareStateForEvent(base,eventType){
  const s=structuredClone(base);
  if(eventType==='cash.request.denied'){
    s.cashRequests.push({id:'cashreq-cabos',activityId:'act-eletrica-cabos-sul',amountCents:690000,status:'requested'});
  }
  if(eventType==='purchase.request.approved'){
    s.resourceRequests.push({id:'resreq-cabos',activityId:'act-eletrica-cabos-sul',materialId:'mat-cabo',quantity:300,unit:'m',status:'requested',estimatedCostCents:690000});
  }
  if(eventType==='agenda.item.accepted'||eventType==='agenda.item.completed'){
    s.agenda.push({id:'agenda-act-drenagem-conferencia',activityId:'act-drenagem-conferencia',localityId:'frente-norte',assigneeIds:['enc-jose'],status:'planned',start:'2026-09-01T07:00:00-03:00',end:'2026-09-01T08:30:00-03:00'});
  }
  if(eventType==='activity.blocker.cleared'){
    s.blockers.push({id:'blk-equip',activityId:'act-drenagem-fechamento',localityId:'frente-norte',kind:'equipment',status:'active',description:'Retroescavadeira indisponível'});
  }
  if(eventType==='evidence.rejected'){
    s.evidence.push({id:'ev-drenagem-conferencia',type:'field-confirmation',status:'pending',activityId:'act-drenagem-conferencia'});
  }
  if(eventType==='personnel.returned'){
    const p=s.personnel.find(x=>x.id==='enc-marcos');p.active=false;p.absence={from:'2026-09-01T07:00:00-03:00',to:'2026-09-02T17:00:00-03:00'};
  }
  return s;
}
