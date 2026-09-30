import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';
import {runSystemTransition} from '../../desktop/system-model/operational-core.mjs';
import {
  realityBase,
  withEnoughBrita,
  serviceReportedState,
  verifiedServiceState,
  partialStageState
} from './reality-fixtures.mjs';
import {realityCase} from './reality-terminal.mjs';

const LIVE=process.env.BELAVISTA_OPENJEV_LIVE==='1';
let client;
let health;
let realCalls=0;

const flow=event=>[
  {point:'REALITY STATE',label:'estado operacional completo do cenário'},
  {point:'FACT REDUCER',label:`aplica ${event} em memória com invariantes factuais`},
  {point:'OPENJEV HTTP',label:'POST /v1/systemone no processo local real'},
  {point:'MiniCPM5 2B',label:'inferência real: readiness + agenda + notify + stage action'},
  {point:'RECONCILER',label:'materializa os efeitos derivados da resposta real'}
];

function answer(result,id){
  return result.decisionResponse?.answers?.[id]||{};
}
function choice(result,id){
  return String(answer(result,id).choice||'');
}
function activityId(){return 'act-fechamento';}
const qGate=()=>`activity:${activityId()}:execution_gate`;
const qAgenda=()=>`activity:${activityId()}:agenda`;
const qNotify=()=>`activity:${activityId()}:notify`;
const qStage=()=>`stage:stage-drenagem:action`;

async function infer(previousState,event){
  realCalls++;
  return runSystemTransition({previousState,event,client});
}

before(async()=>{
  if(!LIVE)return;
  client=new OpenJevClient();
  health=await client.health();
  assert.equal(health.ready,true,'OpenJEV /health não está ready.');
  assert.match(String(health.model||''),/minicpm/i,`O checkpoint carregado não parece MiniCPM: ${health.model}`);
  console.log('\n[REALITY ENGINE]');
  console.log(JSON.stringify({
    endpoint:process.env.BELAVISTA_OPENJEV_URL||'http://127.0.0.1:8090',
    ready:health.ready,
    model:health.model,
    llamaReachable:health.llama_reachable,
    workers:health.workers,
    queueDepth:health.queue_depth
  },null,2));
});

test('REAL 01 — falta de brita bloqueia fechamento',async t=>{
  if(!LIVE){t.skip('Defina BELAVISTA_OPENJEV_LIVE=1');return;}
  await realityCase({
    id:'REAL-01 MATERIAL BLOCK',
    title:'5 m3 de brita para requisito de 30 m3 deve impedir readiness',
    flow:flow('inventory.adjustment.recorded delta=0')
  },async g=>{
    const result=await infer(realityBase(),{
      id:'REAL-01-EVENT',
      type:'inventory.adjustment.recorded',
      payload:{materialId:'mat-brita',deltaQuantity:0}
    });
    g.info('model',result.decisionResponse.model);
    if(result.decisionResponse.clientMeta){
      g.info('decision method',`${result.decisionResponse.clientMeta.requestedMethod} -> ${result.decisionResponse.clientMeta.effectiveMethod}${result.decisionResponse.clientMeta.fallback?' (fallback)':''}`);
    }
    g.info('elapsed',`${result.decisionResponse.clientElapsedMs??result.decisionResponse.elapsedMs} ms`);
    g.model(qGate(),answer(result,qGate()));
    g.model(qAgenda(),answer(result,qAgenda()));
    g.model(qNotify(),answer(result,qNotify()));
    g.check('MiniCPM bloqueia por realidade insuficiente',choice(result,qGate())==='hold',choice(result,qGate()));
    g.check('estoque factual continua 5 m3',result.state.materials.find(x=>x.id==='mat-brita').stock===5);
  });
});

test('REAL 02 — recebimento suficiente torna atividade executável',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-02 RECEIPT UNLOCK',
    title:'recebimento leva brita de 5 para 35 m3; demais requisitos já estão satisfeitos',
    flow:flow('purchase.receipt.received')
  },async g=>{
    const result=await infer(realityBase(),{
      id:'REAL-02-EVENT',
      type:'purchase.receipt.received',
      payload:{
        purchaseId:'purchase-brita',
        items:[{materialId:'mat-brita',quantity:30}],
        evidence:[{id:'NF-REAL-02',kind:'purchase-receipt'}]
      }
    });
    g.info('elapsed',`${result.decisionResponse.clientElapsedMs??result.decisionResponse.elapsedMs} ms`);
    g.model(qGate(),answer(result,qGate()));
    g.model(qStage(),answer(result,qStage()));
    g.check('estoque factual = 35 m3',result.state.materials.find(x=>x.id==='mat-brita').stock===35);
    g.check('MiniCPM não mantém bloqueio por falta de brita',choice(result,qGate())==='allow',choice(result,qGate()));
  });
});

test('REAL 03 — atraso de compra bloqueia e reage sobre agenda',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-03 SUPPLIER DELAY',
    title:'atividade depende de material em falta e fornecedor adia entrega',
    flow:flow('purchase.delivery.delayed')
  },async g=>{
    const result=await infer(realityBase(),{
      id:'REAL-03-EVENT',
      type:'purchase.delivery.delayed',
      payload:{purchaseId:'purchase-brita',expectedAt:'2026-10-05T08:00:00-03:00'}
    });
    g.info('elapsed',`${result.decisionResponse.clientElapsedMs??result.decisionResponse.elapsedMs} ms`);
    g.model(qGate(),answer(result,qGate()));
    g.model(qAgenda(),answer(result,qAgenda()));
    g.model(qNotify(),answer(result,qNotify()));
    g.check('readiness blocked',choice(result,qGate())==='hold',choice(result,qGate()));
    g.check('agenda reage ao atraso',/reschedule|cancel/.test(choice(result,qAgenda())),choice(result,qAgenda()));
    g.check('reconciler marca agenda alterada',result.state.agenda.some(x=>/needs_reschedule|cancelled/.test(String(x.status))));
  });
});

test('REAL 04 — choque de caixa abaixo do requisito bloqueia serviço',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-04 CASH STRESS',
    title:'material suficiente, mas saída deixa caixa livre abaixo de R$ 30 mil',
    flow:flow('cash.outflow.recorded')
  },async g=>{
    const base=withEnoughBrita();
    const result=await infer(base,{
      id:'REAL-04-EVENT',
      type:'cash.outflow.recorded',
      payload:{amountCents:7000000,description:'pagamento extraordinário'}
    });
    g.info('freeCents factual',String(result.factualState.cash.freeCents));
    g.model(qGate(),answer(result,qGate()));
    g.model(qAgenda(),answer(result,qAgenda()));
    g.model(qNotify(),answer(result,qNotify()));
    g.check('caixa livre < 3.000.000',result.factualState.cash.freeCents<3000000,String(result.factualState.cash.freeCents));
    g.check('MiniCPM bloqueia por incapacidade financeira',choice(result,qGate())==='hold',choice(result,qGate()));
  });
});

test('REAL 05 — aceite de assignment não pode ser lido como conclusão',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-05 ASSIGNMENT ACCEPT',
    title:'encarregado aceitou o serviço; execução física ainda não ocorreu',
    flow:flow('service.assignment.accepted')
  },async g=>{
    const base=withEnoughBrita();
    base.serviceAssignments=[{
      id:'asg-fechamento',
      activityId:'act-fechamento',
      stageId:'stage-drenagem',
      localityId:'frente-norte',
      assigneeIds:['enc-norte'],
      status:'assigned'
    }];
    const result=await infer(base,{
      id:'REAL-05-EVENT',
      type:'service.assignment.accepted',
      payload:{assignmentId:'asg-fechamento'}
    });
    g.model(qGate(),answer(result,qGate()));
    g.model(qStage(),answer(result,qStage()));
    g.check('fato: assignment accepted',result.factualState.serviceAssignments[0].status==='accepted');
    g.check('fato: atividade continua não concluída',result.factualState.activities[0].status!=='complete');
    g.check('modelo não declara atividade completed',choice(result,qGate())!=='complete',choice(result,qGate()));
  });
});

test('REAL 06 — NFS de 45% não equivale a serviço concluído',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-06 SERVICE INVOICE',
    title:'nota de serviço paga registra 45% declarado, mas não é evidência final',
    flow:flow('service.invoice.recorded')
  },async g=>{
    const result=await infer(withEnoughBrita(),{
      id:'REAL-06-EVENT',
      type:'service.invoice.recorded',
      payload:{
        document:{number:'NFS-REAL-06',supplier:'Prestador de drenagem',amountCents:700000},
        paymentStatus:'paid',
        activityId:'act-fechamento',
        stageId:'stage-drenagem',
        reportedProgressPercent:45
      }
    });
    g.model(qGate(),answer(result,qGate()));
    g.model(qStage(),answer(result,qStage()));
    g.check('progresso factual = 45%',result.factualState.activities[0].progressPercent===45);
    g.check('fato não conclui atividade',result.factualState.activities[0].status!=='complete');
    g.check('MiniCPM não trata NFS como conclusão física',choice(result,qGate())!=='complete',choice(result,qGate()));
    g.check('MiniCPM não completa etapa',choice(result,qStage())!=='complete',choice(result,qStage()));
  });
});

test('REAL 07 — foto pendente não satisfaz gate de conclusão',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-07 IMAGE PENDING',
    title:'serviço 90% relatado + foto pending_verification ainda não autoriza conclusão',
    flow:flow('service.evidence.image.submitted')
  },async g=>{
    const result=await infer(serviceReportedState(),{
      id:'REAL-07-EVENT',
      type:'service.evidence.image.submitted',
      payload:{
        evidenceId:'img-reality-pending',
        assignmentId:'asg-fechamento',
        activityId:'act-fechamento',
        uri:'local://reality/pending.jpg'
      }
    });
    g.model(qGate(),answer(result,qGate()));
    g.model(qStage(),answer(result,qStage()));
    g.check('foto está pending_verification',result.factualState.evidence.some(x=>x.id==='img-reality-pending'&&x.status==='pending_verification'));
    g.check('modelo não conclui atividade',choice(result,qGate())!=='complete',choice(result,qGate()));
    g.check('modelo não completa etapa',choice(result,qStage())!=='complete',choice(result,qStage()));
  });
});

test('REAL 08 — evidência verificada + confirmação física fecha atividade',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-08 VERIFIED CONFIRM',
    title:'foto supported + confirmação explícita torna atividade completed',
    flow:flow('service.execution.confirmed')
  },async g=>{
    const result=await infer(verifiedServiceState(),{
      id:'REAL-08-EVENT',
      type:'service.execution.confirmed',
      payload:{
        assignmentId:'asg-fechamento',
        activityId:'act-fechamento',
        stageId:'stage-drenagem',
        localityId:'frente-norte',
        stageProgressPercent:100,
        evidenceIds:['img-final']
      }
    });
    g.model(qGate(),answer(result,qGate()));
    g.model(qStage(),answer(result,qStage()));
    g.check('fato: atividade completed',result.factualState.activities[0].status==='completed');
    g.check('atividade factual permanece completed',result.factualState.activities[0].status==='completed',result.factualState.activities[0].status);
    g.check('stage pode completar quando único serviço terminou',choice(result,qStage())==='complete',choice(result,qStage()));
  });
});

test('REAL 09 — etapa parcial não pode ser concluída',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-09 PARTIAL STAGE',
    title:'uma atividade concluída e outra pendente/insuficiente mantém etapa aberta',
    flow:flow('inventory.adjustment.recorded delta=0')
  },async g=>{
    const base=partialStageState();
    // volta brita para insuficiente na atividade pendente
    base.materials.find(x=>x.id==='mat-brita').stock=5;
    const result=await infer(base,{
      id:'REAL-09-EVENT',
      type:'inventory.adjustment.recorded',
      payload:{materialId:'mat-brita',deltaQuantity:0}
    });
    const qPending='activity:act-fechamento:execution_gate';
    g.model(qPending,answer(result,qPending));
    g.model(qStage(),answer(result,qStage()));
    g.check('atividade pendente blocked',choice(result,qPending)==='hold',choice(result,qPending));
    g.check('etapa não completa',choice(result,qStage())!=='complete',choice(result,qStage()));
  });
});

test('REAL 10 — nota de compra paga: caixa + material e nova decisão do modelo',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-10 PURCHASE INVOICE',
    title:'NF paga adiciona 30 m3 de brita, desconta caixa e força reavaliação conjunta',
    flow:flow('purchase.invoice.recorded')
  },async g=>{
    const base=realityBase();
    const result=await infer(base,{
      id:'REAL-10-EVENT',
      type:'purchase.invoice.recorded',
      payload:{
        document:{number:'NF-REAL-10',supplier:'Britagem Real',amountCents:800000},
        paymentStatus:'paid',
        paidAmountCents:800000,
        activityId:'act-fechamento',
        stageId:'stage-drenagem',
        items:[{materialId:'mat-brita',quantity:30}]
      }
    });
    g.info('client elapsed',`${result.decisionResponse.clientElapsedMs??'?'} ms`);
    g.model(qGate(),answer(result,qGate()));
    g.model(qAgenda(),answer(result,qAgenda()));
    g.check('stock brita = 35',result.factualState.materials.find(x=>x.id==='mat-brita').stock===35);
    g.check('caixa desconta exatamente 800000',result.factualState.cash.currentCents===11200000,String(result.factualState.cash.currentCents));
    g.check('modelo reavalia após fato fiscal',Boolean(answer(result,qGate()).choice));
  });
});

test('REAL 11 — calibração contra viés de posição',async t=>{
  if(!LIVE){t.skip();return;}
  await realityCase({
    id:'REAL-11 OPTION ORDER',
    title:'mesmo hard gate false deve produzir HOLD com opções em ordens opostas',
    flow:[
      {point:'FACT',label:'stock=5 required=30 hardGateSatisfied=false'},
      {point:'QUESTION A',label:'allow, hold'},
      {point:'QUESTION B',label:'hold, allow'},
      {point:'MiniCPM5',label:'duas decisões reais no mesmo request'},
      {point:'CHECK',label:'semântica deve ser invariável à posição da alternativa'}
    ]
  },async g=>{
    realCalls++;
    const response=await client.decide({
      state:{policy:'hardGateSatisfied=false requires HOLD',facts:{stock:5,required:30,hardGateSatisfied:false}},
      questions:{
        allow_first:{type:'choice',instructions:'hardGateSatisfied=false. Choose HOLD.',criteria:{allow:'ALLOW execution',hold:'HOLD execution because gate is false'}},
        hold_first:{type:'choice',instructions:'hardGateSatisfied=false. Choose HOLD.',criteria:{hold:'HOLD execution because gate is false',allow:'ALLOW execution'}}
      }
    });
    g.model('allow_first',response.answers.allow_first);
    g.model('hold_first',response.answers.hold_first);
    g.check('allow-first => hold',response.answers.allow_first?.choice==='hold',String(response.answers.allow_first?.choice));
    g.check('hold-first => hold',response.answers.hold_first?.choice==='hold',String(response.answers.hold_first?.choice));
  });
});

test('REALITY SUMMARY — nenhuma chamada usou test double',t=>{
  if(!LIVE){t.skip();return;}
  assert.ok(realCalls>=11,`esperadas >=11 chamadas reais, obtidas ${realCalls}`);
  assert.ok(health?.ready);
  console.log(`\n[REALITY SUMMARY] real OpenJEV calls=${realCalls} model=${health.model}`);
});
