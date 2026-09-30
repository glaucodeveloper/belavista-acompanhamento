import assert from 'node:assert/strict';
import {Agent,fetch as undiciFetch} from 'undici';

const TEST_HTTP_TIMEOUT_MS=Number(process.env.BELAVISTA_TEST_HTTP_TIMEOUT_MS||720000);
const TEST_HTTP_DISPATCHER=new Agent({
  headersTimeout:TEST_HTTP_TIMEOUT_MS,
  bodyTimeout:TEST_HTTP_TIMEOUT_MS
});
const fetch=(input,init={})=>undiciFetch(input,{...init,dispatcher:TEST_HTTP_DISPATCHER});

export const BASE_URL=(process.env.BELAVISTA_WORKER_URL||'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/+$/,'');
export const ADMIN_TOKEN=process.env.BELAVISTA_ADMIN_ID_TOKEN||'';
export const WRITE_ENABLED=process.env.BELAVISTA_INFERENCE_WRITE==='1';
export const RTDB_URL=(process.env.BELAVISTA_FIREBASE_DB_URL||'https://belavista-3f887-default-rtdb.firebaseio.com').replace(/\/+$/,'');

export function authHeaders(extra={}){
  return {
    'content-type':'application/json',
    ...(ADMIN_TOKEN?{authorization:`Bearer ${ADMIN_TOKEN}`} : {}),
    ...extra
  };
}

export async function api(path,{method='GET',body,headers={},allowStatus=[]}={}){
  const response=await fetch(`${BASE_URL}${path}`,{
    method,
    headers:{...authHeaders(),...headers},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await response.text();
  let payload=null;
  try{payload=text?JSON.parse(text):null;}catch{payload={raw:text};}
  if(!response.ok&&!allowStatus.includes(response.status)){
    throw new Error(`${method} ${path} -> HTTP ${response.status}: ${text.slice(0,1200)}`);
  }
  return {response,payload};
}

export async function infer(previousState,event,{persist=false,extra={}}={}){
  const request={
    mode:'strict-ai-state-transition',
    persist,
    previousState,
    event,
    inference:{
      provider:'nvidia',
      strict:true,
      requireFullState:true,
      requireMetaTrace:true,
      noDeterministicFallback:true,
      ...extra
    }
  };
  const {payload}=await api('/api/operational-loop',{method:'POST',body:request});
  return payload;
}

export function getState(payload){
  return payload?.state||payload?.operationalState||payload?.result?.state||payload?.operationalPlan?.state||null;
}
export function getAnalysis(payload){return payload?.analysis||payload?.understanding||payload?.result?.analysis||{};}
export function getInference(payload){return payload?.inference||payload?.result?.inference||payload?.analysis?.inference||{};}
export function getEffects(payload){return payload?.effects||payload?.result?.effects||{};}

export function assertStrictNvidia(payload){
  const inf=getInference(payload);
  const provider=String(inf.provider||payload?.provider||payload?.understanding?.provider||'');
  assert.match(provider,/nvidia/i,'A transição de estado não foi produzida pela NVIDIA API.');
  assert.ok(inf.strict!==false,'O endpoint declarou strict=false.');
  assert.doesNotMatch(provider,/deterministic|fallback|mock/i,'Fallback determinístico não é aceito na bateria real.');
  assert.ok(inf.model||payload?.model||payload?.understanding?.model,'Resposta não identifica o modelo de inferência.');
}

const FULL_STATE_KEYS=['project','clock','localities','personnel','stages','activities','materials','cash','purchases','evidence','agenda','notifications','resourceRequests','cashRequests','diary','blockers','stageSectorState','constraints','commercial'];
export function assertFullState(payload,{previousState=null}={}){
  const state=getState(payload);
  assert.ok(state&&typeof state==='object','Resposta não contém state completo.');
  for(const key of FULL_STATE_KEYS)assert.ok(Object.hasOwn(state,key),`state.${key} ausente; o endpoint devolveu delta em vez de estado total.`);
  assert.ok(state.version||state.stateVersion||payload?.stateVersion,'Estado não possui versão/identidade da transição.');
  if(previousState){
    assert.equal(state.project?.id,previousState.project?.id,'Projeto mudou durante uma transição de evento.');
    assert.ok(state.stages.length>=previousState.stages.length,'Etapas desapareceram do estado completo.');
    assert.ok(state.activities.length>=previousState.activities.length,'Atividades desapareceram do estado completo.');
  }
  return state;
}

export function assertEventApplied(payload,event){
  const applied=payload?.eventApplied||payload?.event||payload?.transition?.event||getState(payload)?.lastEvent;
  assert.ok(applied,'Resposta não identifica o evento analisado.');
  assert.equal(applied.id,event.id,'Resposta não vincula o estado ao event.id enviado.');
  assert.equal(applied.type,event.type,'Resposta não vincula o estado ao event.type enviado.');
}

export function metaTrace(payload){
  const analysis=getAnalysis(payload);
  return analysis.metaTrace||analysis.metadataTrace||analysis.metaUsage||[];
}

export function assertMetaUsed(payload,{entityType,entityId,fields=[]}){
  const trace=metaTrace(payload);
  assert.ok(Array.isArray(trace)&&trace.length,'A IA não devolveu metaTrace comprovando quais metadados usou.');
  const entry=trace.find(item=>String(item.entityType||item.type||'').toLowerCase().includes(entityType.toLowerCase())&&String(item.entityId||item.id||'')===entityId);
  assert.ok(entry,`metaTrace não cita ${entityType}:${entityId}.`);
  const used=(entry.fieldsUsed||entry.fields||entry.usedFields||[]).map(String);
  for(const field of fields)assert.ok(used.some(v=>v.toLowerCase()===field.toLowerCase()),`metaTrace de ${entityId} não prova uso de ${field}.`);
  assert.ok(entry.consequence||entry.reason||entry.effect||entry.rationale,`metaTrace de ${entityId} não explica consequência causal.`);
  return entry;
}

export function decisions(payload){
  const a=getAnalysis(payload);
  return a.possibleActivities||a.activityDecisions||a.decisions||[];
}
export function schedule(payload){const a=getAnalysis(payload);return a.schedule||getState(payload)?.agenda||[];}
export function blocked(payload){const a=getAnalysis(payload);return a.blocked||decisions(payload).filter(x=>/block|wait|hold|request/i.test(String(x.decision||x.status||x.action||'')));}
export function decisionFor(payload,activityId){return decisions(payload).find(x=>(x.activityId||x.id)===activityId)||schedule(payload).find(x=>(x.activityId||x.id)===activityId)||blocked(payload).find(x=>(x.activityId||x.id)===activityId);}
export function reasonText(item){return JSON.stringify(item?.reasons||item?.reason||item?.rationale||item?.why||item||{}).toLowerCase();}

export function findMaterial(state,idOrName){return state.materials.find(m=>m.id===idOrName||m.name===idOrName);}
export function findActivity(state,id){return state.activities.find(a=>a.id===id);}
export function findStage(state,id){return state.stages.find(s=>s.id===id);}
export function findPersonnel(state,id){return state.personnel.find(p=>p.id===id);}

export function notificationText(state){return JSON.stringify(state.notifications||[]).toLowerCase();}
export function requestText(state){return JSON.stringify({resources:state.resourceRequests||[],cash:state.cashRequests||[]}).toLowerCase();}

export function assertNoImplicitForemanTransfer(payload,previousState){
  const state=getState(payload);
  const people=new Map(state.personnel.map(p=>[p.id,p]));
  for(const item of schedule(payload)){
    const loc=item.localityId||item.localidadeObraId;
    const ids=[...(item.assigneeIds||item.personnelIds||[]),item.foremanId,item.encarregadoId].filter(Boolean);
    for(const id of ids){
      const person=people.get(id);
      if(person)assert.equal(person.localityId||person.localidadeObraId,loc,`${id} foi alocado implicitamente fora da localidade.`);
    }
  }
  if(previousState){
    const before=new Map(previousState.personnel.map(p=>[p.id,p.localityId||p.localidadeObraId]));
    for(const p of state.personnel)if(before.has(p.id))assert.equal(p.localityId||p.localidadeObraId,before.get(p.id),`Localidade de ${p.id} mudou sem evento explícito.`);
  }
}

export async function firebase(path){
  const r=await fetch(`${RTDB_URL}/${path.replace(/^\/+|\/+$/g,'')}.json`);
  return {response:r,payload:await r.json().catch(()=>null)};
}

export function event(id,type,payload={},actor={id:'admin-warley',role:'admin'}){
  return {id,type,at:'2026-09-01T08:00:00-03:00',actor,payload};
}
