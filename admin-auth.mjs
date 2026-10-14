import {ADMIN_LOGIN_ROLES,normalizeUserType} from './admin-role-policy.mjs?v=admin-role-policy-v3';

const path=String(location.pathname||'');
const isAdminSurface=/\/admin(?:\/|$)/i.test(path)||new URLSearchParams(location.search).get('twa')==='admin';
const required=true;
const allowedRoles=ADMIN_LOGIN_ROLES;
globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=required;
const loginProfile=globalThis.BELAVISTA_LOGIN_PROFILE;
const profileMark=(name,detail={})=>loginProfile?.mark(name,detail);
profileMark('auth.module.start',{required,route:path});

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const roleLabel=(role,userType)=>userType==='foreman'?'Encarregado':role==='admin'?'Administrador':role==='developer'?'TI · Desenvolvimento':['sales','commercial','broker','corretor'].includes(role)?'Corretor':'Dono';
const viewLabel='painel administrativo';
const style=document.createElement('style');
style.textContent=`
  .belavista-auth-gate{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:#161616;color:#f4f4f4;font:14px "IBM Plex Sans",Arial,sans-serif}
  .belavista-auth-gate[hidden]{display:none}.belavista-auth-panel{width:min(430px,100%);padding:22px;border:1px solid #525252;background:#262626;box-shadow:0 8px 30px rgba(0,0,0,.28)}
  .belavista-auth-brand{display:flex;align-items:center;gap:10px;padding-bottom:16px;border-bottom:1px solid #525252}.belavista-auth-brand b{display:grid;place-items:center;width:34px;height:34px;background:#0f62fe;color:#fff;font-size:20px}.belavista-auth-brand span{display:grid;gap:3px}.belavista-auth-brand small,.belavista-auth-kicker{color:#78a9ff;font:9px "IBM Plex Mono",monospace;letter-spacing:.08em}.belavista-auth-panel h1{margin:22px 0 6px;font-size:22px}.belavista-auth-panel p{margin:0 0 16px;color:#c6c6c6;font-size:11px;line-height:1.5}.belavista-auth-form{display:grid;gap:12px}.belavista-auth-form label{display:grid;gap:5px;color:#c6c6c6;font-size:11px}.belavista-auth-form input{min-height:40px;padding:9px;border:1px solid #525252;background:#161616;color:#f4f4f4;font:14px inherit}.belavista-auth-form input:focus{outline:2px solid #0f62fe;outline-offset:-1px}.belavista-auth-form button{min-height:42px;border:1px solid #0f62fe;background:#0f62fe;color:#fff;font-weight:600;cursor:pointer}.belavista-auth-form button:disabled{opacity:.6;cursor:wait}.belavista-auth-status{min-height:18px;color:#f1c21b;font-size:11px}.belavista-auth-status[data-tone="error"]{color:#ffb3b8}.belavista-auth-status[data-tone="ok"]{color:#42be65}
  .belavista-auth-persistence{color:#a8a8a8;font-size:10px}.belavista-auth-session{display:grid;gap:10px;padding-top:16px;color:#c6c6c6;font-size:11px}.belavista-auth-session b{color:#f4f4f4}.belavista-auth-session button{justify-self:start;padding:7px 10px;border:1px solid #525252;background:#262626;color:#f4f4f4;cursor:pointer}
  .belavista-auth-diagnostics{display:grid;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #3d3d3d;color:#a8a8a8;font-size:10px}.belavista-auth-diagnostics header{display:flex;align-items:center;justify-content:space-between;gap:10px}.belavista-auth-diagnostics header span{color:#78a9ff;font:9px "IBM Plex Mono",monospace;letter-spacing:.08em}.belavista-auth-diagnostics button{padding:4px 7px;border:1px solid #525252;background:#262626;color:#c6c6c6;font:10px inherit;cursor:pointer}.belavista-auth-diagnostics button:hover{border-color:#78a9ff;color:#fff}.belavista-auth-diagnostics small{line-height:1.45}.belavista-auth-diagnostics pre{max-height:170px;margin:0;padding:8px;overflow:auto;background:#161616;color:#c6c6c6;font:9px/1.45 "IBM Plex Mono",monospace;white-space:pre-wrap}.belavista-auth-diagnostics[data-tone="error"] header span{color:#ffb3b8}
  html[data-belavista-auth-pending="true"] body>main,html[data-belavista-auth-pending="true"] body>belavista-app{visibility:hidden}
`;
document.head.appendChild(style);

const profileSummary=snapshot=>{
  const events=snapshot?.events||[],errors=events.filter(item=>/error|rejection|timeout/i.test(item.name));
  return `${Math.round(Number(snapshot?.elapsedMs)||0)} ms · ${events.length} eventos${errors.length?` · ${errors.length} falha${errors.length===1?'':'s'}`:''}`;
};
const profileDetails=snapshot=>{
  const events=(snapshot?.events||[]).map(item=>`${String(item.atMs).padStart(5,' ')} ms  ${item.name}${item.detail?.error?.message?`  — ${item.detail.error.message}`:''}`);
  return [`sessão ${snapshot?.sessionId||'—'}`,`rota ${snapshot?.runtime?.href||path}`,...events].join('\n');
};
const setupProfilePanel=(gate,statusElement)=>{
  const profile=globalThis.BELAVISTA_LOGIN_PROFILE;
  if(!profile)return;
  const panel=document.createElement('section');panel.className='belavista-auth-diagnostics';panel.innerHTML='<header><span>DIAGNÓSTICO DE ABERTURA</span><button type="button" data-profile-toggle>Detalhes</button></header><small data-profile-summary>Coletando marcos…</small><pre data-profile-details hidden></pre>';
  gate.querySelector('.belavista-auth-panel')?.append(panel);
  const summary=panel.querySelector('[data-profile-summary]'),details=panel.querySelector('[data-profile-details]'),toggle=panel.querySelector('[data-profile-toggle]');
  const render=snapshot=>{const hasError=(snapshot?.events||[]).some(item=>/error|rejection/i.test(item.name));panel.dataset.tone=hasError?'error':'';summary.textContent=profileSummary(snapshot);details.textContent=profileDetails(snapshot);if(statusElement&&!statusElement.textContent)statusElement.textContent='Preparando autenticação…';};
  render(profile.snapshot());
  const unsubscribe=profile.subscribe(render);
  toggle.addEventListener('click',()=>{details.hidden=!details.hidden;toggle.textContent=details.hidden?'Detalhes':'Ocultar';});
  gate.addEventListener('DOMNodeRemoved',unsubscribe,{once:true});
};

const createGate=()=>{
  const surfaceLabel=globalThis.BELAVISTA_CAPACITOR_NATIVE===true?'CAPACITOR MOBILE · ACESSO RESTRITO':isAdminSurface?'TWA ADMINISTRATIVO · ACESSO RESTRITO':'WEB OPERACIONAL · ACESSO RESTRITO';
  const gate=document.createElement('section');gate.className='belavista-auth-gate';gate.setAttribute('aria-label','Login Aliança Park');gate.innerHTML=`<div class="belavista-auth-panel"><div class="belavista-auth-brand"><b>◢</b><span><strong>Aliança Park</strong><small>${surfaceLabel}</small></span></div><span class="belavista-auth-kicker">AUTENTICAÇÃO FIREBASE</span><h1>Entrar no ${viewLabel}</h1><p>Use o e-mail institucional. O Firebase valida o nível de acesso e as funções atribuídas ao usuário.</p><form class="belavista-auth-form"><label>E-mail<input name="email" type="email" autocomplete="username" required placeholder="voce@empresa.com"></label><label>Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Senha do Firebase"></label><button type="submit">Entrar com segurança</button><div class="belavista-auth-status" aria-live="polite"></div></form></div>`;
  const persistence=document.createElement('small');persistence.className='belavista-auth-persistence';persistence.textContent='A sessão autorizada permanece neste dispositivo com o Firebase.';
  gate.querySelector('.belavista-auth-form').append(persistence);
  document.body.appendChild(gate);profileMark('auth.gate.visible');setupProfilePanel(gate,gate.querySelector('.belavista-auth-status'));return gate;
};

const finish=(session,gate,resolve)=>{
  const user=session.user;
  const userType=normalizeUserType(session.userType||session.claims?.userType||session.claims?.user_type||'');
  globalThis.BELAVISTA_ADMIN_ACTOR={uid:user.uid,name:user.displayName||user.email||user.uid,email:user.email||'',role:session.role,userType,label:roleLabel(session.role,userType),commercialProfile:session.claims?.commercialProfile||session.claims?.profileId||'',claims:session.claims||{},mode:'firebase'};
  globalThis.BELAVISTA_GET_ID_TOKEN=()=>user.getIdToken();
  if(userType==='foreman'||['sales','commercial','broker','corretor'].includes(session.role)){
    const primarySurface=['/','/index.html','/admin','/admin/'].includes(path.toLocaleLowerCase('pt-BR'));
    if(!primarySurface){location.replace('/admin?view=records');return;}
  }
  document.documentElement.dataset.belavistaAuth='ready';
  document.documentElement.dataset.belavistaAuthRole=session.role;
  if(userType)document.documentElement.dataset.belavistaUserType=userType;
  else delete document.documentElement.dataset.belavistaUserType;
  // The pending flag hides the application while Firebase restores or validates
  // the session. Clear it on success or the authorized shell stays invisible
  // even though the gate has already been removed.
  delete document.documentElement.dataset.belavistaAuthPending;
  gate.hidden=true;gate.remove();resolve(true);
};

const AUTH_IMPORT_TIMEOUT_MS=5000;
const AUTH_RESTORE_TIMEOUT_MS=6000;
const withTimeout=(promise,timeoutMs,message)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),timeoutMs))
]);

const authReady=required?new Promise(resolve=>{
  document.documentElement.dataset.belavistaAuthPending='true';
  const gate=createGate(),form=gate.querySelector('form'),status=gate.querySelector('.belavista-auth-status');
  // Keep the gate independent from Firebase's network/module loading. Deep
  // worker routes must still show login when a Firebase request is slow.
  let authApiPromise;
  const getAuthApi=()=>authApiPromise||(authApiPromise=withTimeout(
    import('./firebase.mjs?v=admin-auth-v4'),
    AUTH_IMPORT_TIMEOUT_MS,
    'O serviço de autenticação demorou para responder.'
  ).then(api=>{profileMark('firebase.module.ready');return api;}).catch(error=>{profileMark('firebase.module.error',{message:error?.message||String(error)});authApiPromise=null;throw error;}));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button'),data=Object.fromEntries(new FormData(form));
    button.disabled=true;status.dataset.tone='';status.textContent='Validando perfil…';profileMark('auth.submit');
    try{const {signInOperationalUser}=await getAuthApi();profileMark('auth.signin.start');const session=await withTimeout(signInOperationalUser(data.email,data.password,allowedRoles),AUTH_RESTORE_TIMEOUT_MS,'A validação demorou. Tente novamente.');profileMark('auth.signin.success');finish(session,gate,resolve);}
    catch(error){profileMark('auth.signin.error',{message:error?.message||String(error)});status.dataset.tone='error';status.textContent=error?.message||'Não foi possível autenticar este usuário.';button.disabled=false;}
  });
  void (async()=>{
    try{
      profileMark('auth.restore.start');const {restoreOperationalUser}=await getAuthApi();
      const restored=await withTimeout(restoreOperationalUser(allowedRoles),AUTH_RESTORE_TIMEOUT_MS,'A restauração da sessão demorou.');
      if(restored){profileMark('auth.restore.success');finish(restored,gate,resolve);return;}
      profileMark('auth.restore.empty');
    }catch(error){profileMark('auth.restore.error',{message:error?.message||String(error)});console.info('[Aliança Park auth] sessão não restaurada',error);}
    // Falhas de restauração não podem deixar o gate sem feedback nem gerar uma
    // rejeição não tratada: o usuário ainda pode autenticar manualmente.
    status.textContent='Sessão não encontrada. Entre com seu e-mail institucional.';
  })();
}):Promise.resolve(true);

globalThis.BELAVISTA_ADMIN_AUTH_READY=authReady;
globalThis.BELAVISTA_ADMIN_SIGN_OUT=async()=>{const {signOutOperationalUser}=await import('./firebase.mjs?v=admin-auth-v4');await signOutOperationalUser();location.reload();};
