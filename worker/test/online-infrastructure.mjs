import assert from 'node:assert/strict';

const workerBase=(process.env.BELAVISTA_WORKER_URL||'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/+$/,'');
const hostingBase=(process.env.BELAVISTA_PUBLIC_BASE_URL||'https://belavista-3f887.web.app').replace(/\/+$/,'');
const firebaseBase=(process.env.FIREBASE_DATABASE_URL||'https://belavista-3f887-default-rtdb.firebaseio.com').replace(/\/+$/,'');
const runToken=`ONLINE-${Date.now().toString(36).toUpperCase()}`;
const ids={
  project:`PRJ-${runToken}`,
  activity:`ACT-${runToken}`,
  requirement:`REQ-${runToken}`,
  cash:`CASH-${runToken}`,
  purchase:`BUY-REQ-${runToken}`
};

async function request(url,{method='GET',body}={}){
  const response=await fetch(url,{
    method,
    headers:body?{'content-type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined
  });
  const text=await response.text();
  let payload;
  try{payload=text?JSON.parse(text):null;}catch{payload=text;}
  assert.ok(response.ok,`${method} ${url} falhou (${response.status}): ${text.slice(0,500)}`);
  return payload;
}

const api=(path,options)=>request(`${workerBase}${path}`,options);
const firebase=path=>request(`${firebaseBase}/${path}.json`);

async function main(){
  const startedAt=new Date().toISOString();
  const indexHtml=await request(`${hostingBase}/?online-test=${runToken}`);
  const foremanResponse=await fetch(`${hostingBase}/encarregados.html?online-test=${runToken}`);
  const foremanHtml=await foremanResponse.text();
  assert.match(indexHtml,/belavista-ai-base/i,'O app publicado não declara a base de IA.');
  assert.match(indexHtml,new RegExp(workerBase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'O app publicado não aponta para o Worker real.');
  assert.ok(!foremanResponse.ok||!(/Confirme o que foi executado|Portal do encarregado/i.test(foremanHtml)),'O portal legado de encarregado ainda está publicado.');

  const health=await api('/api/health');
  assert.equal(health.ok,true);
  assert.equal(health.service,'belavista-cloudflare-worker');

  const status=await api('/api/ai/status');
  assert.equal(status.nvidia?.configured,true,'NVIDIA_API_KEY não está configurada no Worker.');

  const directInference=await api('/api/ai?explain=1',{
    method:'POST',
    body:{
      view:'online-infrastructure-test',
      message:'Analise caixa, materiais e atividade e retorne o próximo passo operacional.',
      context:{runToken,cashChangeCents:2_500_000,material:'Manilha de concreto 800 mm',quantity:12}
    }
  });
  assert.equal(directInference.provider,'nvidia-api','A chamada direta não chegou à NVIDIA API pelo Worker.');
  assert.ok(directInference.text,'A NVIDIA não retornou texto operacional.');

  await api('/api/projects',{method:'POST',body:{id:ids.project,name:`Obra teste online ${runToken}`,priority:100,reserveCents:0,status:'active'}});
  await api('/api/activities',{method:'POST',body:{id:ids.activity,projectId:ids.project,stageName:'Drenagem Pluvial',title:`Assentar manilhas ${runToken}`,plannedStart:'2026-08-29',plannedEnd:'2026-09-05',owner:'Encarregado online',priority:100,critical:true,status:'planned'}});
  await api('/api/material-requirements',{method:'POST',body:{id:ids.requirement,projectId:ids.project,activityId:ids.activity,stageName:'Drenagem Pluvial',materialName:`Manilha 800 mm ${runToken}`,quantity:12,unit:'un',unitCostCents:10_000,neededBy:'2026-09-05',leadTimeDays:2,status:'planned'}});

  const cashBefore=await api('/api/cash-flow');
  const cashChange=await api('/api/cash-flow',{method:'POST',body:{id:ids.cash,kind:'entrada',stage:'Drenagem Pluvial',date:'2026-08-29',category:'Aporte de teste online',description:`Caixa para ${runToken}`,amountCents:2_500_000}});
  assert.equal(cashChange.entry.id,ids.cash);
  assert.equal(cashChange.summary.balanceCents,cashBefore.summary.balanceCents+2_500_000,'O saldo não refletiu a entrada de caixa.');

  const firstPlan=await api('/api/material-planning/run',{method:'POST',body:{trigger:`online-test.${runToken}`,horizonDays:45}});
  assert.equal(firstPlan.explanation?.provider,'nvidia-api','O planejamento automático não usou a NVIDIA API.');
  assert.ok(firstPlan.realtime?.eventId,'O Worker não confirmou a publicação no Realtime Database.');
  const initialDecision=firstPlan.decisions.find(item=>item.requirementId===ids.requirement);
  assert.ok(initialDecision,'O motor não avaliou o requisito de material do teste.');
  assert.match(initialDecision.action,/purchase_suggested|purchase_partial/,'O motor não gerou a compra esperada.');

  const purchases=await api('/api/purchase-requests');
  const purchase=purchases.requests.find(item=>item.id===ids.purchase);
  assert.ok(purchase,'A solicitação de compra não foi persistida.');
  assert.match(purchase.status,/suggested|partial/);

  const agenda=await api('/api/stage-agenda');
  assert.ok(agenda.items.some(item=>item.relation===`material:${ids.requirement}`),'O cronograma/agenda não recebeu a decisão de material.');
  const notifications=await api('/api/notifications');
  assert.ok(notifications.notifications.some(item=>item.entityId===ids.requirement),'A notificação não foi persistida no Worker.');

  const realtimeEvent=await firebase(`operationalEvents/${firstPlan.realtime.eventId}`);
  assert.equal(realtimeEvent?.source,'belavista-cloudflare-worker');
  assert.equal(realtimeEvent?.provider,'nvidia-api');
  for(const channel of ['owner','admin','foreman','supplies']){
    const realtimeNotification=await firebase(`notifications/${channel}/NTF-MAT-${ids.requirement}`);
    assert.equal(realtimeNotification?.source,'belavista-cloudflare-worker',`Canal ${channel} não recebeu a notificação do Worker.`);
    assert.equal(realtimeNotification?.entityId,ids.requirement);
  }

  const received=await api(`/api/purchase-requests/${ids.purchase}`,{method:'PATCH',body:{status:'received'}});
  assert.equal(received.purchaseRequest.status,'received');
  const inventory=await api('/api/inventory-movements');
  assert.ok(inventory.movements.some(item=>item.sourceId===ids.purchase&&item.kind==='entrada'&&item.quantity===12),'O recebimento da compra não adicionou o material ao estoque.');

  const secondPlan=await api('/api/material-planning/run',{method:'POST',body:{trigger:`online-test.received.${runToken}`,horizonDays:45}});
  assert.equal(secondPlan.explanation?.provider,'nvidia-api','O recálculo após a compra não usou a NVIDIA API.');
  const finalDecision=secondPlan.decisions.find(item=>item.requirementId===ids.requirement);
  assert.equal(finalDecision?.action,'activity_ready','A atividade não foi liberada após a entrada do material.');
  const activities=await api('/api/activities');
  assert.equal(activities.activities.find(item=>item.id===ids.activity)?.decisionStatus,'ready');
  const finalRealtimeNotification=await firebase(`notifications/foreman/NTF-MAT-${ids.requirement}`);
  assert.match(finalRealtimeNotification?.message||'',/cobertura em estoque/i,'O encarregado não recebeu a atualização final em tempo real.');

  console.log(JSON.stringify({
    ok:true,
    runToken,
    startedAt,
    finishedAt:new Date().toISOString(),
    endpoints:{hosting:hostingBase,worker:workerBase,firebase:firebaseBase},
    proofs:{
      directNvidiaProvider:directInference.provider,
      planningNvidiaProvider:firstPlan.explanation.provider,
      cashEntryId:ids.cash,
      purchaseRequestId:ids.purchase,
      inventorySourceId:ids.purchase,
      activityDecision:finalDecision.action,
      realtimeEventId:secondPlan.realtime.eventId,
      realtimeChannels:secondPlan.realtime.channels
    }
  },null,2));
}

main().catch(error=>{
  console.error(`ONLINE INFRASTRUCTURE TEST FAILED: ${error.stack||error.message}`);
  process.exitCode=1;
});
