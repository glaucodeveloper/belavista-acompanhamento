// BELAVISTA_ADMIN_TWA_RUNTIME_V1
// Runtime exclusivo do painel /admin: registra o Service Worker, mantém a
// sessão no Firebase e oferece uma ação explícita para ativar push no celular.
const isAdminSurface=/\/admin(?:\/|$)/i.test(String(location.pathname||''))||new URLSearchParams(location.search).get('twa')==='admin';
const PUSH_ENABLED_KEY='belavista.twa.admin.push.enabled.v1';
const PUSH_DISMISSED_KEY='belavista.twa.admin.push.dismissed.session.v1';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const waitForAuth=async()=>{
  const started=Date.now();
  while(!globalThis.BELAVISTA_ADMIN_AUTH_READY&&Date.now()-started<6000)await delay(25);
  if(!globalThis.BELAVISTA_ADMIN_AUTH_READY)return false;
  try{return await globalThis.BELAVISTA_ADMIN_AUTH_READY;}catch{return false;}
};

const serviceWorkerUrl=()=>{
  const prefix=String(globalThis.BELAVISTA_PORT_PREFIX||'').replace(/\/$/,'');
  return `${prefix}/sw.js`||'/sw.js';
};

const registerServiceWorker=async()=>{
  if(globalThis.BELAVISTA_DISABLE_SERVICE_WORKER||!('serviceWorker' in navigator))return null;
  const prefix=String(globalThis.BELAVISTA_PORT_PREFIX||'').replace(/\/$/,'');
  return navigator.serviceWorker.register(serviceWorkerUrl(),{scope:`${prefix||''}/`});
};

const appendStyles=()=>{
  if(document.querySelector('[data-belavista-twa-style]'))return;
  const style=document.createElement('style');style.dataset.belavistaTwaStyle='true';
  style.textContent=`
    .belavista-twa-push{position:fixed;right:18px;bottom:max(18px,env(safe-area-inset-bottom));z-index:1200;width:min(360px,calc(100vw - 36px));display:grid;gap:12px;padding:15px;background:#161616;color:#f4f4f4;border:1px solid #525252;box-shadow:0 8px 28px rgba(0,0,0,.34);font:12px/1.4 "IBM Plex Sans",Arial,sans-serif}
    .belavista-twa-push[hidden]{display:none}.belavista-twa-push header{display:flex;justify-content:space-between;gap:12px;align-items:start}.belavista-twa-push header span{color:#78a9ff;font:9px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase}.belavista-twa-push header button{border:0;background:none;color:#c6c6c6;cursor:pointer;font-size:16px;line-height:1}.belavista-twa-push strong{display:block;margin-top:5px;font-size:14px}.belavista-twa-push p{margin:0;color:#c6c6c6;font-size:11px}.belavista-twa-push footer{display:flex;align-items:center;gap:8px}.belavista-twa-push [data-twa-push-enable]{min-height:34px;padding:7px 12px;border:1px solid #0f62fe;background:#0f62fe;color:#fff;font-weight:600;cursor:pointer}.belavista-twa-push [data-twa-push-enable]:disabled{opacity:.55;cursor:wait}.belavista-twa-push [data-twa-push-status]{color:#a8a8a8;font-size:10px}.belavista-twa-push[data-tone="ok"] [data-twa-push-status]{color:#42be65}.belavista-twa-push[data-tone="error"] [data-twa-push-status]{color:#ffb3b8}
    @media (max-width:600px){.belavista-twa-push{right:10px;bottom:max(10px,env(safe-area-inset-bottom));width:calc(100vw - 20px)}}
  `;
  document.head.appendChild(style);
};

const createPushCard=()=>{
  if(document.querySelector('[data-belavista-twa-push]'))return document.querySelector('[data-belavista-twa-push]');
  const card=document.createElement('section');card.className='belavista-twa-push';card.dataset.belavistaTwaPush='true';card.setAttribute('aria-label','Notificações do painel no celular');
  card.innerHTML='<header><div><span>TWA administrativo</span><strong>Receba os avisos do Aliança Park</strong></div><button type="button" data-twa-push-dismiss aria-label="Fechar">×</button></header><p>Agendamentos, cronogramas, caixa, materiais e mensagens aparecem nas notificações do celular.</p><footer><button type="button" data-twa-push-enable>Ativar notificações</button><small data-twa-push-status aria-live="polite">Este dispositivo ainda não foi vinculado.</small></footer>';
  card.querySelector('[data-twa-push-dismiss]').addEventListener('click',()=>{sessionStorage.setItem(PUSH_DISMISSED_KEY,'1');card.hidden=true;});
  document.body.appendChild(card);return card;
};

const setCardStatus=(card,message,tone='')=>{const status=card?.querySelector('[data-twa-push-status]');if(status)status.textContent=message;if(card)card.dataset.tone=tone;};

const syncDevice=async(card,button)=>{
  button.disabled=true;button.textContent='Ativando…';setCardStatus(card,'Solicitando permissão segura…');
  try{
    const {registerOperationalDevice}=await import('./firebase.mjs?v=admin-twa-device-v1');
    const result=await registerOperationalDevice(globalThis.BELAVISTA_ADMIN_ACTOR||{});
    if(result.pushEnabled){
      localStorage.setItem(PUSH_ENABLED_KEY,'1');button.textContent='Notificações ativas';setCardStatus(card,'Push e Realtime Database ativos neste celular.','ok');
    }else if(result.permission==='denied'){
      button.textContent='Permissão bloqueada';setCardStatus(card,'Permita notificações nas configurações do navegador/TWA.','error');
    }else{
      button.textContent='Sincronizar dispositivo';setCardStatus(card,'Realtime Database ativo; configure a chave pública VAPID para habilitar o push.');
    }
  }catch(error){
    button.textContent='Tentar novamente';setCardStatus(card,error?.message||'Não foi possível vincular este dispositivo.','error');
  }finally{button.disabled=false;}
};

const boot=async()=>{
  if(!isAdminSurface)return {enabled:false,reason:'not-admin-surface'};
  const authorized=await waitForAuth();
  if(!authorized)return {enabled:false,reason:'unauthorized'};
  let registration=null;
  try{registration=await registerServiceWorker();}catch(error){console.warn('[Aliança Park TWA] Service Worker indisponível',error);}
  if(!registration)return {enabled:false,reason:'service-worker-unavailable'};
  appendStyles();
  const previouslyEnabled=localStorage.getItem(PUSH_ENABLED_KEY)==='1';
  const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;
  const card=createPushCard(),button=card.querySelector('[data-twa-push-enable]');
  if(previouslyEnabled&&permission==='granted'){
    button.textContent='Sincronizar dispositivo';setCardStatus(card,'Sessão persistente; notificações autorizadas neste celular.','ok');
    syncDevice(card,button).catch(()=>{});
  }else if(permission==='denied'){
    button.textContent='Permissão bloqueada';setCardStatus(card,'Permita notificações nas configurações do navegador/TWA.','error');
  }else if(permission==='unsupported'){
    button.disabled=true;setCardStatus(card,'Este dispositivo não oferece notificações web.');
  }
  button.addEventListener('click',()=>syncDevice(card,button));
  if(sessionStorage.getItem(PUSH_DISMISSED_KEY)==='1'&&!previouslyEnabled)card.hidden=true;
  globalThis.BELAVISTA_ADMIN_TWA_PUSH={registration,activate:()=>syncDevice(card,button),card};
  return {enabled:true,registration,pushEnabled:previouslyEnabled&&permission==='granted'};
};

globalThis.BELAVISTA_ADMIN_TWA_READY=boot().catch(error=>{console.warn('[Aliança Park TWA] runtime não inicializado',error);return {enabled:false,reason:'runtime-error'};});
