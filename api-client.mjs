const API_BASE_META='meta[name="belavista-api-base"]';
const AI_BASE_META='meta[name="belavista-ai-base"]';
const VAPID_META='meta[name="belavista-fcm-vapid-key"]';
const SETTINGS_KEY='belavista.integrations.v1';



const trimBase=value=>String(value||'').trim().replace(/\/$/,'');

const ngrokPortProxyBase=()=>{
  if(typeof location==='undefined')return '';
  if(!/\.ngrok-free\.dev$/i.test(String(location.hostname||'')))return '';
  const prefix=location.pathname.match(/^\/\d+(?=\/|$)/)?.[0]||'';
  // Keep working when an old bookmark opens /leads or /admin directly on
  // the tunnel. The port-router upstream is still 8080 in that case.
  return `${location.origin}${prefix||'/8080'}`;
};

function readSavedSettings(){
  try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}
  catch{return {};}
}

function isAiPath(path=''){
  return /^\/api\/ai(?:$|\/)|^\/api\/ai-tools$|^\/api\/ai\/status$|^\/api\/ai\/tools$|^\/api\/gemini(?:$|\/)/.test(String(path||''));
}

export function apiBase(){
  const proxy=ngrokPortProxyBase();
  if(proxy)return proxy;
  const runtime=trimBase(globalThis.BELAVISTA_API_BASE);
  if(runtime)return runtime;
  const saved=trimBase(readSavedSettings().apiBase);
  if(saved)return saved;
  const isLocalHost=typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname||''));
  if(isLocalHost)return '';
  const meta=trimBase(document.querySelector(API_BASE_META)?.getAttribute('content'));
  if(meta)return meta;
  return '';
}

export function aiBase(){
  const proxy=ngrokPortProxyBase();
  if(proxy)return proxy;
  const runtime=trimBase(globalThis.BELAVISTA_AI_BASE);
  if(runtime)return runtime;
  const savedSettings=readSavedSettings();
  const saved=trimBase(savedSettings.aiBase||savedSettings.workerAiBase||savedSettings.apiBase);
  if(saved)return saved;
  const meta=trimBase(document.querySelector(AI_BASE_META)?.getAttribute('content'));
  if(meta)return meta;
  return '';
}

export function apiUrl(path=''){
  const target=String(path||'');
  if(/^https?:\/\//i.test(target))return target;
  const normalized=target.startsWith('/')?target:`/${target}`;
  const base=isAiPath(normalized)?aiBase():apiBase();
  return base?`${base}${normalized}`:normalized;
}

export async function apiFetch(path, init={}){
  const headers=new Headers(init.headers||{});
  try{
    const token=await globalThis.BELAVISTA_GET_ID_TOKEN?.();
    if(token&&!headers.has('Authorization'))headers.set('Authorization',`Bearer ${token}`);
  }catch{}
  const actor=globalThis.BELAVISTA_ADMIN_ACTOR;
  if(actor?.role==='developer'&&typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(location.hostname||''))){
    headers.set('X-Belavista-Role','developer');
    headers.set('X-Belavista-User',String(actor.uid||'local-developer'));
    headers.set('X-Belavista-Name',String(actor.name||actor.email||'TI · Desenvolvimento'));
  }
  return fetch(apiUrl(path),{...init,headers});
}

export function firebaseMessagingVapidKey(){
  return String(
    globalThis.BELAVISTA_FCM_VAPID_KEY ||
    document.querySelector(VAPID_META)?.getAttribute('content') ||
    readSavedSettings().firebaseMessagingVapidKey ||
    ''
  ).trim();
}
