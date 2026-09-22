const LOOPBACK_HOSTS=new Set(['127.0.0.1','localhost','::1']);

const text=(value,max=240)=>String(value??'').trim().slice(0,max);
const slug=(value,fallback='alianca-park')=>text(value,120).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||fallback;

export function normalizeCamofoxBaseUrl(value=''){
  const raw=text(value,500);
  if(!raw)return '';
  let url;
  try{url=new URL(raw);}catch{throw new Error('CAMOFOX_BASE_URL precisa ser uma URL válida.');}
  if(!['http:','https:'].includes(url.protocol)||!LOOPBACK_HOSTS.has(url.hostname))throw new Error('A ponte Camofox deve operar somente em localhost.');
  url.pathname='';url.search='';url.hash='';
  return url.toString().replace(/\/$/,'');
}

export function createCamofoxSessionRequest(setup={}){
  const handle=text(setup?.instagram?.handle||setup?.instagramHandle,80).replace(/^@/,'');
  if(!handle)throw new Error('Informe o @ do Instagram do empreendimento antes de conectar.');
  return {
    userId:`alianca-park-${slug(handle,'instagram')}`,
    sessionKey:'instagram-directs',
    url:'https://www.instagram.com/direct/inbox/',
    trace:false
  };
}

function authHeaders(apiKey=''){
  return apiKey?{authorization:`Bearer ${apiKey}`}:{};
}

export async function getCamofoxBridgeStatus({baseUrl=process.env.CAMOFOX_BASE_URL||'http://127.0.0.1:9377',apiKey=process.env.CAMOFOX_API_KEY||'',fetchImpl=globalThis.fetch}={}){
  const endpoint=normalizeCamofoxBaseUrl(baseUrl);
  if(!endpoint)return {available:false,configured:false,reason:'CAMOFOX_BASE_URL não configurada.'};
  try{
    const response=await fetchImpl(`${endpoint}/openapi.json`,{headers:authHeaders(apiKey),signal:AbortSignal.timeout(2500)});
    return response.ok
      ? {available:true,configured:true,endpoint,reason:'Ponte local disponível.'}
      : {available:false,configured:true,endpoint,reason:`Ponte respondeu HTTP ${response.status}.`};
  }catch(error){
    return {available:false,configured:true,endpoint,reason:`Ponte indisponível: ${error?.message||'erro de rede'}`};
  }
}

export async function openInstagramInbox(setup,{baseUrl=process.env.CAMOFOX_BASE_URL||'http://127.0.0.1:9377',apiKey=process.env.CAMOFOX_API_KEY||'',fetchImpl=globalThis.fetch}={}){
  const endpoint=normalizeCamofoxBaseUrl(baseUrl);
  if(!endpoint)throw new Error('Configure CAMOFOX_BASE_URL para abrir a sessão local do Instagram.');
  const session=createCamofoxSessionRequest(setup);
  const response=await fetchImpl(`${endpoint}/tabs`,{
    method:'POST',
    headers:{'content-type':'application/json',...authHeaders(apiKey)},
    body:JSON.stringify(session),
    signal:AbortSignal.timeout(8000)
  });
  const raw=await response.text();
  let payload={};try{payload=raw?JSON.parse(raw):{};}catch{}
  if(!response.ok)throw new Error(payload?.error||payload?.message||`Camofox respondeu HTTP ${response.status}.`);
  return {endpoint,session,tabId:payload?.tabId||payload?.id||null,opened:true};
}

export function fallbackInstagramDraft(report={}){
  const name=text(report?.lead?.name,80)||'';
  const messages=Array.isArray(report?.messages)?report.messages:[];
  const lastInbound=[...messages].reverse().find(message=>message.direction==='inbound');
  const greeting=name?`Olá, ${name}!`:'Olá!';
  const context=lastInbound?.body?` Recebi sua mensagem e vou seguir por aqui.`:'';
  return `${greeting}${context} Posso ajudar a consultar disponibilidade, condições e agendar seu atendimento com um corretor do Aliança Park. Qual lote ou faixa de valor você procura?`;
}
