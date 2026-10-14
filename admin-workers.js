import {DEVELOPMENT_STAGE_CATALOG,DEVELOPMENT_STAGE_CATALOG_VERSION,DEVELOPMENT_STAGE_SOURCES} from './development-stage-catalog.mjs';
import {registerOperationalDevice,subscribeOperationalNotifications,subscribeOperationalContacts,subscribeOperationalConversation,sendOperationalMessage} from './firebase.mjs?v=twa-comms-v1';

const dedicatedWorkbench=/\/admin\/workers\/(stage|activity|activity\/record)\/?$/.test(location.pathname);
if(dedicatedWorkbench){
  // A superfície dedicada só deve importar o workbench depois de a sessão
  // estar pronta. Isso mantém o gate de login leve e evita inicializar
  // Three.js enquanto o Firebase ainda restaura a sessão.
  await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(true));
  await import('./stage-workbench.mjs?v=activity-record-page-v5386');
}else{

const root=document.querySelector('[data-worker-app]');
const qs=(selector,scope=document)=>scope.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// O túnel ngrok usa /8080 como prefixo do upstream. As páginas dedicadas
// também precisam mantê-lo para que a navegação não caia no gateway.
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
document.querySelectorAll('a[href^="/admin"]').forEach(anchor=>{
  anchor.setAttribute('href',runtimeRouteV1(anchor.getAttribute('href')));
});
const time=value=>value?new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const dateTime=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const number=value=>new Intl.NumberFormat('pt-BR').format(Number(value)||0);
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
const roleKey=()=>globalThis.BELAVISTA_ADMIN_ACTOR?.role||qs('[data-role]')?.value||'admin';
const headers=async(extra={})=>{const actor=globalThis.BELAVISTA_ADMIN_ACTOR||{};let token='';try{token=await globalThis.BELAVISTA_GET_ID_TOKEN?.()||'';}catch{}return {'x-belavista-role':roleKey(),'x-belavista-user':actor.uid||`twa-${roleKey()}`,'x-belavista-name':actor.name||(roleKey()==='foreman'?'Encarregado mobile':roleKey()==='owner'?'Dono':'Administrador'),...(token?{authorization:`Bearer ${token}`}:{}),...extra};};
const jsonFetch=async(path,options={})=>{const response=await fetch(path,{cache:'no-store',...options,headers:await headers(options.headers||{})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload;};

const stageLabel=stage=>stage?.name||stage?.key||'Etapa';
const stageState=stage=>Number(stage?.progress)>=100?'Concluída':stage?.blockedBy?.length?'Bloqueada':Number(stage?.progress)>0?'Em andamento':'Planejada';
const physicalValue=(value,unit='')=>`${number(value)}${unit?' '+unit:''}`;
const availabilityLabel=personnel=>personnel?.status==='ready'?'equipe suficiente':personnel?.status==='registration_pending'?'equipe a cadastrar':'equipe parcial';
const eventLabel=type=>({
  'record.created':'Novo registro recebido','record.updated':'Registro atualizado','production.measured':'Medição de produção','material.incomplete':'Material incompleto','cash.changed':'Caixa alterado','stage.updated':'Etapa atualizada','stage.ai-config.changed':'Diretriz da IA alterada','calibration.changed':'Calibração alterada'
}[type]||type||'Evento do sistema');

const catalogState={expanded:false,query:'',phase:'all'};
const catalogText=stage=>[stage.title,stage.phase,stage.objective,...stage.dependsOn,...stage.entryGates,...stage.activities,...stage.requirements,...stage.materials,...stage.evidence,...stage.workerRules].join(' ').toLocaleLowerCase('pt-BR');
const catalogList=(title,items,className='')=>`<section class="requirement-column ${className}"><h4>${esc(title)} <span>${items.length}</span></h4><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`;

function renderRequirementsCatalog(){
  const target=qs('[data-requirements-list]');if(!target)return;
  const query=catalogState.query.trim().toLocaleLowerCase('pt-BR');
  const stages=DEVELOPMENT_STAGE_CATALOG.filter(stage=>(catalogState.phase==='all'||stage.phase===catalogState.phase)&&(!query||catalogText(stage).includes(query)));
  qs('[data-requirements-count]').textContent=`${stages.length} de ${DEVELOPMENT_STAGE_CATALOG.length} etapas`;
  qs('[data-requirements-summary]').innerHTML=`<span><b>${DEVELOPMENT_STAGE_CATALOG.length}</b> ETAPAS</span><span><b>${DEVELOPMENT_STAGE_CATALOG.reduce((sum,item)=>sum+item.activities.length,0)}</b> ATIVIDADES</span><span><b>${DEVELOPMENT_STAGE_CATALOG.reduce((sum,item)=>sum+item.materials.length,0)}</b> GRUPOS DE MATERIAL</span><span><b>${DEVELOPMENT_STAGE_CATALOG.reduce((sum,item)=>sum+item.evidence.length,0)}</b> EVIDÊNCIAS</span><span><b>v${esc(DEVELOPMENT_STAGE_CATALOG_VERSION)}</b> REVISÃO</span>`;
  target.innerHTML=stages.map((stage,index)=>`<details class="requirement-stage" data-catalog-stage="${esc(stage.id)}" ${catalogState.expanded||query?'open':''}><summary><span class="requirement-order">${String(DEVELOPMENT_STAGE_CATALOG.indexOf(stage)+1).padStart(2,'0')}</span><span><small>${esc(stage.phase)}</small><strong>${esc(stage.title)}</strong><em>${esc(stage.objective)}</em></span><i>${stage.dependsOn.length?`depende de ${stage.dependsOn.length}`:'início'} · ${stage.activities.length} atividades</i></summary><div class="requirement-body"><div class="dependency-strip"><b>DEPENDÊNCIAS</b><span>${stage.dependsOn.length?stage.dependsOn.map(id=>esc(DEVELOPMENT_STAGE_CATALOG.find(item=>item.id===id)?.title||id)).join(' → '):'Nenhuma etapa anterior; depende da decisão formal de viabilidade.'}</span></div><div class="requirement-grid">${catalogList('Portões de entrada',stage.entryGates,'is-gate')}${catalogList('Atividades reais',stage.activities)}${catalogList('Requisições',stage.requirements)}${catalogList('Materiais e insumos',stage.materials)}${catalogList('Evidências de aceite',stage.evidence,'is-evidence')}${catalogList('Diretrizes do worker',stage.workerRules,'is-worker')}</div></div></details>`).join('')||'<div class="empty-state">Nenhuma etapa corresponde aos filtros.</div>';
  qs('[data-expand-requirements]').textContent=catalogState.expanded?'Recolher tudo':'Expandir tudo';
}

function initializeRequirementsCatalog(){
  const phase=qs('[data-requirements-phase]');if(!phase)return;
  [...new Set(DEVELOPMENT_STAGE_CATALOG.map(stage=>stage.phase))].forEach(value=>phase.insertAdjacentHTML('beforeend',`<option value="${esc(value)}">${esc(value)}</option>`));
  qs('[data-requirements-sources]').innerHTML=[...DEVELOPMENT_STAGE_SOURCES.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a>`),'<a href="/docs/ai-construction-operational-playbook.md" target="_blank" rel="noreferrer">Documento operacional usado pela IA ↗</a>'].join('');
  qs('[data-requirements-search]').addEventListener('input',event=>{catalogState.query=event.currentTarget.value;renderRequirementsCatalog();});
  phase.addEventListener('change',event=>{catalogState.phase=event.currentTarget.value;renderRequirementsCatalog();});
  qs('[data-expand-requirements]').addEventListener('click',()=>{catalogState.expanded=!catalogState.expanded;renderRequirementsCatalog();});
  renderRequirementsCatalog();
}

const communications={actor:null,contacts:[],selected:null,messages:[],notifications:{},unsubscribeNotifications:null,unsubscribeContacts:null,unsubscribeConversation:null,social:[],socialSelected:null,socialMessages:[],socialChannel:'all'};
const actorForCommunications=()=>globalThis.BELAVISTA_ADMIN_ACTOR||{uid:`local-${roleKey()}`,name:roleKey()==='foreman'?'Encarregado mobile':roleKey()==='owner'?'Dono':'Administrador',role:roleKey()};
const notificationItems=()=>Object.values(communications.notifications||{}).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));

function renderNotificationFeed(){
  const items=notificationItems(),feed=qs('[data-notification-feed]'),badge=qs('[data-notification-badge]');
  if(badge)badge.textContent=String(items.filter(item=>item.status!=='read'&&item.status!=='acknowledged').length);
  if(!feed)return;
  feed.innerHTML=items.map(item=>`<a class="notification-item severity-${esc(item.severity||'info')}" href="${esc(item.actionUrl||'#')}"><span>${esc(item.type||'atualização')}</span><strong>${esc(item.title||'Atualização operacional')}</strong><p>${esc(item.message||'')}</p><time>${esc(dateTime(item.createdAt))}</time></a>`).join('')||'<div class="empty-state">Nenhuma notificação neste canal.</div>';
}

function renderContacts(){
  const target=qs('[data-contact-list]');if(!target)return;
  const query=String(qs('[data-contact-search]')?.value||'').toLocaleLowerCase('pt-BR');
  const contacts=communications.contacts.filter(contact=>!query||`${contact.name} ${contact.role} ${contact.label}`.toLocaleLowerCase('pt-BR').includes(query));
  target.innerHTML=contacts.map(contact=>`<button class="contact-item ${communications.selected?.uid===contact.uid?'is-active':''}" data-contact-uid="${esc(contact.uid)}"><i>${esc((contact.name||'?').slice(0,1).toUpperCase())}</i><span><strong>${esc(contact.name)}</strong><small>${esc(contact.label||contact.role)} · ${contact.pushEnabled?'push ativo':'Realtime'}</small></span><em>${contact.online?'online':''}</em></button>`).join('')||'<div class="empty-state">Nenhum outro dispositivo autenticado foi encontrado.</div>';
  target.querySelectorAll('[data-contact-uid]').forEach(button=>button.addEventListener('click',()=>selectContact(communications.contacts.find(contact=>contact.uid===button.dataset.contactUid))));
}

function renderMessages(){
  const feed=qs('[data-message-feed]'),actor=communications.actor;if(!feed)return;
  feed.innerHTML=communications.messages.map(item=>`<article class="message-bubble ${item.fromUid===actor?.uid?'is-own':''}"><strong>${esc(item.fromUid===actor?.uid?'Você':item.fromName||communications.selected?.name)}</strong><p>${esc(item.message)}</p><time>${esc(dateTime(item.createdAt))}</time></article>`).join('')||'<div class="empty-state">Nenhuma mensagem ainda. Inicie a conversa com uma atualização objetiva.</div>';
  feed.scrollTop=feed.scrollHeight;
}

async function selectContact(contact){
  if(!contact)return;communications.selected=contact;communications.messages=[];renderContacts();renderMessages();
  const head=qs('[data-conversation-head]');head.innerHTML=`<strong>${esc(contact.name)}</strong><span>${esc(contact.label||contact.role)} · Realtime Database</span>`;
  const form=qs('[data-message-form]');form.elements.message.disabled=false;form.querySelector('button').disabled=false;
  communications.unsubscribeConversation?.();
  communications.unsubscribeConversation=await subscribeOperationalConversation(communications.actor,contact,messages=>{communications.messages=messages;renderMessages();});
}

function openCommunications(tab='notifications'){
  qs('[data-communication-sidebar]').classList.add('is-open');qs('[data-communication-sidebar]').setAttribute('aria-hidden','false');document.body.classList.add('communication-open');
  document.querySelectorAll('[data-communication-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.communicationTab===tab));
  document.querySelectorAll('[data-communication-view]').forEach(view=>view.classList.toggle('is-active',view.dataset.communicationView===tab));
}
function closeCommunications(){qs('[data-communication-sidebar]').classList.remove('is-open');qs('[data-communication-sidebar]').setAttribute('aria-hidden','true');document.body.classList.remove('communication-open');}

function renderSocial(){const list=qs('[data-social-list]'),query=String(qs('[data-social-search]')?.value||'').toLocaleLowerCase('pt-BR');if(!list)return;const rows=communications.social.filter(item=>!query||`${item.contactName} ${item.phone} ${item.channel}`.toLocaleLowerCase('pt-BR').includes(query));list.innerHTML=rows.map(item=>`<button class="contact-item ${communications.socialSelected?.id===item.id?'is-active':''}" data-social-id="${esc(item.id)}"><i>${item.channel==='instagram'?'IG':'WA'}</i><span><strong>${esc(item.contactName||item.externalThreadId)}</strong><small>${esc(item.channel)} · ${esc(item.phone||item.externalThreadId)}</small></span><em>${esc(item.status||'open')}</em></button>`).join('')||'<div class="empty-state">Nenhuma conversa externa recebida.</div>';list.querySelectorAll('[data-social-id]').forEach(button=>button.addEventListener('click',()=>selectSocial(rows.find(item=>item.id===button.dataset.socialId))));}
function renderSocialMessages(){const feed=qs('[data-social-feed]');if(!feed)return;feed.innerHTML=communications.socialMessages.map(item=>`<article class="message-bubble ${item.direction==='outbound'?'is-own':''}"><strong>${item.direction==='outbound'?'Você':esc(communications.socialSelected?.contactName||'Lead')}</strong><p>${esc(item.body)}</p><time>${esc(dateTime(item.createdAt))}</time></article>`).join('')||'<div class="empty-state">Nenhuma mensagem nesta conversa.</div>';feed.scrollTop=feed.scrollHeight;}
async function selectSocial(item){if(!item)return;communications.socialSelected=item;communications.socialMessages=[];renderSocial();const head=qs('[data-social-conversation-head]');head.innerHTML=`<strong>${esc(item.contactName||item.externalThreadId)}</strong><span>${esc(item.channel)} · ${esc(item.leadId?'Lead vinculado':'perfil aguardando vínculo')}</span>`;const form=qs('[data-social-form]');form.elements.message.disabled=false;form.querySelector('button').disabled=false;try{communications.socialMessages=(await jsonFetch(`/api/communications/conversations/${encodeURIComponent(item.id)}/messages`)).messages||[];renderSocialMessages();}catch(error){head.insertAdjacentHTML('beforeend',`<small class="error-text">${esc(error.message)}</small>`);}}
async function initializeSocial(){communications.socialChannel='instagram';try{const status=await jsonFetch('/api/communications/status');const s=status.social||{};qs('[data-social-status]').textContent=`Instagram ${s.instagram?.configured?'pronto para receber e enviar':'aguardando secrets e configuração do webhook'}`;}catch(error){qs('[data-social-status]').textContent=error.message;}await loadSocial();}
async function loadSocial(){try{communications.social=(await jsonFetch(`/api/communications/conversations?channel=${encodeURIComponent(communications.socialChannel)}`)).conversations||[];renderSocial();}catch(error){const target=qs('[data-social-list]');if(target)target.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;}}

async function enablePush(){
  const status=qs('[data-push-status]'),button=qs('[data-enable-push]');button.disabled=true;status.textContent='Registrando este celular…';
  try{
    const result=await registerOperationalDevice(communications.actor);
    await jsonFetch('/api/devices',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({installationId:result.device.installationId,fcmToken:result.device.fcmToken,platform:'twa'})}).catch(()=>null);
    status.textContent=result.pushEnabled?'Push e Realtime Database ativos neste celular.':'Realtime Database ativo; push aguarda a chave VAPID do ambiente.';button.textContent='Ativado';
  }catch(error){status.textContent=`Não foi possível ativar: ${error.message}`;button.disabled=false;}
}

async function initializeCommunications(){
  if('serviceWorker' in navigator)await navigator.serviceWorker.register('/sw.js?v=map-progress-area-v7',{updateViaCache:'none'}).catch(()=>null);
  await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(true));
  communications.actor=actorForCommunications();
  const picker=qs('[data-role]');if(picker){picker.value=communications.actor.role;picker.disabled=Boolean(globalThis.BELAVISTA_ADMIN_ACTOR);}
  communications.unsubscribeNotifications=await subscribeOperationalNotifications(communications.actor,items=>{communications.notifications=items;renderNotificationFeed();});
  communications.unsubscribeContacts=await subscribeOperationalContacts(communications.actor,contacts=>{communications.contacts=contacts;renderContacts();});
  await initializeSocial();
  if(new URLSearchParams(location.search).get('panel')==='messages')openCommunications('messages');
}

function renderMetrics(monitor){
  const worker=monitor.worker||{},hierarchy=monitor.hierarchy||{},cash=monitor.cash||{};
  qs('[data-worker-status]').textContent=worker.status==='online'?'ONLINE':'OFFLINE';
  qs('[data-worker-mode]').textContent=`${worker.mode||'local-loop'} · ${worker.aiProvider||'IA'} ${worker.aiConfigured?'configurada':'em modo de teste'}`;
  qs('[data-cash]').textContent=money(cash.balanceCents);
  qs('[data-cash-available]').textContent=`${money(cash.allocatableCents)} disponíveis após reserva`;
  qs('[data-event-count]').textContent=number(hierarchy.inputCount);
  qs('[data-agenda-count]').textContent=number(hierarchy.agendaCount);
  qs('[data-input-count]').textContent=number(hierarchy.inputCount);
  qs('[data-rule-count]').textContent=monitor.panoramaSummary?.stages?`${number(monitor.panoramaSummary.stages)} etapas`: 'ativas';
  qs('[data-inference-count]').textContent=number(hierarchy.inferenceCount);
  qs('[data-propagation-count]').textContent=number(hierarchy.propagationCount);
  qs('[data-stage-count]').textContent=`${number(monitor.panoramaSummary?.stages||monitor.stages?.length)} etapas`;
  qs('[data-updated]').textContent=`Leitura ${time(monitor.generatedAt)}`;
  qs('[data-connection]').textContent='Worker conectado';
  qs('.live-indicator')?.classList.add('ready');
}

function renderStages(monitor){
  const list=qs('[data-stage-list]'),stages=monitor.stages||[];
  if(!list)return;
  list.innerHTML=stages.map((stage,index)=>{
    const progress=Math.max(0,Math.min(100,Number(stage.progress)||0));
    const state=stageState(stage),classes=`stage-card ${state==='Concluída'?'is-done':''} ${state==='Bloqueada'?'is-blocked':''} ${stage.materialStatus==='critical'?'is-critical':''}`;
    const production=stage.production||{},personnel=stage.personnel||{};
    return `<a class="${classes}" href="${runtimeRouteV1('/admin/workers/stage',`stage=${encodeURIComponent(stage.key)}`)}"><header><small>${String(index+1).padStart(2,'0')} · ${esc(stage.key)}</small><span class="stage-state">${esc(state)}</span></header><h3>${esc(stageLabel(stage))}</h3><p>${esc(stage.nextStep||'Aguardando leitura de requisitos e disponibilidade de frente.')}</p><span class="stage-next">${stage.blockedBy?.length?`Dependências: ${esc(stage.blockedBy.join(' · '))}`:`Cobertura de caixa: ${number(stage.cashCoverage)}%`}</span><span class="stage-physical">${esc(physicalValue(production.totalQuantity,production.unit))} · ${esc(physicalValue(production.adjustedRate,production.rateUnit))} · ${esc(personnel.assignedHeadcount||0)}/${esc(personnel.requiredHeadcount||0)} pessoas</span><div class="progress"><i style="width:${progress}%"></i></div><span class="stage-coverage">${progress}% executado · ${number(stage.priority)} prioridade</span></a>`;
  }).join('')||'<div class="empty-state">Nenhuma etapa foi encontrada.</div>';
}

function renderPhysicalPlan(monitor){
  const site=monitor.productionBaseline?.site||{},derived=monitor.productionBaseline?.derived||{},siteTarget=qs('[data-physical-site]'),list=qs('[data-physical-plan-list]');
  if(siteTarget)siteTarget.innerHTML=`<article><small>LOTES NO DWG</small><strong>${number(site.lotCount)}</strong><span>${number(site.residentialLots)} residenciais · ${number(site.commercialLots)} comerciais</span></article><article><small>ÁREA DE LOTES</small><strong>${physicalValue(site.lotAreaM2,'m²')}</strong><span>base cartográfica</span></article><article><small>VIAS REGISTRADAS</small><strong>${number(site.roadCount)}</strong><span>${number(site.curbAndWalkwayPolylines)} polilinhas de meio-fio/calçada</span></article><article><small>VOLUME VIÁRIO</small><strong>${physicalValue(derived.roadSurfaceM2,'m²')}</strong><span>${physicalValue(derived.roadLengthM,'m')} de eixo estimado</span></article><article><small>QUALIDADE</small><strong>${esc(monitor.productionBaseline?.source?.crs||'DWG')}</strong><span>${esc(monitor.productionBaseline?.warning||'Base disponível')}</span></article>`;
  if(!list)return;
  list.innerHTML=(monitor.stages||[]).map(stage=>{const production=stage.production||{},personnel=stage.personnel||{},shortfalls=(stage.materialShortfalls||[]).slice(0,3),relations=(stage.relations||[]).slice(0,2),overlap=stage.overlapPlan||{};return `<article class="physical-plan-row"><div class="physical-plan-title"><span class="eyebrow">${esc(stage.key)}</span><h3>${esc(stage.name)}</h3><p>${esc(stage.nextStep||'Frente aguardando leitura')}</p></div><div class="physical-plan-metric"><small>PRODUÇÃO</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong><span>ritmo ${esc(physicalValue(production.adjustedRate,production.rateUnit))}</span>${production.secondary?.quantity?`<span>apoio ${esc(physicalValue(production.secondary.quantity,production.secondary.unit))}</span>`:''}</div><div class="physical-plan-metric"><small>EQUIPE</small><strong>${esc(personnel.assignedHeadcount||0)}/${esc(personnel.requiredHeadcount||0)}</strong><span>${esc(availabilityLabel(personnel))}</span><span>${esc((personnel.matchedRegisteredPeople||[]).map(item=>item.name).join(' · ')||'Sem correspondência cadastrada')}</span></div><div class="physical-plan-materials"><small>MATERIAIS / RELAÇÕES</small><span class="coverage-chip ${stage.materialStatus==='critical'?'is-critical':''}">${number(stage.materialCoverage)}% cobertura</span><p>${shortfalls.length?`Faltam: ${esc(shortfalls.map(item=>physicalValue(item.quantity,item.unit)+' '+item.name).join(' · '))}`:'Sem falta quantitativa nesta leitura.'}</p><p>${esc(overlap.mode||'sequencial')} · ${esc(relations.map(item=>item.label).join(' · ')||'sem relação registrada')}</p></div><a class="physical-plan-open" href="${runtimeRouteV1('/admin/workers/stage',`stage=${encodeURIComponent(stage.key)}`)}">Abrir etapa →</a></article>`;}).join('')||'<div class="empty-state">Nenhum plano físico disponível.</div>';
}

function renderEvents(monitor){
  const list=qs('[data-event-list]');if(!list)return;
  const events=(monitor.events||[]).slice(0,18).map(item=>({at:item.createdAt,label:eventLabel(item.type),detail:`${item.entity||'sistema'} · ${item.entityId||''}`,status:item.status||'pending',kind:'event'}));
  const jobs=(monitor.jobs||[]).slice(0,8).map(item=>({at:item.startedAt,label:item.jobName==='operational-loop'?'Ciclo operacional':'Planner de automação',detail:`${item.status} · ${item.periodKey||''}`,status:item.status||'ok',kind:'job'}));
  const rows=[...events,...jobs].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,20);
  list.innerHTML=rows.map(item=>`<article class="event-row"><time>${esc(dateTime(item.at))}</time><div><strong>${esc(item.label)}</strong><span>${esc(item.detail)}</span></div><em class="${item.kind==='job'?'job':''}">${esc(item.status)}</em></article>`).join('')||'<div class="empty-state">Nenhum evento registrado ainda.</div>';
}

function renderAgenda(monitor){
  const list=qs('[data-agenda-list]');if(!list)return;
  const agenda=monitor.agenda||[];
  list.innerHTML=agenda.map((item,index)=>{const production=item.production||item.properties?.production||{};return `<article class="agenda-row"><span class="agenda-index">${String(index+1).padStart(2,'0')}</span><time>${esc(item.plannedStart||item.plannedEnd||'sem data')}</time><div><strong>${esc(item.name||item.title||'Atividade planejada')}</strong><span>${esc(item.stageName||item.stageKey||'Etapa')} · ${esc(item.owner||'Responsável a definir')}</span><small>${production.totalQuantity?esc(physicalValue(production.totalQuantity,production.unit)):'Produção a confirmar'}${production.adjustedRate?` · ritmo ${esc(physicalValue(production.adjustedRate,production.rateUnit))}`:''}</small></div><em>${esc(item.status||'planejada')}</em></article>`;}).join('')||'<div class="empty-state">Nenhuma atividade entrou no cronograma atual.</div>';
}

function renderMonitor(monitor){
  renderMetrics(monitor);renderPhysicalPlan(monitor);renderStages(monitor);renderAgenda(monitor);renderEvents(monitor);
  const loop=monitor.latestLoop;
  if(loop)qs('[data-cycle-status]').textContent=`Último ciclo ${time(loop.startedAt)} · ${loop.status==='ok'?'concluído':'com atenção'} · agenda e prontidão recalculadas.`;
}

function resultHtml(payload){
  const tests=payload.tests||[];
  const byCategory=tests.reduce((out,test)=>{const key=test.category||'evento';out[key]=(out[key]||0)+1;return out;},{});
  const totalSignals=tests.reduce((sum,test)=>sum+(test.inference?.signals||[]).length,0),notifications=tests.reduce((sum,test)=>sum+Number(test.outputs?.notifications?.previewCount||0),0),propagations=tests.reduce((sum,test)=>sum+Number(test.outputs?.propagation?.count||0),0);
  const categorySummary=Object.entries(byCategory).map(([key,value])=>`${esc(key)} ${value}`).join(' · ');
  return `<header><b>Suíte concluída · ${esc(payload.mode||'dry-run-local')}</b><span>${esc(payload.externalMessaging||'saída externa desabilitada')} · ${tests.length} casos</span></header><div class="suite-result-summary"><span>CASOS<b>${tests.length}</b></span><span>GATILHOS<b>${totalSignals}</b></span><span>NOTIFICAÇÕES<b>${notifications}</b></span><span>PROPAGAÇÕES<b>${propagations}</b></span></div><div class="case-details">Cobertura: ${categorySummary||'nenhuma'}</div><ol>${tests.map(test=>{const actions=(test.inference?.signals||[]).map(signal=>signal.action).join(', ')||'nenhum gatilho correspondente';const output=test.outputs||{};const generation=output.generation||{};return `<li><div class="case-line"><span class="case-kind">${esc(test.category||'evento')}</span><code>${esc(test.input?.event)}</code><span class="case-output">${esc(test.label||'Caso')} → ${esc(actions)}</span></div><small class="case-details">geração: ${esc(generation.report&&generation.report!=='não aplicável'?generation.report:`agenda ${generation.agendaItems??0} · plano ${generation.stagePlan??0}`)} · notificação pseudo: ${esc(output.notifications?.previewCount??0)} · propagação: ${esc(output.propagation?.count??0)} · ${esc(test.stored?.status||'avaliado')}</small></li>`;}).join('')}</ol>`;
}

const cycleStatusClass=value=>value==='pass'?'is-pass':value==='attention'?'is-attention':'is-fail';
const cycleStatusLabel=value=>value==='pass'?'confirmado':value==='attention'?'atenção':'falhou';
const cycleBarWidth=(value,max)=>{const amount=Number(value)||0,ceiling=Number(max)||0;return ceiling>0?Math.max(0,Math.min(100,Math.round((amount/ceiling)*100))):0;};

function cycleBars(chart){
  const data=Array.isArray(chart?.data)?chart.data:[],max=chart?.kind==='crew'?100:Math.max(1,...data.map(item=>Number(item.value)||0));
  return data.map(item=>{
    const isCrew=chart?.kind==='crew',itemMax=isCrew?Number(item.max)||0:max,value=Number(item.value)||0,width=isCrew?cycleBarWidth(value,itemMax):cycleBarWidth(value,max);
    const display=isCrew?`${value}/${itemMax} posições`:chart?.unit==='cobertura'||chart?.unit==='concluído'?`${Math.round(value)}%`:`${value} ${chart?.unit||''}`;
    const meta=isCrew?(item.members||[]).join(' · ')||'Nenhum colaborador correspondente':item.meta||'';
    return `<div class="cycle-bar-row"><div class="cycle-bar-label"><span>${esc(item.label||'—')}</span><b>${esc(display)}</b></div><div class="cycle-bar-track" role="meter" aria-label="${esc(item.label||'Indicador')}" aria-valuenow="${esc(value)}" aria-valuemin="0" aria-valuemax="${esc(isCrew?itemMax:max)}"><i style="width:${width}%"></i></div><small>${esc(meta)}</small></div>`;
  }).join('')||'<div class="empty-state">Nenhum dado foi gerado para este gráfico.</div>';
}

function renderDevelopmentCycle(payload){
  const cycle=payload?.cycle||{},charts=cycle.charts||{},summary=cycle.summary||{};
  const checks=(cycle.checks||[]).map(item=>`<li class="cycle-check ${cycleStatusClass(item.status)}"><span>${esc(cycleStatusLabel(item.status))}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></div></li>`).join('');
  const schedule=(cycle.schedule||[]).map(item=>`<li class="cycle-schedule-row"><time>${esc(item.date)}${item.end&&item.end!==item.date?` → ${esc(item.end)}`:''}</time><div><strong>${esc(item.title)}</strong><small>${esc(item.stage)} · ${esc(item.owner)}</small></div><em>${esc(item.status)}</em></li>`).join('')||'<li class="empty-state">Nenhuma atividade entrou na agenda.</li>';
  const materials=(cycle.materialRows||[]).map(item=>`<tr><td>${esc(item.stage)}</td><td><strong>${esc(item.material)}</strong></td><td>${esc(physicalValue(item.required,item.unit))}</td><td>${esc(physicalValue(item.available,item.unit))}</td><td class="${item.shortfall>0?'is-critical':''}">${esc(physicalValue(item.shortfall,item.unit))}</td><td>${esc(Math.round(Number(item.coverage)||0))}%</td></tr>`).join('')||'<tr><td colspan="6">Nenhum material foi calculado.</td></tr>';
  const chartBlock=(key,extra='')=>`<article class="cycle-chart"><header><div><span class="eyebrow">${esc(charts[key]?.unit||'LEITURA')}</span><h3>${esc(charts[key]?.title||key)}</h3></div><span class="cycle-chart-count">${esc((charts[key]?.data||[]).length)} linhas</span></header>${cycleBars(charts[key])}${extra}</article>`;
  const timeline=`<article class="cycle-chart cycle-timeline"><header><div><span class="eyebrow">ORDENAÇÃO TEMPORAL</span><h3>Itens de agenda gerados</h3></div><span class="cycle-chart-count">${esc((cycle.schedule||[]).length)} itens</span></header><ol>${schedule}</ol></article>`;
  const materialsTable=`<article class="cycle-material-table"><header><div><span class="eyebrow">TABELA DE ATIVIDADES</span><h3>Lista de materiais por etapa</h3></div><span class="cycle-chart-count">${esc(summary.materialItems||0)} itens</span></header><div class="physical-table-wrap"><table class="physical-table"><thead><tr><th>Etapa</th><th>Material</th><th>Necessário</th><th>Disponível</th><th>Falta</th><th>Cobertura</th></tr></thead><tbody>${materials}</tbody></table></div></article>`;
  return `<section class="development-cycle-result"><header class="cycle-result-header"><div><span class="eyebrow">CONFIRMAÇÃO DE CICLO · DRY-RUN</span><h3>Ciclo de desenvolvimento concluído</h3><p>${esc(cycle.objective||'Agenda, cronograma, quadro de pessoal e materiais por atividade.')}</p></div><span class="cycle-confirmed">✓ confirmado</span></header><div class="cycle-confirmation"><strong>${esc(cycle.confirmation||'Ciclo confirmado.')}</strong><small>Saída externa desabilitada · dados calculados pela mesma leitura operacional do worker.</small></div><ul class="cycle-check-list">${checks}</ul><div class="cycle-summary-line"><span>AGENDA <b>${esc(summary.agendaItems||0)}</b></span><span>ETAPAS <b>${esc(summary.stages||0)}</b></span><span>PESSOAL <b>${esc(summary.assignedPeople||0)}/${esc(summary.requiredPeople||0)}</b></span><span>MATERIAIS <b>${esc(summary.materialItems||0)}</b></span></div><div class="cycle-chart-grid">${chartBlock('agenda')}${chartBlock('cronograma')}${chartBlock('pessoal')}${chartBlock('materiais')}</div><div class="cycle-detail-grid">${timeline}${materialsTable}</div></section>`;
}

const TEST_CASES=[...document.querySelectorAll('[data-test-case]')].map(button=>button.dataset.testCase).filter(Boolean);

function updateSuiteSummary(payload){
  const tests=payload?.tests||[],target=qs('[data-suite-summary]');
  if(payload?.cycle){if(target)target.textContent=`Ciclo confirmado · ${payload.cycle.summary?.agendaItems||0} atividades · ${payload.cycle.summary?.materialItems||0} materiais · dry-run`;return;}
  if(target)target.textContent=tests.length?`${tests.length} casos avaliados · ${tests.reduce((sum,test)=>sum+(test.inference?.signals||[]).length,0)} gatilhos · saída externa desabilitada`:`${TEST_CASES.length} casos disponíveis · aguardando execução`;
}

async function runTest(scenario='full',caseId=''){
  const result=qs('[data-test-result]'),buttons=[...document.querySelectorAll('[data-test-case],[data-run-suite],[data-run-single],[data-run-cycle],[data-run-development-cycle]')];
  buttons.forEach(button=>button.disabled=true);result.className='test-result';result.innerHTML='<span>Executando leitura, avaliação das diretrizes e propagação local…</span>';
  try{
    const body=caseId?{scenario:'single',caseId}:scenario==='single'?{scenario:'single',event:qs('[data-test-event]').value}:scenario==='development-cycle'?{scenario:'development-cycle'}:{scenario:'suite'};
    const payload=await jsonFetch('/api/automation/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    result.classList.add('success');result.innerHTML=scenario==='development-cycle'?renderDevelopmentCycle(payload):resultHtml(payload);updateSuiteSummary(payload);renderMonitor(payload.monitor||{});
  }catch(error){result.classList.add('error');result.innerHTML=`<span>Falha no teste: ${esc(error.message)}</span>`;}
  finally{buttons.forEach(button=>button.disabled=false);}
}

async function runCycle(){
  const status=qs('[data-cycle-status]'),button=qs('[data-run-cycle]');button.disabled=true;status.textContent='Worker executando planejamento, manutenção de agenda e cronograma…';
  try{await jsonFetch('/api/operational-loop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'twa.worker.manual',referenceDate:new Date().toISOString().slice(0,10),syncActivities:true,publishNotifications:true,includeNotifications:true,clientState:{view:'twa-worker-monitor',globalSituation:true}})});await refresh();status.textContent='Ciclo concluído: prontidão, agenda e notificações locais atualizadas.';}
  catch(error){status.textContent=`Falha no ciclo: ${error.message}`;}
  finally{button.disabled=false;}
}

async function fetchMonitor(){return jsonFetch('/api/automation/monitor');}
async function refresh(){
  if(location.pathname.endsWith('/stage')||location.pathname.endsWith('/stage/'))return refreshDetail();
  try{const monitor=await fetchMonitor();renderMonitor(monitor);}catch(error){qs('[data-connection]').textContent='Worker indisponível';qs('.live-indicator')?.classList.remove('ready');qs('[data-cycle-status]').textContent=`Não foi possível atualizar a monitoria: ${error.message}`;}
}

async function refreshDetail(){
  const params=new URLSearchParams(location.search),key=params.get('stage')||'',mode=params.get('mode')||'',stageId=Number(params.get('stageId')||0);
  try{const payload=await jsonFetch('/api/automation/panorama');let stage=payload.stages?.find(item=>item.key===key||(stageId&&Number(item.stageId)===stageId));if(mode==='new')return renderStageEditor(null,payload);if(mode==='edit'&&stageId&&(!stage||Number(stage.stageId)!==stageId)){const dbStage=(await jsonFetch('/api/stages-admin/'+encodeURIComponent(stageId))).stage;stage={key:`stage-${dbStage.id}`,stageId:dbStage.id,name:dbStage.name,status:dbStage.status,progress:dbStage.progress,week:dbStage.week,owner:dbStage.owner,executionProfile:dbStage.aiConfig||{},existingActivities:dbStage.activities||[]};}stage=stage||payload.stages?.[0];if(mode==='edit')return renderStageEditor(stage,payload);renderDetail(stage,payload);}
  catch(error){root.innerHTML=`<main class="worker-main"><a class="detail-back" href="${runtimeRouteV1('/admin/workers')}">← Monitoria</a><section class="detail-hero"><h1>Falha ao abrir a etapa</h1><p>${esc(error.message)}</p></section></main>`;}
}

function stageEditorActivityRow(activity={}){
  return `<fieldset class="stage-editor-activity" data-stage-editor-activity data-activity-id="${esc(activity.id||'')}"><label>Atividade<input name="activityName" required value="${esc(activity.name||'')}" placeholder="Ex.: Executar rede principal"></label><label>Categoria<input name="activityCategory" value="${esc(activity.category||'Execução')}" placeholder="Execução"></label><label>Status<select name="activityStatus">${['planejado','pendente','em andamento','concluído'].map(value=>`<option ${String(activity.status||'').toLocaleLowerCase('pt-BR')===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Progresso %<input name="activityProgress" type="number" min="0" max="100" value="${Number(activity.progress)||0}"></label><label>Início<input name="activityStart" type="date" value="${esc(activity.plannedStart||'')}"></label><label>Fim<input name="activityEnd" type="date" value="${esc(activity.plannedEnd||'')}"></label><button type="button" class="button button-ghost" data-stage-editor-remove-activity>Remover</button></fieldset>`;
}

function renderStageEditor(stage){
  const isNew=!stage,profile=stage?.executionProfile||stage?.aiConfig||{},activities=[...(stage?.existingActivities||stage?.plannedActivities||[])].filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index).slice(0,20),title=isNew?'Adicionar etapa':'Editar etapa';
  root.innerHTML=`<header class="worker-header"><a class="worker-brand" href="${runtimeRouteV1('/admin/workers')}"><span class="brand-symbol">◢</span><span><strong>ALIANÇA PARK</strong><small>WORKERS · FORMULÁRIO DE ETAPA</small></span></a><a class="header-link" href="${runtimeRouteV1('/admin')}">Admin</a></header><main class="worker-main worker-detail stage-editor-page"><a class="detail-back" href="${isNew?runtimeRouteV1('/admin/workers'):runtimeRouteV1('/admin/workers/stage',`stage=${encodeURIComponent(stage.key)}`)}">← Cancelar e voltar</a><section class="detail-hero"><span class="eyebrow">${isNew?'NOVA FRENTE':'ETAPA · '+esc(stage.key)}</span><h1>${title}</h1><p>Defina a etapa, seus critérios de execução e as atividades que o worker deverá acompanhar.</p></section><form data-stage-editor data-stage-id="${esc(stage?.stageId||'')}"><section class="detail-block"><h2>Identificação e execução</h2><div class="stage-editor-grid"><label>Nome da etapa<input name="name" required value="${esc(stage?.name||'')}" placeholder="Ex.: Drenagem complementar"></label><label>Responsável<input name="owner" value="${esc(stage?.owner||'')}" placeholder="Equipe ou encarregado"></label><label>Situação<select name="status">${['planejado','pendente','andamento','concluído'].map(value=>`<option ${String(stage?.status||'planejado').toLocaleLowerCase('pt-BR')===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Progresso %<input name="progress" type="number" min="0" max="100" value="${Number(stage?.progress)||0}"></label><label>Fase / semana<input name="week" value="${esc(stage?.week||'')}" placeholder="Ex.: Semana 03"></label><label class="stage-editor-wide">Descrição típica<textarea name="typicalDescription" rows="4" placeholder="Escopo, condições e ordem de execução.">${esc(profile.typicalDescription||'')}</textarea></label><label class="stage-editor-wide">Requisitos do worker <small>uma linha por requisito</small><textarea name="requirements" rows="4">${esc((profile.requirements||[]).join('\n'))}</textarea></label></div></section><section class="detail-block"><header class="stage-editor-section-head"><div><h2>Atividades da etapa</h2><p>Os itens passam a compor a agenda e a leitura do worker.</p></div><button type="button" class="button button-primary" data-stage-editor-add-activity>＋ Adicionar atividade</button></header><div class="stage-editor-activities" data-stage-editor-activities>${(activities.length?activities:[{}]).map(stageEditorActivityRow).join('')}</div></section><footer class="stage-editor-footer"><p data-stage-editor-status>Revise os dados antes de salvar. A atualização ficará disponível para o worker no próximo ciclo.</p><button type="submit" class="button button-primary">Salvar etapa e atividades</button></footer></form></main>`;
  const form=qs('[data-stage-editor]'),list=qs('[data-stage-editor-activities]');
  qs('[data-stage-editor-add-activity]')?.addEventListener('click',()=>{list.insertAdjacentHTML('beforeend',stageEditorActivityRow());list.lastElementChild?.querySelector('[name="activityName"]')?.focus();});
  list?.addEventListener('click',event=>event.target.closest('[data-stage-editor-remove-activity]')?.closest('[data-stage-editor-activity]')?.remove());
  form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),status=qs('[data-stage-editor-status]'),data=new FormData(form),base={name:String(data.get('name')||'').trim(),owner:String(data.get('owner')||'').trim(),status:String(data.get('status')||'planejado'),progress:Number(data.get('progress')||0),week:String(data.get('week')||'').trim()};const activities=[...form.querySelectorAll('[data-stage-editor-activity]')].map(row=>({id:row.dataset.activityId||undefined,name:row.querySelector('[name="activityName"]')?.value.trim(),category:row.querySelector('[name="activityCategory"]')?.value.trim(),status:row.querySelector('[name="activityStatus"]')?.value,progress:Number(row.querySelector('[name="activityProgress"]')?.value||0),plannedStart:row.querySelector('[name="activityStart"]')?.value,plannedEnd:row.querySelector('[name="activityEnd"]')?.value})).filter(item=>item.name);button.disabled=true;status.textContent='Salvando…';try{const headersValue={'Content-Type':'application/json',...(await headers())};const saved=isNew?(await jsonFetch('/api/stages-admin',{method:'POST',headers:headersValue,body:JSON.stringify(base)})).stage:(await jsonFetch('/api/stages-admin/'+encodeURIComponent(stage.stageId),{method:'PUT',headers:headersValue,body:JSON.stringify(base)})).stage;await jsonFetch('/api/stages-admin/'+encodeURIComponent(saved.id)+'/ai',{method:'PUT',headers:headersValue,body:JSON.stringify({typicalDescription:String(data.get('typicalDescription')||''),requirements:String(data.get('requirements')||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean)})});await jsonFetch('/api/stages-admin/'+encodeURIComponent(saved.id)+'/activities',{method:'PUT',headers:headersValue,body:JSON.stringify({activities})});status.textContent='Etapa salva. Reabrindo a superfície do worker…';location.assign(runtimeRouteV1('/admin/workers/stage',`stage=stage-${saved.id}&stageId=${encodeURIComponent(saved.id)}&mode=edit`));}catch(error){status.textContent='Não foi possível salvar: '+error.message;button.disabled=false;}});
}

function renderDetail(stage,payload){
  if(!stage)return;
  const profile=stage.executionProfile||{},automation=stage.automation||{},progress=Number(stage.progress)||0;
  const activities=[...(stage.plannedActivities||[]),...(stage.existingActivities||[])].slice(0,8);
  const requirements=(profile.requirements||[]).slice(0,8),conditions=(profile.conditions||[]).slice(0,8),materials=(profile.materialsTable||[]).slice(0,8);
  const production=automation.production||{},personnel=automation.personnel||{},physicalMaterials=automation.materialPlan||[],relations=automation.relations||[],overlap=automation.overlapPlan||{};
  const requirementsHtml=requirements.map(item=>`<li>${esc(item)}</li>`).join('')||'<li>Nenhum requisito cadastrado.</li>';
  const conditionsHtml=conditions.map(item=>`<li>${esc(item)}</li>`).join('')||'<li>Nenhuma condição cadastrada.</li>';
  const materialHtml=(materials.length?materials:((stage.materials||[]).map(name=>({name})))).map(item=>`<li><b>${esc(item.name)}</b>${item.quantity?` · ${esc(item.quantity)} ${esc(item.unit||'un.')}`:''}${item.status?` · ${esc(item.status)}`:''}</li>`).join('')||'<li>Materiais ainda não dimensionados.</li>';
  const physicalMaterialHtml=physicalMaterials.map(item=>`<tr><td><b>${esc(item.name)}</b>${item.inventoryName?`<small>estoque: ${esc(item.inventoryName)}</small>`:''}</td><td>${esc(physicalValue(item.requiredQuantity,item.unit))}</td><td>${esc(physicalValue(item.availableQuantity,item.unit))}</td><td class="${item.coverageRatio<.45?'is-critical':''}">${number(Math.round(item.coverageRatio*100))}%</td></tr>`).join('')||'<tr><td colspan="4">Nenhum material físico calculado para esta etapa.</td></tr>';
  const crewHtml=(personnel.crewPlan||[]).map(item=>`<li><b>${esc(item.requiredCount)}×</b> ${esc(item.role)}</li>`).join('')||'<li>Equipe não definida.</li>';
  const relationHtml=relations.map(item=>`<li><b>${esc(item.direction==='incoming'?'Entrada':'Saída')}</b> ${esc(item.label)} <small>${esc(item.type)}</small></li>`).join('')||'<li>Sem relação registrada.</li>';
  root.innerHTML=`<header class="worker-header"><a class="worker-brand" href="${runtimeRouteV1('/admin/workers')}"><span class="brand-symbol">◢</span><span><strong>ALIANÇA PARK</strong><small>WORKERS · ETAPA DEDICADA</small></span></a><a class="header-link" href="${runtimeRouteV1('/admin')}">Admin</a></header><main class="worker-main worker-detail"><a class="detail-back" href="${runtimeRouteV1('/admin/workers')}">← Voltar à monitoria</a><section class="detail-hero"><span class="eyebrow">ETAPA · ${esc(stage.key)}</span><h1>${esc(stage.name)}</h1><p>${esc(profile.typicalDescription||'Superfície dedicada para acompanhar a execução desta frente.')}</p><div class="detail-status"><span>${esc(stageState(stage))}</span><span>${progress}% realizado</span><span>Caixa ${number(automation.cashCoverage)}%</span><span>Prioridade ${number(automation.priority)}</span></div><button class="button button-primary" data-detail-test>Testar gatilho desta etapa</button></section><section class="detail-grid"><article><small>INÍCIO INFERIDO</small><strong>${esc(automation.plannedStart||'—')}</strong></article><article><small>PREVISÃO</small><strong>${esc(automation.plannedFinish||'—')}</strong></article><article><small>VOLUME BASE DWG</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong></article><article><small>RITMO AJUSTADO</small><strong>${esc(physicalValue(production.adjustedRate,production.rateUnit))}</strong></article><article><small>EQUIPE REGISTRADA</small><strong>${esc(personnel.assignedHeadcount||0)}/${esc(personnel.requiredHeadcount||0)}</strong></article><article><small>DEPENDÊNCIAS</small><strong>${stage.blockedBy?.length?esc(stage.blockedBy.join(' · ')):'Liberada'}</strong></article></section><section class="detail-block"><h2>Projeção física e disponibilidade</h2><p class="detail-note">${esc((production.basis||automation.calculationBasis||[]).join(' '))}</p><div class="detail-subgrid"><div><h3>MATERIAIS CALCULADOS</h3><div class="physical-table-wrap"><table class="physical-table"><thead><tr><th>Material</th><th>Necessário</th><th>Disponível</th><th>Cobertura</th></tr></thead><tbody>${physicalMaterialHtml}</tbody></table></div></div><div><h3>EQUIPE PREVISTA</h3><ul class="compact-list">${crewHtml}</ul><p class="detail-note">${esc(personnel.matchedRegisteredPeople?.length?`Registrados para esta frente: ${personnel.matchedRegisteredPeople.map(item=>item.name).join(' · ')}`:'Nenhum responsável/equipe correspondente cadastrado.')}</p><span class="status-pill status-${esc(personnel.status||'registration_pending')}">${esc(availabilityLabel(personnel))}</span></div></div></section><section class="detail-block"><h2>Diretrizes que alimentam o worker</h2><h3>REQUISITOS</h3><ul>${requirementsHtml}</ul><h3>CONDIÇÕES DE LIBERAÇÃO</h3><ul>${conditionsHtml}</ul><h3>MATERIAIS E RECURSOS DE PERFIL</h3><ul>${materialHtml}</ul></section><section class="detail-block"><h2>Fluxo planejado e agenda</h2><p class="detail-note">${esc(overlap.rule||'A agenda segue as dependências e o caixa disponível.')}</p>${activities.map(item=>`<div class="activity-row"><strong>${esc(item.name||item.title||'Atividade')}</strong><em>${esc(item.status||'planejada')}</em><span>${esc(item.owner||'Responsável a definir')} · ${esc(item.plannedStart||item.plannedEnd||'sem data')}</span></div>`).join('')||'<div class="empty-state">Nenhuma atividade planejada nesta etapa.</div>'}</section><section class="detail-block"><h2>Correlações e sobreposições</h2><div class="detail-subgrid"><div><h3>RELAÇÕES</h3><ul class="compact-list">${relationHtml}</ul></div><div><h3>REGRA DA FRENTE</h3><p class="detail-note">Modo: <b>${esc(overlap.mode||'sequencial')}</b><br>${esc(overlap.rule||'Sem sobreposição operacional registrada.')}</p><p class="detail-note">Confirmações de campo e documentos continuam humanas; a IA apenas organiza e sugere a propagação.</p></div></div></section></main><footer class="worker-footer"><span>Aliança Park · etapa dedicada</span><a href="${runtimeRouteV1('/admin/workers')}">Monitoria geral</a></footer>`;
  qs('[data-detail-test]')?.addEventListener('click',async event=>{event.currentTarget.disabled=true;event.currentTarget.textContent='Avaliando…';try{const response=await jsonFetch('/api/automation/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:'single',event:'production.measured',entity:'stage',entityId:stage.key,payload:{stage:stage.name}})});event.currentTarget.textContent=`Gatilho avaliado · ${(response.tests?.[0]?.inference?.signals||[]).length} ação(ões)`;}catch(error){event.currentTarget.textContent='Falha ao avaliar';}finally{event.currentTarget.disabled=false;}});
}

qs('[data-role]')?.addEventListener('change',refresh);
qs('[data-run-suite]')?.addEventListener('click',()=>runTest('suite'));
qs('[data-run-development-cycle]')?.addEventListener('click',()=>runTest('development-cycle'));
document.querySelectorAll('[data-test-case]').forEach(button=>button.addEventListener('click',()=>runTest('single',button.dataset.testCase)));
qs('[data-run-single]')?.addEventListener('click',()=>runTest('single'));
qs('[data-run-cycle]')?.addEventListener('click',runCycle);
document.querySelectorAll('[data-open-communications]').forEach(button=>button.addEventListener('click',()=>openCommunications(button.dataset.openCommunications)));
document.querySelectorAll('[data-communication-close]').forEach(button=>button.addEventListener('click',closeCommunications));
document.querySelectorAll('[data-communication-tab]').forEach(button=>button.addEventListener('click',()=>openCommunications(button.dataset.communicationTab)));
document.querySelectorAll('[data-social-channel]').forEach(button=>button.addEventListener('click',async()=>{communications.socialChannel=button.dataset.socialChannel;document.querySelectorAll('[data-social-channel]').forEach(item=>item.classList.toggle('is-active',item===button));await loadSocial();}));
qs('[data-social-search]')?.addEventListener('input',renderSocial);
qs('[data-social-form]')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,textValue=form.elements.message.value.trim(),selected=communications.socialSelected;if(!textValue||!selected)return;const button=form.querySelector('button');button.disabled=true;try{await jsonFetch(`/api/communications/conversations/${encodeURIComponent(selected.id)}/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:textValue})});form.reset();communications.socialMessages=(await jsonFetch(`/api/communications/conversations/${encodeURIComponent(selected.id)}/messages`)).messages||[];renderSocialMessages();}catch(error){alert(error.message);}finally{button.disabled=false;}});
qs('[data-contact-search]')?.addEventListener('input',renderContacts);
qs('[data-enable-push]')?.addEventListener('click',enablePush);
qs('[data-message-form]')?.addEventListener('submit',async event=>{event.preventDefault();const field=event.currentTarget.elements.message,button=event.currentTarget.querySelector('button'),message=field.value.trim();if(!message||!communications.selected)return;button.disabled=true;try{await sendOperationalMessage(communications.actor,communications.selected,message);field.value='';}catch(error){field.setCustomValidity(error.message);field.reportValidity();setTimeout(()=>field.setCustomValidity(''),1200);}finally{button.disabled=false;}});
// Os módulos ES são avaliados em paralelo com admin-auth.mjs. Não iniciar
// chamadas protegidas antes de a sessão persistida estar validada: além de
// evitar o primeiro request com identidade local, isso impede a página de
// workers de entrar em estado parcialmente renderizado após uma navegação.
const initializeWorkerSurface=async()=>{
  await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(true));
  initializeRequirementsCatalog();
  await initializeCommunications().catch(error=>{
    const status=qs('[data-push-status]');
    if(status)status.textContent=`Canal indisponível: ${error.message}`;
  });
  await refresh();
  if(!location.pathname.endsWith('/stage')&&!location.pathname.endsWith('/stage/'))window.setInterval(refresh,8000);
};
void initializeWorkerSurface();
}
