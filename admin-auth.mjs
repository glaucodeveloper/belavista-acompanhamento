const tokenKey='belavista.github.session.v1';
const path=String(location.pathname||'');
const mobile=globalThis.BELAVISTA_CAPACITOR_NATIVE===true;
const profile=globalThis.BELAVISTA_LOGIN_PROFILE;
const mark=(name,detail={})=>profile?.mark(name,detail);
let desktopRuntime=null;
try{
  desktopRuntime=await globalThis.aliancaDesktop?.runtime?.()||null;
}catch{}
const desktopDemoMode=desktopRuntime?.mode==='local'&&new URLSearchParams(location.search).get('demo')==='1';
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

let resolveAuthenticationReady;
globalThis.BELAVISTA_ADMIN_AUTH_READY=new Promise(resolve=>{resolveAuthenticationReady=resolve;});
const [authComponentsTs,authProgramTs]=await Promise.all([
  import('./dist/frontend/components.js').catch(()=>null),
  import('./dist/frontend/program.js').catch(()=>null),
]);
let typescriptAuthApplicationInstalled=false;
try{
  typescriptAuthApplicationInstalled=Boolean(authProgramTs?.installAtlasAdminAuthApplicationV1?.({
    documentRef:document,
    windowRef:window,
    mobile,
    desktopDemoMode,
    desktopMode:desktopRuntime?.mode,
    desktopAvailableModes:desktopRuntime?.availableModes,
    desktopEnvironment:globalThis.aliancaDesktop?.runtime&&globalThis.aliancaDesktop?.switchEnvironment
      ?{runtime:()=>globalThis.aliancaDesktop.runtime(),switchEnvironment:mode=>globalThis.aliancaDesktop.switchEnvironment(mode)}
      :undefined,
    components:authComponentsTs,
    resolveReady:resolveAuthenticationReady,
    fetcher:(url,options)=>fetch(url,options),
    nativeVault:()=>nativeVault(),
    mark,
  }));
}catch(error){
  console.warn('[Belavista auth] O owner TypeScript não iniciou; mantendo fallback compatível.',error);
}
if(!typescriptAuthApplicationInstalled){
const [apiClientFallback,rolePolicyFallback,credentialVaultFallback]=await Promise.all([
  import('./api-client.mjs?v=github-pat-gateway-v1'),
  import('./admin-role-policy.mjs'),
  import('./github-pat-vault-v1.mjs'),
]);
const {apiUrl}=apiClientFallback;
const {actorCanUseAiChat,normalizeUserType}=rolePolicyFallback;
const {clearGithubPat,readGithubPat,saveGithubPat}=credentialVaultFallback;
let gate=null;
try{gate=authComponentsTs?.mountAtlasAdminAuthGateV1?.({documentRef:document,mobile})||null;}catch{}
if(!gate){
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
gate=document.createElement('section');
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
gate.dataset.authGateOwnerV1='legacy-fallback';
}
mark('auth.gate.visible',{owner:gate.dataset.authGateOwnerV1||'typescript'});

const form=gate.querySelector('form');
const status=gate.querySelector('.belavista-auth-status');
const button=form.querySelector('button');
const savedToken=()=>{try{return localStorage.getItem(tokenKey)||'';}catch{return '';}};
const storeToken=token=>{try{localStorage.setItem(tokenKey,token);}catch{throw new Error('Não foi possível guardar a sessão neste dispositivo.');}};
const clearToken=()=>{try{localStorage.removeItem(tokenKey);}catch{}};
let reloadAfterAuth=false;

async function legacySessionRequest(method,token,body){
  const controller=new AbortController();
  // O login consulta /user e o repositório em duas chamadas GitHub sequenciais,
  // cada uma com limite de 10 s no servidor. Reserve tempo para ambas.
  const timeout=window.setTimeout(()=>controller.abort(),30000);
  let response;
  const endpoint=apiUrl('/api/auth/session');
  const serviceOrigin=(()=>{try{return new URL(endpoint,location.href).origin;}catch{return location.origin;}})();
  try{
    response=await fetch(endpoint,{
      method,cache:'no-store',signal:controller.signal,
      headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
  }catch(error){
    if(controller.signal.aborted)throw new Error(`O serviço de autenticação em ${serviceOrigin} não respondeu em 30 segundos. Confirme que o servidor está ativo e tente novamente.`);
    const detail=String(error?.message||'').trim();
    const safeDetail=detail&&!/^(failed to fetch|load failed|networkerror when attempting to fetch resource\.)$/i.test(detail)
      ?` Detalhe: ${detail}`:'';
    throw new Error(`Não foi possível conectar ao serviço de autenticação em ${serviceOrigin}. Confirme que o servidor está ativo e tente novamente.${safeDetail}`);
  }finally{window.clearTimeout(timeout);}
  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json')){
    throw new Error(`O endereço aberto (${serviceOrigin}) respondeu HTML no endpoint de autenticação. Abra o CMS pela porta do servidor da aplicação, não pelo Hosting estático.`);
  }
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload.error||`Falha HTTP ${response.status}`),{status:response.status});
  return payload;
}
const sessionRequest=typeof authProgramTs?.requestAtlasAdminAuthSessionV1==='function'
  ?(method,token,body)=>authProgramTs.requestAtlasAdminAuthSessionV1({
    endpoint:apiUrl('/api/auth/session'),method,token,body,
    fetcher:(url,options)=>fetch(url,options),
    setTimeoutV1:(callback,delay)=>window.setTimeout(callback,delay),
    clearTimeoutV1:handle=>window.clearTimeout(handle),
  })
  :legacySessionRequest;
document.documentElement.dataset.belavistaAuthTransportOwnerV1=
  typeof authProgramTs?.requestAtlasAdminAuthSessionV1==='function'?'typescript':'legacy-fallback';

function activate(session,token,resolve){
  const actor=session.actor;
  const projection=authProgramTs?.projectAtlasAdminAuthenticatedActorV1?.({actor,pathname:path,mobile});
  const userType=projection?.userType??normalizeUserType(actor.userType||'');
  globalThis.BELAVISTA_ADMIN_ACTOR=projection?.actor||{...actor,userType,label:roleLabel({...actor,userType})};
  globalThis.BELAVISTA_GET_ID_TOKEN=()=>token;
  document.documentElement.dataset.belavistaAuth='ready';
  document.documentElement.dataset.belavistaAuthRole=actor.role;
  document.documentElement.dataset.belavistaAiChat=String(projection?.canUseAiChat??actorCanUseAiChat(actor));
  if(projection)document.documentElement.dataset.belavistaAuthProjectionOwnerV1='typescript';
  else delete document.documentElement.dataset.belavistaAuthProjectionOwnerV1;
  if(userType)document.documentElement.dataset.belavistaUserType=userType;
  else delete document.documentElement.dataset.belavistaUserType;
  delete document.documentElement.dataset.belavistaAuthPending;
  gate.remove();
  mark('auth.session.ready',{role:actor.role,userType});
  resolve(true);
  if(reloadAfterAuth){location.reload();return;}
  const redirectToRecords=projection?.redirectToRecords??((userType==='foreman'||['sales','commercial','broker','corretor'].includes(actor.role))
      &&!['/','/index.html','/admin','/admin/'].includes(path.toLowerCase())&&!mobile);
  if(redirectToRecords){
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

const resolve=resolveAuthenticationReady;
if(typeof authProgramTs?.installAtlasAdminAuthSessionFlowV1==='function'){
  const credentialInput=form.querySelector('input[name="pat"]');
  authProgramTs.installAtlasAdminAuthSessionFlowV1({
    form,credentialInput,status,button,rootElement:document.documentElement,mobile,
    sessionRequest,
    readSessionToken:savedToken,
    loadCredential:async()=>{const saved=mobile?await (await nativeVault()).read():{pat:await readGithubPat()};return String(saved?.pat||'');},
    saveCredential:async pat=>{if(mobile)await (await nativeVault()).save({pat});else await saveGithubPat(pat);},
    clearCredential:async()=>{if(mobile)await (await nativeVault()).clear();else await clearGithubPat();},
    storeSessionToken:storeToken,
    clearSessionToken:clearToken,
    activate,
    resolveReady:resolve,
    mark,
  });
}else{
  document.documentElement.dataset.belavistaAuthSessionOwnerV1='legacy-fallback';
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
      if(error.status===401){
        if(mobile)await (await nativeVault()).clear().catch(()=>{});
        else await clearGithubPat().catch(()=>{});
        clearToken();
        form.elements.pat.value='';
        status.textContent=error.message||'O GitHub recusou o PAT ou o acesso ao repositório.';
      }else if(error.status===403){
        status.textContent=error.message||'O PAT foi reconhecido, mas não tem permissão para este repositório.';
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
            if(error.status===401){
              if(mobile)await (await nativeVault()).clear().catch(()=>{});
              else await clearGithubPat().catch(()=>{});
              clearToken();
              form.elements.pat.value='';
              status.textContent=error.message||'O PAT salvo foi recusado pelo GitHub ou não tem acesso ao repositório.';
            }else if(error.status===403){
              status.textContent=error.message||'O PAT salvo foi reconhecido, mas não tem permissão para este repositório.';
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
}

const workerOrigin=()=>{
  if(mobile||!/^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname||'')))return '';
  const configured=String(globalThis.BELAVISTA_AI_BASE||document.querySelector('meta[name="belavista-ai-base"]')?.getAttribute('content')||'').trim();
  return configured.replace(/\/$/,'');
};
async function openWorkerSession(origin,pat){
  if(!origin)throw new Error('Worker não configurado para consultar os leads.');
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),30000);
  let response;
  try{
    response=await fetch(`${origin}/api/auth/session`,{
      method:'POST',cache:'no-store',credentials:'omit',signal:controller.signal,
      headers:{'content-type':'application/json'},body:JSON.stringify({pat})
    });
  }catch(error){
    if(controller.signal.aborted)throw new Error('O serviço de leads não respondeu em 30 segundos.');
    throw new Error('Não foi possível conectar ao serviço de leads. Confirme a conexão e tente novamente.');
  }finally{window.clearTimeout(timeout);}
  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json'))throw new Error('O serviço de leads respondeu em formato inválido.');
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload.error||`Falha HTTP ${response.status} no serviço de leads.`),{status:response.status});
  const token=String(payload.token||'');
  if(!/^bvs_[a-f0-9]{64}$/.test(token))throw new Error('O serviço de leads não retornou uma sessão válida.');
  return token;
}
async function revokeWorkerSession(origin,token){
  await fetch(`${origin}/api/auth/session`,{
    method:'DELETE',cache:'no-store',credentials:'omit',
    headers:{authorization:`Bearer ${token}`}
  });
}
const clearAuthenticatedActor=()=>{
  delete globalThis.BELAVISTA_ADMIN_ACTOR;
  delete globalThis.BELAVISTA_GET_ID_TOKEN;
  delete document.documentElement.dataset.belavistaAuth;
  delete document.documentElement.dataset.belavistaAuthRole;
  delete document.documentElement.dataset.belavistaUserType;
  delete document.documentElement.dataset.belavistaAiChat;
};
const showAuthGate=(message,clearCredentialInput)=>{
  const show=authComponentsTs?.showAtlasAdminAuthGateMessageV1;
  if(typeof show==='function'){
    show({gate,body:document.body,credentialInput:form.querySelector('input[name="pat"]'),status,message,clearCredentialInput});
    return;
  }
  if(clearCredentialInput)form.querySelector('input[name="pat"]').value='';
  status.textContent=message;
  if(!gate.isConnected)document.body.appendChild(gate);
};
let authRuntimeTs=null;
try{
  if(typeof authProgramTs?.createAtlasAdminAuthRuntimeV1==='function'){
    authRuntimeTs=authProgramTs.createAtlasAdminAuthRuntimeV1({
      rootElement:document.documentElement,
      readSessionToken:savedToken,
      clearSessionToken:clearToken,
      readActiveSessionToken:()=>globalThis.BELAVISTA_GET_ID_TOKEN?.()||null,
      sessionRequest:(method,token)=>sessionRequest(method,token),
      workerOrigin,
      loadCredential:async()=>mobile?String((await (await nativeVault()).read())?.pat||''):String(await readGithubPat()||''),
      fetcher:(url,options)=>fetch(url,options),
      setTimeoutV1:(callback,delay)=>window.setTimeout(callback,delay),
      clearTimeoutV1:handle=>window.clearTimeout(handle),
      clearCredentialForSignOut:async()=>{if(mobile)await (await nativeVault()).clear();else await clearGithubPat().catch(()=>{});},
      clearAuthenticatedActor,
      showAuthGate,
      setReloadAfterAuthentication:()=>{reloadAfterAuth=true;},
      reload:()=>location.reload(),
      mark,
    });
    globalThis.BELAVISTA_GET_WORKER_ID_TOKEN=()=>authRuntimeTs.getWorkerIdToken();
    globalThis.BELAVISTA_RESET_WORKER_SESSION=()=>authRuntimeTs.resetWorkerSession();
    globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE=()=>authRuntimeTs.invalidate();
    globalThis.BELAVISTA_ADMIN_SIGN_OUT=()=>authRuntimeTs.signOut();
  }
}catch(error){
  console.warn('[Belavista auth] O runtime TypeScript de sessão não iniciou.',error);
  authRuntimeTs=null;
}

if(!authRuntimeTs){
  let authInvalidationCheck=null;
  let workerSessionToken='';
  let workerSessionPromise=null;
  globalThis.BELAVISTA_GET_WORKER_ID_TOKEN=async()=>{
    if(!workerOrigin())return globalThis.BELAVISTA_GET_ID_TOKEN?.()||null;
    if(workerSessionToken)return workerSessionToken;
    if(workerSessionPromise)return workerSessionPromise;
    workerSessionPromise=(async()=>{
      const pat=mobile?String((await (await nativeVault()).read())?.pat||''):await readGithubPat();
      if(!pat)throw new Error('A chave PTA salva não está disponível para consultar os leads. Reconecte o acesso.');
      workerSessionToken=await openWorkerSession(workerOrigin(),pat);
      return workerSessionToken;
    })().finally(()=>{workerSessionPromise=null;});
    return workerSessionPromise;
  };
  globalThis.BELAVISTA_RESET_WORKER_SESSION=()=>{workerSessionToken='';workerSessionPromise=null;};
  const invalidateCurrentSession=()=>{
    reloadAfterAuth=true;
    clearToken();
    clearAuthenticatedActor();
    document.documentElement.dataset.belavistaAuthPending='true';
    showAuthGate('A sessão foi recusada pelo serviço. Informe novamente um PAT com acesso ao repositório.',true);
    mark('auth.session.invalidated',{reason:'auth-session-401'});
  };
  globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE=()=>{
    if(document.documentElement.dataset.belavistaAuthPending==='true')return;
    if(authInvalidationCheck)return authInvalidationCheck;
    const token=savedToken();
    if(!token){showAuthGate('Informe um PAT com acesso ao repositório.',false);return;}
    authInvalidationCheck=sessionRequest('GET',token)
      .then(()=>false)
      .catch(error=>{
        if(error?.status===401&&savedToken()===token){invalidateCurrentSession();return true;}
        return false;
      })
      .finally(()=>{authInvalidationCheck=null;});
    return authInvalidationCheck;
  };
  globalThis.BELAVISTA_ADMIN_SIGN_OUT=async()=>{
    if(mobile)await (await nativeVault()).clear();
    else await clearGithubPat().catch(()=>{});
    const workerToken=workerSessionToken,origin=workerOrigin();
    if(workerToken&&origin)await revokeWorkerSession(origin,workerToken).catch(()=>{});
    globalThis.BELAVISTA_RESET_WORKER_SESSION?.();
    const token=savedToken();
    try{
      if(token)await sessionRequest('DELETE',token);
    }finally{
      clearToken();
      location.reload();
    }
  };
}
}
