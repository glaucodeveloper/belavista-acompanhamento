const STORAGE_KEY='belavista.api-base';
const API_PREFIX='/api/';

function sanitizeBase(value=''){
  const normalized=String(value||'').trim();
  if(!normalized)return '';
  return normalized.replace(/\/+$/,'');
}

function readQueryBase(){
  try{
    const value=new URLSearchParams(globalThis.location?.search||'').get('apiBase');
    return sanitizeBase(value);
  }catch{
    return '';
  }
}

function readMetaBase(){
  try{
    return sanitizeBase(document.querySelector('meta[name="belavista-api-base"]')?.content||'');
  }catch{
    return '';
  }
}

function readStoredBase(){
  try{
    return sanitizeBase(localStorage.getItem(STORAGE_KEY)||'');
  }catch{
    return '';
  }
}

export function getBelavistaApiBase(){
  return sanitizeBase(globalThis.BELAVISTA_API_BASE||readQueryBase()||readMetaBase()||readStoredBase());
}

export function setBelavistaApiBase(value,{persist=false}={}){
  const base=sanitizeBase(value);
  globalThis.BELAVISTA_API_BASE=base;
  if(persist){
    try{
      if(base)localStorage.setItem(STORAGE_KEY,base);
      else localStorage.removeItem(STORAGE_KEY);
    }catch{}
  }
  return base;
}

function rewriteUrl(input){
  const base=getBelavistaApiBase();
  if(!base)return null;
  if(typeof input==='string'){
    if(input.startsWith(API_PREFIX.slice(0,-1)))return `${base}${input.startsWith('/')?'':'/'}${input}`;
    if(input.startsWith('./api/'))return `${base}/api/${input.slice('./api/'.length)}`;
    if(/^https?:\/\//.test(input)){
      const url=new URL(input);
      const origin=globalThis.location?.origin;
      if(origin&&url.origin===origin&&url.pathname.startsWith('/api/'))return `${base}${url.pathname}${url.search}`;
    }
    return null;
  }
  if(input instanceof Request){
    const url=new URL(input.url,globalThis.location?.href||'http://localhost');
    if(url.origin!==globalThis.location?.origin||!url.pathname.startsWith('/api/'))return null;
    return new Request(`${base}${url.pathname}${url.search}`,input);
  }
  return null;
}

if(typeof globalThis.fetch==='function'&&!globalThis.__belavistaApiFetchPatched){
  const nativeFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=(input,init)=>{
    const rewritten=rewriteUrl(input);
    return nativeFetch(rewritten||input,init);
  };
  globalThis.__belavistaApiFetchPatched=true;
}
