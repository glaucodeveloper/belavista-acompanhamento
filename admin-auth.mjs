import {apiUrl} from './api-client.mjs?v=github-pat-gateway-v1';
import {normalizeUserType} from './admin-role-policy.mjs';
import {clearGithubPat,readGithubPat,saveGithubPat} from './github-pat-vault-v1.mjs';

const tokenKey='belavista.github.session.v1';
const path=String(location.pathname||'');
const mobile=globalThis.BELAVISTA_CAPACITOR_NATIVE===true;
const profile=globalThis.BELAVISTA_LOGIN_PROFILE;
const mark=(name,detail={})=>profile?.mark(name,detail);
let nativeVaultPromise;
const nativeVault=()=>nativeVaultPromise||=(async()=>{
  if(!mobile)throw new Error('Armazenamento seguro disponível apenas no aplicativo Android.');
  const registered=globalThis.Capacitor?.Plugins?.NativePatVault;
  if(registered)return registered;
  const {registerPlugin}=await import('@capacitor/core');
  return registerPlugin('NativePatVault');
})();
const roleLabel=actor=>actor.userType==='foreman'?'Encarregado':
  ['sales','commercial','broker','corretor'].includes(actor.role)?'Corretor':
  actor.role==='owner'?'Dono':actor.role==='admin'?'Administrador':'Operador';

globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=true;
document.documentElement.dataset.belavistaAuthPending='true';
mark('auth.module.start',{provider:'github-pat',route:path});

const style=document.createElement('style');
style.textContent=`
  .belavista-auth-gate{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:#111;color:#f8f8f8;font:14px Arial,sans-serif}
  .belavista-auth-panel{width:min(430px,100%);padding:28px;border:1px solid #363636;border-radius:24px;background:#1e1e1e;box-shadow:0 24px 60px #0007}
  .belavista-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:26px}.belavista-auth-brand b{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#fff;color:#171717;font-size:24px}.belavista-auth-brand strong{display:block;font-size:25px;letter-spacing:-.04em}.belavista-auth-brand small{display:block;color:#aaa;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
  .belavista-auth-panel h1{margin:0 0 8px;font-size:25px;letter-spacing:-.035em}.belavista-auth-panel p{margin:0 0 24px;color:#aaa;font-size:13px;line-height:1.5}
  .belavista-auth-form{display:grid;gap:14px}.belavista-auth-form label{display:grid;gap:8px;color:#ddd;font-size:12px}.belavista-auth-form input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #555;border-radius:12px;background:#292929;color:#fff;font:14px monospace}.belavista-auth-form input:focus{outline:2px solid #7d9bff;outline-offset:2px}
  .belavista-auth-form button{min-height:44px;border:0;border-radius:12px;background:#fff;color:#181818;font-weight:700;cursor:pointer}.belavista-auth-form button:disabled{opacity:.5;cursor:wait}
  .belavista-auth-status{min-height:18px;margin:0;color:#ffacac;font-size:12px;line-height:1.4}.belavista-auth-note{color:#888;font-size:11px;line-height:1.45}
  html[data-belavista-auth-pending="true"] body>*:not(.belavista-auth-gate):not(script):not(style){visibility:hidden!important}
`;
document.head.appendChild(style);

const gate=document.createElement('section');
gate.className='belavista-auth-gate';
gate.setAttribute('aria-label','Acesso GitHub ao Aliança Park');
gate.innerHTML=`<div class="belavista-auth-panel">
  <div class="belavista-auth-brand"><b>◈</b><span><strong>atlas.</strong><small>Aliança Park · acesso restrito</small></span></div>
  <h1>Conectar ao Aliança Park</h1>
  <p>Administrador: use o PAT do repositório para gerenciar chaves. Encarregado: use a chave de campo emitida pelo administrador; ela só libera as permissões selecionadas.</p>
  <form class="belavista-auth-form">
    <label>PAT administrador ou chave de campo<input name="pat" type="password" autocomplete="off" spellcheck="false" required placeholder="github_pat_… ou bvk_…"></label>
    <button type="submit">Continuar</button>
    <output class="belavista-auth-status" aria-live="polite"></output>
    <small class="belavista-auth-note">${mobile
      ?'A credencial fica cifrada no armazenamento seguro deste aparelho; a sessão é renovada automaticamente. O administrador pode revogar chaves de campo.'
      :'A credencial fica cifrada neste navegador para renovar a sessão revogável. O administrador pode revogar chaves de campo.'}</small>
  </form>
</div>`;
document.body.appendChild(gate);
mark('auth.gate.visible');

const form=gate.querySelector('form');
const status=gate.querySelector('.belavista-auth-status');
const button=form.querySelector('button');
const savedToken=()=>{try{return localStorage.getItem(tokenKey)||'';}catch{return '';}};
const storeToken=token=>{try{localStorage.setItem(tokenKey,token);}catch{throw new Error('Não foi possível guardar a sessão neste dispositivo.');}};
const clearToken=()=>{try{localStorage.removeItem(tokenKey);}catch{}};
let reloadAfterAuth=false;

async function sessionRequest(method,token,body){
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),15000);
  let response;
  try{
    response=await fetch(apiUrl('/api/auth/session'),{
      method,cache:'no-store',signal:controller.signal,
      headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
  }catch(error){
    if(controller.signal.aborted)throw new Error('O serviço de autenticação não respondeu em 15 segundos. Verifique a conexão e tente novamente.');
    throw new Error('Não foi possível conectar ao serviço de autenticação. Verifique a conexão e tente novamente.');
  }finally{window.clearTimeout(timeout);}
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload.error||`Falha HTTP ${response.status}`),{status:response.status});
  return payload;
}

function activate(session,token,resolve){
  const actor=session.actor;
  if(!actor?.uid||!actor?.role)throw new Error('O servidor não retornou um perfil válido.');
  const userType=normalizeUserType(actor.userType||'');
  globalThis.BELAVISTA_ADMIN_ACTOR={...actor,userType,label:roleLabel({...actor,userType})};
  globalThis.BELAVISTA_GET_ID_TOKEN=()=>token;
  document.documentElement.dataset.belavistaAuth='ready';
  document.documentElement.dataset.belavistaAuthRole=actor.role;
  if(userType)document.documentElement.dataset.belavistaUserType=userType;
  else delete document.documentElement.dataset.belavistaUserType;
  delete document.documentElement.dataset.belavistaAuthPending;
  gate.remove();
  mark('auth.session.ready',{role:actor.role,userType});
  resolve(true);
  if(reloadAfterAuth){location.reload();return;}
  if((userType==='foreman'||['sales','commercial','broker','corretor'].includes(actor.role))
      &&!['/','/index.html','/admin','/admin/'].includes(path.toLowerCase())&&!mobile){
    location.replace('/admin?view=records');
  }
}

async function acceptPat(pat,resolve,{remember=true}={}){
  const session=await sessionRequest('POST','',{pat});
  if(!/^bvs_[a-f0-9]{64}$/.test(String(session.token||'')))throw new Error('O servidor retornou uma sessão inválida.');
  try{
    if(remember){
      if(mobile)await (await nativeVault()).save({pat});
      else await saveGithubPat(pat);
    }
    storeToken(session.token);
    activate(session,session.token,resolve);
  }catch(error){
    await sessionRequest('DELETE',session.token).catch(()=>{});
    clearToken();
    throw error;
  }
}

globalThis.BELAVISTA_ADMIN_AUTH_READY=new Promise(resolve=>{
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const pat=String(new FormData(form).get('pat')||'').trim();
    button.disabled=true;
    status.textContent='Validando acesso ao repositório…';
    try{
      await acceptPat(pat,resolve);
      form.reset();
    }catch(error){
      status.textContent=error.message||'Não foi possível autenticar.';
      if(error.status===401||error.status===403){
        if(mobile)await (await nativeVault()).clear().catch(()=>{});
        else await clearGithubPat().catch(()=>{});
        clearToken();
        form.elements.pat.value='';
        status.textContent='Credencial inválida, expirada, revogada ou sem acesso permitido. Informe uma chave ativa.';
      }
      mark('auth.session.error',{message:status.textContent});
    }finally{button.disabled=false;}
  });
  void (async()=>{
    const token=savedToken();
    let tokenRejected=false;
    if(token){
      status.textContent='Restaurando sessão…';
      try{
        activate(await sessionRequest('GET',token),token,resolve);
        return;
      }catch(error){
        if(error.status===401||error.status===403){clearToken();tokenRejected=true;}
        else{status.textContent=error.message||'Não foi possível restaurar a sessão.';return;}
      }
    }
    if(mobile||!token||tokenRejected){
      status.textContent=mobile?'Verificando chave salva no aparelho…':'Verificando PAT salvo neste navegador…';
      try{
        const saved=mobile?await (await nativeVault()).read():{pat:await readGithubPat()};
        const pat=String(saved?.pat||'');
        if(pat){
          status.textContent='Renovando sessão…';
          try{
            await acceptPat(pat,resolve,{remember:false});
            return;
          }catch(error){
            if(error.status===401||error.status===403){
              if(mobile)await (await nativeVault()).clear().catch(()=>{});
              else await clearGithubPat().catch(()=>{});
              clearToken();
              form.elements.pat.value='';
              status.textContent='O PAT salvo está inválido, expirou ou perdeu acesso ao repositório. Informe um PAT válido.';
            }else status.textContent=error.message||'Não foi possível renovar a sessão.';
            mark('auth.restore.error',{message:status.textContent});
            return;
          }
        }
      }catch(error){
        status.textContent=error.message||'Não foi possível ler a chave salva.';
        mark('auth.restore.error',{message:status.textContent});
        return;
      }
    }
    status.textContent='Informe um PAT com acesso ao repositório.';
  })();
});

globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE=()=>{
  if(document.documentElement.dataset.belavistaAuthPending==='true')return;
  if(!savedToken()){
    status.textContent='Informe um PAT com acesso ao repositório.';
    if(!gate.isConnected)document.body.appendChild(gate);
    return;
  }
  reloadAfterAuth=true;
  clearToken();
  delete globalThis.BELAVISTA_ADMIN_ACTOR;
  delete globalThis.BELAVISTA_GET_ID_TOKEN;
  delete document.documentElement.dataset.belavistaAuth;
  delete document.documentElement.dataset.belavistaAuthRole;
  delete document.documentElement.dataset.belavistaUserType;
  document.documentElement.dataset.belavistaAuthPending='true';
  form.elements.pat.value='';
  status.textContent='A sessão foi recusada pelo serviço. Informe novamente um PAT com acesso ao repositório.';
  if(!gate.isConnected)document.body.appendChild(gate);
  mark('auth.session.invalidated',{reason:'protected-api-401'});
};

globalThis.BELAVISTA_ADMIN_SIGN_OUT=async()=>{
  if(mobile)await (await nativeVault()).clear();
  else await clearGithubPat().catch(()=>{});
  const token=savedToken();
  try{if(token)await sessionRequest('DELETE',token);}finally{
    clearToken();
    location.reload();
  }
};
