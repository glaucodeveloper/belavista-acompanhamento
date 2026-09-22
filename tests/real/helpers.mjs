import assert from 'node:assert/strict';
export const workerBase=(process.env.BELAVISTA_WORKER_URL||'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/+$/,'');
export const hostingBase=(process.env.BELAVISTA_PUBLIC_BASE_URL||'https://belavista-3f887.web.app').replace(/\/+$/,'');
export const firebaseBase=(process.env.FIREBASE_DATABASE_URL||'https://belavista-3f887-default-rtdb.firebaseio.com').replace(/\/+$/,'');
export const adminToken=process.env.BELAVISTA_ADMIN_ID_TOKEN||'';
export const writeEnabled=/^(1|true|yes)$/i.test(process.env.BELAVISTA_REAL_WRITE||'');
export const githubWriteEnabled=/^(1|true|yes)$/i.test(process.env.BELAVISTA_GITHUB_WRITE_TEST||'');
export const authHeaders=(extra={})=>adminToken?{authorization:`Bearer ${adminToken}`,...extra}:extra;
export async function request(url,{method='GET',body,headers={},expectOk=true}={}){const response=await fetch(url,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const text=await response.text();let payload;try{payload=text?JSON.parse(text):null;}catch{payload=text;}if(expectOk)assert.ok(response.ok,`${method} ${url} falhou (${response.status}): ${text.slice(0,1200)}`);return {response,payload,text};}
export const api=(path,options={})=>request(`${workerBase}${path}`,options);
export const firebase=(path,options={})=>request(`${firebaseBase}/${path.replace(/^\/+|\/+$/g,'')}.json`,options);
export function normalizeLoop(payload={}){const plan=payload.plan||payload.operationalPlan||payload.result||{};return {payload,plan,schedule:payload.schedule||payload.agenda||plan.schedule||plan.agenda||plan.items||[],blocked:payload.blocked||payload.blockers||plan.blocked||plan.blockers||[],notifications:payload.notifications||plan.notifications||[],understanding:payload.understanding||payload.comprehension||payload.explanation||plan.understanding||{},realtime:payload.realtime||plan.realtime||{}};}
export const activityId=item=>item?.activityId||item?.activity?.id||item?.entityId||item?.id||'';
export const localityId=item=>item?.localityId||item?.localidadeObraId||item?.worksiteId||item?.workFrontId||item?.locality?.id||item?.localidade?.id||'';
export function assigneeIds(item={}){const raw=item.assigneeIds||item.personnelIds||item.resourceIds||item.assignees||item.resources||[];return Array.isArray(raw)?raw.map(v=>typeof v==='string'?v:(v?.id||v?.personId||v?.personnelId||'')).filter(Boolean):[];}
export const foremanId=item=>item?.foremanId||item?.encarregadoId||item?.ownerId||assigneeIds(item)[0]||'';
export function reasonText(item={}){const reasons=item.reasons||item.reason||item.rationale||item.blockers||item.message||'';return Array.isArray(reasons)?reasons.map(v=>typeof v==='string'?v:(v?.message||v?.code||JSON.stringify(v))).join(' | '):String(reasons||'');}
export const findByActivity=(items,id)=>(items||[]).find(item=>activityId(item)===id);
export const allByActivity=(items,id)=>(items||[]).filter(item=>activityId(item)===id);
export const providerOf=value=>value?.provider||value?.aiProvider||value?.modelProvider||value?.ai?.provider||'';
export const parseTime=value=>{const time=Date.parse(value);return Number.isFinite(time)?time:null;};
export function assertNoOverlap(items,personId){const reservations=(items||[]).filter(i=>assigneeIds(i).includes(personId)||foremanId(i)===personId).map(i=>({id:activityId(i),start:parseTime(i.start||i.startAt||i.plannedStart),end:parseTime(i.end||i.endAt||i.plannedEnd)})).filter(i=>i.start!==null&&i.end!==null).sort((a,b)=>a.start-b.start);for(let i=1;i<reservations.length;i++)assert.ok(reservations[i].start>=reservations[i-1].end,`Recurso ${personId} sobreposto: ${reservations[i-1].id} e ${reservations[i].id}`);}
export async function waitFor(fn,{timeoutMs=15000,intervalMs=750}={}){const started=Date.now();let last;while(Date.now()-started<timeoutMs){try{const value=await fn();if(value)return value;}catch(e){last=e;}await new Promise(r=>setTimeout(r,intervalMs));}if(last)throw last;return null;}
