import {restoreOperationalUser,signInOperationalUser,signOutOperationalUser} from './firebase.mjs?v=admin-auth-v3';

const path=String(location.pathname||'');
const isFieldPortal=/\/encarregados(?:\.html)?(?:\/|$)/i.test(path);
const isAdminSurface=/\/admin(?:\/|$)/i.test(path)||new URLSearchParams(location.search).get('twa')==='admin';
const required=isFieldPortal||isAdminSurface;
const allowedRoles=isFieldPortal?['foreman','admin','developer']:['admin','foreman','owner','developer'];
globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=required;

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const roleLabel=role=>role==='foreman'?'Encarregado':role==='admin'?'Administrador':role==='developer'?'TI · Desenvolvimento':'Dono';
const viewLabel=isFieldPortal?'portal móvel de campo':'painel administrativo';
const style=document.createElement('style');
style.textContent=`
  .belavista-auth-gate{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:#161616;color:#f4f4f4;font:14px "IBM Plex Sans",Arial,sans-serif}
  .belavista-auth-gate[hidden]{display:none}.belavista-auth-panel{width:min(430px,100%);padding:22px;border:1px solid #525252;background:#262626;box-shadow:0 8px 30px rgba(0,0,0,.28)}
  .belavista-auth-brand{display:flex;align-items:center;gap:10px;padding-bottom:16px;border-bottom:1px solid #525252}.belavista-auth-brand b{display:grid;place-items:center;width:34px;height:34px;background:#0f62fe;color:#fff;font-size:20px}.belavista-auth-brand span{display:grid;gap:3px}.belavista-auth-brand small,.belavista-auth-kicker{color:#78a9ff;font:9px "IBM Plex Mono",monospace;letter-spacing:.08em}.belavista-auth-panel h1{margin:22px 0 6px;font-size:22px}.belavista-auth-panel p{margin:0 0 16px;color:#c6c6c6;font-size:11px;line-height:1.5}.belavista-auth-form{display:grid;gap:12px}.belavista-auth-form label{display:grid;gap:5px;color:#c6c6c6;font-size:11px}.belavista-auth-form input{min-height:40px;padding:9px;border:1px solid #525252;background:#161616;color:#f4f4f4;font:14px inherit}.belavista-auth-form input:focus{outline:2px solid #0f62fe;outline-offset:-1px}.belavista-auth-form button{min-height:42px;border:1px solid #0f62fe;background:#0f62fe;color:#fff;font-weight:600;cursor:pointer}.belavista-auth-form button:disabled{opacity:.6;cursor:wait}.belavista-auth-status{min-height:18px;color:#f1c21b;font-size:11px}.belavista-auth-status[data-tone="error"]{color:#ffb3b8}.belavista-auth-status[data-tone="ok"]{color:#42be65}
  .belavista-auth-session{display:grid;gap:10px;padding-top:16px;color:#c6c6c6;font-size:11px}.belavista-auth-session b{color:#f4f4f4}.belavista-auth-session button{justify-self:start;padding:7px 10px;border:1px solid #525252;background:#262626;color:#f4f4f4;cursor:pointer}
  html[data-belavista-auth-pending="true"] body>main,html[data-belavista-auth-pending="true"] body>belavista-app{visibility:hidden}
`;
document.head.appendChild(style);

const createGate=()=>{
  const gate=document.createElement('section');gate.className='belavista-auth-gate';gate.setAttribute('aria-label','Login Aliança Park');gate.innerHTML=`<div class="belavista-auth-panel"><div class="belavista-auth-brand"><b>◢</b><span><strong>Aliança Park</strong><small>${isFieldPortal?'PORTAL MÓVEL · ENCARREGADO':'TWA ADMINISTRATIVO · ACESSO RESTRITO'}</small></span></div><span class="belavista-auth-kicker">AUTENTICAÇÃO FIREBASE</span><h1>Entrar no ${viewLabel}</h1><p>Use o e-mail institucional. O Firebase valida o perfil e libera somente as funções atribuídas ao usuário.</p><form class="belavista-auth-form"><label>E-mail<input name="email" type="email" autocomplete="username" required placeholder="voce@empresa.com"></label><label>Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Senha do Firebase"></label><button type="submit">Entrar com segurança</button><div class="belavista-auth-status" aria-live="polite"></div></form></div>`;
  document.body.appendChild(gate);return gate;
};

const finish=(session,gate,resolve)=>{
  const user=session.user;
  globalThis.BELAVISTA_ADMIN_ACTOR={uid:user.uid,name:user.displayName||user.email||user.uid,email:user.email||'',role:session.role,label:roleLabel(session.role),mode:'firebase'};
  globalThis.BELAVISTA_GET_ID_TOKEN=()=>user.getIdToken();
  document.documentElement.dataset.belavistaAuth='ready';
  document.documentElement.dataset.belavistaAuthRole=session.role;
  // The pending flag hides the application while Firebase restores or validates
  // the session. Clear it on success or the authorized shell stays invisible
  // even though the gate has already been removed.
  delete document.documentElement.dataset.belavistaAuthPending;
  gate.hidden=true;gate.remove();resolve(true);
};

const authReady=required?new Promise(async resolve=>{
  document.documentElement.dataset.belavistaAuthPending='true';
  const gate=createGate(),form=gate.querySelector('form'),status=gate.querySelector('.belavista-auth-status');
  try{
    const restored=await restoreOperationalUser(allowedRoles);
    if(restored){finish(restored,gate,resolve);return;}
  }catch(error){console.info('[Aliança Park auth] sessão não restaurada',error);}
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button'),data=Object.fromEntries(new FormData(form));
    button.disabled=true;status.dataset.tone='';status.textContent='Validando perfil…';
    try{const session=await signInOperationalUser(data.email,data.password,allowedRoles);finish(session,gate,resolve);}
    catch(error){status.dataset.tone='error';status.textContent=error?.message||'Não foi possível autenticar este usuário.';button.disabled=false;}
  });
}):Promise.resolve(true);

globalThis.BELAVISTA_ADMIN_AUTH_READY=authReady;
globalThis.BELAVISTA_ADMIN_SIGN_OUT=async()=>{await signOutOperationalUser();location.reload();};
