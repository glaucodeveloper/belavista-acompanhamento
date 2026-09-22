// BELAVISTA_ADMIN_PUBLIC_MAP_SURFACE_V5352
// v5.3.51 deferred after shell: import './admin-runtime-v11.js?v=admin-runtime-v11';
// v5.3.51 deferred after shell: import './admin-lots-canvas-v1.js?v=admin-lots-canvas-v1';
import './components.js?v=instagram-api-live-v25&route=ngrok-route-v1&full-image-3d-environment-v1&foreman-surface-v1&admin-map-static-first-v20-scene-only-168&map-aerial-alignment-v88&stage-context-chrome-v5&road-integral-asphalt-slices-v14';
import {appStore, persistUiState, restoreUiState, viewThemes} from './state.js?v=system-metrics-v1-20260919';
import {apiFetch} from './api-client.mjs?v=instagram-api-live-v1';
import {normalizeOperationalRole, roleCanOpenView} from './admin-role-policy.mjs?v=admin-role-policy-v1';

document.addEventListener('click',event=>{
  const back=event.target?.closest?.('.stage-v9-dedicated-page .stage-v9-back');
  if(!back)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  appStore.set({view:'stages',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Voltou para a central de etapas'});
},true);
// v5.3.51 deferred after shell: import './stage-admin-v10.js?v=stage-admin-v10-primary';
// BELAVISTA_ORIGINAL_ADMIN_BOOT_RESCUE_V5351
const ADMIN_DEFERRED_MODULES_V5351=[
  "./admin-runtime-v11.js?v=admin-runtime-v11",
  "./admin-lots-canvas-v1.js?v=admin-lots-canvas-v1",
  "./stage-admin-v10.js?v=stage-admin-v10-primary",
  "./execution-planning-v8.js?v=navigation-state-v22",
  "./map-page-widgets-v5.js?v=widget-blue-smoke-v1",
  "./dashboard-map-tabs-v3.js?v=map-tabs-v3",
  "./admin-public-map-surface-v5352.mjs?v=5.3.54",
  "./public-leads-map-v50.mjs?v=admin-public-map-fixed-180-v1",
  "./admin-public-map-3d-status-v5353.mjs?v=5.3.53",
  "./finance-mobile-cash-v5358.mjs?v=5.3.58",
  "./chat-tab-widget-ghost-v5359.mjs?v=5.3.59",
  "./final-workspaces-v5360.mjs?v=5.3.60",
  "./stages-landing-v5361.mjs?v=5.3.61",
  "./belavista-final-ui-v5362.mjs?v=5.3.62",
  "./records-activity-drill-in-v5377.mjs?v=control-stage-unified-form-v3-20260915"
];

// O mapa administrativo abre primeiro como fotografia aérea estática. Os
// módulos abaixo são extensões do mapa antigo: cada um instala um observer,
// rAF ou ponte de câmera própria. Carregá-los nessa rota reintroduz trabalho
// concorrente enquanto a cena ainda está sem 3D e pode travar o Chromium.
const ADMIN_STATIC_FIRST_MAP_MODULES_V5370=new Set([
  "./map-page-widgets-v5.js?v=widget-blue-smoke-v1",
  "./dashboard-map-tabs-v3.js?v=map-tabs-v3",
  "./admin-public-map-surface-v5352.mjs?v=5.3.54",
  "./public-leads-map-v50.mjs?v=admin-public-map-fixed-180-v1",
  "./admin-public-map-3d-status-v5353.mjs?v=5.3.53"
]);

const isAdminStaticFirstMapV5370=()=>Boolean(
  document.querySelector('map-scene[data-map-init="admin-static-first-v5370"]')
);

async function loadDeferredAdminModulesV5351({force=false}={}){
  const failures=[];
  const skipped=[];
  document.documentElement.dataset.adminDeferredState='loading';

  // Primeiro confirme que o shell e a fotografia aérea permanecem estáveis
  // sem nenhum addon administrativo. Isso separa um crash de WebGL de um
  // loop de extensão/DOM que acontece depois do primeiro paint.
  if(isAdminStaticFirstMapV5370()&&!force){
    skipped.push(...ADMIN_DEFERRED_MODULES_V5351);
    document.documentElement.dataset.adminDeferredState='static-map-only';
    globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351={
      modules:[...ADMIN_DEFERRED_MODULES_V5351],
      skipped,
      failures,
      isolated:true,
      loadedAt:new Date().toISOString()
    };
    return globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351;
  }

  for(const specifier of ADMIN_DEFERRED_MODULES_V5351){
    if(isAdminStaticFirstMapV5370()&&ADMIN_STATIC_FIRST_MAP_MODULES_V5370.has(specifier)){
      skipped.push(specifier);
      continue;
    }
    try{
      await import(specifier);
    }catch(error){
      failures.push({
        specifier,
        error:String(error?.stack||error?.message||error)
      });
      console.error(
        '[Aliança Park admin v5.3.51] addon falhou:',
        specifier,
        error
      );
    }
  }

  document.documentElement.dataset.adminDeferredState=
    failures.length?'partial':'ready';

  globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351={
    modules:[...ADMIN_DEFERRED_MODULES_V5351],
    skipped,
    failures,
    loadedAt:new Date().toISOString()
  };

  // Side-effect modules patch prototypes/renderers. Trigger one state update
  // after they are loaded so the already-mounted original shell incorporates
  // those extensions without requiring a page reload.
  try{
    const current=appStore.get();
    appStore.set({
      lastAction:failures.length
        ? `Painel aberto; ${failures.length} extensão(ões) não carregaram`
        : 'Extensões administrativas carregadas'
    });
  }catch{}

  globalThis.installBelavistaFinalWorkspacesV5360?.();
  globalThis.installBelavistaStagesLandingV5361?.();
  globalThis.installBelavistaRecordsActivityDrillInV5377?.();
  globalThis.installStageHomeRaidAiRecordsCalendarV1?.();
  try{
    appStore.set({lastAction:'Extensões administrativas renderizadas'});
  }catch{}
  return globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351;
}

const STORAGE_KEY='belavista.install.v1';
const qs=new URLSearchParams(location.search);

// A sessão de instalação só faz sentido quando a base SQL operacional deste
// dispositivo ainda não tem atividades. O endpoint é local no servidor Node
// e continua funcionando no PWA/URL visit; em uma visita sem SQL local, a
// sessão permanece oculta até que uma base compatível seja detectada.
const directViewsV1=new Set(['map','assistant','control','stages','agenda','activities','progress','pert','actions','raci','raid','records','foremen','leads','messages','personnel','proposals','contracts','brokers','brokers-board','commission-deal','finance','cash-record','reports','settings','activity-installation']);
async function refreshLocalSqlStateV1(requestedView=''){
  try{
    const response=await apiFetch('/api/health',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json(),entities=payload?.entities&&typeof payload.entities==='object'?payload.entities:{};
    const activities=Number(entities.activities)||0,records=Number(entities.records)||0,relations=Number(entities.activity_relations)||0;
    const clean=payload?.database==='sqlite'&&activities===0&&records===0&&relations===0;
    appStore.set({localSqlState:{status:'ready',clean,entities,checkedAt:new Date().toISOString(),error:null}});
    if(requestedView==='activity-installation'&&clean&&appStore.get().view==='stages')appStore.set({view:'activity-installation',stageSelected:true,lastAction:'Abriu a sessão de instalação pela URL'});
  }catch(error){
    appStore.set({localSqlState:{status:'unavailable',clean:false,entities:{},checkedAt:new Date().toISOString(),error:String(error?.message||error)}});
  }
}

// Inicia o aquecimento da base cartográfica em segundo plano. A interface deve
// abrir primeiro; mapa lento ou sem rede nao pode travar o painel operacional.
const tileXY=(lat,lng,zoom)=>{
  const n=2**zoom,rad=Number(lat)*Math.PI/180;
  return {x:Math.floor((Number(lng)+180)/360*n),y:Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n)};
};
const preloadImage=url=>new Promise(resolve=>{const image=new Image();let done=false;const finish=()=>{if(done)return;done=true;resolve(url);};image.onload=finish;image.onerror=finish;image.decoding='async';image.src=url;setTimeout(finish,1800);});
const warmMapAssets=()=>{
  const theme=viewThemes.map||viewThemes.assistant,center=theme?.center||[-16.708,-49.092],zoom=Math.max(15,Math.min(19,Math.round(Number(theme?.zoom)||17))),tile=tileXY(center[0],center[1],zoom),urls=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y+dy}/${tile.x+dx}`);
  return Promise.allSettled(urls.map(preloadImage));
};
let mapWarmupPromise=null;
const startMapWarmup=()=>{
  // O navegador interno pode encerrar a aba com downloads concorrentes.
  // Tiles só são pré-carregadas por solicitação consciente de diagnóstico.
  if(qs.get('mapPreload')!=='1')return Promise.resolve([]);
  return mapWarmupPromise||(mapWarmupPromise=warmMapAssets());
};
const waitForMapWarmup=async(timeout=500)=>{
  startMapWarmup();
  const boot=document.querySelector('#boot'),text=boot?.querySelector('p');if(text)text.textContent='Abrindo painel operacional...';
  await Promise.race([mapWarmupPromise,new Promise(resolve=>setTimeout(resolve,220))]);
  const started=performance.now();
  await new Promise(resolve=>{const tick=()=>{const map=document.querySelector('map-scene[data-persistent-map="true"]'),ready=['ready','partial','uploading'].includes(map?.dataset.mapTexture);if(ready||performance.now()-started>=timeout)return resolve();setTimeout(tick,60);};tick();});
};

class InstallScreen extends HTMLElement {
  connectedCallback(){ this.render(); this.bind(); }
  render(){
    if(globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED){
      this.hidden=true;
      queueMicrotask(()=>startApp({mode:'firebase-admin-twa'}));
      return;
    }
    const saved=localStorage.getItem(STORAGE_KEY);
    const demo=qs.get('demo')==='1';
    if(saved||demo){ this.hidden=true; queueMicrotask(()=>startApp(saved?JSON.parse(saved):{mode:'demo'})); return; }
    this.hidden=false;
    document.querySelector('#boot')?.remove();
    this.innerHTML=`<section class="install-wrap"><div class="install-panel"><div class="install-brand"><span class="install-mark">◢</span><div><strong>Aliança Park</strong><small>LOTEAMENTO · CONFIGURAÇÃO LOCAL</small></div></div><h1>Instalar o painel local</h1><p class="install-copy">Configure o projeto, salve a integração neste dispositivo e instale a PWA. O sistema funciona como SPA e mantém o shell em cache para não recarregar a interface entre módulos.</p><div class="install-grid"><label>Nome do empreendimento<input id="projectName" value="Empreendimento Aliança Park" /></label><label>Repositório GitHub<input id="repo" placeholder="usuario/belavista-acompanhamento" /></label><label class="full">Personal Access Token (PAT)<input id="pat" type="password" autocomplete="off" placeholder="github_pat_…" /></label></div><div class="security-note"><b>Segurança:</b> por solicitação desta instalação, o PAT pode ser salvo no <code>localStorage</code> deste navegador. Isso não é recomendado para produção porque scripts da mesma origem podem lê-lo. Use um token de escopo mínimo e um perfil de navegador dedicado.</div><label class="remember"><input id="remember" type="checkbox" checked /> Salvar configuração e PAT neste dispositivo</label><div class="install-actions"><button id="validate" class="ghost">Validar PAT</button><button id="demo" class="ghost">Abrir modo demonstração</button><button id="install" class="primary">Salvar e entrar</button></div><div id="installStatus" class="install-status" aria-live="polite"></div><div class="script-box"><div><strong>Criar um novo repositório com GitHub CLI + SSH</strong><span>Script incluído em <code>scripts/create-repo.sh</code></span></div><pre>bash scripts/create-repo.sh belavista-acompanhamento private</pre></div><button id="pwaInstall" class="pwa-install" disabled>Instalar PWA neste dispositivo</button></div></section>`;
  }
  bind(){
    this.querySelector('#demo')?.addEventListener('click',()=>{this.hidden=true;startApp({mode:'demo'});});
    this.querySelector('#validate')?.addEventListener('click',()=>this.validatePat());
    this.querySelector('#install')?.addEventListener('click',()=>this.save());
    this.querySelector('#pwaInstall')?.addEventListener('click',async()=>{const p=appStore.get().installPrompt;if(!p)return;await p.prompt();appStore.set({installPrompt:null});this.updateInstallButton();});
    this.updateInstallButton();
  }
  updateInstallButton(){ const b=this.querySelector('#pwaInstall'); if(!b)return; b.disabled=!appStore.get().installPrompt; b.textContent=b.disabled?'Instalação PWA disponível após abrir a página':'Instalar PWA neste dispositivo'; }
  async validatePat(){
    const token=this.querySelector('#pat').value.trim(); const status=this.querySelector('#installStatus'); if(!token){status.textContent='Informe um PAT para validar.';return;}
    status.textContent='Validando…';
    try{const r=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(`GitHub respondeu ${r.status}`);const u=await r.json();status.textContent=`PAT válido para ${u.login}.`;status.className='install-status ok';}
    catch(err){status.textContent=`Não foi possível validar: ${err.message}`;status.className='install-status err';}
  }
  save(){
    const cfg={projectName:this.querySelector('#projectName').value.trim()||'Empreendimento Aliança Park',repo:this.querySelector('#repo').value.trim(),savedAt:new Date().toISOString()};
    if(this.querySelector('#remember').checked)localStorage.setItem(STORAGE_KEY,JSON.stringify(cfg));
    this.hidden=true;startApp(cfg);
  }
}
if(!customElements.get('install-screen')) customElements.define('install-screen', InstallScreen);

class BelavistaApp extends HTMLElement {
  connectedCallback(){ this.mountShell(); if(!this._bound){this._bound=true;this.bind();} }
  mountShell(){
    if(this.querySelector('.app-shell'))return;
    this.innerHTML=`<div class="app-shell ${appStore.get().sidebarCollapsed?'sidebar-collapsed':''}"><app-sidebar></app-sidebar><div class="app-main"><app-topbar></app-topbar><main class="scene"><map-scene data-persistent-map="true" data-public-map="" data-public-presentation="true" data-base-map="" data-stage="Aliança Park · comercial" data-overlay="urbanizacao" data-admin-shared-public-map="v5352" data-dashboard-progress-map="true" data-admin-record-selection="true" data-map-context="admin" aria-label="Mapa operacional do Aliança Park"></map-scene><view-layer></view-layer></main></div></div>`;
    window.lucide?.createIcons();
  }
  bind(){
    let deferredExtensionsPromise=null;
    const ensureDeferredExtensions=()=>{
      const deferredState=document.documentElement.dataset.adminDeferredState;
      if(deferredState==='loading'||deferredState==='ready'||deferredState==='partial')
        return Promise.resolve(globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351||null);
      if(deferredExtensionsPromise)return deferredExtensionsPromise;
      const loader=globalThis.loadBelavistaAdminExtensionsV5351;
      if(typeof loader!=='function')return Promise.resolve(null);
      deferredExtensionsPromise=loader({force:true}).catch(error=>{
        deferredExtensionsPromise=null;
        console.warn('[Aliança Park admin] extensões sob demanda indisponíveis',error);
        return null;
      });
      return deferredExtensionsPromise;
    };
    appStore.subscribe(s=>{
      this.dataset.view=s.view;
      const role=normalizeOperationalRole(s.currentActor?.role||'owner');
      this.dataset.role=role;
      const shell=this.querySelector('.app-shell');
      shell?.classList.toggle('sidebar-collapsed',s.sidebarCollapsed);
      shell?.classList.toggle('print-mode',!!s.printMode);
      if(shell){shell.dataset.shellView=s.view;shell.dataset.shellRole=role;}
      if(role==='foreman'&&!roleCanOpenView(role,s.view)){
        queueMicrotask(()=>{
          const current=appStore.get();
          if(current.currentActor?.role&&normalizeOperationalRole(current.currentActor.role)==='foreman'&&!roleCanOpenView('foreman',current.view))
            appStore.set({view:'map',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Área indisponível para o perfil de encarregado'});
        });
      }
      // A navegação deve continuar imediatamente responsiva. O lote legado de
      // extensões altera protótipos e importa cenas pesadas; iniciá-lo no
      // mesmo clique fazia o navegador parecer congelado antes de renderizar
      // a próxima tela. Ele permanece disponível para ativação explícita.
      clearTimeout(this._memoryTimer);
      this._memoryTimer=setTimeout(()=>persistUiState(s),140);
      setTimeout(()=>window.lucide?.createIcons(),0);
    });
    this.addEventListener('click',event=>{
      if(!event.target?.closest?.('[data-load-admin-extensions]'))return;
      ensureDeferredExtensions();
    },true);
    window.addEventListener('pagehide',()=>persistUiState(appStore.get()));
    this.addEventListener('click',event=>{const back=event.target?.closest?.('.activity-dedicated-page [data-view="stages"]');if(!back)return;event.preventDefault();event.stopPropagation();appStore.set({view:'stages',activityDedicated:false,selectedActivity:null,lastAction:'Voltou para as etapas'});},true);
    this.addEventListener('click',event=>{const back=event.target?.closest?.('.stage-v9-dedicated-page .stage-v9-back');if(!back)return;event.preventDefault();event.stopImmediatePropagation();appStore.set({view:'stages',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Voltou para a central de etapas'});},true);
    this.addEventListener('click',e=>{if(e.target.closest('#reinstall')){localStorage.removeItem(STORAGE_KEY);location.href=location.pathname;}if(e.target.closest('#clearPat')){const cfg=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');cfg.pat='';localStorage.setItem(STORAGE_KEY,JSON.stringify(cfg));alert('PAT removido do armazenamento local.');}});
  }
}
if(!customElements.get('belavista-app')) customElements.define('belavista-app', BelavistaApp);

async function startApp(config){
  if(globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED){
    const authenticated=await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(false));
    if(!authenticated)return;
  }
  // BELAVISTA_PAT_STARTAPP_SANITIZE_V5364
  if(config?.pat||config?.githubPat||config?.githubToken){
    config={...config};
    delete config.pat;
    delete config.githubPat;
    delete config.githubToken;
  }
  let boot=document.querySelector('#boot');
  if(!boot){boot=document.createElement('div');boot.id='boot';boot.className='boot-screen';boot.setAttribute('aria-live','polite');boot.innerHTML='<div class="boot-orb"></div><p>Abrindo painel operacional...</p>';document.body.appendChild(boot);}
  const app=document.querySelector('belavista-app'),savedUi=restoreUiState(),authActor=globalThis.BELAVISTA_ADMIN_ACTOR,rawRequestedView=qs.get('view'),requestedView=rawRequestedView==='assistant'?'map':directViewsV1.has(rawRequestedView)?rawRequestedView:'map',actor=authActor||savedUi.currentActor||{},role=normalizeOperationalRole(actor.role||'owner'),safeView=role==='foreman'&&!roleCanOpenView(role,requestedView)?'map':requestedView,initialView=safeView==='activity-installation'?'stages':safeView; app.hidden=false; app.dataset.preloading='true'; app.dataset.role=role; globalThis.installStageHomeRaidAiRecordsCalendarV1?.(); appStore.set({...savedUi,config,currentActor:actor,view:initialView,mapMode:'overview',sidebarCollapsed:false,activityDedicated:false,proposalFormOpen:false,contractEditing:null,theme:'dark',lastAction:initialView==='map'?'Abriu o mapa operacional':`Abriu ${initialView}`}); if(initialView==='stages'){[0,500,1800,4200].forEach(delay=>setTimeout(()=>globalThis.ensureStageHomeRaidAiRecordsCalendarV1?.(),delay));} document.documentElement.dataset.theme='dark';
  delete app.dataset.preloading; if(boot)boot.remove();
  // Extensões administrativas são opcionais na abertura. Alguns módulos
  // antigos instalam observadores de documento e não podem disputar o
  // primeiro render com o shell autenticado. Eles continuam disponíveis para
  // uma ativação explícita, sem transformar a navegação inicial em uma corrida.
  globalThis.loadBelavistaAdminExtensionsV5351=loadDeferredAdminModulesV5351;
  document.documentElement.dataset.adminDeferredState='idle-until-action';
  // Carrega as extensões depois do primeiro desenho do shell. Sem este
  // aquecimento, as ações de agenda, central, caixa e páginas de etapa ficam
  // dependentes de um gatilho que não existe na interface principal.
  setTimeout(()=>globalThis.loadBelavistaAdminExtensionsV5351?.(),900);
  // O mapa é aquecido depois que o painel já está utilizável.
  setTimeout(()=>waitForMapWarmup().catch(()=>{}),120);
  // No celular a aplicação mantém toda a navegação disponível. A tela de
  // Registros continua podendo ser aberta diretamente por `?mobile=records`,
  // mas não substitui mais a página que o usuário deixou salva.
  if(window.matchMedia?.('(max-width: 760px)').matches&&qs.get('mobile')==='records') appStore.set({view:'records',lastAction:'Modo mobile de registros ativado'});
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js?v=full-image-3d-environment-v1',{updateViaCache:'none'}).catch(console.warn);
  void refreshLocalSqlStateV1(requestedView);
}

window.addEventListener('beforeinstallprompt',e=>{
  const screen=document.querySelector('install-screen');
  if(!screen){ return; }
  e.preventDefault();
  appStore.set({installPrompt:e});
  screen.updateInstallButton?.();
});
window.addEventListener('appinstalled',()=>appStore.set({installPrompt:null}));
