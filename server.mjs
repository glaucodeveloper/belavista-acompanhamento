import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot=fileURLToPath(new URL('.', import.meta.url));
try { const env = await readFile(join(serverRoot, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if(match && !process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,''); } } catch {}
const root = process.env.BELAVISTA_FRONTEND_ROOT ? resolve(process.env.BELAVISTA_FRONTEND_ROOT) : fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const publicOrigin = String(process.env.PUBLIC_ORIGIN || '').replace(/\/$/,'');
const apiBase = String(process.env.BELAVISTA_API_BASE || '').trim().replace(/\/$/,'');
const model = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json'};
const {health,entitySummary,listRecords,createRecord,updateRecord,deleteRecord}=await import('./persistence.mjs');

async function body(req){ let data=''; for await (const chunk of req) data+=chunk; return JSON.parse(data||'{}'); }
async function rawBody(req){ let data=''; for await (const chunk of req) data+=chunk; return data; }
function requestOrigin(req){
  if(publicOrigin)return publicOrigin;
  const forwardedHost=String(req.headers['x-forwarded-host']||'').split(',')[0].trim();
  const forwardedProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
  const host=forwardedHost||req.headers.host||`localhost:${port}`;
  return `${forwardedProto||'http'}://${host}`;
}
async function proxyApi(req,res,pathname){
  const upstreamUrl=new URL(`${apiBase}${pathname}`);
  const search=new URL(req.url,'http://localhost').search;
  if(search)upstreamUrl.search=search;
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers)){
    if(value==null)continue;
    if(['host','connection','content-length'].includes(key.toLowerCase()))continue;
    headers.set(key,Array.isArray(value)?value.join(', '):value);
  }
  headers.set('x-forwarded-host',req.headers.host||`localhost:${port}`);
  headers.set('x-forwarded-proto',requestOrigin(req).startsWith('https://')?'https':'http');
  const upstream=await fetch(upstreamUrl,{
    method:req.method,
    headers,
    body:['GET','HEAD'].includes(req.method||'GET')?undefined:await rawBody(req)
  });
  const buffer=Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status,Object.fromEntries(upstream.headers.entries()));
  res.end(buffer);
}
async function gemini(req,res){
  if(!process.env.GEMINI_API_KEY) return send(res,503,{error:'GEMINI_API_KEY não configurada no servidor.'});
  const {message,view='assistant'}=await body(req);
  if(typeof message!=='string'||!message.trim()) return send(res,400,{error:'Mensagem inválida.'});
  const prompt=`Você é o assistente operacional do empreendimento Belavista. Responda em português do Brasil, de forma objetiva e prática. Contexto da tela: ${view}. Dados disponíveis: 2 etapas atrasadas, 3 compras críticas, completude de 63%, 28 colaboradores, inventário de R$ 1.842.560,45. Não invente dados fora desse contexto. Pergunta: ${message}`;
  const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:.35,maxOutputTokens:500}})});
  const json=await upstream.json();
  if(!upstream.ok) return send(res,502,{error:json?.error?.message||'Gemini recusou a solicitação.'});
  return send(res,200,{text:json?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'Gemini não retornou texto.'});
}
function aiStatus(origin=''){
  return {
    provider:apiBase?'cloudflare-worker-proxy':process.env.GEMINI_API_KEY?'gemini':'demo',
    model:process.env.GEMINI_API_KEY?model:'deterministic',
    configured:Boolean(apiBase||process.env.GEMINI_API_KEY),
    apiBase:apiBase||origin,
    mode:apiBase?'proxy':'local'
  };
}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function recordsApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/records')return send(res,200,{records:listRecords(),entities:entitySummary()});
  if(req.method==='POST'&&pathname==='/api/records')return send(res,201,createRecord(await body(req)));
  const match=pathname.match(/^\/api\/records\/([^/]+)$/); if(!match)return send(res,404,{error:'Registro não encontrado.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){
    const record=updateRecord(id,await body(req)); return record?send(res,200,record):send(res,404,{error:'Registro não encontrado.'});
  }
  if(req.method==='DELETE')return deleteRecord(id)?send(res,200,{ok:true,id}):send(res,404,{error:'Registro não encontrado.'});
  return send(res,405,{error:'Método não permitido.'});
}
createServer(async (req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const origin=requestOrigin(req);
    if(apiBase&&pathname.startsWith('/api/'))return await proxyApi(req,res,pathname);
    if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{...health(),origin,ai:aiStatus(origin)});
    if(pathname==='/api/runtime'&&req.method==='GET')return send(res,200,{origin,apiBase:apiBase||origin,ai:aiStatus(origin)});
    if(pathname==='/api/ai/status'&&req.method==='GET')return send(res,200,aiStatus(origin));
    if(pathname==='/api/entities'&&req.method==='GET')return send(res,200,{entities:entitySummary()});
    if(pathname==='/api/records'||pathname.startsWith('/api/records/'))return await recordsApi(req,res,pathname);
    if(req.method==='POST'&&(pathname==='/api/gemini'||pathname==='/api/ai')) return await gemini(req,res);
    if(req.method!=='GET') return send(res,405,{error:'Método não permitido.'});
    const requested=normalize(pathname==='/'?'index.html':pathname).replace(/^[/\\]+/,'');
    const file=join(root,requested);
    if(!file.startsWith(root)) return send(res,403,{error:'Acesso negado.'});
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
    res.end(data);
  } catch (error) {
    if(String(req.url||'').startsWith('/api/')) return send(res,500,{error:error?.message||'Falha no serviço local.'});
    const data=await readFile(join(root,'index.html'));
    res.writeHead(200,{'Content-Type':types['.html']});
    res.end(data);
  }
}).listen(port,()=>console.log(`Belavista em http://localhost:${port}`));
