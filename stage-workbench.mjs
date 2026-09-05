import {STAGE_WORKBENCH,findWorkbenchStage,findWorkbenchActivity} from './stage-workbench-data.mjs';
// Registra o componente antes de qualquer mapa ser criado na rota dedicada.
// Assim a página de atividade recebe a instância 3D real, com raycast e
// pintura por polígono, em vez de um elemento HTML ainda não atualizado.
await import('./components.js?v=ngrok-route-v1');

const root=document.querySelector('[data-worker-app]');
const params=new URLSearchParams(location.search);
const requestedStage=params.get('stage')||'project';
const isActivity=/\/activity\/?$/.test(location.pathname);
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
function queueStateSave(){
  clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{
    const state={layout:stageContext.layout,links:stageContext.links};
    const status=document.querySelector('[data-sync-state]');if(status)status.textContent='Salvando organização…';
    try{await api(`/api/workbench/state?stage=${encodeURIComponent(stageContext.definition.key)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(status)status.textContent='Organização salva e auditada';}
    catch(error){if(status)status.textContent=`Falha ao salvar: ${error.message}`;}
  },450);
}

function drawConnections(){
  if(!stageContext)return;
  const svg=document.querySelector('[data-flow-lines]'),labels=document.querySelector('[data-flow-labels]');if(!svg||!labels)return;
  const cardW=220,cardH=142;
  svg.innerHTML=stageContext.links.map(link=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';const x1=a.x+cardW,y1=a.y+cardH/2,x2=b.x,y2=b.y+cardH/2,curve=Math.max(45,(x2-x1)*.45);return `<path d="M ${x1} ${y1} C ${x1+curve} ${y1}, ${x2-curve} ${y2}, ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="4"/>`;}).join('');
  labels.innerHTML=stageContext.links.map((link,index)=>{const a=stageContext.layout[link.from],b=stageContext.layout[link.to];if(!a||!b)return '';return `<label class="flow-link-label" style="left:${(a.x+b.x+220)/2-72}px;top:${(a.y+b.y)/2+58}px"><span>REQUISITO</span><input data-link-label="${index}" value="${esc(link.label)}" aria-label="Rótulo da dependência"></label>`;}).join('');
  labels.querySelectorAll('[data-link-label]').forEach(input=>input.addEventListener('change',event=>{stageContext.links[Number(event.currentTarget.dataset.linkLabel)].label=event.currentTarget.value.trim()||'depende de';queueStateSave();}));
}

function enableDragging(){
  const surface=document.querySelector('[data-flow-surface]');if(!surface)return;
  surface.querySelectorAll('[data-flow-card]').forEach(card=>{
    card.addEventListener('pointerdown',event=>{
      if(event.target.closest('a,button,input'))return;
      event.preventDefault();card.setPointerCapture(event.pointerId);card.classList.add('is-dragging');
      const origin=stageContext.layout[card.dataset.flowCard],start={x:event.clientX,y:event.clientY,left:origin.x,top:origin.y};
      const move=moveEvent=>{const next={x:clamp(start.left+moveEvent.clientX-start.x,16,surface.scrollWidth-236),y:clamp(start.top+moveEvent.clientY-start.y,72,surface.scrollHeight-170)};stageContext.layout[card.dataset.flowCard]=next;card.style.transform=`translate(${next.x}px,${next.y}px)`;drawConnections();};
      const up=()=>{card.classList.remove('is-dragging');card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);card.removeEventListener('pointercancel',up);queueStateSave();};
      card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);
    });
  });
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

async function renderStage(){
  const definition=findWorkbenchStage(requestedStage);
  const [panorama,monitor,statePayload,attachmentPayload]=await Promise.all([api('/api/automation/panorama'),api('/api/automation/monitor'),api(`/api/workbench/state?stage=${encodeURIComponent(definition.key)}`),api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}`)]);
  const context=liveForStage(panorama,monitor,definition),stored=statePayload.state||{};
  const layout={...defaultLayout(definition.activities),...(stored.layout||{})},links=stored.links?.length?stored.links:defaultLinks(definition);
  stageContext={definition,...context,layout,links};
  const dates=dateRange(context.automation.plannedStart,context.automation.plannedFinish,definition.activities.length),canvasWidth=Math.max(1180,definition.activities.length*246+100);
  const cards=definition.activities.map((item,index)=>{const position=layout[item.id],[start,end]=activityDates(context,index,definition.activities.length),progress=inferredActivityProgress(context.progress,index,definition.activities.length),status=progress>=100?'concluída':context.live.blockedBy?.length?'bloqueada':progress>0?'em execução':'planejada';return `<article class="flow-card status-${status.replace(' ','-')}" data-flow-card="${esc(item.id)}" style="transform:translate(${position.x}px,${position.y}px)"><header><span>${String(index+1).padStart(2,'0')} · ${esc(item.unit)}</span><i>${Math.round(progress)}%</i></header><h3>${esc(item.title)}</h3><p>${esc(item.release)}</p><div class="flow-card-progress"><i style="width:${progress}%"></i></div><footer><time>${fmtDate(start)} → ${fmtDate(end)}</time><a href="/admin/workers/activity?stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}">Abrir atividade →</a></footer></article>`;}).join('');
  const production=context.automation.production||{},personnel=context.automation.personnel||{},materialPlan=context.automation.materialPlan||[],overlap=context.automation.overlapPlan||{};
  shell(`<main class="workbench-main"><a class="detail-back" href="/admin/workers">← Todas as etapas</a>${stageNavigation(definition)}<section class="workbench-hero"><div><span class="eyebrow">ETAPA · CRONOGRAMA GERADO PELO WORKER</span><h1>${esc(definition.title)}</h1><p>${esc(context.live.executionProfile?.typicalDescription||'Execução organizada por dependências, cobertura de caixa, materiais e fatos confirmados em campo.')}</p></div><div class="hero-live"><i></i><b>LOOP VIVO</b><span>Atualizado ${new Date(panorama.generatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div></section><section class="workbench-metrics"><article><small>ANDAMENTO</small><strong>${Math.round(context.progress)}%</strong><span>${esc(context.live.status||'planejada')}</span></article><article><small>CAIXA DA ETAPA</small><strong>${money(context.summary.budgetCents)}</strong><span>${Number(context.automation.cashCoverage)||0}% de cobertura</span></article><article><small>VOLUME BASE DWG</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong><span>ritmo ${esc(physicalValue(production.adjustedRate,production.rateUnit))}</span></article><article><small>EQUIPE REGISTRADA</small><strong>${esc(personnel.assignedHeadcount||0)}/${esc(personnel.requiredHeadcount||0)}</strong><span>${esc(personnel.status==='registration_pending'?'cadastro pendente':'equipe parcial ou suficiente')}</span></article><article><small>JANELA INFERIDA</small><strong>${fmtDate(context.automation.plannedStart)}</strong><span>até ${fmtDate(context.automation.plannedFinish)}</span></article></section><section class="planning-brief"><header><div><span class="eyebrow">PROJEÇÃO FÍSICA · DWG</span><h2>Base de produção desta frente</h2><p>Os números servem para agenda e priorização. Áreas/contagens são cartográficas; comprimentos e coeficientes devem ser validados no projeto executivo.</p></div><span class="planning-source">${esc(production.source||'calibration')}</span></header><div class="planning-brief-grid"><article><small>NECESSÁRIO</small><strong>${esc(physicalValue(production.totalQuantity,production.unit))}</strong><span>${esc((production.basis||[])[0]||'Base de cálculo registrada no worker.')}</span></article><article><small>RITMO AJUSTADO</small><strong>${esc(physicalValue(production.adjustedRate,production.rateUnit))}</strong><span>caixa, materiais e equipe aplicados</span></article><article><small>MATERIAIS</small><strong>${number(materialPlan.length)} itens</strong><span>${esc(materialPlan.filter(item=>item.shortfallQuantity>0).length)} com falta quantitativa</span></article><article><small>RELAÇÃO</small><strong>${esc(overlap.mode||'sequencial')}</strong><span>${esc(overlap.rule||'Sem sobreposição operacional registrada.')}</span></article></div></section><section class="timeline-panel"><header><div><span class="eyebrow">SUPERFÍCIE DE CALENDÁRIO</span><h2>Fluxograma operacional manipulável</h2><p>Arraste os cards livremente. Edite o rótulo de cada ligação; posições e dependências ficam salvas e auditadas.</p></div><div class="timeline-legend"><span><i class="blue"></i> atividade</span><span><i class="amber"></i> bloqueio</span><span><i class="green"></i> concluído</span></div></header><div class="flow-scroll"><div class="flow-surface" data-flow-surface style="width:${canvasWidth}px"><div class="calendar-axis">${dates.map(date=>`<time>${fmtDate(date)}</time>`).join('')}</div><svg data-flow-lines width="${canvasWidth}" height="490" aria-hidden="true"></svg><div data-flow-labels></div>${cards}</div></div></section><section class="gate-grid"><article><span class="eyebrow">PORTÕES DE LIBERAÇÃO</span><ul>${definition.activities.map(item=>`<li>${esc(item.release)}</li>`).join('')}</ul></article><article><span class="eyebrow">LEITURA DO WORKER</span><ul><li>${esc(context.automation.nextStep||'Aguardando próximo ciclo.')}</li><li>Produção: ${esc(context.automation.production?.adjustedRate||'—')} ${esc(context.automation.production?.rateUnit||context.automation.production?.unit||'')}</li><li>${context.automation.materialAlerts?.length?esc(context.automation.materialAlerts.join(' · ')):'Sem alerta material calculado nesta leitura.'}</li></ul></article></section></main>`,'stage');
  drawConnections();enableDragging();mountAttachments(definition,attachmentPayload.attachments||[]);
}

function renderDiary(entries){
  const body=document.querySelector('[data-diary-body]');if(!body)return;
  body.innerHTML=entries.map(item=>`<tr><td>${esc(fmtDate(item.recordDate))}</td><td>${esc(item.responsible)}</td><td>${esc(item.production)} ${esc(item.unit)}</td><td><span class="table-status">${esc(item.status)}</span></td><td>${esc(item.notes||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-cell">Nenhum registro para esta atividade.</td></tr>';
}

async function renderActivity(){
  const activityId=params.get('activity')||'';
  const found=findWorkbenchActivity(requestedStage,activityId),definition=found.stage,item=found.activity;
  const [panorama,monitor,diaryPayload,attachmentPayload]=await Promise.all([api('/api/automation/panorama'),api('/api/automation/monitor'),api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`),api(`/api/workbench/diary?resource=attachments&stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`)]);
  const context=liveForStage(panorama,monitor,definition),index=definition.activities.indexOf(item),[start,end]=activityDates(context,index,definition.activities.length),stageBudget=Number(context.summary.budgetCents)||0,totalWeight=definition.activities.reduce((sum,row)=>sum+row.weight,0),activityBudget=Math.round(stageBudget*item.weight/totalWeight),progress=inferredActivityProgress(context.progress,index,definition.activities.length);
  shell(`<main class="workbench-main activity-main"><a class="detail-back" href="/admin/workers/stage?stage=${encodeURIComponent(definition.key)}">← Fluxograma de ${esc(definition.title)}</a><section class="activity-hero"><div><span class="eyebrow">ATIVIDADE · ${String(index+1).padStart(2,'0')} / ${definition.activities.length}</span><h1>${esc(item.title)}</h1><p>Unidade de produção: <b>${esc(item.unit)}</b>. O worker recalcula agenda e prontidão quando recebe produção, material, evidência ou alteração do caixa.</p></div><span class="activity-state">${context.live.blockedBy?.length?'BLOQUEADA':'EM ACOMPANHAMENTO'}</span></section><section class="status-lines"><article><span>EXECUÇÃO</span><div><i style="width:${progress}%"></i></div><b>${Math.round(progress)}%</b></article><article><span>CAIXA</span><div><i style="width:${clamp(context.automation.cashCoverage||0,0,100)}%"></i></div><b>${Number(context.automation.cashCoverage)||0}%</b></article><article><span>MATERIAIS</span><div><i style="width:${clamp(context.automation.materialCoverage||0,0,100)}%"></i></div><b>${Number(context.automation.materialCoverage)||0}%</b></article></section><section class="activity-facts"><article><small>ORÇAMENTO PROPORCIONAL</small><strong>${money(activityBudget)}</strong><span>parcela estimada da etapa</span></article><article><small>RESPONSÁVEL</small><strong>${esc(context.owner)}</strong><span>confirmação humana obrigatória</span></article><article><small>INÍCIO</small><strong>${fmtDate(start)}</strong><span>cronograma do loop vivo</span></article><article><small>PREVISÃO</small><strong>${fmtDate(end)}</strong><span>sujeita a caixa e produção</span></article></section><section class="activity-columns"><article class="detail-block"><span class="eyebrow">MATERIAIS PRINCIPAIS</span><ul>${item.materials.map(material=>`<li>${esc(material)}</li>`).join('')}</ul></article><article class="detail-block"><span class="eyebrow">REQUISITO DE SAÍDA</span><h2>${esc(item.release)}</h2><p>Este aceite alimenta a relação com a atividade seguinte. A IA pode sugerir a propagação, mas a confirmação continua registrada por um perfil autorizado.</p></article><article class="detail-block"><span class="eyebrow">ESTRUTURA OPERACIONAL</span><dl><div><dt>Etapa</dt><dd>${esc(definition.title)}</dd></div><div><dt>Produção</dt><dd>${esc(context.automation.production?.adjustedRate||'—')} ${esc(context.automation.production?.rateUnit||item.unit)}</dd></div><div><dt>Bloqueios</dt><dd>${context.live.blockedBy?.length?esc(context.live.blockedBy.join(' · ')):'Nenhum bloqueio precedente'}</dd></div><div><dt>Próximo passo</dt><dd>${esc(context.automation.nextStep||'Aguardar fatos de campo')}</dd></div></dl></article></section><section class="diary-panel"><header><div><span class="eyebrow">DIÁRIO DE OBRA</span><h2>Registros da atividade</h2><p>Cada lançamento vira fato de campo auditável e dispara a próxima leitura operacional.</p></div><button class="button button-primary" data-toggle-diary>Novo registro</button></header><form class="diary-form" data-diary-form hidden><label>Data<input type="date" name="recordDate" value="${new Date().toISOString().slice(0,10)}" required></label><label>Responsável<input name="responsible" value="${esc(context.owner)}" required></label><label>Produção<input type="number" name="production" min="0" step="0.01"></label><label>Unidade<input name="unit" value="${esc(item.unit)}"></label><label>Status<select name="status"><option>registrado</option><option>em execução</option><option>concluído</option><option>bloqueado</option></select></label><label class="wide">Observações<textarea name="notes" rows="3" required placeholder="Serviço executado, frente, condições, evidências e pendências"></textarea></label><div class="wide form-actions"><button type="button" class="button" data-cancel-diary>Cancelar</button><button class="button button-primary">Registrar e propagar</button></div></form><div class="diary-table-wrap"><table><thead><tr><th>Data</th><th>Responsável</th><th>Produção</th><th>Status</th><th>Registro</th></tr></thead><tbody data-diary-body></tbody></table></div></section></main>`,'activity');
  renderDiary(diaryPayload.entries||[]);mountAttachments(definition,attachmentPayload.attachments||[],item);
  const mapEditor=document.createElement('section');mapEditor.className='activity-map-editor-shell';mapEditor.dataset.activityMapEditor='';mapEditor.dataset.stage=definition.key;mapEditor.dataset.activity=item.id;mapEditor.dataset.progress=String(Math.round(progress));mapEditor.innerHTML='<div class="activity-map-editor-loading"><span class="eyebrow">LOCAL FÍSICO DA ATIVIDADE</span><h2>Preparando o modelo 3D…</h2><p>Os polígonos reais do loteamento serão disponibilizados para pintura.</p></div>';document.querySelector('.activity-columns')?.before(mapEditor);await import('./activity-map-editor.mjs?v=2');
  const form=document.querySelector('[data-diary-form]');document.querySelector('[data-toggle-diary]').addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden)form.elements.notes.focus();});document.querySelector('[data-cancel-diary]').addEventListener('click',()=>form.hidden=true);
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),payload=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent='Propagando…';try{const response=await api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,activityId:item.id})});const entries=(await api(`/api/workbench/diary?stage=${encodeURIComponent(definition.key)}&activity=${encodeURIComponent(item.id)}`)).entries||[response.entry];renderDiary(entries);form.reset();form.hidden=true;document.querySelector('[data-sync-state]').textContent='Registro propagado ao loop operacional';}catch(error){document.querySelector('[data-sync-state]').textContent=`Falha no registro: ${error.message}`;}finally{button.disabled=false;button.textContent='Registrar e propagar';}});
}

try{await (isActivity?renderActivity():renderStage());}
catch(error){shell(`<main class="workbench-main"><a class="detail-back" href="/admin/workers">← Monitoria</a><section class="activity-hero"><div><span class="eyebrow">FALHA DE CARREGAMENTO</span><h1>Não foi possível abrir o acompanhamento</h1><p>${esc(error.message)}</p></div></section></main>`,'error');}
