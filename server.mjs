import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot=fileURLToPath(new URL('.', import.meta.url));
try { const env = await readFile(join(serverRoot, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if(match && !process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,''); } } catch {}
const root = process.env.BELAVISTA_FRONTEND_ROOT ? resolve(process.env.BELAVISTA_FRONTEND_ROOT) : fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const publicOrigin = String(process.env.PUBLIC_ORIGIN || '').replace(/\/$/,'');
const belavistaApiBase = String(process.env.BELAVISTA_API_BASE || '').replace(/\/$/,'');
const aiProvider=String(process.env.AI_PROVIDER||'gemini').trim().toLowerCase();
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const nvidiaModel = process.env.NVIDIA_MODEL || 'meta/llama-3.2-3b-instruct';
const nvidiaApiUrl = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const {health,entitySummary,listRecords,createRecord,createFieldConfirmation,updateRecord,deleteRecord,listPurchaseReceipts,purchaseReceiptSummary,createPurchaseReceipt,getPurchaseReceiptFile,deletePurchaseReceipt,listCommercialSales,createCommercialSale,updateCommercialSale,getCommercialSaleFile,deleteCommercialSale,listCashFlowEntries,createCashFlowEntry,cashFlowSummary,listCommissionReasons,updateCommissionReason,listOutsourcingReceipts,createOutsourcingReceipt,getOutsourcingReceiptFile,listLeadMessages,createLeadMessage,listStagesAdmin,getStageAdmin,updateStageAdmin,saveStageAiConfig,getStageReport,getStageWorkbenchState,saveStageWorkbenchState,listWorkbenchActivityLocations,listWorkbenchDiary,createWorkbenchDiary,listWorkbenchAttachments,createWorkbenchAttachment,getWorkbenchAttachmentFile,deleteWorkbenchAttachment}=await import('./persistence.mjs');
const {agentTree,evaluateAgentTree}=await import('./agent-tree.js');
const {requestActor,requireRoles,authStatus}=await import('./auth-service.mjs');
const {getCalibration,updateCalibration,recordAgentEvent,recalculateOperationalState,latestOperationalState,listNotifications,acknowledgeNotification,registerDevice,buildAutomationPanorama,runAutomationPlanner,runOperationalLoop,buildWorkerMonitor,markEventProcessed}=await import('./operational-engine.mjs');
const {getProductionBaseline}=await import('./production-planning.mjs');
const {publishBridgeEvent}=await import('./firebase-bridge.mjs');

// A mesma fonte legível pelo time fica incorporada ao prompt operacional. Isso
// evita que a interface, o worker e o modelo mantenham ordens de execução
// diferentes. O arquivo continua sendo público para auditoria no TWA, mas o
// estado de cada requisição ainda é delimitado e validado abaixo.
let aiConstructionDocument='';
try { aiConstructionDocument=await readFile(join(serverRoot,'docs/ai-construction-operational-playbook.md'),'utf8'); } catch (error) { console.warn('[ai protocol]',error.message); }
const aiProductionBaseline=getProductionBaseline();

function bridgeAgentEvent(input){
  const stored=recordAgentEvent(input);
  // Não bloqueia o registro local quando Firebase estiver temporariamente fora.
  void publishBridgeEvent({...stored,payload:input.payload||{}}).catch(error=>console.warn('[firebase bridge]',error.message));
  return stored;
}

// These tools are intentionally executed in the browser, where the live map
// and UI state exist. The server only asks the model for validated intent; it
// never lets a prompt execute shell, SQL, network or arbitrary JavaScript.
const clientTools=[
  {name:'ui.navigate',description:'Abre uma área da aplicação.',args:{view:'assistant|control|stages|agenda|activities|progress|records|leads|commissions|brokers|finance|reports|settings'}},
  {name:'map.set_overlay',description:'Destaca uma frente no GLB compartilhado.',args:{category:'terraplanagem|drenagem|rede-agua|rede-eletrica|pavimentacao|urbanizacao|clear'}},
  {name:'map.adjust_view',description:'Ajusta a vista 3D do mapa por deltas pequenos.',args:{rotationDelta:'number opcional',tiltDelta:'number opcional',zoomDelta:'number opcional',fit:'boolean opcional'}},
  {name:'map.set_tiles',description:'Alterna a base cartográfica.',args:{mode:'satellite|osm'}},
  {name:'records.open_form',description:'Abre o formulário local de novo registro sem gravar dados.',args:{activity:'texto opcional',responsible:'texto opcional',details:'texto opcional'}},
  {name:'reports.select',description:'Abre um relatório salvo.',args:{family:'Financeiro|Construção|Suprimentos|Comercial|Governança',reportType:'id opcional'}},
  {name:'commissions.filter',description:'Filtra a carteira comercial.',args:{query:'texto opcional',status:'Reserva|Em análise|Proposta|Assinado|all opcional',profile:'id opcional'}},
  {name:'ui.print',description:'Solicita impressão do escopo visível; exige confirmação humana.',args:{scope:'current|map|contract'}}
];
const toolNames=new Set(clientTools.map(tool=>tool.name));
const toolEnvelope=(text,toolCalls=[])=>({text:String(text||'').trim(),toolCalls:toolCalls.filter(call=>toolNames.has(call?.name)).slice(0,4),protocol:'belavista-client-tools/v1'});
function normalizeToolCall(call){
  if(!call||typeof call!=='object'||!toolNames.has(call.name))return null;
  const args=call.arguments&&typeof call.arguments==='object'&&!Array.isArray(call.arguments)?{...call.arguments}:{};
  if(call.name==='map.set_overlay'){
    const source=String(args.category||'').toLocaleLowerCase('pt-BR');
    const category=source.includes('dren')?'drenagem':source.includes('terra')?'terraplanagem':source.includes('água')||source.includes('agua')?'rede-agua':source.includes('elétr')||source.includes('eletr')?'rede-eletrica':source.includes('pav')?'pavimentacao':source.includes('praça')||source.includes('praca')||source.includes('urban')||source.includes('lazer')?'urbanizacao':source==='clear'?'clear':null;
    if(!category)return null;args.category=category;
  }
  if(call.name==='ui.navigate'&&!['assistant','control','stages','agenda','activities','progress','records','leads','commissions','brokers','finance','reports','settings'].includes(args.view))return null;
  if(call.name==='map.set_tiles'&&!['satellite','osm'].includes(args.mode))return null;
  if(call.name==='ui.print')args.scope=['current','map','contract'].includes(args.scope)?args.scope:'current';
  if(call.name==='map.adjust_view')for(const key of ['rotationDelta','tiltDelta','zoomDelta'])if(key in args){const value=Number(args[key]);if(!Number.isFinite(value))delete args[key];else args[key]=Math.max(key==='zoomDelta'?-1:key==='tiltDelta'?-24:-90,Math.min(key==='zoomDelta'?1:key==='tiltDelta'?24:90,value));}
  return {name:call.name,arguments:args};
}
function mergeToolCalls(...groups){
  const output=[],seen=new Set();for(const group of groups)for(const call of group||[]){const normalized=normalizeToolCall(call);const key=normalized?`${normalized.name}:${JSON.stringify(normalized.arguments)}`:'';if(normalized&&!seen.has(key)){seen.add(key);output.push(normalized);}}return output.slice(0,4);
}
function parseToolEnvelope(content){
  const raw=String(content||'').trim();
  const candidates=[raw,raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1],raw.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);
  for(const candidate of candidates){
    try{const parsed=JSON.parse(candidate);const toolCalls=(parsed.toolCalls||parsed.tool_calls||[]).map(normalizeToolCall).filter(Boolean);if(typeof parsed.reply==='string'||typeof parsed.text==='string'||toolCalls.length)return toolEnvelope(parsed.reply||parsed.text||'',toolCalls);}catch{}
  }
  return toolEnvelope(raw,[]);
}
function inferredToolCalls(message){
  const text=String(message||'').toLocaleLowerCase('pt-BR'),calls=[];
  const go=(view)=>calls.push({name:'ui.navigate',arguments:{view}});
  if(/\b(central\s+operacional|tabelas?\s+(de\s+)?(materiais|comiss[oõ]es|finan[cç]as)|escuta\s+(do\s+)?(agente|firebase))\b/.test(text))go('control');
  else if(/\b(registro|apontamento|di[aá]rio)\b/.test(text))go('records');
  else if(/\b(dre|fluxo de caixa|balan[cç]o|financeir)\b/.test(text))go('finance');
  else if(/\b(relat[oó]rio)\b/.test(text))go('reports');
  else if(/\b(corretor|creci|equipe comercial)\b/.test(text))go('brokers');
  else if(/\b(comiss[aã]o|contrato|carteira)\b/.test(text))go('commissions');
  else if(/\b(lead|cliente|interesse)\b/.test(text))go('leads');
  else if(/\b(etapa|cronograma|agenda|atividade|andamento)\b/.test(text))go(/agenda/.test(text)?'agenda':/atividade/.test(text)?'activities':/andamento/.test(text)?'progress':'stages');
  if(/\b(aproxim\w*|zoom in)\b/.test(text))calls.push({name:'map.adjust_view',arguments:{zoomDelta:.22}});
  if(/\b(afast\w*|zoom out)\b/.test(text))calls.push({name:'map.adjust_view',arguments:{zoomDelta:-.22}});
  if(/\b(inclin\w*|tilt\w*)\b/.test(text))calls.push({name:'map.adjust_view',arguments:{tiltDelta:8}});
  if(/\b(gir\w*|rotacion\w*)\b/.test(text))calls.push({name:'map.adjust_view',arguments:{rotationDelta:/esquerd/.test(text)?-20:20}});
  if(/\b(sat[eé]lite)\b/.test(text))calls.push({name:'map.set_tiles',arguments:{mode:'satellite'}});
  if(/\b(osm|openstreet)\b/.test(text))calls.push({name:'map.set_tiles',arguments:{mode:'osm'}});
  const overlays=[['terraplanagem','terraplanagem'],['drenagem','drenagem'],['rede de [aá]gua','rede-agua'],['rede el[eé]trica','rede-eletrica'],['pavimenta','pavimentacao'],['pra[cç]a|urbaniza|lazer','urbanizacao']];
  const overlay=overlays.find(([pattern])=>new RegExp(pattern).test(text));if(overlay&&/\b(mapa|destac|mostrar|real[cç]ar|highlight)\b/.test(text))calls.push({name:'map.set_overlay',arguments:{category:overlay[1]}});
  if(/\b(novo|criar|adicionar)\b/.test(text)&&/\b(registro|apontamento)\b/.test(text))calls.push({name:'records.open_form',arguments:{}});
  if(/\b(imprim|pdf|exportar mapa)\b/.test(text))calls.push({name:'ui.print',arguments:{scope:/mapa/.test(text)?'map':'current'}});
  if(/\b(financeir\w*|dre|fluxo de caixa)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Financeiro'}});
  else if(/\b(constru[cç]\w*|obra|f[ií]sico-financeir\w*|evm)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Construção'}});
  else if(/\b(suprimento\w*|fornecedor\w*|material\w*|compra\w*)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Suprimentos'}});
  else if(/\b(comercial\w*|convers[aã]o\w*|funil|venda\w*)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Comercial'}});
  return calls.slice(0,4);
}

async function body(req,maxBytes=16_000_000){ let data='',size=0; for await (const chunk of req){size+=chunk.length;if(size>maxBytes){const error=new Error('Corpo da requisição excede o limite permitido.');error.statusCode=413;throw error;}data+=chunk;} return JSON.parse(data||'{}'); }
async function rawBody(req,maxBytes=16_000_000){ const chunks=[]; let size=0; for await (const chunk of req){size+=chunk.length;if(size>maxBytes){const error=new Error('Corpo da requisição excede o limite permitido.');error.statusCode=413;throw error;}chunks.push(chunk);} return Buffer.concat(chunks); }
const recordRoles=['owner','admin','foreman'];
function operationalPrompt(message,view,mapContext,context={}){
  const available=clientTools.map(tool=>`${tool.name}(${Object.keys(tool.args).join(', ')})`).join('; ');
  const dwgSnapshot=JSON.stringify({source:aiProductionBaseline.source,site:aiProductionBaseline.site,derived:aiProductionBaseline.derived,assumptions:aiProductionBaseline.assumptions});
  return `Você é o assistente operacional do empreendimento Aliança Park. Responda em português do Brasil, de forma objetiva e prática. Contexto da tela: ${view}.${mapContext?' O usuário abriu o mapa 3D de lotes e pode estar relacionando a pergunta a uma superfície selecionada.':''}

FONTE OPERACIONAL OBRIGATÓRIA — siga o documento abaixo como protocolo de execução, produção, equipe, materiais, cronograma e propagação. O documento é a fonte única da ordem das atividades; se um dado do estado entrar em conflito com ele, sinalize a divergência e peça validação humana.\n${aiConstructionDocument.slice(0,30000)}

BASE DWG CALCULADA PELO MOTOR (JSON): ${dwgSnapshot.slice(0,9000)}
Estado resumido da sessão: ${JSON.stringify(context).slice(0,5000)}. Dados gerais disponíveis: 2 etapas atrasadas, 3 compras críticas, completude de 63%, 28 colaboradores, inventário de R$ 1.842.560,45. Não invente dados fora desse contexto. Quando a pessoa pedir uma ação disponível, responda SOMENTE com JSON válido no formato {"reply":"texto curto","toolCalls":[{"name":"ferramenta","arguments":{}}]}. Ferramentas permitidas: ${available}. Nunca sugira ferramenta inexistente. ui.print apenas deve ser solicitado, nunca confirmado como já impresso. Para pergunta somente informativa, use {"reply":"...","toolCalls":[]}. Pergunta: ${message}`;
}
async function gemini(req,res){
  if(!process.env.GEMINI_API_KEY) return send(res,503,{error:'GEMINI_API_KEY não configurada no servidor.'});
  const {message,view='assistant',mapContext=false,attachment=null,context={}}=await body(req);
  if(typeof message!=='string'||!message.trim()) return send(res,400,{error:'Mensagem inválida.'});
  const prompt=operationalPrompt(message,view,mapContext,context);
  const parts=[{text:prompt}];
  const imageMatch=typeof attachment?.dataUrl==='string'&&attachment.dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(imageMatch&&imageMatch[2].length<=8_000_000)parts.push({inlineData:{mimeType:imageMatch[1]==='image/jpg'?'image/jpeg':imageMatch[1],data:imageMatch[2]}});
  const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:.35,maxOutputTokens:500}})});
  const json=await upstream.json();
  if(!upstream.ok) return send(res,502,{error:json?.error?.message||'Gemini recusou a solicitação.'});
  const result=parseToolEnvelope(json?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'Gemini não retornou texto.');
  result.toolCalls=mergeToolCalls(result.toolCalls,inferredToolCalls(message));
  return send(res,200,{...result,provider:'gemini',model:geminiModel});
}
async function nvidia(req,res){
  if(!process.env.NVIDIA_API_KEY) return send(res,503,{error:'NVIDIA_API_KEY não configurada no servidor.'});
  const {message,view='assistant',mapContext=false,attachment=null,context={}}=await body(req);
  if(typeof message!=='string'||!message.trim()) return send(res,400,{error:'Mensagem inválida.'});
  const upstream=await fetch(nvidiaApiUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${process.env.NVIDIA_API_KEY}`},body:JSON.stringify({model:nvidiaModel,messages:[{role:'system',content:'Você é um assistente operacional objetivo. Siga exatamente o protocolo JSON de ferramentas entregue no pedido do usuário.'},{role:'user',content:operationalPrompt(message,view,mapContext,context)}],temperature:.15,top_p:.9,max_tokens:700,stream:false}),signal:AbortSignal.timeout(60000)});
  const json=await upstream.json();
  if(!upstream.ok) return send(res,502,{error:json?.detail||json?.message||json?.error?.message||'NVIDIA NIM recusou a solicitação.'});
  const result=parseToolEnvelope(json?.choices?.[0]?.message?.content||'NVIDIA NIM não retornou texto.');
  result.toolCalls=mergeToolCalls(result.toolCalls,inferredToolCalls(message));
  return send(res,200,{...result,provider:'nvidia',model:nvidiaModel,attachmentIgnored:Boolean(attachment)});
}
async function ai(req,res){
  if(aiProvider==='nvidia') return nvidia(req,res);
  if(aiProvider==='gemini') return gemini(req,res);
  return send(res,500,{error:`AI_PROVIDER inválido: ${aiProvider}. Use nvidia ou gemini.`});
}
function aiStatus(){
  const configured=aiProvider==='nvidia'?Boolean(process.env.NVIDIA_API_KEY):aiProvider==='gemini'?Boolean(process.env.GEMINI_API_KEY):false;
  return {provider:aiProvider,model:aiProvider==='nvidia'?nvidiaModel:geminiModel,configured,supportsImages:aiProvider==='gemini',toolProtocol:'belavista-client-tools/v1',toolCount:clientTools.length};
}
function requestOrigin(req){
  if(publicOrigin)return publicOrigin;
  const forwardedHost=String(req.headers['x-forwarded-host']||'').split(',')[0].trim();
  const forwardedProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
  const requestHost=forwardedHost||req.headers.host||`localhost:${port}`;
  const proto=forwardedProto||'http';
  return `${proto}://${requestHost}`;
}
function pageForPath(pathname){
  if(pathname==='/leads'||pathname==='/leads/')return 'public-leads.html';
  if(pathname==='/admin'||pathname==='/admin/')return 'index.html';
  if(pathname==='/admin/workers'||pathname==='/admin/workers/'||pathname==='/admin/workers/stage'||pathname==='/admin/workers/stage/'||pathname==='/admin/workers/activity'||pathname==='/admin/workers/activity/')return 'admin-workers.html';
  return pathname==='/'?'index.html':pathname;
}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto',...headers});res.end(JSON.stringify(data));}
const proxiedApiPrefixes=['/api/records','/api/field-confirmations','/api/purchase-receipts','/api/budget-lines','/api/agenda-items','/api/notifications','/api/stages','/api/stage-correlations'];
function shouldProxyApi(pathname){
  return Boolean(belavistaApiBase)&&proxiedApiPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(`${prefix}/`));
}
async function proxyApi(req,res,pathname){
  const target=`${belavistaApiBase}${pathname}${new URL(req.url,'http://localhost').search}`;
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers||{})){
    if(value==null||['host','connection','content-length'].includes(String(key).toLowerCase()))continue;
    if(Array.isArray(value))headers.set(key,value.join(', ')); else headers.set(key,String(value));
  }
  headers.set('x-forwarded-host',req.headers.host||'localhost');
  const method=req.method||'GET';
  const init={method,headers};
  if(!['GET','HEAD'].includes(method)) {
    const payload=await rawBody(req,36_000_000);
    if(payload.length)init.body=payload;
  }
  const upstream=await fetch(target,init);
  const buffer=Buffer.from(await upstream.arrayBuffer());
  const responseHeaders={Vary:'Host, X-Forwarded-Host, X-Forwarded-Proto'};
  upstream.headers.forEach((value,key)=>{if(!['content-length','connection','content-encoding','transfer-encoding'].includes(key.toLowerCase()))responseHeaders[key]=value;});
  res.writeHead(upstream.status,responseHeaders);
  res.end(buffer);
}
async function agentTreeApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/agent/tree')return send(res,200,{tree:agentTree});
  if(req.method==='POST'&&pathname==='/api/agent/evaluate')return send(res,200,evaluateAgentTree(await body(req)));
  return send(res,404,{error:'Recurso do agente não encontrado.'});
}
async function recordsApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/records')return send(res,200,{records:listRecords(),entities:entitySummary()});
  if(req.method==='POST'&&pathname==='/api/records'){const actor=await requireRoles(req,recordRoles),record=createRecord(await body(req));bridgeAgentEvent({type:'record.created',entity:'records',entityId:record.id,actor,payload:record});recalculateOperationalState('record.created');return send(res,201,record);}
  const match=pathname.match(/^\/api\/records\/([^/]+)$/); if(!match)return send(res,404,{error:'Registro não encontrado.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){
    const actor=await requireRoles(req,recordRoles),record=updateRecord(id,await body(req));if(record){bridgeAgentEvent({type:'record.updated',entity:'records',entityId:id,actor,payload:record});recalculateOperationalState('record.updated');}return record?send(res,200,record):send(res,404,{error:'Registro não encontrado.'});
  }
  if(req.method==='DELETE'){await requireRoles(req,['owner','admin']);return deleteRecord(id)?send(res,200,{ok:true,id}):send(res,404,{error:'Registro não encontrado.'});}
  return send(res,405,{error:'Método não permitido.'});
}
async function stagesAdminApi(req,res,pathname){
  if(pathname==='/api/stages-admin'){
    if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});
    return send(res,200,{stages:listStagesAdmin()});
  }
  const match=pathname.match(/^\/api\/stages-admin\/(\d+)(?:\/(ai|report))?$/);
  if(!match)return send(res,404,{error:'Etapa não encontrada.'});
  const stageId=Number(match[1]),resource=match[2]||'';
  if(resource==='report'){
    if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});
    const report=getStageReport(stageId);
    return report?send(res,200,{report}):send(res,404,{error:'Etapa não encontrada.'});
  }
  if(resource==='ai'){
    if(req.method!=='PUT')return send(res,405,{error:'Método não permitido.'});
    const actor=await requireRoles(req,['owner','admin']);
    const stage=saveStageAiConfig(stageId,await body(req));
    if(!stage)return send(res,404,{error:'Etapa não encontrada.'});
    bridgeAgentEvent({type:'stage.ai-config.changed',entity:'stage_ai_config',entityId:String(stageId),actor,payload:{stageId,stageName:stage.name,aiConfig:stage.aiConfig}});
    recalculateOperationalState('stage.ai-config.changed');
    return send(res,200,{stage});
  }
  if(req.method==='GET'){
    const stage=getStageAdmin(stageId);
    return stage?send(res,200,{stage}):send(res,404,{error:'Etapa não encontrada.'});
  }
  if(req.method==='PUT'){
    const actor=await requireRoles(req,['owner','admin']);
    const stage=updateStageAdmin(stageId,await body(req));
    if(!stage)return send(res,404,{error:'Etapa não encontrada.'});
    bridgeAgentEvent({type:'stage.updated',entity:'stages',entityId:String(stageId),actor,payload:{stageId,name:stage.name,status:stage.status,progress:stage.progress,owner:stage.owner}});
    recalculateOperationalState('stage.updated');
    return send(res,200,{stage});
  }
  return send(res,405,{error:'Método não permitido.'});
}

async function workbenchApi(req,res,pathname){
  const inputUrl=new URL(req.url,'http://localhost'),stageKey=inputUrl.searchParams.get('stage')||'',resource=inputUrl.searchParams.get('resource')||'';
  if(pathname==='/api/workbench/state'&&resource==='activity-map'&&req.method==='GET')return send(res,200,{assignments:listWorkbenchActivityLocations()});
  if(pathname==='/api/workbench/diary'&&resource==='attachments'){
    const activityId=inputUrl.searchParams.get('activity')||'';
    if(req.method==='GET')return send(res,200,{attachments:listWorkbenchAttachments(stageKey,activityId)});
    if(req.method==='POST'){const actor=await requireRoles(req,recordRoles),attachment=createWorkbenchAttachment({...await body(req,10_000_000),stageKey,createdBy:actor.name||actor.uid});bridgeAgentEvent({type:'evidence.attached',entity:'workbench_attachments',entityId:attachment.id,actor,payload:attachment});recalculateOperationalState('evidence.attached');return send(res,201,{attachment});}
  }
  if(pathname==='/api/workbench/diary'&&resource==='attachment-file'&&req.method==='GET'){
    const file=getWorkbenchAttachmentFile(inputUrl.searchParams.get('id')||'');if(!file)return send(res,404,{error:'Anexo não encontrado.'});
    const data=await readFile(file.storagePath);res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'anexo')}`,'Cache-Control':'private, max-age=300'});res.end(data);return;
  }
  if(pathname==='/api/workbench/diary'&&resource==='attachment'&&req.method==='DELETE'){await requireRoles(req,['owner','admin']);const id=inputUrl.searchParams.get('id')||'';return deleteWorkbenchAttachment(id)?send(res,200,{ok:true,id}):send(res,404,{error:'Anexo não encontrado.'});}
  if(pathname==='/api/workbench/state'){
    if(req.method==='GET')return send(res,200,{state:getStageWorkbenchState(stageKey)});
    if(req.method==='PUT'){await requireRoles(req,['owner','admin','foreman']);return send(res,200,{state:saveStageWorkbenchState(stageKey,await body(req))});}
  }
  if(pathname==='/api/workbench/diary'){
    if(req.method==='GET')return send(res,200,{entries:listWorkbenchDiary(stageKey,inputUrl.searchParams.get('activity')||'')});
    if(req.method==='POST'){const actor=await requireRoles(req,recordRoles),entry=createWorkbenchDiary({...await body(req),stageKey});bridgeAgentEvent({type:'record.created',entity:'workbench_diary',entityId:entry.id,actor,payload:entry});recalculateOperationalState('record.created');return send(res,201,{entry});}
  }
  if(pathname==='/api/workbench/attachments'){
    const activityId=inputUrl.searchParams.get('activity')||'';
    if(req.method==='GET')return send(res,200,{attachments:listWorkbenchAttachments(stageKey,activityId)});
    if(req.method==='POST'){const actor=await requireRoles(req,recordRoles),attachment=createWorkbenchAttachment({...await body(req,10_000_000),stageKey,createdBy:actor.name||actor.uid});bridgeAgentEvent({type:'evidence.attached',entity:'workbench_attachments',entityId:attachment.id,actor,payload:attachment});recalculateOperationalState('evidence.attached');return send(res,201,{attachment});}
  }
  const fileMatch=pathname.match(/^\/api\/workbench\/attachments\/([^/]+)\/file$/);
  if(fileMatch&&req.method==='GET'){
    const file=getWorkbenchAttachmentFile(decodeURIComponent(fileMatch[1]));if(!file)return send(res,404,{error:'Anexo não encontrado.'});
    const data=await readFile(file.storagePath);res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'anexo')}`,'Cache-Control':'private, max-age=300'});res.end(data);return;
  }
  const attachmentMatch=pathname.match(/^\/api\/workbench\/attachments\/([^/]+)$/);
  if(attachmentMatch&&req.method==='DELETE'){await requireRoles(req,['owner','admin']);const id=decodeURIComponent(attachmentMatch[1]);return deleteWorkbenchAttachment(id)?send(res,200,{ok:true,id}):send(res,404,{error:'Anexo não encontrado.'});}
  return send(res,405,{error:'Método não permitido.'});
}

async function fieldConfirmationsApi(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Método não permitido.'});
  const actor=await requireRoles(req,recordRoles),result=createFieldConfirmation(await body(req));bridgeAgentEvent({type:'production.measured',entity:'records',entityId:result.record.id,actor,payload:result});recalculateOperationalState('production.measured');return send(res,201,result);
}

async function purchaseReceiptsApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/purchase-receipts')return send(res,200,{receipts:listPurchaseReceipts(),summary:purchaseReceiptSummary()});
  if(req.method==='POST'&&pathname==='/api/purchase-receipts')return send(res,201,{receipt:createPurchaseReceipt(await body(req,16_000_000)),summary:purchaseReceiptSummary()});
  const fileMatch=pathname.match(/^\/api\/purchase-receipts\/([^/]+)\/file$/);
  if(fileMatch&&req.method==='GET'){
    const id=decodeURIComponent(fileMatch[1]),file=getPurchaseReceiptFile(id);if(!file)return send(res,404,{error:'Arquivo do recibo não encontrado.'});
    const data=await readFile(file.storagePath);res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'recibo')}`,'Cache-Control':'private, max-age=300'});res.end(data);return;
  }
  const match=pathname.match(/^\/api\/purchase-receipts\/([^/]+)$/);if(!match)return send(res,404,{error:'Recibo não encontrado.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='DELETE')return deletePurchaseReceipt(id)?send(res,200,{ok:true,id,summary:purchaseReceiptSummary()}):send(res,404,{error:'Recibo não encontrado.'});
  return send(res,405,{error:'Método não permitido.'});
}


async function cashFlowApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/cash-flow')return send(res,200,{entries:listCashFlowEntries(),summary:cashFlowSummary()});
  if(req.method==='POST'&&pathname==='/api/cash-flow'){const actor=await requireRoles(req,['owner']),entry=createCashFlowEntry(await body(req));bridgeAgentEvent({type:'cash.changed',entity:'cash_flow_entries',entityId:entry.id,actor,payload:entry});return send(res,201,{entry,summary:cashFlowSummary(),operational:recalculateOperationalState('cash.changed')});}
  return send(res,405,{error:'Método não permitido.'});
}
async function leadMessagesApi(req,res,pathname){
  const match=pathname.match(/^\/api\/leads\/([^/]+)\/messages$/);if(!match)return send(res,404,{error:'Conversa não encontrada.'});
  const leadId=decodeURIComponent(match[1]);
  if(req.method==='GET')return send(res,200,{messages:listLeadMessages(leadId)});
  if(req.method==='POST'){const message=createLeadMessage({...await body(req),leadId});return message?send(res,201,{message,messages:listLeadMessages(leadId)}):send(res,404,{error:'Lead não encontrado ou mensagem vazia.'});}
  return send(res,405,{error:'Método não permitido.'});
}
async function commissionReasonsApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/commission-reasons')return send(res,200,{reasons:listCommissionReasons()});
  const match=pathname.match(/^\/api\/commission-reasons\/([^/]+)$/);if(!match)return send(res,404,{error:'Razão de comissão não encontrada.'});
  if(req.method==='PUT'){await requireRoles(req,['admin']);const reason=updateCommissionReason(decodeURIComponent(match[1]),await body(req));return reason?send(res,200,{reason,reasons:listCommissionReasons()}):send(res,404,{error:'Razão de comissão não encontrada.'});}
  return send(res,405,{error:'Método não permitido.'});
}
async function outsourcingReceiptsApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/outsourcing-receipts')return send(res,200,{receipts:listOutsourcingReceipts()});
  if(req.method==='POST'&&pathname==='/api/outsourcing-receipts')return send(res,201,{receipt:createOutsourcingReceipt(await body(req,16_000_000))});
  const fileMatch=pathname.match(/^\/api\/outsourcing-receipts\/([^/]+)\/file$/);
  if(fileMatch&&req.method==='GET'){const file=getOutsourcingReceiptFile(decodeURIComponent(fileMatch[1]));if(!file)return send(res,404,{error:'Comprovante não encontrado.'});const data=await readFile(file.storagePath);res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'comprovante')}`});res.end(data);return;}
  return send(res,405,{error:'Método não permitido.'});
}

async function commercialSalesApi(req,res,pathname){
  if(req.method==='GET'&&pathname==='/api/commercial-sales')return send(res,200,{sales:listCommercialSales()});
  if(req.method==='POST'&&pathname==='/api/commercial-sales')return send(res,201,{sale:createCommercialSale(await body(req,36_000_000))});
  const fileMatch=pathname.match(/^\/api\/commercial-sales\/([^/]+)\/files\/([^/]+)$/);
  if(fileMatch&&req.method==='GET'){
    const saleId=decodeURIComponent(fileMatch[1]),fileId=decodeURIComponent(fileMatch[2]),file=getCommercialSaleFile(saleId,fileId);if(!file)return send(res,404,{error:'Arquivo comercial não encontrado.'});
    const data=await readFile(file.storagePath);res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'arquivo')}`,'Cache-Control':'private, max-age=300'});res.end(data);return;
  }
  const match=pathname.match(/^\/api\/commercial-sales\/([^/]+)$/);if(!match)return send(res,404,{error:'Venda não encontrada.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){await requireRoles(req,['owner','admin']);const sale=updateCommercialSale(id,await body(req));return sale?send(res,200,{sale}):send(res,404,{error:'Venda não encontrada.'});}
  if(req.method==='DELETE')return deleteCommercialSale(id)?send(res,200,{ok:true,id}):send(res,404,{error:'Venda não encontrada.'});
  return send(res,405,{error:'Método não permitido.'});
}

function buildDevelopmentCycleTestOutput(loop){
  const stages=Array.isArray(loop?.panorama?.stages)?loop.panorama.stages:[];
  const agenda=Array.isArray(loop?.agenda)?loop.agenda:[];
  const clampPercent=value=>Math.max(0,Math.min(100,Number(value)||0));
  const stageAgenda=stage=>agenda.filter(item=>item.stageKey===stage.key);
  const agendaChart=stages.map(stage=>({
    label:stage.name,
    value:stageAgenda(stage).length,
    meta:stageAgenda(stage).length===1?'1 atividade':'atividades geradas'
  }));
  const schedule=agenda.slice(0,16).map(item=>({
    date:item.plannedStart||item.plannedEnd||'sem data',
    end:item.plannedEnd||item.plannedStart||'sem data',
    stage:item.stageName||item.stageKey||'Etapa',
    title:item.title||'Atividade planejada',
    status:item.status||'planejada',
    owner:item.owner||'Responsável a definir'
  }));
  const cronogramaChart=stages.map(stage=>({
    label:stage.name,
    value:clampPercent(stage.progress),
    priority:Number(stage.automation?.priority)||0,
    start:stage.automation?.plannedStart||'sem início',
    end:stage.automation?.plannedFinish||'sem previsão',
    status:stage.status||'planejada'
  }));
  const personnelChart=stages.map(stage=>{
    const personnel=stage.automation?.personnel||{};
    const assigned=Math.max(0,Number(personnel.assignedHeadcount)||0);
    const required=Math.max(0,Number(personnel.requiredHeadcount)||0);
    return {
      label:stage.name,
      value:assigned,
      max:required,
      meta:`${assigned}/${required} posições`,
      members:(personnel.matchedRegisteredPeople||[]).map(person=>person.name).slice(0,4),
      status:personnel.status||'registration_pending'
    };
  });
  const materialRows=stages.flatMap(stage=>(stage.automation?.materialPlan||[]).map(material=>({
    stage:stage.name,
    material:material.name||'Material sem descrição',
    required:Number(material.requiredQuantity??material.plannedQuantity)||0,
    available:Number(material.availableQuantity)||0,
    shortfall:Number(material.shortfallQuantity)||0,
    unit:material.unit||'un.',
    coverage:clampPercent((Number(material.coverageRatio)||0)*100),
    status:material.status||'planned'
  }))).slice(0,48);
  const materialsChart=stages.map(stage=>({
    label:stage.name,
    value:clampPercent(stage.automation?.materialCoverage),
    meta:`${(stage.automation?.materialPlan||[]).length} itens · ${stage.automation?.materialStatus||'sem leitura'}`,
    status:stage.automation?.materialStatus||'unknown'
  }));
  const requiredPeople=personnelChart.reduce((sum,item)=>sum+item.max,0);
  const assignedPeople=personnelChart.reduce((sum,item)=>sum+item.value,0);
  const materialShortfalls=materialRows.reduce((sum,item)=>sum+(item.shortfall>0?1:0),0);
  return {
    status:'confirmed',
    objective:'agenda, cronograma, quadro de pessoal e materiais por atividade',
    generatedAt:loop?.generatedAt||new Date().toISOString(),
    confirmation:`Ciclo de desenvolvimento confirmado: ${agenda.length} atividades de agenda, ${stages.length} etapas no cronograma, ${assignedPeople}/${requiredPeople} posições avaliadas e ${materialShortfalls} pendências de material identificadas.`,
    summary:{agendaItems:agenda.length,stages:stages.length,assignedPeople,requiredPeople,materialItems:materialRows.length,materialShortfalls},
    checks:[
      {key:'agenda',label:'Agenda gerada',status:agenda.length?'pass':'attention',detail:`${agenda.length} atividades ordenadas por data e dependência.`},
      {key:'cronograma',label:'Cronograma gerado',status:stages.length?'pass':'attention',detail:`${stages.length} etapas com progresso, prioridade e previsão.`},
      {key:'personnel',label:'Quadro de pessoal calculado',status:personnelChart.length?'pass':'attention',detail:`${assignedPeople}/${requiredPeople} posições comparadas com os colaboradores ativos.`},
      {key:'materials',label:'Lista de materiais calculada',status:materialRows.length?'pass':'attention',detail:`${materialRows.length} itens vinculados às atividades; ${materialShortfalls} com falta.`}
    ],
    charts:{
      agenda:{title:'Agenda por etapa',unit:'atividades',data:agendaChart},
      cronograma:{title:'Progresso do cronograma',unit:'concluído',data:cronogramaChart},
      pessoal:{title:'Cobertura do quadro de pessoal',unit:'posições',kind:'crew',data:personnelChart},
      materiais:{title:'Cobertura de materiais',unit:'cobertura',data:materialsChart}
    },
    schedule,
    materialRows
  };
}

async function automationMonitorApi(req,res,pathname){
  if(pathname==='/api/automation/monitor'&&req.method==='GET'){
    const actor=await requireRoles(req,recordRoles);
    return send(res,200,buildWorkerMonitor(actor.role));
  }
  if(pathname==='/api/automation/test'&&req.method==='POST'){
    const actor=await requireRoles(req,recordRoles),input=await body(req),runId=`${Date.now()}`;
    if(input?.scenario==='development-cycle'){
      const loop=runOperationalLoop({referenceDate:new Date().toISOString().slice(0,10),reason:'twa.worker.development-cycle.test',syncActivities:false,publishNotifications:false,includeNotifications:false,role:actor.role,clientState:{view:'twa-worker-monitor',globalSituation:true}});
      return send(res,200,{testRunId:runId,mode:'dry-run-local',externalMessaging:'disabled',cycle:buildDevelopmentCycleTestOutput(loop),loop,monitor:buildWorkerMonitor(actor.role)});
    }
    const cases=[
      {caseId:'input.record',category:'entrada',label:'Registro incompleto',event:'record.created',entity:'records',entityId:'TWA-REGISTRO',payload:{nature:'teste de entrada',complete:false}},
      {caseId:'input.production',category:'entrada',label:'Medição de produção',event:'production.measured',entity:'records',entityId:'TWA-MEDICAO',payload:{stage:'Terraplanagem',quantity:120,unit:'m³',evidence:'foto-demo'}},
      {caseId:'input.material',category:'entrada',label:'Material pendente',event:'material.incomplete',entity:'materials',entityId:'TWA-MATERIAL',payload:{stage:'Rede de Água',missing:'tubos PEAD'}},
      {caseId:'input.cash',category:'entrada',label:'Mudança no caixa',event:'cash.changed',entity:'cash_flow_entries',entityId:'TWA-CAIXA',payload:{kind:'entrada',amountCents:0,stage:'Geral'}},
      {caseId:'input.lead',category:'entrada',label:'Mensagem de lead',event:'lead.message.received',entity:'leads',entityId:'TWA-LEAD',payload:{channel:'site',message:'Quero saber o valor do lote e condições.'}},
      {caseId:'input.reserve',category:'entrada',label:'Pedido de reserva',event:'lot.reserve.requested',entity:'leads',entityId:'TWA-RESERVA',payload:{lot:'Lote 54',documentsAttached:true}},
      {caseId:'input.payment',category:'entrada',label:'Pagamento recebido',event:'payment.received',entity:'commercial_sales',entityId:'TWA-PAGAMENTO',payload:{broker:'TWA-CORRETOR',amountCents:100000}},
      {caseId:'generation.readiness',category:'geração',label:'Prontidão operacional',event:'cash.changed',entity:'cash_flow_entries',entityId:'TWA-GERAR-PRONTIDAO',payload:{kind:'entrada',amountCents:0,stage:'Geral'}},
      {caseId:'generation.agenda',category:'geração',label:'Agenda e cronograma',event:'production.measured',entity:'records',entityId:'TWA-GERAR-AGENDA',payload:{stage:'Terraplanagem',quantity:120,unit:'m³',evidence:'foto-demo'}},
      {caseId:'generation.report',category:'geração',label:'Repasse mensal',event:'month.closed',entity:'broker_reports',entityId:'TWA-REPASSE',payload:{period:'competência atual',scope:'mensal e acumulado'}},
      {caseId:'notification.cash',category:'notificação',label:'Risco de caixa',event:'cash.negative',entity:'cash_flow_entries',entityId:'TWA-ALERTA-CAIXA',payload:{balanceCents:-1}},
      {caseId:'notification.material',category:'notificação',label:'Alerta de material',event:'material.incomplete',entity:'materials',entityId:'TWA-ALERTA-MATERIAL',payload:{stage:'Rede de Água',missing:'tubos PEAD'}},
      {caseId:'notification.coelba',category:'notificação',label:'Prazo Coelba',event:'coelba.deadline-near',entity:'electrical',entityId:'TWA-ALERTA-COELBA',payload:{daysRemaining:7}},
      {caseId:'propagation.calibration',category:'propagação',label:'Recalcular dependências',event:'calibration.changed',entity:'system_calibrations',entityId:'TWA-CALIBRACAO',payload:{version:'teste'}},
      {caseId:'propagation.release',category:'propagação',label:'Liberar próxima frente',event:'activity.completed',entity:'activities',entityId:'TWA-ATIVIDADE',payload:{stage:'Rede de Água',progress:100}},
      {caseId:'propagation.lead',category:'propagação',label:'Propagar CRM',event:'lead.message.received',entity:'leads',entityId:'TWA-CRM',payload:{channel:'site',message:'Tenho interesse em reservar.'}}
    ];
    const selected=input?.caseId?cases.find(item=>item.caseId===String(input.caseId)):null;
    const custom=input?.scenario==='single'&&input?.event
      ? [{caseId:'custom.event',category:'evento',label:'Evento livre',event:String(input.event),entity:String(input.entity||'test'),entityId:String(input.entityId||'TWA-SINGLE'),payload:input.payload||{}}]
      : null;
    const sequence=custom?custom:selected?[selected]:cases;
    const tests=sequence.map((item,index)=>{
      const inference=evaluateAgentTree({event:item.event});
      const stored=recordAgentEvent({type:item.event,entity:item.entity,entityId:item.entityId,actor,source:'twa-monitor-test',payload:{...item.payload,testRunId:runId},externalId:`twa-monitor-test:${runId}:${index}`});
      if(stored?.id)markEventProcessed(stored.id);
      return {caseId:item.caseId,category:item.category,label:item.label,input:item,inference,stored:{id:stored?.id||null,status:'processed'}};
    });
    const loop=runOperationalLoop({referenceDate:new Date().toISOString().slice(0,10),reason:'twa.worker.test',syncActivities:false,publishNotifications:false,includeNotifications:false,role:actor.role,clientState:{view:'twa-worker-monitor',globalSituation:true}});
    const outputs=tests.map(test=>{
      const actions=(test.inference?.signals||[]).map(signal=>signal.action);
      const notificationActions=actions.filter(action=>/^(notify|ask|request)\./.test(action));
      const previewCount=notificationActions.length||(test.category==='notificação'?1:0);
      return {...test,outputs:{generation:{readinessSnapshot:Boolean(loop.operational?.id),agendaItems:Number(loop.agenda?.length||0),stagePlan:Number(loop.panorama?.stages?.length||0),report:test.input.event==='month.closed'?'broker-monthly-reports':'não aplicável'},notifications:{mode:'pseudo-listener',external:'disabled',previewCount,roles:previewCount?['owner','admin','foreman']:[]},propagation:{count:actions.length,actions}}};
    });
    return send(res,200,{testRunId:runId,mode:'dry-run-local',externalMessaging:'disabled',tests:outputs,loop,monitor:buildWorkerMonitor(actor.role)});
  }
  return send(res,404,{error:'Monitoria de automação não encontrada.'});
}

function publicCatalogApi(req,res,pathname){
  if(pathname==='/api/automation/monitor'||pathname==='/api/automation/test'){
    automationMonitorApi(req,res,pathname).catch(error=>send(res,error?.statusCode||500,{error:error?.message||'Falha na monitoria.'}));
    return true;
  }
  if(req.method!=='GET'||pathname!=='/api/public/catalog')return false;
  const priority={available:0,negotiation:1,reserved:2,sold:3};
  const classify=value=>{
    const status=String(value||'').toLocaleLowerCase('pt-BR');
    if(/vend/.test(status))return 'sold';
    if(/reserv/.test(status))return 'reserved';
    if(/negocia|proposta|interesse/.test(status))return 'negotiation';
    return 'available';
  };
  const lots=new Map();
  for(const sale of listCommercialSales()){
    const lot=String(sale?.lot||'').trim(); if(!lot)continue;
    const status=classify(sale.status),previous=lots.get(lot);
    if(!previous||priority[status]>=priority[previous.status])lots.set(lot,{id:lot,code:lot,status});
  }
  send(res,200,{lots:[...lots.values()],source:'local-commercial-catalog',updatedAt:new Date().toISOString()});
  return true;
}

async function operationalApi(req,res,pathname){
  if(pathname==='/api/operational-loop'&&req.method==='POST'){
    const actor=await requestActor(req).catch(()=>({role:'owner',uid:'system',name:'Sistema'}));
    const input=await body(req);
    return send(res,200,runOperationalLoop({...input,role:actor.role||'owner'}));
  }
  if(pathname==='/api/operational-state'&&req.method==='GET')return send(res,200,latestOperationalState());
  if(pathname==='/api/calibrations'&&req.method==='GET')return send(res,200,getCalibration());
  if(pathname==='/api/calibrations'&&req.method==='PUT'){const actor=await requireRoles(req,['admin']),calibration=updateCalibration(await body(req),actor);bridgeAgentEvent({type:'calibration.changed',entity:'system_calibrations',entityId:calibration.projectId,actor,payload:{version:calibration.version}});return send(res,200,{calibration,operational:recalculateOperationalState('calibration.changed')});}
  if(pathname==='/api/automation/panorama'&&req.method==='GET')return send(res,200,buildAutomationPanorama());
  if(pathname==='/api/automation/run'&&req.method==='POST'){await requireRoles(req,['owner','admin']);return send(res,200,runAutomationPlanner(await body(req)));}
  if(pathname==='/api/devices'&&req.method==='POST'){const actor=await requireRoles(req,recordRoles);return send(res,201,{device:registerDevice(await body(req),actor)});}
  if(pathname==='/api/notifications'&&req.method==='GET'){const actor=await requireRoles(req,recordRoles);return send(res,200,{role:actor.role,notifications:listNotifications(actor.role)});}
  const notification=pathname.match(/^\/api\/notifications\/([^/]+)$/);
  if(notification&&req.method==='PUT'){const actor=await requireRoles(req,recordRoles),input=await body(req);return send(res,200,{notification:acknowledgeNotification(decodeURIComponent(notification[1]),actor,input.status==='acknowledged'?'acknowledged':'read')});}
  return send(res,405,{error:'Método não permitido.'});
}

const {startBelavistaCronJobs}=await import('./scripts/cron-jobs.mjs');
startBelavistaCronJobs({root,dbPath:process.env.BELAVISTA_DB||join(process.env.BELAVISTA_DATA_ROOT||join(root,'data'),'belavista.sqlite')});


async function brokerReportsApi(req,res){
  if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});
  const base=join(root,'output','broker-reports');
  const files=[];
  const walk=async(dir,prefix='')=>{for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){const rel=prefix?`${prefix}/${entry.name}`:entry.name;if(entry.isDirectory())await walk(join(dir,entry.name),rel);else if(/\.(xlsx|pdf)$/i.test(entry.name))files.push({name:entry.name,month:prefix.split('/')[0]||'',url:`/output/broker-reports/${rel.replace(/\\/g,'/')}`});}};
  await walk(base);
  return send(res,200,{files:files.sort((a,b)=>b.month.localeCompare(a.month)||a.name.localeCompare(b.name))});
}

createServer(async (req,res)=>{
  try { const pathname=new URL(req.url,'http://localhost').pathname; if(shouldProxyApi(pathname))return await proxyApi(req,res,pathname); if(publicCatalogApi(req,res,pathname))return; if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{...health(),ai:aiStatus(),auth:authStatus(),origin:requestOrigin(req),forwarded:Boolean(req.headers['x-forwarded-host']),belavistaApiBase}); if(pathname==='/api/runtime'&&req.method==='GET')return send(res,200,{origin:requestOrigin(req),host,port,forwardedHost:req.headers['x-forwarded-host']||null,forwardedProto:req.headers['x-forwarded-proto']||null,firebaseMessagingVapidKey:process.env.FIREBASE_MESSAGING_VAPID_KEY||'',belavistaApiBase}); if(pathname==='/api/ai/status'&&req.method==='GET')return send(res,200,aiStatus()); if(pathname==='/api/ai/tools'&&req.method==='GET')return send(res,200,{protocol:'belavista-client-tools/v1',tools:clientTools}); if(pathname==='/api/agent/tree'||pathname==='/api/agent/evaluate')return await agentTreeApi(req,res,pathname); if(pathname==='/api/operational-loop'||pathname==='/api/operational-state'||pathname==='/api/calibrations'||pathname==='/api/automation/panorama'||pathname==='/api/automation/run'||pathname==='/api/devices'||pathname==='/api/notifications'||pathname.startsWith('/api/notifications/'))return await operationalApi(req,res,pathname); if(pathname==='/api/stages-admin'||pathname.startsWith('/api/stages-admin/'))return await stagesAdminApi(req,res,pathname); if(pathname==='/api/workbench/state'||pathname==='/api/workbench/diary')return await workbenchApi(req,res,pathname); if(pathname==='/api/entities'&&req.method==='GET')return send(res,200,{entities:entitySummary()}); if(pathname==='/api/broker-reports')return await brokerReportsApi(req,res); if(pathname==='/api/field-confirmations')return await fieldConfirmationsApi(req,res); if(pathname==='/api/records'||pathname.startsWith('/api/records/'))return await recordsApi(req,res,pathname); if(pathname==='/api/cash-flow'||pathname.startsWith('/api/cash-flow/'))return await cashFlowApi(req,res,pathname); if(pathname==='/api/commission-reasons'||pathname.startsWith('/api/commission-reasons/'))return await commissionReasonsApi(req,res,pathname); if(pathname==='/api/outsourcing-receipts'||pathname.startsWith('/api/outsourcing-receipts/'))return await outsourcingReceiptsApi(req,res,pathname); if(pathname==='/api/purchase-receipts'||pathname.startsWith('/api/purchase-receipts/'))return await purchaseReceiptsApi(req,res,pathname); if(pathname==='/api/commercial-sales'||pathname.startsWith('/api/commercial-sales/'))return await commercialSalesApi(req,res,pathname); if(req.method==='POST'&&(pathname==='/api/gemini'||pathname==='/api/ai')) return await ai(req,res); if(req.method!=='GET') return send(res,405,{error:'Método não permitido.'}); const requested=normalize(pageForPath(pathname)).replace(/^[/\\]+/,''); const file=join(root,requested); if(!file.startsWith(root)) return send(res,403,{error:'Acesso negado.'}); const data=await readFile(file); res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto'}); res.end(data); } catch (error) { if(String(req.url||'').startsWith('/api/')) return send(res,error?.statusCode||500,{error:error?.message||'Falha no serviço local.'}); const data=await readFile(join(root,'index.html')); res.writeHead(200,{'Content-Type':types['.html'],'Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto'}); res.end(data); }
}).listen(port,host,()=>console.log(`Aliança Park local: http://localhost:${port} · rede: http://10.75.216.173:${port} · bind: ${host}`));
