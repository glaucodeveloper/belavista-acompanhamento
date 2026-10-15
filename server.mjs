import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot=fileURLToPath(new URL('.', import.meta.url));
const configRoot=process.env.BELAVISTA_CONFIG_ROOT?resolve(process.env.BELAVISTA_CONFIG_ROOT):serverRoot;
if(process.env.BELAVISTA_CONFIG_ROOT){
  try {
    const settings=JSON.parse(await readFile(join(configRoot,'settings.json'),'utf8'));
    for(const [key,value] of Object.entries(settings))if(/^[A-Z][A-Z0-9_]*$/.test(key)&&typeof value==='string'&&!process.env[key])process.env[key]=value;
  } catch {}
}else{
  try { const env = await readFile(join(serverRoot, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if(match && !process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,''); } } catch {}
}
const root = process.env.BELAVISTA_FRONTEND_ROOT ? resolve(process.env.BELAVISTA_FRONTEND_ROOT) : fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const publicOrigin = String(process.env.PUBLIC_ORIGIN || '').replace(/\/$/,'');
const belavistaApiBase = String(process.env.BELAVISTA_API_BASE || '').replace(/\/$/,'');
const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.CLIENT_ACCESS_TOKEN || '';
const aiProvider=String(process.env.AI_PROVIDER||'gemini').trim().toLowerCase();
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const nvidiaModel = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
const nvidiaVisionModel = process.env.NVIDIA_VISION_MODEL || process.env.NVIDIA_VLM_MODEL || 'meta/llama-3.2-90b-vision-instruct';
const nvidiaApiUrl = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const minicpmApiUrl = process.env.MINICPM_API_URL || 'http://127.0.0.1:19200/v1/chat/completions';
const minicpmModel = process.env.MINICPM_MODEL || 'minicpm5-2b';
const nvidiaReasoningVisionModel = process.env.NVIDIA_REASONING_VISION_MODEL || process.env.NVIDIA_REASONING_VLM_MODEL || nvidiaVisionModel;
const nvidiaReasoningApiUrl = process.env.NVIDIA_REASONING_API_URL || nvidiaApiUrl;
const nvidiaReasoningBudget = Math.max(256,Math.min(16384,Number(process.env.NVIDIA_REASONING_BUDGET)||2048));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const {health,entitySummary,listRecords,createRecord,createMaterialTransition,createFieldConfirmation,updateRecord,deleteRecord,listMaterials,createMaterial,updateMaterial,deleteMaterial,listAgendaEvents,saveAgendaSnapshot,createActivityAdmin,updateActivityAdmin,deleteActivityAdmin,listServiceRequests,getServiceRequest,createServiceRequest,updateServiceRequest,addServiceRequestFiles,getServiceRequestFile,listPurchaseReceipts,purchaseReceiptSummary,createPurchaseReceipt,getPurchaseReceiptFile,deletePurchaseReceipt,listCommercialSales,createCommercialSale,updateCommercialSale,getCommercialSaleFile,deleteCommercialSale,listCashFlowEntries,createCashFlowEntry,addCashFlowAttachment,getCashFlowAttachment,cashFlowSummary,listCommissionReasons,updateCommissionReason,listOutsourcingReceipts,createOutsourcingReceipt,getOutsourcingReceiptFile,listLeadMessages,createLeadMessage,getDesktopSetup,saveDesktopSetup,ingestInstagramDirect,listInstagramLeadReports,getInstagramLeadReport,listStagesAdmin,getStageAdmin,createStageAdmin,updateStageAdmin,saveStageActivitiesAdmin,saveStageAiConfig,getStageReport,getStageWorkbenchState,saveStageWorkbenchState,listWorkbenchActivityLocations,listWorkbenchDiary,createWorkbenchDiary,listWorkbenchAttachments,createWorkbenchAttachment,getWorkbenchAttachmentFile,deleteWorkbenchAttachment,initializeDevelopmentSeed}=await import('./persistence.mjs');
const {ServerInitializationProgramV1,driveServerInitializationProgramV1}=await import('./bootstrap/server-initialization-program-v1.mjs');
await driveServerInitializationProgramV1(ServerInitializationProgramV1.program(),{
  'initialize-clean-development-database':()=>initializeDevelopmentSeed(),
  'server-system-initialized':()=>undefined
});
const {agentTree,evaluateAgentTree}=await import('./agent-tree.js');
const {requestActor,requireRoles,authStatus}=await import('./auth-service.mjs');
const {limitedActorCanAccessApi}=await import('./api-access-policy.mjs');
const {getCalibration,updateCalibration,recordAgentEvent,recalculateOperationalState,latestOperationalState,listNotifications,acknowledgeNotification,registerDevice,buildAutomationPanorama,runAutomationPlanner,runOperationalLoop,buildWorkerMonitor,markEventProcessed}=await import('./operational-engine.mjs');
const {getProductionBaseline,getProductionPlan}=await import('./production-planning.mjs');
const {publishBridgeEvent}=await import('./firebase-bridge.mjs');
const {runOperationalAssistant,extractInstantRecordOcr}=await import('./worker/src/nvidia.js');
const {extractLocalRecordOcr}=await import('./local-record-ocr.mjs');
const {buildRecordInterpretationV1}=await import('./record-stage-interpretation-v1.mjs');
const {getCamofoxBridgeStatus,openInstagramInbox,fallbackInstagramDraft}=await import('./desktop/instagram-bridge.mjs');
const {listInstagramFeed,replyInstagramComment,defaultInstagramAutomationPolicy}=await import('./worker/src/social.js');

// A mesma fonte legível pelo time fica incorporada ao prompt operacional. Isso
// evita que a interface, o worker e o modelo mantenham ordens de execução
// diferentes. O arquivo continua sendo público para auditoria no TWA, mas o
// estado de cada requisição ainda é delimitado e validado abaixo.
let aiConstructionDocument='';
try { aiConstructionDocument=await readFile(join(serverRoot,'docs/ai-construction-operational-playbook.md'),'utf8'); } catch (error) { console.warn('[ai protocol]',error.message); }
const aiProductionBaseline=getProductionBaseline();
let localInstagramAutomationPolicy={...defaultInstagramAutomationPolicy,source:'local'};

function bridgeAgentEvent(input){
  const stored=recordAgentEvent(input);
  // Não bloqueia o registro local quando Firebase estiver temporariamente fora.
  void publishBridgeEvent({...stored,payload:input.payload||{}}).catch(error=>console.warn('[firebase bridge]',error.message));
  return stored;
}

const OPERATIONAL_CHAT_EXECUTION_POLICY_V1=`Trate pedidos operacionais como intenção de execução, usando somente ferramentas permitidas e sem inventar fatos. Leia a imagem junto com o texto disponível e primeiro classifique-a como nota/recibo, foto de evidência de serviço ou outro documento. Para nota, extraia todos os itens e separe material físico de serviço faturado. Para foto de campo, se a pessoa informar somente a etapa, use-a apenas como destino e identifique a ação pela imagem; use descrição da pessoa como relato apenas quando existir. Separe observação visual, relato e inferência; nunca deduza data/hora, equipe, quantidade ou conclusão que não estejam visíveis ou informadas. Compare ação/item com a descrição típica, pistas e atividades das etapas candidatas; associe atividade quando houver evidência visual/textual. A etapa selecionada/aberta é somente contexto de navegação e nunca pode ser fallback. Só aloque em etapa canônica se o encaixe estiver sustentado. Se a ação visual não for identificável com segurança, ou não houver candidata de etapa segura, não escolha a etapa mais próxima, não crie solicitação/adição órfã e mantenha toolCalls vazio: pergunte apenas o dado necessário. Quando alocar, use stage.allocate_visual_record com target material para insumo/equipamento/entrega/falta/comprovante e target service para ação visualmente identificada ou serviço faturado; envie etapa e atividade/material sustentados, detalhes, trecho, confiança e referência ao anexo. Mantenha como Pendente para revisão humana. Quando faltarem dados após entendimento seguro, prepare apontamento Pendente e pergunte só o que falta. Nunca confirme execução que ferramenta não confirmou.`;

// These tools are intentionally executed in the browser, where the live map
// and UI state exist. The server only asks the model for validated intent; it
// never lets a prompt execute shell, SQL, network or arbitrary JavaScript.
const clientTools=[
  {name:'ui.navigate',description:'Abre uma área da aplicação.',args:{view:'map|control|lot-development|materials|documents|stages|agenda|actions|activities|records|progress|personnel|leads|contracts|brokers|brokers-board|finance|reports|settings'}},
  {name:'ui.open_form',description:'Abre o formulário de adição da área indicada para revisão humana; não salva dados.',args:{view:'materials|documents|agenda|activities|progress|contracts|brokers|reports'}},
  {name:'map.set_overlay',description:'Destaca uma frente no GLB compartilhado.',args:{category:'terraplanagem|drenagem|rede-agua|rede-eletrica|pavimentacao|urbanizacao|clear'}},
  {name:'map.adjust_view',description:'Ajusta a vista 3D do mapa por deltas pequenos.',args:{rotationDelta:'number opcional',tiltDelta:'number opcional',zoomDelta:'number opcional',fit:'boolean opcional'}},
  {name:'map.set_tiles',description:'Alterna a base cartográfica.',args:{mode:'satellite|osm'}},
  {name:'records.open_form',description:'Abre a ficha de evento geral na Central operacional, com sugestões para revisão humana; não grava dados.',args:{activity:'nome do evento opcional',responsible:'responsável opcional',details:'descrição inferida opcional',category:'ocorrencia|vistoria|reuniao|comunicacao|decisao|outro opcional'}},
  {name:'stage.allocate_visual_record',description:'Aloca item de nota ou ação visualmente identificada em foto como adição Pendente em Materiais ou Serviços da etapa. Associe pela evidência da imagem/OCR com descrição típica, pistas e atividades das etapas candidatas; a etapa indicada pela pessoa é destino explícito, mas nunca evidência da ação. Só chame com etapa canônica e ação sustentadas e revisão humana; sem encaixe seguro pergunte e mantenha toolCalls vazio. Informe atividade/material, detalhes, trecho e confiança quando sustentados.',args:{target:'material|service',stageKey:'chave canônica da etapa obrigatória',stageName:'nome canônico da etapa obrigatório',activityId:'atividade opcional',activityName:'serviço ou atividade opcional',materialName:'material ou equipamento opcional',quantity:'quantidade explicitamente identificada opcional',unit:'unidade opcional',details:'descrição da pessoa e observação OCR/visual',confidence:'0 a 1 opcional',pointer:'trecho ou indicação que sustentou a classificação'}},
  {name:'agenda.create_pending',description:'Cria apontamento Pendente no cronograma quando etapa/atividade já são compreendidas e abre o item para completar dados.',args:{title:'título',stageKey:'etapa opcional',stageName:'nome da etapa opcional',activityId:'atividade opcional',activityName:'nome da atividade opcional',owner:'responsável opcional',date:'AAAA-MM-DD opcional',start:'HH:MM opcional',detailsNeeded:'detalhes que faltam',evidenceRequired:'boolean',notes:'contexto'}},
  {name:'documents.open_form',description:'Abre a inclusão de documento/evidência.',args:{reason:'motivo',documentType:'tipo opcional'}},
  {name:'reports.select',description:'Abre um relatório salvo.',args:{family:'Financeiro|Construção|Suprimentos|Comercial|Governança',reportType:'id opcional'}},
  {name:'commissions.filter',description:'Filtra a carteira comercial.',args:{query:'texto opcional',status:'Reserva|Em análise|Proposta|Assinado|all opcional',profile:'id opcional'}},
  {name:'lot-development.upsert_profile',description:'Cria ou atualiza, para revisão humana, o perfil de um lote existente ou de uma área comum na página Loteamento. Para lote, informe o lote da tabela; para área comum, descreva uso e localização sem inventar medidas.',args:{kind:'lot|common-area',lot:'rótulo ou número do lote quando kind=lot',title:'nome do perfil',description:'descrição factual ou solicitada',status:'situação opcional',area:'m² somente se informado',value:'valor somente se informado',quadra:'quadra opcional'}},
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
  if(call.name==='ui.navigate'&&!['map','control','lot-development','materials','documents','stages','agenda','actions','activities','records','progress','personnel','leads','contracts','brokers','brokers-board','finance','reports','settings'].includes(args.view))return null;
  if(call.name==='ui.open_form'&&!['materials','documents','agenda','activities','progress','contracts','brokers','reports'].includes(args.view))return null;
  if(call.name==='map.set_tiles'&&!['satellite','osm'].includes(args.mode))return null;
  if(call.name==='stage.allocate_visual_record'){
    const target=String(args.target||'').toLocaleLowerCase('pt-BR');
    args.target=/material|insumo|equipamento/.test(target)?'material':/servi[cç]|atividade|execu/.test(target)?'service':null;
    if(!args.target)return null;
    for(const key of ['stageKey','stageName','activityId','activityName','materialName','unit','details','pointer'])if(key in args)args[key]=String(args[key]??'').trim().slice(0,1200);
    if('quantity' in args){const value=Number(String(args.quantity).replace(',','.'));args.quantity=Number.isFinite(value)?value:null;}
    if('confidence' in args){const value=Number(args.confidence);args.confidence=Number.isFinite(value)?Math.max(0,Math.min(1,value)):null;}
  }
  if(call.name==='lot-development.upsert_profile'){
    args.kind=/common|área|area/i.test(String(args.kind||''))?'common-area':'lot';
    for(const key of ['lot','lotLabel','title','name','description','status','quadra'])if(key in args)args[key]=String(args[key]??'').trim().slice(0,key==='description'?2000:160);
    for(const key of ['area','value'])if(key in args){const value=Number(String(args[key]).replace(',','.'));args[key]=Number.isFinite(value)&&value>=0?value:undefined;}
    if(args.kind==='lot'&&!String(args.lot||args.lotLabel||'').trim())return null;
  }
  if(call.name==='ui.print')args.scope=['current','map','contract'].includes(args.scope)?args.scope:'current';
  if(call.name==='map.adjust_view')for(const key of ['rotationDelta','tiltDelta','zoomDelta'])if(key in args){const value=Number(args[key]);if(!Number.isFinite(value))delete args[key];else args[key]=Math.max(key==='zoomDelta'?-1:key==='tiltDelta'?-24:-90,Math.min(key==='zoomDelta'?1:key==='tiltDelta'?24:90,value));}
  return {name:call.name,arguments:args};
}
function mergeToolCalls(...groups){
  const output=[],seen=new Set();for(const group of groups)for(const call of group||[]){const normalized=normalizeToolCall(call);const key=normalized?`${normalized.name}:${JSON.stringify(normalized.arguments)}`:'';if(normalized&&!seen.has(key)){seen.add(key);output.push(normalized);}}return output.slice(0,4);
}
function parseToolEnvelope(content){
  const raw=String(content||'').trim().replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
  const candidates=[raw,raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1],raw.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);
  for(const candidate of candidates){
    try{const parsed=JSON.parse(candidate);const toolCalls=(parsed.toolCalls||parsed.tool_calls||[]).map(normalizeToolCall).filter(Boolean);if(typeof parsed.reply==='string'||typeof parsed.text==='string'||parsed.proposal||parsed.extracted||toolCalls.length)return {...parsed,...toolEnvelope(parsed.reply||parsed.text||'',toolCalls)};}catch{}
  }
  return toolEnvelope(raw,[]);
}
function inferredToolCalls(message){
  const text=String(message||'').toLocaleLowerCase('pt-BR'),calls=[];
  if(!/\b(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar|registre|registrar|filtre|filtrar|destaque|destacar|aproxime|aproximar|afaste|afastar|gire|girar|imprima|imprimir)\b/.test(text))return [];
  const go=(view)=>calls.push({name:'ui.navigate',arguments:{view}});
  const explicitOpen=/\b(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar)\b/.test(text);
  const profileIntent=/\b(perfil|ficha|cadastro)\b/.test(text)&&/\b(loteamento|lote|área comum|area comum|praça|praca|portaria|lazer|vi[aá]rio)\b/.test(text);
  if(profileIntent&&/\b(novo|nova|criar|adicionar|atualizar|editar)\b/.test(text)){
    const lotMatch=String(message||'').match(/\b(?:lote\s*)?([a-z]{1,3}[-\s]?\d{1,3}|\d{1,3})\b/i);
    const isCommon=/área comum|area comum|praça|praca|portaria|lazer|vi[aá]rio/i.test(String(message||''));
    calls.push({name:'lot-development.upsert_profile',arguments:{kind:isCommon?'common-area':'lot',lot:isCommon?'':lotMatch?.[1]||'',title:isCommon?String(message||'').replace(/^.*?(?:perfil|área comum|area comum)\s*/i,'').slice(0,120)||'Área comum do loteamento':`Perfil do lote ${lotMatch?.[1]||''}`.trim(),description:String(message||'').trim()}});
  } else if(profileIntent&&explicitOpen) go('lot-development');
  const formView=[['documents',/documento/],['materials',/materia(is|l)/],['agenda',/compromisso/],['activities',/atividade/],['progress',/apontamento/],['contracts',/contrato/],['brokers',/negocia[cç][aã]o|venda/],['reports',/relat[oó]rio/]].find(([,pattern])=>pattern.test(text))?.[0];
  if(explicitOpen&&/\b(novo|nova|criar|adicionar)\b/.test(text)&&formView&&!/\b(evento|ocorr[eê]ncia|registro geral)\b/.test(text))return [{name:'ui.open_form',arguments:{view:formView}}];
  if(explicitOpen){
    const destination=[['lot-development',/loteamento|perfil.*lote|área comum|area comum/],['documents',/documento/],['materials',/materia(is|l)/],['contracts',/contrato/],['brokers-board',/corretor/],['reports',/relat[oó]rio/],['finance',/finan[cç]|caixa|dre/],['personnel',/encarregado|pessoal|equipe/],['leads',/lead|cliente/],['map',/mapa/],['settings',/configura[cç]/],['control',/central operacional|dashboard/],['agenda',/agenda/],['actions',/a[cç][oõ]es ia/],['activities',/atividade/],['progress',/andamento/],['records',/registro/],['stages',/etapa|cronograma/],['brokers',/comiss[aã]o|negocia[cç][aã]o/]].find(([,pattern])=>pattern.test(text))?.[0];
    if(destination)go(destination);
  }
  if(/\b(registr\w*|cri\w*|adicion\w*|novo|nova)\b/.test(text)&&/\b(evento|ocorr[eê]ncia|registro\s+geral)\b/.test(text))calls.push({name:'records.open_form',arguments:{details:String(message||'').trim()}});
  else if(/\b(central\s+operacional|dashboard|tabelas?\s+(de\s+)?(materiais|comiss[oõ]es|finan[cç]as)|escuta\s+(do\s+)?(agente|firebase))\b/.test(text))go('control');
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
  if(/\b(novo|criar|adicionar)\b/.test(text)&&/\b(registro|apontamento)\b/.test(text)&&!calls.some(call=>call.name==='records.open_form'))calls.push({name:'records.open_form',arguments:{details:String(message||'').trim()}});
  if(/\b(imprim|pdf|exportar mapa)\b/.test(text))calls.push({name:'ui.print',arguments:{scope:/mapa/.test(text)?'map':'current'}});
  if(!calls.some(call=>call.name==='records.open_form')){
    if(/\b(financeir\w*|dre|fluxo de caixa)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Financeiro'}});
    else if(/\b(constru[cç]\w*|obra|f[ií]sico-financeir\w*|evm)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Construção'}});
    else if(/\b(suprimento\w*|fornecedor\w*|material\w*|compra\w*)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Suprimentos'}});
    else if(/\b(comercial\w*|convers[aã]o\w*|funil|venda\w*)\b/.test(text))calls.push({name:'reports.select',arguments:{family:'Comercial'}});
  }
  return calls.slice(0,4);
}

async function body(req,maxBytes=16_000_000){ let data='',size=0; for await (const chunk of req){size+=chunk.length;if(size>maxBytes){const error=new Error('Corpo da requisição excede o limite permitido.');error.statusCode=413;throw error;}data+=chunk;} return JSON.parse(data||'{}'); }
async function rawBody(req,maxBytes=16_000_000){ const chunks=[]; let size=0; for await (const chunk of req){size+=chunk.length;if(size>maxBytes){const error=new Error('Corpo da requisição excede o limite permitido.');error.statusCode=413;throw error;}chunks.push(chunk);} return Buffer.concat(chunks); }
const recordRoles=['owner','admin','foreman','sales','commercial','broker','corretor'];
const limitedApiPublicPaths=new Set(['/api/health','/api/runtime','/api/ai/status','/api/inference/status','/api/ai/tools','/api/public/catalog']);
async function authorizeApiSurface(req,pathname){
  if(!pathname.startsWith('/api/')||limitedApiPublicPaths.has(pathname)||pathname.startsWith('/api/public/'))return;
  const actor=await requestActor(req);
  const url=new URL(req.url,'http://localhost');
  if(!limitedActorCanAccessApi(actor,pathname,req.method,url.search))throw Object.assign(new Error('Este perfil só pode acessar registros e a linha do tempo do cronograma.'),{statusCode:403});
}
function inferenceTokens(value){return String(value||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(token=>token.length>2);}
const productionBasisLabels={volume:'Volume executado',area:'Área executada',comprimento:'Comprimento executado',contagem:'Itens ou unidades executados',registro:'Registro confirmado'};
const productionBasisForUnit=unit=>/m³/i.test(unit)?'volume':/m²/i.test(unit)?'area':/^m$|\bm\b/i.test(unit)?'comprimento':/viagem|lote|ramal|cavalete|un|ponto|trecho|setor|ensaio|processo/i.test(unit)?'contagem':'registro';
function stageInputProduction(payload={},activity={}){
  const plan=getProductionPlan(String(payload.stage||''),{name:activity.title||payload.title||'Atividade',unit:activity.unit||payload.unit||'un'}),operational=activity.operational&&typeof activity.operational==='object'?activity.operational:payload.operational&&typeof payload.operational==='object'?payload.operational:{},operationalProduction=operational.production&&typeof operational.production==='object'?operational.production:{},unit=String(activity.unit||payload.unit||operationalProduction.unit||plan.unit||'registro').trim()||'registro',programming=payload.programming&&typeof payload.programming==='object'?payload.programming:{},basis=['volume','area','comprimento','contagem','registro'].includes(String(programming.productionBasis))?String(programming.productionBasis):productionBasisForUnit(unit),referenceRate=Number(plan.baseRate)||0,rateUnit=String(plan.rateUnit||`${unit}/dia`).trim()||`${unit}/dia`,unitLabel=unit==='m³'?'m³':unit==='m²'?'m²':unit;
  const quantityFormula=`quantidade válida = soma das medições confirmadas em ${unitLabel}`;
  const durationFormula=`duração (dias úteis) = teto(quantidade total ÷ ritmo ajustado de ${rateUnit})`;
  return {basis,basisLabel:productionBasisLabels[basis]||productionBasisLabels.registro,unit,measureForm:String(operationalProduction.method||`Registrar produção em ${unitLabel}, por frente/local e por data, com confirmação do responsável.`),quantityFormula:String(operationalProduction.formula||quantityFormula),durationFormula,referenceRate,rateUnit,referenceDescription:String(operationalProduction.rate||`${referenceRate||'—'} ${rateUnit}`),totalQuantity:Number(plan.totalQuantity)||0,source:'DWG + plano de produção local',captureFields:['quantidade executada',`unidade (${unitLabel})`,'data do registro','frente/local','responsável','evidência'],validation:Array.isArray(operational.acceptance)&&operational.acceptance.length?operational.acceptance.join(' · '):'Somente registros confirmados entram na soma; a IA sugere e o perfil autorizado confirma.'};
}
function stageInputConditions(payload={},activity={},production=stageInputProduction(payload,activity)){
  const operational=activity.operational&&typeof activity.operational==='object'?activity.operational:payload.operational&&typeof payload.operational==='object'?payload.operational:{},source=`${activity.title||payload.title||''} ${payload.text||''} ${activity.release||payload.release||''} ${(activity.materials||payload.materials||[]).join(' ')} ${(operational.entryConditions||[]).join(' ')} ${(operational.conditions||[]).join(' ')}`.toLocaleLowerCase('pt-BR'),release=String(activity.release||payload.release||'').trim(),materials=Array.isArray(activity.materials)?activity.materials.map(String).filter(Boolean):Array.isArray(payload.materials)?payload.materials.map(String).filter(Boolean):[];
  const conditions=[{id:'yield-below-reference',kind:'rendimento',label:'Rendimento abaixo do ritmo',trigger:`disparar quando um registro confirmado ficar abaixo de ${production.referenceDescription||`${production.referenceRate||'—'} ${production.rateUnit||''}`} ou vier bloqueado`,notifyWhen:'production-below-reference',metric:{operator:'lt',value:production.referenceRate,unit:production.rateUnit},notifyRoles:['owner'],severity:'warning',message:'O rendimento confirmado ficou abaixo do ritmo de referência; revisar caixa, equipe, máquina e frente.'}];
  const soilTerms=['solo','greide','cota','fundo','chuva','lama','umidade','terraplanagem'];
  conditions.push({id:'soil-or-field',kind:'solo',label:'Condição de solo e campo',trigger:source.match(/solo|greide|cota|fundo|chuva|lama|umidade/)?'disparar quando o registro indicar solo, greide, cota ou condição de campo impedindo a execução':'confirmar solo, greide e cotas antes de liberar a produção',watchTerms:soilTerms,negativeTerms:['bloqueado','impedido','inadequado','atraso','chuva','lama','umidade','não','nao','pendente'],notifyWhen:'negative-match',notifyRoles:['owner','foreman'],severity:'warning',message:'Condição de solo/campo requer decisão antes de manter a atividade no cronograma.'});
  if(release)conditions.push({id:'task-dependency',kind:'dependencia',label:'Dependência de outra atividade',trigger:`disparar se o requisito “${release}” estiver pendente, recusado ou bloqueando`,watchTerms:inferenceTokens(release),negativeTerms:['bloqueado','impedido','pendente','aguardando','recusado','não','nao','atraso'],notifyWhen:'negative-match',notifyRoles:['owner','foreman'],severity:'info',message:`A atividade depende do requisito de saída: ${release}.`});
  if(materials.length)conditions.push({id:'material-readiness',kind:'material',label:'Material necessário',trigger:`disparar se faltar ou atrasar: ${materials.join(', ')}`,watchTerms:materials.flatMap(inferenceTokens),negativeTerms:['falta','faltando','sem','atrasado','atraso','indisponivel','indisponível','pendente'],notifyWhen:'negative-match',notifyRoles:['owner','foreman'],severity:'warning',message:`Material necessário para a atividade: ${materials.join(', ')}.`});
  const configured=Array.isArray(operational.conditions)?operational.conditions.map((condition,index)=>({id:`operational-${index+1}`,kind:'operacional',label:'Condição operacional',trigger:String(condition),notifyWhen:'operational-match',notifyRoles:['owner','foreman'],severity:'info',message:String(condition)})):[];
  return [...conditions,...configured].slice(0,8);
}
function stageInputStructured(payload={},activity={}){
  const production=stageInputProduction(payload,activity),conditions=stageInputConditions(payload,activity,production);
  const operational=activity.operational&&typeof activity.operational==='object'?activity.operational:payload.operational&&typeof payload.operational==='object'?payload.operational:{};
  return {production,conditions,operational:{responsibility:operational.responsibility||{},entryConditions:operational.entryConditions||[],procedure:operational.procedure||[],evidence:operational.evidence||[],acceptance:operational.acceptance||[],outputs:operational.outputs||[]},notificationPolicy:{enabled:payload.automation?.notifyWorker!==false,mode:'pseudo-listener',trigger:'structured-condition-match',primaryRecipient:'owner',deduplicateBy:'stage/activity/condition/event',externalMessaging:'disabled'}};
}
function inferStageInput(payload={}){
  if(Array.isArray(payload.properties)&&payload.properties.length){
    const propertyContext=payload.properties.map(item=>`${item?.label||'propriedade'}: ${item?.value||''}`).join(' · ');
    payload.text=`${String(payload.text||payload.message||'').trim()}\nPropriedades dinâmicas: ${propertyContext}`;
  }
  const source=String(payload.text||payload.message||'').trim(),currentId=String(payload.activityId||''),currentTitle=String(payload.title||'Atividade em análise').trim()||'Atividade em análise';
  const activities=Array.isArray(payload.activities)?payload.activities.slice(0,40).map(item=>({id:String(item?.id||''),title:String(item?.title||''),unit:String(item?.unit||''),release:String(item?.release||''),materials:Array.isArray(item?.materials)?item.materials.map(String):[],operational:item?.operational&&typeof item.operational==='object'?item.operational:null})).filter(item=>item.id&&item.title):[];
  const currentActivity=activities.find(item=>item.id===currentId)||{id:currentId,title:currentTitle,unit:String(payload.unit||''),release:String(payload.release||''),materials:Array.isArray(payload.materials)?payload.materials.map(String):[],operational:payload.operational&&typeof payload.operational==='object'?payload.operational:null};
  const structured=stageInputStructured(payload,currentActivity);
  const textTokens=new Set(inferenceTokens(`${currentTitle} ${source}`));
  const explicit=activities.find(item=>item.id!==currentId&&source.toLocaleLowerCase('pt-BR').includes(item.title.toLocaleLowerCase('pt-BR')));
  const scored=activities.filter(item=>item.id!==currentId).map(item=>{const vocabulary=[...inferenceTokens(`${item.title} ${item.release} ${item.materials.join(' ')}`)];const score=vocabulary.reduce((sum,token)=>sum+(textTokens.has(token)?1:0),0);return {...item,score};}).sort((a,b)=>b.score-a.score);
  const related=explicit||scored.find(item=>item.score>0)||null;
  const after=/\b(depois|apos|ap[oó]s|somente depois|aguarda|depende|liberac[aã]o de)\b/i.test(source);
  const before=/\b(antes|prepara|preparar|libera|liberac[aã]o para|requisito para)\b/i.test(source);
  let relation=null;
  if(related){
    const fromActivityId=after?related.id:currentId,toActivityId=after?currentId:related.id;
    const label=after?`depende de ${related.title}`:before?`libera antes de ${related.title}`:`relacionada a ${related.title}`;
    relation={fromActivityId,toActivityId,label,relatedActivityId:related.id,relatedActivityTitle:related.title,confidence:explicit?.id===related.id ? .92 : Math.min(.88,.45+related.score*.1)};
  }
  return {
    summary:relation?`A entrada foi compreendida como ${currentTitle} ${relation.label}. O vínculo será refletido no cronograma.`:`A entrada foi registrada para ${currentTitle}. Nenhuma dependência segura foi identificada; revise ou mencione outra atividade.`,
    relation,
    relatedActivityId:relation?.relatedActivityId||null,
    relationLabel:relation?.label||'',
    confidence:relation?.confidence||.35,
    provider:'local-ai-rules',
    sourceText:source.slice(0,1200),
    production:structured.production,
    conditions:structured.conditions,
    operational:structured.operational,
    notificationPolicy:structured.notificationPolicy
  };
}
async function workbenchInferenceApi(req,res){
  const payload=await body(req,120_000),base=inferStageInput(payload);
  let model=null;
  if(process.env.NVIDIA_API_KEY){
    try{
      const modelEnv={...process.env,NVIDIA_TIMEOUT_MS:'1800'};
      model=await runOperationalAssistant(modelEnv,{view:'stage-input-inference',message:`Classifique esta entrada de atividade de obra. Preserve a relação determinística fornecida e, se houver evidência textual mais forte, proponha relatedActivityId e relationLabel. Responda em JSON curto com text, relatedActivityId, relationLabel e confidence. Não remova nem invente production, conditions, operational ou notificationPolicy: esses blocos são estruturados pelo motor local. Entrada: ${base.sourceText}. Atividade atual: ${payload.title||payload.activityId}. Atividades candidatas: ${JSON.stringify(payload.activities||[])}. Relação determinística: ${JSON.stringify(base.relation||null)}. Produção estruturada: ${JSON.stringify(base.production)}. Operação, responsabilidades e aceite: ${JSON.stringify(base.operational)}. Condições estruturadas: ${JSON.stringify(base.conditions)}`,context:{stage:payload.stage||'',currentActivityId:payload.activityId||'',deterministic:base}});
    }catch(error){model={error:error.message};}
  }
  const allowed=new Set((payload.activities||[]).map(item=>String(item?.id||'')));
  const modelRelationId=allowed.has(String(model?.relatedActivityId||''))?String(model.relatedActivityId):base.relatedActivityId;
  const modelLabel=String(model?.relationLabel||'').trim();
  const result={...base,modelText:String(model?.text||'').trim()||null,provider:model?.provider==='nvidia-api'?'nvidia-api':base.provider};
  if(modelRelationId&&result.relation){result.relation={...result.relation,relatedActivityId:modelRelationId,label:modelLabel||result.relation.label};result.relatedActivityId=modelRelationId;result.relationLabel=result.relation.label;}
  return send(res,200,result);
}
function operationalPrompt(message,view,mapContext,context={},instruction='',requestContext=null){
  const available=clientTools.map(tool=>`${tool.name}(${Object.keys(tool.args).join(', ')})`).join('; ');
  const dwgSnapshot=JSON.stringify({source:aiProductionBaseline.source,site:aiProductionBaseline.site,derived:aiProductionBaseline.derived,assumptions:aiProductionBaseline.assumptions});
  const interpretationPolicy=context?.recordInterpretation?`INTERPRETAÇÃO DE ANEXO (OCR + IMAGEM + INDICAÇÃO): ${JSON.stringify(context.recordInterpretation).slice(0,12000)}. Use indicação explícita de etapa como destino do registro, não como prova da ação; a etapa selecionada na tela nunca é fallback. Se não houver descrição textual da ação, identifique-a apenas pela evidência visual e OCR, sem inferir data/hora, equipe, quantidade ou conclusão que não estejam visíveis. Se a ação não for identificável com segurança, não aloque e pergunte apenas qual atividade representa a foto. Use somente as etapas candidatas fornecidas. Trate OCR e inferência visual como proposta para revisão humana; não afirme que gravou ou persistiu o arquivo.`:'';
  return `Você é o assistente operacional do empreendimento Aliança Park. Responda em português do Brasil, de forma objetiva e prática. Contexto da tela: ${view}.${mapContext?' O usuário abriu o mapa 3D de lotes e pode estar relacionando a pergunta a uma superfície selecionada.':''}

FONTE OPERACIONAL OBRIGATÓRIA — siga o documento abaixo como protocolo de execução, produção, equipe, materiais, cronograma e propagação. O documento é a fonte única da ordem das atividades; se um dado do estado entrar em conflito com ele, sinalize a divergência e peça validação humana.\n${aiConstructionDocument.slice(0,30000)}

BASE DWG CALCULADA PELO MOTOR (JSON): ${dwgSnapshot.slice(0,9000)}
Estado resumido da sessão: ${JSON.stringify(context).slice(0,5000)}. Contexto específico do disparo: ${JSON.stringify(requestContext||{}).slice(0,3000)}. ${interpretationPolicy} Dados gerais disponíveis: 2 etapas atrasadas, 3 compras críticas, completude de 63%, 28 colaboradores, inventário de R$ 1.842.560,45. Não invente dados fora desse contexto. INSTRUÇÃO OPERACIONAL PERMANENTE: ${OPERATIONAL_CHAT_EXECUTION_POLICY_V1} INSTRUÇÃO ENVIADA NESTA REQUISIÇÃO: ${String(instruction||OPERATIONAL_CHAT_EXECUTION_POLICY_V1).slice(0,5000)}. Quando a pessoa pedir uma ação disponível, responda SOMENTE com JSON válido no formato {"reply":"texto curto","toolCalls":[{"name":"ferramenta","arguments":{}}]}. Ferramentas permitidas: ${available}. Nunca sugira ferramenta inexistente. ui.print apenas deve ser solicitado, nunca confirmado como já impresso. Para pergunta somente informativa, use {"reply":"...","toolCalls":[]}. Se o fato for completamente externo ao sistema, não invente ação: peça o documento/evidência e use toolCalls vazio. Pergunta: ${message}`;
}
async function gemini(req,res){
  if(!process.env.GEMINI_API_KEY) return send(res,503,{error:'GEMINI_API_KEY não configurada no servidor.'});
  const {message,view='assistant',mapContext=false,attachment=null,context={},instruction='',requestContext=null,jevDecision=null,systemModel=null}=await body(req);
  if(typeof message!=='string'||!message.trim()) return send(res,400,{error:'Mensagem inválida.'});
  const image=attachment?normalizeNvidiaImageAttachment(attachment):null;
  if(attachment&&!image)return send(res,400,{error:'Imagem inválida. Use PNG, JPEG ou WEBP de até 6 MB.'});
  const recordOcr=image?await extractInstantRecordOcr(process.env,{attachment:{...attachment,mimeType:image.mimeType,dataUrl:image.dataUrl},context:{userDescription:message,stages:context?.stages||[],selectedStageKey:context?.selectedStageKey||'',selectedStageName:context?.selectedStageName||''}}).catch(error=>({error:String(error?.message||error),reviewRequired:true})):null;
  const recordInterpretation=image?buildRecordInterpretationV1({message,stages:context?.stages,selectedStageKey:context?.selectedStageKey,recordOcr}):context?.recordInterpretation||null;
  const modelContext=recordInterpretation?{...context,recordInterpretation}:context;
  const modelRequestContext=recordInterpretation?{...(requestContext||{}),recordInterpretation}:requestContext;
  const prompt=operationalPrompt(message,view,mapContext,modelContext,instruction,modelRequestContext);
  const parts=[{text:prompt}];
  const imageMatch=typeof image?.dataUrl==='string'&&image.dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(imageMatch&&imageMatch[2].length<=8_000_000)parts.push({inlineData:{mimeType:imageMatch[1]==='image/jpg'?'image/jpeg':imageMatch[1],data:imageMatch[2]}});
  const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:.35,maxOutputTokens:500}})});
  const json=await upstream.json();
  if(!upstream.ok) return send(res,502,{error:json?.error?.message||'Gemini recusou a solicitação.'});
  const result=parseToolEnvelope(json?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'Gemini não retornou texto.');
  result.toolCalls=mergeToolCalls(result.toolCalls,inferredToolCalls(message));
  return send(res,200,{...result,provider:'gemini',model:geminiModel,vision:Boolean(image),recordOcr,attachment:image?{name:String(attachment?.name||'imagem'),mimeType:image.mimeType,stored:false,storage:'local-ephemeral'}:null,inference:{protocol:'belavista-operational-inference/v1',endpoint:new URL(req.url||'','http://localhost').pathname,systemModel,systemRuntime:'open-jev',jev:jevDecision}});
}
function normalizeNvidiaImageAttachment(attachment){
  const source=String(attachment?.dataUrl||'').trim();
  const match=source.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)return null;
  const mimeType=match[1].toLowerCase()==='image/jpg'?'image/jpeg':match[1].toLowerCase();
  const base64=match[2].replace(/\s+/g,'');
  if(!base64||base64.length>8_400_000)return null;
  return {mimeType,dataUrl:`data:${mimeType};base64,${base64}`};
}
function receiptMaterialAllocationCalls(recordOcr,recordInterpretation){
  const documentType=String(recordOcr?.documentType||'');
  const explicitStage=recordInterpretation?.explicitStage;
  if(!['purchase_invoice','purchase_receipt'].includes(documentType)||!explicitStage?.key)return [];
  return (Array.isArray(recordOcr?.items)?recordOcr.items:[])
    .map(item=>{
      const description=String(item?.materialName||item?.description||item?.name||item?.materialId||'').trim();
      const kind=String(item?.itemKind||item?.type||'material').toLocaleLowerCase('pt-BR');
      if(!description||/servi[cç]|m[aã]o de obra|labor/.test(kind))return null;
      const quantity=Number(item?.quantity);
      const confidence=Number(item?.confidence??recordOcr?.confidence);
      return {name:'stage.allocate_visual_record',arguments:{
        target:'material',stageKey:String(explicitStage.key),stageName:String(explicitStage.name||explicitStage.key),
        activityId:String(item?.activityId||''),activityName:String(item?.activityName||'Registro de material por nota fiscal'),
        materialName:description,...(Number.isFinite(quantity)?{quantity}:{}),unit:String(item?.unit||'un.'),
        details:String(item?.details||recordOcr?.text||`Item reconhecido na nota fiscal: ${description}`).slice(0,1200),
        pointer:String(item?.pointer||item?.description||description).slice(0,1200),
        ...(Number.isFinite(confidence)?{confidence:Math.max(0,Math.min(1,confidence))}:{})
      }};
    })
    .filter(Boolean)
    .slice(0,4);
}
async function nvidia(req,res){
  if(!process.env.NVIDIA_API_KEY) return send(res,503,{error:'NVIDIA_API_KEY não configurada no servidor.'});
  const {message,view='assistant',mapContext=false,attachment=null,context={},instruction='',requestContext=null,jevDecision=null,systemModel=null}=await body(req);
  const requestPath=new URL(req.url||'','http://localhost').pathname;
  const reasoningVision=requestPath==='/api/ai/vision-reasoning'||(requestPath==='/api/inference'&&Boolean(attachment));
  if(reasoningVision&&!attachment)return send(res,400,{error:'A rota de reasoning exige uma imagem.'});
  if((typeof message!=='string'||!message.trim())&&!attachment)return send(res,400,{error:'Mensagem inválida.'});
  const image=attachment?normalizeNvidiaImageAttachment(attachment):null;
  if(attachment&&!image)return send(res,400,{error:'Imagem inválida. Use PNG, JPEG ou WEBP de até 6 MB.'});
  const requestMessage=typeof message==='string'&&message.trim()?message:'Analise a imagem anexada e descreva os fatos visíveis e seus impactos operacionais.';
  const recordOcr=image?await extractInstantRecordOcr(process.env,{attachment:{...attachment,mimeType:image.mimeType,dataUrl:image.dataUrl},context:{userDescription:requestMessage,stages:context?.stages||[],selectedStageKey:context?.selectedStageKey||'',selectedStageName:context?.selectedStageName||''}}).catch(error=>({error:String(error?.message||error),reviewRequired:true})):null;
  const recordInterpretation=image?buildRecordInterpretationV1({message:requestMessage,stages:context?.stages,selectedStageKey:context?.selectedStageKey,recordOcr}):context?.recordInterpretation||null;
  const receiptAllocations=receiptMaterialAllocationCalls(recordOcr,recordInterpretation);
  const attachmentRef=image?{id:`IMG-LOCAL-${Date.now().toString(36).toUpperCase()}`,name:String(attachment?.name||'imagem'),mimeType:image.mimeType,sizeBytes:Math.floor(image.dataUrl.split(',')[1].length*3/4),stored:false,storage:'local-ephemeral',reference:'local://ai-attachment',warning:'O servidor local aguarda a tela persistir o original junto ao registro.'}:null;
  // A nota já foi lida pelo VLM. Para uma etapa indicada explicitamente, a
  // alocação é determinística e auditável a partir dos itens OCR; não bloqueie
  // a pessoa com uma segunda chamada ao modelo que apenas repetiria esses dados.
  if(reasoningVision&&receiptAllocations.length)return send(res,200,{
    text:`OCR concluído: ${receiptAllocations.length} material(is) proposto(s) para ${recordInterpretation.explicitStage.name}, pendente(s) de revisão humana.`,
    toolCalls:receiptAllocations,provider:'nvidia',model:recordOcr?.model||nvidiaVisionModel,vision:true,reasoning:false,
    recordOcr,ocrAllocation:'deterministic-from-vision-ocr',visionPipeline:{ocrModel:recordOcr?.model||null,ocrImageSent:true,assistantImageSent:false,assistantModel:null},
    attachmentAccepted:Boolean(image),attachment:attachmentRef,attachmentStorage:'local-ephemeral',inference:{protocol:'belavista-operational-inference/v1',endpoint:requestPath,systemModel,systemRuntime:'open-jev',jev:jevDecision}
  });
  if(reasoningVision&&['purchase_invoice','purchase_receipt'].includes(String(recordOcr?.documentType||''))&&Array.isArray(recordOcr?.items)&&recordOcr.items.length)return send(res,200,{
    text:'A nota foi lida, mas não há uma etapa única indicada com segurança. Informe a etapa de destino antes de criar qualquer registro.',
    toolCalls:[],provider:'nvidia',model:recordOcr?.model||nvidiaVisionModel,vision:true,reasoning:false,recordOcr,
    attachmentAccepted:Boolean(image),attachment:attachmentRef,attachmentStorage:'local-ephemeral',inference:{protocol:'belavista-operational-inference/v1',endpoint:requestPath,systemModel,systemRuntime:'open-jev',jev:jevDecision}
  });
  const recordOcrHasItems=Boolean(recordOcr&&!recordOcr.error&&Array.isArray(recordOcr.items)&&recordOcr.items.some(item=>{
    const description=String(item?.description||item?.name||item?.materialName||item?.materialId||'').trim();
    const kind=String(item?.itemKind||item?.type||'').toLocaleLowerCase('pt-BR');
    return description.length>=3&&/^(material|materiais|servico|serviço|serviços|servicos|service|labor|m[aã]o de obra)$/.test(kind);
  }));
  const servicePhotoNeedsVisualFallback=String(recordOcr?.documentType||'')==='service_evidence'&&!/\b(?:a[cç][aã]o(?:\s+de\s+servi[cç]o)?|servi[cç]o|atividade|descri[cç][aã]o)\s*:/i.test(requestMessage);
  const assistantReceivesImage=Boolean(image&&(!reasoningVision||!recordOcrHasItems||servicePhotoNeedsVisualFallback));
  const modelContext=recordInterpretation?{...context,recordInterpretation}:context;
  const modelRequestContext=recordInterpretation?{...(requestContext||{}),recordInterpretation}:requestContext;
  const explicitVisualStage=recordInterpretation?.explicitStage||null;
  const indicatedStageProfile=(Array.isArray(context?.stages)?context.stages:[]).find(stage=>String(stage?.key||'')===String(explicitVisualStage?.key||''))||null;
  const visualStageProfile=indicatedStageProfile?{
    key:String(indicatedStageProfile.key||''),name:String(indicatedStageProfile.name||''),
    description:String(indicatedStageProfile.description||indicatedStageProfile.executionProfile?.typicalDescription||'').slice(0,500),
    activities:(Array.isArray(indicatedStageProfile.activities)?indicatedStageProfile.activities:[]).slice(0,12).map(activity=>({id:String(activity?.id||activity?.key||''),name:String(activity?.name||activity?.title||''),description:String(activity?.description||'').slice(0,180)})),
    activityHints:(Array.isArray(indicatedStageProfile.activityHints)?indicatedStageProfile.activityHints:[]).slice(0,8)
  }:null;
  const visualServicePrompt=servicePhotoNeedsVisualFallback?[
    'Você é um inferidor visual de evidências de obra. Analise a FOTO anexada; não trate esta tarefa como conversa geral.',
    `Mensagem enviada: ${requestMessage}. Ela contém somente o destino. O nome da etapa NÃO descreve a atividade.`,
    `Etapa-destino indicada pela pessoa: ${JSON.stringify(explicitVisualStage)}. Perfil canônico resumido: ${JSON.stringify(visualStageProfile)}.`,
    `OCR visual prévio (evidência auxiliar, não substitui olhar a imagem): ${JSON.stringify({visualDescription:recordOcr?.serviceEvidence?.visualDescription||'',observedDate:recordOcr?.serviceEvidence?.observedDate||'',observedTime:recordOcr?.serviceEvidence?.observedTime||'',items:(recordOcr?.items||[]).slice(0,6).map(item=>({itemKind:item.itemKind,description:item.description,details:item.details,pointer:item.pointer}))})}.`,
    'Identifique, pelos pixels da foto, uma ação concreta em formato verbo + objeto (por exemplo, “escavação e movimentação de solo”). NUNCA copie “Terraplanagem” ou qualquer nome da etapa como activityName. Use a etapa somente como destino e confirme que a ação visível é compatível com o perfil informado. Não invente data, horário, equipe, quantidade, conclusão nem material.',
    'Se a ação não estiver visualmente identificável com segurança ou não couber na etapa, não gere registro: retorne toolCalls vazio e faça uma pergunta curta de esclarecimento. Caso contrário, a alocação fica Pendente para revisão humana.',
    'Responda somente JSON válido, sem Markdown, no formato exato: {"reply":"síntese visual curta","toolCalls":[{"name":"stage.allocate_visual_record","arguments":{"target":"service","stageKey":"chave canônica","stageName":"nome canônico","activityName":"ação observada em verbo + objeto","details":"observação visual factual","pointer":"evidência visível específica","confidence":0.0}}]}. Não inclua nenhum outro tipo de ferramenta; use toolCalls [] quando incerto.'
  ].join('\n') : '';
  const prompt=visualServicePrompt||operationalPrompt(requestMessage,view,mapContext,modelContext,instruction,modelRequestContext);
  const userContent=[{type:'text',text:prompt}];
  if(assistantReceivesImage)userContent.push({type:'image_url',image_url:{url:image.dataUrl}});
  const assistantUsesVision=Boolean(assistantReceivesImage&&reasoningVision);
  const model=assistantUsesVision?nvidiaReasoningVisionModel:assistantReceivesImage?nvidiaVisionModel:nvidiaModel;
  const endpoint=assistantUsesVision?nvidiaReasoningApiUrl:nvidiaApiUrl;
  const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${process.env.NVIDIA_API_KEY}`},body:JSON.stringify({model,messages:[{role:'system',content:'Você é um assistente operacional objetivo. Para imagens, use raciocínio visual interno, não exponha cadeia de pensamento e siga exatamente o protocolo JSON de ferramentas entregue no pedido do usuário.'},{role:'user',content:assistantReceivesImage?userContent:prompt}],temperature:assistantUsesVision?(servicePhotoNeedsVisualFallback?.15:.6):.15,top_p:assistantUsesVision?.95:.9,max_tokens:assistantUsesVision?(servicePhotoNeedsVisualFallback?1400:4096):700,reasoning_budget:assistantUsesVision?nvidiaReasoningBudget:undefined,stream:false}),signal:AbortSignal.timeout(120000)});
  const json=await upstream.json();
  if(!upstream.ok) return send(res,502,{error:json?.detail||json?.message||json?.error?.message||'NVIDIA NIM recusou a solicitação.'});
  const result=parseToolEnvelope(json?.choices?.[0]?.message?.content||'NVIDIA NIM não retornou texto.');
  result.toolCalls=mergeToolCalls(result.toolCalls,inferredToolCalls(requestMessage));
  return send(res,200,{...result,provider:'nvidia',model,endpoint,vision:Boolean(image),reasoning:Boolean(image&&reasoningVision),recordOcr,visionPipeline:image?{ocrModel:recordOcr?.model||null,ocrImageSent:true,assistantImageSent:assistantReceivesImage,assistantModel:model}:null,attachmentAccepted:Boolean(image),attachment:attachmentRef,attachmentStorage:'local-ephemeral',inference:{protocol:'belavista-operational-inference/v1',endpoint:requestPath,systemModel,systemRuntime:'open-jev',jev:jevDecision}});
}
function minicpmOperationalPrompt(message,view,context){
  let compactContext='{}';
  try{compactContext=JSON.stringify(context||{}).slice(0,2200);}catch{}
  return `Você é o assistente operacional do empreendimento Aliança Park. Responda em português do Brasil. Não invente fatos nem confirme ações executadas. Para perguntas informativas, retorne JSON válido {"reply":"resposta","toolCalls":[]}. Contexto da tela: ${String(view||'assistant').slice(0,80)}. Estado disponível (resumido): ${compactContext}. Pedido: ${String(message||'').trim().slice(0,1200)}`;
}
async function minicpm(req,res){
  const {message,view='assistant',attachment=null,context={}}=await body(req);
  if(typeof message!=='string'||!message.trim())return send(res,400,{error:'Mensagem inválida.'});
  if(attachment?.dataUrl){
    const image=normalizeNvidiaImageAttachment(attachment);
    if(!image)return send(res,400,{error:'Imagem inválida. Use PNG, JPEG ou WEBP de até 6 MB.'});
    const input={attachment:{...attachment,...image},context:{userDescription:message,stages:context?.stages||[],selectedStageKey:context?.selectedStageKey||'',selectedStageName:context?.selectedStageName||''}};
    const recordOcr=process.env.NVIDIA_API_KEY?await extractInstantRecordOcr(process.env,input):await extractLocalRecordOcr(input);
    const interpretation=buildRecordInterpretationV1({message,stages:context?.stages,selectedStageKey:context?.selectedStageKey,recordOcr});
    const toolCalls=receiptMaterialAllocationCalls(recordOcr,interpretation);
    const reply=toolCalls.length?`OCR concluído: ${toolCalls.length} material(is) proposto(s) para ${interpretation.explicitStage.name}, pendente(s) de revisão humana.`:'OCR concluído. Revise os dados da nota e indique a etapa de destino antes de alocar o material.';
    return send(res,200,{reply,text:reply,toolCalls,provider:recordOcr.provider,model:recordOcr.model,vision:true,reasoning:false,recordOcr,attachmentAccepted:true,ocrAllocation:toolCalls.length?'deterministic-from-image-ocr':'awaiting-explicit-stage'});
  }
  const upstream=await fetch(minicpmApiUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({model:minicpmModel,messages:[{role:'system',content:'Responda apenas com JSON válido contendo reply e toolCalls. Não exponha raciocínio interno.'},{role:'user',content:minicpmOperationalPrompt(message,view,context)}],temperature:.15,max_tokens:500,stream:false}),signal:AbortSignal.timeout(120000)});
  const json=await upstream.json();
  if(!upstream.ok)return send(res,502,{error:json?.detail||json?.message||json?.error?.message||'MiniCPM local recusou a solicitação.'});
  const result=parseToolEnvelope(json?.choices?.[0]?.message?.content||'MiniCPM não retornou texto.');
  result.toolCalls=mergeToolCalls(result.toolCalls,inferredToolCalls(message));
  return send(res,200,{...result,provider:'minicpm',model:minicpmModel,vision:false});
}
async function ai(req,res){
  if(aiProvider==='minicpm') return minicpm(req,res);
  if(aiProvider==='nvidia') return nvidia(req,res);
  if(aiProvider==='gemini') return gemini(req,res);
  return send(res,500,{error:`AI_PROVIDER inválido: ${aiProvider}. Use minicpm, nvidia ou gemini.`});
}
function aiStatus(){
  const configured=aiProvider==='minicpm'?Boolean(minicpmApiUrl):aiProvider==='nvidia'?Boolean(process.env.NVIDIA_API_KEY):aiProvider==='gemini'?Boolean(process.env.GEMINI_API_KEY):false;
  return {provider:aiProvider,model:aiProvider==='minicpm'?minicpmModel:aiProvider==='nvidia'?nvidiaModel:geminiModel,endpoint:aiProvider==='minicpm'?minicpmApiUrl:undefined,visionModel:nvidiaVisionModel,reasoningVisionModel:nvidiaReasoningVisionModel,reasoningVisionEndpoint:nvidiaReasoningApiUrl,reasoningBudget:nvidiaReasoningBudget,configured,supportsImages:aiProvider==='nvidia'||aiProvider==='gemini',supportsImageReasoning:aiProvider==='nvidia',attachmentStorage:'local-ephemeral',toolProtocol:'belavista-client-tools/v1',toolCount:clientTools.length};
}
function inferenceStatus(){
  return {
    ...aiStatus(),
    protocol:'belavista-operational-inference/v1',
    endpoint:'/api/inference',
    systemModel:{id:process.env.RUBY_SYSTEM_MODEL||'kev-0.6b',runtime:'open-jev',role:'local-intent-router'},
    serverRole:'response-and-tool-inference'
  };
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
  if(pathname==='/desktop/setup'||pathname==='/desktop/setup/')return 'desktop-setup.html';
  if(pathname==='/admin/workers'||pathname==='/admin/workers/'||pathname==='/admin/workers/stage'||pathname==='/admin/workers/stage/'||pathname==='/admin/workers/activity'||pathname==='/admin/workers/activity/'||pathname==='/admin/workers/activity/record'||pathname==='/admin/workers/activity/record/')return 'admin-workers.html';
  return pathname==='/'?'index.html':pathname;
}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto',...headers});res.end(JSON.stringify(data));}
const proxiedApiPrefixes=['/api/records','/api/field-confirmations','/api/purchase-receipts','/api/budget-lines','/api/agenda-items','/api/notifications','/api/stages','/api/stage-correlations','/api/communications','/api/lot-documents'];
function shouldProxyApi(pathname){
  // A instalação local sem BELAVISTA_API_TOKEN precisa gravar os registros na
  // base SQLite local. Sem esta exceção, o HTML de campo era encaminhado ao
  // Worker sem o token de serviço e recebia 401 antes de chegar ao parser de
  // mapArea/partIds. Em produção, quando o token existe, o proxy continua
  // ativo para manter o Worker como origem operacional.
  const recordsPath=pathname==='/api/records'||pathname.startsWith('/api/records/');
  if(recordsPath&&!process.env.BELAVISTA_API_TOKEN)return false;
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
async function materialTransitionsApi(req,res){
  const actor=await requireRoles(req,recordRoles);
  if(req.method==='GET'){
    const query=new URL(req.url,'http://localhost').searchParams,materialId=query.get('materialId')||'',stageKey=query.get('stage')||'';
    if(!materialId)return send(res,400,{error:'Informe o material.'});
    const transitions=listRecords().filter(record=>(record.properties||[]).some(property=>property.id==='material_id'&&property.value===materialId));
    return send(res,200,{transitions,attachments:stageKey?listWorkbenchAttachments(stageKey,materialId):[]});
  }
  if(req.method!=='POST')return send(res,405,{error:'Método não permitido.'});
  const input=await body(req,30_000_000),created=[];
  if(!String(input.materialId||'').trim()||!String(input.stageKey||'').trim())return send(res,400,{error:'Material e etapa são obrigatórios.'});
  if(!Array.isArray(input.documents)||input.documents.length>3)return send(res,400,{error:'Anexe no máximo três comprovantes.'});
  try{
    for(const item of input.documents){
      const attachment=createWorkbenchAttachment({stageKey:input.stageKey,activityId:String(input.materialId),kind:'material-proof',title:String(item.documentNumber||item.fileName||'Comprovante'),notes:String(item.description||'').slice(0,1000),fileName:item.fileName,dataUrl:item.dataUrl,createdBy:actor.name||actor.uid});
      created.push(attachment);
    }
    const transition=createMaterialTransition({...input,responsible:actor.name||actor.uid,documents:created});
    bridgeAgentEvent({type:'material.transition.created',entity:'records',entityId:transition.record.id,actor,payload:{record:transition.record,material:transition.material,documents:created}});
    let agenda=[],plannerStatus='generated',plannerError='';
    try{const result=runOperationalLoop({reason:'material.transition.created',role:actor.role||'owner',publishNotifications:true,syncActivities:true});agenda=result.agenda||[];}
    catch(error){plannerStatus='pending';plannerError=error.message;console.warn('[material transition planner]',error);}
    return send(res,201,{...transition,agenda,plannerStatus,plannerError});
  }catch(error){for(const attachment of created){try{deleteWorkbenchAttachment(attachment.id);}catch{}}throw error;}
}

function refreshPlanningAfter(reason,role){
  try{return {plannerStatus:'generated',agenda:runOperationalLoop({reason,role:role||'owner',publishNotifications:true,syncActivities:true}).agenda||[]};}
  catch(error){console.warn(`[${reason} planner]`,error);return {plannerStatus:'pending',plannerError:error.message};}
}
async function agendaEventsApi(req,res){
  if(req.method==='GET'){
    await requireRoles(req,recordRoles);
    return send(res,200,{events:listAgendaEvents()});
  }
  if(req.method==='PUT'){
    const actor=await requireRoles(req,['owner','admin','foreman']);
    const events=saveAgendaSnapshot((await body(req)).events);
    bridgeAgentEvent({type:'agenda.updated',entity:'agenda_events',entityId:'snapshot',actor,payload:{count:events.length}});
    return send(res,200,{events});
  }
  return send(res,405,{error:'Método não permitido.'});
}
async function activitiesApi(req,res,pathname){
  const actor=await requireRoles(req,['owner','admin']);
  if(pathname==='/api/activities'&&req.method==='POST'){
    const activity=createActivityAdmin(await body(req));
    bridgeAgentEvent({type:'activity.created',entity:'activities',entityId:activity.id,actor,payload:activity});
    return send(res,201,{activity});
  }
  const match=pathname.match(/^\/api\/activities\/([^/]+)$/);
  if(!match)return send(res,404,{error:'Atividade não encontrada.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){
    const activity=updateActivityAdmin(id,await body(req));
    if(!activity)return send(res,404,{error:'Atividade não encontrada.'});
    bridgeAgentEvent({type:'activity.updated',entity:'activities',entityId:id,actor,payload:activity});
    return send(res,200,{activity});
  }
  if(req.method==='DELETE'){
    if(!deleteActivityAdmin(id))return send(res,404,{error:'Atividade não encontrada.'});
    bridgeAgentEvent({type:'activity.deleted',entity:'activities',entityId:id,actor,payload:{id}});
    return send(res,200,{ok:true,id});
  }
  return send(res,405,{error:'Método não permitido.'});
}
async function recordsApi(req,res,pathname){
  if(req.method==='POST'&&pathname==='/api/records/ocr'){
    await requireRoles(req,recordRoles);
    const payload=await body(req);
    const image=normalizeNvidiaImageAttachment(payload.attachment);
    if(!image)return send(res,400,{error:'Imagem OCR inválida. Use PNG, JPEG ou WEBP de até 6 MB.'});
    const input={attachment:{name:String(payload.attachment?.name||'imagem'),...image},context:payload.context||null};
    const result=process.env.NVIDIA_API_KEY?await extractInstantRecordOcr(process.env,input):await extractLocalRecordOcr(input);
    return send(res,200,result);
  }
  if(req.method==='GET'&&pathname==='/api/records'){await requireRoles(req,recordRoles);return send(res,200,{records:listRecords(),entities:entitySummary()});}
  if(req.method==='POST'&&pathname==='/api/records'){const actor=await requireRoles(req,recordRoles),record=createRecord(await body(req));bridgeAgentEvent({type:'record.created',entity:'records',entityId:record.id,actor,payload:record});return send(res,201,{...record,...refreshPlanningAfter('record.created',actor.role)});}
  const match=pathname.match(/^\/api\/records\/([^/]+)$/); if(!match)return send(res,404,{error:'Registro não encontrado.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){
    const actor=await requireRoles(req,recordRoles),record=updateRecord(id,await body(req));if(record){bridgeAgentEvent({type:'record.updated',entity:'records',entityId:id,actor,payload:record});}return record?send(res,200,{...record,...refreshPlanningAfter('record.updated',actor.role)}):send(res,404,{error:'Registro não encontrado.'});
  }
  if(req.method==='DELETE'){const actor=await requireRoles(req,['owner','admin']);if(!deleteRecord(id))return send(res,404,{error:'Registro não encontrado.'});bridgeAgentEvent({type:'record.deleted',entity:'records',entityId:id,actor,payload:{id}});return send(res,200,{ok:true,id,...refreshPlanningAfter('record.deleted',actor.role)});}
  return send(res,405,{error:'Método não permitido.'});
}
async function stagesAdminApi(req,res,pathname){
  if(pathname==='/api/stages-admin'){
    if(req.method==='GET'){await requireRoles(req,recordRoles);return send(res,200,{stages:listStagesAdmin()});}
    if(req.method==='POST'){
      const actor=await requireRoles(req,['owner','admin']),stage=createStageAdmin(await body(req));
      bridgeAgentEvent({type:'stage.created',entity:'stages',entityId:String(stage.id),actor,payload:{stageId:stage.id,name:stage.name}});
      recalculateOperationalState('stage.created');
      return send(res,201,{stage});
    }
    return send(res,405,{error:'Método não permitido.'});
  }
  const match=pathname.match(/^\/api\/stages-admin\/(\d+)(?:\/(ai|report|activities))?$/);
  if(!match)return send(res,404,{error:'Etapa não encontrada.'});
  const stageId=Number(match[1]),resource=match[2]||'';
  if(resource==='activities'){
    if(req.method!=='PUT')return send(res,405,{error:'Método não permitido.'});
    const actor=await requireRoles(req,['owner','admin']),stage=saveStageActivitiesAdmin(stageId,(await body(req)).activities);
    if(!stage)return send(res,404,{error:'Etapa não encontrada.'});
    bridgeAgentEvent({type:'stage.activities.saved',entity:'activities',entityId:String(stageId),actor,payload:{stageId,count:stage.activities.length}});
    recalculateOperationalState('stage.activities.saved');
    return send(res,200,{stage});
  }
  if(resource==='report'){
    if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});
    await requireRoles(req,recordRoles);const report=getStageReport(stageId);
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
    await requireRoles(req,recordRoles);const stage=getStageAdmin(stageId);
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
  if(pathname==='/api/workbench/diary'&&resource==='material-transition')return materialTransitionsApi(req,res);
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
    if(req.method==='GET'){await requireRoles(req,recordRoles);return send(res,200,{state:getStageWorkbenchState(stageKey)});}
    if(req.method==='PUT'){await requireRoles(req,['owner','admin','foreman']);return send(res,200,{state:saveStageWorkbenchState(stageKey,await body(req))});}
  }
  if(pathname==='/api/workbench/diary'){
    if(req.method==='GET'){await requireRoles(req,recordRoles);return send(res,200,{entries:listWorkbenchDiary(stageKey,inputUrl.searchParams.get('activity')||'')});}
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
  const fileMatch=pathname.match(/^\/api\/cash-flow\/([^/]+)(?:\/attachments\/([^/]+))?\/file$/);
  if(fileMatch&&req.method==='GET'){
    await requireRoles(req,['owner','admin','developer']);
    const file=getCashFlowAttachment(decodeURIComponent(fileMatch[1]),fileMatch[2]?decodeURIComponent(fileMatch[2]):'');
    if(!file)return send(res,404,{error:'Anexo do registro de caixa não encontrado.'});
    const data=await readFile(file.storagePath);
    res.writeHead(200,{'Content-Type':file.mimeType||'application/octet-stream','Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName||'anexo-caixa')}`,'Cache-Control':'private, max-age=300'});res.end(data);return;
  }
  const attachmentMatch=pathname.match(/^\/api\/cash-flow\/([^/]+)\/attachments$/);
  if(attachmentMatch&&req.method==='POST'){
    const actor=await requireRoles(req,['owner','admin']);
    const entry=addCashFlowAttachment(decodeURIComponent(attachmentMatch[1]),await body(req,20_000_000));
    bridgeAgentEvent({type:'cash.evidence.attached',entity:'cash_flow_attachments',entityId:entry.id,actor,payload:{cashFlowId:entry.id,attachments:entry.attachments.length}});
    return send(res,201,{entry});
  }
  if(req.method==='POST'&&pathname==='/api/cash-flow'){const actor=await requireRoles(req,['owner']),entry=createCashFlowEntry(await body(req));bridgeAgentEvent({type:'cash.changed',entity:'cash_flow_entries',entityId:entry.id,actor,payload:entry});return send(res,201,{entry,summary:cashFlowSummary(),operational:recalculateOperationalState('cash.changed')});}
  return send(res,405,{error:'Método não permitido.'});
}
async function materialsApi(req,res,pathname){
  const roles=['owner','admin','foreman'];
  if(req.method==='GET'&&pathname==='/api/materials'){
    await requireRoles(req,roles);
    return send(res,200,{materials:listMaterials()});
  }
  if(req.method==='POST'&&pathname==='/api/materials'){
    const actor=await requireRoles(req,roles),material=createMaterial(await body(req));
    bridgeAgentEvent({type:'material.created',entity:'materials',entityId:material.id,actor,payload:material});
    return send(res,201,{material,materials:listMaterials(),...refreshPlanningAfter('material.created',actor.role)});
  }
  const match=pathname.match(/^\/api\/materials\/([^/]+)$/);
  if(!match)return send(res,404,{error:'Material não encontrado.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='PUT'){
    const actor=await requireRoles(req,roles),material=updateMaterial(id,await body(req));
    if(!material)return send(res,404,{error:'Material não encontrado.'});
    bridgeAgentEvent({type:'material.updated',entity:'materials',entityId:material.id,actor,payload:material});
    return send(res,200,{material,materials:listMaterials(),...refreshPlanningAfter('material.updated',actor.role)});
  }
  if(req.method==='DELETE'){
    const actor=await requireRoles(req,['owner','admin']);
    if(!deleteMaterial(id))return send(res,404,{error:'Material não encontrado.'});
    bridgeAgentEvent({type:'material.deleted',entity:'materials',entityId:id,actor,payload:{id}});
    return send(res,200,{ok:true,materials:listMaterials(),...refreshPlanningAfter('material.deleted',actor.role)});
  }
  return send(res,405,{error:'Método não permitido.'});
}
async function leadMessagesApi(req,res,pathname){
  const match=pathname.match(/^\/api\/leads\/([^/]+)\/messages$/);if(!match)return send(res,404,{error:'Conversa não encontrada.'});
  const leadId=decodeURIComponent(match[1]);
  if(req.method==='GET')return send(res,200,{messages:listLeadMessages(leadId)});
  if(req.method==='POST'){const message=createLeadMessage({...await body(req),leadId});return message?send(res,201,{message,messages:listLeadMessages(leadId)}):send(res,404,{error:'Lead não encontrado ou mensagem vazia.'});}
  return send(res,405,{error:'Método não permitido.'});
}
function isLoopbackRequest(req){
  const address=String(req.socket?.remoteAddress||'').replace(/^::ffff:/,'');
  return address==='127.0.0.1'||address==='::1';
}
async function desktopActor(req,roles=['owner','admin']){
  return isLoopbackRequest(req)?{uid:'desktop-local',name:'Estação local',role:'owner',mode:'desktop'}:await requireRoles(req,roles);
}
function bridgeAuthorized(req){
  if(isLoopbackRequest(req))return true;
  const expected=String(process.env.INSTAGRAM_BRIDGE_TOKEN||'').trim();
  return Boolean(expected&&String(req.headers.authorization||'')===`Bearer ${expected}`);
}
async function createInstagramDraft(report,instructions=''){
  const fallback=fallbackInstagramDraft(report);
  const lastInbound=[...(report?.messages||[])].reverse().find(item=>item.direction==='inbound');
  try{
    const aiReply=await runOperationalAssistant({...process.env,NVIDIA_TIMEOUT_MS:'3500',NVIDIA_MAX_TOKENS:'220'},{
      view:'instagram-direct',
      context:{lead:report?.lead||{},lastInbound:lastInbound?.body||'',conversationSummary:report?.summary||{}},
      message:`Produza um rascunho breve em português para responder a um lead do Instagram. Seja acolhedor, peça só a informação necessária para indicar lotes e condições. Não prometa preço, reserva, documento, pagamento ou aprovação. ${String(instructions||'').slice(0,500)}`
    });
    const body=String(aiReply?.text||'').trim().replace(/^["']|["']$/g,'').slice(0,900);
    if(body&&body.length>12)return {body,provider:aiReply.provider||'ai',requiresApproval:true,delivery:'draft-only'};
  }catch(error){console.warn('[instagram draft]',error.message);}
  return {body:fallback,provider:'deterministic',requiresApproval:true,delivery:'draft-only'};
}
async function serviceRequestsApi(req,res,pathname){
  const serviceRoles=['owner','admin','foreman','sales','commercial'];
  const allowedFor=(actor,item)=>item&&(['owner','admin','developer'].includes(actor.role)||item.requestedByUid===actor.uid);
  if(pathname==='/api/service-requests'){
    if(req.method==='GET'){const actor=await requireRoles(req,serviceRoles);return send(res,200,{requests:listServiceRequests(actor)});}
    if(req.method==='POST'){const actor=await requireRoles(req,serviceRoles),item=createServiceRequest(await body(req,60_000_000),actor);bridgeAgentEvent({type:'service.requested',entity:'service_requests',entityId:item.id,actor,payload:{id:item.id,title:item.title,domain:item.domain,stageKey:item.stageKey,activityId:item.activityId,fileCount:item.files.length}});return send(res,201,{request:item});}
    return send(res,405,{error:'Método não permitido.'});
  }
  const file=pathname.match(/^\/api\/service-requests\/([^/]+)\/files\/([^/]+)$/);
  if(file&&req.method==='GET'){const actor=await requireRoles(req,serviceRoles),id=decodeURIComponent(file[1]);if(!allowedFor(actor,getServiceRequest(id)))return send(res,404,{error:'Arquivo não encontrado.'});const stored=getServiceRequestFile(id,decodeURIComponent(file[2]));if(!stored)return send(res,404,{error:'Arquivo não encontrado.'});const data=await readFile(stored.storagePath);res.writeHead(200,{'Content-Type':stored.mimeType,'Content-Length':data.length,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(stored.fileName)}`,'Cache-Control':'private, no-store'});res.end(data);return;}
  const match=pathname.match(/^\/api\/service-requests\/([^/]+)(?:\/(files))?$/);if(!match)return send(res,404,{error:'Solicitação não encontrada.'});
  const id=decodeURIComponent(match[1]);
  if(req.method==='GET'){const actor=await requireRoles(req,serviceRoles),item=getServiceRequest(id);return allowedFor(actor,item)?send(res,200,{request:item}):send(res,404,{error:'Solicitação não encontrada.'});}
  if(req.method==='POST'&&match[2]==='files'){const actor=await requireRoles(req,serviceRoles);if(!allowedFor(actor,getServiceRequest(id)))return send(res,404,{error:'Solicitação não encontrada.'});const item=addServiceRequestFiles(id,(await body(req,60_000_000)).files);bridgeAgentEvent({type:'service.files.attached',entity:'service_requests',entityId:id,actor,payload:{id,fileCount:item.files.length}});return send(res,200,{request:item});}
  if(req.method==='PATCH'&&!match[2]){const actor=await requireRoles(req,['owner','admin']),item=updateServiceRequest(id,await body(req));if(item)bridgeAgentEvent({type:'service.status.changed',entity:'service_requests',entityId:id,actor,payload:{id,status:item.status}});return item?send(res,200,{request:item}):send(res,404,{error:'Solicitação não encontrada.'});}
  return send(res,405,{error:'Método não permitido.'});
}
const localInstagramFeed=()=>({source:'local-demo',configured:false,accountId:'demo',updatedAt:new Date().toISOString(),notice:'Feed demonstrativo local. Configure o token do Instagram no Worker para consultar publicações reais.',permissions:['instagram_business_basic','instagram_business_manage_comments'],posts:[
  {id:'demo-post-01',mediaType:'IMAGE',mediaUrl:'/assets/public/alianca-park-satellite-generated-v5406.png',thumbnailUrl:'/assets/public/alianca-park-satellite-generated-v5406.png',caption:'Um novo jeito de viver bem. Conheça o Aliança Park em Amargosa, Bahia.',permalink:'#',timestamp:'2026-09-14T12:00:00.000Z',likeCount:42,commentsCount:2,comments:[
    {id:'demo-comment-01',mediaId:'demo-post-01',text:'Onde fica o empreendimento?',username:'@mariana.souza',timestamp:'2026-09-14T13:12:00.000Z',likeCount:3,replies:[]},
    {id:'demo-comment-02',mediaId:'demo-post-01',text:'Tem lotes disponíveis para investimento?',username:'@rafael.alves',timestamp:'2026-09-14T13:40:00.000Z',likeCount:1,replies:[]}
  ]},
  {id:'demo-post-02',mediaType:'IMAGE',mediaUrl:'/assets/public/dwg-satellite-photoreal-v5420.png',thumbnailUrl:'/assets/public/dwg-satellite-photoreal-v5420.png',caption:'Espaço, natureza e novas possibilidades para os próximos capítulos.',permalink:'#',timestamp:'2026-09-11T15:30:00.000Z',likeCount:68,commentsCount:1,comments:[
    {id:'demo-comment-03',mediaId:'demo-post-02',text:'Gostaria de conhecer a implantação e as condições.',username:'@camila.oliveira',timestamp:'2026-09-11T16:02:00.000Z',likeCount:2,replies:[]}
  ]},
  {id:'demo-post-03',mediaType:'IMAGE',mediaUrl:'/assets/public/alianca-park-terrain-expanded-v5390.png',thumbnailUrl:'/assets/public/alianca-park-terrain-expanded-v5390.png',caption:'Seu lugar começa aqui. Fale com a equipe e agende uma visita.',permalink:'#',timestamp:'2026-09-08T10:10:00.000Z',likeCount:31,commentsCount:1,comments:[
    {id:'demo-comment-04',mediaId:'demo-post-03',text:'É possível reservar um lote?',username:'@joaopedro.bahia',timestamp:'2026-09-08T11:26:00.000Z',likeCount:0,replies:[]}
  ]}
]});
async function instagramFeedApi(req,res,pathname){
  await desktopActor(req);
  if(pathname==='/api/instagram/feed'&&req.method==='GET'){
    if(instagramAccessToken&&(process.env.INSTAGRAM_ACCOUNT_ID||process.env.INSTAGRAM_USER_ID)){
      try{const query=new URL(req.url,'http://localhost').searchParams;return send(res,200,await listInstagramFeed(process.env,{limit:query.get('limit'),commentsLimit:query.get('commentsLimit')}));}
      catch(error){return send(res,502,{source:'unavailable',configured:true,accountId:'configured',updatedAt:new Date().toISOString(),error:error.message||'Não foi possível consultar o feed real.',metaCode:error.metaCode||null,metaSubcode:error.metaSubcode||null,permissions:['instagram_business_basic','instagram_business_manage_comments'],posts:[]});}
    }
    return send(res,200,localInstagramFeed());
  }
  if(pathname==='/api/instagram/automation-policy'){
    if(req.method==='GET')return send(res,200,localInstagramAutomationPolicy);
    if(req.method==='PUT'){const input=await body(req);localInstagramAutomationPolicy={...defaultInstagramAutomationPolicy,preset:String(input.preset||defaultInstagramAutomationPolicy.preset).slice(0,40),tone:String(input.tone||defaultInstagramAutomationPolicy.tone).slice(0,120),instructions:String(input.instructions||defaultInstagramAutomationPolicy.instructions).slice(0,1200),autoDraft:input.autoDraft!==false,requireApproval:true,updatedAt:new Date().toISOString(),source:'local'};return send(res,200,localInstagramAutomationPolicy);}
    return send(res,405,{error:'Método não permitido.'});
  }
  const replyMatch=pathname.match(/^\/api\/instagram\/comments\/([^/]+)\/reply$/);
  if(replyMatch&&req.method==='POST')return send(res,409,{error:'Instagram Graph API não configurado nesta estação. A resposta foi mantida como rascunho; configure o Worker para enviar.'});
  return send(res,404,{error:'Rota de feed do Instagram não encontrada.'});
}
async function instagramDesktopApi(req,res,pathname){
  if(pathname==='/api/instagram/feed'||pathname==='/api/instagram/automation-policy'||pathname.match(/^\/api\/instagram\/comments\/[^/]+\/reply$/))return instagramFeedApi(req,res,pathname);
  if(pathname==='/api/desktop/setup'){
    if(req.method==='GET')return send(res,200,{setup:getDesktopSetup()});
    if(req.method==='POST'){await desktopActor(req);return send(res,200,{setup:saveDesktopSetup(await body(req))});}
    return send(res,405,{error:'Método não permitido.'});
  }
  if(pathname==='/api/instagram/bridge/status'&&req.method==='GET'){
    await desktopActor(req);return send(res,200,{bridge:await getCamofoxBridgeStatus()});
  }
  if(pathname==='/api/instagram/bridge/open-inbox'&&req.method==='POST'){
    await desktopActor(req);const setup=getDesktopSetup();if(!setup.complete)return send(res,409,{error:'Conclua a configuração da estação antes de abrir o Direct.'});
    const result=await openInstagramInbox(setup);return send(res,200,{...result,message:'Sessão local aberta. Faça login manualmente no Instagram; a senha não é armazenada pelo Aliança Park.'});
  }
  if(pathname==='/api/instagram/directs/inbound'&&req.method==='POST'){
    if(!bridgeAuthorized(req))return send(res,401,{error:'Ponte do Instagram não autorizada.'});
    const ingestion=ingestInstagramDirect(await body(req));
    const report=getInstagramLeadReport(ingestion.lead.id);
    if(!ingestion.deduplicated){
      bridgeAgentEvent({type:'lead.instagram.received',entity:'leads',entityId:ingestion.lead.id,actor:{name:'Ponte Instagram',role:'integration'},payload:{leadId:ingestion.lead.id,messageId:ingestion.message.id,channel:'instagram-direct'}});
      recalculateOperationalState({trigger:'instagram-direct'});
    }
    return send(res,ingestion.deduplicated?200:201,{ingestion,draft:await createInstagramDraft(report),report});
  }
  if(pathname==='/api/instagram/leads'&&req.method==='GET'){
    await desktopActor(req);return send(res,200,{reports:listInstagramLeadReports()});
  }
  const reportMatch=pathname.match(/^\/api\/instagram\/leads\/([^/]+)\/report$/);
  if(reportMatch&&req.method==='GET'){
    await desktopActor(req);const report=getInstagramLeadReport(decodeURIComponent(reportMatch[1]));return report?send(res,200,{report}):send(res,404,{error:'Lead do Instagram não encontrado.'});
  }
  const draftMatch=pathname.match(/^\/api\/instagram\/leads\/([^/]+)\/draft$/);
  if(draftMatch&&req.method==='POST'){
    await desktopActor(req);const report=getInstagramLeadReport(decodeURIComponent(draftMatch[1]));return report?send(res,200,{draft:await createInstagramDraft(report,(await body(req)).instructions),report}):send(res,404,{error:'Lead do Instagram não encontrado.'});
  }
  const approvalMatch=pathname.match(/^\/api\/instagram\/leads\/([^/]+)\/approve-reply$/);
  if(approvalMatch&&req.method==='POST'){
    const actor=await desktopActor(req);const leadId=decodeURIComponent(approvalMatch[1]),input=await body(req),report=getInstagramLeadReport(leadId);
    if(!report)return send(res,404,{error:'Lead do Instagram não encontrado.'});
    const draft=input.body?{body:String(input.body).trim().slice(0,900)}:await createInstagramDraft(report,input.instructions);
    if(!draft.body)return send(res,422,{error:'O rascunho de resposta está vazio.'});
    const message=createLeadMessage({leadId,direction:'outbound',channel:'instagram-direct-outbox',body:draft.body,author:actor.name});
    bridgeAgentEvent({type:'lead.instagram.reply.approved',entity:'leads',entityId:leadId,actor,payload:{leadId,messageId:message?.id,delivery:'awaiting-operator-send'}});
    return send(res,201,{message,delivery:'awaiting-operator-send',notice:'Rascunho aprovado e auditado. O envio no Instagram deve ser confirmado manualmente pelo operador.'});
  }
  return send(res,404,{error:'Rota de integração do Instagram não encontrada.'});
}

async function communicationsApi(req,res,pathname){
  await desktopActor(req);
  const reports=listInstagramLeadReports();
  if(pathname==='/api/communications/status'&&req.method==='GET')return send(res,200,{social:{instagram:{configured:Boolean(instagramAccessToken&&process.env.INSTAGRAM_APP_SECRET&&(process.env.INSTAGRAM_ACCOUNT_ID||process.env.INSTAGRAM_USER_ID)),verifyTokenConfigured:Boolean(process.env.INSTAGRAM_VERIFY_TOKEN)}}});
  if(pathname==='/api/communications/conversations'&&req.method==='GET')return send(res,200,{conversations:reports.map(report=>({id:`instagram:${report.lead?.id}`,channel:'instagram',externalThreadId:report.lead?.instagramUserId||report.lead?.username||report.lead?.id,leadId:report.lead?.id,contactName:report.lead?.name||report.lead?.username||'Lead Instagram',status:report.lead?.status||'open',createdAt:report.lead?.createdAt,updatedAt:report.messages?.at(-1)?.createdAt||report.lead?.createdAt}))});
  const match=pathname.match(/^\/api\/communications\/conversations\/([^/]+)\/messages$/);
  if(match){
    const conversationId=decodeURIComponent(match[1]),leadId=conversationId.replace(/^instagram:/,'');
    const report=getInstagramLeadReport(leadId);if(!report)return send(res,404,{error:'Conversa do Instagram não encontrada.'});
    if(req.method==='GET')return send(res,200,{messages:(report.messages||[]).map(item=>({id:item.id,channel:'instagram',direction:item.direction,body:item.body,createdAt:item.createdAt}))});
    if(req.method==='POST'){const input=await body(req),message=createLeadMessage({leadId,direction:'outbound',channel:'instagram-direct-outbox',body:String(input.text||input.message||'').trim(),author:'Operador'});return message?send(res,201,{sent:false,queued:true,delivery:'awaiting-worker-or-manual-send',message}):send(res,422,{error:'Mensagem vazia ou lead não encontrado.'});}
    return send(res,405,{error:'Método não permitido.'});
  }
  return send(res,404,{error:'Comunicação não encontrada.'});
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
  const base=join(process.env.BELAVISTA_DATA_ROOT||join(root,'data'),'output','broker-reports');
  const files=[];
  const walk=async(dir,prefix='')=>{for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){const rel=prefix?`${prefix}/${entry.name}`:entry.name;if(entry.isDirectory())await walk(join(dir,entry.name),rel);else if(/\.(xlsx|pdf)$/i.test(entry.name))files.push({name:entry.name,month:prefix.split('/')[0]||'',url:`/output/broker-reports/${rel.replace(/\\/g,'/')}`});}};
  await walk(base);
  return send(res,200,{files:files.sort((a,b)=>b.month.localeCompare(a.month)||a.name.localeCompare(b.name))});
}

createServer(async (req,res)=>{
  if(new URL(req.url,'http://localhost').pathname.startsWith('/api/activities')){
    try{const pathname=new URL(req.url,'http://localhost').pathname;await authorizeApiSurface(req,pathname);return await activitiesApi(req,res,pathname);}
    catch(error){return send(res,error?.statusCode||500,{error:error?.message||'Falha nas atividades.'});}
  }
  if(new URL(req.url,'http://localhost').pathname==='/api/agenda-events'){
    try{await authorizeApiSurface(req,'/api/agenda-events');return await agendaEventsApi(req,res);}
    catch(error){return send(res,error?.statusCode||500,{error:error?.message||'Falha na agenda.'});}
  }
  if(new URL(req.url,'http://localhost').pathname.startsWith('/api/service-requests')){
    try{await authorizeApiSurface(req,new URL(req.url,'http://localhost').pathname);return await serviceRequestsApi(req,res,new URL(req.url,'http://localhost').pathname);}
    catch(error){return send(res,error?.statusCode||500,{error:error?.message||'Falha na solicitação de serviço.'});}
  }
  try { const pathname=new URL(req.url,'http://localhost').pathname; await authorizeApiSurface(req,pathname); if(shouldProxyApi(pathname))return await proxyApi(req,res,pathname); if(publicCatalogApi(req,res,pathname))return; if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{...health(),ai:aiStatus(),inference:inferenceStatus(),auth:authStatus(),origin:requestOrigin(req),forwarded:Boolean(req.headers['x-forwarded-host']),belavistaApiBase}); if(pathname==='/api/runtime'&&req.method==='GET')return send(res,200,{origin:requestOrigin(req),host,port,forwardedHost:req.headers['x-forwarded-host']||null,forwardedProto:req.headers['x-forwarded-proto']||null,firebaseMessagingVapidKey:process.env.FIREBASE_MESSAGING_VAPID_KEY||'',belavistaApiBase}); if(pathname==='/api/ai/status'&&req.method==='GET')return send(res,200,aiStatus()); if(pathname==='/api/inference/status'&&req.method==='GET')return send(res,200,inferenceStatus()); if(pathname==='/api/ai/tools'&&req.method==='GET')return send(res,200,{protocol:'belavista-client-tools/v1',tools:clientTools}); if(pathname==='/api/agent/tree'||pathname==='/api/agent/evaluate')return await agentTreeApi(req,res,pathname); if(pathname==='/api/operational-loop'||pathname==='/api/operational-state'||pathname==='/api/calibrations'||pathname==='/api/automation/panorama'||pathname==='/api/automation/run'||pathname==='/api/devices'||pathname==='/api/notifications'||pathname.startsWith('/api/notifications/'))return await operationalApi(req,res,pathname); if(pathname==='/api/stages-admin'||pathname.startsWith('/api/stages-admin/'))return await stagesAdminApi(req,res,pathname); if(pathname==='/api/workbench/infer'&&req.method==='POST')return await workbenchInferenceApi(req,res); if(pathname.startsWith('/api/communications'))return await communicationsApi(req,res,pathname); if(pathname==='/api/workbench/state'||pathname==='/api/workbench/diary')return await workbenchApi(req,res,pathname); if(pathname==='/api/desktop/setup'||pathname.startsWith('/api/instagram/'))return await instagramDesktopApi(req,res,pathname); if(pathname.startsWith('/api/leads/'))return await leadMessagesApi(req,res,pathname); if(pathname==='/api/entities'&&req.method==='GET')return send(res,200,{entities:entitySummary()}); if(pathname==='/api/broker-reports')return await brokerReportsApi(req,res); if(pathname==='/api/field-confirmations')return await fieldConfirmationsApi(req,res); if(pathname==='/api/records'||pathname.startsWith('/api/records/'))return await recordsApi(req,res,pathname); if(pathname==='/api/materials'||pathname.startsWith('/api/materials/'))return await materialsApi(req,res,pathname); if(pathname==='/api/cash-flow'||pathname.startsWith('/api/cash-flow/'))return await cashFlowApi(req,res,pathname); if(pathname==='/api/commission-reasons'||pathname.startsWith('/api/commission-reasons/'))return await commissionReasonsApi(req,res,pathname); if(pathname==='/api/outsourcing-receipts'||pathname.startsWith('/api/outsourcing-receipts/'))return await outsourcingReceiptsApi(req,res,pathname); if(pathname==='/api/purchase-receipts'||pathname.startsWith('/api/purchase-receipts/'))return await purchaseReceiptsApi(req,res,pathname); if(pathname==='/api/commercial-sales'||pathname.startsWith('/api/commercial-sales/'))return await commercialSalesApi(req,res,pathname); if(req.method==='POST'&&(pathname==='/api/gemini'||pathname==='/api/ai'||pathname==='/api/ai/vision-reasoning'||pathname==='/api/inference')) return await ai(req,res); if(req.method!=='GET') return send(res,405,{error:'Método não permitido.'}); const requested=normalize(pageForPath(pathname)).replace(/^[/\\]+/,''); const file=join(root,requested); if(!file.startsWith(root)) return send(res,403,{error:'Acesso negado.'}); const data=await readFile(file); res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':data.length,'Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto'}); res.end(data); } catch (error) { if(String(req.url||'').startsWith('/api/')) return send(res,error?.statusCode||500,{error:error?.message||'Falha no serviço local.'}); const data=await readFile(join(root,'index.html')); res.writeHead(200,{'Content-Type':types['.html'],'Vary':'Host, X-Forwarded-Host, X-Forwarded-Proto'}); res.end(data); }
 }).listen(port,host,()=>console.log(`Aliança Park local: http://localhost:${port} · rede: http://10.75.216.173:${port} · bind: ${host}`));
