import {DEFAULT_STAGES_CONFIG,DEFAULT_PERSONNEL_CONFIG,DEFAULT_COMMERCIAL_CONFIG,DEFAULT_STATE_CONFIG} from './demo-defaults.js';

const DEFAULTS={stages:DEFAULT_STAGES_CONFIG,personnel:DEFAULT_PERSONNEL_CONFIG,commercial:DEFAULT_COMMERCIAL_CONFIG,state:DEFAULT_STATE_CONFIG};
const PATHS={stages:'data/operational/stages.json',personnel:'data/operational/personnel.json',commercial:'data/operational/commercial.json',state:'data/operational/state.json'};

const text=(value,max=500)=>String(value??'').trim().slice(0,max);

function runtime(env){
  return {
    configured:Boolean(env.GITHUB_PAT&&env.GITHUB_REPO),
    repo:text(env.GITHUB_REPO,240),
    branch:text(env.GITHUB_BRANCH||'master',120),
    token:text(env.GITHUB_PAT,500)
  };
}

function headers(env){
  const rt=runtime(env);
  return {
    accept:'application/vnd.github+json',
    authorization:`Bearer ${rt.token}`,
    'x-github-api-version':'2022-11-28',
    'user-agent':'belavista-cloudflare-worker'
  };
}

function b64ToUtf8(input=''){
  const binary=atob(String(input).replace(/\n/g,''));
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToB64(input=''){
  const bytes=new TextEncoder().encode(String(input));
  let binary='';
  const CHUNK=0x8000;
  for(let i=0;i<bytes.length;i+=CHUNK)binary+=String.fromCharCode(...bytes.subarray(i,i+CHUNK));
  return btoa(binary);
}

function clone(value){return JSON.parse(JSON.stringify(value));}

export function getGitHubRuntime(env){
  const rt=runtime(env);
  return {configured:rt.configured,repo:rt.repo,branch:rt.branch,paths:{...PATHS}};
}

export async function readOperationalConfig(env,kind,{fallback=true}={}){
  if(!PATHS[kind])throw new Error(`Configuração desconhecida: ${kind}`);
  const rt=runtime(env);
  if(!rt.configured){
    if(!fallback)throw new Error('GITHUB_PAT/GITHUB_REPO não configurados no Worker.');
    return {kind,path:PATHS[kind],source:'defaults',sha:'',data:clone(DEFAULTS[kind])};
  }
  const url=`https://api.github.com/repos/${rt.repo}/contents/${PATHS[kind]}?ref=${encodeURIComponent(rt.branch)}`;
  const response=await fetch(url,{headers:headers(env)});
  if(response.status===404&&fallback)return {kind,path:PATHS[kind],source:'defaults',sha:'',data:clone(DEFAULTS[kind])};
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.message||`GitHub respondeu ${response.status}.`);
  let data;
  try{data=JSON.parse(b64ToUtf8(payload.content||''));}
  catch(error){throw new Error(`JSON inválido em ${PATHS[kind]}: ${error.message}`);}
  return {kind,path:PATHS[kind],source:'github',sha:payload.sha||'',data};
}

export async function writeOperationalConfig(env,kind,data,{message,sha}={}){
  if(!PATHS[kind])throw new Error(`Configuração desconhecida: ${kind}`);
  const rt=runtime(env);
  if(!rt.configured)throw new Error('Configure GITHUB_PAT e GITHUB_REPO no Worker antes de salvar.');
  let currentSha=sha||'';
  if(!currentSha){
    const current=await readOperationalConfig(env,kind,{fallback:true});
    if(current.source==='github')currentSha=current.sha;
  }
  const url=`https://api.github.com/repos/${rt.repo}/contents/${PATHS[kind]}`;
  const body={
    message:text(message||`chore(belavista): atualizar ${kind}`,200),
    content:utf8ToB64(JSON.stringify(data,null,2)+'\n'),
    branch:rt.branch
  };
  if(currentSha)body.sha=currentSha;
  const response=await fetch(url,{method:'PUT',headers:{...headers(env),'content-type':'application/json'},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.message||`GitHub respondeu ${response.status}.`);
  return {
    kind,path:PATHS[kind],source:'github',
    sha:payload?.content?.sha||'',
    commitSha:payload?.commit?.sha||'',
    data
  };
}

export async function loadOperationalConfiguration(env){
  const [stages,personnel,commercial,state]=await Promise.all([
    readOperationalConfig(env,'stages'),readOperationalConfig(env,'personnel'),readOperationalConfig(env,'commercial'),readOperationalConfig(env,'state')
  ]);
  return {stages,personnel,commercial,state,github:getGitHubRuntime(env)};
}


// ---------------------------------------------------------------------------
// Generic GitHub JSON storage used by live end-to-end test sessions.
// These helpers still use the same GITHUB_PAT/GITHUB_REPO/GITHUB_BRANCH
// configured in the deployed Worker. No local fallback is accepted here.
// ---------------------------------------------------------------------------
function repositoryPath(path){
  const value=String(path||'').replace(/^\/+/, '');
  if(!value||value.includes('..')||value.includes('\\'))throw new Error('Caminho GitHub inválido.');
  return value;
}

export async function readRepositoryJson(env,path,{allowMissing=false}={}){
  const rt=runtime(env); const clean=repositoryPath(path);
  if(!rt.configured)throw new Error('GITHUB_PAT/GITHUB_REPO não configurados no Worker.');
  const url=`https://api.github.com/repos/${rt.repo}/contents/${clean}?ref=${encodeURIComponent(rt.branch)}`;
  const response=await fetch(url,{headers:headers(env)});
  if(response.status===404&&allowMissing)return {path:clean,source:'missing',sha:'',data:null};
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.message||`GitHub respondeu ${response.status}.`);
  let data;
  try{data=JSON.parse(b64ToUtf8(payload.content||''));}
  catch(error){throw new Error(`JSON inválido em ${clean}: ${error.message}`);}
  return {path:clean,source:'github',sha:payload.sha||'',data};
}

export async function writeRepositoryJson(env,path,data,{message,sha}={}){
  const rt=runtime(env); const clean=repositoryPath(path);
  if(!rt.configured)throw new Error('GITHUB_PAT/GITHUB_REPO não configurados no Worker.');
  let currentSha=sha||'';
  if(!currentSha){
    const current=await readRepositoryJson(env,clean,{allowMissing:true});
    if(current.source==='github')currentSha=current.sha;
  }
  const payload={
    message:text(message||`test(belavista): atualizar ${clean}`,200),
    content:utf8ToB64(JSON.stringify(data,null,2)+'\n'),
    branch:rt.branch
  };
  if(currentSha)payload.sha=currentSha;
  const response=await fetch(`https://api.github.com/repos/${rt.repo}/contents/${clean}`,{
    method:'PUT',headers:{...headers(env),'content-type':'application/json'},body:JSON.stringify(payload)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.message||`GitHub respondeu ${response.status}.`);
  return {path:clean,source:'github',sha:result?.content?.sha||'',commitSha:result?.commit?.sha||'',data};
}

export async function deleteRepositoryFile(env,path,{message,sha}={}){
  const rt=runtime(env); const clean=repositoryPath(path);
  if(!rt.configured)throw new Error('GITHUB_PAT/GITHUB_REPO não configurados no Worker.');
  let currentSha=sha||'';
  if(!currentSha){
    const current=await readRepositoryJson(env,clean,{allowMissing:true});
    if(current.source==='missing')return {ok:true,deleted:false,path:clean};
    currentSha=current.sha;
  }
  const response=await fetch(`https://api.github.com/repos/${rt.repo}/contents/${clean}`,{
    method:'DELETE',headers:{...headers(env),'content-type':'application/json'},
    body:JSON.stringify({message:text(message||`test(belavista): remover ${clean}`,200),sha:currentSha,branch:rt.branch})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.message||`GitHub respondeu ${response.status}.`);
  return {ok:true,deleted:true,path:clean,commitSha:result?.commit?.sha||''};
}
