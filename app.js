// BELAVISTA_ADMIN_PUBLIC_MAP_SURFACE_V5352
// v5.3.51 deferred after shell: import './admin-runtime-v11.js?v=admin-runtime-v11';
// v5.3.51 deferred after shell: import './admin-lots-canvas-v1.js?v=admin-lots-canvas-v1';
import './components.js?v=dynamic-access-roles-v1';
import {appStore, persistUiState, restoreUiState, viewThemes} from './state.js?v=system-metrics-v1-20260919';
import {apiFetch} from './api-client.mjs?v=github-pat-gateway-v1';
import {actorCanOpenView, isLimitedOperationalActor, normalizeOperationalRole, resolveStartupActorV1} from './admin-role-policy.mjs?v=admin-role-policy-v3';
import {readUsagePreferences} from './usage-settings-v1.mjs?v=2-labels';
import {resolveApplicationRouteV1} from './components/shared/application-navigation-routes-v1.mjs?v=application-navigation-routes-v1';
import {APPLICATION_SYSTEM_CONFIGURATION_V1,ApplicationStateProgramV1, driveApplicationStateProgramV1, WindowElement} from './bootstrap/application-state-program-v1.mjs';

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
  "./public-leads-context-v521.mjs?v=admin-public-map-raster-v1",
  "./admin-public-map-3d-status-v5353.mjs?v=5.3.53",
  "./finance-mobile-cash-v5358.mjs?v=5.3.58",
  "./chat-tab-widget-ghost-v5359.mjs?v=5.3.59",
  "./final-workspaces-v5360.mjs?v=5.3.60",
  "./stages-landing-v5361.mjs?v=5.3.61",
  "./belavista-final-ui-v5362.mjs?v=5.3.62",
  "./records-activity-drill-in-v5377.mjs?v=mobile-focus-v1"
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
  "./public-leads-context-v521.mjs?v=admin-public-map-raster-v1",
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
  globalThis.installStageRecordCenterV1?.();
  try{
    appStore.set({lastAction:'Extensões administrativas renderizadas'});
  }catch{}
  return globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351;
}

const STORAGE_KEY='belavista.install.v1';
const INTEGRATION_STORAGE_KEY_V1='belavista.integrations.v1';

// A conexao com GitHub e propriedade do Cloudflare Worker. O navegador nao
// recebe PAT, repo ou branch como requisito de instalacao. Limpa somente os
// residuos legados que poderiam ter sido salvos pelo painel local antigo.
const purgeLegacyInstallCredentialsV1=()=>{
  try{localStorage.removeItem(STORAGE_KEY);}catch{}
  try{
    const current=JSON.parse(localStorage.getItem(INTEGRATION_STORAGE_KEY_V1)||'{}');
    const next={...current};
    for(const key of ['pat','githubPat','github_pat','githubToken','github_token','repo','githubRepo','githubBranch','githubWorkflow'])delete next[key];
    if(JSON.stringify(next)!==JSON.stringify(current))localStorage.setItem(INTEGRATION_STORAGE_KEY_V1,JSON.stringify(next));
  }catch{}
};

const workerManagedConfigV1=async()=>{
  const base={mode:'cloudflare-worker',projectName:'Empreendimento Alianca Park',repositorySource:'worker-env',savedAt:new Date().toISOString()};
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),3500);
    const response=await apiFetch('/api/runtime',{cache:'no-store',signal:controller.signal});
    clearTimeout(timer);
    if(!response.ok)throw new Error(`Worker respondeu ${response.status}`);
    const runtime=await response.json();
    return {...base,workerRuntime:runtime,github:runtime.github||null};
  }catch(error){
    return {...base,workerRuntime:{available:false,error:String(error?.message||error)}};
  }
};
const qs=new URLSearchParams(location.search);

// A sessão de instalação só faz sentido quando a base SQL operacional deste
// dispositivo ainda não tem atividades. O endpoint é local no servidor Node
// e continua funcionando no PWA/URL visit; em uma visita sem SQL local, a
// sessão permanece oculta até que uma base compatível seja detectada.
// Corretores possui listagem e ficha próprias. Não deve mais cair na Central
// operacional, que era o alias usado antes de a página dedicada existir.
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
const waitForMapWarmup=async()=>{
  startMapWarmup();
  const boot=document.querySelector('#boot'),text=boot?.querySelector('p');if(text)text.textContent='Abrindo painel operacional...';
  await Promise.race([mapWarmupPromise,new Promise(resolve=>setTimeout(resolve,220))]);
};

class CloudflareBootstrap extends HTMLElement {
  connectedCallback(){
    this.hidden=true;
    this.replaceChildren();
    purgeLegacyInstallCredentialsV1();
    const boot=async()=>{
      if(qs.get('demo')==='1')return startApp({mode:'demo'});
      return startApp(await workerManagedConfigV1());
    };
    queueMicrotask(()=>boot().catch(error=>{
      console.error('[Alianca Park] bootstrap Cloudflare indisponivel',error);
      startApp({mode:'cloudflare-worker',projectName:'Empreendimento Alianca Park',repositorySource:'worker-env',workerRuntime:{available:false,error:String(error?.message||error)}});
    }));
  }
}
if(!customElements.get('cloudflare-bootstrap')) customElements.define('cloudflare-bootstrap', CloudflareBootstrap);

class BelavistaApp extends HTMLElement {
  connectedCallback(){ this.mountShell(); if(!this._bound){this._bound=true;this.bind();} }
  mountShell(){
    // Remove the legacy shared map surface if an older shell left it mounted.
    // Operational maps are owned by their active page and must not sit behind
    // unrelated pages such as repasses, materials, or brokers.
    this.querySelectorAll('.scene > map-scene[data-persistent-map="true"]').forEach(map=>map.remove());
    if(this.querySelector('#app.app'))return;
    this.innerHTML=`<div class="app" id="app" data-layout="atlas-zip"><app-sidebar></app-sidebar><div id="sidebarOverlay" class="sidebar-overlay" data-sidebar-overlay aria-hidden="true"></div><main class="workspace app-main atlas-workspace"><app-topbar></app-topbar><section class="scene"><view-layer></view-layer></section></main><nav class="mobile-bottom atlas-mobile-bottom" aria-label="Navegação mobile"><button data-mobile-view="map"><i data-lucide="map"></i><span>Mapa</span></button><button data-mobile-view="agenda"><i data-lucide="calendar-days"></i><span>Agenda</span></button><button data-mobile-view="records"><i data-lucide="clipboard-pen-line"></i><span>Registros</span></button><button type="button" data-mobile-chat-tab aria-controls="worker-context-chat" aria-expanded="false"><i data-lucide="message-circle"></i><span>Chat</span></button></nav></div>`;
     this.querySelectorAll('[data-atlas-view]').forEach(button=>button.classList.toggle('active',button.dataset.atlasView===appStore.get().view));
    window.lucide?.createIcons();
    queueMicrotask(()=>globalThis.__ensureStageContextChromeV1?.(this.querySelector('view-layer')));
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
      if(s.view==='finance'){
        queueMicrotask(()=>{if(appStore.get().view==='finance')appStore.set({view:'control',lastAction:'Abriu Dashboard'});});
        return;
      }
      this.dataset.view=s.view;
      const role=normalizeOperationalRole(s.currentActor?.role||'owner');
      this.dataset.role=role;
      const shell=this.querySelector('#app.app');
      shell?.classList.toggle('print-mode',!!s.printMode);
      if(shell){shell.dataset.shellView=s.view;shell.dataset.shellRole=role;}
      this.querySelectorAll('[data-atlas-view]').forEach(button=>button.classList.toggle('active',button.dataset.atlasView===s.view));
      this.querySelectorAll('[data-mobile-view]').forEach(button=>{
        const view=button.dataset.mobileView;
        button.hidden=!actorCanOpenView(s.currentActor||{},view);
        button.classList.toggle('active',view===s.view||view==='stages'&&['agenda','actions','activities','progress','foremen','activity-installation'].includes(s.view));
      });
      const mobileChatActive=shell?.dataset.mobileTab==='chat';
      this.querySelector('[data-mobile-chat-tab]')?.classList.toggle('active',mobileChatActive);
      queueMicrotask(()=>{
        const current=appStore.get(),layer=this.querySelector('view-layer');
        if(!layer||layer.dataset.view===current.view||typeof layer.render!=='function')return;
        try{layer.render();}
        catch(error){console.error('[Aliança Park navigation] page render failed',current.view,error);}
      });
      queueMicrotask(()=>globalThis.__ensureStageContextChromeV1?.(this.querySelector('view-layer')));
      if(isLimitedOperationalActor(s.currentActor)&&!actorCanOpenView(s.currentActor,s.view)){
        queueMicrotask(()=>{
          const current=appStore.get();
          if(isLimitedOperationalActor(current.currentActor)&&!actorCanOpenView(current.currentActor,current.view))
            appStore.set({view:'records',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Área indisponível para este perfil'});
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
      const menu=event.target?.closest?.('[data-sidebar-menu-toggle]');
      if(menu){
        event.preventDefault();
        const sidebar=this.querySelector('app-sidebar'),open=!sidebar?.classList.contains('mobile-open');
        sidebar?.setMobileNavigationOpen(open);
        menu.setAttribute('aria-expanded',String(open));
        menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
        return;
      }
      if(event.target?.closest?.('[data-sidebar-overlay]')){
        this.querySelector('app-sidebar')?.setMobileNavigationOpen(false);
        this.querySelector('[data-sidebar-menu-toggle]')?.setAttribute('aria-expanded','false');
        this.querySelector('[data-sidebar-menu-toggle]')?.setAttribute('aria-label','Abrir menu');
        return;
      }
      const mobile=event.target?.closest?.('[data-mobile-view]');
      if(mobile){event.preventDefault();globalThis.belavistaWorkerAssistant?.setCollapsed(true);const shell=this.querySelector('#app.app');if(shell)delete shell.dataset.mobileTab;document.body.classList.remove('mobile-chat-tab-active');this.querySelector('[data-mobile-chat-tab]')?.setAttribute('aria-expanded','false');appStore.set({view:mobile.dataset.mobileView,activityDedicated:false,stageActivityDedicatedV9:false,lastAction:`Abriu ${mobile.textContent.trim()}`});return;}
      const chatTab=event.target?.closest?.('[data-mobile-chat-tab]');
      if(chatTab){
        event.preventDefault();
        const assistant=globalThis.belavistaWorkerAssistant;
        const shell=this.querySelector('#app.app');
        const open=shell?.dataset.mobileTab==='chat';
        if(open){assistant?.setCollapsed(true);if(shell)delete shell.dataset.mobileTab;document.body.classList.remove('mobile-chat-tab-active');chatTab.setAttribute('aria-expanded','false');}
        else if(assistant){assistant.setTab('conversation');assistant.setCollapsed(false);if(shell)shell.dataset.mobileTab='chat';document.body.classList.add('mobile-chat-tab-active');chatTab.setAttribute('aria-expanded','true');}
        return;
      }
      const atlas=event.target?.closest?.('[data-atlas-view]');
      if(atlas){event.preventDefault();appStore.set({view:atlas.dataset.atlasView,activityDedicated:false,stageActivityDedicatedV9:false,lastAction:`Abriu ${atlas.textContent.trim()}`});return;}
      if(!event.target?.closest?.('[data-load-admin-extensions]'))return;
      ensureDeferredExtensions();
    },true);
    window.addEventListener('pagehide',()=>persistUiState(appStore.get()));
    this.addEventListener('click',event=>{const back=event.target?.closest?.('.activity-dedicated-page [data-view="stages"]');if(!back)return;event.preventDefault();event.stopPropagation();appStore.set({view:'stages',activityDedicated:false,selectedActivity:null,lastAction:'Voltou para as etapas'});},true);
    this.addEventListener('click',event=>{const back=event.target?.closest?.('.stage-v9-dedicated-page .stage-v9-back');if(!back)return;event.preventDefault();event.stopImmediatePropagation();appStore.set({view:'stages',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Voltou para a central de etapas'});},true);
  }
}
if(!customElements.get('belavista-app')) customElements.define('belavista-app', BelavistaApp);

// STAGE_TIMELINE_STRUCTURE_BRIDGE_V1: garante os controles mesmo quando uma
// extensão legada reconstrói a timeline depois do render principal.
const enhanceStagePersistentTimelineV1=()=>{
  document.querySelectorAll('[data-stage-persistent-timeline]:not(.dashboard-stage-control)').forEach(timeline=>{
    timeline.querySelectorAll('[data-persistent-stage-key]').forEach(card=>{
      if(!card.querySelector('[data-persistent-stage-edit]')){
        const edit=document.createElement('button');
        edit.type='button';
        edit.className='stage-persistent-timeline-edit';
        edit.dataset.persistentStageEdit=card.dataset.persistentStageKey||'';
        edit.setAttribute('aria-label',`Editar estrutura de ${card.querySelector('b')?.textContent?.trim()||'etapa'}`);
        edit.textContent='✎';
        edit.addEventListener('click',event=>{
          event.preventDefault();
          event.stopImmediatePropagation();
          window.location.href=`/admin/workers/stage?stage=${encodeURIComponent(edit.dataset.persistentStageEdit)}&mode=edit`;
        },true);
        card.append(edit);
      }
    });
    if(!timeline.querySelector('[data-persistent-stage-add]')){
      const addStage=document.createElement('button');
      addStage.type='button';
      addStage.className='stage-persistent-timeline-add-stage';
      addStage.dataset.persistentStageAdd='true';
      addStage.setAttribute('aria-label','Adicionar etapa');
      addStage.innerHTML='<span>＋</span><b>Adicionar etapa</b><small>Nova estrutura e atividades</small>';
      timeline.querySelector('.stage-persistent-timeline-track')?.append(addStage);
    }
  });
};
document.addEventListener('click',event=>{
  const edit=event.target?.closest?.('[data-persistent-stage-edit]');
  if(edit){
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(`/admin/workers/stage?stage=${encodeURIComponent(edit.dataset.persistentStageEdit)}&mode=edit`);
    return;
  }
  const addStage=event.target?.closest?.('[data-persistent-stage-add]');
  if(addStage){
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign('/admin/workers/stage?mode=new&focus=stage');
    return;
  }
},true);
const stageTimelineObserverV1=new MutationObserver(enhanceStagePersistentTimelineV1);
stageTimelineObserverV1.observe(document.body,{childList:true,subtree:true});
setTimeout(enhanceStagePersistentTimelineV1,0);

async function startApp(config){
  const applicationWindow=WindowElement({windowRef:window,props:{id:'belavista-application-window'}});
  return driveApplicationStateProgramV1(
    ApplicationStateProgramV1.program({windowElement:applicationWindow,config}),
    {
      'resolve-window-element':({component})=>component.next().value,
      'await-authentication':async()=>!globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED||Boolean(await (globalThis.BELAVISTA_ADMIN_AUTH_READY||Promise.resolve(false))),
      'sanitize-config':({config:input})=>{
        if(!input?.pat&&!input?.githubPat&&!input?.githubToken)return input;
        const safe={...input};
        delete safe.pat;delete safe.githubPat;delete safe.githubToken;
        return safe;
      },
      'initialize-application-state':({applicationWindow:root,config:safeConfig})=>{
        const rootWindow=root.element,rootDocument=root.document;
        let boot=rootDocument.querySelector('#boot');
        if(!boot){boot=rootDocument.createElement('div');boot.id='boot';boot.className='boot-screen';boot.setAttribute('aria-live','polite');boot.innerHTML='<div class="boot-orb"></div><p>Abrindo painel operacional...</p>';rootDocument.body.appendChild(boot);}
        if(qs.get('view')==='finance'){
          qs.set('view','control');
          const url=new URL(rootWindow.location.href);url.searchParams.set('view','control');rootWindow.history.replaceState(rootWindow.history.state,'',url);
        }
        if(!qs.has('view'))qs.set('view',readUsagePreferences().defaultPage);
        const app=rootDocument.querySelector('belavista-app');
        if(!app)throw new Error('Elemento da aplicação <belavista-app> não encontrado.');
        const savedUi=restoreUiState(),authActor=globalThis.BELAVISTA_ADMIN_ACTOR,rawRequestedView=qs.get('view');
        const {aliasedView,requestedView}=resolveApplicationRouteV1(rawRequestedView);
        const actor=resolveStartupActorV1({authenticatedActor:authActor,restoredActor:savedUi.currentActor,fallbackActor:appStore.get().currentActor});
        const role=normalizeOperationalRole(actor.role||'owner');
        const safeView=!actorCanOpenView(actor,requestedView)?(isLimitedOperationalActor(actor)?'records':'map'):requestedView;
        const initialView=safeView==='activity-installation'?'stages':safeView;
        const linkedActivity=initialView==='activities'&&/^[a-z0-9_-]+:(front|execute|measure|release)$/i.test(qs.get('activity')||'')?qs.get('activity'):null;
        if(aliasedView!==rawRequestedView&&aliasedView){qs.set('view',aliasedView);const url=new URL(rootWindow.location.href);url.searchParams.set('view',aliasedView);rootWindow.history.replaceState(rootWindow.history.state,'',url);}
        if(requestedView!==safeView){qs.set('view',safeView);const url=new URL(rootWindow.location.href);url.searchParams.set('view',safeView);rootWindow.history.replaceState(rootWindow.history.state,'',url);}
        app.dataset.preloading='true';app.dataset.role=role;
        globalThis.installStageHomeRaidAiRecordsCalendarV1?.();
        const system=APPLICATION_SYSTEM_CONFIGURATION_V1;
        appStore.set({...savedUi,config:safeConfig,currentActor:actor,view:initialView,mapMode:system.initialMapMode,sidebarCollapsed:system.sidebarCollapsed,activityDedicated:system.activityDedicated,stageActivityDedicatedV9:Boolean(linkedActivity),selectedActivity:linkedActivity||null,selectedStageV9:linkedActivity?.split(':')[0]||savedUi.selectedStageV9,proposalFormOpen:system.proposalFormOpen,contractEditing:system.contractEditing,theme:system.initialTheme,lastAction:initialView==='map'?'Abriu o mapa operacional':`Abriu ${initialView}`});
        if(initialView==='stages')system.stageActivityRefreshDelays.forEach(delay=>setTimeout(()=>globalThis.ensureStageHomeRaidAiRecordsCalendarV1?.(),delay));
        rootDocument.documentElement.dataset.theme='dark';
        return {app,boot,rootWindow,rootDocument,requestedView,initialView};
      },
      'mount-application':({state})=>{
        state.app.hidden=false;
        delete state.app.dataset.preloading;
        if(state.boot)state.boot.remove();
        return state;
      },
      'activate-application-services':({applicationWindow:root,state})=>{
        const rootWindow=root.element,rootDocument=root.document;
        // Optional modules stay behind the first committed application state.
        globalThis.loadBelavistaAdminExtensionsV5351=loadDeferredAdminModulesV5351;
        rootDocument.documentElement.dataset.adminDeferredState='idle-until-action';
        setTimeout(()=>globalThis.loadBelavistaAdminExtensionsV5351?.(),APPLICATION_SYSTEM_CONFIGURATION_V1.deferredModuleActivationDelay);
        setTimeout(()=>waitForMapWarmup().catch(()=>{}),APPLICATION_SYSTEM_CONFIGURATION_V1.mapWarmupDelay);
        if(rootWindow.matchMedia?.('(max-width: 760px)').matches&&qs.get('mobile')==='records')appStore.set({view:'records',lastAction:'Modo mobile de registros ativado'});
        if(!globalThis.BELAVISTA_DISABLE_SERVICE_WORKER&&'serviceWorker' in rootWindow.navigator&&rootWindow.location.protocol!=='file:')
          rootWindow.navigator.serviceWorker.register('./sw.js?v=pdf-original-perimeter-v3',{updateViaCache:'none'}).catch(console.warn);
        void refreshLocalSqlStateV1(state.requestedView);
        return {status:'activated',view:appStore.get().view};
      }
    }
  );
}

window.addEventListener('beforeinstallprompt',e=>{
  // Sem painel proprio: o navegador pode oferecer a instalacao PWA nativamente.
  appStore.set({installPrompt:e});
});
window.addEventListener('appinstalled',()=>appStore.set({installPrompt:null}));
