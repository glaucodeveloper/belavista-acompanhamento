import {subscribeOperationalContacts,subscribeOperationalConversation,sendOperationalMessage} from './firebase.mjs?v=admin-messages-v2';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const qs=(selector,scope=document)=>scope.querySelector(selector);
const dateTime=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const actor=()=>globalThis.BELAVISTA_ADMIN_ACTOR||{uid:'local-admin',name:'Administrador',role:'admin'};
const api=async(path,options={})=>{const token=await globalThis.BELAVISTA_GET_ID_TOKEN?.().catch?.(()=> '')||'';const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{}),...(options.headers||{})}});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload;};

const state={tab:'personal',contacts:[],selected:null,messages:[],social:[],socialSelected:null,socialMessages:[],unsubscribeContacts:null,unsubscribeConversation:null};
let instagramAssistantResult=null;
function shell(){if(qs('[data-admin-communications]'))return;document.body.insertAdjacentHTML('beforeend',`<div class="communication-scrim" data-admin-message-close></div><aside class="communication-sidebar" data-admin-communications aria-hidden="true"><header><div><span class="eyebrow">CENTRAL DE MENSAGENS</span><h2>Conversas</h2></div><button data-admin-message-close aria-label="Fechar">×</button></header><nav class="communication-tabs"><button data-message-tab="personal" class="is-active">Pessoal</button><button data-message-tab="instagram">Instagram</button></nav><section class="communication-view is-active" data-message-view="personal"><div class="messenger-layout"><nav class="contact-sidebar"><label><span>CORRETORES / ENCARREGADOS</span><input data-personal-search type="search" placeholder="Buscar pessoa"></label><div data-personal-list><div class="empty-state">Carregando contatos…</div></div></nav><section class="conversation-panel"><header data-personal-head><strong>Selecione um contato</strong><span>Mensagens internas do projeto</span></header><div class="message-feed" data-personal-feed><div class="empty-state">Escolha uma pessoa para conversar.</div></div><form class="message-compose" data-personal-form><textarea name="message" rows="2" maxlength="2000" placeholder="Escreva uma mensagem…" disabled></textarea><button class="button button-primary" disabled>Enviar</button></form></section></div></section><section class="communication-view" data-message-view="instagram"><div class="messenger-layout"><nav class="contact-sidebar"><label><span>LEADS INSTAGRAM</span><input data-instagram-search type="search" placeholder="Buscar lead"></label><div data-instagram-list><div class="empty-state">Carregando conversas…</div></div></nav><section class="conversation-panel"><header data-instagram-head><strong>Selecione uma conversa</strong><span>Directs recebidos pelo Worker</span></header><div class="message-feed" data-instagram-feed><div class="empty-state">Escolha um lead para ver as mensagens.</div></div><form class="message-compose" data-instagram-form><textarea name="message" rows="2" maxlength="4000" placeholder="Responder ao lead…" disabled></textarea><button class="button button-primary" disabled>Enviar</button></form></section></div></section></aside>`);}
function renderInstagramAssistant(result=null,message='Selecione uma conversa para gerar a orientação comercial.'){
  const root=qs('[data-instagram-assistant]');
  if(!root)return;
  if(!result){root.innerHTML=`<small>${esc(message)}</small>`;return;}
  const draft=result.leadDraft||{},qualification=result.qualification||{},fields=[['Nome',draft.name],['WhatsApp',draft.whatsapp],['Lote/preferência',draft.lotLabel||draft.lotId],['Objetivo',draft.objective],['Visita',draft.visitDate&&draft.visitTime?`${draft.visitDate} · ${draft.visitTime}`:'']].filter(([,value])=>value),leadAction=result.leadRegistration?`<b class="instagram-lead-registered">Lead registrado: ${esc(result.leadRegistration.leadId||'OK')}</b>`:qualification.readyForLead?'<button type="button" class="button button-primary" data-instagram-lead-save>Registrar lead de reserva</button>':'';
  root.innerHTML=`<header><b>IA · qualificação comercial</b><span>${qualification.readyForVisit?'Dados de visita completos':qualification.readyForLead?'Lead pronto para encaminhar':'Dados ainda pendentes'}</span></header><p class="instagram-assistant-reply">${esc(result.reply||'Sem rascunho de resposta.')}</p>${fields.length?`<dl>${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:''}<div class="instagram-assistant-footer">${leadAction}<small>${esc(result.handoff?.message||'Revisar o rascunho antes de enviar.')}</small></div>`;
}

async function qualifyInstagram(){
  if(!state.socialSelected){renderInstagramAssistant(null,'Selecione um Direct do Instagram antes de qualificar.');return;}
  const button=qs('[data-instagram-assist]');
  if(button)button.disabled=true;
  renderInstagramAssistant(null,'IA analisando o histórico recente…');
  try{
    instagramAssistantResult=await api(`/api/communications/conversations/${encodeURIComponent(state.socialSelected.id)}/assistant`,{method:'POST',body:'{}'});
    renderInstagramAssistant(instagramAssistantResult);
    const textarea=qs('[data-instagram-form] textarea[name="message"]');
    if(textarea&&instagramAssistantResult.reply)textarea.value=instagramAssistantResult.reply;
  }catch(error){renderInstagramAssistant(null,`Não foi possível gerar a orientação: ${error.message}`);}
  finally{if(button)button.disabled=false;}
}

async function saveInstagramLead(){
  if(!state.socialSelected||!instagramAssistantResult?.qualification?.readyForLead)return;
  const button=qs('[data-instagram-lead-save]');
  if(button)button.disabled=true;
  try{
    const registration=await api(`/api/communications/conversations/${encodeURIComponent(state.socialSelected.id)}/lead`,{method:'POST',body:JSON.stringify({confirm:true,leadDraft:instagramAssistantResult.leadDraft})});
    instagramAssistantResult={...instagramAssistantResult,leadRegistration:registration};
    renderInstagramAssistant(instagramAssistantResult);
  }catch(error){renderInstagramAssistant(instagramAssistantResult);qs('[data-instagram-assistant]')?.insertAdjacentHTML('beforeend',`<small class="instagram-assistant-error">Não foi possível registrar o lead: ${esc(error.message)}</small>`);}
}

function enhanceInstagramComposer(){
  const form=qs('[data-instagram-form]'),panel=form?.closest('.conversation-panel');
  if(!form||!panel||qs('[data-instagram-assistant]',panel))return;
  const assistant=document.createElement('section');
  assistant.className='instagram-assistant-card';
  assistant.dataset.instagramAssistant='';
  assistant.setAttribute('aria-live','polite');
  const actions=document.createElement('div');
  actions.className='instagram-assistant-actions';
  actions.innerHTML='<button class="button" type="button" data-instagram-assist>IA · qualificar reserva</button><small>Gera perguntas e rascunho de lead. O envio exige confirmação.</small>';
  panel.insertBefore(assistant,form);
  panel.insertBefore(actions,form);
  actions.querySelector('[data-instagram-assist]').addEventListener('click',qualifyInstagram);
  panel.addEventListener('click',event=>{if(event.target.closest('[data-instagram-lead-save]'))saveInstagramLead();});
  qs('[data-instagram-list]')?.addEventListener('click',()=>{instagramAssistantResult=null;renderInstagramAssistant();});
  renderInstagramAssistant();
}

function open(tab=state.tab){state.tab=tab;const panel=qs('[data-admin-communications]');panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');document.body.classList.add('communication-open');document.querySelectorAll('[data-message-tab]').forEach(item=>item.classList.toggle('is-active',item.dataset.messageTab===tab));document.querySelectorAll('[data-message-view]').forEach(item=>item.classList.toggle('is-active',item.dataset.messageView===tab));}
function close(){qs('[data-admin-communications]')?.classList.remove('is-open');qs('[data-admin-communications]')?.setAttribute('aria-hidden','true');document.body.classList.remove('communication-open');}
function renderPersonal(){const list=qs('[data-personal-list]'),query=String(qs('[data-personal-search]')?.value||'').toLocaleLowerCase('pt-BR');if(!list)return;const items=state.contacts.filter(item=>!query||`${item.name} ${item.role} ${item.label}`.toLocaleLowerCase('pt-BR').includes(query));list.innerHTML=items.map(item=>`<button class="contact-item ${state.selected?.uid===item.uid?'is-active':''}" data-personal-id="${esc(item.uid)}"><i>${esc((item.name||'?').slice(0,1).toUpperCase())}</i><span><strong>${esc(item.name)}</strong><small>${esc(item.label||item.role)}</small></span><em>${item.online?'online':''}</em></button>`).join('')||'<div class="empty-state">Nenhum corretor ou encarregado autenticado.</div>';list.querySelectorAll('[data-personal-id]').forEach(button=>button.addEventListener('click',()=>selectPersonal(items.find(item=>item.uid===button.dataset.personalId))));}
function renderFeed(feedSelector,items,ownUid,leadName='Lead'){const feed=qs(feedSelector);if(!feed)return;feed.innerHTML=items.map(item=>`<article class="message-bubble ${item.fromUid===ownUid||item.direction==='outbound'?'is-own':''}"><strong>${item.direction==='outbound'||item.fromUid===ownUid?'Você':esc(item.fromName||leadName)}</strong><p>${esc(item.message||item.body)}</p><time>${esc(dateTime(item.createdAt))}</time></article>`).join('')||'<div class="empty-state">Nenhuma mensagem ainda.</div>';feed.scrollTop=feed.scrollHeight;}
async function selectPersonal(item){if(!item)return;state.selected=item;state.messages=[];renderPersonal();qs('[data-personal-head]').innerHTML=`<strong>${esc(item.name)}</strong><span>${esc(item.label||item.role)} · Firebase Realtime Database</span>`;const form=qs('[data-personal-form]');form.elements.message.disabled=false;form.querySelector('button').disabled=false;state.unsubscribeConversation?.();state.unsubscribeConversation=await subscribeOperationalConversation(actor(),item,messages=>{state.messages=messages;renderFeed('[data-personal-feed]',messages,actor().uid,item.name);});}
function renderInstagram(){const list=qs('[data-instagram-list]'),query=String(qs('[data-instagram-search]')?.value||'').toLocaleLowerCase('pt-BR');if(!list)return;const items=state.social.filter(item=>!query||`${item.contactName} ${item.externalThreadId}`.toLocaleLowerCase('pt-BR').includes(query));list.innerHTML=items.map(item=>`<button class="contact-item ${state.socialSelected?.id===item.id?'is-active':''}" data-instagram-id="${esc(item.id)}"><i>IG</i><span><strong>${esc(item.contactName||'Lead Instagram')}</strong><small>Instagram · ${esc(item.status||'aberta')}</small></span></button>`).join('')||'<div class="empty-state">Nenhum Direct recebido ainda.</div>';list.querySelectorAll('[data-instagram-id]').forEach(button=>button.addEventListener('click',()=>selectInstagram(items.find(item=>item.id===button.dataset.instagramId))));}
async function loadInstagram(){try{state.social=(await api('/api/communications/conversations?channel=instagram')).conversations||[];renderInstagram();}catch(error){qs('[data-instagram-list]').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;}}
async function selectInstagram(item){if(!item)return;state.socialSelected=item;state.socialMessages=[];renderInstagram();qs('[data-instagram-head]').innerHTML=`<strong>${esc(item.contactName||'Lead Instagram')}</strong><span>Instagram · lead ${esc(item.leadId||'aguardando vínculo')}</span>`;const form=qs('[data-instagram-form]');form.elements.message.disabled=false;form.querySelector('button').disabled=false;try{state.socialMessages=(await api(`/api/communications/conversations/${encodeURIComponent(item.id)}/messages`)).messages||[];renderFeed('[data-instagram-feed]',state.socialMessages,'__worker__',item.contactName);}catch(error){qs('[data-instagram-head]').insertAdjacentHTML('beforeend',`<small>${esc(error.message)}</small>`);}}
function bind(){document.addEventListener('belavista:open-communications',event=>open(event.detail?.tab||'personal'));document.querySelectorAll('[data-admin-message-close]').forEach(item=>item.addEventListener('click',close));document.querySelectorAll('[data-message-tab]').forEach(item=>item.addEventListener('click',()=>{open(item.dataset.messageTab);if(state.tab==='instagram')loadInstagram();}));qs('[data-personal-search]').addEventListener('input',renderPersonal);qs('[data-instagram-search]').addEventListener('input',renderInstagram);qs('[data-personal-form]').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,value=form.elements.message.value.trim();if(!value||!state.selected)return;await sendOperationalMessage(actor(),state.selected,value);form.reset();});qs('[data-instagram-form]').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,value=form.elements.message.value.trim();if(!value||!state.socialSelected)return;const button=form.querySelector('button');button.disabled=true;try{await api(`/api/communications/conversations/${encodeURIComponent(state.socialSelected.id)}/messages`,{method:'POST',body:JSON.stringify({text:value})});form.reset();state.socialMessages=(await api(`/api/communications/conversations/${encodeURIComponent(state.socialSelected.id)}/messages`)).messages||[];renderFeed('[data-instagram-feed]',state.socialMessages,'__worker__',state.socialSelected.contactName);}catch(error){alert(error.message);}finally{button.disabled=false;}});}
async function init(){if(!/^\/admin(?:\/|$)/.test(location.pathname))return;shell();enhanceInstagramComposer();bind();await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(true));state.unsubscribeContacts=await subscribeOperationalContacts(actor(),contacts=>{state.contacts=contacts;renderPersonal();});await loadInstagram();}
init();
