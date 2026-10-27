// BELAVISTA_ADMIN_RUNTIME_V11
// Cloud admin adapter: stage config over GitHub-backed Worker, evidence-gated cash events,
// and separation between the public presentation map and the administrative map.

const text=(v,max=500)=>String(v??'').trim().slice(0,max);

function baseUrl(){
  const runtime=String(globalThis.BELAVISTA_API_BASE||'').replace(/\/$/,'');
  if(runtime)return runtime;
  try{const saved=JSON.parse(localStorage.getItem('belavista.integrations.v1')||'{}');if(saved.apiBase)return String(saved.apiBase).replace(/\/$/,'');}catch{}
  return String(document.querySelector('meta[name="belavista-api-base"]')?.content||'').replace(/\/$/,'');
}
function api(path){const base=baseUrl();return base?`${base}${path}`:path;}
async function authHeaders(extra={}){
  const headers=new Headers(extra);
  try{const token=await globalThis.BELAVISTA_GET_ID_TOKEN?.();if(token)headers.set('Authorization',`Bearer ${token}`);}catch{}
  return headers;
}
async function adminFetch(path,init={}){
  const headers=await authHeaders(init.headers||{});
  return fetch(api(path),{...init,headers});
}
let adminRuntimeProgram=null;
let stageConfigBridgeOwnedByTypeScript=false;
try{
  adminRuntimeProgram=await import('./dist/frontend/program.js');
  if(typeof adminRuntimeProgram.installAtlasAdminStageConfigBridgeV1==='function'){
    adminRuntimeProgram.installAtlasAdminStageConfigBridgeV1({globalRef:globalThis,locationRef:location});
    document.documentElement.dataset.adminStageConfigBridgeOwnerV1='typescript';
    stageConfigBridgeOwnedByTypeScript=true;
  }
}catch(error){console.warn('[Aliança Park] Ponte TS de configuração de etapas indisponível; usando recuperação MJS.',error);}
if(!stageConfigBridgeOwnedByTypeScript){
  const recovery=await import('./admin-stage-config-bridge-legacy-v1.js?v=admin-stage-config-bridge-recovery-v1');
  recovery.installLegacyAtlasAdminStageConfigBridgeV1({globalRef:globalThis,locationRef:location});
  document.documentElement.dataset.adminStageConfigBridgeOwnerV1='mjs-fallback';
}
let cashEvidenceOwnerByTypeScript=false;
if(typeof adminRuntimeProgram?.mountAtlasAdminCashEvidenceRuntimeV1==='function'){
  try{
    adminRuntimeProgram.mountAtlasAdminCashEvidenceRuntimeV1({documentRef:document,windowRef:window,apiFetch:adminFetch});
    document.documentElement.dataset.adminCashEvidenceOwnerV1='typescript';
    cashEvidenceOwnerByTypeScript=true;
  }catch(error){console.warn('[Aliança Park] Owner TS do comprovante de caixa falhou; usando recuperação MJS.',error);}
}
if(!cashEvidenceOwnerByTypeScript){
  const recovery=await import('./admin-cash-evidence-legacy-v1.js?v=admin-cash-evidence-recovery-v1');
  recovery.installLegacyAtlasAdminCashEvidenceV1({documentRef:document,windowRef:window,apiFetch:adminFetch});
  document.documentElement.dataset.adminCashEvidenceOwnerV1='mjs-fallback';
}
let mapContextOwnerByTypeScript=false;
if(typeof adminRuntimeProgram?.installAtlasAdminMapComponentRuntimeV1==='function'){
  try{
    adminRuntimeProgram.installAtlasAdminMapComponentRuntimeV1({documentRef:document,windowRef:window,registry:customElements});
    document.documentElement.dataset.adminMapContextOwnerV1='typescript';
    document.documentElement.dataset.adminMapComponentRuntimeOwnerV1='typescript';
    mapContextOwnerByTypeScript=true;
  }catch(error){console.warn('[Aliança Park] Owner TS do contexto do mapa falhou; usando recuperação MJS.',error);}
}
if(!mapContextOwnerByTypeScript){
  const recovery=await import('./admin-map-context-legacy-v1.js?v=admin-map-context-recovery-v1');
  recovery.installLegacyAtlasAdminMapContextV1({documentRef:document,windowRef:window,registry:customElements});
  document.documentElement.dataset.adminMapContextOwnerV1='mjs-fallback';
}
console.info('[BELAVISTA_ADMIN_RUNTIME_V11] ativo');
