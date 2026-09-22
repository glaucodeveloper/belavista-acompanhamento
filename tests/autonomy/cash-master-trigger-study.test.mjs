import test from 'node:test';
import assert from 'node:assert/strict';
import {agentTree,evaluateAgentTree} from '../../agent-tree.js';
import {buildMaterialPlan} from '../../worker/src/orchestrator.js';
import {publishPlanningRealtime} from '../../worker/src/realtime.js';
import {sendWhatsAppMessage} from '../../worker/src/whatsapp.js';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');

function findNode(id){
  const visit=nodes=>{
    for(const node of nodes||[]){
      if(node.id===id)return node;
      const found=visit(node.children);
      if(found)return found;
    }
    return null;
  };
  return visit(agentTree.roots);
}

test('gatilhos do agente cobrem caixa, calibração, produção e Coelba',()=>{
  const cases=[
    ['cash.changed','recalculate.readiness','AUTO'],
    ['cash.negative','notify.cash-risk','AUTO'],
    ['calibration.changed','recalculate.readiness','AUTO'],
    ['production.measured','calculate.earthwork-volume','AUTO'],
    ['production.measured','calculate.paving-production','AUTO'],
    ['paving.completed','request.coelba-connection','CONFIRMAR'],
    ['coelba.deadline-near','notify.coelba-deadline','AUTO']
  ];
  for(const [event,action,autonomy] of cases){
    const result=evaluateAgentTree({event});
    assert.ok(result.signals.some(signal=>signal.action===action&&signal.autonomy===autonomy),`${event} não produziu ${action}`);
  }
  assert.equal(evaluateAgentTree({event:'paving.completed'}).requiresApproval,true,'pedido à Coelba deve exigir confirmação humana');
});

test('administração mantém Dono no caixa e Administrador nas calibrações',async()=>{
  const cash=findNode('cash-owner'),calibration=findNode('system-calibration');
  assert.match(cash.requirements.join(' '),/somente o perfil Dono altera/i);
  assert.match(calibration.requirements.join(' '),/somente Administrador altera/i);
  const server=await readFile(join(root,'server.mjs'),'utf8');
  assert.match(server,/cashFlowApi[\s\S]{0,500}requireRoles\(req,\['owner'\]\)/);
  assert.match(server,/api\/calibrations[\s\S]{0,300}requireRoles\(req,\['admin'\]\)/);
  assert.match(server,/const recordRoles=\['owner','admin','foreman'\]/);
});

const planningData={
  projects:[{id:'alianca',priority:5,reserveCents:10000,status:'active'}],
  activities:[
    {id:'agua',projectId:'alianca',title:'Rede de água',priority:5,critical:true,status:'planned'},
    {id:'pav',projectId:'alianca',title:'Pavimentação',priority:1,status:'planned'}
  ],
  dependencies:[],inventoryMovements:[],purchaseRequests:[],cashForecasts:[],
  materialRequirements:[
    {id:'req-agua',projectId:'alianca',activityId:'agua',stageName:'Rede de Água',materialName:'Tubo PEAD',quantity:10,unit:'m',unitCostCents:5000,neededBy:'2026-09-04',status:'planned'},
    {id:'req-pav',projectId:'alianca',activityId:'pav',stageName:'Pavimentação',materialName:'Paralelepípedo',quantity:20,unit:'m²',unitCostCents:5000,neededBy:'2026-09-05',status:'planned'}
  ]
};

test('caixa é atributo mestre: desconta reserva, ordena necessidade e não reutiliza saldo',()=>{
  const plan=buildMaterialPlan({...planningData,cashEntries:[{kind:'entrada',amountCents:110000}]},{today:'2026-09-01'});
  assert.equal(plan.availableCents,110000);
  assert.equal(plan.reserveCents,10000);
  assert.equal(plan.decisions[0].requirement.activityId,'agua','rede de água deve receber a primeira provisão');
  assert.equal(plan.decisions[0].action,'purchase_suggested');
  assert.equal(plan.decisions[1].action,'purchase_partial');
  assert.equal(plan.allocatedCents,100000,'a alocação não pode exceder o caixa provisionável');
  assert.ok(plan.decisions.reduce((sum,item)=>sum+item.allocatedCents,0)<=plan.availableCents-plan.reserveCents);

  const afterInflow=buildMaterialPlan({...planningData,cashEntries:[{kind:'entrada',amountCents:160000}]},{today:'2026-09-01'});
  assert.equal(afterInflow.decisions[1].action,'purchase_suggested','novo aporte deve reavaliar a pavimentação');
  assert.equal(afterInflow.allocatedCents,150000);
});

test('dependência bloqueia a atividade mesmo com material disponível',()=>{
  const data={...planningData,activities:planningData.activities.map(item=>item.id==='pav'?{...item,priority:999}:item),dependencies:[{activityId:'pav',dependsOnActivityId:'agua'}],inventoryMovements:[{projectId:'alianca',materialName:'Paralelepípedo',unit:'m²',kind:'entrada',quantity:20}],cashEntries:[]};
  const plan=buildMaterialPlan(data,{today:'2026-09-01'});
  const decision=plan.decisions.find(item=>item.requirement.activityId==='pav');
  assert.equal(decision.action,'blocked_dependency');
  assert.deepEqual(decision.dependency.blockedBy,['agua']);
});

test('pendência operacional entra na ordem da IA e bloqueia a atividade relacionada',()=>{
  const plan=buildMaterialPlan({...planningData,inventoryMovements:[{projectId:'alianca',materialName:'Tubo PEAD',unit:'m',kind:'entrada',quantity:10}],pending:[{id:'P-1',activityId:'agua',title:'Liberar licença de travessia',status:'pending'}]},{today:'2026-09-01'});
  const decision=plan.decisions.find(item=>item.requirement.activityId==='agua');
  assert.equal(decision.action,'blocked_pending');
  assert.equal(decision.pending.items[0].title,'Liberar licença de travessia');
  assert.equal(plan.pendingCount,1);
});

test('gatilho publica snapshot e notificações por canal no Firebase Realtime Database',async()=>{
  const previousFetch=globalThis.fetch;
  let request=null;
  globalThis.fetch=async(url,init)=>{request={url:String(url),init};return new Response('{}',{status:200});};
  try{
    const result=await publishPlanningRealtime({FIREBASE_DATABASE_URL:'https://example.firebaseio.com',FIREBASE_NOTIFICATION_CHANNELS:'owner,admin,foreman'}, {
      run:{id:'PLAN-STUDY',createdAt:'2026-09-01T10:00:00.000Z'},
      plan:{cashState:'yellow',availableCents:110000,reserveCents:10000,materialNeedCents:150000,allocatedCents:100000,coverage:.6667,decisions:[{id:'d'}]},
      explanation:{provider:'nvidia-api'},
      notifications:[{id:'NTF-CASH',severity:'warning',title:'Caixa insuficiente',message:'Revisar aporte.',entityType:'cash',entityId:'alianca'}]
    });
    assert.equal(result.notificationCount,1);
    assert.equal(result.channels.join(','),'owner,admin,foreman');
    const updates=JSON.parse(request.init.body);
    assert.equal(updates['operationalSnapshots/materialPlanning'].cashState,'yellow');
    for(const role of ['owner','admin','foreman'])assert.equal(updates[`notifications/${role}/NTF-CASH`].status,'unread');
  }finally{globalThis.fetch=previousFetch;}
});

test('WhatsApp permanece somente como pseudo-notificação no listener do RTDB',async()=>{
  const skipped=await sendWhatsAppMessage({}, {to:'5571999999999',text:'teste'});
  assert.equal(skipped.sent,false);
  assert.equal(skipped.skipped,true);
  assert.equal(skipped.pseudo,true);
  assert.equal(skipped.queued,true);
  assert.equal(skipped.channel,'firebase-realtime-listener');
  const configured=await sendWhatsAppMessage({legacySettings:'ignored'},{text:'Caixa recalculado.'});
  assert.equal(configured.sent,false);
  assert.equal(configured.pseudo,true);
});

test('bootstrap do Worker resolve os módulos do agente sem dependências ausentes',async()=>{
  const worker=await import('../../worker/src/index.js');
  assert.equal(typeof worker.default.fetch,'function');
  assert.equal(typeof worker.default.scheduled,'function');
});
