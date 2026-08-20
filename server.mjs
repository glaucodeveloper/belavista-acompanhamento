import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
try { const env = await readFile(join(root, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if(match && !process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,''); } } catch {}
const port = Number(process.env.PORT || 8080);
const model = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json'};

async function body(req){ let data=''; for await (const chunk of req) data+=chunk; return JSON.parse(data||'{}'); }
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
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
createServer(async (req,res)=>{
  try { const pathname=new URL(req.url,'http://localhost').pathname; if(req.method==='POST'&&pathname==='/api/gemini') return await gemini(req,res); if(req.method!=='GET') return send(res,405,{error:'Método não permitido.'}); const requested=normalize(pathname==='/'?'index.html':pathname).replace(/^[/\\]+/,''); const file=join(root,requested); if(!file.startsWith(root)) return send(res,403,{error:'Acesso negado.'}); const data=await readFile(file); res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}); res.end(data); } catch { const data=await readFile(join(root,'index.html')); res.writeHead(200,{'Content-Type':types['.html']}); res.end(data); }
}).listen(port,()=>console.log(`Belavista em http://localhost:${port}`));
