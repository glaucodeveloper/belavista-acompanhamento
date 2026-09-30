// BELAVISTA_PUBLIC_LEAD_REGISTER_V5342
import {publishLeadRealtime} from './realtime.js';

const text=(value,max=240)=>String(value??'').trim().slice(0,max);
const digits=value=>String(value??'').replace(/\D/g,'');
const instagramHandle=value=>{const handle=text(value,60).replace(/^@+/,'').trim();return /^[a-z0-9._]{1,30}$/i.test(handle)?'@'+handle:'';};
const safeKey=value=>text(value,160).replace(/[.#$\[\]/]/g,'-')||'unknown';

function bytesBase64(bytes){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
const textBase64=value=>bytesBase64(new TextEncoder().encode(value));
async function sha256Hex(value){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function normalizeDocument(input={}){const type=text(input.type,12).toUpperCase(),value=digits(input.value);if(!['CPF','RG','CNPJ'].includes(type))throw new Error('Tipo de documento inválido.');if(type==='CPF'&&value.length!==11)throw new Error('CPF inválido.');if(type==='CNPJ'&&value.length!==14)throw new Error('CNPJ inválido.');if(type==='RG'&&value.length<5)throw new Error('RG inválido.');return {type,value};}
async function documentKey(env){const encoded=text(env.LEAD_DOCUMENT_KEY,200);if(!encoded)throw new Error('LEAD_DOCUMENT_KEY não configurada.');let raw;try{raw=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}catch{throw new Error('LEAD_DOCUMENT_KEY deve estar em base64.');}if(raw.length!==32)throw new Error('LEAD_DOCUMENT_KEY deve representar 32 bytes.');return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt']);}
async function encryptDocument(value,env){const key=await documentKey(env),iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));return {algorithm:'AES-256-GCM',iv:bytesBase64(iv),ciphertext:bytesBase64(new Uint8Array(ciphertext))};}
function githubConfig(env){const full=text(env.BELAVISTA_GITHUB_REPO||env.GITHUB_REPOSITORY||env.GITHUB_REPO,240);let owner=text(env.GITHUB_OWNER,100),repo=text(env.GITHUB_REPO,140);if(full.includes('/'))[owner,repo]=full.split('/',2);const token=text(env.GITHUB_PAT||env.GITHUB_TOKEN,500),branch=text(env.BELAVISTA_GITHUB_BRANCH||env.GITHUB_BRANCH||'master',160);if(!owner||!repo||!token)throw new Error('Configure GITHUB_REPO no formato owner/repo e GITHUB_PAT no Worker.');return {owner,repo,token,branch};}
async function writeLeadToRepo(record,env){const cfg=githubConfig(env),created=new Date(record.createdAt),yyyy=String(created.getUTCFullYear()),mm=String(created.getUTCMonth()+1).padStart(2,'0'),path=`data/public-leads/${yyyy}/${mm}/${record.id}.json`;const url=`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`;const response=await fetch(url,{method:'PUT',headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'belavista-lead-register-v5342','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({branch:cfg.branch,message:`lead(public): ${record.id}`,content:textBase64(JSON.stringify(record,null,2)+'\n')})});const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{};}catch{}if(!response.ok)throw new Error(payload?.message||`GitHub HTTP ${response.status}.`);return {path,branch:cfg.branch,commitSha:text(payload?.commit?.sha,80),contentSha:text(payload?.content?.sha,80)};}
function cleanHistory(history){if(!Array.isArray(history))return [];return history.slice(-8).map(turn=>({role:turn?.role==='assistant'?'assistant':'user',content:text(turn?.content,1000),selectedLot:text(turn?.selectedLot,120),selectedLotId:text(turn?.selectedLotId,120)})).filter(turn=>turn.content);}

export async function registerPublicLead(env,input={}){
  if(input?.consent!==true)throw new Error('Consentimento obrigatório.');
  const name=text(input.name,120),whatsapp=digits(input.whatsapp).slice(0,20);
  if(name.length<2)throw new Error('Nome inválido.');
  if(whatsapp.length<10)throw new Error('WhatsApp inválido.');
  const document=normalizeDocument(input.document||{}),createdAt=new Date().toISOString(),id=safeKey(`LEAD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`);
  const record={schema:'belavista.public-lead.v1',id,createdAt,source:'public-map',project:'Aliança Park',status:'Novo lead',contact:{name,whatsapp,instagramHandle:instagramHandle(input.instagramHandle||input.instagram)},document:{type:document.type,last4:document.value.slice(-4),sha256:await sha256Hex(document.value),encrypted:await encryptDocument(document.value,env)},lot:{selectedLot:text(input?.lot?.selectedLot,160),selectedLotId:text(input?.lot?.selectedLotId,160),selectedLotData:input?.lot?.selectedLotData||null},intent:{message:text(input?.intent?.message,1200),detectedAt:text(input?.intent?.detectedAt,80)||createdAt},conversation:{id:text(input?.conversation?.id,160),history:cleanHistory(input?.conversation?.history)},page:{href:text(input?.page?.href,800),source:text(input?.page?.source,80)||'public-map'},consent:{granted:true,recordedAt:createdAt}};

  // GitHub is the source of truth. Realtime only fires after persistence succeeds.
  const repo=await writeLeadToRepo(record,env);
  const realtime=await publishLeadRealtime(env,{lead:{id:record.id,createdAt:record.createdAt,name:record.contact.name,whatsappLast4:record.contact.whatsapp.slice(-4),instagramHandle:record.contact.instagramHandle,selectedLot:record.lot.selectedLot,selectedLotId:record.lot.selectedLotId,repoPath:repo.path,repoCommitSha:repo.commitSha}});
  return {record,repo,realtime};
}
