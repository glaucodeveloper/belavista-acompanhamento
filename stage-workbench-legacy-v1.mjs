const root=document.querySelector('[data-worker-app]');
const params=new URLSearchParams(location.search);
const requestedStage=params.get('stage')||'project';
const isActivityRecord=/\/activity\/record\/?$/.test(location.pathname),isActivity=/\/activity\/?$/.test(location.pathname);
// A rota já passou pelo gate de sessão em admin-workers.js. Carrega o bundle
// TypeScript da interface; o editor 3D continua sob demanda apenas na atividade.
const componentsTs=await import('./dist/frontend/components.js');
const programTs=await import('./dist/frontend/program.js').catch(()=>null);
const stageWorkbenchFallback=Array.isArray(programTs?.WORKER_STAGE_WORKBENCH_CATALOG_V1)?null:await import('./stage-workbench-data.mjs');
const STAGE_WORKBENCH=programTs?.WORKER_STAGE_WORKBENCH_CATALOG_V1||stageWorkbenchFallback.STAGE_WORKBENCH;
const findWorkbenchStage=programTs?.findWorkerWorkbenchStageV1||stageWorkbenchFallback?.findWorkbenchStage;
const findWorkbenchActivity=programTs?.findWorkerWorkbenchActivityV1||stageWorkbenchFallback?.findWorkbenchActivity;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const materialRows=value=>Array.isArray(value)?value.map(item=>typeof item==='string'?{name:item}:item&&typeof item==='object'?item:null).filter(item=>item&&String(item.name||item.title||'').trim()):[];
const materialNames=value=>materialRows(value).map(item=>String(item.name||item.title||'').trim()).filter(Boolean);
const materialLabel=item=>[item?.name||item?.title,item?.description,item?.usage||item?.use].map(value=>String(value||'').trim()).filter(Boolean).join(' — ');
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
const legacyApi=async(path,options={})=>{await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve());const actor=globalThis.BELAVISTA_ADMIN_ACTOR||{};let token='';try{token=await globalThis.BELAVISTA_GET_ID_TOKEN?.()||'';}catch{}const extra=Object.fromEntries(new Headers(options.headers||{}).entries());const response=await fetch(path,{cache:'no-store',...options,headers:{'x-belavista-role':actor.role||'owner','x-belavista-user':actor.uid||'workbench-local','x-belavista-name':actor.name||'Operação',...(token?{authorization:`Bearer ${token}`}:{ }),...extra}});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload;};
const api=programTs?.createWorkerWorkbenchApiV1?.({fetcher:(path,init)=>fetch(path,init),waitForAuth:()=>globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(),currentActor:()=>globalThis.BELAVISTA_ADMIN_ACTOR||{},currentIdToken:()=>globalThis.BELAVISTA_GET_ID_TOKEN?.()})||legacyApi;
root.dataset.apiTransportOwnerV1=typeof programTs?.createWorkerWorkbenchApiV1==='function'?'typescript':'legacy';
root.dataset.inputInferenceCommandOwnerV1=typeof programTs?.requestWorkerWorkbenchStageInputInferenceV1==='function'?'typescript':'legacy';

function shell(content,mode='stage'){
  root.className=`worker-app workbench-app mode-${mode}`;
  const notificationMarkup=componentsTs?.renderAtlasWorkerNotificationMarkupV1?.()||{triggerMarkup:'<button type="button" data-notification-toggle aria-haspopup="dialog" aria-controls="notification-widget"><span>Notificações</span><b data-notification-count>0</b></button>',panelMarkup:'<div class="notification-backdrop" data-notification-backdrop></div><aside class="notification-widget" id="notification-widget" data-notification-widget role="dialog" aria-modal="true" aria-labelledby="notification-title" aria-hidden="true"><header><div><span class="eyebrow">WORKER · TEMPO REAL</span><h2 id="notification-title">Notificações</h2></div><button type="button" data-notification-close aria-label="Fechar notificações">×</button></header><div class="notification-summary"><strong data-notification-summary>Carregando alertas…</strong><button type="button" data-notification-refresh>Atualizar</button></div><div class="notification-list" data-notification-list><div class="notification-empty">Abra o widget para consultar os alertas.</div></div></aside>'};
  root.innerHTML=`<header class="worker-header workbench-header"><a class="worker-brand" href="${runtimeRouteV1('/admin/workers')}"><span class="brand-symbol">◢</span><span><strong>ALIANÇA PARK</strong><small>CONTROLE DE OBRA · LOOP VIVO</small></span></a><nav>${notificationMarkup.triggerMarkup}<a href="${runtimeRouteV1('/admin/workers')}">Monitoria</a><a href="${runtimeRouteV1('/admin')}">Administrativo</a></nav></header>${content}${notificationMarkup.panelMarkup}<footer class="worker-footer"><span>Aliança Park · acompanhamento operacional</span><span data-sync-state>Conectado ao estado do worker</span></footer>`;
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
  const typedReady=Boolean(programTs?.projectWorkerNotificationCollectionV1&&programTs?.projectWorkerNotificationReadV1&&programTs?.loadWorkerNotificationCollectionV1&&programTs?.markWorkerNotificationReadV1&&typeof componentsTs.installAtlasWorkerNotificationWidgetV1==='function');
  if(typedReady&&componentsTs.installAtlasWorkerNotificationWidgetV1({root,load:()=>programTs.loadWorkerNotificationCollectionV1(api),markRead:id=>programTs.markWorkerNotificationReadV1(id,api),project:programTs.projectWorkerNotificationCollectionV1,projectRead:programTs.projectWorkerNotificationReadV1}))return;
  const toggle=document.querySelector('[data-notification-toggle]'),widget=document.querySelector('[data-notification-widget]'),backdrop=document.querySelector('[data-notification-backdrop]'),close=document.querySelector('[data-notification-close]'),refresh=document.querySelector('[data-notification-refresh]');if(!toggle||!widget)return;
  const setOpen=open=>{widget.classList.toggle('is-open',open);backdrop.classList.toggle('is-open',open);widget.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('notification-widget-open',open);if(open){loadNotifications();close.focus();}else toggle.focus();};
  toggle.addEventListener('click',()=>setOpen(true));close.addEventListener('click',()=>setOpen(false));backdrop.addEventListener('click',()=>setOpen(false));refresh.addEventListener('click',loadNotifications);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&widget.classList.contains('is-open'))setOpen(false);},{once:false});void loadNotifications();
}

function legacy_liveForStage(panorama,monitor,definition){
  const aliases=new Set([definition.key,...definition.aliases]);
  const live=panorama.stages?.find(item=>aliases.has(item.key))||{};
  const monitorStage=monitor.stages?.find(item=>aliases.has(item.key))||{};
  const operationalStage=monitor.operational?.stages?.find(item=>aliases.has(item.key))||{};
  const summary={...monitorStage,...operationalStage};
  return {live,summary,automation:live.automation||{},progress:Number(live.progress??summary.progress)||0,owner:live.owner||summary.owner||'Responsável a definir'};
}
const liveForStage=programTs?.projectWorkerWorkbenchStageContextV1||legacy_liveForStage;

function legacy_inferredActivityProgress(stageProgress,index,total){
  return clamp(((Number(stageProgress)||0)/100*total-index)*100,0,100);
}
const inferredActivityProgress=programTs?.projectWorkerWorkbenchActivityProgressV1||legacy_inferredActivityProgress;

function legacyWorkerActivityPageProjection(definition,item,context,today=todayIso()){
  const total=Math.max(1,definition.activities.length),found=definition.activities.findIndex(row=>String(row.id)===String(item.id));
  const index=Math.max(0,found),automation=context.automation||{},start=/^\d{4}-\d{2}-\d{2}$/.test(String(automation.plannedStart||''))?String(automation.plannedStart):today;
  const finish=/^\d{4}-\d{2}-\d{2}$/.test(String(automation.plannedFinish||''))?String(automation.plannedFinish):start;
  const from=new Date(`${start}T12:00:00`),to=new Date(`${finish}T12:00:00`),span=Math.max(total,(to-from)/86400000),segment=span/total;
  const activityStart=new Date(from),activityEnd=new Date(from),offset=Math.floor(segment*index);
  activityStart.setDate(from.getDate()+offset);activityEnd.setDate(from.getDate()+Math.max(Math.floor(segment*(index+1)),offset+1));
  const operation=item.operational||{},responsibility=operation.responsibility||{},totalWeight=definition.activities.reduce((sum,row)=>sum+(Number(row.weight)||0),0),stageBudget=Number(context.summary?.budgetCents)||0;
  const responsible=String(item.responsible||responsibility.primary||context.owner||'');
  return {definition,item,context,index,total:definition.activities.length,start:activityStart.toISOString().slice(0,10),end:activityEnd.toISOString().slice(0,10),activityBudgetCents:totalWeight?Math.round(stageBudget*(Number(item.weight)||0)/totalWeight):0,progress:inferredActivityProgress(context.progress,index,total),cashCoverage:clamp(Number(automation.cashCoverage)||0,0,100),materialCoverage:clamp(Number(automation.materialCoverage)||0,0,100),blocked:Boolean(context.live?.blockedBy?.length),responsible,today,editDraft:{stageKey:definition.key,nature:operation.nature||'Execução operacional',name:item.title,description:operation.description||'',unit:item.unit||'registro',responsible,release:item.release||'',target:'',evidence:Array.isArray(operation.evidence)?operation.evidence.join(' · '):String(operation.evidence||'')}};
}

function dateRange(start,end,count){
  const from=new Date(`${start||new Date().toISOString().slice(0,10)}T12:00:00`),to=new Date(`${end||start||new Date().toISOString().slice(0,10)}T12:00:00`);
  const span=Math.max(1,Math.round((to-from)/86400000));
  return Array.from({length:Math.min(10,Math.max(6,count+1))},(_,index)=>{const date=new Date(from);date.setDate(from.getDate()+Math.round(span*index/Math.max(1,Math.min(10,Math.max(6,count+1))-1)));return date.toISOString().slice(0,10);});
}

function legacy_defaultLayout(activities){
  return Object.fromEntries(activities.map((item,index)=>[item.id,{x:58+index*246,y:96+(index%2)*178}]));
}

function legacy_defaultLinks(definition){
  return definition.activities.slice(1).map((item,index)=>({from:definition.activities[index].id,to:item.id,label:index===0?'libera após aceite':'depende da liberação anterior'}));
}


const defaultLayout=programTs?.projectWorkerWorkbenchDefaultLayoutV1||legacy_defaultLayout;
const defaultLinks=programTs?.projectWorkerWorkbenchDefaultLinksV1||legacy_defaultLinks;
const defaultInputAutomation=programTs?.defaultWorkerWorkbenchAutomationV1||legacy_defaultInputAutomation;
const normalizeInputAutomation=programTs?.normalizeWorkerWorkbenchAutomationV1||legacy_normalizeInputAutomation;
const inputProgrammingProfile=programTs?.projectWorkerWorkbenchInputProfileV1||legacy_inputProgrammingProfile;
const defaultInputProgramming=programTs?.defaultWorkerWorkbenchProgrammingV1||legacy_defaultInputProgramming;
const normalizeInputProgramming=programTs?.normalizeWorkerWorkbenchProgrammingV1||legacy_normalizeInputProgramming;
const defaultInputProperties=programTs?.defaultWorkerWorkbenchPropertiesV1||legacy_defaultInputProperties;
const normalizeInputProperties=programTs?.normalizeWorkerWorkbenchPropertiesV1||legacy_normalizeInputProperties;
const defaultInputSessions=programTs?.createWorkerWorkbenchInputSessionsV1||legacy_defaultInputSessions;
const normalizeInputSessions=programTs?.normalizeWorkerWorkbenchInputSessionsV1
  ?(definition,stored,calendarDate)=>programTs.normalizeWorkerWorkbenchInputSessionsV1(definition,stored,calendarDate,newClientId)
  :legacy_normalizeInputSessions;
const flowActivityFromInput=programTs?.projectWorkerWorkbenchFlowActivityV1||legacy_flowActivityFromInput;
const buildFlowActivities=programTs?.projectWorkerWorkbenchFlowActivitiesV1||legacy_buildFlowActivities;
const buildScheduleContext=programTs?.projectWorkerWorkbenchScheduleContextV1||legacy_buildScheduleContext;

let stageContext=null,legacySaveTimer=null;
const typedQueueStateSave=programTs?.createWorkerWorkbenchStageStateSaveCoordinatorV1?.({getContext:()=>stageContext,request:api,setStatus:message=>{const status=document.querySelector('[data-sync-state]');if(status)status.textContent=message;}})||null;
let inputDisplayMode='view';
const todayIso=()=>new Date().toISOString().slice(0,10);
const validIsoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):todayIso();
const newClientId=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`}`;
function legacy_defaultInputAutomation(){return {propagateRelations:true,generateSchedule:true,generateResources:true,notifyWorker:true};}
function legacy_normalizeInputAutomation(value){
  const source=value&&typeof value==='object'?value:{};
  const defaults=legacy_defaultInputAutomation();
  return Object.fromEntries(Object.keys(defaults).map(key=>[key,source[key]!==false]));
}
function legacy_inputProgrammingProfile(session){
  const unit=String(session?.unit||'').trim().toLocaleLowerCase('pt-BR');
  const text=`${session?.title||''} ${session?.text||''} ${session?.release||''} ${materialRows(session?.materials).map(materialLabel).join(' ')}`.toLocaleLowerCase('pt-BR');
  const quantified=/m³|m²|\bm\b|un|ponto|trecho|setor|viagem|lote|ramal|cavalete|ensaio|processo/.test(unit);
  const physical=!/processo|dossiê|termo|ensaio/.test(unit)&&!/aprova[cç][aã]o|protocolo|dossi[eê]|termo/.test(text);
  const hasMaterials=Boolean(session?.materials?.length)||/material|equipamento|m[aá]quina|insumo|tubo|concreto|brita|areia/.test(text);
  const hasDependency=Boolean(session?.release)||/antes|depois|libera|depend|aceite|bloque/.test(text);
  const productionBasis=/m³/.test(unit)?'volume':/m²/.test(unit)?'area':/\bm\b/.test(unit)?'comprimento':/viagem|lote|ramal|cavalete|un|ponto|trecho|setor|ensaio|processo/.test(unit)?'contagem':'registro';
  return {unit,quantified,physical,hasMaterials,hasDependency,productionBasis};
}
function legacy_defaultInputProgramming(session){
  const profile=inputProgrammingProfile(session);
  return {scheduleMode:profile.quantified?'production':profile.hasDependency?'sequential':'parallel',productionModeEnabled:profile.quantified,productionBasis:profile.productionBasis,mapLocation:profile.physical,requireAcceptance:profile.hasDependency};
}
function legacy_normalizeInputProgramming(value,session){
  const source=value&&typeof value==='object'?value:{};
  const defaults=defaultInputProgramming(session);
  const modes=['sequential','parallel','production'];
  return {scheduleMode:modes.includes(String(source.scheduleMode))?String(source.scheduleMode):defaults.scheduleMode,productionModeEnabled:defaults.productionModeEnabled&&source.productionModeEnabled!==false,productionBasis:String(source.productionBasis||defaults.productionBasis),mapLocation:defaults.mapLocation&&source.mapLocation!==false,requireAcceptance:defaults.requireAcceptance&&source.requireAcceptance!==false};
}
function legacy_inputProgrammingModes(session){
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
  const options=programTs?.projectWorkerWorkbenchProgrammingOptionsV1?.(session)||legacy_inputProgrammingModes(session).map(mode=>({ ...mode, checked:mode.storage==='automation'?normalizeInputAutomation(session.automation)[mode.key]!==false:normalizeInputProgramming(session.programming,session)[mode.key]===true }));
  return componentsTs.renderAtlasWorkerInputProgrammingOptionsV1({id:session.id,options});
}
function inputProgrammingSettingsMarkup(session){
  const profile=inputProgrammingProfile(session),programming=normalizeInputProgramming(session.programming,session),options=profile.quantified?['volume','area','comprimento','contagem','registro'].filter((item,index,array)=>array.indexOf(item)===index):['registro'];
  return componentsTs.renderAtlasWorkerInputProgrammingSettingsV1({id:session.id,unit:session.unit||'registro',scheduleMode:programming.scheduleMode,productionBasis:programming.productionBasis,bases:options});
}
function legacy_defaultInputProperties(session){
  const spec=session.operational||{};
  const responsibility=spec.responsibility||{};
  return [
    {id:`${session.id}-unit`,label:'Unidade de produção',value:String(session.unit||spec.production?.unit||'registro')},
    {id:`${session.id}-materials`,label:'Materiais e equipamentos',value:materialRows(session.materials||spec.materials||spec.equipment).map(materialLabel).join(', ')||'A definir'},
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
function legacy_normalizeInputProperties(value,session){
  const defaults=defaultInputProperties(session),existing=Array.isArray(value)?value:[];
  const source=existing.length?[...existing,...defaults.filter(item=>!existing.some(row=>String(row?.id||'')===item.id))]:defaults;
  return source.slice(0,30).map((item,index)=>({id:String(item?.id||`${session.id}-property-${index}`),label:String(item?.label||`Propriedade ${index+1}`),value:String(item?.value??'')}));
}
function inputPropertiesMarkup(session){
  const properties=normalizeInputProperties(session.properties,session);
  return componentsTs.renderAtlasWorkerInputPropertiesV1({id:session.id,properties});
}
function updateInputProperty(session,index,key,value){
  if(programTs?.updateWorkerWorkbenchInputPropertyV1)programTs.updateWorkerWorkbenchInputPropertyV1(session,index,key,value);else{session.properties=normalizeInputProperties(session.properties,session);const property=session.properties[index];if(!property)return;property[key]=String(value);}queueStateSave();
}
function addInputProperty(session){
  if(programTs?.addWorkerWorkbenchInputPropertyV1)programTs.addWorkerWorkbenchInputPropertyV1(session,newClientId);else{session.properties=normalizeInputProperties(session.properties,session);session.properties.push({id:newClientId('property'),label:'Nova propriedade',value:''});}renderStageInputSessions();queueStateSave();
}
function removeInputProperty(session,index){
  if(programTs?.removeWorkerWorkbenchInputPropertyV1)programTs.removeWorkerWorkbenchInputPropertyV1(session,index);else{session.properties=normalizeInputProperties(session.properties,session);session.properties.splice(index,1);}renderStageInputSessions();queueStateSave();
}
function insertInputProperty(session,index){
  session.properties=normalizeInputProperties(session.properties,session);const description=[...document.querySelectorAll('[data-stage-input-text]')].find(field=>field.dataset.stageInputText===session.id);if(!description)return;const start=description.selectionStart??description.value.length,end=description.selectionEnd??start,projected=programTs?.projectWorkerWorkbenchPropertyTokenInsertionV1?.(session,index,description.value,start,end);if(projected){description.value=projected.text;session.text=projected.text;description.focus();description.selectionStart=projected.selectionStart;description.selectionEnd=projected.selectionEnd;}else{const property=session.properties[index];if(!property)return;const token=`{{${property.label||'propriedade'}}}`;description.value=`${description.value.slice(0,start)}${token}${description.value.slice(end)}`;session.text=description.value;description.focus();description.selectionStart=description.selectionEnd=start+token.length;}queueInputInference(session);queueStateSave();
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
function legacy_inputProductionPreview(session){
  const profile=inputProgrammingProfile(session),programming=normalizeInputProgramming(session.programming,session),unit=session.unit||'registro',basis=programming.productionBasis||profile.productionBasis,labels={volume:'Volume executado',area:'Área executada',comprimento:'Comprimento executado',contagem:'Itens ou unidades executados',registro:'Registro confirmado'},reference=unit==='m³'?'ritmo calibrado em m³/dia':unit==='m²'?'ritmo calibrado em m²/dia':unit==='m'?'ritmo calibrado em m/dia':`ritmo calibrado em ${unit}/dia`,conditions=[{kind:'rendimento',label:'Rendimento',trigger:`notificar o dono se a produção confirmada ficar abaixo do ${reference} ou for registrada como bloqueada`,severity:'warning'}];
  conditions.push({kind:'solo',label:'Solo e campo',trigger:'notificar quando solo, greide, cota, chuva, lama ou umidade impedirem a execução',severity:'warning'});
  if(session.release)conditions.push({kind:'dependência',label:'Dependência',trigger:`notificar se o requisito “${session.release}” estiver pendente, recusado ou bloqueando`,severity:'info'});
  if(session.materials?.length)conditions.push({kind:'material',label:'Materiais',trigger:`notificar se faltar ou atrasar: ${materialRows(session.materials).map(materialLabel).join(', ')}`,severity:'warning'});
  return {basis,basisLabel:labels[basis]||labels.registro,unit,measureForm:`Registrar ${unit} por frente/local e por data, com confirmação do responsável.`,quantityFormula:`quantidade válida = soma das medições confirmadas em ${unit}`,durationFormula:`duração = teto(quantidade total ÷ ritmo ajustado de ${unit}/dia)`,referenceRate:reference,totalQuantity:'calculada no plano da etapa',conditions,source:'Prévia local até a compreensão estruturada da IA'};
}
function inputProductionPreview(session){return programTs?.projectWorkerWorkbenchProductionPreviewV1?.(session)||legacy_inputProductionPreview(session);}
function legacy_inputProductionDraft(session){
  const preview=legacy_inputProductionPreview(session),inference=session.inference&&typeof session.inference==='object'?session.inference:{},spec={...preview,...(inference.production&&typeof inference.production==='object'?inference.production:{})},conditions=Array.isArray(inference.conditions)?inference.conditions:preview.conditions;
  return {spec,conditions};
}
function inputProductionDraft(session){return programTs?.projectWorkerWorkbenchProductionDraftV1?.(session)||legacy_inputProductionDraft(session);}
function inputConditionTokens(value){
  if(Array.isArray(value))return value.map(item=>String(item).trim()).filter(Boolean);
  return String(value||'').split(',').map(item=>item.trim()).filter(Boolean);
}
function inputConditionRoles(value){
  return inputConditionTokens(value).map(role=>({dono:'owner',proprietario:'owner',encarregado:'foreman',worker:'foreman'}[role.toLocaleLowerCase('pt-BR')]||role));
}
function legacy_ensureInputProductionDraft(session){
  const preview=legacy_inputProductionPreview(session),existing=session.inference&&typeof session.inference==='object'?session.inference:{},production={...preview,...(existing.production&&typeof existing.production==='object'?existing.production:{})},conditions=Array.isArray(existing.conditions)?existing.conditions.map(row=>({...row})):preview.conditions.map(row=>({...row}));
  session.inference={...existing,manual:true,loading:false,confidence:Number(existing.confidence)||0,production,conditions,notificationPolicy:existing.notificationPolicy||{enabled:normalizeInputAutomation(session.automation).notifyWorker,mode:'pseudo-listener',trigger:'structured-condition-match',primaryRecipient:'owner',deduplicateBy:'stage/activity/condition/event',externalMessaging:'disabled'}};
  return session.inference;
}
function ensureInputProductionDraft(session){return programTs?.ensureWorkerWorkbenchProductionDraftV1?.(session)||legacy_ensureInputProductionDraft(session);}
function inputProductionMarkupEditable(session){
  const {spec,conditions}=inputProductionDraft(session);
  return componentsTs.renderAtlasWorkerInputProductionEditorV1({id:session.id,sessionUnit:session.unit||'registro',manual:Boolean(session.inference?.manual),spec,conditions});
}
function updateInputProductionField(session,key,value){
  const result=programTs?.updateWorkerWorkbenchProductionFieldV1?.(session,key,String(value));
  if(result){if(result.unitChanged){targetInputProductionFields(session,'unit').forEach(field=>{if(field.value!==result.unit)field.value=result.unit;});stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();}}
  else{const inference=ensureInputProductionDraft(session),numeric=key==='referenceRate'||key==='totalQuantity';inference.production[key]=numeric?(value===''?'':Number(value)):String(value);if(key==='unit'){session.unit=String(value||'registro');targetInputProductionFields(session,'unit').forEach(field=>{if(field.value!==session.unit)field.value=session.unit;});stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();}}
  queueStateSave();
}
function targetInputProductionFields(session,key){
  return [...document.querySelectorAll('[data-stage-input-production-field]')].filter(field=>field.dataset.stageInputId===session.id&&field.dataset.stageInputProductionField===key);
}
function updateInputConditionField(session,index,key,value){
  if(programTs?.updateWorkerWorkbenchProductionConditionV1)programTs.updateWorkerWorkbenchProductionConditionV1(session,index,key,String(value));else{const inference=ensureInputProductionDraft(session),condition=inference.conditions[index];if(!condition)return;condition[key]=['notifyRoles','watchTerms','negativeTerms'].includes(key)?(key==='notifyRoles'?inputConditionRoles(value):inputConditionTokens(value)):String(value);}
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
const stageInputSemanticAdapters=new WeakSet();
const stageInputApplicationAdapters=new WeakSet();
function bindStageInputSemanticAdapter(target){
  if(stageInputSemanticAdapters.has(target))return;
  stageInputSemanticAdapters.add(target);
  target.addEventListener('atlas:worker-stage-input-event-v1',event=>{
    const detail=event.detail||{},source=detail.source;
    if(!stageContext)return;
    if(detail.kind==='calendar-date'){
      stageContext.calendarDate=programTs?.updateWorkerWorkbenchInputCalendarDateV1?.(stageContext.inputSessions,detail.value,todayIso())||validIsoDate(detail.value);
      if(!programTs?.updateWorkerWorkbenchInputCalendarDateV1)stageContext.inputSessions.forEach(item=>item.calendarDate=stageContext.calendarDate);
      stageContext.scheduleContext=buildScheduleContext(stageContext,stageContext.calendarDate);
      if(source)source.value=stageContext.calendarDate;
      renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();return;
    }
    if(detail.kind==='activity-add'){
      const order=stageContext.inputSessions.length;
      const session=programTs?.createWorkerWorkbenchCustomInputSessionV1?.(stageContext.calendarDate,order,newClientId)||{
        id:newClientId('input'),activityId:newClientId('activity'),title:'Nova atividade',text:'',calendarDate:stageContext.calendarDate,
        order,custom:true,inference:null,automation:defaultInputAutomation(),properties:[],
      };
      stageContext.inputSessions.push(session);
      stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);
      stageContext.layout[session.activityId]=programTs?.projectWorkerWorkbenchNextCustomActivityLayoutV1?.(stageContext.flowActivities.length)||{x:58+stageContext.flowActivities.length*246,y:96+(stageContext.flowActivities.length%2)*178};
      renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();
      setTimeout(()=>[...document.querySelectorAll('[data-stage-input-title]')].find(node=>node.dataset.stageInputTitle===session.id)?.focus(),0);return;
    }
    const session=stageContext.inputSessions.find(item=>item.id===String(detail.id||''));
    if(!session)return;
    if(detail.kind==='title'||detail.kind==='text'){
      if(detail.kind==='title'){
        session.title=String(detail.value||'');
        stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);
        renderFlowCards();
      }else session.text=String(detail.value||'');
      if(detail.phase==='input'){queueStateSave();queueInputInference(session);}
      else if(detail.kind==='title'){stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();}
      return;
    }
    if(detail.kind==='automation-option'){
      session.automation=programTs?.updateWorkerWorkbenchAutomationOptionV1?.(session,String(detail.key||''),Boolean(detail.checked))||normalizeInputAutomation(session.automation);
      if(!programTs?.updateWorkerWorkbenchAutomationOptionV1)session.automation[String(detail.key||'')]=Boolean(detail.checked);
      if(detail.key==='propagateRelations')applyInputRelation(session,session.inference);else queueStateSave();
      const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretriz da entrada atualizada';
      return;
    }
    if(detail.kind==='programming-option'){
      session.programming=programTs?.updateWorkerWorkbenchProgrammingOptionV1?.(session,String(detail.key||''),Boolean(detail.checked))||normalizeInputProgramming(session.programming,session);
      if(!programTs?.updateWorkerWorkbenchProgrammingOptionV1)session.programming[String(detail.key||'')]=Boolean(detail.checked);
      queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';return;
    }
    if(detail.kind==='programming-setting'){
      session.programming=programTs?.updateWorkerWorkbenchProgrammingSettingV1?.(session,String(detail.key||''),String(detail.value||''))||normalizeInputProgramming(session.programming,session);
      if(!programTs?.updateWorkerWorkbenchProgrammingSettingV1)session.programming[String(detail.key||'')]=String(detail.value||'');
      queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';return;
    }
    if(detail.kind==='property-field'){updateInputProperty(session,Number(detail.index),String(detail.key||''),detail.value);return;}
    if(detail.kind==='property-add'){addInputProperty(session);return;}
    if(detail.kind==='property-remove'){removeInputProperty(session,Number(detail.index));return;}
    if(detail.kind==='property-insert'){insertInputProperty(session,Number(detail.index));return;}
    if(detail.kind==='production-field'){updateInputProductionField(session,String(detail.key||''),String(detail.value||''));return;}
    if(detail.kind==='condition-field'){updateInputConditionField(session,Number(detail.index),String(detail.key||''),String(detail.value||''));return;}
    if(detail.kind==='condition-add'){
      if(programTs?.addWorkerWorkbenchProductionConditionV1)programTs.addWorkerWorkbenchProductionConditionV1(session);else{const inference=ensureInputProductionDraft(session);inference.conditions.push({kind:'operacional',label:'Nova condição',trigger:'notificar quando o registro indicar impedimento ou pendência',notifyWhen:'negative-match',notifyRoles:['owner'],severity:'warning',watchTerms:[],negativeTerms:['bloqueado','pendente','atrasado'],message:'Condição manual identificada na leitura operacional.'});}
      renderStageInputSessions();queueStateSave();return;
    }
    if(detail.kind==='condition-remove'){
      if(programTs?.removeWorkerWorkbenchProductionConditionV1)programTs.removeWorkerWorkbenchProductionConditionV1(session,Number(detail.index));else{const inference=ensureInputProductionDraft(session);inference.conditions.splice(Number(detail.index),1);}
      renderStageInputSessions();queueStateSave();return;
    }
    if(detail.kind==='infer'){
      clearTimeout(stageContext.inputTimers.get(session.id));source.disabled=true;source.textContent='Analisando…';
      void inferStageInput(session).finally(()=>{source.disabled=false;source.textContent='Compreender agora';});return;
    }
    if(detail.kind==='cycle'){
      clearTimeout(stageContext.inputTimers.get(session.id));source.disabled=true;source.textContent='Executando…';
      void inferStageInput(session).then(()=>{stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretrizes executadas e propagadas ao cronograma';}).finally(()=>{source.disabled=false;source.textContent='Executar diretrizes';});return;
    }
    if(detail.kind==='session-remove'){
      const removed=session;stageContext.inputSessions=stageContext.inputSessions.filter(item=>item.id!==removed.id);stageContext.flowActivities=stageContext.flowActivities.filter(item=>item.id!==removed.activityId);stageContext.links=stageContext.links.filter(link=>link.from!==removed.activityId&&link.to!==removed.activityId&&link.sourceId!==removed.id);delete stageContext.layout[removed.activityId];renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();
      return;
    }
    if(detail.kind==='reorder'){
      let changed=false;
      if(programTs?.reorderWorkerWorkbenchInputSessionsV1)changed=programTs.reorderWorkerWorkbenchInputSessionsV1(stageContext.inputSessions,String(detail.fromId||''),String(detail.toId||''));
      else{const from=stageContext.inputSessions.findIndex(item=>item.id===String(detail.fromId||'')),to=stageContext.inputSessions.findIndex(item=>item.id===String(detail.toId||''));if(from>=0&&to>=0&&from!==to){const [moved]=stageContext.inputSessions.splice(from,1);stageContext.inputSessions.splice(to,0,moved);stageContext.inputSessions.forEach((item,index)=>item.order=index);changed=true;}}
      if(changed){renderStageInputSessions();queueStateSave();}
    }
  });
}
function legacy_defaultInputSessions(definition,calendarDate){
  return definition.activities.map((item,index)=>{const session={id:`input-${item.id}`,activityId:item.id,title:item.title,text:`Entrada base: ${item.release}. Equipamentos e materiais: ${item.materials.join(', ')}.`,unit:item.unit,materials:item.materials,release:item.release,responsible:item.operational?.responsibility?.primary||'',operational:item.operational,calendarDate,order:index,custom:false,inference:null,automation:defaultInputAutomation()};session.programming=defaultInputProgramming(session);return session;});
}
function legacy_normalizeInputSessions(definition,stored,calendarDate){
  const source=Array.isArray(stored.inputSessions)&&stored.inputSessions.length?stored.inputSessions:defaultInputSessions(definition,calendarDate);
  return source.slice(0,40).map((item,index)=>{const activity=definition.activities.find(row=>row.id===String(item?.activityId||item?.id||''))||{};const session={id:String(item?.id||newClientId('input')),activityId:String(item?.activityId||item?.id||newClientId('activity')),title:String(item?.title||activity.title||'Atividade de entrada'),text:String(item?.text||''),unit:String(item?.unit||activity.unit||'atividade'),materials:Array.isArray(item?.materials)?item.materials.map(material=>typeof material==='string'?material:{id:String(material?.id||newClientId('material')),name:String(material?.name||material?.title||''),description:String(material?.description||material?.scope||''),usage:String(material?.usage||material?.use||''),quantity:material?.quantity==null?'':String(material.quantity),unit:String(material?.unit||'')}):Array.isArray(activity.materials)?activity.materials.map(String):[],release:String(item?.release||activity.release||''),responsible:String(item?.responsible||activity.operational?.responsibility?.primary||''),operational:item?.operational||activity.operational||null,calendarDate:validIsoDate(calendarDate),order:index,custom:Boolean(item?.custom),inference:item?.inference&&typeof item.inference==='object'?item.inference:null,automation:normalizeInputAutomation(item?.automation),properties:[]};session.properties=normalizeInputProperties(item?.properties,session);session.programming=normalizeInputProgramming(item?.programming,session);return session;});
}
function legacy_flowActivityFromInput(session){
  return {id:session.activityId,title:session.title||'Atividade de entrada',unit:session.unit||'atividade',materials:session.materials||[],release:session.release||session.text||'Entrada adicionada pelo usuário',responsible:session.responsible||'',weight:1,custom:true,operational:session.operational||null,programming:normalizeInputProgramming(session.programming,session)};
}
function legacy_buildFlowActivities(definition,sessions){
  const overrides=new Map(sessions.filter(item=>!item.custom).map(item=>[item.activityId,item]));
  const activities=definition.activities.map(item=>{const input=overrides.get(item.id);return input?{...item,title:input.title||item.title,operational:input.operational||item.operational,programming:normalizeInputProgramming(input.programming,input)}:item;});
  return activities.concat(sessions.filter(item=>item.custom).map(flowActivityFromInput));
}
function legacy_buildScheduleContext(context,calendarDate){
  const start=validIsoDate(calendarDate||context.automation?.plannedStart);
  const finish=validIsoDate(context.automation?.plannedFinish||start);
  return {...context,automation:{...(context.automation||{}),plannedStart:start,plannedFinish:finish<start?start:finish}};
}
function flowCardMarkup(item,index,total){
  const position=stageContext.layout[item.id]||{x:58+index*246,y:96+(index%2)*178};
  return componentsTs.renderAtlasWorkerFlowCardV1({item,index,total,stageKey:stageContext.definition.key,position,progress:inferredActivityProgress(stageContext.progress,index,total),blocked:Boolean(stageContext.live.blockedBy?.length),plannedStart:stageContext.scheduleContext.automation.plannedStart,plannedFinish:stageContext.scheduleContext.automation.plannedFinish,route:runtimeRouteV1});
}
function renderFlowCards(){
  const target=document.querySelector('[data-flow-cards]');if(!target||!stageContext)return;
  if(typeof programTs?.renderWorkerWorkbenchStageFlowCardsV1==='function'){
    target.innerHTML=programTs.renderWorkerWorkbenchStageFlowCardsV1({
      runtime:stageContext,route:runtimeRouteV1,
      renderCard:card=>componentsTs.renderAtlasWorkerFlowCardV1(card),
    });
    root.dataset.stageFlowCardsOwnerV1='typescript-program';
  }else{
    target.innerHTML=stageContext.flowActivities.map((item,index)=>flowCardMarkup(item,index,stageContext.flowActivities.length)).join('');
    root.dataset.stageFlowCardsOwnerV1='legacy';
  }
  enableDragging();
}
function renderInputInference(session){
  const target=[...document.querySelectorAll('[data-stage-input-inference]')].find(node=>node.dataset.stageInputInference===session.id);if(!target)return;
  const card=target.closest('[data-stage-input-card]');
  const projection=programTs?.projectWorkerWorkbenchInputCardV1?.(session);
  if(card&&projection&&typeof componentsTs.updateAtlasWorkerStageInputInferenceV1==='function'){
    componentsTs.updateAtlasWorkerStageInputInferenceV1(card,{id:session.id,sessionUnit:session.unit||'registro',composition:projection});
    return;
  }
  const inference=session.inference;
  const productionTarget=card?.querySelector('[data-stage-input-production]');if(productionTarget){productionTarget.innerHTML=inputProductionMarkupEditable(session);enhanceInputProductionPaper(productionTarget);const badge=productionTarget.querySelector('.stage-input-production-badge');if(badge)badge.textContent=session.inference?.manual?'EDIÇÃO LOCAL':session.inference?.production?'ESTRUTURADO':'PRÉVIA';}
  target.innerHTML=componentsTs.renderAtlasWorkerInputInferenceV1({inference:inference&&typeof inference==='object'?inference:null});
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
function requestStageInputInference(session,context){
  if(typeof programTs?.requestWorkerWorkbenchStageInputInferenceV1==='function')return programTs.requestWorkerWorkbenchStageInputInferenceV1(session,context,api);
  const input={stageKey:context.definition.key,activityId:session.activityId,title:session.title,text:session.text,calendarDate:context.calendarDate,activities:context.flowActivities,automation:normalizeInputAutomation(session.automation),programming:normalizeInputProgramming(session.programming,session),properties:normalizeInputProperties(session.properties,session)};
  if(typeof programTs?.requestWorkerWorkbenchInputInferenceV1==='function')return programTs.requestWorkerWorkbenchInputInferenceV1({...input,request:api});
  const payload=programTs?.projectWorkerWorkbenchInferenceRequestV1?.(input)||{stage:input.stageKey,activityId:input.activityId,title:input.title,text:input.text,calendarDate:input.calendarDate,activities:input.activities,automation:input.automation,programming:input.programming,properties:input.properties};
  return api('/api/workbench/infer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
}
async function inferStageInput(session){
  if(!stageContext||!session.text.trim()){session.inference=null;renderInputInference(session);applyInputRelation(session,null);return;}
  const target=[...document.querySelectorAll('[data-stage-input-inference]')].find(node=>node.dataset.stageInputInference===session.id);if(target){session.inference={...(session.inference||{}),loading:true,confidence:0,summary:'Analisando a atividade e suas dependências…'};renderInputInference(session);}
  try{
    const result=await requestStageInputInference(session,stageContext);
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
  if(panel&&!stageInputApplicationAdapters.has(panel)&&typeof programTs?.mountWorkerWorkbenchStageInputEditorV1==='function'){
    const mounted=programTs.mountWorkerWorkbenchStageInputEditorV1({
      panel,runtime:stageContext,createId:newClientId,todayIso,
      request:api,saveState:queueStateSave,
      renderFlow:renderFlowCards,drawConnections,
    });
    if(mounted){
      root.dataset.stageInputApplicationOwnerV1='typescript-program';
      stageInputApplicationAdapters.add(panel);
      return;
    }
  }
  const semanticEventsReady=Boolean(panel&&typeof componentsTs.installAtlasWorkerStageInputEventDelegationV1==='function'
    &&componentsTs.installAtlasWorkerStageInputEventDelegationV1(panel));
  const programApplicationReady=typeof programTs?.createWorkerWorkbenchStageInputApplicationV1==='function';
  if(panel&&semanticEventsReady&&programApplicationReady){
    if(!stageInputApplicationAdapters.has(panel)){
      const applyInputEvent=programTs.createWorkerWorkbenchStageInputApplicationV1({
        getContext:()=>stageContext,
        createId:newClientId,
        todayIso,
        renderSessions:renderStageInputSessions,
        renderFlow:renderFlowCards,
        drawConnections,
        saveState:queueStateSave,
        renderInference:renderInputInference,
        requestInference:requestStageInputInference,
        readTextSelection:sessionId=>{
          const field=[...panel.querySelectorAll('textarea[data-stage-input-text]')].find(node=>node.dataset.stageInputText===sessionId);
          return field?{text:field.value,selectionStart:field.selectionStart??field.value.length,selectionEnd:field.selectionEnd??field.value.length}:null;
        },
        applyTextInsertion:(sessionId,insertion)=>{
          const field=[...panel.querySelectorAll('textarea[data-stage-input-text]')].find(node=>node.dataset.stageInputText===sessionId);
          if(!field)return;
          field.value=insertion.text;field.focus();field.selectionStart=insertion.selectionStart;field.selectionEnd=insertion.selectionEnd;
        },
        syncProductionUnit:(sessionId,unit)=>targetInputProductionFields(stageContext.inputSessions.find(item=>item.id===sessionId)||{},'unit').forEach(field=>{if(field.value!==unit)field.value=unit;}),
        focusTitle:sessionId=>[...panel.querySelectorAll('[data-stage-input-title]')].find(node=>node.dataset.stageInputTitle===sessionId)?.focus(),
        setActionBusy:(kind,sessionId,busy,label)=>{
          const attribute=kind==='infer'?'data-stage-input-run':'data-stage-input-cycle';
          const button=[...panel.querySelectorAll('button')].find(node=>node.getAttribute(attribute)===sessionId);
          if(!button)return;
          button.disabled=busy;button.textContent=busy?(kind==='infer'?'Analisando…':'Executando…'):label;
        },
        setStatus:message=>{const status=document.querySelector('[data-sync-state]');if(status)status.textContent=message;},
      });
      panel.addEventListener(componentsTs.ATLAS_WORKER_STAGE_INPUT_EVENT_V1,event=>{
        const {source:_source,...detail}=event.detail||{};
        applyInputEvent(detail);
      });
      panel.dataset.inputApplicationOwnerV1='typescript-program';
      root.dataset.stageInputApplicationOwnerV1='typescript-program';
      stageInputApplicationAdapters.add(panel);
    }
    renderStageInputSessions();return;
  }
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
  if(typedQueueStateSave){typedQueueStateSave();return;}
  clearTimeout(legacySaveTimer);legacySaveTimer=setTimeout(async()=>{
    const state={layout:stageContext.layout,links:stageContext.links,inputSessions:stageContext.inputSessions,calendarDate:stageContext.calendarDate};
    const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Salvando organização…';
    try{await api(`/api/workbench/state?stage=${encodeURIComponent(stageContext.definition.key)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(status)status.textContent='Organização salva e auditada';}
    catch(error){if(status)status.textContent=`Falha ao salvar: ${error.message}`;}
  },450);
}

function drawConnections(){
  if(!stageContext)return;
  const svg=document.querySelector('[data-flow-lines]'),labels=document.querySelector('[data-flow-labels]');if(!svg||!labels)return;
  if(typeof programTs?.renderWorkerWorkbenchStageFlowConnectionsV1==='function'){
    programTs.renderWorkerWorkbenchStageFlowConnectionsV1({runtime:stageContext,svg,labels,componentsTs,saveState:queueStateSave});
    root.dataset.stageFlowConnectionsOwnerV1='typescript-program';return;
  }
  if(typeof componentsTs.renderAtlasWorkerFlowConnectionsV1==='function'){
    componentsTs.renderAtlasWorkerFlowConnectionsV1({svg,labels,links:stageContext.links,layout:stageContext.layout,updateLabel:(index,value)=>{const link=stageContext.links[index];if(!link)return;link.label=value;queueStateSave();}});return;
  }
  const cardH=142;
  svg.innerHTML=stageContext.links.map(link=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';const cardW=clamp(Number(a.width)||220,180,520),x1=a.x+cardW,y1=a.y+cardH/2,x2=b.x,y2=b.y+cardH/2,curve=Math.max(45,(x2-x1)*.45);return `<path d="M ${x1} ${y1} C ${x1+curve} ${y1}, ${x2-curve} ${y2}, ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="4"/>`;}).join('');
  labels.innerHTML=stageContext.links.map((link,index)=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';return `<label class="flow-link-label" style="left:${(a.x+b.x+220)/2-72}px;top:${(a.y+b.y)/2+58}px"><span>REQUISITO</span><input data-link-label="${index}" value="${esc(link.label)}" aria-label="Rótulo da dependência"></label>`;}).join('');
  labels.querySelectorAll('[data-link-label]').forEach(input=>input.addEventListener('change',event=>{stageContext.links[Number(event.currentTarget.dataset.linkLabel)].label=event.currentTarget.value.trim()||'depende de';queueStateSave();}));
}

function enableDragging(){
  const surface=document.querySelector('[data-flow-surface]');if(!surface||!stageContext)return;
  const typedEventsReady=typeof programTs?.installWorkerWorkbenchStageFlowCanvasEventsV1==='function'
    ?programTs.installWorkerWorkbenchStageFlowCanvasEventsV1({runtime:stageContext,surface,componentsTs,renderConnections:drawConnections,saveState:queueStateSave})
    :typeof componentsTs.installAtlasWorkerStageFlowCanvasEventsV1==='function'&&componentsTs.installAtlasWorkerStageFlowCanvasEventsV1({surface,layout:stageContext.layout,setPosition:(id,position)=>{stageContext.layout[id]={...stageContext.layout[id],...position};},setWidth:(id,width)=>{stageContext.layout[id]={...stageContext.layout[id],width};},renderConnections:drawConnections,save:queueStateSave});
  if(typedEventsReady)root.dataset.stageFlowCanvasEventsOwnerV1='typescript-program';
  if(typedEventsReady)return;
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

const fileDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler o arquivo.'));reader.readAsDataURL(file);});

function mountAttachments(definition,items,activity=null){
  const main=document.querySelector('.workbench-main');if(!main)return;
  if(typeof programTs?.mountWorkerWorkbenchAttachmentPanelV1==='function'){
    const mounted=programTs.mountWorkerWorkbenchAttachmentPanelV1({
      main,definition,activity,attachments:items,request:api,componentsTs,
      setSyncState:message=>{const syncState=document.querySelector('[data-sync-state]');if(syncState)syncState.textContent=message;},
    });
    if(mounted)return;
  }
  main.insertAdjacentHTML('beforeend',componentsTs.renderAtlasWorkerAttachmentPanelV1({definition,activity}));(main.querySelector('[data-attachment-list]').innerHTML=componentsTs.renderAtlasWorkerAttachmentItemsV1(items));
  const typedEventsReady=typeof componentsTs.installAtlasWorkerAttachmentEventsV1==='function'&&typeof programTs?.saveWorkerWorkbenchAttachmentV1==='function'&&componentsTs.installAtlasWorkerAttachmentEventsV1({
    root:main,
    saveAttachment:({fields,fileName,dataUrl})=>programTs.saveWorkerWorkbenchAttachmentV1({stageKey:definition.key,activityId:activity?.id,fields,fileName,dataUrl,request:api}),
    setSyncState:message=>{const syncState=document.querySelector('[data-sync-state]');if(syncState)syncState.textContent=message;},
  });
  if(typedEventsReady){main.dataset.attachmentEventsOwnerV1='typescript-components';main.dataset.attachmentPersistenceOwnerV1='typescript-program';return;}
  const form=main.querySelector('[data-attachment-form]'),toggle=main.querySelector('[data-toggle-attachment]'),cancel=main.querySelector('[data-cancel-attachment]'),fileInput=form.elements.file,status=main.querySelector('[data-attachment-status]');
  toggle.addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden)fileInput.focus();});cancel.addEventListener('click',()=>form.hidden=true);
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];status.textContent=file?`${file.name} · ${(file.size/1048576).toFixed(1)} MB`:'Nenhum arquivo selecionado.';});
  form.addEventListener('submit',async event=>{event.preventDefault();const file=fileInput.files?.[0],button=form.querySelector('[type="submit"]');if(!file)return;if(file.size>6*1024*1024){status.textContent='O arquivo ultrapassa o limite de 6 MB.';return;}button.disabled=true;button.textContent='Enviando…';try{const fields=Object.fromEntries(new FormData(form));delete fields.file;await api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fields,activityId:activity?.id||'',fileName:file.name,dataUrl:await fileDataUrl(file)})});const refreshed=await api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}${activity?`&activity=${encodeURIComponent(activity.id)}`:''}`);(main.querySelector('[data-attachment-list]').innerHTML=componentsTs.renderAtlasWorkerAttachmentItemsV1(refreshed.attachments||[]));form.reset();form.hidden=true;status.textContent='Anexo registrado e propagado ao worker.';document.querySelector('[data-sync-state]').textContent='Evidência anexada e ciclo operacional atualizado';}catch(error){status.textContent=error.message;}finally{button.disabled=false;button.textContent='Enviar e propagar';}});
}

async function renderStage(){
  const mountStagePage=programTs?.mountWorkerWorkbenchStagePageV1;
  if(typeof mountStagePage==='function'){
    const mounted=await mountStagePage({
      root,
      stageKey:requestedStage,
      request:api,
      todayIso,
      createId:newClientId,
      route:runtimeRouteV1,
      renderShell:shell,
      publishRuntime:runtime=>{stageContext=runtime;},
      componentsTs,
    });
    if(mounted)return;
  }
  await renderLegacyStageV1();
}

/** MJS recovery for a cached bundle without the typed stage-page owner. */
async function renderLegacyStageV1(){
  const requiredProgramOwners=[
    'findWorkerWorkbenchStageV1',
    'loadWorkerWorkbenchStageSnapshotV1',
    'createWorkerWorkbenchStageRuntimeV1',
    'projectWorkerWorkbenchStageWorkspaceV1',
  ];
  if(requiredProgramOwners.some(name=>typeof programTs?.[name]!=='function')
    ||!Array.isArray(programTs?.WORKER_STAGE_WORKBENCH_CATALOG_V1)
    ||typeof componentsTs.renderAtlasWorkerStageWorkspaceV1!=='function'){
    throw new Error('A página da etapa exige o catálogo, o workspace e o renderer TypeScript.');
  }
  const definition=programTs.findWorkerWorkbenchStageV1(requestedStage);
  if(!definition)throw new Error(`Etapa não encontrada: ${requestedStage}`);
  const snapshot=await programTs.loadWorkerWorkbenchStageSnapshotV1({stageKey:definition.key,request:api});
  const {panorama,statePayload,attachmentPayload}=snapshot;
  stageContext=programTs.createWorkerWorkbenchStageRuntimeV1({
    definition,panorama,monitor:snapshot.monitor,storedState:statePayload.state||{},today:todayIso(),createId:newClientId,
  });
  const workspace=programTs.projectWorkerWorkbenchStageWorkspaceV1({
    definition,
    context:stageContext.scheduleContext,
    calendarDate:stageContext.calendarDate,
    flowActivities:stageContext.flowActivities,
    layout:stageContext.layout,
    generatedAt:panorama.generatedAt,
  });
  shell(componentsTs.renderAtlasWorkerStageWorkspaceV1({
    projection:workspace,
    stages:programTs.WORKER_STAGE_WORKBENCH_CATALOG_V1,
    attachments:attachmentPayload.attachments||[],
    route:runtimeRouteV1,
  }),'stage');
  root.dataset.stageRuntimeOwnerV1='typescript';
  root.dataset.stageWorkspaceOwnerV1='typescript';
  root.dataset.stagePageRendererOwnerV1='typescript';
  setupStageInputs();
  drawConnections();
  enableDragging();
  mountAttachments(definition,attachmentPayload.attachments||[]);
}
async function renderActivity(){
  const mountActivityPage=programTs?.mountWorkerActivityPageV1;
  if(typeof mountActivityPage==='function'){
    const mounted=await mountActivityPage({
      root,
      stageKey:requestedStage,
      activityId:params.get('activity')||'',
      request:api,
      today:todayIso(),
      route:runtimeRouteV1,
      renderShell:shell,
      setSyncState:message=>{const status=root.querySelector('[data-sync-state]');if(status)status.textContent=message;},
      componentsTs,
      documentRef:document,
    });
    if(mounted)return;
  }
  await renderLegacyActivityPageV1();
}

/** MJS host recovery for installations whose cached TypeScript page owner is unavailable. */
async function renderLegacyActivityPageV1(){
  if(typeof programTs?.loadWorkerWorkbenchActivityWorkspaceV1!=='function'||typeof componentsTs.renderAtlasWorkerActivityWorkspaceV1!=='function')throw new Error('A página de atividade exige os owners TypeScript do workspace e do renderer.');
  const activityId=params.get('activity')||'';
  const workspace=await programTs.loadWorkerWorkbenchActivityWorkspaceV1({stageKey:requestedStage,activityId,request:api,today:todayIso()});
  const {definition,item,snapshot,context,projection}=workspace;
  const {diaryPayload,attachmentPayload}=snapshot;
  root.dataset.activityWorkspaceOwnerV1='typescript';
  root.dataset.activityPageRendererOwnerV1='typescript';
  shell(componentsTs.renderAtlasWorkerActivityWorkspaceV1({projection,route:runtimeRouteV1}),'activity');
  mountAttachments(definition,attachmentPayload.attachments||[],item);

  const mapEditor=document.createElement('section');
  mapEditor.className='activity-map-editor-shell';
  mapEditor.dataset.activityMapEditor='';
  mapEditor.dataset.mapBootstrapStateV1='loading';
  mapEditor.dataset.stage=definition.key;
  mapEditor.dataset.activity=item.id;
  mapEditor.dataset.progress=String(Math.round(projection.progress));
  mapEditor.innerHTML='<div class="activity-map-editor-loading"><span class="eyebrow">LOCAL FÍSICO · LEITURA URBANA</span><h2>Preparando o modelo 3D…</h2><p>A página de atividade fica disponível enquanto o loteamento é carregado.</p></div>';
  document.querySelector('.activity-columns')?.before(mapEditor);
  void import('./activity-map-editor.mjs?v=8&worker-standalone-map-scene-v1&worker-map-init-nonblocking-v1&worker-activity-map-state-program-owner-v1&worker-activity-map-editor-program-owner-v1&ts-map-coordinate-policy-v1&ts-activity-map-editor-thin-adapter-v2').then(async module=>{
    if(typeof module.mountWorkerActivityMapEditorV1!=='function')throw new Error('O adapter do editor de mapa não está disponível.');
    const mounted=await module.mountWorkerActivityMapEditorV1({host:mapEditor,request:api,componentsTs,programTs});
    if(!mounted)throw new Error('Não foi possível montar o editor de mapa da atividade.');
    mapEditor.dataset.mapBootstrapStateV1='ready';
  }).catch(error=>{
    mapEditor.dataset.mapBootstrapStateV1='failed';
    mapEditor.innerHTML=`<div class="activity-map-editor-loading"><span class="eyebrow">MAPA INDISPONÍVEL</span><h2>Não foi possível carregar o loteamento</h2><p>${esc(error?.message||error||'Falha ao iniciar o mapa.')}</p></div>`;
  });

  const eventOwnersReady=typeof programTs.projectWorkerWorkbenchActivityEditValuesV1==='function'
    &&typeof programTs.projectWorkerWorkbenchActivityEditStateV1==='function'
    &&typeof programTs.saveWorkerWorkbenchActivityEditV1==='function'
    &&typeof programTs.createWorkerWorkbenchActivityDiaryEntryV1==='function'
    &&typeof programTs.loadWorkerWorkbenchActivityDiaryEntriesV1==='function'
    &&typeof componentsTs.installAtlasWorkerActivityPageEventsV1==='function';
  if(!eventOwnersReady)throw new Error('Os owners TypeScript de edição e diário não estão disponíveis.');
  const eventsInstalled=componentsTs.installAtlasWorkerActivityPageEventsV1({
    root:document.querySelector('.activity-main')||document,
    activityId:String(item.id),
    initialDiaryEntries:diaryPayload.entries||[],
    saveActivity:values=>programTs.saveWorkerWorkbenchActivityEditV1({stageKey:definition.key,activity:item,values,request:api}),
    createDiaryEntry:values=>programTs.createWorkerWorkbenchActivityDiaryEntryV1({stageKey:definition.key,values,request:api}),
    loadDiaryEntries:()=>programTs.loadWorkerWorkbenchActivityDiaryEntriesV1({stageKey:definition.key,activityId:item.id,request:api}),
    setSyncState:message=>{const status=document.querySelector('[data-sync-state]');if(status)status.textContent=message;},
  });
  if(!eventsInstalled)throw new Error('A página de atividade não encontrou os formulários TypeScript para edição e diário.');
  root.dataset.activityPageEventsOwnerV1='typescript';
}
async function renderActivityRecord(){
  const requiredProgramOwners=['loadWorkerWorkbenchActivityRecordWorkspaceV1','projectWorkerWorkbenchActivityRecordPayloadV1','submitWorkerWorkbenchActivityRecordV1'];
  if(requiredProgramOwners.some(name=>typeof programTs?.[name]!=='function')||typeof componentsTs.renderAtlasWorkerActivityRecordPageV1!=='function'||typeof componentsTs.installAtlasWorkerActivityRecordPageEventsV1!=='function'){
    await renderLegacyActivityRecordV1();
    return;
  }
  const workspace=await programTs.loadWorkerWorkbenchActivityRecordWorkspaceV1({
    stageKey:requestedStage,
    activityId:params.get('activity')||'',
    request:api,
    route:runtimeRouteV1,
    today:todayIso(),
  });
  const {definition,item,projection}=workspace;
  root.dataset.activityRecordWorkspaceOwnerV1='typescript';
  root.dataset.activityRecordRendererOwnerV1='typescript';
  shell(componentsTs.renderAtlasWorkerActivityRecordPageV1({projection}),'activity-record');
  const eventsInstalled=componentsTs.installAtlasWorkerActivityRecordPageEventsV1({
    root:document.querySelector('.activity-record-main')||document,
    activityId:String(item.id),
    today:projection.today,
    responsible:projection.responsible,
    unit:projection.unit,
    projectPayload:values=>programTs.projectWorkerWorkbenchActivityRecordPayloadV1({values,activityId:String(item.id)}),
    submit:payload=>programTs.submitWorkerWorkbenchActivityRecordV1({stageKey:definition.key,payload,request:api}),
    setSyncState:message=>{const status=document.querySelector('[data-sync-state]');if(status)status.textContent=message;},
  });
  if(!eventsInstalled)throw new Error('A rota de registro não encontrou o formulário TypeScript.');
  root.dataset.activityRecordEventsOwnerV1='typescript';
}

/** Compatibility path stays available until the authenticated record POST is validated end to end. */
async function renderLegacyActivityRecordV1(){
  const activityId=params.get('activity')||'',found=findWorkbenchActivity(requestedStage,activityId),definition=found.stage,baseItem=found.activity||definition.activities[0]||{id:activityId||'activity',title:'Atividade',unit:'registro',release:'Aceite da atividade'};
  const snapshot=programTs?.loadWorkerWorkbenchActivityRecordSnapshotV1
    ?await programTs.loadWorkerWorkbenchActivityRecordSnapshotV1({stageKey:definition.key,request:api})
    :await (async()=>{const [panorama,monitor,statePayload]=await Promise.all([api('/api/automation/panorama'),api('/api/automation/monitor'),api(`/api/workbench/state?stage=${encodeURIComponent(definition.key)}`)]);return{panorama,monitor,statePayload};})();
  const {panorama,monitor,statePayload}=snapshot;
  const stored=(statePayload.state?.inputSessions||[]).find(row=>String(row?.activityId||row?.id||'')===String(baseItem.id));
  const item={...baseItem,...(stored||{}),id:baseItem.id,unit:stored?.unit||baseItem.unit,release:stored?.release||baseItem.release,responsible:stored?.responsible||baseItem.operational?.responsibility?.primary||''};
  const context=liveForStage(panorama,monitor,definition);
  const page=(await import('./activity-record-page-v1.mjs?v=activity-record-page-v1')).renderActivityRecordPageV1;
  const markup=page({stageKey:definition.key,stageName:definition.title,activityId:item.id,activityName:item.title,unit:item.unit,responsible:item.responsible||context.owner,release:item.release,state:context.live.blockedBy?.length?'BLOQUEADA':'EM ACOMPANHAMENTO',backHref:runtimeRouteV1('/admin/workers/activity',`stage=${definition.key}&activity=${item.id}`)});
  root.dataset.activityRecordWorkspaceOwnerV1='legacy';
  root.dataset.activityRecordRendererOwnerV1='legacy';
  shell(markup,'activity-record');
  const form=document.querySelector('[data-activity-record-form]'),feedback=document.querySelector('[data-activity-record-feedback]');
  form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),payload=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent='Validando…';feedback.textContent='A IA está lendo a entrada e verificando conflitos…';try{const response=await api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,activityId:item.id})});const entry=response.entry||{};feedback.dataset.state='success';feedback.textContent=`Registro ${entry.id||'confirmado'} aceito e propagado para o diário do worker.`;document.querySelector('[data-sync-state]').textContent='Novo registro validado e propagado ao loop operacional';form.reset();form.elements.recordDate.value=todayIso();form.elements.responsible.value=item.responsible||context.owner;form.elements.unit.value=item.unit;}catch(error){feedback.dataset.state='error';feedback.textContent=`Não foi possível registrar: ${error.message}`;document.querySelector('[data-sync-state]').textContent='Falha na validação do novo registro';}finally{button.disabled=false;button.textContent='Registrar e propagar';}});
  root.dataset.activityRecordEventsOwnerV1='legacy';
}
/* Rebuild each input as an independent vertical execution section. The declaration is intentionally kept here so the existing stage bootstrap uses this richer renderer. */
function renderStageInputSessions(){
  const target=document.querySelector('[data-stage-inputs]');if(!target||!stageContext)return;
  const eventRoot=target.closest('.stage-inputs-panel')||target;
  const semanticEventsReady=typeof componentsTs.installAtlasWorkerStageInputEventDelegationV1==='function'
    &&componentsTs.installAtlasWorkerStageInputEventDelegationV1(eventRoot);
  const cardCompositionReady=typeof programTs?.projectWorkerWorkbenchInputCardV1==='function'
    &&typeof componentsTs.renderAtlasWorkerStageInputSessionV1==='function';
  if(semanticEventsReady&&!stageInputApplicationAdapters.has(eventRoot))bindStageInputSemanticAdapter(eventRoot);
  target.innerHTML=stageContext.inputSessions.map((session,index)=>{
    session.automation=normalizeInputAutomation(session.automation);
    const composition=cardCompositionReady?programTs.projectWorkerWorkbenchInputCardV1(session):undefined;
    return componentsTs.renderAtlasWorkerStageInputSessionV1({
      id:session.id,index,custom:Boolean(session.custom),calendarDate:session.calendarDate,
      currentCalendarDate:stageContext.calendarDate,title:session.title,text:session.text,
      unit:session.unit,release:session.release,hasInference:Boolean(session.inference?.summary),
      scheduleDateLabel:fmtDate(stageContext.calendarDate),automation:session.automation,
      properties:composition?.properties||normalizeInputProperties(session.properties,session),composition,
    });
  }).join('');
  if(semanticEventsReady)componentsTs.applyAtlasWorkerStageInputModeV1?.(eventRoot,eventRoot.dataset.inputMode==='edit'?'edit':'view');
  if(!semanticEventsReady){enhanceInputFieldLayouts(target);bindInputProperties(target);}
  if(!cardCompositionReady){
    target.querySelectorAll('[data-stage-input-card]').forEach((card,index)=>{const session=stageContext.inputSessions[index];if(!session)return;const options=card.querySelector('.stage-input-options');if(options)options.innerHTML=inputProgrammingMarkup(session);const settings=document.createElement('div');settings.className='stage-input-settings';settings.innerHTML=inputProgrammingSettingsMarkup(session);card.querySelector('.stage-input-execution')?.append(settings);});
    target.querySelectorAll('[data-stage-input-card]').forEach((card,index)=>{const session=stageContext.inputSessions[index];if(!session)return;const production=document.createElement('section');production.className='stage-input-production';production.dataset.stageInputProduction='';production.innerHTML=inputProductionMarkupEditable(session);card.querySelector('.stage-input-execution')?.after(production);});
    stageContext.inputSessions.forEach(renderInputInference);
  }
  if(!semanticEventsReady){enhanceInputProductionPaper(target);bindInputProductionEditors(target);}
  if(!semanticEventsReady){
    target.querySelectorAll('[data-stage-input-title],[data-stage-input-text]').forEach(field=>field.addEventListener('input',event=>{const id=event.currentTarget.dataset.stageInputTitle||event.currentTarget.dataset.stageInputText,session=stageContext.inputSessions.find(item=>item.id===id);if(!session)return;if(event.currentTarget.dataset.stageInputTitle){session.title=event.currentTarget.value;stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();}else session.text=event.currentTarget.value;queueStateSave();queueInputInference(session);}));
    target.querySelectorAll('[data-stage-input-option]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputOption,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.automation=normalizeInputAutomation(session.automation);session.automation[key]=event.currentTarget.checked;if(key==='propagateRelations')applyInputRelation(session,session.inference);else queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretriz da entrada atualizada';}));
    target.querySelectorAll('[data-stage-input-option][data-stage-input-store="programming"]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputOption,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.programming=normalizeInputProgramming(session.programming,session);session.programming[key]=event.currentTarget.checked;queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';}));
    target.querySelectorAll('[data-stage-input-setting]').forEach(control=>control.addEventListener('change',event=>{const id=event.currentTarget.dataset.stageInputId,key=event.currentTarget.dataset.stageInputSetting,session=stageContext.inputSessions.find(item=>item.id===id);if(!session||!key)return;session.programming=normalizeInputProgramming(session.programming,session);session.programming[key]=event.currentTarget.value;queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Modo de programação atualizado';}));
    target.querySelectorAll('[data-stage-input-run]').forEach(button=>button.addEventListener('click',async()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputRun);if(!session)return;clearTimeout(stageContext.inputTimers.get(session.id));button.disabled=true;button.textContent='Analisando…';try{await inferStageInput(session);}finally{button.disabled=false;button.textContent='Compreender agora';}}));
    target.querySelectorAll('[data-stage-input-cycle]').forEach(button=>button.addEventListener('click',async()=>{const session=stageContext.inputSessions.find(item=>item.id===button.dataset.stageInputCycle);if(!session)return;clearTimeout(stageContext.inputTimers.get(session.id));button.disabled=true;button.textContent='Executando…';try{await inferStageInput(session);stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();drawConnections();queueStateSave();const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Diretrizes executadas e propagadas ao cronograma';}finally{button.disabled=false;button.textContent='Executar diretrizes';}}));
    target.querySelectorAll('[data-stage-input-title]').forEach(field=>field.addEventListener('change',()=>{stageContext.flowActivities=buildFlowActivities(stageContext.definition,stageContext.inputSessions);renderFlowCards();}));
    target.querySelectorAll('[data-stage-input-remove]').forEach(button=>button.addEventListener('click',()=>{const card=button.closest('[data-stage-input-card]'),session=stageContext.inputSessions.find(item=>item.id===card?.dataset.stageInputCard);if(!session)return;stageContext.inputSessions=stageContext.inputSessions.filter(item=>item.id!==session.id);stageContext.flowActivities=stageContext.flowActivities.filter(item=>item.id!==session.activityId);stageContext.links=stageContext.links.filter(link=>link.from!==session.activityId&&link.to!==session.activityId&&link.sourceId!==session.id);delete stageContext.layout[session.activityId];renderStageInputSessions();renderFlowCards();drawConnections();queueStateSave();}));
  }
  if(!semanticEventsReady)target.querySelectorAll('[data-stage-input-card]').forEach(card=>{card.addEventListener('dragstart',event=>{if(!event.target.closest('[data-stage-input-drag]')){event.preventDefault();return;}card.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',card.dataset.stageInputCard);});card.addEventListener('dragend',()=>card.classList.remove('is-dragging'));card.addEventListener('dragover',event=>{event.preventDefault();card.classList.add('is-drop-target');});card.addEventListener('dragleave',()=>card.classList.remove('is-drop-target'));card.addEventListener('drop',event=>{event.preventDefault();card.classList.remove('is-drop-target');const fromId=event.dataTransfer.getData('text/plain'),toId=card.dataset.stageInputCard;if(!fromId||fromId===toId)return;const from=stageContext.inputSessions.findIndex(item=>item.id===fromId),to=stageContext.inputSessions.findIndex(item=>item.id===toId);if(from<0||to<0)return;const [moved]=stageContext.inputSessions.splice(from,1);stageContext.inputSessions.splice(to,0,moved);stageContext.inputSessions.forEach((item,index)=>item.order=index);renderStageInputSessions();queueStateSave();});});
}
try{await (isActivityRecord?renderActivityRecord():isActivity?renderActivity():renderStage());}
catch(error){shell(`<main class="workbench-main"><a class="detail-back" href="/admin/workers">← Monitoria</a><section class="activity-hero"><div><span class="eyebrow">FALHA DE CARREGAMENTO</span><h1>Não foi possível abrir o acompanhamento</h1><p>${esc(error.message)}</p></div></section></main>`,'error');}
