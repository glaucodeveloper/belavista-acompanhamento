// BELAVISTA_STRICT_AI_STATE_V4
// The operational state transition is produced and audited by NVIDIA inference.
// This module performs transport, JSON parsing, structural validation and retry only.
// It does not decide which activity should run, create a schedule, rank priorities,
// mutate materials/cash from event types, or synthesize a deterministic fallback.

const DEFAULT_API_URL='https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL='google/diffusiongemma-26b-a4b-it';
const REQUIRED_STATE_KEYS=[
  'project','clock','localities','personnel','stages','activities','materials','cash',
  'purchases','evidence','agenda','notifications','resourceRequests','cashRequests',
  'diary','blockers','stageSectorState','constraints','commercial'
];

const arrayKeys=new Set([
  'localities','personnel','stages','activities','materials','purchases','evidence',
  'agenda','notifications','resourceRequests','cashRequests','diary','blockers',
  'stageSectorState','constraints'
]);

function numberEnv(value,fallback,min,max){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.min(max,Math.max(min,n));
}

function settings(env){
  return {
    apiKey:env.NVIDIA_API_KEY||env.NVIDIA_NIM_API_KEY||'',
    apiUrl:env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||DEFAULT_API_URL,
    model:env.NVIDIA_STATE_MODEL||env.NVIDIA_REASONING_MODEL||env.NVIDIA_REASONING_VISION_MODEL||env.NVIDIA_MODEL||env.NVIDIA_NIM_MODEL||DEFAULT_MODEL,
    maxTokens:numberEnv(env.NVIDIA_STATE_MAX_TOKENS,16000,4096,32768),
    patchMaxTokens:numberEnv(env.NVIDIA_STATE_PATCH_MAX_TOKENS,4096,512,8192),
    analysisMaxTokens:numberEnv(env.NVIDIA_STATE_ANALYSIS_MAX_TOKENS,8192,2048,16000),
    analysisBatchSize:numberEnv(env.NVIDIA_STATE_ANALYSIS_BATCH_SIZE,3,1,10),
    reconcileMaxTokens:numberEnv(env.NVIDIA_STATE_RECONCILE_MAX_TOKENS,4096,512,8192),
    criticMaxTokens:numberEnv(env.NVIDIA_STATE_CRITIC_MAX_TOKENS,2400,512,8192),
    reasoningBudget:numberEnv(env.NVIDIA_STATE_REASONING_BUDGET,512,256,8192),
    reasoningEffort:['low','medium','high'].includes(String(env.NVIDIA_STATE_REASONING_EFFORT||'low').toLowerCase())
      ?String(env.NVIDIA_STATE_REASONING_EFFORT||'low').toLowerCase():'low',
    temperature:numberEnv(env.NVIDIA_STATE_TEMPERATURE,0.05,0,1),
    timeoutMs:numberEnv(env.NVIDIA_STATE_TIMEOUT_MS,120000,5000,180000),
    retries:numberEnv(env.NVIDIA_STATE_RETRIES,1,1,2)
  };
}

function stripThink(text){
  return String(text??'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
}

function parseJsonCandidate(source){
  try{return JSON.parse(source);}catch(strictError){
    const relaxed=String(source).replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g,'$1"$2"$3').replace(/,\s*([}\]])/g,'$1');
    if(relaxed!==source){
      try{return JSON.parse(relaxed);}catch{}
    }
    throw strictError;
  }
}

function parseJson(text){
  const src=stripThink(text);
  if(!src)throw new Error('NVIDIA retornou resposta vazia.');
  const fenced=src.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if(fenced){
    try{return parseJsonCandidate(fenced[1]);}catch{}
  }
  try{return parseJsonCandidate(src);}catch(error){
    const match=String(error?.message||'').match(/position\s+(\d+)/i);
    const position=match?Number(match[1]):0;
    const shape=src.replace(/"(?:\\.|[^"\\])*"/g,'"<texto>"').replace(/[\p{L}\p{N}_-]+/gu,'x');
    throw new Error(`NVIDIA não retornou JSON válido (${error?.message||'erro sintático'}; forma sanitizada: ${shape.slice(Math.max(0,position-24),position+72)}).`);
  }
  const first=src.indexOf('{');
  const last=src.lastIndexOf('}');
  if(first>=0&&last>first)return JSON.parse(src.slice(first,last+1));
  throw new Error('NVIDIA não retornou JSON parseável.');
}

function gptOssResponseFormat(phase,payload){
  if(!/stage analysis/i.test(phase||'')||!Array.isArray(payload?.requiredActivityIds)||!Array.isArray(payload?.requiredTraceKeys))return {type:'json_object'};
  const activityIds=payload.requiredActivityIds.map(String);
  const traceKeys=payload.requiredTraceKeys.map(String);
  const activityItem={type:'object',additionalProperties:false,properties:{
    activityId:activityIds.length?{type:'string',enum:activityIds}:{type:'string'},
    localityId:{anyOf:[{type:'string'},{type:'null'}]},
    decision:{type:'string',minLength:1},reasons:{type:'string',minLength:1}
  },required:['activityId','localityId','decision','reasons']};
  const traceVariants=traceKeys.map(key=>{
    const separator=key.indexOf(':');
    const entityType=key.slice(0,separator);
    const entityId=key.slice(separator+1);
    const requiredFields=payload.requiredFieldsByTraceKey?.[key]||[];
    const fieldsUsed=requiredFields.length
      ?{type:'array',items:{type:'string',enum:requiredFields},minItems:requiredFields.length,maxItems:requiredFields.length}
      :{type:'array',items:{type:'string'}};
    return {type:'object',additionalProperties:false,properties:{
      entityType:{type:'string',enum:[entityType]},entityId:{type:'string',enum:[entityId]},
      fieldsUsed,consequence:{type:'string',minLength:1}
    },required:['entityType','entityId','fieldsUsed','consequence']};
  });
  const traceItem=traceVariants.length===1?traceVariants[0]:{oneOf:traceVariants};
  const analysisProperties={
    metaTrace:{type:'array',items:traceItem,minItems:traceKeys.length,maxItems:traceKeys.length}
  };
  const requiredAnalysisProperties=['metaTrace'];
  if(activityIds.length){
    analysisProperties.possibleActivities={type:'array',items:activityItem,minItems:activityIds.length,maxItems:activityIds.length};
    requiredAnalysisProperties.unshift('possibleActivities');
  }
  const schema={type:'object',additionalProperties:false,properties:{analysis:{type:'object',additionalProperties:false,properties:analysisProperties,required:requiredAnalysisProperties}},required:['analysis']};
  return {type:'json_schema',json_schema:{name:'operational_stage_analysis',strict:true,schema}};
}

function exactValueSchema(value){
  if(value===null)return {type:'null'};
  if(Array.isArray(value))return {
    type:'array',items:value.length?{anyOf:value.map(exactValueSchema)}:{type:'string'},minItems:value.length,maxItems:value.length
  };
  if(value&&typeof value==='object'){
    const properties=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,exactValueSchema(item)]));
    return {type:'object',additionalProperties:false,properties,required:Object.keys(properties)};
  }
  const type=typeof value;
  return {type:type==='number'?'number':type==='boolean'?'boolean':'string',enum:[value]};
}

function gptOssEventPatchResponseFormat(event,transitionVersion,previousState){
  const p=event.payload||{};
  const upserts=[];
  const add=(collection,entities)=>{
    const valid=(entities||[]).filter(entity=>entity&&typeof entity==='object'&&entity.id!=null);
    if(valid.length)upserts.push({collection,entities:valid});
  };
  switch(event?.type){
    case 'material.requirement.declared': add('materials',[{...(p.material||{}),activityId:p.activityId}]); break;
    case 'activity.declared': add('activities',[p.activity]); break;
    case 'locality.created': add('localities',[p.locality]); break;
    case 'stage.meta.updated': add('stages',[{id:p.stageId,...(p.patch||{})}]); break;
    case 'activity.meta.updated': add('activities',[{id:p.activityId,...(p.patch||{})}]); break;
    case 'field.photo.registered': add('evidence',[{...(p.evidence||{}),activityId:p.activityId}]); break;
    case 'evidence.approved': add('evidence',[{id:p.evidence?.id,status:p.evidence?.status||'approved'}]); break;
    case 'evidence.rejected': add('evidence',[{id:p.evidenceId,status:'rejected',...(p.reason!==undefined?{reason:p.reason}:{})}]); break;
    case 'cash.request.denied': add('cashRequests',[{id:p.requestId,status:'denied',...(p.reason!==undefined?{reason:p.reason}:{})}]); break;
    case 'purchase.request.approved': add('resourceRequests',[{id:p.requestId,status:'approved',...(p.approvedQuantity!==undefined?{approvedQuantity:p.approvedQuantity}:{}),...(p.approvedAmountCents!==undefined?{approvedAmountCents:p.approvedAmountCents}:{}),...(p.materialId!==undefined?{materialId:p.materialId}:{})}]); break;
    case 'personnel.availability.updated': add('personnel',[{id:p.personId,active:p.active,...(p.availability!==undefined?{availability:p.availability}:{})}]); break;
    case 'agenda.item.accepted': add('agenda',[{id:p.agendaItemId,status:'accepted'}]); break;
    case 'agenda.item.completed': {
      add('agenda',[{id:p.agendaItemId,status:'completed'}]);
      const agendaItem=(previousState?.agenda||[]).find(item=>String(item.id)===String(p.agendaItemId));
      const activityId=p.activityId||agendaItem?.activityId;
      if(activityId)add('activities',[{id:activityId,status:'completed'}]);
      break;
    }
    case 'activity.blocker.cleared': {
      const blockers=(previousState?.blockers||[]).filter(item=>String(item.activityId)===String(p.activityId)
        &&(!p.blockerKind||String(item.kind)===String(p.blockerKind))
        &&!/clear|resolv|encerr/i.test(String(item.status||'active')))
        .map(item=>({id:item.id,status:'cleared'}));
      add('blockers',blockers);
      break;
    }
    case 'field.diary.recorded': {
      const diary={id:`diary-${event.id}`,activityId:p.activityId};
      for(const key of ['status','progressPercent','services','notes','localityId','foremanId'])if(p[key]!==undefined)diary[key]=p[key];
      diary.at=event.at;
      add('diary',[diary]);
      if(/complete|conclu/i.test(String(p.status||'')))add('activities',[{id:p.activityId,status:'completed'}]);
      if(Array.isArray(p.evidence)&&p.evidence.length)add('evidence',p.evidence.map(item=>({...item,activityId:p.activityId})));
      break;
    }
  }
  if(!upserts.length)return null;
  const statePatchProperties={
    version:{type:'string',enum:[transitionVersion]},
    lastEvent:{type:'object',additionalProperties:false,properties:{
      id:{type:'string',enum:[String(event.id)]},type:{type:'string',enum:[String(event.type)]}
    },required:['id','type']}
  };
  for(const {collection,entities} of upserts)statePatchProperties[collection]={
    type:'array',items:entities.length===1?exactValueSchema(entities[0]):{anyOf:entities.map(exactValueSchema)},
    minItems:entities.length,maxItems:entities.length
  };
  return {type:'json_schema',json_schema:{name:'strict_event_entity_patch',strict:true,schema:{
    type:'object',additionalProperties:false,
    properties:{statePatch:{type:'object',additionalProperties:false,properties:statePatchProperties,required:Object.keys(statePatchProperties)}},
    required:['statePatch']
  }}};
}

async function requestNvidia(env,messages,{maxTokens,temperature,phase,responseFormat}={}){
  const cfg=settings(env);
  if(!cfg.apiKey){
    const error=new Error('NVIDIA_API_KEY ausente: strict-ai-state-transition não possui fallback determinístico.');
    error.code='NVIDIA_STRICT_REQUIRED';
    throw error;
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort('NVIDIA strict state timeout'),cfg.timeoutMs);
  try{
    const requestMessages=/nvidia\/nemotron-3\.5-lightning-30b-a3b/i.test(cfg.model)
      ?messages.map((message,index)=>index===0&&message.role==='system'
        ?{...message,content:`detailed thinking off.\n${message.content}`}
        :message)
      :messages;
    const requestBody={
      model:cfg.model,messages:requestMessages,
      temperature:temperature??cfg.temperature,
      top_p:0.9,
      max_tokens:/openai\/gpt-oss-20b/i.test(cfg.model)?Math.min(4096,maxTokens??cfg.maxTokens):(maxTokens??cfg.maxTokens),
      stream:false
    };
    if(/openai\/gpt-oss-20b/i.test(cfg.model))requestBody.response_format=responseFormat||{type:'json_object'};
    if(/nemotron|reasoning/i.test(cfg.model))requestBody.reasoning_budget=cfg.reasoningBudget;
    if(/openai\/gpt-oss-20b/i.test(cfg.model)){
      requestBody.reasoning_effort=cfg.reasoningEffort;
      delete requestBody.top_p;
    }
    if(/nvidia\/nemotron-3-super-120b-a12b/i.test(cfg.model)){
      requestBody.reasoning_effort=cfg.reasoningEffort==='high'?'high':'low';
      delete requestBody.top_p;
    }
    const response=await fetch(cfg.apiUrl,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        accept:'application/json',
        authorization:`Bearer ${cfg.apiKey}`
      },
      body:JSON.stringify(requestBody),
      signal:controller.signal
    });
    const raw=await response.text();
    let payload={};
    try{payload=raw?JSON.parse(raw):{};}catch{}
    if(!response.ok){
      const message=payload?.error?.message||payload?.detail||raw||`HTTP ${response.status}`;
      throw new Error(`NVIDIA API ${response.status}: ${String(message).slice(0,1200)}`);
    }
    const content=payload?.choices?.[0]?.message?.content;
    if(!content)throw new Error('NVIDIA API não retornou choices[0].message.content.');
    return {content,model:payload?.model||cfg.model,usage:payload?.usage||null};
  }finally{
    clearTimeout(timeout);
  }
}

function metaCatalog(previousState){
  return {
    stages:(previousState.stages||[]).map(stage=>({
      entityType:'stage',entityId:stage.id,name:stage.name,
      dependsOn:Array.isArray(stage.dependsOn)?stage.dependsOn:[],
      entryGates:Array.isArray(stage.entryGates)?stage.entryGates:[],
      executionDescription:stage.executionDescription??stage.description??'',
      peculiarities:Array.isArray(stage.peculiarities)?stage.peculiarities:[],
      requirements:Array.isArray(stage.requirements)?stage.requirements:[],
      materials:Array.isArray(stage.materials)?stage.materials:[],
      workerRules:Array.isArray(stage.workerRules)?stage.workerRules:[],
      evidenceRequirements:Array.isArray(stage.evidenceRequirements)?stage.evidenceRequirements:[],
      notificationDestinations:Array.isArray(stage.notificationDestinations)?stage.notificationDestinations:[]
    })),
    activities:(previousState.activities||[]).map(activity=>({
      entityType:'activity',entityId:activity.id,stageId:activity.stageId,
      localityId:activity.localityId??activity.localidadeObraId??null,
      localityRule:activity.localityRule??null,
      title:activity.title,
      executionDescription:activity.executionDescription??activity.description??'',
      peculiarities:Array.isArray(activity.peculiarities)?activity.peculiarities:[],
      requirements:Array.isArray(activity.requirements)?activity.requirements:[],
      evidenceRequirements:Array.isArray(activity.evidenceRequirements)?activity.evidenceRequirements:[],
      durationMinutes:activity.durationMinutes??null,
      unitOfProduction:activity.unitOfProduction??activity.unit??null,
      plannedQuantity:activity.plannedQuantity??null,
      productionRate:activity.productionRate??null,
      materials:Array.isArray(activity.materials)?activity.materials:[],
      requiredRoles:Array.isArray(activity.requiredRoles)?activity.requiredRoles:[],
      equipment:Array.isArray(activity.equipment)?activity.equipment:[],
      dependsOn:Array.isArray(activity.dependsOn)?activity.dependsOn:[],
      externalConstraints:Array.isArray(activity.externalConstraints)?activity.externalConstraints:[]
    }))
  };
}

async function requestNvidiaJson(env,{systemPrompt,payload,maxTokens,temperature,phase,expectedShape,responseFormat}){
  const generation=await requestNvidia(env,[
    {role:'system',content:systemPrompt},
    {role:'user',content:JSON.stringify(payload)}
  ],{maxTokens,temperature,phase,responseFormat:/openai\/gpt-oss-20b/i.test(settings(env).model)?responseFormat||gptOssResponseFormat(phase,payload):undefined});
  try{return {parsed:parseJson(generation.content),generation,formatRepair:null};}
  catch(parseError){
    const repair=await requestNvidia(env,[
      {role:'system',content:'Corrija somente a serialização para JSON estrito. Preserve exatamente os dados e a intenção recebidos; não invente, remova nem reinterprete campos. Responda um objeto JSON válido, sem markdown nem explicações.'},
      {role:'user',content:JSON.stringify({phase,expectedShape,parseError:String(parseError.message||parseError),modelOutput:generation.content})}
    ],{maxTokens:Math.min(4096,maxTokens||4096),temperature:0});
    try{
      return {parsed:parseJson(repair.content),generation:{...repair,usage:{initial:generation.usage||null,formatRepair:repair.usage||null}},formatRepair:{model:repair.model||null,reason:'malformed-json'}};
    }catch(repairError){
      throw new Error(`${phase}: JSON inválido mesmo após correção de formato pela NVIDIA (${repairError.message}).`);
    }
  }
}

const entityArrayKeys=new Set([
  'localities','personnel','stages','activities','materials','purchases','evidence','agenda',
  'notifications','resourceRequests','cashRequests','diary','blockers','stageSectorState','constraints'
]);

function entityKey(collection,item){
  if(item?.id!=null&&String(item.id))return String(item.id);
  if(collection==='stageSectorState'&&item?.stageId!=null&&item?.localityId!=null)return `${item.stageId}::${item.localityId}`;
  return null;
}

function mergeEntityArray(current=[],updates=[],collection=''){
  const merged=Array.isArray(current)?structuredClone(current):[];
  for(const update of updates){
    const key=entityKey(collection,update);
    const index=key==null?-1:merged.findIndex(item=>entityKey(collection,item)===key);
    if(index<0)merged.push(structuredClone(update));
    else merged[index]={...merged[index],...structuredClone(update)};
  }
  return merged;
}

export function mergeNvidiaStatePatch(previousState,statePatch){
  if(!statePatch||typeof statePatch!=='object'||Array.isArray(statePatch))throw new Error('statePatch deve ser um objeto parcial.');
  const state=structuredClone(previousState);
  for(const [key,value] of Object.entries(statePatch)){
    if(entityArrayKeys.has(key)){
      if(!Array.isArray(value))throw new Error(`statePatch.${key} deve conter registros para upsert.`);
      state[key]=mergeEntityArray(state[key],value,key);
      continue;
    }
    if(key==='cash'&&value&&typeof value==='object'&&!Array.isArray(value)){
      const currentCash=state.cash||{};
      state.cash={...currentCash,...structuredClone(value)};
      if(Array.isArray(value.ledger))state.cash.ledger=mergeEntityArray(currentCash.ledger,value.ledger,'ledger');
      continue;
    }
    if(key==='commercial'&&value&&typeof value==='object'&&!Array.isArray(value)){
      const commercial={...(state.commercial||{})};
      for(const [collection,updates] of Object.entries(value)){
        commercial[collection]=Array.isArray(updates)
          ?mergeEntityArray(commercial[collection],updates,collection)
          :structuredClone(updates);
      }
      state.commercial=commercial;
      continue;
    }
    const current=state[key];
    state[key]=current&&value&&typeof current==='object'&&typeof value==='object'&&!Array.isArray(current)&&!Array.isArray(value)
      ?{...current,...structuredClone(value)}
      :structuredClone(value);
  }
  return state;
}

function materializeCandidateState(candidate,previousState){
  if(!candidate||typeof candidate!=='object'||!candidate.statePatch||typeof candidate.statePatch!=='object')return candidate;
  const materialized={...candidate,state:mergeNvidiaStatePatch(previousState,candidate.statePatch)};
  delete materialized.statePatch;
  return materialized;
}

function structuralErrors(candidate,previousState,event,analysisState=previousState){
  const errors=[];
  if(!candidate||typeof candidate!=='object')return ['raiz da resposta não é objeto'];
  const state=candidate.state;
  const analysis=candidate.analysis;
  if(!state||typeof state!=='object')errors.push('state ausente');
  if(!analysis||typeof analysis!=='object')errors.push('analysis ausente');
  if(state){
    for(const key of REQUIRED_STATE_KEYS){
      if(!Object.hasOwn(state,key))errors.push(`state.${key} ausente`);
      else if(arrayKeys.has(key)&&!Array.isArray(state[key]))errors.push(`state.${key} deve ser array`);
    }
    if(!state.version&&!state.stateVersion)errors.push('state.version ausente');
    const beforeVersion=previousState?.version||previousState?.stateVersion;
    const afterVersion=state.version||state.stateVersion;
    if(beforeVersion&&afterVersion===beforeVersion)errors.push('versão do estado não mudou');
    if(previousState?.project?.id&&state.project?.id!==previousState.project.id)errors.push('project.id mudou');
    const beforeStages=new Set((previousState?.stages||[]).map(x=>x.id));
    const afterStages=new Set((state.stages||[]).map(x=>x.id));
    for(const id of beforeStages)if(!afterStages.has(id))errors.push(`etapa desapareceu: ${id}`);
    const beforeActs=new Set((previousState?.activities||[]).map(x=>x.id));
    const afterActs=new Set((state.activities||[]).map(x=>x.id));
    for(const id of beforeActs)if(!afterActs.has(id))errors.push(`atividade desapareceu: ${id}`);
  }
  if(analysis){
    const decisions=analysis.possibleActivities||analysis.activityDecisions||analysis.decisions;
    if(!Array.isArray(decisions))errors.push('analysis.possibleActivities ausente');
    else{
      const decisionIds=decisions.map(item=>String(item?.activityId||item?.id||''));
      const uniqueDecisionIds=new Set(decisionIds);
      if(uniqueDecisionIds.size!==decisionIds.length)errors.push('analysis.possibleActivities contém ids duplicados');
      for(const activity of analysisState?.activities||[]){
        if(!uniqueDecisionIds.has(String(activity.id))){errors.push(`decisão ausente para activity:${activity.id}`);continue;}
        const decision=decisions.find(item=>String(item?.activityId||item?.id||'')===String(activity.id));
        if(!String(decision?.decision||decision?.status||'').trim())errors.push(`decisão sem status para activity:${activity.id}`);
        if(!String(decision?.reasons||decision?.rationale||decision?.reason||'').trim())errors.push(`decisão sem justificativa para activity:${activity.id}`);
      }
    }
    if(!Array.isArray(analysis.schedule))errors.push('analysis.schedule ausente');
    if(!Array.isArray(analysis.blocked))errors.push('analysis.blocked ausente');
    const trace=analysis.metaTrace||analysis.metadataTrace||analysis.metaUsage;
    if(!Array.isArray(trace)||!trace.length)errors.push('analysis.metaTrace ausente');
    else{
      const traceKeys=trace.map(x=>`${String(x.entityType||x.type||'').toLowerCase()}:${x.entityId||x.id}`);
      const traceIds=new Set(traceKeys);
      if(traceIds.size!==traceKeys.length)errors.push('analysis.metaTrace contém ids duplicados');
      const expectedMeta=metaCatalog(analysisState);
      for(const [type,entities] of [['stage',expectedMeta.stages],['activity',expectedMeta.activities]])for(const entity of entities){
        const key=`${type}:${entity.entityId}`;
        if(!traceIds.has(key)){errors.push(`metaTrace não cita ${key}`);continue;}
        const entry=trace.find(item=>`${String(item.entityType||item.type||'').toLowerCase()}:${item.entityId||item.id}`===key);
        const fieldsUsed=new Set((entry?.fieldsUsed||[]).map(String));
        const expectedFields=type==='stage'
          ?['executionDescription','peculiarities','requirements','evidenceRequirements','notificationDestinations']
          :['executionDescription','peculiarities','requirements','evidenceRequirements','durationMinutes','localityId'];
        for(const field of expectedFields){
          const value=entity[field];
          const hasValue=Array.isArray(value)?value.length>0:value!==null&&value!==undefined&&value!=='';
          if(hasValue&&!fieldsUsed.has(field))errors.push(`metaTrace de ${key} não confirma uso de ${field}`);
        }
        if(!String(entry?.consequence||entry?.rationale||entry?.reason||'').trim())errors.push(`metaTrace de ${key} sem consequência causal`);
      }
    }
  }
  const applied=candidate.eventApplied||candidate.event||candidate.transition?.event||candidate.state?.lastEvent;
  if(!applied)errors.push('eventApplied ausente');
  else{
    if(event?.id&&applied.id!==event.id)errors.push('eventApplied.id divergente');
    if(event?.type&&applied.type!==event.type)errors.push('eventApplied.type divergente');
  }
  errors.push(...eventEffectErrors(previousState,state,event));
  return errors;
}

function eventEffectErrors(previousState,state,event){
  if(!state||!event)return [];
  const p=event.payload||{};
  const errors=[];
  const byId=(collection,id)=>Array.isArray(state[collection])?state[collection].find(item=>String(item?.id)===String(id)):null;
  const beforeById=(collection,id)=>Array.isArray(previousState?.[collection])?previousState[collection].find(item=>String(item?.id)===String(id)):null;
  const statusIs=(item,pattern)=>pattern.test(String(item?.status||''));
  const stable=value=>{
    if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  };
  const requireFact=(ok,message)=>{if(!ok)errors.push(`evento ${event.type}: ${message}`);};
  switch(event.type){
    case 'purchase.receipt.received':
      for(const item of p.items||[]){
        const before=beforeById('materials',item.materialId),after=byId('materials',item.materialId),quantity=Number(item.quantity);
        if(before&&after&&Number.isFinite(Number(before.stock))&&Number.isFinite(quantity))
          requireFact(Number(after.stock)===Number(before.stock)+quantity,`stock de material ${item.materialId} não reflete somente a quantidade recebida.`);
        if(before&&after&&Number.isFinite(Number(before.receivedQuantity))&&Number.isFinite(quantity))
          requireFact(Number(after.receivedQuantity)===Number(before.receivedQuantity)+quantity,`receivedQuantity de ${item.materialId} não foi incrementado pela quantidade recebida.`);
      }
      break;
    case 'material.consumption.recorded':
      for(const item of p.items||[]){
        const before=beforeById('materials',item.materialId),after=byId('materials',item.materialId),quantity=Number(item.quantity);
        if(before&&after&&Number.isFinite(Number(before.stock))&&Number.isFinite(quantity))
          requireFact(Number(after.stock)===Number(before.stock)-quantity,`stock de material ${item.materialId} não reflete o consumo.`);
        if(before&&after&&Number.isFinite(Number(before.usedQuantity))&&Number.isFinite(quantity))
          requireFact(Number(after.usedQuantity)===Number(before.usedQuantity)+quantity,`usedQuantity de ${item.materialId} não foi incrementado pelo consumo.`);
      }
      break;
    case 'inventory.adjustment.recorded': {
      const before=beforeById('materials',p.materialId),after=byId('materials',p.materialId),delta=Number(p.deltaQuantity);
      if(before&&after&&Number.isFinite(Number(before.stock))&&Number.isFinite(delta))
        requireFact(Number(after.stock)===Number(before.stock)+delta,`stock de ${p.materialId} não reflete o ajuste de inventário.`);
      for(const field of ['receivedQuantity','usedQuantity'])if(before&&after&&Object.hasOwn(before,field))
        requireFact(stable(after[field])===stable(before[field]),`${field} de ${p.materialId} mudou em um ajuste que não é recebimento nem consumo.`);
      break;
    }
    case 'purchase.delivery.delayed':
      requireFact(byId('purchases',p.purchaseId)?.expectedAt===p.newExpectedAt,`previsão da compra ${p.purchaseId} não foi atualizada.`);
      break;
    case 'field.diary.recorded': {
      const entries=Array.isArray(state.diary)?state.diary:[];
      requireFact(entries.some(item=>String(item.activityId||'')===String(p.activityId)),`diário da atividade ${p.activityId} não foi incluído.`);
      if(/complete|conclu/i.test(String(p.status||'')))requireFact(/complete|conclu/i.test(String(byId('activities',p.activityId)?.status||'')),`atividade ${p.activityId} não foi marcada como concluída pelo evento.`);
      for(const evidence of p.evidence||[])requireFact(Boolean(byId('evidence',evidence.id)),`evidência ${evidence.id} do diário não foi incluída.`);
      break;
    }
    case 'field.photo.registered':
      requireFact(Boolean(byId('evidence',p.evidence?.id)),`foto/evidência ${p.evidence?.id} não foi incluída.`);
      if(p.activityId)requireFact(String(byId('evidence',p.evidence?.id)?.activityId||'')===String(p.activityId),`foto ${p.evidence?.id} não ficou associada à atividade ${p.activityId}.`);
      break;
    case 'activity.blocker.cleared': {
      const remaining=(state.blockers||[]).filter(item=>String(item.activityId)===String(p.activityId)
        &&(!p.blockerKind||String(item.kind)===String(p.blockerKind))
        &&!statusIs(item,/clear|resolv|encerr/i));
      requireFact(!remaining.length,`impedimento ativo da atividade ${p.activityId} permaneceu aberto.`);
      break;
    }
    case 'activity.duration.reestimated':
      requireFact(Number(byId('activities',p.activityId)?.durationMinutes)===Number(p.durationMinutes),`duração da atividade ${p.activityId} diverge do evento.`);
      break;
    case 'personnel.availability.updated': {
      const person=byId('personnel',p.personId);
      requireFact(person?.active===p.active,`disponibilidade ativa de ${p.personId} não foi aplicada.`);
      if(Array.isArray(p.availability))requireFact(stable(person?.availability)===stable(p.availability),`faixas de disponibilidade de ${p.personId} divergem do evento.`);
      break;
    }
    case 'personnel.locality.changed':
      requireFact(byId('personnel',p.personId)?.localityId===p.toLocalityId,`localidade de ${p.personId} não foi alterada.`);
      break;
    case 'stage.meta.updated': {
      const stage=byId('stages',p.stageId);
      requireFact(Boolean(stage),`etapa ${p.stageId} não existe após o patch.`);
      for(const [key,value] of Object.entries(p.patch||{}))requireFact(stable(stage?.[key])===stable(value),`metadado ${key} da etapa ${p.stageId} não corresponde ao patch.`);
      break;
    }
    case 'activity.meta.updated': {
      const activity=byId('activities',p.activityId);
      requireFact(Boolean(activity),`atividade ${p.activityId} não existe após o patch.`);
      for(const [key,value] of Object.entries(p.patch||{}))requireFact(stable(activity?.[key])===stable(value),`metadado ${key} da atividade ${p.activityId} não corresponde ao patch.`);
      break;
    }
    case 'evidence.approved':
      requireFact(stable(byId('evidence',p.evidence?.id)?.status)===stable(p.evidence?.status||'approved'),`comprovante ${p.evidence?.id} não foi aprovado.`);
      break;
    case 'evidence.rejected':
      requireFact(statusIs(byId('evidence',p.evidenceId),/reject|rejeit/i),`comprovante ${p.evidenceId} não foi rejeitado.`);
      break;
    case 'material.requirement.declared':
      requireFact(Boolean(byId('materials',p.material?.id)),`material/requisito ${p.material?.id} não foi incluído.`);
      break;
    case 'activity.declared':
      requireFact(Boolean(byId('activities',p.activity?.id)),`atividade ${p.activity?.id} não foi incluída.`);
      break;
    case 'cash.request.denied':
      requireFact(statusIs(byId('cashRequests',p.requestId),/denied|negad|rejeit/i),`solicitação financeira ${p.requestId} continua pendente.`);
      break;
    case 'purchase.request.approved': {
      const request=byId('resourceRequests',p.requestId);
      requireFact(statusIs(request,/approv|aprov/i),`solicitação de compra ${p.requestId} continua pendente.`);
      if(request&&p.approvedQuantity!=null)requireFact(Number(request.approvedQuantity??request.quantity)===Number(p.approvedQuantity),`quantidade aprovada da solicitação ${p.requestId} diverge do evento.`);
      break;
    }
    case 'purchase.cancelled':
      requireFact(statusIs(byId('purchases',p.purchaseId),/cancel|cancelad/i),`compra ${p.purchaseId} não foi cancelada.`);
      break;
    case 'locality.created':
      requireFact(Boolean(byId('localities',p.locality?.id)),`localidade ${p.locality?.id} não foi criada.`);
      break;
    case 'personnel.assigned':
      requireFact(byId('personnel',p.person?.id)?.localityId===p.person?.localityId,`colaborador ${p.person?.id} não foi atribuído à localidade do evento.`);
      break;
    case 'agenda.item.accepted': {
      const item=byId('agenda',p.agendaItemId);
      requireFact(statusIs(item,/accept|aceit|confirm|scheduled|agend/i)&&!statusIs(item,/complet|conclu/i),`item de agenda ${p.agendaItemId} não foi aceito (sem ser marcado como concluído).`);
      break;
    }
    case 'agenda.item.completed': {
      requireFact(statusIs(byId('agenda',p.agendaItemId),/complet|conclu/i),`item de agenda ${p.agendaItemId} não foi concluído.`);
      const agendaItem=beforeById('agenda',p.agendaItemId);
      const activityId=p.activityId||agendaItem?.activityId;
      if(activityId)requireFact(statusIs(byId('activities',activityId),/complet|conclu/i),`atividade ${activityId} vinculada ao item de agenda não foi concluída.`);
      break;
    }
  }
  return errors;
}

function generationSystemPrompt(){
 return `Você é o motor de transição de estado operacional do Aliança Park.
MODO OBRIGATÓRIO: strict-ai-state-transition.
Toda racionalidade operacional deve ser produzida por você nesta chamada NVIDIA. Não existe scheduler determinístico, score de prioridade, regras de decisão no backend ou fallback determinístico.

TAREFA:
1. Receba previousState COMPLETO, um único event factual e o catálogo de metadados.
2. Interprete semanticamente o evento e aplique somente os fatos que ele declara.
3. Preserve todo o restante do estado e todo histórico relevante.
4. Releia TODAS as etapas e TODAS as atividades após aplicar o fato.
5. Recalcule por inferência: atividades possíveis/bloqueadas, cronograma possível, provisões de material/pessoal, pedidos de caixa, blockers e notificações.
6. O cronograma deve usar quesitos, peculiaridades de execução, dependências, evidências, recursos, caixa, pessoal, função, disponibilidade e localidade. NÃO use prioridade numérica como mecanismo de liberação/ordenação.
7. Um encarregado/pessoa pertence à sua localityId. Nunca mova nem use pessoa em outra localidade sem evento explícito personnel.locality.changed/personnel.assigned.
8. Para recebimentos, consumos, entradas/saídas de caixa, diário, evidência, alterações de metadados, disponibilidade, compras e agenda: o payload do event é um fato autoritativo a ser incorporado ao novo estado.
9. Mudanças em stage.meta.updated e activity.meta.updated devem alterar exatamente os campos do patch e afetar a análise seguinte.
10. Um field.diary.recorded completed deve permanecer no diário, atualizar a atividade, incorporar evidências e reavaliar a continuidade.
11. purchase.receipt.received deve incorporar o documento/evidência e quantidades recebidas aos materiais citados, sem apagar histórico.
12. Gere notificações e solicitações de recursos/caixa DENTRO do state; elas são resultado da inferência, não de código externo.
13. Retorne um statePatch conciso, contendo somente campos alterados; o Worker monta o estado total por merge estrutural genérico, sem decidir semântica.
14. Gere uma nova version única para cada transição.
15. Use o comprehensionContext inteiro como uma única compreensão da obra: cartografia DWG/GIS, localidades, todas as etapas, todas as atividades, materiais, requisitos, pessoal, equipes, equipamentos, caixa, evidências e restrições. Não divida a decisão em análises independentes.
16. Se um dado cartográfico, material, requisito, pessoa, equipe ou equipamento não estiver disponível, marque a consequência como pendente/bloqueada e explique a ausência. Nunca invente vértices, comprimentos, volumes, áreas, produtividade ou disponibilidade.

PROVA DE USO DAS META-DESCRIÇÕES:
analysis.metaTrace DEVE conter uma entrada para CADA stage e CADA activity existentes no novo estado.
Para stage use fieldsUsed incluindo, quando presentes: executionDescription, peculiarities, requirements, evidenceRequirements, notificationDestinations.
Para activity use fieldsUsed incluindo, quando presentes: executionDescription, peculiarities, requirements, evidenceRequirements, durationMinutes, localityId.
Cada entrada precisa de consequence/rationale causal específico.

ANÁLISE DE TODAS AS ATIVIDADES:
analysis.possibleActivities deve possuir ao menos uma decisão para CADA activity.id, mesmo quando bloqueada.
Cada decisão deve conter activityId, localityId, decision/status/action e reasons/rationale suficientes para auditoria.
analysis.schedule deve conter somente encaixes executáveis e não pode criar transferência implícita de pessoal.

RESPONDA SOMENTE JSON VÁLIDO nesta forma:
{
  "eventApplied": {"id":"...","type":"...","at":"...","actor":{},"payload":{}},
  "statePatch": {"version":"nova-versao","lastEvent":{},"materials":[{"id":"...","stock":1}]},
  "analysis": {
    "possibleActivities": [],
    "schedule": [],
    "blocked": [],
    "metaTrace": [{"entityType":"stage|activity","entityId":"...","fieldsUsed":[],"consequence":"..."}],
    "summary":"..."
  }
}`;
}

function generationEfficiencyPrompt(){
  return `Compact response constraints:
- previousState is already the complete operational state. metadataCatalog contains only stage/activity metadata; do not expect comprehensionContext to repeat those entities.
- comprehensionContext contains only supplemental cartography, teams and equipment not already present in previousState.
- Return statePatch only; never copy the full state. Include a new version and lastEvent in statePatch.
- For root objects, include only changed fields. For entity arrays, provide only full new records or id plus changed fields; the Worker upserts by id (stageSectorState uses stageId plus localityId). Unchanged entities and fields are preserved.
- For cash.ledger and commercial arrays, provide only new or changed records with id. Arrays nested inside an updated entity replace only that field.
- Preserve the full state semantically through statePatch, and keep each possibleActivities reason to one concise sentence and each metaTrace consequence to one concise sentence (maximum 16 words).
- Do not repeat explanations or add prose outside the required JSON. Return one decision and one metaTrace entry per existing activity/stage, respectively.`;
}

function eventPatchSystemPrompt(){
  return `Camada 1/3 — aplique o evento operacional usando inferência NVIDIA.
Receba previousState (integral ou recorte explicitamente indicado), event factual e comprehensionContext. Interprete o evento, aplique somente fatos do payload e do recorte; não invente fatos ausentes. O Worker fixa eventApplied e canonicaliza statePatch.lastEvent/statePatch.version a partir do event e transitionVersion originais; concentre a resposta nas coleções/campos de statePatch solicitados. O Worker fará merge estrutural do statePatch no estado integral e preservará itens não enviados; para atualizar um item, envie seu id e somente os campos alterados.
Contrato factual por tipo de evento:
- cash.outflow.recorded/cash.inflow.recorded: atualize saldo e acrescente movimento de caixa identificado pelo evento; cash.reserve.changed muda a reserva sem criar despesa.
- purchase.receipt.received: para cada item, incremente stock e receivedQuantity apenas pela quantity deste evento, mantenha usedQuantity, preserve acumulados, atualize compra/documento/comprovante sem apagar histórico.
- material.consumption.recorded: decremente stock e incremente usedQuantity pela quantity do evento; receivedQuantity não muda. inventory.adjustment.recorded altera stock pelo deltaQuantity sem alterar receivedQuantity/usedQuantity.
- purchase.delivery.delayed: atualize expectedAt da compra indicada. purchase.cancelled atualiza o status da compra indicada para cancelado.
- field.diary.recorded: faça upsert de um diário com activityId do payload e mantenha-o em statePatch.diary; aplique status/progresso/notas. Se completed/concluído, atualize também a atividade indicada para concluída. Inclua/upsert cada evidência enviada. field.photo.registered inclui a evidência enviada por id e a associação da atividade.
- activity.blocker.reported cria impedimento ativo. activity.blocker.cleared encerra os impedimentos ativos correspondentes à activityId e blockerKind (ou todos ativos da atividade se blockerKind não vier); não deixe a mesma pendência ativa.
- activity.duration.reestimated aplica durationMinutes à atividade indicada. stage.meta.updated/activity.meta.updated aplicam todos os campos de patch literalmente, sem omitir listas ou reinterpretar conteúdo.
- personnel.absence.reported marca indisponibilidade e registra o período; personnel.returned reativa. personnel.availability.updated copia active e availability exatamente. personnel.locality.changed aplica toLocalityId; personnel.assigned aplica a localidade indicada.
- evidence.approved atualiza o comprovante existente para o status enviado (approved se omitido); evidence.rejected atualiza status e motivo.
- material.requirement.declared inclui o objeto material enviado com seu id e vínculo à activityId. activity.declared inclui o objeto activity enviado. locality.created inclui o objeto locality enviado.
- cash.request.denied muda a solicitação indicada para denied e registra o motivo. purchase.request.approved muda a solicitação indicada para approved e registra approvedQuantity/approvedAmountCents se enviados; aprovação NÃO é recebimento, pagamento nem consumo e não altera stock, caixa ou ledger.
- agenda.item.accepted muda o item indicado para accepted/confirmed; aceite NÃO conclui a atividade vinculada. agenda.item.completed conclui o item de agenda e a atividade indicada no payload (ou vinculada ao item, se activityId não vier). operation.note.recorded registra a observação no diário/notificações.
As validações locais devolverão fatos ausentes como repairFeedback: corrija exatamente esses fatos na próxima tentativa, sem repetir patch incompleto. Retorne statePatch apenas com coleções/campos alterados (upsert por id), nunca copie o estado integral. JSON apenas: {"eventApplied":{},"statePatch":{"version":"...","lastEvent":{}}}.`;
}

function transitionVersionForEvent(event){
  return `state:${String(event.id)}`;
}

function eventPatchStateContext(previousState,event){
  if(event?.type!=='operation.state.requested')return previousState;
  const project=previousState.project||{};
  const lastEvent=previousState.lastEvent;
  return {
    schemaVersion:previousState.schemaVersion,
    version:previousState.version,
    project:Object.fromEntries(['id','name','currency','timezone'].filter(key=>project[key]!==undefined).map(key=>[key,project[key]])),
    clock:previousState.clock||{},
    lastEvent:lastEvent?Object.fromEntries(['id','type','at'].filter(key=>lastEvent[key]!==undefined).map(key=>[key,lastEvent[key]])):null,
    contextScope:'read-only event; operational collections remain available to subsequent inference layers'
  };
}

function activityAnalysisSystemPrompt(){
  return `Camada 2/3 — faça inferência NVIDIA de impacto operacional após o evento.
Receba o estado COMPLETO pós-evento, o event, todas as metadescrições das etapas/atividades e o contexto complementar. Reavalie GLOBALMENTE cada atividade, com dependências, evidências, requisitos, materiais, caixa, funções, disponibilidade, localidades, equipamentos, agenda e restrições. Não gere/repita estado e não monte cronograma nesta camada.
Retorne exatamente uma decisão em possibleActivities para cada activity.id: activityId, localityId, decision, reasons (frase causal curta). Retorne metaTrace com uma entrada por stage e activity existentes: entityType, entityId, fieldsUsed, consequence causal específica. Para etapa, considere executionDescription, peculiarities, requirements, evidenceRequirements, notificationDestinations. Para atividade, considere executionDescription, peculiarities, requirements, evidenceRequirements, durationMinutes, localityId. Não invente dados nem mova pessoas entre localidades sem evento explícito personnel.locality.changed/personnel.assigned. JSON apenas: {"analysis":{"possibleActivities":[],"metaTrace":[]}}.`;
}

function stageActivityAnalysisSystemPrompt(){
  return `Camada 2 alternativa — analise uma etapa por vez com inferência NVIDIA.
O payload contém o estado operacional compartilhado, todas as etapas/atividades em visão compacta, e os detalhes completos da etapa e atividades do lote atual. Reavalie TODAS as atividades do lote usando os recursos/caixa/evidências/agenda/restrições compartilhados, requisitos, dependências, localidade, funções, peculiaridades e provas. Não crie cronograma nem altere estado.
O payload contém outputSkeleton com os ids obrigatórios já posicionados. Preserve cada objeto; preencha os campos vazios e nunca remova itens nem devolva arrays vazias quando há itens no esqueleto. Quando não houver atividades no lote, não emita possibleActivities; a ausência de tarefas é determinada pela lista de entrada vazia. Os ids e a estrutura vêm do contrato, não são inferências; status, localidade, razões, campos utilizados e consequências são sua decisão inferida. Em cada metaTrace, fieldsUsed deve incluir TODOS os campos de requiredFieldsByTraceKey daquele id, considerando-os explicitamente na decisão; não omita campos presentes. Não invente dados, não transfira pessoas entre localidades. JSON apenas no formato exato de outputSkeleton.`;
}

function requiredTraceFields(catalogEntity,entityType){
  const candidates=entityType==='stage'
    ?['executionDescription','peculiarities','requirements','evidenceRequirements','notificationDestinations']
    :['executionDescription','peculiarities','requirements','evidenceRequirements','durationMinutes','localityId'];
  return candidates.filter(field=>{
    const value=catalogEntity?.[field];
    return Array.isArray(value)?value.length>0:value!==null&&value!==undefined&&value!=='';
  });
}

function scheduleReconciliationSystemPrompt(){
  return `Camada 3/3 - reconcilie globalmente o cronograma e materialize os efeitos operacionais derivados usando inferencia NVIDIA.
Receba o estado completo pos-evento, o event e as decisoes/metaTrace de todas as atividades. Considere dependencias entre etapas, localidade, agenda, materiais, caixa, evidencias, funcoes, disponibilidade, equipamentos e restricoes numa unica programacao global. Nao reescreva decisoes ou metaTrace.
Retorne analysis.schedule com encaixes executaveis, analysis.blocked com pendencias/bloqueios e analysis.summary. Na MESMA resposta, retorne statePatch somente com upserts inferidos de resourceRequests, cashRequests e notifications derivados da propria analise.
- resourceRequests: crie ou atualize quando uma atividade precisa de material, equipamento, funcao/pessoal ou outro recurso ainda nao coberto. Cite materialId/resourceId/activityId e uma descricao/razao que identifique o recurso (por exemplo cabo, areia, brita, meio-fio ou material), sem inventar quantidade quando ela nao puder ser inferida do estado.
- cashRequests: crie ou atualize quando a provisao exige caixa e o estado permite justificar a necessidade; nao invente valor. Se nao houver valor confiavel, mantenha a necessidade em resourceRequests em vez de fabricar amountCents.
- notifications: crie ou atualize notificacoes acionaveis para bloqueios, provisoes, agenda/frente e responsaveis. Respeite notificationDestinations das metadescricoes e mencione no texto o destino/contexto relevante (encarregado, supplies/compras, agenda ou frente) quando aplicavel.
Cada registro novo em statePatch deve ter id estavel e status/descricao ou mensagem suficientes para auditoria. Nao remova registros existentes: statePatch contem apenas novos registros ou upserts por id. Nunca mova pessoas entre localidades sem evento explicito. Nao use prioridade numerica como criterio nem invente disponibilidade, quantidades, duracoes, custos ou dados geograficos.
JSON apenas: {"analysis":{"schedule":[],"blocked":[],"summary":"..."},"statePatch":{"resourceRequests":[],"cashRequests":[],"notifications":[]}}.`;
}

function derivedNotificationRepairSystemPrompt(reason='derived-effects-without-notification'){
  const financial=reason==='financial-event-without-financial-notification'
    ?`O evento atual e financeiro (cash.outflow.recorded, cash.inflow.recorded ou cash.reserve.changed). Alem de preservar notificacoes operacionais ja existentes, gere pelo menos uma notificacao explicitamente financeira. O texto deve comunicar de forma inequivoca o efeito em caixa/saldo/reserva/orcamento, sem inventar valores que nao estejam no estado/evento.`
    :'';
  return `Repare somente as notificacoes operacionais derivadas da reconciliacao NVIDIA anterior.
A reconciliacao ja produziu schedule/blocked e/ou resourceRequests/cashRequests acionaveis, mas existe uma lacuna de notificacao. Nao altere cronograma, decisoes, recursos, caixa nem estado factual.
${financial}
Retorne statePatch.notifications somente com as notificacoes adicionais necessarias para cobrir a lacuna. Cada notificacao deve ter id estavel, status, title e message. Em message/title explicite o contexto/destino operacional relevante a partir de notificationDestinations/metadescricoes quando existir, por exemplo encarregado, supplies/compras, agenda, frente ou financeiro. Nao invente quantidade, custo, disponibilidade ou transferencia de pessoal.
JSON apenas: {"statePatch":{"notifications":[{"id":"...","status":"unread","title":"...","message":"..."}]}}.`;
}

function notificationSemanticText(notifications){
  return JSON.stringify(Array.isArray(notifications)?notifications:[])
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function derivedNotificationRepairReason(scheduleCandidate,event){
  const statePatch=scheduleCandidate?.statePatch;
  if(!statePatch||typeof statePatch!=='object'||Array.isArray(statePatch))return null;

  const notifications=Array.isArray(statePatch.notifications)?statePatch.notifications:[];
  const text=notificationSemanticText(notifications);
  const eventType=String(event?.type||'');

  if(/^(cash\.outflow\.recorded|cash\.inflow\.recorded|cash\.reserve\.changed)$/.test(eventType)){
    const hasFinancialNotification=/(caixa|cash|saldo|balance|reserva|reserve|finance|financial|orcament|budget|fundo|fund)/.test(text);
    if(!hasFinancialNotification)return 'financial-event-without-financial-notification';
  }

  if(notifications.length)return null;

  const reconciliation=scheduleCandidate?.analysis||scheduleCandidate||{};
  const resourceRequests=Array.isArray(statePatch.resourceRequests)?statePatch.resourceRequests:[];
  const cashRequests=Array.isArray(statePatch.cashRequests)?statePatch.cashRequests:[];
  const schedule=Array.isArray(reconciliation.schedule)?reconciliation.schedule:[];
  const blocked=Array.isArray(reconciliation.blocked)?reconciliation.blocked:[];

  return resourceRequests.length>0||cashRequests.length>0||schedule.length>0||blocked.length>0
    ?'derived-effects-without-notification'
    :null;
}

function activityCoverageErrors(analysis,state){
  const errors=[];
  const decisions=analysis?.possibleActivities||analysis?.activityDecisions||analysis?.decisions;
  if(!Array.isArray(decisions))return ['analysis.possibleActivities ausente'];
  const decisionIds=decisions.map(item=>String(item?.activityId||item?.id||''));
  const seenDecisions=new Set(decisionIds);
  if(seenDecisions.size!==decisionIds.length)errors.push('analysis.possibleActivities contém ids duplicados');
  for(const activity of state?.activities||[])if(!seenDecisions.has(String(activity.id)))errors.push(`decisão ausente para activity:${activity.id}`);
  const trace=analysis?.metaTrace||analysis?.metadataTrace||analysis?.metaUsage;
  if(!Array.isArray(trace)){errors.push('analysis.metaTrace ausente');return errors;}
  const traceKeys=trace.map(item=>`${String(item?.entityType||item?.type||'').toLowerCase()}:${item?.entityId||item?.id}`);
  const seenTrace=new Set(traceKeys);
  if(seenTrace.size!==traceKeys.length)errors.push('analysis.metaTrace contém ids duplicados');
  for(const stage of state?.stages||[])if(!seenTrace.has(`stage:${stage.id}`))errors.push(`metaTrace não cita stage:${stage.id}`);
  for(const activity of state?.activities||[])if(!seenTrace.has(`activity:${activity.id}`))errors.push(`metaTrace não cita activity:${activity.id}`);
  return errors;
}

function stageAnalysisGroups(state){
  const groups=(state.stages||[]).map(stage=>({stage,activities:(state.activities||[]).filter(activity=>String(activity.stageId||'')===String(stage.id))}));
  const known=new Set((state.stages||[]).map(stage=>String(stage.id)));
  const orphaned=(state.activities||[]).filter(activity=>!known.has(String(activity.stageId||'')));
  if(orphaned.length)groups.push({stage:null,activities:orphaned});
  return groups;
}

function stageAnalysisPayloadState(state,stage,activities){
  return {
    project:state.project,version:state.version||state.stateVersion,clock:state.clock,
    localities:state.localities,personnel:state.personnel,
    stages:(state.stages||[]).map(item=>({id:item.id,name:item.name,status:item.status,dependsOn:item.dependsOn,entryGates:item.entryGates,localityId:item.localityId})),
    currentStage:stage,
    activityOverview:(state.activities||[]).map(item=>({id:item.id,stageId:item.stageId,localityId:item.localityId??item.localidadeObraId??null,status:item.status,dependsOn:item.dependsOn})),
    activities,materials:state.materials,cash:state.cash,purchases:state.purchases,evidence:state.evidence,
    agenda:state.agenda,notifications:state.notifications,resourceRequests:state.resourceRequests,cashRequests:state.cashRequests,
    diary:state.diary,blockers:state.blockers,stageSectorState:state.stageSectorState,constraints:state.constraints,
    equipment:state.equipment,commercial:state.commercial
  };
}

function stageBatchErrors(analysis,group,activities,includeStageTrace){
  const errors=[];
  if(!Array.isArray(analysis?.possibleActivities)||!Array.isArray(analysis?.metaTrace))return ['resposta sem possibleActivities/metaTrace arrays'];
  const expectedActivityIds=new Set(activities.map(activity=>String(activity.id)));
  const returnedActivityIds=analysis.possibleActivities.map(item=>String(item?.activityId||item?.id||''));
  if(new Set(returnedActivityIds).size!==returnedActivityIds.length||returnedActivityIds.length!==expectedActivityIds.size||returnedActivityIds.some(id=>!expectedActivityIds.has(id)))
    errors.push(`ids de decisão divergentes; esperados=${[...expectedActivityIds].join(',')}; retornados=${returnedActivityIds.join(',')||'(vazio)'}`);
  const requiredTraceKeys=[...activities.map(activity=>`activity:${activity.id}`),...(includeStageTrace&&group.stage?[`stage:${group.stage.id}`]:[])];
  const returnedTraceKeys=analysis.metaTrace.map(item=>`${String(item?.entityType||item?.type||'').toLowerCase()}:${item?.entityId||item?.id}`);
  if(new Set(returnedTraceKeys).size!==returnedTraceKeys.length||requiredTraceKeys.some(key=>!returnedTraceKeys.includes(key)))
    errors.push(`metaTrace do lote não cobre: ${requiredTraceKeys.filter(key=>!returnedTraceKeys.includes(key)).join(', ')||'ids únicos'}`);
  for(const activity of analysis.possibleActivities){
    if(!String(activity?.decision||activity?.status||'').trim())errors.push(`status ausente para activity:${activity?.activityId||activity?.id||'unknown'}`);
    if(!String(activity?.reasons||activity?.rationale||activity?.reason||'').trim())errors.push(`razão ausente para activity:${activity?.activityId||activity?.id||'unknown'}`);
  }
  for(const trace of analysis.metaTrace){
    if(!Array.isArray(trace?.fieldsUsed)||!trace.fieldsUsed.length)errors.push(`fieldsUsed ausente para ${trace?.entityType||trace?.type}:${trace?.entityId||trace?.id}`);
    if(!String(trace?.consequence||trace?.rationale||trace?.reason||'').trim())errors.push(`consequência ausente para ${trace?.entityType||trace?.type}:${trace?.entityId||trace?.id}`);
  }
  return errors;
}

function stageAnalysisRepairSystemPrompt(){
  return `A resposta anterior à análise de etapa foi rejeitada por cobertura incompleta. Use novamente o estado compartilhado e os metadados do lote; não conclua que uma atividade pode ser omitida por estar bloqueada ou indisponível. Reavalie com inferência NVIDIA e devolva exatamente uma decisão para cada requiredActivityId e as metaTrace para todos os requiredTraceKeys, copiando os ids literalmente. Não invente dados nem mude o estado. Responda JSON válido apenas: {"analysis":{"possibleActivities":[],"metaTrace":[]}}.`;
}

async function analyzeActivitiesByStage(env,{state,event,comprehensionContext,repairFeedback,cfg}){
  const possibleActivities=[];
  const metaTrace=[];
  const generations=[];
  const formatRepairs=[];
  const semanticRepairs=[];
  async function processBatch(group,activities,includeStageTrace){
    try{
      const targetCatalog=metaCatalog({stages:group.stage?[group.stage]:[],activities});
      const requiredActivityIds=activities.map(activity=>String(activity.id));
      const requiredTraceKeys=[...requiredActivityIds.map(id=>`activity:${id}`),...(includeStageTrace&&group.stage?[`stage:${group.stage.id}`]:[])];
      const requiredFieldsByTraceKey=Object.fromEntries(requiredTraceKeys.map(key=>{
        const separator=key.indexOf(':');
        const entityType=key.slice(0,separator);
        const entityId=key.slice(separator+1);
        const catalogEntities=entityType==='stage'?targetCatalog.stages:targetCatalog.activities;
        const catalogEntity=catalogEntities.find(item=>String(item.entityId)===entityId);
        return [key,requiredTraceFields(catalogEntity,entityType)];
      }));
      const outputSkeleton={analysis:{
        ...(requiredActivityIds.length?{possibleActivities:requiredActivityIds.map(activityId=>({activityId,localityId:null,decision:'',reasons:''}))}:{}),
        metaTrace:requiredTraceKeys.map(key=>{const [entityType,entityId]=key.split(':');return {entityType,entityId,fieldsUsed:[],consequence:''};})
      }};
      const batchPayload={mode:'strict-ai-state-transition:stage-analysis',state:stageAnalysisPayloadState(state,group.stage,activities),event,metadataCatalog:targetCatalog,comprehensionContext,repairFeedback,includeStageTrace,requiredActivityIds,requiredTraceKeys,requiredFieldsByTraceKey,outputSkeleton};
      const result=await requestNvidiaJson(env,{
        systemPrompt:stageActivityAnalysisSystemPrompt(),
        payload:batchPayload,
        maxTokens:cfg.analysisMaxTokens,temperature:cfg.temperature,
        phase:`NVIDIA stage analysis ${group.stage?.id||'without-stage'}`,
        expectedShape:'{"analysis":{"possibleActivities":[...],"metaTrace":[...]}}'
      });
       let analysis=result.parsed?.analysis||result.parsed;
       if(!activities.length&&!Array.isArray(analysis?.possibleActivities))analysis={...analysis,possibleActivities:[]};
      let coverageErrors=stageBatchErrors(analysis,group,activities,includeStageTrace);
      generations.push(result.generation);
      if(result.formatRepair)formatRepairs.push({stageId:group.stage?.id||null,activityIds:activities.map(item=>item.id),...result.formatRepair});
      if(coverageErrors.length){
        const originalCoverageErrors=[...coverageErrors];
        const correction=await requestNvidiaJson(env,{
          systemPrompt:stageAnalysisRepairSystemPrompt(),
          payload:{...batchPayload,priorAnalysis:analysis,validationErrors:coverageErrors},
          maxTokens:cfg.analysisMaxTokens,temperature:cfg.temperature,
          phase:`NVIDIA stage analysis repair ${group.stage?.id||'without-stage'}`,
          expectedShape:'{"analysis":{"possibleActivities":[...],"metaTrace":[...]}}'
        });
        analysis=correction.parsed?.analysis||correction.parsed;
        if(!activities.length&&!Array.isArray(analysis?.possibleActivities))analysis={...analysis,possibleActivities:[]};
        coverageErrors=stageBatchErrors(analysis,group,activities,includeStageTrace);
        generations.push(correction.generation);
        semanticRepairs.push({stageId:group.stage?.id||null,activityIds:activities.map(item=>item.id),issues:originalCoverageErrors});
        if(correction.formatRepair)formatRepairs.push({stageId:group.stage?.id||null,activityIds:activities.map(item=>item.id),...correction.formatRepair});
        if(coverageErrors.length)throw new Error(`camada de correção incompleta: ${coverageErrors.join('; ')}`);
      }
      return analysis;
    }catch(error){
      if(activities.length>1){
        const splitAt=Math.ceil(activities.length/2);
        const left=await processBatch(group,activities.slice(0,splitAt),includeStageTrace);
        const right=await processBatch(group,activities.slice(splitAt),false);
        return {possibleActivities:[...left.possibleActivities,...right.possibleActivities],metaTrace:[...left.metaTrace,...right.metaTrace]};
      }
      throw new Error(`Lote NVIDIA ${group.stage?.id||'sem etapa'} [${activities.map(item=>item.id).join(',')||'sem atividades'}] falhou: ${String(error?.message||error).slice(0,500)}`);
    }
  }
  for(const group of stageAnalysisGroups(state)){
    const activityChunks=group.activities.length
      ?Array.from({length:Math.ceil(group.activities.length/cfg.analysisBatchSize)},(_,index)=>group.activities.slice(index*cfg.analysisBatchSize,(index+1)*cfg.analysisBatchSize))
      :[[]];
    for(let index=0;index<activityChunks.length;index++){
      const analysis=await processBatch(group,activityChunks[index],index===0&&Boolean(group.stage));
      possibleActivities.push(...analysis.possibleActivities);
      metaTrace.push(...analysis.metaTrace);
    }
  }
  const analysis={possibleActivities,metaTrace};
  const errors=activityCoverageErrors(analysis,state);
  if(errors.length)throw new Error(`Análise por etapa incompleta: ${errors.slice(0,16).join('; ')}`);
  return {analysis,generations,formatRepairs,semanticRepairs};
}

function criticSystemPrompt(){
  return `Você é o auditor NVIDIA de uma transição operacional strict-ai-state-transition.
Não gere um novo estado. Audite se candidateState é fiel a previousState + event e às metadescrições.
Verifique principalmente:
- o fato do event foi aplicado exatamente, inclusive quantidades e ids;
- nenhum dado não relacionado desapareceu;
- todas as atividades foram reanalisadas;
- metaTrace prova uso de metadados de todas as etapas/atividades;
- cronograma respeita localidade e não transfere encarregado implicitamente;
- contexto único contém etapas, atividades, materiais, pessoal/equipes, equipamentos e cartografia quando disponíveis;
- pedidos de recurso/caixa e notificações são coerentes com o estado;
- quando auditContext.materialAccounting existir, use-o como reconciliação aritmética autoritativa. Em recebimento, quantity é delta do evento: receivedQuantity novo = anterior + quantity, usedQuantity não muda e stock novo = anterior stock + quantity. Em consumo, usedQuantity novo = anterior + quantity, receivedQuantity não muda e stock novo = anterior stock - quantity. Em ajuste de inventário, stock novo = stock anterior + deltaQuantity, sem reinterpretar o ajuste como recebimento/consumo e sem alterar os acumulados receivedQuantity/usedQuantity. Nunca trate os acumulados anteriores como quantidade deste evento. Se candidateState coincidir com expected, não reporte divergência numérica;
- quando auditContext.eventSemantics existir, use os efeitos esperados para validar a transição: aceite de agenda não conclui atividade; conclusão de agenda conclui o item e a atividade vinculada; aprovação de solicitação de compra não é recebimento nem pagamento e não deve alterar inventário/caixa;
- mudanças de metadescrição realmente alteram a decisão quando causalmente relevantes;
- estado é total, não delta.
Responda SOMENTE JSON: {"valid":true|false,"errors":["..."],"observations":["..."]}.`;
}

function auditEventFacts(previousState,event){
  const isReceipt=event?.type==='purchase.receipt.received';
  const isConsumption=event?.type==='material.consumption.recorded';
  const isInventoryAdjustment=event?.type==='inventory.adjustment.recorded';
  const eventSemantics={};
  if(event?.type==='agenda.item.accepted'){
    const item=(previousState?.agenda||[]).find(entry=>String(entry.id)===String(event?.payload?.agendaItemId));
    eventSemantics.agendaAcceptance={agendaItemId:event?.payload?.agendaItemId,beforeStatus:item?.status||null,expectedStatus:'accepted',activityCompletionImplied:false};
  }
  if(event?.type==='agenda.item.completed'){
    const item=(previousState?.agenda||[]).find(entry=>String(entry.id)===String(event?.payload?.agendaItemId));
    eventSemantics.agendaCompletion={agendaItemId:event?.payload?.agendaItemId,activityId:event?.payload?.activityId||item?.activityId||null,expectedAgendaStatus:'completed',expectedActivityStatus:'completed'};
  }
  if(event?.type==='purchase.request.approved'){
    const request=(previousState?.resourceRequests||[]).find(entry=>String(entry.id)===String(event?.payload?.requestId));
    eventSemantics.purchaseRequestApproval={requestId:event?.payload?.requestId,beforeStatus:request?.status||null,expectedStatus:'approved',approvedQuantity:event?.payload?.approvedQuantity??null,approvedAmountCents:event?.payload?.approvedAmountCents??null,inventoryReceiptImplied:false,cashPaymentImplied:false};
  }
  if(!isReceipt&&!isConsumption&&!isInventoryAdjustment)return Object.keys(eventSemantics).length?{eventSemantics}:{};
  const materials=new Map((previousState?.materials||[]).map(material=>[String(material.id),material]));
  const items=isInventoryAdjustment
    ?[{materialId:event?.payload?.materialId,quantity:event?.payload?.deltaQuantity}]
    :(Array.isArray(event?.payload?.items)?event.payload.items:[]);
  return {materialAccounting:{
    invariant:isInventoryAdjustment?'adjustment updates counted stock; receivedQuantity and usedQuantity are unchanged':'stock = receivedQuantity - usedQuantity',
    eventKind:isReceipt?'receipt':isConsumption?'consumption':'inventory-adjustment',
    materialEffects:items.map(item=>{
      const material=materials.get(String(item?.materialId||''));
      const quantity=Number(item?.quantity);
      const priorStock=Number(material?.stock);
      const priorReceived=Number(material?.receivedQuantity);
      const priorUsed=Number(material?.usedQuantity);
      if(!material||![quantity,priorStock,priorReceived,priorUsed].every(Number.isFinite))
        return {materialId:String(item?.materialId||''),quantity,expected:null};
      return {materialId:String(item.materialId),quantity,
        before:{stock:priorStock,receivedQuantity:priorReceived,usedQuantity:priorUsed},
        expected:isReceipt
          ?{stock:priorStock+quantity,receivedQuantity:priorReceived+quantity,usedQuantity:priorUsed}
          :isConsumption
            ?{stock:priorStock-quantity,receivedQuantity:priorReceived,usedQuantity:priorUsed+quantity}
            :{stock:priorStock+quantity,receivedQuantity:priorReceived,usedQuantity:priorUsed}
      };
    })
  },...(Object.keys(eventSemantics).length?{eventSemantics}:{})};
}

async function auditCandidate(env,{previousState,event,candidate}){
  const cfg=settings(env);
  const {parsed,generation:response,formatRepair}=await requestNvidiaJson(env,{
    systemPrompt:criticSystemPrompt(),payload:{previousState,event,candidate,auditContext:auditEventFacts(previousState,event)},maxTokens:cfg.criticMaxTokens,
    temperature:0,phase:'NVIDIA audit',expectedShape:'{"valid":true,"errors":[],"observations":[]}'
  });
  return {
    valid:parsed?.valid===true,
    errors:Array.isArray(parsed?.errors)?parsed.errors.map(String):[],
    observations:Array.isArray(parsed?.observations)?parsed.observations.map(String):[],
    model:response.model,
    usage:response.usage,
    formatRepair
  };
}

export async function runStrictNvidiaStateTransition(env,{previousState,event,configuration=null,inference={}}={}){
  if(!previousState||typeof previousState!=='object')throw new Error('previousState é obrigatório para strict-ai-state-transition.');
  if(!event||typeof event!=='object'||!event.id||!event.type)throw new Error('event com id e type é obrigatório para strict-ai-state-transition.');
  const cfg=settings(env);
  const catalog=metaCatalog(previousState);
  const cartography=configuration?.cartography||previousState?.project?.cartography||null;
  const transitionVersion=transitionVersionForEvent(event);
  const comprehensionContext={
    cartography,
    teams:Array.isArray(configuration?.teams)?configuration.teams:[],
    equipment:Array.isArray(configuration?.equipment)?configuration.equipment:(Array.isArray(previousState.equipment)?previousState.equipment:[])
  };
  let repairFeedback=[];
  let lastError=null;
  let lastPhase='NVIDIA event patch';

  for(let attempt=1;attempt<=cfg.retries;attempt++){
    try{
      lastPhase='NVIDIA event patch';
      const patchResult=await requestNvidiaJson(env,{
        systemPrompt:eventPatchSystemPrompt(),payload:{mode:'strict-ai-state-transition',previousState:eventPatchStateContext(previousState,event),event,transitionVersion,comprehensionContext:event?.type==='operation.state.requested'?{}:comprehensionContext,repairFeedback},
        maxTokens:cfg.patchMaxTokens,temperature:cfg.temperature,phase:'NVIDIA event patch',
        expectedShape:'{"eventApplied":{"id":"...","type":"..."},"statePatch":{"version":"...","lastEvent":{}}}',
        responseFormat:gptOssEventPatchResponseFormat(event,transitionVersion,previousState)
      });
      const patchGeneration=patchResult.generation;
      const patchCandidate=patchResult.parsed;
      if(!patchCandidate?.statePatch||typeof patchCandidate.statePatch!=='object'||Array.isArray(patchCandidate.statePatch))
        throw new Error('Camada de evento não retornou statePatch.');
      const eventApplied=event;
      const statePatch={...patchCandidate.statePatch,version:transitionVersion,lastEvent:event};
      const stateCandidate=materializeCandidateState({statePatch},previousState);
      const candidateState=stateCandidate.state;
      if(!candidateState)throw new Error('Camada de evento não materializou o estado completo.');

      lastPhase='NVIDIA per-stage activity/meta analysis';
      const activityLayer=await analyzeActivitiesByStage(env,{
        state:candidateState,event,comprehensionContext,cfg,repairFeedback
      });
      activityLayer.strategy='per-stage-adaptive-batches';
      const activityAnalysis=activityLayer.analysis;
      const activityGenerations=activityLayer.generations;
      const activityGeneration=activityGenerations[activityGenerations.length-1]||{};

      lastPhase='NVIDIA global schedule reconciliation';
      const scheduleResult=await requestNvidiaJson(env,{
        systemPrompt:scheduleReconciliationSystemPrompt(),payload:{mode:'strict-ai-state-transition:schedule-reconciliation',state:candidateState,event,analysis:activityAnalysis,repairFeedback},
        maxTokens:cfg.reconcileMaxTokens,temperature:cfg.temperature,phase:'NVIDIA global schedule reconciliation',
        expectedShape:'{"analysis":{"schedule":[],"blocked":[],"summary":"..."},"statePatch":{"resourceRequests":[],"cashRequests":[],"notifications":[]}}'
      });
      const scheduleGeneration=scheduleResult.generation;
      const scheduleCandidate=scheduleResult.parsed;
      const reconciliation=scheduleCandidate?.analysis||scheduleCandidate;
      if(!reconciliation||typeof reconciliation!=='object')throw new Error('Camada de cronograma nao retornou analysis.');
      let rawDerivedStatePatch=scheduleCandidate?.statePatch||reconciliation?.statePatch||{};
      let derivedNotificationRepair=null;
      const notificationRepairReason=derivedNotificationRepairReason(scheduleCandidate,event);
      if(notificationRepairReason){
        derivedNotificationRepair=await requestNvidiaJson(env,{
          systemPrompt:derivedNotificationRepairSystemPrompt(notificationRepairReason),
          payload:{
            mode:'strict-ai-state-transition:derived-notification-repair',
            state:candidateState,event,analysis:activityAnalysis,
            scheduleReconciliation:reconciliation,
            derivedStatePatch:{
              resourceRequests:Array.isArray(rawDerivedStatePatch.resourceRequests)?rawDerivedStatePatch.resourceRequests:[],
              cashRequests:Array.isArray(rawDerivedStatePatch.cashRequests)?rawDerivedStatePatch.cashRequests:[]
            }
          },
          maxTokens:Math.min(cfg.reconcileMaxTokens,2048),temperature:cfg.temperature,
          phase:'NVIDIA derived notification repair',
          expectedShape:'{"statePatch":{"notifications":[...]}}'
        });
        const repairedNotifications=derivedNotificationRepair.parsed?.statePatch?.notifications;
        if(!Array.isArray(repairedNotifications)||!repairedNotifications.length)
          throw new Error('Camada NVIDIA de reparo nao materializou notifications acionaveis.');
        const existingNotifications=Array.isArray(rawDerivedStatePatch.notifications)?rawDerivedStatePatch.notifications:[];
        const notificationsById=new Map();
        for(const item of [...existingNotifications,...repairedNotifications]){
          const key=String(item?.id||JSON.stringify(item));
          notificationsById.set(key,item);
        }
        rawDerivedStatePatch={...rawDerivedStatePatch,notifications:[...notificationsById.values()]};
      }
      const derivedStatePatch={};
      for(const key of ['resourceRequests','cashRequests','notifications']){
        if(Array.isArray(rawDerivedStatePatch?.[key]))derivedStatePatch[key]=rawDerivedStatePatch[key];
      }
      const reconciledState=mergeNvidiaStatePatch(candidateState,derivedStatePatch);
      const candidate={
        eventApplied,
        state:reconciledState,
        analysis:{...activityAnalysis,schedule:reconciliation.schedule,blocked:reconciliation.blocked,summary:reconciliation.summary}
      };
      const structure=structuralErrors(candidate,previousState,event,reconciledState);
      lastPhase='NVIDIA audit';
      const audit=await auditCandidate(env,{previousState,event,candidate});
      const errors=[...structure,...(audit.valid?[]:audit.errors.length?audit.errors:['auditor NVIDIA marcou valid=false'])];
      if(!errors.length){
        return {
          eventApplied:candidate.eventApplied,
          state:candidate.state,
          analysis:candidate.analysis,
          inference:{
            provider:'nvidia-api',model:patchGeneration.model||activityGeneration.model||scheduleGeneration.model||cfg.model,strict:true,
            mode:'strict-ai-state-transition',strategy:'layered',phases:['event-patch','activity-meta-analysis','global-schedule-reconciliation','audit'],requireFullState:true,requireMetaTrace:true,
            noDeterministicFallback:true,attempt,audit:{provider:'nvidia-api',model:audit.model,valid:true,observations:audit.observations},
            activityAnalysisStrategy:activityLayer.strategy,
            activityAnalysisBatchCount:activityGenerations.length,
            activityAnalysisSemanticRepairCount:activityLayer.semanticRepairs.length,
            activityAnalysisFallbackReason:activityLayer.primaryFailure||null,
            usage:{eventPatch:patchGeneration.usage||null,activityAnalysis:activityGenerations.map(item=>item.usage||null),scheduleReconciliation:scheduleGeneration.usage||null,derivedNotificationRepair:derivedNotificationRepair?.generation?.usage||null},
            formatRepairs:{eventPatch:patchResult.formatRepair,activityAnalysis:activityLayer.formatRepairs,scheduleReconciliation:scheduleResult.formatRepair,derivedNotificationRepair:derivedNotificationRepair?.formatRepair||null,audit:audit.formatRepair},
            semanticRepairs:activityLayer.semanticRepairs,
            phaseModels:{eventPatch:patchGeneration.model||cfg.model,activityAnalysis:activityGenerations.map(item=>item.model||cfg.model),scheduleReconciliation:scheduleGeneration.model||cfg.model,derivedNotificationRepair:derivedNotificationRepair?.generation?.model||null,audit:audit.model||cfg.model}
          }
        };
      }
      repairFeedback=errors.slice(0,24);
      lastPhase='NVIDIA structural/audit validation';
      lastError=new Error(`Transição NVIDIA rejeitada na tentativa ${attempt}: ${repairFeedback.join('; ')}`);
    }catch(error){
      lastError=error;
      lastPhase=`${lastPhase} (attempt ${attempt})`;
      repairFeedback=[String(error?.message||error)].slice(0,1);
    }
  }

  const error=new Error(`strict-ai-state-transition falhou sem fallback determinístico: ${lastError?.message||'NVIDIA não produziu estado válido.'}`);
  const detail=String(lastError?.message||lastError?.cause?.message||lastError?.name||lastError||'provider returned no error details').slice(0,1200);
  error.message+=` [${lastPhase}: ${detail}]`;
  error.cause=lastError||undefined;
  error.code='STRICT_AI_STATE_TRANSITION_FAILED';
  throw error;
}

export function strictNvidiaRuntime(env){
  const cfg=settings(env);
  return {
    provider:'nvidia-api',model:cfg.model,configured:Boolean(cfg.apiKey),strict:true,
    mode:'strict-ai-state-transition',strategy:'layered',phases:['event-patch','activity-meta-analysis','global-schedule-reconciliation','audit'],
    maxTokens:cfg.maxTokens,patchMaxTokens:cfg.patchMaxTokens,analysisMaxTokens:cfg.analysisMaxTokens,analysisBatchSize:cfg.analysisBatchSize,reconcileMaxTokens:cfg.reconcileMaxTokens,
    reasoningBudget:cfg.reasoningBudget,reasoningEffort:cfg.reasoningEffort,retries:cfg.retries,
    noDeterministicFallback:true
  };
}
