import {STAGE_WORKBENCH,findWorkbenchStage,findWorkbenchActivity} from './stage-workbench-data.mjs';

const root=document.querySelector('[data-worker-app]');
const params=new URLSearchParams(location.search);
const requestedStage=params.get('stage')||'project';
const isActivity=/\/activity\/?$/.test(location.pathname);
// Registra o componente somente quando a página de atividade realmente
// contém o mapa. A rota de etapa não precisa baixar/parsing o bundle grande
// de Three.js para mostrar o login ou o fluxograma operacional.
if(isActivity)await import('./components.js?v=ngrok-route-v1');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const runtimeRouteV1=(path,query='')=>{
  const route=String(path||'/').startsWith('/')?String(path||'/'):`/${String(path||'')}`;
  const currentPath=String(globalThis.location?.pathname||'');
  const embeddedPrefix=currentPath.match(/^\/(\d{2,5})(?=\/|$)/)?.[0]||'';
  const host=String(globalThis.location?.hostname||'');
  const tunnelPrefix=embeddedPrefix||(/ngrok/i.test(host)?'/8080':'');
  const params=new URLSearchParams(String(query||'').replace(/^\?/,''));
  const key=new URLSearchParams(String(globalThis.location?.search||'')).get('key');
  if(key&&!params.has('key'))params.set('key',key);
  const suffix=params.toString();
  return `${tunnelPrefix}${route}${suffix?`?${suffix}`:''}`;
};
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format((Number(cents)||0)/100);
const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Number(value)||0);
const physicalValue=(value,unit='')=>`${number(value)}${unit?' '+unit:''}`;
const fmtDate=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'A definir';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const actorHeaders=async(extra={})=>{await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve());const actor=globalThis.BELAVISTA_ADMIN_ACTOR||{};let token='';try{token=await globalThis.BELAVISTA_GET_ID_TOKEN?.()||'';}catch{}return {'x-belavista-role':actor.role||'owner','x-belavista-user':actor.uid||'workbench-local','x-belavista-name':actor.name||'Operação',...(token?{authorization:`Bearer ${token}`}:{ }),...extra};};
const api=async(path,options={})=>{const response=await fetch(path,{cache:'no-store',...options,headers:await actorHeaders(options.headers||{})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload;};

function shell(content,mode='stage'){
  root.className=`worker-app workbench-app mode-${mode}`;
  root.innerHTML=`<header class="worker-header workbench-header"><a class="worker-brand" href="${runtimeRouteV1('/admin/workers')}"><span class="brand-symbol">◢</span><span><strong>ALIANÇA PARK</strong><small>CONTROLE DE OBRA · LOOP VIVO</small></span></a><nav><button type="button" data-notification-toggle aria-haspopup="dialog" aria-controls="notification-widget"><span>Notificações</span><b data-notification-count>0</b></button><a href="${runtimeRouteV1('/admin/workers')}">Monitoria</a><a href="${runtimeRouteV1('/admin')}">Administrativo</a></nav></header>${content}<div class="notification-backdrop" data-notification-backdrop></div><aside class="notification-widget" id="notification-widget" data-notification-widget role="dialog" aria-modal="true" aria-labelledby="notification-title" aria-hidden="true"><header><div><span class="eyebrow">WORKER · TEMPO REAL</span><h2 id="notification-title">Notificações</h2></div><button type="button" data-notification-close aria-label="Fechar notificações">×</button></header><div class="notification-summary"><strong data-notification-summary>Carregando alertas…</strong><button type="button" data-notification-refresh>Atualizar</button></div><div class="notification-list" data-notification-list><div class="notification-empty">Abra o widget para consultar os alertas.</div></div></aside><footer class="worker-footer"><span>Aliança Park · acompanhamento operacional</span><span data-sync-state>Conectado ao estado do worker</span></footer>`;
  root.querySelectorAll('a[href^="/admin"]').forEach(anchor=>anchor.setAttribute('href',runtimeRouteV1(anchor.getAttribute('href'))));
  setupNotifications();
}

let notificationItems=[];
const notificationTime=value=>value?new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Agora';
function renderNotifications(){
  const list=document.querySelector('[data-notification-list]'),badge=document.querySelector('[data-notification-count]'),summary=document.querySelector('[data-notification-summary]');if(!list||!badge||!summary)return;
  const unread=notificationItems.filter(item=>!['read','acknowledged'].includes(item.status)).length;badge.textContent=String(unread);badge.hidden=unread===0;summary.textContent=unread?`${unread} alerta${unread===1?' pendente':'s pendentes'}`:'Tudo acompanhado';
  list.innerHTML=notificationItems.map(item=>`<article class="notification-card severity-${esc(item.severity||'info')} ${['read','acknowledged'].includes(item.status)?'is-read':''}"><div class="notification-card-head"><span>${esc(item.severity==='critical'?'CRÍTICO':item.severity==='warning'?'ATENÇÃO':'INFORMAÇÃO')}</span><time>${esc(notificationTime(item.createdAt))}</time></div><h3>${esc(item.title)}</h3><p>${esc(item.message)}</p><footer>${item.actionUrl&&String(item.actionUrl).startsWith('/')?`<a href="${esc(item.actionUrl)}">Abrir área</a>`:'<span></span>'}${!['read','acknowledged'].includes(item.status)?`<button type="button" data-notification-read="${esc(item.id)}">Marcar como lida</button>`:'<em>Lida</em>'}</footer></article>`).join('')||'<div class="notification-empty"><strong>Nenhuma notificação</strong><span>O worker não encontrou alertas para este perfil.</span></div>';
  list.querySelectorAll('[data-notification-read]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{await api(`/api/notifications/${encodeURIComponent(button.dataset.notificationRead)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status:'read'})});const item=notificationItems.find(row=>row.id===button.dataset.notificationRead);if(item)item.status='read';renderNotifications();}catch(error){button.textContent=error.message;button.disabled=false;}}));
}
async function loadNotifications(){
  const list=document.querySelector('[data-notification-list]');try{const payload=await api('/api/notifications');notificationItems=payload.notifications||[];renderNotifications();}catch(error){if(list)list.innerHTML=`<div class="notification-empty"><strong>Não foi possível carregar</strong><span>${esc(error.message)}</span></div>`;}
}
function setupNotifications(){
  const toggle=document.querySelector('[data-notification-toggle]'),widget=document.querySelector('[data-notification-widget]'),backdrop=document.querySelector('[data-notification-backdrop]'),close=document.querySelector('[data-notification-close]'),refresh=document.querySelector('[data-notification-refresh]');if(!toggle||!widget)return;
  const setOpen=open=>{widget.classList.toggle('is-open',open);backdrop.classList.toggle('is-open',open);widget.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('notification-widget-open',open);if(open){loadNotifications();close.focus();}else toggle.focus();};
  toggle.addEventListener('click',()=>setOpen(true));close.addEventListener('click',()=>setOpen(false));backdrop.addEventListener('click',()=>setOpen(false));refresh.addEventListener('click',loadNotifications);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&widget.classList.contains('is-open'))setOpen(false);},{once:false});void loadNotifications();
}

function stageNavigation(current){
  return `<nav class="stage-tabs" aria-label="Navegar entre etapas">${STAGE_WORKBENCH.map((item,index)=>`<a class="${item.key===current.key?'is-active':''}" href="${runtimeRouteV1('/admin/workers/stage',`stage=${encodeURIComponent(item.key)}`)}"><small>${String(index+1).padStart(2,'0')}</small><span>${esc(item.title)}</span></a>`).join('')}</nav>`;
}

function liveForStage(panorama,monitor,definition){
  const aliases=new Set([definition.key,...definition.aliases]);
  const live=panorama.stages?.find(item=>aliases.has(item.key))||{};
  const monitorStage=monitor.stages?.find(item=>aliases.has(item.key))||{};
  const operationalStage=monitor.operational?.stages?.find(item=>aliases.has(item.key))||{};
  const summary={...monitorStage,...operationalStage};
  return {live,summary,automation:live.automation||{},progress:Number(live.progress??summary.progress)||0,owner:live.owner||summary.owner||'Responsável a definir'};
}

function inferredActivityProgress(stageProgress,index,total){
  return clamp(((Number(stageProgress)||0)/100*total-index)*100,0,100);
}

function dateRange(start,end,count){
  const from=new Date(`${start||new Date().toISOString().slice(0,10)}T12:00:00`),to=new Date(`${end||start||new Date().toISOString().slice(0,10)}T12:00:00`);
  const span=Math.max(1,Math.round((to-from)/86400000));
  return Array.from({length:Math.min(10,Math.max(6,count+1))},(_,index)=>{const date=new Date(from);date.setDate(from.getDate()+Math.round(span*index/Math.max(1,Math.min(10,Math.max(6,count+1))-1)));return date.toISOString().slice(0,10);});
}

function defaultLayout(activities){
  return Object.fromEntries(activities.map((item,index)=>[item.id,{x:58+index*246,y:96+(index%2)*178}]));
}

function defaultLinks(definition){
  return definition.activities.slice(1).map((item,index)=>({from:definition.activities[index].id,to:item.id,label:index===0?'libera após aceite':'depende da liberação anterior'}));
}

let stageContext=null,saveTimer=null;
let inputDisplayMode='view';
const todayIso=()=>new Date().toISOString().slice(0,10);
const validIsoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):todayIso();
const newClientId=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`}`;
const defaultInputAutomation=()=>({propagateRelations:true,generateSchedule:true,generateResources:true,notifyWorker:true});
function normalizeInputAutomation(value){
  const source=value&&typeof value==='object'?value:{};
  const defaults=defaultInputAutomation();
  return Object.fromEntries(Object.keys(defaults).map(key=>[key,source[key]!==false]));
}
function inputProgrammingProfile(session){
  const unit=String(session?.unit||'').trim().toLocaleLowerCase('pt-BR');
  const text=`${session?.title||''} ${session?.text||''} ${session?.release||''} ${(session?.materials||[]).join(' ')}`.toLocaleLowerCase('pt-BR');
  const quantified=/m³|m²|\bm\b|un|ponto|trecho|setor|viagem|lote|ramal|cavalete|ensaio|processo/.test(unit);
  const physical=!/processo|dossiê|termo|ensaio/.test(unit)&&!/aprova[cç][aã]o|protocolo|dossi[eê]|termo/.test(text);
  const hasMaterials=Boolean(session?.materials?.length)||/material|equipamento|m[aá]quina|insumo|tubo|concreto|brita|areia/.test(text);
  const hasDependency=Boolean(session?.release)||/antes|depois|libera|depend|aceite|bloque/.test(text);
  const productionBasis=/m³/.test(unit)?'volume':/m²/.test(unit)?'area':/\bm\b/.test(unit)?'comprimento':/viagem|lote|ramal|cavalete|un|ponto|trecho|setor|ensaio|processo/.test(unit)?'contagem':'registro';
  return {unit,quantified,physical,hasMaterials,hasDependency,productionBasis};
}
function defaultInputProgramming(session){
  const profile=inputProgrammingProfile(session);
  return {scheduleMode:profile.quantified?'production':profile.hasDependency?'sequential':'parallel',productionModeEnabled:profile.quantified,productionBasis:profile.productionBasis,mapLocation:profile.physical,requireAcceptance:profile.hasDependency};
}
function normalizeInputProgramming(value,session){
  const source=value&&typeof value==='object'?value:{};
  const defaults=defaultInputProgramming(session);
  const modes=['sequential','parallel','production'];
  return {scheduleMode:modes.includes(String(source.scheduleMode))?String(source.scheduleMode):defaults.scheduleMode,productionModeEnabled:defaults.productionModeEnabled&&source.productionModeEnabled!==false,productionBasis:String(source.productionBasis||defaults.productionBasis),mapLocation:defaults.mapLocation&&source.mapLocation!==false,requireAcceptance:defaults.requireAcceptance&&source.requireAcceptance!==false};
}
function inputProgrammingModes(session){
  const profile=inputProgrammingProfile(session);
  const modes=[
    {kind:'checkbox',key:'propagateRelations',storage:'automation',label:'Propagar relações',help:'Atualiza vínculos e requisitos do fluxograma.'},
    {kind:'checkbox',key:'generateSchedule',storage:'automation',label:'Gerar cronograma',help:'Leva a data compartilhada para agenda e dependências.'},
    {kind:'checkbox',key:'notifyWorker',storage:'automation',label:'Avisar o worker',help:'Registra a mudança para a próxima leitura operacional.'}
  ];
  if(profile.hasMaterials)modes.push({kind:'checkbox',key:'generateResources',storage:'automation',label:'Recalcular materiais e equipe',help:'Reavalia recursos, produção e cobertura da etapa.'});
  if(profile.quantified)modes.push({kind:'checkbox',key:'productionModeEnabled',storage:'programming',label:`Programar por ${session.unit}`,help:`Usa ${profile.productionBasis} como unidade de produção da atividade.`});
  if(profile.physical)modes.push({kind:'checkbox',key:'mapLocation',storage:'programming',label:'Vincular localização 3D',help:'Mantém a frente associada aos polígonos selecionados no loteamento.'});
  if(profile.hasDependency)modes.push({kind:'checkbox',key:'requireAcceptance',storage:'programming',label:'Exigir aceite do requisito',help:'Impede a propagação automática até o aceite registrado.'});
  return modes;
}
function inputProgrammingMarkup(session){
  const automation=normalizeInputAutomation(session.automation),programming=normalizeInputProgramming(session.programming,session);
  return inputProgrammingModes(session).map(mode=>{const value=mode.storage==='automation'?automation[mode.key]:programming[mode.key];return `<label class="stage-input-check"><input type="checkbox" data-stage-input-option="${esc(mode.key)}" data-stage-input-store="${esc(mode.storage)}" data-stage-input-id="${esc(session.id)}"${value?' checked':''}><span><b>${esc(mode.label)}</b><small>${esc(mode.help)}</small></span></label>`;}).join('');
}
function inputProgrammingSettingsMarkup(session){
  const profile=inputProgrammingProfile(session),programming=normalizeInputProgramming(session.programming,session),options=profile.quantified?['volume','area','comprimento','contagem','registro'].filter((item,index,array)=>array.indexOf(item)===index):['registro'];
  return `<label class="stage-input-setting"><span><b>Modo de agenda</b><small>Define como a entrada ocupa a janela do cronograma.</small></span><select data-stage-input-setting="scheduleMode" data-stage-input-id="${esc(session.id)}"><option value="sequential"${programming.scheduleMode==='sequential'?' selected':''}>Sequencial · aguarda requisito</option><option value="parallel"${programming.scheduleMode==='parallel'?' selected':''}>Paralela · permite sobreposição</option><option value="production"${programming.scheduleMode==='production'?' selected':''}>Por produção · dimensiona pelo ritmo</option></select></label><label class="stage-input-setting"><span><b>Base de medição</b><small>Unidade reconhecida: ${esc(session.unit||'registro')}.</small></span><select data-stage-input-setting="productionBasis" data-stage-input-id="${esc(session.id)}">${options.map(item=>`<option value="${item}"${programming.productionBasis===item?' selected':''}>${item}</option>`).join('')}</select></label>`;
}
function defaultInputProperties(session){
  const spec=session.operational||{};
  const responsibility=spec.responsibility||{};
  return [
    {id:`${session.id}-unit`,label:'Unidade de produção',value:String(session.unit||spec.production?.unit||'registro')},
    {id:`${session.id}-materials`,label:'Materiais e equipamentos',value:(session.materials||spec.materials||spec.equipment||[]).join(', ')||'A definir'},
    {id:`${session.id}-release`,label:'Requisito de liberação',value:String(session.release||'Sem requisito informado')},
    {id:`${session.id}-responsible`,label:'Responsabilidade principal',value:String(responsibility.primary||'Responsável técnico da frente')},
    {id:`${session.id}-support`,label:'Equipe e apoio',value:String(responsibility.support||'Encarregado e equipe executora')},
    {id:`${session.id}-entry`,label:'Condições de entrada',value:(spec.entryConditions||[]).join(' · ')||'Projeto e área liberados'},
    {id:`${session.id}-measure`,label:'Forma de medição',value:String(spec.production?.method||'Medir produção confirmada por frente, local e data')},
    {id:`${session.id}-formula`,label:'Fórmula de produção',value:String(spec.production?.formula||'quantidade válida = soma das medições confirmadas')},
    {id:`${session.id}-evidence`,label:'Evidência e aceite',value:(spec.evidence||spec.acceptance||[]).join(' · ')||'Registro, fotos e confirmação do responsável'},
    {id:`${session.id}-legal`,label:'Base legal/técnica',value:(spec.legalBasis||[]).join(' · ')||'Projeto, licença e norma aplicável'}
  ];
}
function normalizeInputProperties(value,session){
  const defaults=defaultInputProperties(session),existing=Array.isArray(value)?value:[];
  const source=existing.length?[...existing,...defaults.filter(item=>!existing.some(row=>String(row?.id||'')===item.id))]:defaults;
  return source.slice(0,30).map((item,index)=>({id:String(item?.id||`${session.id}-property-${index}`),label:String(item?.label||`Propriedade ${index+1}`),value:String(item?.value??'')}));
}
function inputPropertiesMarkup(session){
  const properties=normalizeInputProperties(session.properties,session),id=esc(session.id);
  return `<header><div><span class="eyebrow">PROPRIEDADES DINÂMICAS</span><small>Valores reutilizáveis na descrição, na inferência e no cronograma.</small></div><button type="button" class="button" data-stage-input-property-add data-stage-input-id="${id}">Adicionar propriedade</button></header><div class="stage-input-properties-list">${properties.length?properties.map((property,index)=>`<div class="stage-input-property" data-stage-input-property-index="${index}"><div class="stage-input-property-fields"><label><span>PROPRIEDADE</span><input type="text" data-stage-input-property-field="label" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(property.label)}" placeholder="Ex.: frente útil"></label><label><span>VALOR</span><input type="text" data-stage-input-property-field="value" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(property.value)}" placeholder="Ex.: 15 m"></label></div><div class="stage-input-property-actions"><button type="button" class="button" data-stage-input-property-insert data-stage-input-index="${index}" data-stage-input-id="${id}">Usar na descrição</button><button type="button" class="button stage-input-property-remove" data-stage-input-property-remove data-stage-input-index="${index}" data-stage-input-id="${id}" aria-label="Remover propriedade">×</button></div></div>`).join(''):'<p class="stage-input-empty">Nenhuma propriedade configurada. Adicione uma para reutilizar valores na descrição.</p>'}</div>`;
}
function updateInputProperty(session,index,key,value){
  session.properties=normalizeInputProperties(session.properties,session);const property=session.properties[index];if(!property)return;property[key]=String(value);queueStateSave();
}
function addInputProperty(session){
  session.properties=normalizeInputProperties(session.properties,session);session.properties.push({id:newClientId('property'),label:'Nova propriedade',value:''});renderStageInputSessions();queueStateSave();
}
function removeInputProperty(session,index){
  session.properties=normalizeInputProperties(session.properties,session);session.properties.splice(index,1);renderStageInputSessions();queueStateSave();
}
function insertInputProperty(session,index){
  session.properties=normalizeInputProperties(session.properties,session);const property=session.properties[index],description=[...document.querySelectorAll('[data-stage-input-text]')].find(field=>field.dataset.stageInputText===session.id);if(!property||!description)return;const token=`{{${property.label||'propriedade'}}}`;const start=description.selectionStart??description.value.length,end=description.selectionEnd??start;description.value=`${description.value.slice(0,start)}${token}${description.value.slice(end)}`;session.text=description.value;description.focus();description.selectionStart=description.selectionEnd=start+token.length;queueInputInference(session);queueStateSave();
}
function enhanceInputFieldLayouts(target){
  target.querySelectorAll('[data-stage-input-card]').forEach(card=>{const session=stageContext.inputSessions.find(item=>item.id===card.dataset.stageInputCard);if(!session)return;session.properties=normalizeInputProperties(session.properties,session);const fields=card.querySelector('.stage-input-fields');if(!fields)return;const title=[...fields.querySelectorAll('[data-stage-input-title]')].find(field=>field.dataset.stageInputTitle===session.id)?.closest('label'),text=[...fields.querySelectorAll('[data-stage-input-text]')].find(field=>field.dataset.stageInputText===session.id)?.closest('label');if(!title||!text)return;fields.classList.add('stage-input-fields-split');fields.replaceChildren();const description=document.createElement('div');description.className='stage-input-description';const descriptionTitle=document.createElement('span');descriptionTitle.className='eyebrow';descriptionTitle.textContent='DESCRIÇÃO E CONTEXTO';description.append(descriptionTitle,title,text);const properties=document.createElement('section');properties.className='stage-input-properties';properties.innerHTML=inputPropertiesMarkup(session);fields.append(description,properties);});
}
function bindInputProperties(target){
  target.querySelectorAll('[data-stage-input-property-field]').forEach(field=>field.addEventListener('input',event=>{const id=event.currentTarget.dataset.stageInputId,session=stageContext.inputSessions.find(item=>item.id===id);if(session)updateInputProperty(session,Number(event.currentTarget.dataset.stageInputIndex),event.currentTarget.dataset.stageInputPropertyField,event.currentTarget.value);}));
  target.querySelectorAll('[data-stage-input-property-add]').forEach(button=>button.addEventListener('click',()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputId);if(session)addInputProperty(session);}));
  target.querySelectorAll('[data-stage-input-property-remove]').forEach(button=>button.addEventListener('click',()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputId);if(session)removeInputProperty(session,Number(button.dataset.stageInputIndex));}));
  target.querySelectorAll('[data-stage-input-property-insert]').forEach(button=>button.addEventListener('click',()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputId);if(session)insertInputProperty(session,Number(button.dataset.stageInputIndex));}));
}
function inputProductionPreview(session){
  const profile=inputProgrammingProfile(session),programming=normalizeInputProgramming(session.programming,session),unit=session.unit||'registro',basis=programming.productionBasis||profile.productionBasis,labels={volume:'Volume executado',area:'Área executada',comprimento:'Comprimento executado',contagem:'Itens ou unidades executados',registro:'Registro confirmado'},reference=unit==='m³'?'ritmo calibrado em m³/dia':unit==='m²'?'ritmo calibrado em m²/dia':unit==='m'?'ritmo calibrado em m/dia':`ritmo calibrado em ${unit}/dia`,conditions=[{kind:'rendimento',label:'Rendimento',trigger:`notificar o dono se a produção confirmada ficar abaixo do ${reference} ou for registrada como bloqueada`,severity:'warning'}];
  conditions.push({kind:'solo',label:'Solo e campo',trigger:'notificar quando solo, greide, cota, chuva, lama ou umidade impedirem a execução',severity:'warning'});
  if(session.release)conditions.push({kind:'dependência',label:'Dependência',trigger:`notificar se o requisito “${session.release}” estiver pendente, recusado ou bloqueando`,severity:'info'});
  if(session.materials?.length)conditions.push({kind:'material',label:'Materiais',trigger:`notificar se faltar ou atrasar: ${session.materials.join(', ')}`,severity:'warning'});
  return {basis,basisLabel:labels[basis]||labels.registro,unit,measureForm:`Registrar ${unit} por frente/local e por data, com confirmação do responsável.`,quantityFormula:`quantidade válida = soma das medições confirmadas em ${unit}`,durationFormula:`duração = teto(quantidade total ÷ ritmo ajustado de ${unit}/dia)`,referenceRate:reference,totalQuantity:'calculada no plano da etapa',conditions,source:'Prévia local até a compreensão estruturada da IA'};
}
function inputProductionMarkup(session){
  const spec=session.inference?.production||inputProductionPreview(session),conditions=Array.isArray(session.inference?.conditions)&&session.inference.conditions.length?session.inference.conditions:inputProductionPreview(session).conditions;
  return `<header><div><span class="eyebrow">DETALHES DE PRODUÇÃO</span><strong>${esc(spec.basisLabel||'Produção controlada')} · ${esc(spec.unit||session.unit||'registro')}</strong><p>${esc(spec.source||'Parâmetros inferidos pelo motor local.')}</p></div><span class="stage-input-production-badge">${session.inference?.production?'ESTRUTURADO':'PRÉVIA'}</span></header><div class="stage-input-production-grid"><article class="stage-input-production-item"><small>FORMA DE MEDIDA</small><b>${esc(spec.measureForm||'Medição confirmada pelo responsável.')}</b></article><article class="stage-input-production-item"><small>RITMO DE REFERÊNCIA</small><b>${esc(spec.referenceRate??'—')} ${esc(spec.rateUnit||'')}</b></article><article class="stage-input-production-item"><small>TOTAL DA FRENTE</small><b>${esc(spec.totalQuantity??'A calcular')} ${esc(spec.unit||'')}</b></article><article class="stage-input-production-item"><small>VALIDAÇÃO</small><b>${esc(spec.validation||'Somente registros confirmados entram na soma.')}</b></article></div><div class="stage-input-formula"><small>CÁLCULO USADO NO CRONOGRAMA</small><code>${esc(spec.quantityFormula||'quantidade válida = soma das medições confirmadas')} · ${esc(spec.durationFormula||'duração = teto(quantidade ÷ ritmo ajustado)')}</code></div><div class="stage-input-conditions"><div class="stage-input-conditions-heading"><span class="eyebrow">CONDIÇÕES E DISPAROS</span><small>O cron lê registros do diário e eventos vinculados; a notificação é deduplicada.</small></div>${conditions.map(condition=>`<article class="stage-input-condition"><i class="condition-dot condition-${esc(condition.severity||'info')}"></i><div><b>${esc(condition.label||condition.kind||'Condição')}</b><small>${esc(condition.trigger||condition.message||'Condição lida na saída estruturada da IA.')}</small></div><em>${(condition.notifyRoles||condition.notifyWhen||condition.kind==='rendimento')?.includes?.('owner')||condition.kind==='rendimento'?'Dono':'Worker'}</em></article>`).join('')}</div>`;
}
function inputProductionDraft(session){
  const preview=inputProductionPreview(session),inference=session.inference&&typeof session.inference==='object'?session.inference:{},spec={...preview,...(inference.production&&typeof inference.production==='object'?inference.production:{})},conditions=Array.isArray(inference.conditions)?inference.conditions:preview.conditions;
  return {spec,conditions};
}
function inputConditionTokens(value){
  if(Array.isArray(value))return value.map(item=>String(item).trim()).filter(Boolean);
  return String(value||'').split(',').map(item=>item.trim()).filter(Boolean);
}
function inputConditionRoles(value){
  return inputConditionTokens(value).map(role=>({dono:'owner',proprietario:'owner',encarregado:'foreman',worker:'foreman'}[role.toLocaleLowerCase('pt-BR')]||role));
}
function inputManualNotificationPolicy(session){
  return {enabled:normalizeInputAutomation(session.automation).notifyWorker,mode:'pseudo-listener',trigger:'structured-condition-match',primaryRecipient:'owner',deduplicateBy:'stage/activity/condition/event',externalMessaging:'disabled'};
}
function ensureInputProductionDraft(session){
  const preview=inputProductionPreview(session),existing=session.inference&&typeof session.inference==='object'?session.inference:{},production={...preview,...(existing.production&&typeof existing.production==='object'?existing.production:{})},conditions=Array.isArray(existing.conditions)?existing.conditions.map(row=>({...row})):preview.conditions.map(row=>({...row}));
  session.inference={...existing,manual:true,loading:false,confidence:Number(existing.confidence)||0,production,conditions,notificationPolicy:existing.notificationPolicy||inputManualNotificationPolicy(session)};
  return session.inference;
}
function inputProductionMarkupEditable(session){
  const {spec,conditions}=inputProductionDraft(session),id=esc(session.id),roles=condition=>Array.isArray(condition.notifyRoles)?condition.notifyRoles.join(', '):String(condition.notifyRoles||'owner');
  return `<header><div><span class="eyebrow">DETALHES DE PRODUÇÃO · EDITÁVEL</span><strong>${esc(spec.basisLabel||'Produção controlada')} · ${esc(spec.unit||session.unit||'registro')}</strong><p>${esc(spec.source||'Edite os parâmetros em texto; a leitura estruturada será usada no cronograma e nos disparos.')}</p></div><span class="stage-input-production-badge">${session.inference?.manual?'EDIÇÃO LOCAL':'PRÉVIA'}</span></header><div class="stage-input-editor-grid"><label class="stage-input-editor-field"><span>BASE DA PRODUÇÃO</span><input type="text" data-stage-input-production-field="basisLabel" data-stage-input-id="${id}" value="${esc(spec.basisLabel||'Produção controlada')}"></label><label class="stage-input-editor-field"><span>UNIDADE</span><input type="text" data-stage-input-production-field="unit" data-stage-input-id="${id}" value="${esc(spec.unit||session.unit||'registro')}"></label><label class="stage-input-editor-field stage-input-editor-field-wide"><span>FORMA DE MEDIDA</span><textarea data-stage-input-production-field="measureForm" data-stage-input-id="${id}" rows="3">${esc(spec.measureForm||'')}</textarea></label><label class="stage-input-editor-field"><span>RITMO DE REFERÊNCIA</span><input type="number" min="0" step="0.01" data-stage-input-production-field="referenceRate" data-stage-input-id="${id}" value="${esc(spec.referenceRate??'')}"></label><label class="stage-input-editor-field"><span>UNIDADE DO RITMO</span><input type="text" data-stage-input-production-field="rateUnit" data-stage-input-id="${id}" value="${esc(spec.rateUnit||`${spec.unit||session.unit||'registro'}/dia`)}"></label><label class="stage-input-editor-field"><span>TOTAL DA FRENTE</span><input type="number" min="0" step="0.01" data-stage-input-production-field="totalQuantity" data-stage-input-id="${id}" value="${typeof spec.totalQuantity==='number'?esc(spec.totalQuantity):''}" placeholder="calculado pelo DWG"></label><label class="stage-input-editor-field"><span>UNIDADE DO TOTAL</span><input type="text" data-stage-input-production-field="unit" data-stage-input-id="${id}" value="${esc(spec.unit||session.unit||'registro')}"></label><label class="stage-input-editor-field stage-input-editor-field-wide"><span>VALIDAÇÃO E ACEITE</span><textarea data-stage-input-production-field="validation" data-stage-input-id="${id}" rows="3">${esc(spec.validation||'Somente registros confirmados entram na soma; o responsável valida a medição.')}</textarea></label></div><div class="stage-input-editor-formulas"><label class="stage-input-editor-formula"><span>CÁLCULO DA QUANTIDADE</span><textarea data-stage-input-production-field="quantityFormula" data-stage-input-id="${id}" rows="3">${esc(spec.quantityFormula||'quantidade válida = soma das medições confirmadas')}</textarea></label><label class="stage-input-editor-formula"><span>CÁLCULO DA DURAÇÃO</span><textarea data-stage-input-production-field="durationFormula" data-stage-input-id="${id}" rows="3">${esc(spec.durationFormula||'duração = teto(quantidade total ÷ ritmo ajustado)')}</textarea></label></div><div class="stage-input-conditions"><header class="stage-input-conditions-heading"><div><span class="eyebrow">CONDIÇÕES E DISPAROS EDITÁVEIS</span><small>O cron lê os registros confirmados, cruza estes textos e deduplica a notificação ao dono.</small></div><button type="button" class="button" data-stage-input-condition-add data-stage-input-id="${id}">Adicionar condição</button></header>${conditions.length?conditions.map((condition,index)=>`<article class="stage-input-condition-editor" data-stage-input-condition-index="${index}"><div class="stage-input-condition-fields"><label><span>TIPO</span><input type="text" data-stage-input-condition-field="kind" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(condition.kind||'operacional')}"></label><label><span>RÓTULO</span><input type="text" data-stage-input-condition-field="label" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(condition.label||'Condição')}"></label><label><span>SEVERIDADE</span><select data-stage-input-condition-field="severity" data-stage-input-index="${index}" data-stage-input-id="${id}"><option value="info"${condition.severity==='info'?' selected':''}>Informação</option><option value="warning"${condition.severity==='warning'?' selected':''}>Atenção</option><option value="critical"${condition.severity==='critical'?' selected':''}>Crítica</option></select></label><label class="stage-input-editor-field-wide"><span>DISPARAR QUANDO</span><textarea data-stage-input-condition-field="trigger" data-stage-input-index="${index}" data-stage-input-id="${id}" rows="2">${esc(condition.trigger||'notificar quando a condição for identificada')}</textarea></label><label><span>TIPO DE LEITURA</span><input type="text" data-stage-input-condition-field="notifyWhen" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(condition.notifyWhen||'negative-match')}"></label><label><span>DESTINATÁRIOS</span><input type="text" data-stage-input-condition-field="notifyRoles" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(roles(condition))}" placeholder="owner, foreman"></label><label><span>TERMOS OBSERVADOS</span><input type="text" data-stage-input-condition-field="watchTerms" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(inputConditionTokens(condition.watchTerms).join(', '))}" placeholder="solo, rendimento, atraso"></label><label><span>TERMOS QUE BLOQUEIAM</span><input type="text" data-stage-input-condition-field="negativeTerms" data-stage-input-index="${index}" data-stage-input-id="${id}" value="${esc(inputConditionTokens(condition.negativeTerms).join(', '))}" placeholder="bloqueado, pendente"></label><label class="stage-input-editor-field-wide"><span>MENSAGEM GERADA</span><textarea data-stage-input-condition-field="message" data-stage-input-index="${index}" data-stage-input-id="${id}" rows="2">${esc(condition.message||'Condição identificada na leitura operacional.')}</textarea></label></div><button type="button" class="button stage-input-condition-remove" data-stage-input-condition-remove data-stage-input-index="${index}" data-stage-input-id="${id}">Remover condição</button></article>`).join(''):'<p class="stage-input-empty">Nenhuma condição configurada. Adicione uma para ativar a leitura do worker.</p>'}</div>`;
}
function updateInputProductionField(session,key,value){
  const inference=ensureInputProductionDraft(session),numeric=key==='referenceRate'||key==='totalQuantity';
  inference.production[key]=numeric?(value===''?'':Number(value)):String(value);
  if(key==='unit'){session.unit=String(value||'registro');targetInputProductionFields(session,'unit').forEach(field=>{if(field.value!==session.unit)field.value=session.unit;});stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();}
  queueStateSave();
}
function targetInputProductionFields(session,key){
  return [...document.querySelectorAll('[data-stage-input-production-field]')].filter(field=>field.dataset.stageInputId===session.id&&field.dataset.stageInputProductionField===key);
}
function updateInputConditionField(session,index,key,value){
  const inference=ensureInputProductionDraft(session),condition=inference.conditions[index];if(!condition)return;
  condition[key]=['notifyRoles','watchTerms','negativeTerms'].includes(key)?(key==='notifyRoles'?inputConditionRoles(value):inputConditionTokens(value)):String(value);
  queueStateSave();
}
function bindInputProductionEditors(target){
  target.querySelectorAll('[data-stage-input-production-field]').forEach(field=>field.addEventListener('input',event=>{const id=event.currentTarget.dataset.stageInputId,session=stageContext.inputSessions.find(item=>item.id===id);if(session)updateInputProductionField(session,event.currentTarget.dataset.stageInputProductionField,event.currentTarget.value);}));
  target.querySelectorAll('[data-stage-input-condition-field]').forEach(field=>{const handler=event=>{const id=event.currentTarget.dataset.stageInputId,session=stageContext.inputSessions.find(item=>item.id===id);if(session)updateInputConditionField(session,Number(event.currentTarget.dataset.stageInputIndex),event.currentTarget.dataset.stageInputConditionField,event.currentTarget.value);};field.addEventListener('input',handler);field.addEventListener('change',handler);});
  target.querySelectorAll('[data-stage-input-condition-add]').forEach(button=>button.addEventListener('click',()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputId);if(!session)return;const inference=ensureInputProductionDraft(session);inference.conditions.push({kind:'operacional',label:'Nova condição',trigger:'notificar quando o registro indicar impedimento ou pendência',notifyWhen:'negative-match',notifyRoles:['owner'],severity:'warning',watchTerms:[],negativeTerms:['bloqueado','pendente','atrasado'],message:'Condição manual identificada na leitura operacional.'});renderStageInputSessions();queueStateSave();}));
  target.querySelectorAll('[data-stage-input-condition-remove]').forEach(button=>button.addEventListener('click',()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputId);if(!session)return;const inference=ensureInputProductionDraft(session);inference.conditions.splice(Number(button.dataset.stageInputIndex),1);renderStageInputSessions();queueStateSave();}));
}
function enhanceInputProductionPaper(target){
  target.querySelectorAll('[data-stage-input-production]').forEach(production=>{
    if(production.querySelector('[data-stage-input-paper-toggle]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='button stage-input-paper-toggle';button.dataset.stageInputPaperToggle='';
    button.textContent='Abrir papel de edição';
    production.querySelector('header')?.append(button);
    button.addEventListener('click',()=>{
      const open=production.classList.toggle('is-paper-open');
      button.textContent=open?'Fechar papel de edição':'Abrir papel de edição';
      if(open)production.scrollIntoView({behavior:'smooth',block:'center'});
    });
  });
}
function defaultInputSessions(definition,calendarDate){
  return definition.activities.map((item,index)=>{const session={id:`input-${item.id}`,activityId:item.id,title:item.title,text:`Entrada base: ${item.release}. Equipamentos e materiais: ${item.materials.join(', ')}.`,unit:item.unit,materials:item.materials,release:item.release,operational:item.operational,calendarDate,order:index,custom:false,inference:null,automation:defaultInputAutomation()};session.programming=defaultInputProgramming(session);return session;});
}
function normalizeInputSessions(definition,stored,calendarDate){
  const source=Array.isArray(stored.inputSessions)&&stored.inputSessions.length?stored.inputSessions:defaultInputSessions(definition,calendarDate);
  return source.slice(0,40).map((item,index)=>{const activity=definition.activities.find(row=>row.id===String(item?.activityId||item?.id||''))||{};const session={id:String(item?.id||newClientId('input')),activityId:String(item?.activityId||item?.id||newClientId('activity')),title:String(item?.title||activity.title||'Atividade de entrada'),text:String(item?.text||''),unit:String(item?.unit||activity.unit||'atividade'),materials:Array.isArray(item?.materials)?item.materials.map(String):Array.isArray(activity.materials)?activity.materials.map(String):[],release:String(item?.release||activity.release||''),operational:item?.operational||activity.operational||null,calendarDate:validIsoDate(calendarDate),order:index,custom:Boolean(item?.custom),inference:item?.inference&&typeof item.inference==='object'?item.inference:null,automation:normalizeInputAutomation(item?.automation),properties:[]};session.properties=normalizeInputProperties(item?.properties,session);session.programming=normalizeInputProgramming(item?.programming,session);return session;});
}
function flowActivityFromInput(session){
  return {id:session.activityId,title:session.title||'Atividade de entrada',unit:session.unit||'atividade',materials:session.materials||[],release:session.release||session.text||'Entrada adicionada pelo usuário',weight:1,custom:true,operational:session.operational||null,programming:normalizeInputProgramming(session.programming,session)};
}
function buildFlowActivities(definition,sessions){
  const overrides=new Map(sessions.filter(item=>!item.custom).map(item=>[item.activityId,item]));
  const activities=definition.activities.map(item=>{const input=overrides.get(item.id);return input?{...item,title:input.title||item.title,operational:input.operational||item.operational,programming:normalizeInputProgramming(input.programming,input)}:item;});
  return activities.concat(sessions.filter(item=>item.custom).map(flowActivityFromInput));
}
function buildScheduleContext(context,calendarDate){
  const start=validIsoDate(calendarDate||context.automation?.plannedStart);
  const finish=validIsoDate(context.automation?.plannedFinish||start);
  return {...context,automation:{...(context.automation||{}),plannedStart:start,plannedFinish:finish<start?start:finish}};
}
function flowCardMarkup(item,index,total){
  const position=stageContext.layout[item.id]||{x:58+index*246,y:96+(index%2)*178},cardWidth=clamp(Number(position.width)||220,180,520);
  const [start,end]=activityDates(stageContext.scheduleContext,index,total),progress=inferredActivityProgress(stageContext.progress,index,total),status=progress>=100?'concluída':stageContext.live.blockedBy?.length?'bloqueada':progress>0?'em execução':'planejada';
  return `<article class="flow-card status-${status.replace(' ','-')} ${item.custom?'is-input-derived':''}" data-flow-card="${esc(item.id)}" data-calendar-start="${start}" style="width:${cardWidth}px;transform:translate(${position.x}px,${position.y}px)"><header><span>${String(index+1).padStart(2,'0')} · ${esc(item.unit)}</span><i>${Math.round(progress)}%</i></header><h3>${esc(item.title)}</h3><p>${esc(item.release)}</p><div class="flow-card-progress"><i style="width:${progress}%"></i></div><footer><time data-flow-window>${fmtDate(start)} → ${fmtDate(end)}</time><a href="/admin/workers/activity?stage=${encodeURIComponent(stageContext.definition.key)}&activity=${encodeURIComponent(item.id)}">Abrir atividade →</a></footer></article>`;
}
function renderFlowCards(){
  const target=document.querySelector('[data-flow-cards]');if(!target||!stageContext)return;
  target.innerHTML=stageContext.flowActivities.map((item,index)=>flowCardMarkup(item,index,stageContext.flowActivities.length)).join('');
  enableDragging();
}
function renderInputInference(session){
  const target=[...document.querySelectorAll('[data-stage-input-inference]')].find(node=>node.dataset.stageInputInference===session.id);if(!target)return;
  const inference=session.inference;
  const card=target.closest('[data-stage-input-card]'),productionTarget=card?.querySelector('[data-stage-input-production]');if(productionTarget){productionTarget.innerHTML=inputProductionMarkupEditable(session);enhanceInputProductionPaper(productionTarget);const badge=productionTarget.querySelector('.stage-input-production-badge');if(badge)badge.textContent=session.inference?.manual?'EDIÇÃO LOCAL':session.inference?.production?'ESTRUTURADO':'PRÉVIA';}
  if(!inference){target.innerHTML='<span class="input-inference-pending">Pronto para análise da entrada.</span>';return;}
  if(inference.manual){target.innerHTML='<span class="input-inference-label">EDIÇÃO LOCAL · pronta para compreensão</span><p>Os parâmetros textuais foram preservados e serão usados pelo worker quando você executar as diretrizes.</p><span class="input-inference-muted">A edição não substitui o aceite humano do registro.</span>';return;}
  const relation=inference.relation;
  target.innerHTML=`<span class="input-inference-label">${inference.loading?'ANALISANDO…':'COMPREENSÃO DA IA'} · ${Math.round((Number(inference.confidence)||0)*100)}%</span><p>${esc(inference.summary||inference.modelText||'Entrada compreendida e vinculada ao ciclo.')}</p>${relation?`<strong>Relação detectada</strong><span>${esc(relation.label)} · refletida no cronograma</span>`:'<span class="input-inference-muted">Nenhum vínculo seguro detectado ainda.</span>'}`;
}
function applyInputRelation(session,inference){
  if(!stageContext)return;
  stageContext.links=stageContext.links.filter(link=>!(link.source==='input-inference'&&link.sourceId===session.id));
  if(!normalizeInputAutomation(session.automation).propagateRelations){drawConnections();queueStateSave();return;}
  const relation=inference?.relation;
  if(relation?.fromActivityId&&relation?.toActivityId&&relation.fromActivityId!==relation.toActivityId){
    stageContext.links.push({from:relation.fromActivityId,to:relation.toActivityId,label:relation.label||'relação inferida',source:'input-inference',sourceId:session.id});
  }
  drawConnections();queueStateSave();
}
async function inferStageInput(session){
  if(!stageContext||!session.text.trim()){session.inference=null;renderInputInference(session);applyInputRelation(session,null);return;}
  const target=[...document.querySelectorAll('[data-stage-input-inference]')].find(node=>node.dataset.stageInputInference===session.id);if(target){session.inference={...(session.inference||{}),loading:true,confidence:0,summary:'Analisando a atividade e suas dependências…'};renderInputInference(session);}
  try{
    const result=await api('/api/workbench/infer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({stage:stageContext.definition.key,activityId:session.activityId,title:session.title,text:session.text,calendarDate:stageContext.calendarDate,activities:stageContext.flowActivities,automation:normalizeInputAutomation(session.automation),programming:normalizeInputProgramming(session.programming,session),properties:normalizeInputProperties(session.properties,session)})});
    session.inference={...result,loading:false};applyInputRelation(session,session.inference);renderInputInference(session);document.querySelector('[data-sync-state]').textContent='Compreensão registrada e cronograma atualizado';
  }catch(error){session.inference={loading:false,confidence:0,summary:`A compreensão não pôde ser consultada: ${error.message}`};renderInputInference(session);document.querySelector('[data-sync-state]').textContent='IA indisponível; entrada preservada para nova tentativa';}
  queueStateSave();
}
function queueInputInference(session){
  clearTimeout(stageContext.inputTimers.get(session.id));stageContext.inputTimers.set(session.id,setTimeout(()=>void inferStageInput(session),650));
}
function setupStageInputs(){
  const date=document.querySelector('[data-stage-calendar-date]'),add=document.querySelector('[data-stage-input-add]'),toggle=document.querySelector('[data-input-edit-toggle]');if(!date||!add)return;
  const panel=document.querySelector('.stage-inputs-panel'),heading=panel?.querySelector('h2'),intro=panel?.querySelector('header p');
  if(panel){panel.dataset.inputMode='view'; if(heading)heading.textContent='Compreensão operacional'; if(intro)intro.textContent='Visualize a descrição e a lógica interpretada pelo endpoint. A edição das diretrizes fica disponível sob demanda.';}
  if(!toggle&&panel){const actions=panel.querySelector('.stage-input-actions');if(actions){const button=document.createElement('button');button.type='button';button.className='button';button.dataset.inputEditToggle='';button.textContent='Editar compreensão';actions.insertBefore(button,add);}}
  const editToggle=toggle||panel?.querySelector('[data-input-edit-toggle]');
  const setMode=mode=>{inputDisplayMode=mode;if(panel)panel.dataset.inputMode=mode;if(editToggle){editToggle.textContent=mode==='edit'?'Concluir edição':'Editar compreensão';editToggle.setAttribute('aria-pressed',String(mode==='edit'));}if(add)add.classList.toggle('is-hidden',mode!=='edit');renderStageInputSessions();};
  editToggle?.addEventListener('click',()=>setMode(inputDisplayMode==='edit'?'view':'edit'));
  setMode('view');
  date.addEventListener('change',()=>{stageContext.calendarDate=validIsoDate(date.value);stageContext.inputSessions.forEach(item=>item.calendarDate=stageContext.calendarDate);stageContext.scheduleContext=buildScheduleContext(stageContext,stageContext.calendarDate);date.value=stageContext.calendarDate;renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();});
  add.addEventListener('click',()=>{const id=newClientId('input'),activityId=newClientId('activity');const session={id,activityId,title:'Nova atividade',text:'',calendarDate:stageContext.calendarDate,order:stageContext.inputSessions.length,custom:true,inference:null,automation:defaultInputAutomation(),properties:[]};stageContext.inputSessions.push(session);stageContext.flowActivities.push(flowActivityFromInput(session));stageContext.layout[activityId]={x:58+stageContext.flowActivities.length*246,y:96+(stageContext.flowActivities.length%2)*178};renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();setTimeout(()=>[...document.querySelectorAll('[data-stage-input-title]')].find(node=>node.dataset.stageInputTitle===id)?.focus(),0);});
  renderStageInputSessions();
}
function queueStateSave(){
  clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{
    const state={layout:stageContext.layout,links:stageContext.links,inputSessions:stageContext.inputSessions,calendarDate:stageContext.calendarDate};
    const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Salvando organização…';
    try{await api(`/api/workbench/state?stage=${encodeURIComponent(stageContext.definition.key)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(status)status.textContent='Organização salva e auditada';}
    catch(error){if(status)status.textContent=`Falha ao salvar: ${error.message}`;}
  },450);
}

function drawConnections(){
  if(!stageContext)return;
  const svg=document.querySelector('[data-flow-lines]'),labels=document.querySelector('[data-flow-labels]');if(!svg||!labels)return;
  const cardH=142;
  svg.innerHTML=stageContext.links.map(link=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';const cardW=clamp(Number(a.width)||220,180,520),x1=a.x+cardW,y1=a.y+cardH/2,x2=b.x,y2=b.y+cardH/2,curve=Math.max(45,(x2-x1)*.45);return `<path d="M ${x1} ${y1} C ${x1+curve} ${y1}, ${x2-curve} ${y2}, ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="4"/>`;}).join('');
  labels.innerHTML=stageContext.links.map((link,index)=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';return `<label class="flow-link-label" style="left:${(a.x+b.x+220)/2-72}px;top:${(a.y+b.y)/2+58}px"><span>REQUISITO</span><input data-link-label="${index}" value="${esc(link.label)}" aria-label="Rótulo da dependência"></label>`;}).join('');
  labels.querySelectorAll('[data-link-label]').forEach(input=>input.addEventListener('change',event=>{stageContext.links[Number(event.currentTarget.dataset.linkLabel)].label=event.currentTarget.value.trim()||'depende de';queueStateSave();}));
}

function enableDragging(){
  const surface=document.querySelector('[data-flow-surface]');if(!surface)return;
  const evaluation=message=>{let bar=document.querySelector('[data-calendar-evaluation]');if(!bar){bar=document.createElement('aside');bar.dataset.calendarEvaluation='';bar.className='calendar-evaluation';bar.innerHTML='<span></span><button type="button" aria-label="Fechar avaliação">×</button>';document.body.append(bar);bar.querySelector('button').addEventListener('click',()=>bar.remove());}bar.querySelector('span').textContent=message;};
  surface.querySelectorAll('[data-flow-card]').forEach(card=>{
    card.addEventListener('pointerdown',event=>{
      if(event.target.closest('a,button,input')||event.offsetX>=card.clientWidth-14)return;
      event.preventDefault();card.setPointerCapture(event.pointerId);card.classList.add('is-dragging');
      const origin=stageContext.layout[card.dataset.flowCard],start={x:event.clientX,y:event.clientY,left:origin.x,top:origin.y};
      const move=moveEvent=>{const next={x:clamp(start.left+moveEvent.clientX-start.x,16,surface.scrollWidth-236),y:clamp(start.top+moveEvent.clientY-start.y,72,surface.scrollHeight-170)};stageContext.layout[card.dataset.flowCard]=next;card.style.transform=`translate(${next.x}px,${next.y}px)`;drawConnections();};
      const up=()=>{const current=stageContext.layout[card.dataset.flowCard];current.x=Math.max(16,Math.round((current.x-6)/118)*118+6);card.style.transform=`translate(${current.x}px,${current.y}px)`;card.classList.remove('is-dragging');card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);card.removeEventListener('pointercancel',up);queueStateSave();evaluation('IA avaliou o encaixe na linha de data e atualizou a janela de execução da atividade.');};
      card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);
    });
  });
  if(typeof ResizeObserver!=='undefined'){
    const resizeObserver=new ResizeObserver(entries=>entries.forEach(({target})=>{
      const layout=stageContext.layout[target.dataset.flowCard];if(!layout)return;
      const width=clamp(Math.round(target.getBoundingClientRect().width),180,520);layout.width=width;
      const start=new Date(`${target.dataset.calendarStart}T12:00:00`),days=Math.max(1,Math.round(width/118)),finish=new Date(start);finish.setDate(start.getDate()+days);
      const label=target.querySelector('[data-flow-window]');if(label)label.textContent=`${fmtDate(target.dataset.calendarStart)} → ${fmtDate(finish.toISOString().slice(0,10))} · ${days}d`;
      drawConnections();queueStateSave();
    }));
    surface.querySelectorAll('[data-flow-card]').forEach(card=>resizeObserver.observe(card));
  }
}

function activityDates(context,index,total){
  const start=new Date(`${context.automation.plannedStart||new Date().toISOString().slice(0,10)}T12:00:00`),end=new Date(`${context.automation.plannedFinish||context.automation.plannedStart||new Date().toISOString().slice(0,10)}T12:00:00`),span=Math.max(total,(end-start)/86400000),segment=span/total;
  const a=new Date(start),b=new Date(start);a.setDate(start.getDate()+Math.floor(segment*index));b.setDate(start.getDate()+Math.max(Math.floor(segment*(index+1)),Math.floor(segment*index)+1));return [a.toISOString().slice(0,10),b.toISOString().slice(0,10)];
}

const attachmentKinds={receipt:'Comprovante',certificate:'Certificado',inspection:'Laudo / inspeção',photo:'Foto de campo',contract:'Contrato',evidence:'Outra evidência'};
const fileDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler o arquivo.'));reader.readAsDataURL(file);});

function renderAttachmentItems(items){
  const target=document.querySelector('[data-attachment-list]');if(!target)return;
  target.innerHTML=items.map(item=>{const expired=item.expiresAt&&new Date(`${item.expiresAt}T23:59:59`)<new Date();return `<article class="attachment-item"><div class="attachment-file-icon">${item.mimeType==='application/pdf'?'PDF':'IMG'}</div><div><span>${esc(attachmentKinds[item.kind]||item.kind)}</span><h3>${esc(item.title)}</h3><p>${esc(item.issuer||'Emissor não informado')} · ${fmtDate(item.documentDate||item.createdAt)}</p>${item.notes?`<small>${esc(item.notes)}</small>`:''}</div><div class="attachment-item-actions">${item.expiresAt?`<em class="${expired?'is-expired':''}">${expired?'Vencido':'Validade'} ${fmtDate(item.expiresAt)}</em>`:''}<a href="${esc(item.fileUrl)}" target="_blank" rel="noopener">Visualizar</a></div></article>`;}).join('')||'<div class="attachment-empty"><strong>Nenhum documento anexado</strong><span>Adicione comprovantes, certificados, laudos ou fotos desta frente.</span></div>';
}

function attachmentPanel(definition,items,activity=null){
  return `<section class="attachments-panel"><header><div><span class="eyebrow">EVIDÊNCIAS E DOCUMENTOS</span><h2>Comprovantes e certificados</h2><p>No celular, fotografe o documento ou selecione um PDF. O envio fica vinculado à ${activity?'atividade':'etapa'} e dispara nova leitura do worker.</p></div><button class="button button-primary" data-toggle-attachment>Adicionar anexo</button></header><form class="attachment-form" data-attachment-form hidden><label class="attachment-capture"><input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" required><span><b>Fotografar ou selecionar arquivo</b><small>PDF, JPG, PNG ou WebP · máximo 6 MB</small></span></label><div class="attachment-fields"><label>Tipo<select name="kind">${Object.entries(attachmentKinds).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>Título<input name="title" required placeholder="Ex.: Certificado de compactação"></label><label>Emissor / fornecedor<input name="issuer" placeholder="Empresa, laboratório ou técnico"></label><label>Data do documento<input type="date" name="documentDate" value="${new Date().toISOString().slice(0,10)}"></label><label>Validade<input type="date" name="expiresAt"></label><label class="wide">Observações<textarea name="notes" rows="3" placeholder="Número, trecho, medição, lote ou condição verificada"></textarea></label></div><div class="attachment-form-footer"><span data-attachment-status>Nenhum arquivo selecionado.</span><div><button type="button" class="button" data-cancel-attachment>Cancelar</button><button class="button button-primary" type="submit">Enviar e propagar</button></div></div></form><div class="attachment-list" data-attachment-list></div></section>`;
}

function mountAttachments(definition,items,activity=null){
  const main=document.querySelector('.workbench-main');if(!main)return;
  main.insertAdjacentHTML('beforeend',attachmentPanel(definition,items,activity));renderAttachmentItems(items);
  const form=main.querySelector('[data-attachment-form]'),toggle=main.querySelector('[data-toggle-attachment]'),cancel=main.querySelector('[data-cancel-attachment]'),fileInput=form.elements.file,status=main.querySelector('[data-attachment-status]');
  toggle.addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden)fileInput.focus();});cancel.addEventListener('click',()=>form.hidden=true);
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];status.textContent=file?`${file.name} · ${(file.size/1048576).toFixed(1)} MB`:'Nenhum arquivo selecionado.';});
  form.addEventListener('submit',async event=>{event.preventDefault();const file=fileInput.files?.[0],button=form.querySelector('[type="submit"]');if(!file)return;if(file.size>6*1024*1024){status.textContent='O arquivo ultrapassa o limite de 6 MB.';return;}button.disabled=true;button.textContent='Enviando…';try{const fields=Object.fromEntries(new FormData(form));delete fields.file;await api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fields,activityId:activity?.id||'',fileName:file.name,dataUrl:await fileDataUrl(file)})});const refreshed=await api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}${activity?`&activity=${encodeURIComponent(activity.id)}`:''}`);renderAttachmentItems(refreshed.attachments||[]);form.reset();form.hidden=true;status.textContent='Anexo registrado e propagado ao worker.';document.querySelector('[data-sync-state]').textContent='Evidência anexada e ciclo operacional atualizado';}catch(error){status.textContent=error.message;}finally{button.disabled=false;button.textContent='Enviar e propagar';}});
}

function operationalList(items,empty='A definir'){
  const values=Array.isArray(items)?items.filter(Boolean):[];
  return values.length?values.map(item=>`<li>${esc(item)}</li>`).join(''):`<li>${esc(empty)}</li>`;
}
function operationalStageMarkup(definition){
  const activities=definition.activities||[],legal=[...new Set(activities.flatMap(item=>item.operational?.legalBasis||[]))];
  const lifecycle=[
    ['01 · ENTRADA LEGAL','Projeto vigente, licença/condicionante, ART/RRT, caixa, equipe e frente liberados.'],
    ['02 · PREPARAÇÃO','Localizar a frente, sinalizar riscos, conferir interfaces e separar materiais/equipamentos.'],
    ['03 · EXECUÇÃO','Executar por trecho ou unidade, seguindo a sequência e a responsabilidade atribuída.'],
    ['04 · MEDIÇÃO','Registrar quantidade produzida por local/data, reconciliar com caixa e validar o rendimento.'],
    ['05 · EVIDÊNCIA E ACEITE','Anexar fotos, laudos, notas e certificados; RT/encarregado confirma ou abre pendência.'],
    ['06 · PROPAGAÇÃO','Liberar a saída aceita, atualizar cronograma/mapa e notificar bloqueios, riscos ou atrasos.']
  ];
  return `<section class="operational-journey"><header><div><span class="eyebrow">OPERAÇÃO PONTA A PONTA · RESPONSABILIDADES</span><h2>Como esta frente acontece legalmente e no campo</h2><p>A execução só avança quando a entrada está documentada, a produção é medida, a evidência é anexada e o responsável confirma a saída. A IA organiza e sinaliza; não substitui o responsável técnico nem os aceites externos.</p></div><span class="planning-source">CATÁLOGO OPERACIONAL</span></header><div class="operational-lifecycle">${lifecycle.map(([title,text])=>`<article><small>${title}</small><p>${text}</p></article>`).join('')}</div><div class="operational-stage-columns"><article><span class="eyebrow">BASE DE CONFORMIDADE</span><ul>${operationalList(legal,'Projeto, licença e norma aplicável devem ser confirmados pelo RT.')}</ul></article><article><span class="eyebrow">PORTA DE SAÍDA DA FRENTE</span><p>O próximo estágio só recebe a produção após medição, evidência, aceite e registro da condição de liberação.</p><strong>${esc(activities[activities.length-1]?.release||'Aceite formal da etapa')}</strong></article></div><div class="operational-responsibility-table"><div class="operational-table-heading"><span class="eyebrow">MATRIZ DE RESPONSABILIDADE E PRODUÇÃO</span><small>${activities.length} atividades com sequência controlada</small></div><div class="operational-table-scroll"><table><thead><tr><th>Atividade</th><th>Responsável</th><th>Medida</th><th>Entrada / saída</th></tr></thead><tbody>${activities.map(item=>{const spec=item.operational||{};return `<tr><td><b>${esc(item.title)}</b><small>${esc(spec.description||'Execução controlada')}</small></td><td>${esc(spec.responsibility?.primary||'RT da frente')}<small>Apoio: ${esc(spec.responsibility?.support||'Encarregado e equipe')}</small></td><td>${esc(item.unit)}<small>${esc(spec.production?.method||'Medição confirmada por local e data')}</small></td><td><small>Entrada: ${esc((spec.entryConditions||[])[0]||'Frente liberada')}</small><b>${esc(item.release)}</b></td></tr>`;}).join('')}</tbody></table></div></div></section>`;
}
function operationalActivityMarkup(definition,item){
  const spec=item.operational||{},responsibility=spec.responsibility||{},production=spec.production||{};
  return `<section class="operational-activity-panel"><header><div><span class="eyebrow">FICHA OPERACIONAL · RESPONSABILIDADE E CONFORMIDADE</span><h2>Execução detalhada da atividade</h2><p>${esc(spec.description||'A atividade deve ser executada, medida, evidenciada e aceita antes de propagar a saída.')}</p></div><span class="planning-source">${esc(item.unit)} · ${esc(definition.key)}</span></header><div class="operational-detail-grid"><article><span class="eyebrow">RESPONSABILIDADE</span><strong>${esc(responsibility.primary||'Responsável técnico da frente')}</strong><p>Apoio: ${esc(responsibility.support||'Encarregado e equipe executora')}</p><small>Aprovação/aceite: ${esc(responsibility.approval||'RT ou órgão responsável quando aplicável')}</small></article><article><span class="eyebrow">BASE LEGAL / TÉCNICA</span><ul>${operationalList(spec.legalBasis)}</ul></article><article><span class="eyebrow">CONDIÇÕES DE ENTRADA</span><ul>${operationalList(spec.entryConditions)}</ul></article><article><span class="eyebrow">PRODUÇÃO E MEDIÇÃO</span><strong>${esc(production.method||`Medir ${item.unit} por frente, local e data`)}</strong><p><b>Fórmula:</b> ${esc(production.formula||'quantidade válida = soma das medições confirmadas')}</p><small><b>Ritmo:</b> ${esc(production.rate||'calibrar pelo histórico, equipe, máquina e caixa')}</small></article></div><div class="operational-detail-columns"><article><span class="eyebrow">PASSO A PASSO DE CAMPO</span><ol>${operationalList(spec.procedure)}</ol></article><article><span class="eyebrow">EQUIPAMENTOS E MATERIAIS</span><ul>${operationalList(spec.equipment||item.materials)}</ul><span class="eyebrow operational-subheading">SAÍDAS GERADAS</span><ul>${operationalList(spec.outputs||[item.release])}</ul></article><article><span class="eyebrow">EVIDÊNCIAS OBRIGATÓRIAS</span><ul>${operationalList(spec.evidence)}</ul><span class="eyebrow operational-subheading">CRITÉRIOS DE ACEITE</span><ul>${operationalList(spec.acceptance||[item.release])}</ul></article><article><span class="eyebrow">IMPEDIMENTOS E NOTIFICAÇÕES</span><ul>${operationalList(spec.conditions)}</ul><span class="eyebrow operational-subheading">DISPAROS AO SISTEMA</span><ul>${operationalList(spec.notifications,'Notificar apenas quando houver condição estruturada.')}</ul></article></div></section>`;
}

async function renderStage(){
  const definition=findWorkbenchStage(requestedStage);
  const [panorama,monitor,statePayload,attachmentPayload]=await Promise.all([api('/api/automation/panorama'),api('/api/automation/monitor'),api(`/api/workbench/state?stage=${encodeURIComponent(definition.key)}`),api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}`)]);
  const context=liveForStage(panorama,monitor,definition),stored=statePayload.state||{},calendarDate=validIsoDate(stored.calendarDate||context.automation.plannedStart);
  const inputSessions=normalizeInputSessions(definition,stored,calendarDate),flowActivities=buildFlowActivities(definition,inputSessions),layout={...defaultLayout(flowActivities),...(stored.layout||{})},links=stored.links?.length?stored.links:defaultLinks(definition);
  stageContext={definition,...context,layout,links,inputSessions,flowActivities,calendarDate,inputTimers:new Map(),scheduleContext:buildScheduleContext(context,calendarDate)};
  const dates=dateRange(stageContext.scheduleContext.automation.plannedStart,stageContext.scheduleContext.automation.plannedFinish,flowActivities.length),canvasWidth=Math.max(1180,flowActivities.length*246+100);
  const cards=flowActivities.map((item,index)=>flowCardMarkup(item,index,flowActivities.length)).join('');
  const production=context.automation.production||{},personnel=context.automation.personnel||{},materialPlan=context.automation.materialPlan||[],overlap=context.automation.overlapPlan||{};
  shell(`<main class="workbench-main"><a class="detail-back" href="/admin/workers">← Todas as etapas</a>${stageNavigation(definition)}<section class="workbench-hero"><div><span class="eyebrow">ETAPA · CRONOGRAMA GERADO PELO WORKER</span><h1>${esc(definition.title)}</h1><p>${esc(context.live.executionProfile?.typicalDescription||'Execução organizada por dependências, cobertura de caixa, materiais e fatos confirmados em campo.')}</p></div><div class="hero-live"><i></i><b>LOOP VIVO</b><span>Atualizado ${new Date(panorama.generatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div></section>${operationalStageMarkup(definition)}<section class="workbench-metrics"><article><small>ANDAMENTO</small><strong>${Math.round(context.progress)}%</strong><span>${esc(context.live.status||'planejada')}</span></article><article><small>CAIXA DA ETAPA</small><strong>${money(context.summary.budgetCents)}</strong><span>${Number(context.automation.cashCoverage)||0}% de cobertura</span></article><article><small>VOLUME BASE DWG</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong><span>ritmo ${esc(physicalValue(production.adjustedRate,production.rateUnit))}</span></article><article><small>EQUIPE REGISTRADA</small><strong>${esc(personnel.assignedHeadcount||0)}/${esc(personnel.requiredHeadcount||0)}</strong><span>${esc(personnel.status==='registration_pending'?'cadastro pendente':'equipe parcial ou suficiente')}</span></article><article><small>JANELA INFERIDA</small><strong>${fmtDate(context.automation.plannedStart)}</strong><span>até ${fmtDate(context.automation.plannedFinish)}</span></article></section><section class="planning-brief"><header><div><span class="eyebrow">PROJEÇÃO FÍSICA · DWG</span><h2>Base de produção desta frente</h2><p>Os números servem para agenda e priorização. Áreas/contagens são cartográficas; comprimentos e coeficientes devem ser validados no projeto executivo.</p></div><span class="planning-source">${esc(production.source||'calibration')}</span></header><div class="planning-brief-grid"><article><small>NECESSÁRIO</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong><span>${esc((production.basis||[])[0]||'Base de cálculo registrada no worker.')}</span></article><article><small>RITMO AJUSTADO</small><strong>${esc(physicalValue(production.adjustedRate,production.rateUnit))}</strong><span>caixa, materiais e equipe aplicados</span></article><article><small>MATERIAIS</small><strong>${number(materialPlan.length)} itens</strong><span>${esc(materialPlan.filter(item=>item.shortfallQuantity>0).length)} com falta quantitativa</span></article><article><small>RELAÇÃO</small><strong>${esc(overlap.mode||'sequencial')}</strong><span>${esc(overlap.rule||'Sem sobreposição operacional registrada.')}</span></article></div></section><section class="stage-inputs-panel"><header><div><span class="eyebrow">ENTRADAS DA ETAPA · IA</span><h2>Atividades, fatos e requisitos</h2><p>Escreva o fato ou a dependência de cada atividade. A compreensão é consultada imediatamente e a relação aprovada pela inferência é refletida no fluxograma.</p></div><div class="stage-input-actions"><label>Data compartilhada<input type="date" data-stage-calendar-date value="${esc(calendarDate)}"></label><button class="button button-primary" type="button" data-stage-input-add>Adicionar atividade</button></div></header><div class="stage-inputs-list" data-stage-inputs></div><footer class="stage-inputs-footer"><span>Arraste pelo controle ↕ para reorganizar as sessões.</span><span>A data acima é a mesma usada no cronograma abaixo.</span></footer></section><section class="timeline-panel"><header><div><span class="eyebrow">SUPERFÍCIE DE CALENDÁRIO · ${fmtDate(calendarDate)}</span><h2>Fluxograma operacional manipulável</h2><p>Cards adicionados acima entram aqui. Arraste os cards livremente e edite o rótulo de cada ligação; posições, data e dependências ficam salvas e auditadas.</p></div><div class="timeline-legend"><span><i class="blue"></i> atividade</span><span><i class="amber"></i> bloqueio</span><span><i class="green"></i> concluído</span></div></header><div class="flow-scroll"><div class="flow-surface" data-flow-surface style="width:${canvasWidth}px"><div class="calendar-axis">${dates.map(date=>`<time>${fmtDate(date)}</time>`).join('')}</div><svg data-flow-lines width="${canvasWidth}" height="490" aria-hidden="true"></svg><div data-flow-labels></div><div data-flow-cards>${cards}</div></div></div></section><section class="gate-grid"><article><span class="eyebrow">PORTÕES DE LIBERAÇÃO</span><ul>${definition.activities.map(item=>`<li>${esc(item.release)}</li>`).join('')}</ul></article><article><span class="eyebrow">LEITURA DO WORKER</span><ul><li>${esc(context.automation.nextStep||'Aguardando próximo ciclo.')}</li><li>Produção: ${esc(context.automation.production?.adjustedRate||'—')} ${esc(context.automation.production?.rateUnit||context.automation.production?.unit||'')}</li><li>${context.automation.materialAlerts?.length?esc(context.automation.materialAlerts.join(' · ')):'Sem alerta material calculado nesta leitura.'}</li></ul></article></section></main>`,'stage');
  const calendarPanel=document.querySelector('.timeline-panel');
  if(calendarPanel){const title=calendarPanel.querySelector('h2'),copy=calendarPanel.querySelector('header p');if(title)title.textContent='Calendário de atividades';if(copy)copy.textContent='Arraste os cards para encaixá-los nas linhas de data. Redimensione horizontalmente a janela de execução; a avaliação da IA aparece na borda inferior.';}
  setupStageInputs();drawConnections();enableDragging();mountAttachments(definition,attachmentPayload.attachments||[]);
}

function renderDiary(entries){
  const body=document.querySelector('[data-diary-body]');if(!body)return;
  body.innerHTML=entries.map(item=>`<tr><td>${esc(fmtDate(item.recordDate))}</td><td>${esc(item.responsible)}</td><td>${esc(item.production)} ${esc(item.unit)}</td><td><span class="table-status">${esc(item.status)}</span></td><td>${esc(item.notes||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-cell">Nenhum registro para esta atividade.</td></tr>';
}

async function renderActivity(){
  const activityId=params.get('activity')||'';
  const found=findWorkbenchActivity(requestedStage,activityId),definition=found.stage;
  const item=activityId==='new'?{
    id:'new',
    title:'Nova atividade',
    unit:'registro',
    release:'Definir requisito de saída',
    materials:['A definir após o escopo'],
    weight:1,
    operational:{production:{unit:'registro',method:'Registrar a unidade confirmada por frente, local e data',formula:'quantidade válida = soma das medições confirmadas'}}
  }:found.activity;
  const [panorama,monitor,diaryPayload,attachmentPayload]=await Promise.all([api('/api/automation/panorama'),api('/api/automation/monitor'),api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`),api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`)]);
  const context=liveForStage(panorama,monitor,definition),index=definition.activities.indexOf(item),[start,end]=activityDates(context,index,definition.activities.length),stageBudget=Number(context.summary.budgetCents)||0,totalWeight=definition.activities.reduce((sum,row)=>sum+row.weight,0),activityBudget=Math.round(stageBudget*item.weight/totalWeight),progress=inferredActivityProgress(context.progress,index,definition.activities.length);
  shell(`<main class="workbench-main activity-main"><a class="detail-back" href="/admin/workers/stage?stage=${encodeURIComponent(definition.key)}">← Fluxograma de ${esc(definition.title)}</a><section class="activity-hero"><div><span class="eyebrow">ATIVIDADE · ${String(index+1).padStart(2,'0')} / ${definition.activities.length}</span><h1>${esc(item.title)}</h1><p>Unidade de produção: <b>${esc(item.unit)}</b>. O worker recalcula agenda e prontidão quando recebe produção, material, evidência ou alteração do caixa.</p></div><span class="activity-state">${context.live.blockedBy?.length?'BLOQUEADA':'EM ACOMPANHAMENTO'}</span></section><section class="status-lines"><article><span>EXECUÇÃO</span><div><i style="width:${progress}%"></i></div><b>${Math.round(progress)}%</b></article><article><span>CAIXA</span><div><i style="width:${clamp(context.automation.cashCoverage||0,0,100)}%"></i></div><b>${Number(context.automation.cashCoverage)||0}%</b></article><article><span>MATERIAIS</span><div><i style="width:${clamp(context.automation.materialCoverage||0,0,100)}%"></i></div><b>${Number(context.automation.materialCoverage)||0}%</b></article></section><section class="activity-facts"><article><small>ORÇAMENTO PROPORCIONAL</small><strong>${money(activityBudget)}</strong><span>parcela estimada da etapa</span></article><article><small>RESPONSÁVEL</small><strong>${esc(context.owner)}</strong><span>confirmação humana obrigatória</span></article><article><small>INÍCIO</small><strong>${fmtDate(start)}</strong><span>cronograma do loop vivo</span></article><article><small>PREVISÃO</small><strong>${fmtDate(end)}</strong><span>sujeita a caixa e produção</span></article></section><section class="activity-columns"><article class="detail-block"><span class="eyebrow">MATERIAIS PRINCIPAIS</span><ul>${item.materials.map(material=>`<li>${esc(material)}</li>`).join('')}</ul></article><article class="detail-block"><span class="eyebrow">REQUISITO DE SAÍDA</span><h2>${esc(item.release)}</h2><p>Este aceite alimenta a relação com a atividade seguinte. A IA pode sugerir a propagação, mas a confirmação continua registrada por um perfil autorizado.</p></article><article class="detail-block"><span class="eyebrow">ESTRUTURA OPERACIONAL</span><dl><div><dt>Etapa</dt><dd>${esc(definition.title)}</dd></div><div><dt>Produção</dt><dd>${esc(context.automation.production?.adjustedRate||'—')} ${esc(context.automation.production?.rateUnit||item.unit)}</dd></div><div><dt>Bloqueios</dt><dd>${context.live.blockedBy?.length?esc(context.live.blockedBy.join(' · ')):'Nenhum bloqueio precedente'}</dd></div><div><dt>Próximo passo</dt><dd>${esc(context.automation.nextStep||'Aguardar fatos de campo')}</dd></div></dl></article></section><section class="diary-panel"><header><div><span class="eyebrow">DIÁRIO DE OBRA</span><h2>Registros da atividade</h2><p>Cada lançamento vira fato de campo auditável e dispara a próxima leitura operacional.</p></div><button class="button button-primary" data-toggle-diary>Novo registro</button></header><form class="diary-form" data-diary-form hidden><label>Data<input type="date" name="recordDate" value="${new Date().toISOString().slice(0,10)}" required></label><label>Responsável<input name="responsible" value="${esc(context.owner)}" required></label><label>Produção<input type="number" name="production" min="0" step="0.01"></label><label>Unidade<input name="unit" value="${esc(item.unit)}"></label><label>Status<select name="status"><option>registrado</option><option>em execução</option><option>concluído</option><option>bloqueado</option></select></label><label class="wide">Observações<textarea name="notes" rows="3" required placeholder="Serviço executado, frente, condições, evidências e pendências"></textarea></label><div class="wide form-actions"><button type="button" class="button" data-cancel-diary>Cancelar</button><button class="button button-primary">Registrar e propagar</button></div></form><div class="diary-table-wrap"><table><thead><tr><th>Data</th><th>Responsável</th><th>Produção</th><th>Status</th><th>Registro</th></tr></thead><tbody data-diary-body></tbody></table></div></section></main>`,'activity');
  const operationalPanel=document.createElement('div');operationalPanel.innerHTML=operationalActivityMarkup(definition,item);document.querySelector('.activity-columns')?.before(operationalPanel.firstElementChild);
  renderDiary(diaryPayload.entries||[]);mountAttachments(definition,attachmentPayload.attachments||[],item);
  const mapEditor=document.createElement('section');mapEditor.className='activity-map-editor-shell';mapEditor.dataset.activityMapEditor='';mapEditor.dataset.stage=definition.key;mapEditor.dataset.activity=item.id;mapEditor.dataset.progress=String(Math.round(progress));mapEditor.innerHTML='<div class="activity-map-editor-loading"><span class="eyebrow">LOCAL FÍSICO DA ATIVIDADE</span><h2>Preparando o modelo 3D…</h2><p>Os polígonos reais do loteamento serão disponibilizados para pintura.</p></div>';document.querySelector('.activity-columns')?.before(mapEditor);await import('./activity-map-editor.mjs?v=2');
  const form=document.querySelector('[data-diary-form]');document.querySelector('[data-toggle-diary]').addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden)form.elements.notes.focus();});document.querySelector('[data-cancel-diary]').addEventListener('click',()=>form.hidden=true);
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),payload=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent='Propagando…';try{const response=await api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,activityId:item.id})});const entries=(await api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`)).entries||[response.entry];renderDiary(entries);form.reset();form.hidden=true;document.querySelector('[data-sync-state]').textContent='Registro propagado ao loop operacional';}catch(error){document.querySelector('[data-sync-state]').textContent=`Falha no registro: ${error.message}`;}finally{button.disabled=false;button.textContent='Registrar e propagar';}});
}

/* Rebuild each input as an independent vertical execution section. The declaration is intentionally kept here so the existing stage bootstrap uses this richer renderer. */
function renderStageInputSessions(){
  const target=document.querySelector('[data-stage-inputs]');if(!target||!stageContext)return;
  target.innerHTML=stageContext.inputSessions.map((session,index)=>{
    session.automation=normalizeInputAutomation(session.automation);
    const automation=session.automation;
    return `<form class="stage-input-card ${session.custom?'is-custom':''}" draggable="true" data-stage-input-card="${esc(session.id)}"><header><button type="button" class="input-drag-handle stage-input-editor-only" data-stage-input-drag aria-label="Reordenar entrada ${index+1}">↕</button><div><span class="eyebrow">ENTRADA ${String(index+1).padStart(2,'0')} · ${session.custom?'NOVA ATIVIDADE':'ATIVIDADE DO CATÁLOGO'}</span><b>${esc(session.calendarDate===stageContext.calendarDate?'Data compartilhada':'Data sincronizada')}</b></div>${session.custom?'<button type="button" class="input-remove stage-input-editor-only" data-stage-input-remove aria-label="Remover atividade adicionada">×</button>':''}</header><div class="stage-input-view"><h3>${esc(session.title)}</h3><p>${esc(session.text||'Sem descrição registrada. Abra Editar compreensão para adicionar a lógica operacional.')}</p><div class="stage-input-view-meta"><span>${esc(session.unit||'Unidade a definir')}</span><span>${esc(session.release||'Sem dependência informada')}</span><span data-stage-input-view-status>${session.inference?.summary?'Compreensão disponível':'Aguardando compreensão'}</span></div><div data-stage-input-inference="${esc(session.id)}"></div></div><div class="stage-input-editor-only stage-input-editor"><div class="stage-input-fields"><label>Atividade<input data-stage-input-title="${esc(session.id)}" value="${esc(session.title)}" placeholder="Nome da atividade"></label><label>Descrição, fato, requisito ou dependência<textarea data-stage-input-text="${esc(session.id)}" rows="3" placeholder="Descreva a lógica que o endpoint deve compreender">${esc(session.text)}</textarea></label></div><section class="stage-input-execution"><header><div><span class="eyebrow">CONTROLES DA ENTRADA</span><strong>Propagação e geração</strong><p>Escolha quais saídas esta compreensão pode atualizar no ciclo operacional.</p></div><div class="stage-input-execution-actions"><button type="button" class="button" data-stage-input-run="${esc(session.id)}">Compreender agora</button><button type="button" class="button button-primary" data-stage-input-cycle="${esc(session.id)}">Executar diretrizes</button></div></header><div class="stage-input-options"><label class="stage-input-check"><input type="checkbox" data-stage-input-option="propagateRelations" data-stage-input-id="${esc(session.id)}"${automation.propagateRelations?' checked':''}><span><b>Propagar relações</b><small>Atualiza vínculos e requisitos do fluxograma.</small></span></label><label class="stage-input-check"><input type="checkbox" data-stage-input-option="generateSchedule" data-stage-input-id="${esc(session.id)}"${automation.generateSchedule?' checked':''}><span><b>Gerar cronograma</b><small>Leva a data compartilhada para agenda e dependências.</small></span></label><label class="stage-input-check"><input type="checkbox" data-stage-input-option="generateResources" data-stage-input-id="${esc(session.id)}"${automation.generateResources?' checked':''}><span><b>Recalcular materiais e equipe</b><small>Reavalia recursos, produção e cobertura da etapa.</small></span></label><label class="stage-input-check"><input type="checkbox" data-stage-input-option="notifyWorker" data-stage-input-id="${esc(session.id)}"${automation.notifyWorker?' checked':''}><span><b>Avisar o worker</b><small>Registra a mudança para a próxima leitura operacional.</small></span></label></div></section><footer><time>Data do cronograma · ${fmtDate(stageContext.calendarDate)}</time><span data-stage-input-inference="${esc(session.id)}"></span></footer></div></form>`;
  }).join('');
  enhanceInputFieldLayouts(target);
  bindInputProperties(target);
  target.querySelectorAll('[data-stage-input-card]').forEach((card,index)=>{const session=stageContext.inputSessions[index];if(!session)return;const options=card.querySelector('.stage-input-options');if(options)options.innerHTML=inputProgrammingMarkup(session);const settings=document.createElement('div');settings.className='stage-input-settings';settings.innerHTML=inputProgrammingSettingsMarkup(session);card.querySelector('.stage-input-execution')?.append(settings);});
  target.querySelectorAll('[data-stage-input-card]').forEach((card,index)=>{const session=stageContext.inputSessions[index];if(!session)return;const production=document.createElement('section');production.className='stage-input-production';production.dataset.stageInputProduction='';production.innerHTML=inputProductionMarkupEditable(session);card.querySelector('.stage-input-execution')?.after(production);});
  enhanceInputProductionPaper(target);
  bindInputProductionEditors(target);
  stageContext.inputSessions.forEach(renderInputInference);
  target.querySelectorAll('[data-stage-input-title],[data-stage-input-text]').forEach(field=>field.addEventListener('input',event=>{const id=event.currentTarget.dataset.stageInputTitle||event.currentTarget.dataset.stageInputText,session=stageContext.inputSessions.find(item=>item.id===id);if(!session)return;if(event.currentTarget.dataset.stageInputTitle){session.title=event.currentTarget.value;stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();}else session.text=event.currentTarget.value;queueStateSave();queueInputInference(session);}));
  target.querySelectorAll('[data-stage-input-option]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputOption,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.automation=normalizeInputAutomation(session.automation);session.automation[key]=event.currentTarget.checked;if(key==='propagateRelations')applyInputRelation(session,session.inference);else queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretriz da entrada atualizada';}));
  target.querySelectorAll('[data-stage-input-option][data-stage-input-store="programming"]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputOption,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.programming=normalizeInputProgramming(session.programming,session);session.programming[key]=event.currentTarget.checked;queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';}));
  target.querySelectorAll('[data-stage-input-setting]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputSetting,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.programming=normalizeInputProgramming(session.programming,session);session.programming[key]=event.currentTarget.value;queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';}));
  target.querySelectorAll('[data-stage-input-run]').forEach(button=>button.addEventListener('click',async()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputRun);if(!session)return;clearTimeout(stageContext.inputTimers.get(session.id));button.disabled=true;button.textContent='Analisando…';try{await inferStageInput(session);}finally{button.disabled=false;button.textContent='Compreender agora';}}));
  target.querySelectorAll('[data-stage-input-cycle]').forEach(button=>button.addEventListener('click',async()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputCycle);if(!session)return;clearTimeout(stageContext.inputTimers.get(session.id));button.disabled=true;button.textContent='Executando…';try{await inferStageInput(session);stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretrizes executadas e propagadas ao cronograma';}finally{button.disabled=false;button.textContent='Executar diretrizes';}}));
  target.querySelectorAll('[data-stage-input-title]').forEach(field=>field.addEventListener('change',()=>{stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();}));
  target.querySelectorAll('[data-stage-input-remove]').forEach(button=>button.addEventListener('click',()=>{const card=button.closest('[data-stage-input-card]'),session=stageContext.inputSessions.find(item=>item.id===card?.dataset.stageInputCard);if(!session)return;stageContext.inputSessions=stageContext.inputSessions.filter(item=>item.id!==session.id);stageContext.flowActivities=stageContext.flowActivities.filter(item=>item.id!==session.activityId);stageContext.links=stageContext.links.filter(link=>link.from!==session.activityId&&link.to!==session.activityId&&link.sourceId!==session.id);delete stageContext.layout[session.activityId];renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();}));
  target.querySelectorAll('[data-stage-input-card]').forEach(card=>{card.addEventListener('dragstart',event=>{if(!event.target.closest('[data-stage-input-drag]')){event.preventDefault();return;}card.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',card.dataset.stageInputCard);});card.addEventListener('dragend',()=>card.classList.remove('is-dragging'));card.addEventListener('dragover',event=>{event.preventDefault();card.classList.add('is-drop-target');});card.addEventListener('dragleave',()=>card.classList.remove('is-drop-target'));card.addEventListener('drop',event=>{event.preventDefault();card.classList.remove('is-drop-target');const fromId=event.dataTransfer.getData('text/plain'),toId=card.dataset.stageInputCard;if(!fromId||fromId===toId)return;const from=stageContext.inputSessions.findIndex(item=>item.id===fromId),to=stageContext.inputSessions.findIndex(item=>item.id===toId);if(from<0||to<0)return;const [moved]=stageContext.inputSessions.splice(from,1);stageContext.inputSessions.splice(to,0,moved);stageContext.inputSessions.forEach((item,index)=>item.order=index);renderStageInputSessions();queueStateSave();});});
}
try{await (isActivity?renderActivity():renderStage());}
catch(error){shell(`<main class="workbench-main"><a class="detail-back" href="/admin/workers">← Monitoria</a><section class="activity-hero"><div><span class="eyebrow">FALHA DE CARREGAMENTO</span><h1>Não foi possível abrir o acompanhamento</h1><p>${esc(error.message)}</p></div></section></main>`,'error');}
