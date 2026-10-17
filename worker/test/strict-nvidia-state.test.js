import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeNvidiaStatePatch,runStrictNvidiaStateTransition,strictNvidiaRuntime} from '../src/strict-nvidia-state.js';

test('strict state defaults to the fast structured JSON model and batches activity analysis',()=>{
  const runtime=strictNvidiaRuntime({});
  assert.equal(runtime.model,'openai/gpt-oss-20b');
  assert.equal(runtime.analysisBatchSize,10);
});

const state=()=>({
  version:'state-1',
  project:{id:'project-1',name:'Aliança Park'},
  localities:[{id:'front-1',name:'Frente 1',status:'active'}],
  stages:[{id:'stage-1',name:'Drenagem',requirements:['projeto']}],
  activities:[
    {id:'activity-1',stageId:'stage-1',title:'Assentar tubulação',status:'planned',requirements:['equipe']},
    {id:'activity-2',stageId:'stage-1',title:'Compactar',status:'blocked'}
  ],
  materials:[{id:'material-1',name:'Tubo',stock:3},{id:'material-2',name:'Areia',stock:5}],
  cash:{currentCents:1000,ledger:[{id:'cash-1',amountCents:-100}]},
  purchases:[{id:'purchase-1',status:'ordered'}],
  evidence:[],agenda:[],notifications:[],personnel:[],resourceRequests:[],cashRequests:[],diary:[],blockers:[],
  stageSectorState:[{stageId:'stage-1',localityId:'front-1',progress:20}],constraints:[],
  commercial:{sales:[{id:'sale-1',status:'pending'}],commissions:[],brokers:[]}
});

test('state patch preserves untouched real entities and shallow-upserts the changed activity',()=>{
  const before=state();
  const after=mergeNvidiaStatePatch(before,{
    version:'state-2',activities:[{id:'activity-1',status:'completed',requirements:['equipe','evidencia']}]
  });
  assert.equal(after.version,'state-2');
  assert.equal(after.activities.length,2);
  assert.deepEqual(after.activities[0],{...before.activities[0],status:'completed',requirements:['equipe','evidencia']});
  assert.deepEqual(after.activities[1],before.activities[1]);
  assert.deepEqual(after.stages,before.stages);
});

test('state patch upserts new inventory, cash ledger, and composite stage-sector rows',()=>{
  const after=mergeNvidiaStatePatch(state(),{
    materials:[{id:'material-1',stock:4},{id:'material-3',name:'Brita',stock:0}],
    cash:{currentCents:900,ledger:[{id:'cash-2',amountCents:-100}]},
    stageSectorState:[{stageId:'stage-1',localityId:'front-1',progress:100}]
  });
  assert.deepEqual(after.materials,[{id:'material-1',name:'Tubo',stock:4},{id:'material-2',name:'Areia',stock:5},{id:'material-3',name:'Brita',stock:0}]);
  assert.deepEqual(after.cash,{currentCents:900,ledger:[{id:'cash-1',amountCents:-100},{id:'cash-2',amountCents:-100}]});
  assert.deepEqual(after.stageSectorState,[{stageId:'stage-1',localityId:'front-1',progress:100}]);
});

test('state patch can update commercial entities without replacing sibling collections',()=>{
  const before=state();
  const after=mergeNvidiaStatePatch(before,{commercial:{sales:[{id:'sale-1',status:'won'},{id:'sale-2',status:'open'}]}});
  assert.deepEqual(after.commercial,{sales:[{id:'sale-1',status:'won'},{id:'sale-2',status:'open'}],commissions:[],brokers:[]});
});

test('state patch rejects non-object payloads and malformed entity arrays',()=>{
  assert.throws(()=>mergeNvidiaStatePatch(state(),[]),/statePatch/);
  assert.throws(()=>mergeNvidiaStatePatch(state(),{activities:{id:'activity-1'}}),/upsert/);
});

test('strict transition runs event, impact, global schedule and audit as four NVIDIA calls',async()=>{
  const previous={
    version:'state-1',project:{id:'project-1',name:'Aliança Park'},clock:{},
    localities:[{id:'loc-1',name:'Frente 1'}],personnel:[],
    stages:[{id:'stage-1',name:'Drenagem',executionDescription:'Instalar rede pluvial',peculiarities:['solo úmido'],requirements:['projeto'],evidenceRequirements:['fotos'],notificationDestinations:['engenharia']}],
    activities:[{id:'activity-1',stageId:'stage-1',localityId:'loc-1',title:'Assentar tubo',executionDescription:'Assentar tubo pluvial',peculiarities:['conferir caimento'],requirements:['equipe'],evidenceRequirements:['foto'],durationMinutes:90,status:'planned'}],
    materials:[],cash:{ledger:[]},purchases:[],evidence:[],agenda:[],notifications:[],resourceRequests:[],cashRequests:[],diary:[],blockers:[],stageSectorState:[],constraints:[],commercial:{sales:[],commissions:[],brokers:[]}
  };
  const event={id:'event-1',type:'operation.state.requested',at:'2026-09-24T08:00:00-03:00',payload:{}};
  const trace=[
    {entityType:'stage',entityId:'stage-1',fieldsUsed:['executionDescription','peculiarities','requirements','evidenceRequirements','notificationDestinations'],consequence:'Requisitos e evidências definem as condições de início.'},
    {entityType:'activity',entityId:'activity-1',fieldsUsed:['executionDescription','peculiarities','requirements','evidenceRequirements','durationMinutes','localityId'],consequence:'A equipe local e a evidência condicionam execução.'}
  ];
  const outputs=[
    '{eventApplied:{"id":"event-1","type":"operation.state.requested","at":"2026-09-24T08:00:00-03:00","payload":{}},statePatch:{"version":"state-2","lastEvent":{"id":"event-1","type":"operation.state.requested","at":"2026-09-24T08:00:00-03:00","payload":{}}}}',
    {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'loc-1',decision:'ready',reasons:'Equipe e projeto disponíveis na frente.'}],metaTrace:trace}},
    {analysis:{schedule:[],blocked:[],summary:'Nenhuma atividade foi liberada sem requisito atendido.'}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    const output=outputs[requests.length-1];
    const content=typeof output==='string'?output:JSON.stringify(output);
    return new Response(JSON.stringify({model:'test-nvidia-model',choices:[{message:{content}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'openai/gpt-oss-20b',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
    assert.equal(requests.length,4);
    assert.equal(requests[0].reasoning_effort,'low');
    assert.equal(Object.hasOwn(requests[0],'top_p'),false);
    assert.deepEqual(requests[0].response_format,{type:'json_object'});
    assert.equal(requests[1].response_format.type,'json_schema');
    assert.equal(requests[1].response_format.json_schema.schema.properties.analysis.properties.possibleActivities.minItems,1);
    assert.equal(requests[1].response_format.json_schema.schema.properties.analysis.properties.metaTrace.minItems,2);
    assert.ok(requests.every(request=>request.max_tokens<=4096));
    assert.match(requests[0].messages[0].content,/Camada 1/);
    assert.match(requests[1].messages[0].content,/Camada 2/);
    assert.match(requests[2].messages[0].content,/Camada 3/);
    const patchContext=JSON.parse(requests[0].messages[1].content);
    assert.equal(patchContext.previousState.contextScope,'read-only event; operational collections remain available to subsequent inference layers');
    assert.equal(patchContext.transitionVersion,'state:event-1');
    assert.equal(Object.hasOwn(patchContext.previousState,'activities'),false);
    assert.deepEqual(patchContext.comprehensionContext,{});
    assert.equal(result.state.version,'state:event-1');
    assert.equal(result.state.activities.length,1);
    assert.deepEqual(result.eventApplied,event);
    assert.equal(result.analysis.possibleActivities.length,1);
    assert.deepEqual(result.inference.phases,['event-patch','activity-meta-analysis','global-schedule-reconciliation','audit']);
    assert.equal(result.inference.strategy,'layered');
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('Nemotron Lightning disables its verbose thinking trace for JSON phases',async()=>{
  const previous={...state(),clock:{},stages:[{id:'stage-1',name:'Drenagem',executionDescription:'Instalar rede pluvial'}],activities:[{id:'activity-1',stageId:'stage-1',localityId:'front-1',title:'Assentar tubo',executionDescription:'Assentar tubo pluvial',status:'planned'}]};
  const event={id:'event-lightning',type:'operation.state.requested',at:'2026-09-24T08:00:00-03:00',payload:{}};
  const trace=[
    {entityType:'stage',entityId:'stage-1',fieldsUsed:['executionDescription'],consequence:'A descrição define o escopo.'},
    {entityType:'activity',entityId:'activity-1',fieldsUsed:['executionDescription','localityId'],consequence:'A atividade permanece vinculada à frente.'}
  ];
  const outputs=[
    {eventApplied:event,statePatch:{version:'state-lightning',lastEvent:event}},
    {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'front-1',decision:'ready',reasons:'As condições registradas permitem avançar.'}],metaTrace:trace}},
    {analysis:{schedule:[],blocked:[],summary:'Sem outros itens para agendar.'}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({model:'nvidia/nemotron-3.5-lightning-30b-a3b',choices:[{message:{content:JSON.stringify(outputs[requests.length-1])}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'nvidia/nemotron-3.5-lightning-30b-a3b',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
    assert.equal(requests.length,4);
    assert.match(requests[0].messages[0].content,/detailed thinking off/i);
    assert.match(requests[1].messages[0].content,/detailed thinking off/i);
    assert.equal(result.state.version,'state:event-lightning');
    assert.equal(result.analysis.possibleActivities.length,1);
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('strict transition asks NVIDIA to repair missing activity coverage before accepting it',async()=>{
  const previous={...state(),clock:{},stages:[{id:'stage-1',name:'Drenagem',executionDescription:'Instalar rede pluvial'}],activities:[{id:'activity-1',stageId:'stage-1',localityId:'front-1',title:'Assentar tubo',executionDescription:'Assentar tubo pluvial',status:'planned'}]};
  const event={id:'event-2',type:'operation.state.requested',at:'2026-09-24T08:00:00-03:00',payload:{}};
  const outputs=[
    {eventApplied:event,statePatch:{version:'state-2',lastEvent:event}},
    {analysis:{possibleActivities:[],metaTrace:[]}},
    {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'front-1',decision:'blocked',reasons:'Falta confirmação de requisito.'}],metaTrace:[
      {entityType:'stage',entityId:'stage-1',fieldsUsed:['executionDescription'],consequence:'A descrição da etapa delimita o trabalho.'},
      {entityType:'activity',entityId:'activity-1',fieldsUsed:['executionDescription','localityId'],consequence:'A execução permanece vinculada à frente local.'}
    ]}},
    {analysis:{schedule:[],blocked:[{activityId:'activity-1',reason:'Requisito pendente.'}],summary:'A atividade aguarda confirmação.'}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({model:'test-nvidia-model',choices:[{message:{content:JSON.stringify(outputs[requests.length-1])}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'test-nvidia-model',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
    assert.equal(requests.length,5);
    assert.match(requests[2].messages[0].content,/resposta anterior.*incompleta/i);
    assert.deepEqual(requests[2].messages[1].content.includes('requiredActivityIds'),true);
    assert.equal(result.inference.activityAnalysisSemanticRepairCount,1);
    assert.equal(result.analysis.possibleActivities[0].activityId,'activity-1');
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('GPT-OSS structured schema supports a stage with no activities',async()=>{
  const previous={...state(),clock:{},stages:[{id:'stage-empty',name:'Pavimentação',executionDescription:'Preparar base e pavimentar.'}],activities:[]};
  const event={id:'event-empty-stage',type:'operation.state.requested',at:'2026-09-24T08:00:00-03:00',payload:{}};
  const outputs=[
    {eventApplied:event,statePatch:{version:'state-empty-stage',lastEvent:event}},
    {analysis:{metaTrace:[{entityType:'stage',entityId:'stage-empty',fieldsUsed:['executionDescription'],consequence:'A descrição define a etapa, sem atividades vinculadas.'}]}},
    {analysis:{schedule:[],blocked:[],summary:'Não há atividades cadastradas.'}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({model:'openai/gpt-oss-20b',choices:[{message:{content:JSON.stringify(outputs[requests.length-1])}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'openai/gpt-oss-20b'},{previousState:previous,event});
    const stageSchema=requests[1].response_format.json_schema.schema.properties.analysis.properties;
    assert.equal(Object.hasOwn(stageSchema,'possibleActivities'),false);
    assert.equal(result.analysis.possibleActivities.length,0);
    assert.equal(result.analysis.metaTrace[0].entityId,'stage-empty');
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('NVIDIA audit receives authoritative receipt, consumption, and inventory quantity deltas',async()=>{
  const previous={...state(),clock:{},materials:[{id:'material-1',name:'Tubo',unit:'m',stock:14,receivedQuantity:32,usedQuantity:18}],
    stages:[{id:'stage-1',name:'Drenagem',requirements:['projeto']}],
    activities:[{id:'activity-1',stageId:'stage-1',localityId:'front-1',title:'Assentar tubo',requirements:['equipe'],status:'planned'}]};
  const cases=[
    {id:'receipt',type:'purchase.receipt.received',quantity:1,expected:{stock:15,receivedQuantity:33,usedQuantity:18}},
    {id:'consumption',type:'material.consumption.recorded',quantity:4,expected:{stock:10,receivedQuantity:32,usedQuantity:22}},
    {id:'inventory-adjustment',type:'inventory.adjustment.recorded',quantity:1,expected:{stock:15,receivedQuantity:32,usedQuantity:18}}
  ];
  const originalFetch=globalThis.fetch;
  try{
    for(const scenario of cases){
      const event={id:`event-${scenario.id}`,type:scenario.type,at:'2026-09-24T08:00:00-03:00',payload:scenario.type==='inventory.adjustment.recorded'
        ?{materialId:'material-1',deltaQuantity:scenario.quantity,unit:'m'}
        :{items:[{materialId:'material-1',quantity:scenario.quantity,unit:'m'}]}};
      const trace=[
        {entityType:'stage',entityId:'stage-1',fieldsUsed:['requirements'],consequence:'O projeto é requisito da etapa.'},
        {entityType:'activity',entityId:'activity-1',fieldsUsed:['requirements','localityId'],consequence:'Equipe e frente local condicionam a atividade.'}
      ];
      const outputs=[
        {eventApplied:event,statePatch:{version:'state-ai',lastEvent:event,materials:[{id:'material-1',...scenario.expected}]}},
        {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'front-1',decision:'ready',reasons:'Os requisitos seguem atendidos.'}],metaTrace:trace}},
        {analysis:{schedule:[],blocked:[],summary:'Sem novas liberações.'}},
        {valid:true,errors:[],observations:[]}
      ];
      const requests=[];
      globalThis.fetch=async(_url,init)=>{
        requests.push(JSON.parse(init.body));
        const content=JSON.stringify(outputs[requests.length-1]);
        return new Response(JSON.stringify({model:'test-nvidia-model',choices:[{message:{content}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
      };
      await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'test-nvidia-model',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
      const auditPayload=JSON.parse(requests[3].messages[1].content);
      assert.deepEqual(auditPayload.auditContext.materialAccounting.materialEffects[0].expected,scenario.expected);
      assert.equal(auditPayload.auditContext.materialAccounting.eventKind,scenario.id);
    }
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('GPT-OSS event patch schema requires the declared material and its factual activity link',async()=>{
  const previous={...state(),clock:{},activities:[{id:'activity-1',stageId:'stage-1',localityId:'front-1',title:'Assentar tubulação',executionDescription:'Instalar rede',status:'planned',requirements:['equipe']} ]};
  const event={id:'event-material-requirement',type:'material.requirement.declared',at:'2026-09-24T08:00:00-03:00',actor:{id:'qa',role:'admin'},payload:{activityId:'activity-1',material:{id:'material-new',name:'Brita de QA',unit:'m3',quantity:2}}};
  const trace=[
    {entityType:'stage',entityId:'stage-1',fieldsUsed:['requirements'],consequence:'O requisito de projeto continua condicionando a etapa.'},
    {entityType:'activity',entityId:'activity-1',fieldsUsed:['executionDescription','requirements','localityId'],consequence:'A atividade recebe o novo requisito de material.'}
  ];
  const outputs=[
    {eventApplied:event,statePatch:{version:'state-ai',lastEvent:event,materials:[{id:'material-new',name:'Brita de QA',unit:'m3',quantity:2,activityId:'activity-1'}]}},
    {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'front-1',decision:'ready',reasons:'O requisito está registrado para a atividade.'}],metaTrace:trace}},
    {analysis:{schedule:[],blocked:[],summary:'Sem alteração do cronograma.'}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({model:'openai/gpt-oss-20b',choices:[{message:{content:JSON.stringify(outputs[requests.length-1])}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'openai/gpt-oss-20b',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
    const format=requests[0].response_format;
    assert.equal(format.type,'json_schema');
    assert.equal(format.json_schema.strict,true);
    const statePatchSchema=format.json_schema.schema.properties.statePatch;
    assert.ok(statePatchSchema.required.includes('materials'));
    assert.deepEqual(statePatchSchema.properties.materials.items.properties.id.enum,['material-new']);
    assert.deepEqual(statePatchSchema.properties.materials.items.properties.activityId.enum,['activity-1']);
    assert.ok(result.state.materials.some(item=>item.id==='material-new'&&item.activityId==='activity-1'));
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test('strict transition repairs missing derived notifications without replaying the transition',async()=>{
  const previous={
    version:'state-notify-1',project:{id:'project-1',name:'Alianca Park'},clock:{},
    localities:[{id:'loc-1',name:'Frente 1'}],personnel:[],
    stages:[{id:'stage-1',name:'Drenagem',executionDescription:'Executar drenagem',notificationDestinations:['supplies']}],
    activities:[{id:'activity-1',stageId:'stage-1',localityId:'loc-1',title:'Assentar tubo',executionDescription:'Assentar tubo',status:'planned'}],
    materials:[],cash:{ledger:[]},purchases:[],evidence:[],agenda:[],notifications:[],resourceRequests:[],cashRequests:[],diary:[],blockers:[],stageSectorState:[],constraints:[],commercial:{sales:[],commissions:[],brokers:[]}
  };
  const event={id:'event-notify',type:'operation.state.requested',at:'2026-09-27T00:00:00-03:00',payload:{}};
  const trace=[
    {entityType:'stage',entityId:'stage-1',fieldsUsed:['executionDescription','notificationDestinations'],consequence:'Supplies deve receber a necessidade.'},
    {entityType:'activity',entityId:'activity-1',fieldsUsed:['executionDescription','localityId'],consequence:'A atividade permanece na frente local.'}
  ];
  const outputs=[
    {statePatch:{version:'state-notify-2',lastEvent:event}},
    {analysis:{possibleActivities:[{activityId:'activity-1',localityId:'loc-1',decision:'blocked',reasons:'Material pendente.'}],metaTrace:trace}},
    {analysis:{schedule:[],blocked:[{activityId:'activity-1',reason:'Material pendente.'}],summary:'Provisao necessaria.'},statePatch:{resourceRequests:[{id:'req-1',activityId:'activity-1',description:'material para drenagem',status:'open'}],cashRequests:[],notifications:[]}},
    {statePatch:{notifications:[{id:'notif-1',status:'unread',title:'Compras da frente',message:'Supplies/compras deve prover material para a frente 1.'}]}},
    {valid:true,errors:[],observations:[]}
  ];
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(init.body));
    const output=outputs[requests.length-1];
    return new Response(JSON.stringify({model:'openai/gpt-oss-20b',choices:[{message:{content:JSON.stringify(output)}}],usage:{prompt_tokens:10,completion_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runStrictNvidiaStateTransition({NVIDIA_API_KEY:'test-only',NVIDIA_STATE_MODEL:'openai/gpt-oss-20b',NVIDIA_STATE_RETRIES:'1'},{previousState:previous,event});
    assert.equal(requests.length,5);
    assert.match(requests[3].messages[0].content,/repare somente as notificacoes/i);
    assert.equal(result.state.resourceRequests.length,1);
    assert.equal(result.state.notifications.length,1);
    assert.match(JSON.stringify(result.state.notifications).toLowerCase(),/supplies|compras|frente/);
    assert.equal(result.inference.attempt,1);
  }finally{
    globalThis.fetch=originalFetch;
  }
});
