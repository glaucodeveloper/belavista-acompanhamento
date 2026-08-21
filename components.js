import {appStore, demoData, viewThemes, spreadsheetSchema, activityCatalog, reportCatalog} from './state.js?v=4';
import './public-lead-form.mjs?v=1';

const ico = (name, cls='') => `<i data-lucide="${name}" class="${cls}"></i>`;
const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const notify = (message, tone='info') => { let host=document.querySelector('.app-main'); if(!host)return; let toast=host.querySelector('.action-toast'); if(!toast){toast=document.createElement('div');toast.className='action-toast';host.appendChild(toast);} toast.dataset.tone=tone; toast.textContent=message; toast.classList.add('show'); clearTimeout(toast._timer); toast._timer=setTimeout(()=>toast.classList.remove('show'),2800); };
const validGeoPoint = point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
let mapPreviewSource='';
const DEFAULT_SCENE_ZOOM=1.12, INITIAL_SCENE_ZOOM=1.32, MAX_SCENE_ZOOM=3.2, DEFAULT_TILT_BOOST=34, SCENE_SURFACE_SCALE=1.55, MODEL_FIT_RATIO=1.32, MODEL_VERTICAL_EXAGGERATION=8, SCENE_MAP_Z=0, SCENE_MODEL_BASE_Z=0;
const chatLayouts={
  assistant:{left:28,top:92},
  map:{left:18,top:76},
  stages:{left:18,top:18},
  records:{left:18,top:104},
  inventory:{left:18,top:132},
  leads:{left:18,top:160},
  reports:{left:18,top:18},
  settings:{left:18,top:104}
};
const mapTileSources={
  satellite:[
    {id:'satellite',url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`},
    {id:'osm',url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`},
    {id:'osm-de',url:(z,x,y)=>`https://tile.openstreetmap.de/${z}/${x}/${y}.png`}
  ],
  osm:[
    {id:'osm',url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`},
    {id:'osm-de',url:(z,x,y)=>`https://tile.openstreetmap.de/${z}/${x}/${y}.png`}
  ]
};
const publishMapPreview = source => { if(!source)return; mapPreviewSource=source; document.querySelectorAll('map-scene[compact]').forEach(scene=>scene.setPreview?.(source)); };
const stageOverlayKey = value => { const text=String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); if(text.includes('terra'))return 'terraplanagem'; if(text.includes('dren'))return 'drenagem'; if(text.includes('agua'))return 'rede-agua'; if(text.includes('eletric'))return 'rede-eletrica'; if(text.includes('paviment'))return 'pavimentacao'; if(text.includes('praca')||text.includes('urban')||text.includes('arbor'))return 'urbanizacao'; return 'drenagem'; };
const stageOverlayLabels={terraplanagem:'Terraplanagem',drenagem:'Drenagem', 'rede-agua':'Rede de água','rede-eletrica':'Rede elétrica',pavimentacao:'Pavimentação',urbanizacao:'Praças / urbanização'};
const stageOverlayColors={terraplanagem:0xf1b832,drenagem:0x3f9cff,'rede-agua':0x32c5d9,'rede-eletrica':0x9b7cff,pavimentacao:0xff7c45,urbanizacao:0x42be65};

export class GlassCard extends HTMLElement {
  connectedCallback(){ if(!this.classList.contains('glass-card')) this.classList.add('glass-card'); }
}
customElements.define('glass-card', GlassCard);

export class StatPill extends HTMLElement {
  connectedCallback(){ this.render(); }
  static get observedAttributes(){ return ['label','value','tone','icon','sub']; }
  attributeChangedCallback(){ this.render(); }
  render(){
    const label=this.getAttribute('label')||''; const value=this.getAttribute('value')||''; const tone=this.getAttribute('tone')||'teal'; const icon=this.getAttribute('icon')||'activity'; const sub=this.getAttribute('sub')||'';
    this.innerHTML=`<div class="stat-pill tone-${tone}"><span class="stat-icon">${ico(icon)}</span><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${sub?`<em>${esc(sub)}</em>`:''}</span></div>`;
    window.lucide?.createIcons();
  }
}
customElements.define('stat-pill', StatPill);

export class AppSidebar extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(()=>{if(!this._dedicated)this.render();}); }
  render(){
    const view=appStore.get().view;
    const items=[['assistant','map','Dashboard inicial'],['stages','workflow','Etapas e Cronograma'],['records','clipboard-pen-line','Registros'],['inventory','chart-no-axes-combined','Balanço'],['leads','users','Leads'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Configurações']];
    this.innerHTML=`<aside class="sidebar"><div class="brand"><div class="brand-mark">◢</div><div><strong>Belavista</strong><span>LOTEAMENTO</span></div></div><button class="sidebar-toggle" id="sidebarToggle" aria-label="Recolher menu">${ico('panel-left-close')}<span>Recolher menu</span></button><nav>${items.map(([id,icon,label])=>`<button class="nav-item ${view===id?'active':''}" data-view="${id}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav><div class="sidebar-foot"><button class="profile profile-trigger" id="adminTrigger"><span class="avatar">W</span><div><strong>Warley</strong><small>Administrador</small></div>${ico('chevron-up')}</button><div class="admin-menu ${appStore.get().adminMenu?'open':''}"><button>Preferências</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div><div class="integration"><span></span>Integração ativa</div></div></aside>`;
    this.querySelector('#sidebarToggle')?.addEventListener('click',()=>appStore.set({sidebarCollapsed:!appStore.get().sidebarCollapsed}));
    this.querySelector('#adminTrigger')?.addEventListener('click',()=>appStore.set({adminMenu:!appStore.get().adminMenu,lastAction:'Abriu menu do administrador'}));
    this.querySelectorAll('.admin-menu button').forEach(button=>button.addEventListener('click',()=>{notify(`${button.textContent.trim()} selecionado.`);appStore.set({adminMenu:false,lastAction:button.textContent.trim()});}));
    this.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>appStore.set({view:btn.dataset.view, lastAction:`Abriu ${btn.textContent.trim()}`})));
    window.lucide?.createIcons();
  }
}
customElements.define('app-sidebar', AppSidebar);

export class AppTopbar extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(s=>this.updateThemeButton(s.theme)); }
  updateThemeButton(theme){ const b=this.querySelector('#themeBtn'); if(!b)return; b.setAttribute('aria-label',theme==='dark'?'Ativar modo claro':'Ativar modo escuro'); b.innerHTML=ico(theme==='dark'?'sun':'moon'); window.lucide?.createIcons(); }
  render(){
    const s=appStore.get(); this.innerHTML=`<header class="topbar"><div class="session-header"><span class="session-mark">◢</span><div><strong>Aliança Park</strong><small>SESSÃO ${s.sessionId} · WORKBENCH OPERACIONAL</small></div></div><button class="project-switch">Controle de obra ${ico('chevron-down')}</button><div class="top-meta"><div>${ico('sun')}<span><b>26°C</b><small>Ensolarado</small></span></div><div class="complete-ring"><span>63%</span></div><div><span><b>Completude geral</b><small>48 meses · ${spreadsheetSchema.sheets.length} fontes</small></span></div></div><div class="top-actions"><div class="session-health"><i></i><span>Sessão ativa<small>Salvamento local</small></span></div><div class="auto-stamp"><small>ÚLTIMO REGISTRO</small><strong>${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</strong></div><button id="syncBtn" class="ghost">${ico('refresh-cw')} Sincronizar</button><button class="icon-btn" aria-label="Notificações">${ico('bell')}<span class="badge">3</span></button><div class="top-admin-wrap"><div class="profile top-profile" id="topAdminTrigger" tabindex="0" role="button"><span class="avatar">W</span><div><strong>Warley</strong><small>Administrador</small></div>${ico('chevron-down')}</div><div class="top-admin-menu"><button>Perfil e permissões</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div></div></div></header>`;
    this.querySelector('#syncBtn')?.addEventListener('click', e=>{ e.currentTarget.classList.add('spinning'); setTimeout(()=>e.currentTarget.classList.remove('spinning'),650); });
    this.querySelector('#syncBtn')?.addEventListener('click',()=>{appStore.set({lastAction:'Sincronizou dados'});notify('Dados sincronizados localmente.','success');});
    this.querySelector('.project-switch')?.addEventListener('click',()=>notify('Seletor de empreendimento: Aliança Park ativo.'));
    this.querySelector('[aria-label="Notificações"]')?.addEventListener('click',()=>notify('3 notificações operacionais pendentes.','warning'));
    this.querySelector('.top-profile')?.addEventListener('click',()=>{this.querySelector('.top-admin-menu')?.classList.toggle('open');appStore.set({adminMenu:!appStore.get().adminMenu,lastAction:'Alternou menu do administrador'});});
    this.querySelectorAll('.top-admin-menu button').forEach(button=>button.addEventListener('click',()=>{notify(`${button.textContent.trim()} selecionado.`);this.querySelector('.top-admin-menu')?.classList.remove('open');appStore.set({adminMenu:false,lastAction:button.textContent.trim()});}));
    window.lucide?.createIcons();
  }
}
customElements.define('app-topbar', AppTopbar);

export class AiChat extends HTMLElement {
  connectedCallback(){ this._chatView=null; this._transitionTimer=null; this.render(); appStore.subscribe(()=>this.positionForView()); this.enableDrag(); }
  positionForView(){
    const {view,chatManual}=appStore.get();
    if(chatManual) return;
    const layoutName=chatLayouts[view]?view:'assistant';
    const layout=chatLayouts[layoutName];
    const changed=this._chatView!==null&&this._chatView!==view;
    this._chatView=view;
    this.style.removeProperty('left'); this.style.removeProperty('right'); this.style.removeProperty('top'); this.style.removeProperty('bottom'); this.style.removeProperty('transform');
    this.classList.remove('dock-right','dock-bottom');
    this.classList.add('dock-left');
    const applyLayout=()=>{this.style.setProperty('--chat-left',`${layout.left}px`);this.style.setProperty('--chat-top',`${layout.top}px`);this.dataset.chatLayout=layoutName;};
    if(!changed){
      applyLayout();
      return;
    }
    this.classList.add('is-transiting');
    clearTimeout(this._transitionTimer);
    requestAnimationFrame(applyLayout);
    this._transitionTimer=setTimeout(()=>this.classList.remove('is-transiting'),560);
  }
  render(){
    this.className='ai-chat floating-panel dock-left';
    const m=demoData.metrics;
    this.innerHTML=`<div class="chat-head drag-handle" title="Arraste para mover"><span class="ai-logo">✦</span><div><strong>IA · Belavista</strong><small>Resumo operacional atualizado · <span class="chat-drag-hint">ARRASTE PARA MOVER</span></small></div><button class="icon-btn compact close-chat">${ico('minus')}</button></div><div class="chat-scroll"><div class="chat-greeting"><strong>Bom dia, Warley. 👋</strong><span>Este é o resumo do empreendimento com base nos dados de hoje.</span></div><div class="chat-summary"><div><b>${m.completeness||63}%</b><small>Completude<br>geral</small></div><div><b>${m.delayed}</b><small>Etapas<br>atrasadas</small></div><div><b>${m.criticalPurchases}</b><small>Compras<br>críticas</small></div><div><b>${m.review}</b><small>Pendências<br>de revisão</small></div></div><h3 class="chat-question">O que você deseja acompanhar agora?</h3><div class="chat-quick-actions"><button data-view="stages">${ico('calendar-check')} Ver etapas críticas</button><button data-view="inventory">${ico('package-check')} Ver compras necessárias</button><button data-view="stages">${ico('calendar-range')} Ver cronograma de atividades</button><button data-view="leads">${ico('user-round-search')} Ver leads hoje</button><button data-view="records">${ico('clipboard-pen-line')} Registrar andamento</button><button data-view="map">${ico('layers-3')} Abrir mapa de completude</button></div><div class="chat-log" aria-live="polite"></div></div><form class="chat-form"><input aria-label="Mensagem para IA" placeholder="Pergunte algo ou dê um comando…"/><button aria-label="Enviar">${ico('send')}</button></form>`;
    this.querySelector('.close-chat').addEventListener('click',()=>this.classList.toggle('collapsed'));
    this.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>this.respond(b.dataset.cmd)));
    this.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:b.dataset.view,lastAction:`Abriu ${b.textContent.trim()}`})));
    this.querySelector('form').addEventListener('submit',e=>{e.preventDefault(); const input=e.currentTarget.querySelector('input'); if(!input.value.trim())return; this.respond(input.value.trim()); input.value='';});
    this.positionForView(); window.lucide?.createIcons();
  }
  async respond(text){
    const log=this.querySelector('.chat-log');
    appStore.set({lastAction:`Consulta IA: ${text.slice(0,48)}`});
    log.insertAdjacentHTML('beforeend',`<div class="user-mini">${esc(text)}</div><div class="ai-mini">Analisando…</div>`); log.scrollTop=log.scrollHeight;
    const answer=log.lastElementChild;
    try {
      const res=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,view:appStore.get().view})});
      if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error||`HTTP ${res.status}`);
      answer.textContent=(await res.json()).text;
    } catch(err) {
      answer.textContent=/compra|material/i.test(text) ? 'Encontrei 3 itens críticos. Posso abrir o card de compras e destacar as frentes impactadas no mapa.' : /lead/i.test(text) ? 'Há concentração de procura por lotes planos com frente Leste. Posso agrupar os leads por intenção.' : /atras|risco/i.test(text) ? 'Drenagem e rede elétrica concentram os maiores riscos nesta semana por dependência e abastecimento.' : 'Modo demonstração: configure GEMINI_API_KEY no servidor para respostas reais.';
      console.warn('Gemini indisponível:',err);
    }
    log.scrollTop=log.scrollHeight;
  }
  enableDrag(){
    const handle=this.querySelector('.drag-handle'); if(!handle)return;
    let drag=null;
    const move=(e)=>{
      if(!drag||e.pointerId!==drag.pointerId)return;
      const parent=this.parentElement.getBoundingClientRect();
      const x=Math.max(8,Math.min(parent.width-this.offsetWidth-8,e.clientX-parent.left-drag.x));
      const y=Math.max(80,Math.min(parent.height-this.offsetHeight-8,e.clientY-parent.top-drag.y));
      this.style.left=x+'px'; this.style.top=y+'px'; this.style.right='auto'; this.style.bottom='auto';
    };
    const stop=(e)=>{
      if(drag&&(!e||e.pointerId===drag.pointerId)){
        handle.releasePointerCapture?.(drag.pointerId);
        drag=null; this.classList.remove('is-dragging');
        window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',stop); window.removeEventListener('pointercancel',stop);
      }
    };
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button'))return;
      e.preventDefault();
      const r=this.getBoundingClientRect(); drag={pointerId:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};
      handle.setPointerCapture?.(e.pointerId); this.classList.add('is-dragging'); appStore.set({chatManual:true});
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',stop); window.addEventListener('pointercancel',stop);
    });
  }
}
customElements.define('ai-chat', AiChat);

export class MapScene extends HTMLElement {
  connectedCallback(){
    this.mapTileMode=appStore.get().mapTileMode||'satellite'; this.dataset.mapTileMode=this.mapTileMode; this.sceneManualRotation=0; this.sceneManualZoom=INITIAL_SCENE_ZOOM; this.sceneManualPan={x:0,y:0}; this.sceneUserInteracted=false; this.sceneTiltAdjust=0; this.initialSceneFocusApplied=false; this.stageOverlayKey=stageOverlayKey(demoData.activities.find(x=>x.id===appStore.get().selectedStage)?.name); this.dataset.sceneRotation='0deg'; this.dataset.sceneZoom='132%'; this.dataset.sceneZoomMax=`${Math.round(MAX_SCENE_ZOOM*100)}%`; this.dataset.scenePan='0,0'; this.dataset.sceneAnchor='center'; this.style.setProperty('--scene-anchor-x','50%'); this.style.setProperty('--scene-anchor-y','50%');
    if(this.hasAttribute('compact')){ this.renderCompact(); return; }
    this.innerHTML=`<div class="map-fallback"></div><div class="map-host" aria-hidden="true"></div><div class="scene-world"><div class="osm-raster" aria-hidden="true"></div><canvas class="three-overlay"></canvas></div><div class="map-tint"></div><div class="map-badge">${ico('layers-3')} <span>Satélite realista · visão temática</span></div><div class="map-category-switcher" role="group" aria-label="Categorias de visualização do mapa">${Object.entries(stageOverlayLabels).map(([key,label])=>`<button type="button" data-scene-overlay="${key}" class="overlay-${key}">${label}</button>`).join('')}</div><div class="map-gesture-legend" aria-label="Gestos de navegação do mapa"><span>Arraste para mover</span><b>Botão direito</b><span>pan</span><b>Shift + arraste</b><span>inclinar</span><b>Roda do mouse</b><span>zoom</span></div>`;
    this.setMapTileMode(this.mapTileMode,false);
    this.querySelectorAll('[data-scene-rotate]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const value=button.dataset.sceneRotate;this.setSceneRotation(value==='reset'?0:this.sceneManualRotation+Number(value),true); }));
    this.querySelectorAll('[data-scene-pan]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const value=button.dataset.scenePan;if(value==='reset')this.setScenePan(0,0,true);else this.nudgeScenePan(value,true);}));
    this.querySelectorAll('[data-scene-zoom]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.setSceneZoom(this.sceneManualZoom+Number(button.dataset.sceneZoom),true);}));
    this.querySelectorAll('[data-scene-tilt]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.setSceneTiltAdjust(this.sceneTiltAdjust+Number(button.dataset.sceneTilt),true);}));
    this.querySelectorAll('[data-scene-overlay]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.setStageOverlay(button.dataset.sceneOverlay,true);}));
    this.querySelectorAll('[data-map-tiles]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.setMapTileMode(button.dataset.mapTiles,true);}));
    this.querySelector('[data-scene-fit]')?.addEventListener('click',event=>{event.stopPropagation();this.fitSceneView(true);});
    this._lastOverlayStageId=appStore.get().selectedStage; this.initWhenReady(); appStore.subscribe(s=>{this.setTheme(s.view);this.dataset.mode=s.mapMode;this.setMapTileMode(s.mapTileMode||'satellite',false);const stage=demoData.activities.find(x=>x.id===s.selectedStage);if(stage&&this._lastOverlayStageId!==s.selectedStage){this._lastOverlayStageId=s.selectedStage;this.setStageOverlay(stage.name,false);}});
    this.addEventListener('click',e=>{if(e.target.closest('.leaflet-control,.map-badge,.map-category-switcher,.map-gesture-legend,.map-rotation-controls')||performance.now()<this._suppressMapToggleUntil)return;appStore.set({mapMode:appStore.get().mapMode==='overview'?'focus':'overview',lastAction:'Alternou foco do mapa'});});
  }
  renderCompact(){
    const stage=esc(this.getAttribute('data-stage')||'Etapa'),index=Number(this.getAttribute('data-map-index')||0);
    this.dataset.mapInit='compact'; this.dataset.mapStage=stage; this.dataset.mapIndex=String(index);
    const overlay=stageOverlayKey(stage); this.dataset.overlayKey=overlay; this.innerHTML=`<div class="mini-map-surface" aria-label="Mapa da etapa ${stage}"><span class="mini-map-road road-a"></span><span class="mini-map-road road-b"></span><span class="mini-map-road road-c"></span><span class="mini-map-lot lot-a"></span><span class="mini-map-lot lot-b"></span><span class="mini-map-lot lot-c"></span><span class="mini-map-lot lot-d"></span><span class="mini-map-overlay overlay-${overlay}" aria-hidden="true"></span><span class="mini-map-marker"></span><span class="mini-map-caption"><small>MAPA DA ETAPA · ${stageOverlayLabels[overlay]}</small><b>${stage}</b></span></div>`;
    if(mapPreviewSource)this.setPreview(mapPreviewSource);
  }
  setPreview(source){
    const surface=this.querySelector('.mini-map-surface'); if(!surface||!source)return;
    surface.style.backgroundImage=`linear-gradient(180deg,rgba(5,14,27,.08),rgba(5,14,27,.38)),url("${source}")`; surface.style.backgroundSize=this.classList.contains('stage-map-thumb')?'160% auto':'115% auto'; surface.style.backgroundPosition='center center'; this.dataset.mapPreview='ready';
  }
  initWhenReady(){
    this.dataset.mapInit='waiting'; const start=Date.now(); const tick=()=>{ this.dataset.mapInit=window.L?'leaflet-found':'waiting'; if(window.L){ try{this.initLeaflet();}catch(err){this.dataset.mapInit='leaflet-error';console.warn('Leaflet indisponível, mantendo superfície de mapa.',err);} this.scheduleThree(); return; } if(Date.now()-start<7000) setTimeout(tick,100); else {this.dataset.mapInit='timeout';this.classList.add('fallback-only');} }; tick();
  }
  scheduleThree(){
    if(this._threeScheduled||this.renderer)return; this._threeScheduled=true;
    const run=()=>this.initThree();
    if('requestIdleCallback' in window) window.requestIdleCallback(run,{timeout:3500}); else setTimeout(run,1200);
  }
  setMapTileMode(mode='satellite',announce=false){
    const next=mode==='osm'?'osm':'satellite';
    const changed=this.mapTileMode!==next;
    this.mapTileMode=next; this.dataset.mapTileMode=next;
    this.querySelectorAll('[data-map-tiles]').forEach(button=>button.classList.toggle('active',button.dataset.mapTiles===next));
    if(!changed)return;
    if(this._mapSurfaceKey)this._mapSurfaceKey='';
    if(this._osmRasterKey)this._osmRasterKey='';
    if(this.modelReady)this.syncThree();
    if(announce){const label=next==='satellite'?'Satélite realista':'Mapa OSM';notify(`${label} ativado na cena compartilhada.`,'success');appStore.set({mapTileMode:next,lastAction:`Alterou base cartográfica para ${label}`});}
  }
  buildStageOverlayTargets(){
    if(!this.THREE||!this.modelGroup)return;
    const all=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])]; if(!all.length)return;
    const centers=all.map(node=>{const box=new this.THREE.Box3().setFromObject(node),center=box.getCenter(new this.THREE.Vector3());return {node,x:center.x,y:center.y};});
    const minX=Math.min(...centers.map(item=>item.x)),maxX=Math.max(...centers.map(item=>item.x)),minY=Math.min(...centers.map(item=>item.y)),maxY=Math.max(...centers.map(item=>item.y));
    const nx=item=>(item.x-minX)/Math.max(1,maxX-minX),ny=item=>(item.y-minY)/Math.max(1,maxY-minY);
    const zones={terraplanagem:item=>ny(item)>.64,drenagem:item=>nx(item)<.58&&ny(item)>.24&&ny(item)<.82,'rede-agua':item=>nx(item)>=.34&&nx(item)<.72&&ny(item)>.18&&ny(item)<.75,'rede-eletrica':item=>nx(item)>=.62&&ny(item)>.28,pavimentacao:item=>ny(item)<.36||(nx(item)>.48&&ny(item)<.54),urbanizacao:item=>nx(item)<.34&&ny(item)<.42};
    this.stageOverlayTargets={}; Object.entries(zones).forEach(([key,predicate],index)=>{let selected=centers.filter(predicate).map(item=>item.node);if(selected.length<4){const start=Math.floor((index/all.length)*all.length);selected=all.slice(start,start+Math.max(8,Math.floor(all.length*.12)));}this.stageOverlayTargets[key]=selected;});
    this.dataset.overlayManifest='ready'; this.dataset.overlayTargetTotal=String(all.length);
  }
  setStageOverlay(stage,announce=false){
    const key=stageOverlayLabels[stage]?stage:stageOverlayKey(stage);
    if(announce&&this.dataset.highlightActive==='true'&&this.stageOverlayKey===key){this.clearStageOverlay(true);return;}
    this.stageOverlayKey=key; this.dataset.overlayKey=key; this.dataset.overlayLabel=stageOverlayLabels[key]||key; this.dataset.highlightActive='true';
    this.querySelectorAll('[data-scene-overlay]').forEach(button=>button.classList.toggle('active',button.dataset.sceneOverlay===key));
    if(!this.modelReady||!this.stageOverlayTargets){if(announce){notify(`Highlight de ${this.dataset.overlayLabel} ativado.`,'success');appStore.set({mapFilter:key,lastAction:`Ativou highlight de ${this.dataset.overlayLabel}`});}return;}
    const all=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])]; all.forEach(item=>{if(item.userData.overlayMaterial)item.material=item.userData.defaultMaterial;});
    const color=stageOverlayColors[key]||0x2fe6ae,paint=mat=>{if(!mat)return mat;const clone=mat.clone();if(clone.color)clone.color.setHex(color);if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.6;}clone.transparent=true;clone.opacity=Math.max(.72,Math.min(.92,clone.opacity??1));clone.depthWrite=false;return clone;};
    const targets=this.stageOverlayTargets[key]||[]; targets.forEach(item=>{item.userData.overlayMaterial=Array.isArray(item.userData.defaultMaterial)?item.userData.defaultMaterial.map(paint):paint(item.userData.defaultMaterial);item.material=item.userData.overlayMaterial;});
    this.dataset.overlayTargets=String(targets.length); this.dataset.overlayColor=`#${color.toString(16).padStart(6,'0')}`; const span=this.querySelector('.map-badge span');if(span&&!this.dataset.selectedPart)span.textContent=`Highlight · ${this.dataset.overlayLabel}`; this.renderer?.render(this.scene,this.camera);
    if(announce){notify(`Highlight de ${this.dataset.overlayLabel} aplicado no mapa.`,'success');appStore.set({mapFilter:key,lastAction:`Aplicou highlight de ${this.dataset.overlayLabel}`});}
  }
  clearStageOverlay(announce=false){
    const all=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[]),...(this.modelParts?.other||[])];
    all.forEach(item=>{if(item.userData.overlayMaterial||item.userData.highlightMaterial)item.material=item.userData.defaultMaterial;delete item.userData.overlayMaterial;delete item.userData.highlightMaterial;});
    if(this.selectionHalo)this.selectionHalo.visible=false;
    this.stageOverlayKey=null; this.dataset.highlightActive='false'; this.dataset.overlayLabel='Nenhum highlight'; delete this.dataset.overlayKey; delete this.dataset.overlayTargets; delete this.dataset.overlayColor; delete this.dataset.selectedPart; delete this.dataset.selectedKind;
    this.querySelectorAll('[data-scene-overlay]').forEach(button=>button.classList.remove('active'));
    const span=this.querySelector('.map-badge span'); if(span)span.textContent='Satélite realista · visão temática';
    this.renderer?.render(this.scene,this.camera);
    if(announce){notify('Highlight desativado no mapa.');appStore.set({mapFilter:null,lastAction:'Desativou highlight do mapa'});}
  }
  initLeaflet(){
    const host=this.querySelector('.map-host'); if(!host||this.map)return;
    const initial=viewThemes.assistant; const center=L.latLng(Number(initial.center[0]),Number(initial.center[1]));
    if(!validGeoPoint(center))return;
    this.map=L.map(host,{zoomControl:false, attributionControl:true, preferCanvas:true, zoomAnimation:false, fadeAnimation:false, minZoom:13, maxZoom:20}).setView(center,Number(initial.zoom)); this.dataset.leaflet='ready'; this.dataset.mapNavigation='free scene · no 3D viewbox';
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap'}).addTo(this.map);
    L.control.zoom({position:'bottomright'}).addTo(this.map);
    this.map.on('move zoom resize',()=>this.syncThree());
    this.map.on('click',event=>{const canvasRect=this.querySelector('.three-overlay')?.getBoundingClientRect(),hostRect=host.getBoundingClientRect(),point={x:event.containerPoint.x+hostRect.left-(canvasRect?.left||hostRect.left),y:event.containerPoint.y+hostRect.top-(canvasRect?.top||hostRect.top)};if(this.pickModelAt(point))this._suppressMapToggleUntil=performance.now()+280;});
    const refreshMap=()=>{if(!this.map)return;this.map.invalidateSize({pan:false});this.syncThree();};
    if(window.ResizeObserver){this._mapResizeObserver=new ResizeObserver(()=>requestAnimationFrame(refreshMap));this._mapResizeObserver.observe(host);}
    this.map.whenReady(()=>{this._mapReady=true; const active=viewThemes[appStore.get().view]||viewThemes.assistant; this.map.setView(L.latLng(Number(active.center[0]),Number(active.center[1])),Number(active.zoom),{animate:false}); appStore.set({mapReady:true}); this.setTheme(appStore.get().view); requestAnimationFrame(refreshMap); setTimeout(()=>{const locked=viewThemes[appStore.get().view]||viewThemes.assistant;this.map.invalidateSize({pan:false});this.map.setView(L.latLng(Number(locked.center[0]),Number(locked.center[1])),Number(locked.zoom),{animate:false});refreshMap();},320);});
  }
  async initThree(){
    this.dataset.three='loading';
    try {
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); this.THREE=THREE;
      const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js');
      const canvas=this.querySelector('.three-overlay'); this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',precision:'highp'}); this.renderer.setPixelRatio(Math.min(2,Math.max(1.5,window.devicePixelRatio||1))); this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.08;
      this.dataset.three='ready';
      this.scene=new THREE.Scene(); this.scene.add(new THREE.HemisphereLight(0xcfe4ff,0x1a2735,2.6)); const keyLight=new THREE.DirectionalLight(0xffffff,4.2); keyLight.position.set(-120,-160,220); this.scene.add(keyLight); this.sceneStage=new THREE.Group(); this.sceneStage.scale.setScalar(1); this.scene.add(this.sceneStage); this.camera=new THREE.PerspectiveCamera(34,1,.1,10000); this.dataset.cameraProjection='perspective';
      this.mapSurfaceCanvas=document.createElement('canvas'); this.mapSurfaceTexture=new THREE.CanvasTexture(this.mapSurfaceCanvas); this.mapSurfaceTexture.colorSpace=THREE.SRGBColorSpace;
      this.mapSurface=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.mapSurfaceTexture,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false})); this.mapSurface.renderOrder=1; this.mapSurface.visible=true; this.mapSurface.position.z=SCENE_MAP_Z; this.sceneStage.add(this.mapSurface); this.dataset.mapRasterMode='webgl-raster'; this.dataset.mapContact=`Satélite realista + OpenStreet fallback + GLB na mesma cena Three.js · surface z=${SCENE_MAP_Z} · model base z=${SCENE_MODEL_BASE_Z}`;
      const geo=new THREE.CircleGeometry(8,32); const colors=[0x7d64ff,0x2fe6ae,0xffb020,0x55a8ff,0xff5c58];
      this.markerGroup=new THREE.Group(); this.sceneStage.add(this.markerGroup);
      const coords=[[-16.708,-49.092],[-16.706,-49.089],[-16.711,-49.094],[-16.704,-49.088],[-16.710,-49.091]];
      coords.forEach((c,i)=>{ const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:colors[i],transparent:true,opacity:.92})); mesh.userData.latlng=c; this.markerGroup.add(mesh); });
      this.modelGroup=new THREE.Group(); this.sceneStage.add(this.modelGroup); this.dataset.modelHeight='native GLB scale';
      this.modelParts={lots:[],streets:[],other:[]}; this.stageOverlayTargets={}; this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2();
      this.selectionHalo=new THREE.Mesh(new THREE.RingGeometry(8,13,48),new THREE.MeshBasicMaterial({color:0x2fe6ae,transparent:true,opacity:.88,side:THREE.DoubleSide,depthTest:false}));
      this.selectionHalo.visible=false; this.sceneStage.add(this.selectionHalo); this.applySceneView(appStore.get().view,true); this.loadMasterplan(THREE,GLTFLoader);
      let down=null,lastX=0,lastY=0,dragging=false,panning=false,tilting=false; canvas.addEventListener('contextmenu',event=>event.preventDefault()); canvas.addEventListener('wheel',event=>{event.preventDefault();this.setSceneZoom(this.sceneManualZoom+(event.deltaY<0?.06:-.06),false);},{passive:false}); canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};lastX=event.clientX;lastY=event.clientY;dragging=false;tilting=event.shiftKey&&event.button===0;panning=!tilting&&(event.button===0||event.button===1||event.button===2);canvas.setPointerCapture?.(event.pointerId);}); canvas.addEventListener('pointermove',event=>{if(!down)return;const total=Math.hypot(event.clientX-down.x,event.clientY-down.y);if(!dragging&&total>6)dragging=true;if(dragging){const dx=event.clientX-lastX,dy=event.clientY-lastY;if(tilting)this.setSceneTiltAdjust(this.sceneTiltAdjust+dy*.05,false);else if(panning)this.setScenePan(this.sceneManualPan.x+dx,this.sceneManualPan.y+dy,false);lastX=event.clientX;lastY=event.clientY;this._suppressMapToggleUntil=performance.now()+300;}}); canvas.addEventListener('pointerup',event=>{if(!down){return;}const total=Math.hypot(event.clientX-down.x,event.clientY-down.y);if(event.button!==2&&!dragging&&total<=6){const rect=canvas.getBoundingClientRect(),point={x:((event.clientX-rect.left)/rect.width)*canvas.clientWidth,y:((event.clientY-rect.top)/rect.height)*canvas.clientHeight};if(this.pickModelAt(point))this._suppressMapToggleUntil=performance.now()+280;}else this._suppressMapToggleUntil=performance.now()+320;canvas.releasePointerCapture?.(event.pointerId);down=null;dragging=false;panning=false;tilting=false;}); canvas.addEventListener('pointercancel',()=>{down=null;dragging=false;panning=false;tilting=false;});
      // Keep a DOM tile layer available while the WebGL canvas is being held.
      // This prevents a transient WebGL redraw/context loss from exposing an
      // empty background during a pan or tilt gesture.
      canvas.addEventListener('pointerdown',()=>{this.dataset.mapGesture='holding';});
      const releaseMapGesture=()=>{delete this.dataset.mapGesture;};
      canvas.addEventListener('pointerup',releaseMapGesture);
      canvas.addEventListener('pointercancel',releaseMapGesture);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.dataset.threeContext='lost';this.dataset.mapTexture='fallback';});
      canvas.addEventListener('webglcontextrestored',()=>{delete this.dataset.threeContext;this.dataset.mapTexture='loading';this.syncThree();});
      this.syncThree();
    } catch(err){ this.dataset.three='fallback'; console.warn('Three.js indisponível, mantendo mapa 2D.',err); }
  }
  loadMasterplan(THREE,GLTFLoader){
    const loader=new GLTFLoader();
    const modelUrl='./assets/model/alianca_park_masterplan_preview.glb'; this.dataset.modelSource='loaded-glb'; this.dataset.modelRender='webgl';
    loader.load(modelUrl,gltf=>{
      const model=gltf.scene; const box=new THREE.Box3().setFromObject(model); const size=box.getSize(new THREE.Vector3());
      const largest=Math.max(size.x,size.y,size.z)||1; const factor=145/largest; model.scale.setScalar(factor); model.scale.y*=MODEL_VERTICAL_EXAGGERATION; model.rotation.set(Math.PI/2,0,0); model.updateMatrixWorld(true);
      // The exported scene carries its site plane in the source Y/Z axes. Keep
      // the established quarter-turn so its footprint remains coincident with
      // the OpenStreet raster; the shared scene transform supplies the same
      // tilt, pan and zoom to both layers without letting the model drift.
      const orientedCenter=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()); model.position.sub(orientedCenter); model.updateMatrixWorld(true);
      const orientedBox=new THREE.Box3().setFromObject(model),orientedSize=orientedBox.getSize(new THREE.Vector3()); model.position.z+=SCENE_MODEL_BASE_Z-orientedBox.min.z; model.userData.baseScale=factor; model.userData.verticalExaggeration=MODEL_VERTICAL_EXAGGERATION; model.userData.sourceSize=size; model.userData.alignedToMapPlane=true; this.modelSourceFootprint={x:orientedSize.x,y:orientedSize.y,scale:factor}; this.masterplanModel=model; this.masterplanLargest=largest; this.dataset.modelHeight=`${MODEL_VERTICAL_EXAGGERATION}x vertical · footprint preservado`;
      model.traverse(node=>{
        if(!node.isMesh)return;
        node.frustumCulled=true; node.renderOrder=8;
        const prepare=mat=>{if(!mat)return mat;const clone=mat.clone();clone.opacity=Math.max(.86,Math.min(1,clone.opacity??1));clone.transparent=clone.opacity<.98;clone.side=THREE.DoubleSide;clone.depthWrite=true;return clone;};
        node.material=Array.isArray(node.material)?node.material.map(prepare):prepare(node.material); node.userData.defaultMaterial=node.material;
        const name=String(node.name||'').toLowerCase();
        if(/pavilhao.?telhado|pavilhao.?base/.test(name)){const mark=mat=>{const clone=mat?.clone?.()||mat;if(clone?.color)clone.color.setHex(0xffc857);if(clone?.emissive){clone.emissive.setHex(0xf59e0b);clone.emissiveIntensity=.55;}if(clone)clone.opacity=1;return clone;};node.material=Array.isArray(node.material)?node.material.map(mark):mark(node.material);node.userData.focusStructure=true;node.renderOrder=18;}
        const semanticRole=String(node.userData?.belavistaRole||'').toLowerCase();
        const kind=semanticRole==='lot'||semanticRole==='lots'?'lots':semanticRole==='street'||semanticRole==='streets'||semanticRole==='road'?'streets':/(lote|quadra|gleba)/.test(name)?'lots':/(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(name)?'streets':'other';
        node.userData.partKind=kind; node.userData.partId=kind==='lots'?node.name:'streets';
        node.userData.partLabel=kind==='lots'?`Lote ${node.name.replace(/^.*?lote[_ -]?/i,'').replace(/[_ -]?mesh.*$/i,'')}`:kind==='streets'?'Ruas e meio-fio':node.name||'Elemento do empreendimento';
        this.modelParts[kind].push(node); if(node.material)node.material.transparent=true;
      });
      this.dataset.modelParts=`lotes:${this.modelParts.lots.length}|ruas:${this.modelParts.streets.length}|outros:${this.modelParts.other.length}`;
      const leisureNodes=[],structureNodes=[]; model.traverse(node=>{const name=String(node.name||'').toLowerCase();if(/area.?de.?lazer|court|gym.?pad|pavilhao|play|praca/.test(name))leisureNodes.push(node);if(/pavilhao.?telhado|pavilhao.?base/.test(name))structureNodes.push(node);});
      if(leisureNodes.length){this.modelLeisureNodes=leisureNodes;this.modelLeisureFocusNodes=structureNodes.length?structureNodes:leisureNodes;this.dataset.leisureNodes=String(leisureNodes.length);this.dataset.focusStructureNodes=String(this.modelLeisureFocusNodes.length);this.addFocusStructureOutlines(THREE,this.modelLeisureFocusNodes);}
      this.modelGroup.add(model); this.modelGroup.visible=true; this.modelReady=true; this.sceneUserInteracted=false; this.classList.add('model-ready'); this.buildStageOverlayTargets(); this.setStageOverlay(this.stageOverlayKey,false); this.sceneManualPan={x:0,y:0}; this.style.setProperty('--scene-pan-x','0px'); this.style.setProperty('--scene-pan-y','0px'); this.dataset.scenePan='0,0'; this.dataset.sceneFocus='Centro do loteamento'; this.syncThree(); this.applySceneView(appStore.get().view,true); try{publishMapPreview(this.renderer.domElement.toDataURL('image/jpeg',.78));}catch(err){console.warn('Prévia do masterplan indisponível.',err);publishMapPreview('./assets/reference/dashboard.png');}
    },progress=>{if(progress.total)this.dataset.modelProgress=Math.round(progress.loaded/progress.total*100)},err=>{console.warn('Modelo GLB indisponível, mantendo mapa 2D.',err);});
  }
  addFocusStructureOutlines(THREE,nodes){
    nodes.forEach(node=>{
      if(!node?.geometry||node.userData.belavistaOutline)return;
      const outline=new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,12),new THREE.LineBasicMaterial({color:0xffd166,transparent:true,opacity:.95,depthTest:false}));
      outline.name='Belavista_3D_structure_outline'; outline.raycast=()=>{}; node.add(outline); node.userData.belavistaOutline=true;
    });
  }
  pickModelAt(point){
    if(!this.modelReady||!this.raycaster||!this.camera||!this.modelGroup)return false;
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect(),w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;
    if(!w||!h||!point)return false;
    this.pointer.x=(point.x/w)*2-1; this.pointer.y=-(point.y/h)*2+1; this.camera.updateMatrixWorld(true); this.modelGroup.updateMatrixWorld(true); this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObject(this.modelGroup,true); const hit=hits[0]; if(hit?.object){this.toggleCategoryFromPart(hit.object);return true;}
    let nearest=null,best=Infinity; for(const item of [...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])]){const box=new this.THREE.Box3().setFromObject(item),center=box.getCenter(new this.THREE.Vector3()).project(this.camera),sx=(center.x+1)*w/2,sy=(-center.y+1)*h/2,size=box.getSize(new this.THREE.Vector3()),radius=Math.max(16,Math.min(52,Math.max(size.x,size.y)/2));const distance=Math.hypot(point.x-sx,point.y-sy);if(distance<=radius&&distance<best){best=distance;nearest=item;}}
    if(!nearest)return false; this.toggleCategoryFromPart(nearest); return true;
  }
  refreshMapSurface(theme,w,h){
    if(!this.mapSurfaceCanvas||!this.mapSurfaceTexture)return;
    this.mapSurface.visible=true;
    const zoom=Math.max(12,Math.min(18,Number(theme.zoom)||15)),rasterW=Math.min(1280,Math.max(512,w)),rasterH=Math.min(1280,Math.max(512,h)),cols=Math.ceil(rasterW/256)+2,rows=Math.ceil(rasterH/256)+2,lat=Number(theme.center[0]),lon=Number(theme.center[1]),rad=Math.PI/180,n=2**zoom;
    const xf=(lon+180)/360*n,yf=(1-Math.asinh(Math.tan(lat*rad))/Math.PI)/2*n,x0=Math.floor(xf-cols/2),y0=Math.floor(yf-rows/2),mode=this.mapTileMode||'satellite',key=`${mode}|${zoom}|${x0}|${y0}|${cols}|${rows}`; if(key===this._mapSurfaceKey)return; this._mapSurfaceKey=key;
    const canvas=this.mapSurfaceCanvas; canvas.width=cols*256; canvas.height=rows*256; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); const token=key; let loaded=0,total=0;
    const sources=mapTileSources[mode]||mapTileSources.satellite;
    const drawTile=(row,col,tileX,tileY,attempt=0)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(this._mapSurfaceKey!==token)return;loaded++;ctx.drawImage(image,col*256,row*256,256,256);if(sources[attempt]?.id==='satellite'){this.dataset.mapTileSource='Esri World Imagery';}else if(!this.dataset.mapTileSource)this.dataset.mapTileSource='OpenStreetMap';ctx.fillStyle=mode==='satellite'?'rgba(4,11,22,.04)':'rgba(4,11,22,.14)';ctx.fillRect(col*256,row*256,256,256);this.dataset.mapTextureTiles=`${loaded}/${total}`;this.dataset.mapTexture=loaded===total?'ready':'loading';this.mapSurfaceTexture.needsUpdate=true;this.renderer?.render(this.scene,this.camera);};image.onerror=()=>{if(attempt+1<sources.length)drawTile(row,col,tileX,tileY,attempt+1);else if(this._mapSurfaceKey===token){this.dataset.mapTextureTiles=`${loaded}/${total}`;this.dataset.mapTexture='partial';}};image.src=sources[attempt].url(zoom,tileX,tileY);};
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const tileX=((x0+col)%n+n)%n,tileY=y0+row;if(tileY<0||tileY>=n)continue;total++;drawTile(row,col,tileX,tileY);}
    this.dataset.mapTexture='loading'; this.dataset.mapTextureTiles=`0/${total}`;
    this.mapSurfaceTexture.needsUpdate=true;
  }
  refreshOsmRaster(theme,w,h){
    const host=this.querySelector('.osm-raster'); if(!host)return;
    const zoom=Math.max(12,Math.min(18,Number(theme.zoom)||15)),rasterW=Math.min(1280,Math.max(512,w)),rasterH=Math.min(1280,Math.max(512,h)),cols=Math.ceil(rasterW/256)+2,rows=Math.ceil(rasterH/256)+2,lat=Number(theme.center[0]),lon=Number(theme.center[1]),rad=Math.PI/180,n=2**zoom;
    const xf=(lon+180)/360*n,yf=(1-Math.asinh(Math.tan(lat*rad))/Math.PI)/2*n,x0=Math.floor(xf-cols/2),y0=Math.floor(yf-rows/2),mode=this.mapTileMode||'satellite',key=`${mode}|${zoom}|${x0}|${y0}|${cols}|${rows}`;
    if(key===this._osmRasterKey)return; this._osmRasterKey=key; host.replaceChildren(); host.style.width=`${cols*256}px`; host.style.height=`${rows*256}px`;
    const sources=mapTileSources[mode]||mapTileSources.satellite;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const tileX=((x0+col)%n+n)%n,tileY=y0+row;if(tileY<0||tileY>=n)continue;const image=new Image();image.width=256;image.height=256;image.alt='';image.decoding='async';image.loading='eager';image.style.left=`${col*256}px`;image.style.top=`${row*256}px`;let attempt=0;const load=()=>{image.src=sources[attempt].url(zoom,tileX,tileY);};image.onerror=()=>{if(attempt+1<sources.length){attempt++;load();}};image.onload=()=>{if(sources[attempt]?.id==='satellite')this.dataset.mapTileSource='Esri World Imagery';};load();host.append(image);}
    host.dataset.ready='true'; this.dataset.osmRaster=`${mode} · ${zoom} · ${cols}x${rows}`;
  }
  toggleCategoryFromPart(node){
    let source=node; while(source&&!source.userData?.partKind)source=source.parent;
    if(!source)return false;
    const category=source.userData.partKind==='streets'?'pavimentacao':source.userData.partKind==='lots'?'terraplanagem':'urbanizacao';
    if(this.dataset.highlightActive==='true'&&this.stageOverlayKey===category){this.clearStageOverlay(true);return true;}
    this.setStageOverlay(category,true); this.selectModelPart(source); return true;
  }
  selectModelPart(node){
    let source=node; while(source&&!source.userData?.partKind)source=source.parent; if(!source)return;
    const kind=source.userData.partKind,partId=source.userData.partId;
    this.modelParts?.lots.concat(this.modelParts?.streets||[],this.modelParts?.other||[]).forEach(item=>{if(item.userData.highlightMaterial)item.material=item.userData.defaultMaterial;});
    const matches=kind==='streets'?(this.modelParts.streets||[]):(this.modelParts[kind]||[]).filter(item=>item.userData.partId===partId);
    const color=kind==='lots'?0x2fe6ae:kind==='streets'?0x78a9ff:0xffb020;
    matches.forEach(item=>{const original=item.userData.defaultMaterial,paint=mat=>{const clone=mat.clone();if(clone.color)clone.color.setHex(color);if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.72;}clone.transparent=true;clone.opacity=Math.max(.68,clone.opacity??1);return clone;};item.userData.highlightMaterial=Array.isArray(original)?original.map(paint):paint(original);item.material=item.userData.highlightMaterial;});
    const bounds=new this.THREE.Box3().setFromObject(source),center=bounds.getCenter(new this.THREE.Vector3()),size=bounds.getSize(new this.THREE.Vector3());
    if(this.selectionHalo){this.selectionHalo.position.set(center.x-(this.sceneStage?.position.x||0),center.y-(this.sceneStage?.position.y||0),2);this.selectionHalo.scale.setScalar(Math.max(.7,Math.min(4.5,Math.max(size.x,size.y)/24)));this.selectionHalo.material.color.setHex(color);this.selectionHalo.visible=true;}
    const label=kind==='streets'?'Ruas e meio-fio':source.userData.partLabel; this.dataset.selectedPart=label; this.dataset.selectedKind=kind;
    appStore.set({lastAction:`Selecionou ${label}`}); const span=this.querySelector('.map-badge span'); if(span)span.textContent=`${label} · selecionado`; this.syncThree();
  }
  configurePerspectiveCamera(w,h,targetX=(Number(w)||2)/2,targetY=(Number(h)||2)/2){
    if(!this.camera)return;
    const width=Math.max(2,Number(w)||2),height=Math.max(2,Number(h)||2),distance=Math.max(width,height)*1.55;
    this.camera.aspect=width/height; this.camera.fov=34; this.camera.near=.1; this.camera.far=10000;
    // A shallow elevated position exposes the GLB's vertical structures while
    // keeping its footprint centered on the same origin as the OpenStreet raster.
    this.camera.position.set(targetX,targetY-distance*.32,distance); this.camera.lookAt(targetX,targetY,0); this.camera.updateProjectionMatrix();
    this.dataset.cameraProjection='perspective'; this.dataset.cameraDistance=String(Math.round(distance));
  }
  centerModelProjection(){
    if(!this.THREE||!this.camera||!this.modelGroup||!this.masterplanModel)return;
    const THREE=this.THREE; this.modelGroup.position.set(0,0,0); this.modelGroup.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(this.masterplanModel),z=box.min.z,points=[new THREE.Vector3(box.min.x,box.min.y,z),new THREE.Vector3(box.min.x,box.max.y,z),new THREE.Vector3(box.max.x,box.min.y,z),new THREE.Vector3(box.max.x,box.max.y,z)].map(point=>point.project(this.camera));
    const minX=Math.min(...points.map(point=>point.x)),maxX=Math.max(...points.map(point=>point.x)),minY=Math.min(...points.map(point=>point.y)),maxY=Math.max(...points.map(point=>point.y)),currentX=(minX+maxX)/2,currentY=(minY+maxY)/2;
    const worldCenter=box.getCenter(new THREE.Vector3()); worldCenter.z=z; const p0=worldCenter.clone().project(this.camera),px=worldCenter.clone().add(new THREE.Vector3(1,0,0)).project(this.camera),py=worldCenter.clone().add(new THREE.Vector3(0,1,0)).project(this.camera),a=px.x-p0.x,b=py.x-p0.x,c=px.y-p0.y,d=py.y-p0.y,det=a*d-b*c;
    if(Math.abs(det)<1e-8)return;
    const dx=((-currentX)*d-b*(-currentY))/det,dy=(a*(-currentY)-(-currentX)*c)/det,angle=this.sceneStage?.rotation.z||0,localDx=dx*Math.cos(angle)+dy*Math.sin(angle),localDy=-dx*Math.sin(angle)+dy*Math.cos(angle); this.modelGroup.position.set(localDx,localDy,0); this.modelGroup.updateMatrixWorld(true); this.dataset.modelOffset=`${Math.round(localDx)},${Math.round(localDy)}`; this.dataset.modelProjectedDrift=`${currentX.toFixed(3)},${currentY.toFixed(3)}`; this.dataset.modelProjectedCenter='0.000,0.000';
  }
  syncThree(){
    if(!this.renderer||!this.map||!this.map._loaded)return;
    const host=this.querySelector('.map-host'),w=host?.clientWidth,h=host?.clientHeight;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2)return;
    this.dataset.leafletZoom=String(this.map.getZoom());
    const mapCenter=this.map.getCenter(); this.dataset.leafletCenter=`${mapCenter.lat.toFixed(6)},${mapCenter.lng.toFixed(6)}`;
    this.configurePerspectiveCamera(w,h);
    const theme=viewThemes[appStore.get().view]||viewThemes.assistant;
    this.dataset.themeCenter=`${theme.center[0]},${theme.center[1]}`; this.dataset.themeZoom=String(theme.zoom);
    const panX=this.sceneUserInteracted?(Number(this.sceneManualPan?.x)||0):0,panY=this.sceneUserInteracted?(Number(this.sceneManualPan?.y)||0):0;
    this.sceneManualPan={x:panX,y:panY}; this.style.setProperty('--scene-pan-x',`${panX}px`); this.style.setProperty('--scene-pan-y',`${panY}px`); const baseCenterX=w/2,baseCenterY=h/2,centerX=baseCenterX,centerY=baseCenterY; let surfaceCenterX=centerX,surfaceCenterY=centerY; this.sceneBaseCenter={x:baseCenterX,y:baseCenterY}; this.dataset.scenePan=`${Math.round(panX)},${Math.round(panY)}`;
    const surfaceW=w*SCENE_SURFACE_SCALE,surfaceH=h*SCENE_SURFACE_SCALE;
    if(this.sceneStage)this.sceneStage.position.set(centerX,centerY,0);
    this.mapSurface.position.set(0,0,SCENE_MAP_Z); this.mapSurface.scale.set(surfaceW,surfaceH,1); if(this.modelReady){this.refreshMapSurface(theme,surfaceW,surfaceH);this.refreshOsmRaster(theme,surfaceW,surfaceH);}
    this.dataset.sceneComposition='map raster + GLB siblings · shared center/scale/tilt';
    if(this.modelGroup){
      const anchor=this.map.latLngToContainerPoint(L.latLng(Number(theme.center[0]),Number(theme.center[1])));
      if(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
        if(anchor.x===0&&anchor.y===0){anchor.x=w/2;anchor.y=h/2;}
        // Reset before recomputing the projected footprint correction. The map
        // and the model keep one shared scene transform; only the perspective
        // compensation is applied to the model's local XY position.
        this.modelGroup.position.set(0,0,0);
        if(this.masterplanModel&&this.masterplanLargest){
          const frame=Math.min(w,h)*MODEL_FIT_RATIO,localFrameScale=frame/this.masterplanLargest; this.masterplanModel.scale.set(localFrameScale,localFrameScale*MODEL_VERTICAL_EXAGGERATION,localFrameScale); this.masterplanModel.updateMatrixWorld(true); this.dataset.modelFit=`${Math.round(frame)}px`; this.dataset.modelFitRatio=String(MODEL_FIT_RATIO);
          const lat=Number(theme.center[0]),metersPerPixel=this.masterplanLargest/frame,zoom=Math.round(Math.log2(156543.033928*Math.cos(lat*Math.PI/180)/metersPerPixel)); this.dataset.mapFitZoom=String(Math.max(12,Math.min(18,zoom)));
          const localScale=frame/this.masterplanLargest,sourceScale=this.modelSourceFootprint?.scale||localScale,footprint={x:(this.modelSourceFootprint?.x||this.masterplanLargest)*(localScale/sourceScale),y:(this.modelSourceFootprint?.y||this.masterplanLargest)*(localScale/sourceScale)},mapW=Math.max(1,footprint.x*1.14),mapH=Math.max(1,footprint.y*1.14),mapTheme={...theme,zoom:Number(this.dataset.mapFitZoom)||theme.zoom};
          const mapCoverage=Math.max(1,w*1.08/mapW,h*1.08/mapH),sceneMapW=mapW*mapCoverage,sceneMapH=mapH*mapCoverage; surfaceCenterX=sceneMapW/2; surfaceCenterY=sceneMapH/2;
          const overlay=this.querySelector('.three-overlay'); if(overlay){overlay.style.left='50%';overlay.style.top='50%';overlay.style.right='auto';overlay.style.bottom='auto';overlay.style.width=`${sceneMapW}px`;overlay.style.height=`${sceneMapH}px`;}
          this.renderer.setSize(sceneMapW,sceneMapH,false); this.configurePerspectiveCamera(sceneMapW,sceneMapH,sceneMapW/2,sceneMapH/2); if(this.sceneStage)this.sceneStage.position.set(surfaceCenterX,surfaceCenterY,0);
          this.mapSurface.scale.set(sceneMapW,sceneMapH,1); this.refreshMapSurface(mapTheme,sceneMapW,sceneMapH); this.refreshOsmRaster(mapTheme,sceneMapW,sceneMapH); this.centerModelProjection(); this.dataset.sceneFootprint=`${Math.round(footprint.x)}x${Math.round(footprint.y)}`; this.dataset.sceneMapScale=`${Math.round(sceneMapW)}x${Math.round(sceneMapH)}`; this.dataset.modelScreen=`centered · ${Math.round(footprint.x)}x${Math.round(footprint.y)}`;
          if(!this.initialSceneFocusApplied){this.sceneManualPan={x:0,y:0};this.style.setProperty('--scene-pan-x','0px');this.style.setProperty('--scene-pan-y','0px');this.dataset.scenePan='0,0';this.dataset.sceneFocus='Centro do loteamento';this.dataset.leisureFocus='0,0';this.initialSceneFocusApplied=true;}
        }
        this.modelGroup.updateMatrixWorld(true); this.modelGroup.visible=true;
        if(this.masterplanModel&&!this.dataset.modelOffset)this.dataset.modelOffset='0,0';
      }
    }
    for(const m of this.markerGroup?.children||[]){const p=this.map.latLngToContainerPoint(L.latLng(Number(m.userData.latlng[0]),Number(m.userData.latlng[1])));if(Number.isFinite(p.x)&&Number.isFinite(p.y))m.position.set(p.x-baseCenterX+surfaceCenterX,p.y-baseCenterY+surfaceCenterY,0);}
    this.renderer.render(this.scene,this.camera);
  }
  setTheme(view){
    const theme=viewThemes[view]||viewThemes.assistant; this.dataset.tint=theme.tint;
    if(this.modelGroup){this.modelGroup.rotation.set(0,0,0); this.modelGroup.visible=true;}
    const changingView=Boolean(this._themeView&&this._themeView!==view); this.applySceneView(view,changingView); this._themeView=view;
    const center=L.latLng(Number(theme.center[0]),Number(theme.center[1]));
    if(this.map&&this.map._loaded&&validGeoPoint(center)&&Number.isFinite(Number(theme.zoom))){const zoom=Number(theme.zoom),changing=Boolean(this._lastTheme&&this._lastTheme!==view);if(!this._lastTheme){try{this.map.setView(center,zoom,{animate:false});}catch{}}else if(changing){try{this.map.flyTo(center,zoom,{animate:true,duration:.85,easeLinearity:.25});}catch{try{this.map.setView(center,zoom,{animate:true,duration:.85});}catch{}}}this._lastTheme=view;requestAnimationFrame(()=>this.map.invalidateSize({pan:false}));}
    this.classList.remove('theme-enter'); requestAnimationFrame(()=>this.classList.add('theme-enter'));
    this.style.setProperty('--map-tilt',`${theme.tilt}deg`);
    const label={assistant:'Execução atual',map:'Mapa geral',stages:'Cronograma',purchases:'Compras',inventory:'Materiais',leads:'Leads',collaborators:'Colaboradores',reports:'Indicadores',settings:'Configuração'}[view];
    const span=this.querySelector('.map-badge span'); if(span) span.textContent=this.dataset.selectedPart?`${this.dataset.selectedPart} · selecionado`:label;
  }
  setSceneVisual(tilt,rotation,scale){
    this._sceneVisual={tilt,rotation,scale}; this.style.setProperty('--scene-tilt',`${tilt}deg`); this.style.setProperty('--scene-rotation','0deg'); this.style.setProperty('--scene-zoom',String(scale));
    if(this.sceneStage){this.sceneStage.rotation.set(0,0,(Number(rotation)||0)*Math.PI/180);this.sceneStage.scale.setScalar(1);this.dataset.sceneTransform='Three.js shared scene · map + model';}
    this.renderer?.render(this.scene,this.camera);
  }
  applySceneView(view,animate=true){
    const theme=viewThemes[view]||viewThemes.assistant,targetTilt=Math.max(16,Math.min(42,(Number(theme.tilt)||18)+DEFAULT_TILT_BOOST+this.sceneTiltAdjust)),targetRotation=this.sceneManualRotation||0,targetScale=this.sceneManualZoom||DEFAULT_SCENE_ZOOM; this.dataset.sceneTilt=`${targetTilt}deg`;
    const current=this._sceneVisual||{tilt:targetTilt,rotation:targetRotation,scale:targetScale};
    if(!this.sceneStage){this.setSceneVisual(targetTilt,targetRotation,targetScale);return;}
    const finish=()=>{this.setSceneVisual(targetTilt,targetRotation,targetScale);this.syncThree();};
    if(!animate){finish();return;}
    const started=performance.now(),duration=460,token=Symbol('scene-transition');this._sceneTransition=token;
    const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(current.tilt+(targetTilt-current.tilt)*e,current.rotation+(targetRotation-current.rotation)*e,current.scale+(targetScale-current.scale)*e);if(t<1)requestAnimationFrame(tick);else finish();};
    requestAnimationFrame(tick);
  }
  setSceneRotation(degrees,animate=true){
    const normalized=((Number(degrees)%360)+540)%360-180; this.sceneManualRotation=normalized; this.dataset.sceneRotation=`${Math.round(normalized)}deg`;
    if(!this.sceneStage)return; const start=this._sceneVisual?.rotation||0;
    if(!animate){this._sceneTransition=Symbol('manual-rotation');this.setSceneVisual(this._sceneVisual?.tilt||Number.parseFloat(this.dataset.sceneTilt)||40,normalized,this._sceneVisual?.scale||this.sceneManualZoom);return;}
    const started=performance.now(),duration=420,token=Symbol('manual-rotation');this._sceneTransition=token;const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(this._sceneVisual?.tilt||Number.parseFloat(this.dataset.sceneTilt)||40,start+(normalized-start)*e,this._sceneVisual?.scale||this.sceneManualZoom);if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }
  setScenePan(x,y,animate=true){
    const w=this.querySelector('.three-overlay')?.clientWidth||1280,h=this.querySelector('.three-overlay')?.clientHeight||800;
    const target={x:Number(x)||0,y:Number(y)||0}; this.sceneUserInteracted=true; this.sceneManualPan=target; this.dataset.scenePan=`${Math.round(target.x)},${Math.round(target.y)}`;
    if(!this.sceneStage){return;}
    // O pan é uma transformação da cena inteira. Recalcular o modelo via Leaflet
    // aqui fazia o mapa e o GLB percorrerem coordenadas diferentes durante o drag.
    this.style.setProperty('--scene-pan-x',`${target.x}px`); this.style.setProperty('--scene-pan-y',`${target.y}px`);
    // The stage is already centered against the expanded map/model canvas in
    // syncThree(). Pan belongs to the shared scene transform only; moving the
    // Three.js group back to the viewport center makes the GLB leave its camera
    // after the first drag.
    this.renderer?.render(this.scene,this.camera);
  }
  nudgeScenePan(direction,animate=true){
    const step=Math.max(44,Math.min(96,(this.querySelector('.three-overlay')?.clientWidth||960)*.07)),pan=this.sceneManualPan||{x:0,y:0};
    const delta={up:[0,-step],down:[0,step],left:[-step,0],right:[step,0]}[direction]||[0,0]; this.setScenePan(pan.x+delta[0],pan.y+delta[1],animate);
  }
  setSceneZoom(value,animate=true){
    const target=Math.max(.9,Math.min(MAX_SCENE_ZOOM,Number(value)||DEFAULT_SCENE_ZOOM)); this.sceneManualZoom=target; this.dataset.sceneZoom=`${Math.round(target*100)}%`; this.dataset.sceneZoomMax=`${Math.round(MAX_SCENE_ZOOM*100)}%`;
    if(!this.sceneStage)return; const start=this._sceneVisual?.scale||1,targetScale=target; if(!animate){this._sceneTransition=Symbol('manual-zoom');this.setSceneVisual(this._sceneVisual?.tilt||40,this._sceneVisual?.rotation||0,targetScale);return;}
    const started=performance.now(),duration=320,token=Symbol('manual-zoom');this._sceneTransition=token;const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(this._sceneVisual?.tilt||40,this._sceneVisual?.rotation||0,start+(targetScale-start)*e);if(t<1)requestAnimationFrame(tick);else this.syncThree();};requestAnimationFrame(tick);
  }
  setSceneTiltAdjust(value,animate=true){this.sceneTiltAdjust=Math.max(-8,Math.min(8,Number(value)||0));this.applySceneView(appStore.get().view,animate);}
  fitSceneView(animate=true){this.sceneManualRotation=0;this.sceneManualZoom=DEFAULT_SCENE_ZOOM;this.sceneManualPan={x:0,y:0};this.sceneTiltAdjust=0;this.dataset.sceneRotation='0deg';this.dataset.sceneZoom='112%';this.dataset.scenePan='0,0';this.style.setProperty('--scene-pan-x','0px');this.style.setProperty('--scene-pan-y','0px');this.applySceneView(appStore.get().view,animate);if(animate)setTimeout(()=>this.syncThree(),520);}
}
// A tilt is a visual transform of the already-loaded shared scene. It must not
// ask Leaflet or the tile compositor to rebuild the OpenStreet surface.
MapScene.prototype.setSceneTiltAdjust=function(value,animate=true){
  this.sceneTiltAdjust=Math.max(-8,Math.min(8,Number(value)||0));
  const theme=viewThemes[appStore.get().view]||viewThemes.assistant;
  const targetTilt=Math.max(16,Math.min(42,(Number(theme.tilt)||18)+DEFAULT_TILT_BOOST+this.sceneTiltAdjust));
  this.dataset.sceneTilt=`${targetTilt}deg`;
  const current=this._sceneVisual||{tilt:targetTilt,rotation:this.sceneManualRotation||0,scale:this.sceneManualZoom||DEFAULT_SCENE_ZOOM};
  if(!animate){this._sceneTransition=Symbol('manual-tilt');this.setSceneVisual(targetTilt,current.rotation,current.scale);return;}
  const started=performance.now(),duration=320,token=Symbol('manual-tilt');this._sceneTransition=token;
  const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(current.tilt+(targetTilt-current.tilt)*e,current.rotation,current.scale);if(t<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
};

// Keep the map/model instance alive while the SPA swaps view-layer content.
const mapSceneSetTheme = MapScene.prototype.setTheme;
MapScene.prototype.setTheme=function(view){
  if(this._themeView===view && this._mapSceneThemeGuard===view)return;
  this._mapSceneThemeGuard=view;
  return mapSceneSetTheme.call(this,view);
};

customElements.define('map-scene', MapScene);

const statusClass = s => String(s).toLowerCase().replaceAll(' ','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export class ViewLayer extends HTMLElement {
  bindWorkflowFieldTrees(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;canvas.querySelectorAll('.workflow-card').forEach((card,index)=>{if(card.dataset.treeBound)return;card.dataset.treeBound='true';card.addEventListener('click',()=>{const item=activityCatalog[index%activityCatalog.length],old=canvas.querySelector('.workflow-tree');old?.remove();const tree=document.createElement('aside');tree.className='workflow-tree';tree.innerHTML=`<button class="detail-close">×</button><span class="activity-kind">ÁRVORE DE PREENCHIMENTO · ${item.nature.toUpperCase()}</span><h3>${item.name}</h3><p>Preencha os dados iniciais e avance pelos ramos de execução relacionados.</p><div class="tree-branch"><b>01 · Dados iniciais</b>${item.initial.map((f)=>`<label>${f}<input placeholder="Preencher ${f.toLowerCase()}"></label>`).join('')}</div><div class="tree-branch"><b>02 · Execução e evidências</b>${item.execution.map(f=>`<label>${f}<input placeholder="Registrar ${f.toLowerCase()}"></label>`).join('')}</div><div class="tree-branch"><b>03 · Associações administrativas</b><label>Responsável<select><option>Selecionar envolvido</option><option>Carlos Mendes</option><option>Paula Nascimento</option><option>Mariana Lopes</option></select></label><label>Compra associada<input placeholder="ID do pedido / fornecedor"></label><label>Material associado<input placeholder="Material · quantidade · unidade"></label><label>Comprovante<input type="file"></label></div><button class="tree-save">Salvar preenchimento</button>`;canvas.appendChild(tree);tree.querySelector('.detail-close').onclick=()=>tree.remove();tree.querySelector('.tree-save').onclick=()=>{notify(`${item.name}: preenchimento salvo.`,'success');appStore.set({lastAction:`Preencheu ${item.name}`});tree.remove();};});});}
  bindCatalogButtons(){const canvas=this.querySelector('.dedicated-canvas');canvas?.querySelectorAll('.activity-palette [data-kind]').forEach(button=>{if(button.dataset.bound)return;button.dataset.bound='true';button.addEventListener('click',()=>{const item=activityCatalog.find(x=>x.name===button.dataset.addWork),card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.style.left='24px';card.style.top='420px';card.style.width='150px';card.innerHTML=`<span class="activity-kind">${item.nature.toUpperCase()}</span><strong>${item.name}</strong><small>${item.initial.slice(0,2).join(' · ')}</small><em>Preencher campos →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;canvas.appendChild(card);this.makeSurfaceDrag(card,canvas);this.bindGhostConnections();notify(`${item.name} adicionada com campos iniciais.`,'success');});});}
  addCatalogPalette(){const palette=this.querySelector('.activity-palette');if(!palette||palette.dataset.catalog)return;palette.dataset.catalog='true';const title=document.createElement('b');title.textContent='Catálogo de atividades de obra';palette.appendChild(title);activityCatalog.forEach((item,i)=>{const b=document.createElement('button');b.dataset.addWork=item.name;b.dataset.kind=item.nature;b.textContent=`${item.nature} · ${item.name}`;b.title=`Inicial: ${item.initial.join(' · ')} | Execução: ${item.execution.join(' · ')}`;palette.appendChild(b);});}
  watchSurfaceRelations(){const canvas=this.querySelector('.dedicated-canvas');if(canvas&&!canvas.dataset.relationWatch){canvas.dataset.relationWatch='true';canvas.addEventListener('pointerup',()=>setTimeout(()=>this.drawSurfaceRelations(canvas),0));}}
  drawSurfaceRelations(canvas){
    const svg=canvas.querySelector('.surface-edges');
    if(!svg)return;
    svg.innerHTML='';
    canvas.querySelectorAll('.surface-edge-label').forEach(x=>x.remove());
    const relationLabels=['depende de','libera','bloqueia','precede','alimenta','gera','valida','aguarda','associa'];
    const cardOptions=activityCatalog.map(item=>`Criar card de · ${item.name}`);
    canvas.querySelectorAll('.surface-relation').forEach(relation=>{
      const from=canvas.querySelector(`[data-node-id="${relation.dataset.from}"]`),to=canvas.querySelector(`[data-node-id="${relation.dataset.to}"]`);
      if(!from||!to)return;
      const x1=from.offsetLeft+from.offsetWidth,y1=from.offsetTop+from.offsetHeight/2,x2=to.offsetLeft,y2=to.offsetTop+to.offsetHeight/2,bend=Math.max(50,(x2-x1)/2);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}`);
      path.classList.add('surface-edge');
      svg.appendChild(path);
      const editor=document.createElement('label');
      editor.className='surface-edge-label';
      editor.style.left=`${(x1+x2)/2-76}px`;
      editor.style.top=`${(y1+y2)/2-14}px`;
      const input=document.createElement('input');
      input.type='text'; input.value=relation.dataset.label||'depende de'; input.placeholder='Rotular relação…'; input.setAttribute('list',`relation-options-${Date.now()}-${Math.round(Math.random()*1000)}`);
      const list=document.createElement('datalist'); list.id=input.getAttribute('list');
      [...relationLabels,...cardOptions].forEach(value=>{const option=document.createElement('option');option.value=value;list.appendChild(option);});
      editor.append(input,list); canvas.appendChild(editor);
      const apply=()=>{
        const value=input.value.trim();
        if(!value)return;
        const prefix='Criar card de · ';
        if(value.startsWith(prefix)){
          const item=activityCatalog.find(entry=>`Criar card de · ${entry.name}`===value);
          this.insertConnectedActivityCard(canvas,relation,from,to,item||activityCatalog[0]);
          return;
        }
        relation.dataset.label=value;
        this.drawSurfaceRelations(canvas);
      };
      input.addEventListener('change',apply);
      input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}if(event.key==='Escape'){input.value=relation.dataset.label||'depende de';input.blur();}});
      input.addEventListener('click',event=>event.stopPropagation());
      input.addEventListener('pointerdown',event=>event.stopPropagation());
    });
  }
  insertConnectedActivityCard(canvas,relation,from,to,item){
    if(!from||!to||!item)return;
    const card=document.createElement('button');
    card.type='button'; card.className='dedicated-activity workflow-card';
    card.dataset.nodeId=`workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;
    card.dataset.hours='4'; card.style.width='176px';
    card.style.left=`${Math.max(12,Math.round((from.offsetLeft+from.offsetWidth+to.offsetLeft-176)/2))}px`;
    card.style.top=`${Math.max(76,Math.round((from.offsetTop+to.offsetTop)/2-24))}px`;
    card.innerHTML=`<span class="activity-kind">${esc(item.nature||'ATIVIDADE')}</span><strong>${esc(item.name)}</strong><small>${esc(item.initial?.slice(0,2).join(' · ')||'Dados iniciais a preencher')}</small><em>Card intermediário →</em><span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
    relation.remove(); canvas.appendChild(card);
    const first=document.createElement('span'); first.className='surface-relation'; first.dataset.from=from.dataset.nodeId; first.dataset.to=card.dataset.nodeId; first.dataset.label='gera'; canvas.appendChild(first);
    const second=document.createElement('span'); second.className='surface-relation'; second.dataset.from=card.dataset.nodeId; second.dataset.to=to.dataset.nodeId; second.dataset.label='alimenta'; canvas.appendChild(second);
    this.makeSurfaceDrag(card,canvas); this.bindWorkflowFieldTrees(); this.drawSurfaceRelations(canvas);
    notify(`Card intermediário ${item.name} criado e conectado.`,'success');
  }
  bindGhostConnections(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;canvas.querySelectorAll('.surface-port').forEach(port=>port.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const source=port.closest('.workflow-card'),ghost=document.createElement('div');ghost.className='connection-ghost';ghost.textContent='Nova atividade';canvas.appendChild(ghost);const move=ev=>{const r=canvas.getBoundingClientRect();ghost.style.left=`${ev.clientX-r.left+10}px`;ghost.style.top=`${ev.clientY-r.top+10}px`;};const up=ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.workflow-card');ghost.remove();port.releasePointerCapture?.(e.pointerId);port.removeEventListener('pointermove',move);port.removeEventListener('pointerup',up);if(target&&target!==source){const rel=document.createElement('span');rel.className='surface-relation';rel.dataset.from=source.dataset.nodeId;rel.dataset.to=target.dataset.nodeId;rel.dataset.label='depende de';notify('Relacionamento criado entre atividades.','success');}else{const form=document.createElement('form');form.className='workflow-drop-form';form.innerHTML='<b>Nova atividade</b><input required placeholder="Nome da atividade"><input type="number" min="0.5" step="0.5" placeholder="Horas previstas"><button>Adicionar ao canvas</button>';form.style.left=`${Math.max(12,ev.clientX-canvas.getBoundingClientRect().left)}px`;form.style.top=`${Math.max(72,ev.clientY-canvas.getBoundingClientRect().top)}px`;form.onsubmit=event=>{event.preventDefault();const fd=new FormData(form),card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.style.left=form.style.left;card.style.top=form.style.top;card.style.width='130px';card.innerHTML=`<span class="activity-kind">NOVA ATIVIDADE</span><strong>${esc(fd.get('nome'))}</strong><small>${fd.get('horas')||'1'} hora(s) previstas</small><span class="surface-port">●</span><span class="surface-resize"></span>`;form.replaceWith(card);this.makeSurfaceDrag(card,canvas);this.bindGhostConnections();notify('Card de atividade criado para preenchimento.','success');};canvas.appendChild(form);form.querySelector('input')?.focus();}};port.setPointerCapture?.(e.pointerId);port.addEventListener('pointermove',move);port.addEventListener('pointerup',up);},{once:true}));}
  addFineDurationControls(){this.querySelectorAll('.dedicated-canvas .surface-resize').forEach(handle=>{handle.addEventListener('pointerdown',e=>{const card=handle.closest('.workflow-card'),startW=card.offsetWidth,startX=e.clientX;const move=ev=>{const hours=Math.max(1,Math.round((startW+ev.clientX-startX)/25));card.dataset.hours=String(hours);card.dataset.duration=`${Math.floor(hours/8)}d ${hours%8}h`;};const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);notify(`Duração: ${card.dataset.duration}.`);};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);});});}
  records(){const s=appStore.get(),editing=s.records.find(r=>r.id===s.editingRecord),rows=s.records.map(r=>`<article class="record-card"><div><span class="record-id">${r.id}</span><strong>${r.atividade}</strong><small>${r.data} · ${r.hora} · ${r.responsavel}</small></div><span class="record-status">${r.status}</span><div class="record-actions"><button data-record-edit="${r.id}">Editar</button><button data-record-delete="${r.id}">Excluir</button></div></article>`).join('');return `<div class="records-page"><div class="records-map-wash"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-layout"><section class="records-list"><div class="records-list-head"><b>${s.records.length} registros</b><small>SQLite local · entidades relacionais</small></div>${rows||'<div class="empty-records">Nenhum registro cadastrado.</div>'}</section><aside class="records-form-wrap ${editing?'open':''}"><form class="record-form"><h2>${editing?'Editar registro':'Adicionar registro'}</h2><label>Obra<select name="obra"><option>Aliança Park</option><option>Belavista</option></select></label><label>Atividade<select name="atividade"><option>Drenagem Pluvial</option><option>Pavimentação</option><option>Rede de Água</option><option>Rede Elétrica</option></select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${editing?.data||new Date().toISOString().slice(0,10)}"></label><label>Hora<input name="hora" type="time" value="${editing?.hora||'08:30'}"></label></div><label>Responsável<input name="responsavel" value="${editing?.responsavel||''}" placeholder="Nome do envolvido"></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${editing?.detalhes||''}</textarea></label><label>Status<select name="status"><option ${editing?.status==='Pendente'?'selected':''}>Pendente</option><option ${editing?.status==='Concluído'?'selected':''}>Concluído</option></select></label><button class="record-confirm">${editing?'Salvar alterações':'Confirmar registro'}</button>${editing?'<button type="button" class="record-cancel">Cancelar</button>':''}</form></aside></div><div class="phone-preview"><div class="phone-frame"><div class="phone-notch"></div><div class="phone-screen"><b>Registros</b>${s.records.slice(0,3).map(r=>`<div><small>${r.data} · ${r.hora}</small><strong>${r.atividade}</strong><span>${r.status}</span></div>`).join('')}</div></div><small>Prévia da interface mobile</small></div></div></div>`;}
  enhanceDedicatedSurface(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas||canvas.dataset.calendarized)return;canvas.dataset.calendarized='true';const days=['03/06','04/06','05/06','06/06','07/06','08/06','09/06','10/06','11/06','12/06','13/06','14/06'];canvas.insertAdjacentHTML('afterbegin',`<div class="surface-days">${days.map((d,i)=>`<span><b>D${i+1}</b><small>${d}</small></span>`).join('')}</div><div class="surface-toolbar"><span class="activity-kind">GRADE DE PLANEJAMENTO · 12 DIAS</span><button class="add-activity-sequence">＋ Adicionar atividade</button></div><svg class="surface-edges" aria-hidden="true"></svg><div class="activity-palette" hidden><b>Adicionar ao cronograma</b>${['Lançamento de gasto','Agendar fornecedor','Registrar material','Designar responsável','Medição de avanço','Aprovar pagamento','Enviar agenda WhatsApp','Criar alerta','Anexar documento','Conferir orçamento','Atualizar indicador','Fechar atividade'].map((x,i)=>`<button data-add-work="${x}" data-kind="${i%3===0?'ADMINISTRAÇÃO':i%3===1?'CAMPO':'CONTROLE'}">${x}</button>`).join('')}</div>`);const nodes=[...canvas.querySelectorAll('.workflow-card')];nodes.forEach((card,i)=>{card.dataset.nodeId=`workflow-${i}`;card.dataset.duration=String((i%4)+1);card.style.left=`${24+i*130}px`;card.style.top=`${105+(i%2)*130}px`;card.style.width=`${100+(i%4)*34}px`;card.insertAdjacentHTML('beforeend',`<span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`);this.makeSurfaceDrag(card,canvas);});let source=null;const draw=()=>{const svg=canvas.querySelector('.surface-edges');svg.innerHTML='';const relations=[...canvas.querySelectorAll('.surface-relation')];relations.forEach(r=>{const a=canvas.querySelector(`[data-node-id="${r.dataset.from}"]`),b=canvas.querySelector(`[data-node-id="${r.dataset.to}"]`);if(!a||!b)return;const x1=a.offsetLeft+a.offsetWidth,y1=a.offsetTop+a.offsetHeight/2,x2=b.offsetLeft,y2=b.offsetTop+b.offsetHeight/2,bend=Math.max(50,(x2-x1)/2);const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}`);path.classList.add('surface-edge');svg.appendChild(path);const label=document.createElement('button');label.className='surface-edge-label';label.style.left=`${(x1+x2)/2-45}px`;label.style.top=`${(y1+y2)/2-12}px`;label.textContent=r.dataset.label;label.onclick=()=>{const next=prompt('Rótulo da relação:',r.dataset.label);if(next?.trim()){r.dataset.label=next.trim();draw();}};canvas.appendChild(label);});};canvas.querySelectorAll('.surface-port').forEach(port=>port.addEventListener('click',e=>{e.stopPropagation();const card=port.closest('.workflow-card');if(!source){source=card;card.classList.add('relation-source');notify('Origem selecionada. Clique no ponto de outra atividade.');return;}if(source!==card){const relation=document.createElement('span');relation.className='surface-relation';relation.dataset.from=source.dataset.nodeId;relation.dataset.to=card.dataset.nodeId;relation.dataset.label='libera';canvas.appendChild(relation);source.classList.remove('relation-source');source=null;draw();notify('Atividades relacionadas por linha rotulada.','success');}}));canvas.querySelector('.add-activity-sequence').addEventListener('click',()=>canvas.querySelector('.activity-palette').toggleAttribute('hidden'));canvas.querySelectorAll('[data-add-work]').forEach(button=>button.addEventListener('click',()=>{const card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.dataset.duration='1';card.style.left='24px';card.style.top='420px';card.style.width='130px';card.innerHTML=`<span class="activity-kind">${button.dataset.kind}</span><strong>${button.dataset.addWork}</strong><small>Dia previsto · responsável a definir</small><em>Fluxo da etapa →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;canvas.appendChild(card);this.makeSurfaceDrag(card,canvas);canvas.querySelector('.activity-palette').hidden=true;notify('Atividade adicionada à superfície.','success');}));draw();}
  makeSurfaceDrag(card,canvas){
    if(!card||card.dataset.surfaceDragBound)return;
    card.dataset.surfaceDragBound='true';
    card.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.surface-port,.surface-resize'))return;
      event.preventDefault();
      event.stopPropagation();
      const origin={x:event.clientX,y:event.clientY},initial={x:card.offsetLeft,y:card.offsetTop};
      let moved=false;
      const move=ev=>{
        const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
        if(!moved&&Math.hypot(dx,dy)<2)return;
        moved=true;
        card.classList.add('dragging');
        card.style.left=`${Math.max(12,initial.x+dx)}px`;
        card.style.top=`${Math.max(72,initial.y+dy)}px`;
        this.drawSurfaceRelations(canvas);
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',finish);
        window.removeEventListener('pointercancel',finish);
        card.classList.remove('dragging');
        card.releasePointerCapture?.(event.pointerId);
        if(moved){
          card.dataset.moved='true';
          setTimeout(()=>delete card.dataset.moved,120);
          notify('Atividade reposicionada no canvas.');
        }
      };
      card.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',finish,{once:true});
      window.addEventListener('pointercancel',finish,{once:true});
    });
    const resize=card.querySelector('.surface-resize');
    resize?.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();
      event.stopPropagation();
      const originX=event.clientX,startW=card.offsetWidth;
      const move=ev=>{
        const width=Math.max(90,startW+ev.clientX-originX);
        card.style.width=`${width}px`;
        card.dataset.duration=String(Math.max(1,Math.round(width/100)));
        this.drawSurfaceRelations(canvas);
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',finish);
        window.removeEventListener('pointercancel',finish);
        resize.releasePointerCapture?.(event.pointerId);
        notify(`Duração ajustada para ${card.dataset.duration} dia(s).`);
      };
      resize.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',finish,{once:true});
      window.addEventListener('pointercancel',finish,{once:true});
    });
  }
  splitStageTabs(){const panel=this.querySelector('.stage-utilities');if(!panel||panel.dataset.split)return;panel.dataset.split='true';const tabs=panel.querySelector('.utility-tabs'),content=panel.querySelector('.utility-content'),original=panel.querySelector('.utility-tab');original.dataset.utilityTab='agenda';original.innerHTML=`${ico('calendar-days')} Agenda`;tabs.insertAdjacentHTML('afterbegin',`<button class="utility-tab active" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma</button>`);tabs.insertAdjacentHTML('beforeend',`<button class="utility-tab" data-utility-tab="afazeres">${ico('list-checks')} A Fazeres</button>`);original.classList.remove('active');content.dataset.utilityPane='agenda';const cron=document.createElement('div');cron.className='utility-pane';cron.dataset.pane='cronograma';cron.innerHTML='<div class="timeline-utility"><span class="activity-kind">CRONOGRAMA DA ETAPA</span><h3>Dependências e marcos</h3><div class="mini-timeline"><b>Início</b><i></i><b>Medição</b><i></i><b>Validação</b><i></i><b>Conclusão</b></div><p>Agenda, afazeres e canvas permanecem vinculados à mesma etapa.</p></div>';content.before(cron);const todo=document.createElement('div');todo.className='utility-pane';todo.dataset.pane='afazeres';todo.innerHTML='<div class="todo-focus"><span class="activity-kind">A FAZERES DA ETAPA</span><h3>Execução diária</h3><p>Itens pendentes, responsáveis e alertas de prazo.</p><div class="todo-grid"></div><button class="agenda-action">＋ Adicionar afazer</button></div>';panel.appendChild(todo);todo.querySelector('.todo-grid').append(...content.querySelectorAll('.todo-grid label'));const show=name=>{tabs.querySelectorAll('.utility-tab').forEach(x=>x.classList.toggle('active',x.dataset.utilityTab===name));cron.hidden=name!=='cronograma';content.hidden=name!=='agenda';todo.hidden=name!=='afazeres';notify(`${name[0].toUpperCase()+name.slice(1)} da etapa ativada.`);};tabs.querySelectorAll('.utility-tab').forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.utilityTab)));show('cronograma');}
  bindDedicatedWorkflow(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;const steps=[['01','Criar lançamento','Registrar data, etapa, subetapa e descrição','Lançamentos'],['02','Vincular fornecedor','Associar fornecedor e documento fiscal','Lançamentos'],['03','Conferir quantidade','Validar quantidade, unidade e valor unitário','Lançamentos'],['04','Aprovar pagamento','Confirmar forma de pagamento e responsável','Lançamentos'],['05','Medição da etapa','Relacionar gasto ao avanço físico e afazer','Resumo Mensal'],['06','Conciliar orçamento','Comparar previsto, realizado e saldo','Orçamento'],['07','Atualizar indicador','Consolidar consumo e variação mensal','Indicadores'],['08','Fechar etapa','Gerar relatório e liberar próxima etapa','Como Usar']];canvas.querySelectorAll('.dedicated-activity').forEach(x=>x.remove());const guide=canvas.querySelector('.canvas-guide');steps.forEach((step,i)=>{const card=document.createElement('button');card.className='dedicated-activity workflow-card';card.style.left=`${30+(i%4)*260}px`;card.style.top=`${90+Math.floor(i/4)*160}px`;card.innerHTML=`<span class="activity-kind">${step[0]} · ${step[3]}</span><strong>${step[1]}</strong><small>${step[2]}</small><em>Fluxo da etapa →</em>`;canvas.appendChild(card);card.addEventListener('click',()=>{if(card.dataset.moved)return;let detail=canvas.querySelector('.workflow-detail');if(!detail){detail=document.createElement('aside');detail.className='workflow-detail';canvas.appendChild(detail);}detail.innerHTML=`<button class="detail-close" aria-label="Fechar">×</button><span class="activity-kind">${step[3]}</span><h3>${step[1]}</h3><p>${step[2]}.</p><div><small>ENTRADAS</small><b>Data · etapa · fornecedor · valor</b></div><div><small>SAÍDA</small><b>${i<steps.length-1?steps[i+1][1]:'Etapa finalizada e relatório disponível'}</b></div><button class="workflow-complete">${i<steps.length-1?'Concluir e avançar':'Finalizar etapa'}</button>`;detail.querySelector('.detail-close').onclick=()=>detail.remove();detail.querySelector('.workflow-complete').onclick=()=>{notify(`${step[1]} concluído. Próximo fluxo liberado.`,'success');appStore.set({lastAction:`Concluiu ${step[1]}`});detail.remove();};});let start=null;card.addEventListener('pointerdown',e=>{e.preventDefault();card.setPointerCapture?.(e.pointerId);start={x:card.offsetLeft,y:card.offsetTop,cx:e.clientX,cy:e.clientY};const move=ev=>{card.style.left=`${Math.max(10,start.x+ev.clientX-start.cx)}px`;card.style.top=`${Math.max(55,start.y+ev.clientY-start.cy)}px`;card.dataset.moved='true';};const up=()=>{card.releasePointerCapture?.(e.pointerId);card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);setTimeout(()=>delete card.dataset.moved,0);};card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);});});window.lucide?.createIcons();}
  addStageUtilities(){const shell=this.querySelector('.stage-shell');if(!shell||shell.querySelector('.stage-utilities'))return;const panel=document.createElement('section');panel.className='stage-utilities';panel.innerHTML=`<div class="utility-tabs"><button class="utility-tab active" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma / Agenda</button><button class="utility-tab" data-utility-tab="canvas">${ico('workflow')} Canvas organizacional</button></div><div class="utility-content"><div class="agenda-summary"><div><span class="activity-kind">AGENDA DA ETAPA · HOJE</span><h3>Afazeres operacionais</h3><p>Conecte a equipe, confirme presença e avise os envolvidos.</p></div><button class="whatsapp-action">${ico('message-circle')} Enviar agenda no WhatsApp</button></div><div class="todo-grid"><label><input type="checkbox"> Confirmar medição da drenagem <small>08:30 · Carlos Mendes</small></label><label><input type="checkbox"> Validar recebimento de tubos <small>10:00 · Paula Nascimento</small></label><label><input type="checkbox"> Liberar frente seguinte <small>16:00 · Mariana Lopes</small></label></div><div class="agenda-actions"><button class="agenda-action">＋ Adicionar afazer</button><button class="alert-action">${ico('bell-ring')} Criar alerta de prazo</button><span class="agenda-status">Próximo alerta: hoje às 16:00</span></div></div>`;shell.appendChild(panel);panel.querySelectorAll('[data-utility-tab]').forEach(tab=>tab.addEventListener('click',()=>{panel.querySelectorAll('.utility-tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');notify(tab.dataset.utilityTab==='cronograma'?'Agenda da etapa ativada.':'Canvas organizacional ativado.');}));panel.querySelector('.whatsapp-action').addEventListener('click',()=>{notify('Agenda preparada para envio aos envolvidos via WhatsApp.','success');appStore.set({lastAction:'Enviou agenda da etapa via WhatsApp'});});panel.querySelector('.agenda-action').addEventListener('click',()=>{const label=prompt('Descreva o novo afazer da etapa:');if(label?.trim()){const item=document.createElement('label');item.innerHTML=`<input type="checkbox"> ${esc(label.trim())} <small>Agora · responsável a definir</small>`;panel.querySelector('.todo-grid').appendChild(item);notify('Afazer adicionado à agenda.','success');appStore.set({lastAction:'Adicionou afazer na agenda'});}});panel.querySelector('.alert-action').addEventListener('click',()=>{notify('Alerta criado para o prazo da etapa.','warning');appStore.set({lastAction:'Criou alerta de prazo'});});}
  openDedicatedStage(){const s=demoData.activities.find(x=>x.id===appStore.get().selectedStage)||demoData.activities[1];this.innerHTML=`<div class="stage-dedicated"><button class="ghost" data-back-stages>${ico('arrow-left')} Voltar para todas as etapas</button><div class="dedicated-head"><div><span class="activity-kind">PÁGINA DEDICADA · ETAPA ${s.id} DE 18</span><h1>${s.name}</h1><p>${s.week} · ${s.owner} · acompanhamento operacional</p></div><span class="stage-dedicated-progress">${s.progress}%</span></div><div class="dedicated-grid"><section class="dedicated-panel"><h3>Resumo executivo</h3><p>Orçamento previsto <b>R$ 24.850,00</b></p><p>Realizado <b>R$ 16.120,00</b></p><p>Saldo <b>R$ 8.730,00</b></p></section><section class="dedicated-panel"><h3>Responsáveis</h3><p><b>${s.owner}</b><br>Execução da frente</p><p><b>Paula Nascimento</b><br>Planejamento e medição</p></section><section class="dedicated-panel"><h3>Compras e materiais</h3><p>PE-2025-040 · Tubo PEAD Ø600mm</p><p>Tubos PVC · 780 m em uso</p><p>Cimento · 150 sc em uso</p></section></div><section class="dedicated-canvas"><div class="canvas-guide"><b>Superfície livre de atividades</b><span>Arraste, conecte e acompanhe as relações desta etapa</span></div><div class="dedicated-activity" style="left:30px;top:90px"><span class="activity-kind">ATIVIDADE PRINCIPAL</span><strong>Executar ${s.name}</strong><small>${s.owner} · ${s.progress}%</small></div><div class="dedicated-activity" style="left:360px;top:220px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar medição e materiais</strong><small>Paula Nascimento · pendente</small></div><div class="dedicated-activity" style="left:700px;top:100px"><span class="activity-kind">PRÓXIMA AÇÃO</span><strong>Liberar próxima frente</strong><small>Dependência da conclusão atual</small></div></section></div>`;window.lucide?.createIcons();this.querySelector('[data-back-stages]')?.addEventListener('click',()=>this.render());}
  connectedCallback(){ this.render(); this.loadPersistentRecords(); appStore.subscribe(()=>this.render()); }
  async loadPersistentRecords(){
    try{
      const response=await fetch('/api/records'); if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json(); if(Array.isArray(payload.records)&&payload.records.length)appStore.set({records:payload.records,lastAction:'Carregou registros do banco local'});
    }catch(error){console.warn('Persistência local indisponível; mantendo demonstração.',error);}
  }
  render(){ const view=appStore.get().view; this.dataset.view=view; const labels={assistant:['Execução atual','Panorama operacional'],map:['Mapa operacional','Visão temática por utilidade'],stages:['Etapas da obra','Canvas de execução e dependências'],purchases:['Compras','Compromissos, prazos e fornecedores'],inventory:['Inventário','Materiais, reservas e consumo'],leads:['Leads','Captação pública e intenção de compra'],collaborators:['Colaboradores','Alocação e presença em campo'],reports:['Relatórios','Orçamento, realizado e indicadores'],settings:['Configuração','Integrações e parâmetros']}; const [title,subtitle]=labels[view]||labels.assistant; this.innerHTML=`<div class="activity-header"><div><span>${title}</span><small>${subtitle}</small></div><div class="activity-state"><i></i> Em acompanhamento <b>·</b> ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>${view==='stages'?this.stagesCanvas():(this[view]?.() || this.assistant())}`; if(view==='stages'){this.addActivityNodes();this.addStageUtilities();this.splitStageTabs();} window.lucide?.createIcons(); this.bind(); }
  bind(){
    this.querySelectorAll('.card-close').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();button.closest('.float-card')?.remove();appStore.set({lastAction:'Ocultou um card do dashboard'});}));
    this.querySelector('[data-report-family]')?.addEventListener('change',event=>{const family=event.currentTarget.value,first=reportCatalog.find(report=>report.family===family);appStore.set({reportFamily:family,reportType:first?.id||'financial-balance',lastAction:`Selecionou família de relatório ${family}`});});
    this.querySelector('[data-report-type]')?.addEventListener('change',event=>{const report=reportCatalog.find(item=>item.id===event.currentTarget.value);appStore.set({reportType:event.currentTarget.value,lastAction:`Abriu relatório ${report?.label||event.currentTarget.value}`});});
    this.querySelector('[data-report-period]')?.addEventListener('change',event=>{appStore.set({reportPeriod:event.currentTarget.value,lastAction:`Alterou período do relatório para ${event.currentTarget.options[event.currentTarget.selectedIndex].text}`});});
    this.querySelectorAll('[data-report-export]').forEach(button=>button.addEventListener('click',()=>{const s=appStore.get(),report=reportCatalog.find(item=>item.id===s.reportType)||reportCatalog[0],csv=[report.columns,...report.rows].map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n'),url=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`${report.id}-${s.reportPeriod||'2024-06'}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`${report.label} exportado em CSV.`,'success');appStore.set({lastAction:`Exportou ${report.label}`});}));
    this.querySelector('[data-report-print]')?.addEventListener('click',()=>{window.print();appStore.set({lastAction:'Abriu impressão do relatório'});});
    this.querySelector('.records-new')?.addEventListener('click',()=>{this.querySelector('.records-form-wrap')?.classList.add('open');});
    this.querySelectorAll('[data-record-edit]').forEach(b=>b.addEventListener('click',()=>{appStore.set({editingRecord:b.dataset.recordEdit});}));
    this.querySelectorAll('[data-record-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Excluir este registro?'))return;try{const response=await fetch(`/api/records/${encodeURIComponent(b.dataset.recordDelete)}`,{method:'DELETE'});if(!response.ok)throw new Error(`HTTP ${response.status}`);appStore.update(s=>({...s,records:s.records.filter(r=>r.id!==b.dataset.recordDelete),lastAction:'Excluiu registro no banco'}));notify('Registro excluído do banco local.','success');}catch(error){notify('Não foi possível excluir o registro.','warning');console.warn('Exclusão persistente indisponível.',error);}}));
    this.querySelector('.record-cancel')?.addEventListener('click',()=>appStore.set({editingRecord:null}));
    this.querySelector('.record-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),value=Object.fromEntries(f.entries()),editingId=appStore.get().editingRecord;try{const response=await fetch(editingId?`/api/records/${encodeURIComponent(editingId)}`:'/api/records',{method:editingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const record=await response.json();appStore.update(s=>({...s,records:editingId?s.records.map(r=>r.id===editingId?record:r):[record,...s.records],editingRecord:null,lastAction:editingId?'Atualizou registro no banco':'Criou registro no banco'}));notify('Registro salvo no banco local.','success');}catch(error){notify('Banco local indisponível; registro não confirmado.','warning');console.warn('Persistência de registro indisponível.',error);}});
    this.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:b.dataset.view,lastAction:`Abriu ${b.textContent.trim()}`})));
    this.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>{appStore.set({selectedLead:+b.dataset.lead});this.render();}));
    this.querySelectorAll('[data-stage-index]').forEach(b=>b.addEventListener('click',()=>{appStore.set({selectedStage:+b.dataset.stageIndex,lastAction:`Abriu a etapa ${b.dataset.stageIndex}`});this.render();}));
    this.querySelectorAll('.stage-detail-card').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('.stage-activity-card,.activity-connect'))return;this._dedicated=true;this.openDedicatedStage();this.bindDedicatedWorkflow();this.enhanceDedicatedSurface();this.addCatalogPalette();this.bindCatalogButtons();this.addFineDurationControls();this.bindGhostConnections();this.watchSurfaceRelations();this.bindWorkflowFieldTrees();}));
    this.querySelectorAll('[data-activity-detail]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.dragged==='true')return;const detail=this.querySelector('.activity-detail');if(detail){detail.classList.add('open');detail.querySelector('[data-detail-title]').textContent=b.dataset.activityDetail;}}));
    this.querySelectorAll('[data-close-detail]').forEach(b=>b.addEventListener('click',()=>b.closest('.activity-detail')?.classList.remove('open')));
    this.querySelectorAll('button:not([data-view]):not([data-cmd]):not([data-lead]):not([id])').forEach(button=>button.addEventListener('click',()=>{
      if(button.closest('.reports-toolbar,.report-footer'))return;
      const label=button.textContent.trim().replace(/\s+/g,' '); if(!label)return;
      if(button.classList.contains('stage-tab')){this.querySelectorAll('.stage-tab').forEach(x=>x.classList.remove('active'));button.classList.add('active');notify(`Visão ${label} selecionada.`);return;}
      if(button.classList.contains('public-submit')){const values=[...this.querySelectorAll('.public-fields input')].map(x=>x.value.trim());if(values.some(v=>!v)){notify('Preencha nome, WhatsApp e e-mail para registrar a intenção.','warning');return;}notify('Lead registrado e encaminhado para atendimento.','success');appStore.set({lastAction:'Registrou novo lead'});return;}
      if(button.textContent.includes('relatório')){notify('Relatório executivo preparado para exportação.','success');return;}
      if(button.textContent.includes('recomend')){notify('Recomendações: priorizar postes e tubos atrasados.','warning');return;}
      notify(`${label} executado.`,'success'); appStore.set({lastAction:label});
    }));
    this.querySelectorAll('.canvas-node').forEach(node=>{node.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',node.dataset.node);node.classList.add('dragging');});node.addEventListener('dragend',()=>node.classList.remove('dragging'));});
    const zone=this.querySelector('.canvas-relate'); if(zone){zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drop-ready');});zone.addEventListener('dragleave',()=>zone.classList.remove('drop-ready'));zone.addEventListener('drop',e=>{e.preventDefault();const node=e.dataTransfer.getData('text/plain');zone.classList.remove('drop-ready');zone.querySelector('strong').textContent=`Relacionamento: ${node} → orçamento mensal`;appStore.set({lastAction:`Relacionou ${node} ao orçamento mensal`});});}
    this.querySelectorAll('.stage-card[draggable="true"]').forEach(card=>{card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/stage',card.dataset.stage);card.classList.add('dragging');});card.addEventListener('dragend',()=>card.classList.remove('dragging'));});
    this.querySelectorAll('.stage-card[draggable="true"]').forEach(card=>{card.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,textarea'))return;const canvas=card.closest('.stage-canvas');if(!canvas)return;const start=canvas.getBoundingClientRect();const initial={x:card.offsetLeft,y:card.offsetTop};const origin={x:e.clientX,y:e.clientY};card.classList.add('pointer-dragging');const move=ev=>{card.style.left=`${Math.max(12,initial.x+ev.clientX-origin.x)}px`;card.style.top=`${Math.max(42,initial.y+ev.clientY-origin.y)}px`;};const up=()=>{card.classList.remove('pointer-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const relation=canvas.querySelector('.relation-label');if(relation)relation.textContent=`Posições relacionadas: ${card.dataset.stage} → próxima atividade`;appStore.set({lastAction:`Reposicionou ${card.dataset.stage} no canvas`});};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});});
    this.querySelectorAll('.stage-activity-card').forEach(card=>{card.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.activity-connect'))return;e.preventDefault();card.setPointerCapture?.(e.pointerId);const initial={x:card.offsetLeft,y:card.offsetTop},origin={x:e.clientX,y:e.clientY};let moved=false;card.classList.add('dragging');const move=ev=>{if(Math.abs(ev.clientX-origin.x)>3||Math.abs(ev.clientY-origin.y)>3)moved=true;card.style.left=`${Math.max(10,initial.x+ev.clientX-origin.x)}px`;card.style.top=`${Math.max(45,initial.y+ev.clientY-origin.y)}px`;};const up=()=>{card.classList.remove('dragging');card.releasePointerCapture?.(e.pointerId);card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);if(moved){card.dataset.dragged='true';setTimeout(()=>delete card.dataset.dragged,0);appStore.set({lastAction:`Reposicionou atividade ${card.dataset.activityDetail}`});}};card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);});});
    const stageCanvas=this.querySelector('.stage-canvas'); if(stageCanvas){stageCanvas.addEventListener('dragover',e=>{e.preventDefault();stageCanvas.classList.add('drop-ready');});stageCanvas.addEventListener('dragleave',()=>stageCanvas.classList.remove('drop-ready'));stageCanvas.addEventListener('drop',e=>{e.preventDefault();const stage=e.dataTransfer.getData('text/stage');stageCanvas.classList.remove('drop-ready');const label=stageCanvas.querySelector('.relation-label');if(label)label.textContent=`Dependência relacionada: ${stage} → próxima etapa`;appStore.set({lastAction:`Moveu a etapa ${stage} no canvas`});});}
  }
  addActivityNodes(){
    const canvas=this.querySelector('.stage-canvas'); if(!canvas||canvas.querySelector('.activity-layer'))return;
    const layer=document.createElement('div'); layer.className='activity-layer'; layer.innerHTML=`<div class="activity-layer-title">ATIVIDADES RELACIONADAS <small>Arraste o card para mover · arraste ＋ para conectar</small></div><article class="activity-node" data-activity-id="act-drenagem" data-stage="Drenagem Pluvial" style="left:34px;top:560px"><span class="activity-kind">ATIVIDADE · DRENAGEM</span><strong>Executar rede principal</strong><small>Responsável: Carlos Mendes · 82%</small><button class="activity-connect" data-connect-from="act-drenagem" aria-label="Arrastar para conectar">＋</button></article><article class="activity-node" data-activity-id="act-bocas" data-stage="Drenagem Pluvial" style="left:310px;top:590px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar bocas de lobo</strong><small>Dependência: rede principal</small><button class="activity-connect" data-connect-from="act-bocas" aria-label="Arrastar para conectar">＋</button></article><article class="activity-node" data-activity-id="act-pav" data-stage="Pavimentação" style="left:590px;top:790px"><span class="activity-kind">ATIVIDADE · PAVIMENTAÇÃO</span><strong>Liberar frente de pavimentação</strong><small>Aguardando drenagem · 35%</small><button class="activity-connect" data-connect-from="act-pav" aria-label="Arrastar para conectar">＋</button></article><svg class="activity-edges" aria-hidden="true"><path class="activity-edge" d="M0 0 C 0 0, 0 0, 0 0"></path></svg><div class="activity-relation relation-a">Drenagem → Pavimentação</div>`; canvas.appendChild(layer);
    const nodes=[...layer.querySelectorAll('.activity-node')]; let source=null; let connecting=null;
    const edge=layer.querySelector('.activity-edge'); const redraw=()=>{if(!edge)return; const a=nodes[0],b=nodes[2], x1=a.offsetLeft+a.offsetWidth, y1=a.offsetTop+a.offsetHeight/2, x2=b.offsetLeft, y2=b.offsetTop+b.offsetHeight/2, bend=Math.max(70,(x2-x1)/2); edge.setAttribute('d',`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`);};
    nodes.forEach(node=>{node.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();node.setPointerCapture?.(e.pointerId);const initial={x:node.offsetLeft,y:node.offsetTop},origin={x:e.clientX,y:e.clientY};node.classList.add('dragging');const move=ev=>{node.style.left=`${Math.max(8,initial.x+ev.clientX-origin.x)}px`;node.style.top=`${Math.max(45,initial.y+ev.clientY-origin.y)}px`;redraw();};const up=()=>{node.classList.remove('dragging');node.releasePointerCapture?.(e.pointerId);node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);appStore.set({lastAction:`Reposicionou atividade ${node.querySelector('strong').textContent}`});};node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);});
      const handle=node.querySelector('.activity-connect'); handle?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();handle.setPointerCapture?.(e.pointerId);connecting={from:node,move:ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.activity-node');nodes.forEach(n=>n.classList.toggle('connect-target',n===target&&n!==node));}};handle.addEventListener('pointermove',connecting.move);const finish=ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.activity-node');handle.releasePointerCapture?.(e.pointerId);handle.removeEventListener('pointermove',connecting.move);nodes.forEach(n=>n.classList.remove('connect-target'));if(target&&target!==node){source=node;const relation=layer.querySelector('.activity-relation');relation.textContent=`${node.dataset.stage} · ${node.querySelector('strong').textContent}  →  ${target.dataset.stage} · ${target.querySelector('strong').textContent}`;notify('Relacionamento entre atividades criado.','success');appStore.set({lastAction:'Relacionou atividades entre etapas'});}connecting=null;};handle.addEventListener('pointerup',finish,{once:true});});
    }); redraw();
  }
  assistant(){ return `<div class="scene-title"><span>IA · Belavista</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card map-complete"><h3>${ico('layers-3')} Mapa de completude</h3><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">Ver detalhes</button></glass-card><glass-card class="float-card collab-card"><h3>${ico('users')} Colaboradores ativos</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Em atividades externas</span><button data-view="collaborators">Ver equipe</button></glass-card><glass-card class="float-card mini chrono"><h3>${ico('calendar-days')} Cronograma</h3><p>Semana 18 · 12 atividades</p><div class="weekdots"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><button data-view="stages">Ver cronograma</button></glass-card><glass-card class="float-card mini leads-card"><h3>${ico('users-round')} Leads · 7 dias</h3><div class="sparkline">⌁⌃⌁⌃⌁⌃⌁</div><strong>24</strong><small>Total no período</small><button data-view="leads">Ver leads</button></glass-card><glass-card class="float-card mini buy-card"><h3>${ico('shopping-cart')} Compras críticas</h3><strong>Postes de concreto</strong><span>Déficit 8 un.</span><button data-view="purchases">Ver compras</button></glass-card>`; }
  map(){ return `<glass-card class="float-card overview wide"><h3>${ico('map')} Mapa operacional</h3><p>Selecione uma visão temática. O ângulo, o filtro e os cards mudam conforme o aspecto acompanhado.</p><div class="theme-grid">${['stages','leads','inventory'].map(v=>`<button data-view="${v}">${ico({stages:'calendar',leads:'user-search',inventory:'chart-no-axes-combined'}[v])}<span>${{stages:'Etapas + cronograma',leads:'Intenções',inventory:'Balanço financeiro'}[v]}</span></button>`).join('')}</div></glass-card>`; }
  stages(){ const a=demoData.activities; return `<glass-card class="float-card work-canvas"><div class="card-head"><div><h3>${ico('layout-dashboard')} Canvas de trabalho</h3><small>Arraste os nós para relacionar dados e etapas</small></div><span class="chip violet">48 meses</span></div><div class="canvas-columns"><div><b>01 · Criar</b><span class="canvas-node" draggable="true" data-node="Registro de gasto">${ico('plus')} Registro de gasto</span><span class="canvas-node" draggable="true" data-node="Etapa / subetapa">${ico('layers-3')} Etapa / subetapa</span></div><div><b>02 · Preencher</b><span class="canvas-node" draggable="true" data-node="Data e competência">${ico('calendar-plus')} Data e competência</span><span class="canvas-node" draggable="true" data-node="Valor unitário e total">${ico('wallet-cards')} Valor unitário e total</span></div><div><b>03 · Relacionar</b><div class="canvas-relate"><strong>Solte aqui para criar um relacionamento</strong><small>Orçamento mensal · Indicador · Relatório</small></div></div></div><div class="canvas-foot"><span>Última ação: ${appStore.get().lastAction}</span><button data-view="reports">Abrir relatório</button></div></glass-card><glass-card class="float-card timeline-card"><div class="card-head"><div><h3>${ico('calendar-clock')} Etapas + Cronograma</h3><small>Semanas 23 — 28</small></div><span class="chip violet">Semana atual · 25</span></div><div class="timeline">${a.map((x,i)=>`<div class="timeline-step ${x.status}"><b>${x.week}</b><span></span><strong>${x.name}</strong><small>${x.progress}% · ${x.owner}</small></div>`).join('')}</div></glass-card><glass-card class="float-card activity-list"><h3>${ico('list-checks')} Atividades da semana</h3>${a.slice(1,5).map(x=>`<div class="row"><span>${x.name}<small>${x.owner}</small></span><em class="status ${statusClass(x.status)}">${x.status}</em></div>`).join('')}</glass-card><glass-card class="float-card dep-card"><h3>${ico('triangle-alert')} Dependências e atrasos</h3><div class="alert-line"><b>Execução de meio-fio</b><span>Bloqueado</span></div><div class="alert-line"><b>Rede de água</b><span>Aguardando projeto</span></div><button>Ver análise completa</button></glass-card><glass-card class="float-card team-card"><h3>${ico('users')} Equipe escalada</h3>${demoData.collaborators.map(x=>`<div class="row"><span>${x[0]}<small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card>`; }
  stagesCanvas(){ const a=demoData.activities; const selected=demoData.activities.find(x=>x.id===appStore.get().selectedStage)||a[1]; const activityNames=['Preparar frente','Executar atividade principal','Validar medição','Liberar próxima frente']; const cards=a.map((x,i)=>{const overlay=stageOverlayKey(x.name);return `<button class="stage-overview-card ${x.id===selected.id?'selected':''} overlay-${overlay}" data-stage-index="${x.id}"><span class="stage-overview-index">${String(i+1).padStart(2,'0')}</span><strong>${x.name}</strong><span class="stage-overlay-chip">${stageOverlayLabels[overlay]}</span><map-scene compact data-stage="${esc(x.name)}" data-overlay="${overlay}" data-map-index="${i}" class="stage-map-thumb" aria-hidden="true"></map-scene><small>${x.week} · ${x.progress}%</small><i class="stage-progress-mini"><b style="width:${x.progress}%"></b></i></button>`;}).join(''); const details=`<div class="activity-detail" role="dialog" aria-modal="true"><button class="detail-close" data-close-detail aria-label="Fechar">×</button><span class="activity-kind">ATIVIDADE · ${selected.name.toUpperCase()}</span><h2 data-detail-title>Detalhes da etapa</h2><p>Superfície de controle exclusiva para organizar atividades, custos e dependências desta etapa.</p><div class="detail-columns"><div><small>RESPONSÁVEIS</small><b>${selected.owner}</b><b>Paula Nascimento · Planejamento</b></div><div><small>COMPRAS ASSOCIADAS</small><b>PE-2025-040 · Tubo PEAD Ø600mm</b><b>PE-2025-039 · Concreto FCK 25MPa</b></div><div><small>MATERIAIS</small><b>Tubos PVC · 780 m em uso</b><b>Cimento · 150 sc em uso</b></div></div></div>`; return `<div class="stage-shell stage-shell-expanded"><div class="stage-toolbar"><div class="breadcrumbs">Início <b>/</b> Obras <b>/</b> Aliança Park <b>/</b> Etapas</div><div class="stage-tools"><button class="stage-tab active">${ico('layout-dashboard')} Canvas</button><button class="ghost">${ico('sparkles')} IA: Sugestões</button></div></div><section class="stage-overview"><div class="section-kicker">ETAPAS DO EMPREENDIMENTO <small>Role horizontalmente para navegar por todo o calendário</small></div><div class="stage-overview-scroll">${cards}</div></section><div class="stage-body"><div class="stage-canvas stage-canvas-exclusive"><div class="canvas-guide"><b>Canvas exclusivo · ${selected.name}</b><span class="relation-label">Clique nos cards para ver detalhes · organize atividades livremente</span></div><article class="stage-card featured stage-detail-card"><div class="stage-card-head"><span class="status ${selected.status}">${selected.status}</span><h2>${selected.name}</h2><span class="stage-index">${selected.week} · ETAPA ${selected.id} DE 18</span></div><p class="stage-description">${selected.name} em acompanhamento operacional, com atividades, compras e recursos relacionados.</p><div class="stage-card-grid"><div class="stage-progress"><small>PROGRESSO GERAL</small><strong>${selected.progress}%</strong><div class="progress-ring"><i style="width:${selected.progress}%"></i></div><div class="metric-line"><span>Atividades</span><b>4</b></div><div class="metric-line"><span>Responsável</span><b>${selected.owner}</b></div></div><div class="stage-media"><map-scene compact data-stage="${esc(selected.name)}" data-overlay="${stageOverlayKey(selected.name)}" data-map-index="${a.findIndex(x=>x.id===selected.id)}" class="stage-map-detail" aria-label="Mapa da etapa ${esc(selected.name)}"></map-scene><small class="stage-map-status">Highlight: ${stageOverlayLabels[stageOverlayKey(selected.name)]} · ruas, lotes e pontos de acompanhamento</small></div><div class="stage-facts"><div><small>INÍCIO</small><b>03/06/2024</b></div><div><small>PREVISÃO TÉRMINO</small><b>16/06/2024</b></div><div><small>CUSTO PREVISTO</small><b>R$ 24.850,00</b></div><div><small>ASSOCIAÇÕES</small><b>2 compras · 8 materiais</b></div></div></div></article>${activityNames.map((name,i)=>`<button class="activity-node stage-activity-card" data-activity-detail="${name}" style="left:${34+i*245}px;top:${550+(i%2)*130}px"><span class="activity-kind">${i<2?'SUBATIVIDADE':'ATIVIDADE'} · ${selected.name}</span><strong>${name}</strong><small>${selected.owner} · ${Math.max(5,selected.progress-i*12)}%</small><span class="activity-connect">＋</span></button>`).join('')}${details}</div><aside class="stage-rail"><section><h3>${ico('list-checks')} ATIVIDADES DA ETAPA</h3>${activityNames.map((x,i)=>`<button class="rail-action" data-activity-detail="${x}">${String(i+1).padStart(2,'0')} · ${x}</button>`).join('')}</section><section><h3>${ico('history')} HISTÓRICO</h3><div class="history"><p><i></i>Hoje · Medição atualizada</p><p><i></i>Ontem · Material associado</p><p><i></i>05/06 · Compra vinculada</p></div></section><section><h3>${ico('zap')} AÇÕES RÁPIDAS</h3><button class="rail-action">＋ Adicionar atividade</button><button class="rail-action">＋ Associar compra</button><button class="rail-action">＋ Associar material</button></section></aside></div></div>`; }

  inventory(){ const rows=[['Terraplanagem','R$ 420.000','R$ 388.000','R$ 32.000','92%'],['Drenagem Pluvial','R$ 610.000','R$ 566.000','R$ 44.000','93%'],['Rede de Água','R$ 350.000','R$ 210.000','R$ 140.000','60%'],['Pavimentação','R$ 880.000','R$ 622.000','R$ 258.000','71%'],['Rede Elétrica','R$ 540.000','R$ 164.000','R$ 376.000','30%']]; return `<div class="kpi-strip"><stat-pill icon="wallet-cards" label="Orçamento total" value="R$ 2,80M" tone="violet" sub="48 meses"></stat-pill><stat-pill icon="coins" label="Realizado" value="R$ 1,95M" tone="teal" sub="69,6% do orçamento"></stat-pill><stat-pill icon="chart-no-axes-combined" label="Saldo projetado" value="R$ 845k" tone="amber"></stat-pill><stat-pill icon="triangle-alert" label="Variações" value="3" tone="red" sub="Requer análise"></stat-pill></div><glass-card class="float-card balance-main"><div class="card-head"><div><h3>${ico('chart-no-axes-combined')} Balanço financeiro por etapa</h3><small>Relação entre Orçamento, Lançamentos, Resumo Mensal e Indicadores</small></div><span class="chip violet">Junho · 2024</span></div><table><thead><tr><th>Centro de custo / etapa</th><th>Orçado</th><th>Realizado</th><th>Saldo</th><th>Consumo</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="positive">${r[3]}</td><td><span class="status ${r[4].startsWith('9')?'pendente':'concluido'}">${r[4]}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card balance-monthly"><h3>${ico('calendar-range')} Resumo mensal</h3>${[['Jan/24','R$ 182k','62%'],['Fev/24','R$ 236k','68%'],['Mar/24','R$ 294k','71%'],['Abr/24','R$ 348k','76%'],['Mai/24','R$ 412k','82%'],['Jun/24','R$ 478k','86%']].map(r=>`<div class="row"><span>${r[0]}<small>Realizado acumulado</small></span><b>${r[1]}</b><em>${r[2]}</em></div>`).join('')}</glass-card><glass-card class="float-card balance-relations"><h3>${ico('git-branch')} Relações administrativas</h3><div class="relation-chain"><span>Lançamentos</span><b>→</b><span>Resumo Mensal</span><b>→</b><span>Indicadores</span></div><p>Os gastos registrados por data, etapa, fornecedor e valor alimentam o consolidado mensal e os indicadores de avanço físico-financeiro.</p><button data-view="reports">Abrir relatório completo</button></glass-card>`; }
  leads(){ const s=appStore.get().selectedLead, lead=demoData.leads[s]; return `<div class="kpi-strip"><stat-pill icon="users" label="Intenções cadastradas" value="238" tone="violet" sub="+28 hoje"></stat-pill><stat-pill icon="map-pin" label="Lotes com interesse" value="96" tone="blue"></stat-pill><stat-pill icon="phone" label="Leads em contato" value="61" tone="teal"></stat-pill><stat-pill icon="badge-check" label="Qualificados" value="37" tone="amber"></stat-pill></div><glass-card class="float-card public-lead-card"><div class="public-brand">VISTA VERDE <small>LOTEAMENTO</small></div><span class="launch-chip">LANÇAMENTO</span><h2>Encontre o lote ideal<br>para <em>morar ou investir</em></h2><p>Espelho operacional da captação pública: intenção, faixa de valor, terreno e orientação solar chegam ao CRM.</p><div class="public-fields"><input placeholder="Nome completo"><input placeholder="WhatsApp (com DDD)"><input placeholder="E-mail"></div><div class="intent-switch"><button class="selected">⌂ Moradia</button><button>▧ Investimento</button><button>☼ Veraneio</button></div><button class="public-submit">Quero atendimento ${ico('arrow-right')}</button></glass-card><glass-card class="float-card lead-detail"><h3>${ico('user-round-search')} Lead selecionado</h3><div class="person"><span class="avatar">${lead.name[0]}</span><div><strong>${lead.name}</strong><small>${lead.status}</small></div></div><dl><dt>Lote desejado</dt><dd>${lead.lot}</dd><dt>Faixa de valor</dt><dd>${lead.budget}</dd><dt>Nascer do sol</dt><dd>${lead.sun}</dd><dt>Altitude</dt><dd>${lead.altitude}</dd><dt>Terreno</dt><dd>${lead.terrain}</dd><dt>Objetivo</dt><dd>${lead.objective}</dd></dl></glass-card><glass-card class="float-card lot-intents"><h3>Intenções relacionadas</h3>${demoData.leads.map((x,i)=>`<button class="lead-row ${i===s?'selected':''}" data-lead="${i}"><span class="avatar">${x.name[0]}</span><span><b>${x.name}</b><small>${x.lot} · ${x.budget}</small></span><em>${x.status}</em></button>`).join('')}</glass-card>`; }
  purchases(){ return `<div class="kpi-strip"><stat-pill icon="clipboard-list" label="Pedidos em aberto" value="12" tone="violet" sub="R$ 485.230"></stat-pill><stat-pill icon="truck" label="Em andamento" value="8" tone="blue" sub="R$ 258.900"></stat-pill><stat-pill icon="clock-alert" label="Atrasadas" value="3" tone="amber" sub="R$ 78.600"></stat-pill><stat-pill icon="circle-check" label="Recebidas no mês" value="18" tone="teal" sub="R$ 612.450"></stat-pill></div><glass-card class="float-card purchase-analysis"><h3>${ico('sparkles')} IA · Análise de compras</h3><p>Há 3 pedidos atrasados com impacto direto em etapas críticas.</p><ul><li>Rede elétrica: postes com 8 dias de atraso</li><li>Drenagem: tubos com 5 dias de atraso</li></ul><button>Ver recomendações</button></glass-card><glass-card class="float-card purchase-summary"><h3>${ico('pie-chart')} Resumo de compras</h3><div class="donut"><span>R$ 1,43M<small>Total no mês</small></span></div><ul class="legend"><li><i class="dot violet"></i> Elétrica 32%</li><li><i class="dot blue"></i> Tubos 25%</li><li><i class="dot green"></i> Concreto 18%</li><li><i class="dot amber"></i> Diversos 15%</li></ul></glass-card><glass-card class="float-card purchases-table"><h3>${ico('shopping-cart')} Pedidos</h3><table><thead><tr><th>ID</th><th>Fornecedor</th><th>Descrição</th><th>Etapa</th><th>Valor</th><th>Status</th></tr></thead><tbody>${demoData.purchases.map(x=>`<tr><td>${x.id}</td><td>${x.supplier}</td><td>${x.desc}</td><td>${x.stage}</td><td>${x.value}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card deliveries"><h3>${ico('truck')} Próximas entregas</h3><div class="row"><span>18 MAI<small>Concreto FCK 25MPa</small></span><em>Em andamento</em></div><div class="row"><span>20 MAI<small>Cabo de alumínio</small></span><em>Em andamento</em></div><div class="row"><span>22 MAI<small>Caixa de passagem</small></span><em>Pendente</em></div></glass-card>`; }
  collaborators(){ return `<glass-card class="float-card collab-main"><h3>${ico('users')} Colaboradores</h3><p>Visualização das pessoas e frentes ativas sobre o mapa.</p>${demoData.collaborators.map((x,i)=>`<div class="collab-row"><span class="avatar">${x[0][0]}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card><glass-card class="float-card collab-stats"><h3>${ico('hard-hat')} Presença e alocação</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Atividades externas</span><b>5</b><span>Equipamentos em uso</span></glass-card>`; }
  reports(){
    const s=appStore.get(), families=[...new Set(reportCatalog.map(report=>report.family))], family=families.includes(s.reportFamily)?s.reportFamily:families[0], types=reportCatalog.filter(report=>report.family===family), selected=types.find(report=>report.id===s.reportType)||types[0], periodLabels={'2024-06':'Junho de 2024','2024-Q2':'2º trimestre de 2024','2024':'Ano de 2024','all':'Todo o projeto'}, period=periodLabels[s.reportPeriod]||periodLabels['2024-06'];
    const signalClass=value=>/crít|risco|atras|atenção|ação|vencid|acima/i.test(String(value))?'warning':/posit|normal|conclu|dentro|planejad/i.test(String(value))?'positive':'neutral';
    return `<div class="reports-workspace"><div class="reports-toolbar" aria-label="Toolbar de relatórios"><div class="report-toolbar-title"><span class="activity-kind">CENTRAL ADMINISTRATIVA</span><strong>Tipo de relatório</strong><small>${reportCatalog.length} modelos gerenciais para negócio e construção</small></div><label>Família<select data-report-family>${families.map(value=>`<option value="${esc(value)}" ${value===family?'selected':''}>${esc(value)}</option>`).join('')}</select></label><label>Relatório<select data-report-type>${types.map(report=>`<option value="${esc(report.id)}" ${report.id===selected.id?'selected':''}>${esc(report.label)}</option>`).join('')}</select></label><label>Período<select data-report-period><option value="2024-06" ${s.reportPeriod==='2024-06'?'selected':''}>Junho de 2024</option><option value="2024-Q2" ${s.reportPeriod==='2024-Q2'?'selected':''}>2º trimestre de 2024</option><option value="2024" ${s.reportPeriod==='2024'?'selected':''}>Ano de 2024</option><option value="all" ${s.reportPeriod==='all'?'selected':''}>Todo o projeto</option></select></label><button type="button" class="report-toolbar-button report-export" data-report-export>${ico('file-down')} Exportar CSV</button><button type="button" class="report-toolbar-button report-print" data-report-print>${ico('printer')} Imprimir</button></div><glass-card class="float-card reports-main"><div class="card-head"><div><h3>${ico(selected.icon)} ${esc(selected.label)}</h3><small>${esc(selected.description)}</small></div><span class="chip violet">${esc(period)} · Atualizado agora</span></div><div class="report-context"><span>${ico('database')} Fonte: ${esc(selected.source)}</span><span>${esc(selected.family)} · relatório gerencial</span></div><div class="report-grid">${selected.metrics.map(metric=>`<div class="report-metric"><small>${esc(metric[0])}</small><strong>${esc(metric[1])}</strong><span>${esc(metric[2])}</span></div>`).join('')}</div><div class="report-table-wrap"><table class="report-table"><thead><tr>${selected.columns.map(column=>`<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${selected.rows.map(row=>`<tr>${row.map((cell,index)=>`<td>${index===row.length-1?`<span class="report-signal ${signalClass(cell)}">${esc(cell)}</span>`:esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="report-footer"><span>${ico('link-2')} Relacionado às tabelas do projeto e ao período selecionado.</span><button type="button" class="report-inline-export" data-report-export>${ico('download')} Baixar relatório</button></div></glass-card></div>`;
  }
  settings(){ return `<glass-card class="float-card settings-card"><h3>${ico('settings')} Configurações</h3><p>Configuração local da PWA e integração opcional com GitHub.</p><button id="reinstall">Reabrir instalação</button><button id="clearPat">Limpar PAT local</button></glass-card>`; }
}

// A visão geral de etapas usa o mesmo gesto de relação do canvas dedicado:
// porta lateral → linha Bézier → outro card ou formulário de nova atividade.
ViewLayer.prototype.addActivityNodes = function(){
  const canvas=this.querySelector('.stage-canvas');
  if(!canvas||canvas.querySelector('.activity-layer'))return;
  const layer=document.createElement('div');
  layer.className='activity-layer';
  layer.innerHTML=`<div class="activity-layer-title">ATIVIDADES RELACIONADAS <small>Arraste o card para mover · arraste ● para conectar</small></div>
    <article class="activity-node workflow-card" data-node-id="overview-act-drenagem" data-activity-id="act-drenagem" data-stage="Drenagem Pluvial" style="left:34px;top:560px"><span class="activity-kind">ATIVIDADE · DRENAGEM</span><strong>Executar rede principal</strong><small>Responsável: Carlos Mendes · 82%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-bocas" data-activity-id="act-bocas" data-stage="Drenagem Pluvial" style="left:310px;top:590px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar bocas de lobo</strong><small>Dependência: rede principal</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-pav" data-activity-id="act-pav" data-stage="Pavimentação" style="left:590px;top:790px"><span class="activity-kind">ATIVIDADE · PAVIMENTAÇÃO</span><strong>Liberar frente de pavimentação</strong><small>Aguardando drenagem · 35%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <svg class="activity-edges" aria-hidden="true"></svg>`;
  canvas.appendChild(layer);

  const nodes=[...layer.querySelectorAll('.workflow-card')];
  const relations=[{from:nodes[0],to:nodes[2],label:'Drenagem → Pavimentação'}];
  const point=(clientX,clientY)=>{const rect=canvas.getBoundingClientRect();return {x:clientX-rect.left+canvas.scrollLeft,y:clientY-rect.top+canvas.scrollTop};};
  const anchor=(node,side='out')=>({x:node.offsetLeft+(side==='in'?0:node.offsetWidth),y:node.offsetTop+node.offsetHeight/2});
  const curve=(x1,y1,x2,y2)=>{const bend=Math.max(56,Math.min(190,Math.abs(x2-x1)*.45));return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;};
  const svg=layer.querySelector('.activity-edges');
  const draw=()=>{
    svg.innerHTML='';
    layer.querySelectorAll('.overview-relation-label').forEach(label=>label.remove());
    relations.forEach((rel,index)=>{
      if(!rel.from.isConnected||!rel.to.isConnected)return;
      const from=anchor(rel.from,'out'),to=anchor(rel.to,'in');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.classList.add('activity-edge'); path.dataset.relationIndex=String(index); path.setAttribute('d',curve(from.x,from.y,to.x,to.y)); svg.appendChild(path);
      const label=document.createElement('button');
      label.type='button'; label.className='activity-relation overview-relation-label'; label.dataset.relationIndex=String(index); label.textContent=rel.label;
      label.style.left=`${Math.max(18,(from.x+to.x)/2-70)}px`; label.style.top=`${Math.max(520,(from.y+to.y)/2-12)}px`;
      label.title='Editar rótulo da relação';
      label.addEventListener('click',event=>{event.stopPropagation();const next=prompt('Rótulo da relação:',rel.label);if(next?.trim()){rel.label=next.trim();draw();}});
      layer.appendChild(label);
    });
  };
  const bindNodeDrag=node=>{
    if(node.dataset.overviewDragBound)return;
    node.dataset.overviewDragBound='true';
    node.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.surface-port,.activity-connect'))return;
      event.preventDefault(); event.stopPropagation();
      const origin={x:event.clientX,y:event.clientY},initial={x:node.offsetLeft,y:node.offsetTop}; let moved=false;
      const move=ev=>{const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;if(!moved&&Math.hypot(dx,dy)<2)return;moved=true;node.classList.add('dragging');node.style.left=`${Math.max(8,initial.x+dx)}px`;node.style.top=`${Math.max(520,initial.y+dy)}px`;draw();};
      const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);node.classList.remove('dragging');if(moved){node.dataset.dragged='true';setTimeout(()=>delete node.dataset.dragged,120);appStore.set({lastAction:`Reposicionou atividade ${node.querySelector('strong')?.textContent||''}`});}};
      node.setPointerCapture?.(event.pointerId); window.addEventListener('pointermove',move); window.addEventListener('pointerup',finish,{once:true}); window.addEventListener('pointercancel',finish,{once:true});
    });
  };
  nodes.forEach(bindNodeDrag);
  const targetAt=(clientX,clientY)=>{const target=document.elementFromPoint(clientX,clientY)?.closest('.workflow-card');return target&&canvas.contains(target)?target:null;};
  const addRelation=(from,to,label='depende de')=>{if(!from||!to||from===to||relations.some(rel=>rel.from===from&&rel.to===to))return;relations.push({from,to,label});draw();};
  const showNewActivityForm=(source,clientX,clientY)=>{
    const drop=point(clientX,clientY),form=document.createElement('form'); form.className='workflow-drop-form'; form.style.left=`${Math.max(12,drop.x-64)}px`; form.style.top=`${Math.max(520,drop.y-18)}px`;
    const options=activityCatalog.slice(0,8).map(item=>`<option value="${esc(item.name)}">${esc(item.nature)} · ${esc(item.name)}</option>`).join('');
    form.innerHTML=`<b>Nova atividade conectada</b><small>Origem: ${esc(source.querySelector('strong')?.textContent||'atividade')}</small><label>Categoria<select name="categoria">${options}</select></label><label>Nome da atividade<input name="nome" required placeholder="Ex.: Validar execução da frente"></label><label>Tempo previsto <input name="horas" type="number" min="0.5" step="0.5" value="4"> h</label><div class="workflow-drop-actions"><button type="button" data-cancel>Cancelar</button><button type="submit">Criar e conectar</button></div>`;
    canvas.appendChild(form); form.querySelector('[data-cancel]')?.addEventListener('click',()=>form.remove());
    form.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form),category=activityCatalog.find(item=>item.name===data.get('categoria')),card=document.createElement('article');card.className='activity-node workflow-card';card.dataset.nodeId=`overview-workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;card.dataset.stage=category?.nature||'Nova atividade';card.style.left=`${Math.max(12,drop.x-64)}px`;card.style.top=`${Math.max(520,drop.y-18)}px`;card.innerHTML=`<span class="activity-kind">${esc(category?.nature||'NOVA ATIVIDADE')}</span><strong>${esc(String(data.get('nome')||category?.name||'Nova atividade').trim())}</strong><small>${esc(data.get('horas')||4)} hora(s) previstas · responsável a definir</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span>`;form.replaceWith(card);bindNodeDrag(card);nodes.push(card);addRelation(source,card,'gera');notify('Card criado e conectado à atividade de origem.','success');});
    form.querySelector('input[name="nome"]')?.focus();
  };
  canvas.addEventListener('pointerdown',event=>{
    const port=event.target.closest('.surface-port,.activity-connect'); if(!port||event.button!==0)return;
    const source=port.closest('.workflow-card'); if(!source)return;
    event.preventDefault(); event.stopImmediatePropagation(); port.setPointerCapture?.(event.pointerId); source.classList.add('relation-source','connection-dragging');
    const ghost=document.createElement('div'); ghost.className='connection-ghost connection-ghost-card'; ghost.innerHTML='<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>'; canvas.appendChild(ghost); let target=null;
    const preview=(ev)=>{target=targetAt(ev.clientX,ev.clientY);nodes.forEach(node=>node.classList.toggle('relation-target',node===target&&node!==source));const from=anchor(source,'out'),to=target&&target!==source?anchor(target,'in'):point(ev.clientX,ev.clientY),path=svg.querySelector('.overview-connection-preview')||document.createElementNS('http://www.w3.org/2000/svg','path');path.classList.add('activity-edge','overview-connection-preview');path.setAttribute('d',curve(from.x,from.y,to.x,to.y));if(!path.parentNode)svg.appendChild(path);const p=point(ev.clientX,ev.clientY);ghost.style.left=`${Math.max(12,p.x+14)}px`;ghost.style.top=`${Math.max(520,p.y+14)}px`;};
    const finish=ev=>{window.removeEventListener('pointermove',preview);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);port.releasePointerCapture?.(event.pointerId);svg.querySelector('.overview-connection-preview')?.remove();nodes.forEach(node=>node.classList.remove('relation-target'));source.classList.remove('relation-source','connection-dragging');ghost.remove();const finalTarget=targetAt(ev.clientX,ev.clientY);if(finalTarget&&finalTarget!==source){addRelation(source,finalTarget,'depende de');notify('Linha de relacionamento criada. Clique no rótulo para editar.','success');}else showNewActivityForm(source,ev.clientX,ev.clientY);};
    window.addEventListener('pointermove',preview); window.addEventListener('pointerup',finish,{once:true}); window.addEventListener('pointercancel',finish,{once:true}); preview(event);
  },true);
  draw();
};

// Conexões do canvas: um único gesto pointer-based para cards existentes e novos.
// Fica fora da classe para substituir o handler legado sem reescrever o bloco
// minificado de compatibilidade que ainda existe no arquivo.
ViewLayer.prototype.bindGhostConnections = function(){
  const canvas=this.querySelector('.dedicated-canvas');
  if(!canvas||canvas.dataset.pointerConnections)return;
  const svg=canvas.querySelector('.surface-edges');
  if(!svg)return;
  canvas.dataset.pointerConnections='true';

  const point=(clientX,clientY)=>{
    const rect=canvas.getBoundingClientRect();
    return {x:clientX-rect.left+canvas.scrollLeft,y:clientY-rect.top+canvas.scrollTop};
  };
  const anchor=(node,side='out')=>{
    const x=node.offsetLeft+(side==='in'?0:node.offsetWidth);
    return {x,y:node.offsetTop+node.offsetHeight/2};
  };
  const curve=(x1,y1,x2,y2)=>{
    const bend=Math.max(56,Math.min(190,Math.abs(x2-x1)*.45));
    return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;
  };
  const targetAt=(clientX,clientY)=>{
    const node=document.elementFromPoint(clientX,clientY)?.closest('.workflow-card');
    return node&&canvas.contains(node)?node:null;
  };
  const preview=(source,clientX,clientY,target)=>{
    svg.querySelector('.connection-preview')?.remove();
    const from=anchor(source,'out'),to=target?anchor(target,'in'):point(clientX,clientY);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.classList.add('surface-edge','connection-preview');
    path.setAttribute('d',curve(from.x,from.y,to.x,to.y));
    svg.appendChild(path);
  };
  const relation=(from,to,label='depende de')=>{
    if(!from||!to||from===to)return;
    const duplicate=[...canvas.querySelectorAll('.surface-relation')].some(item=>item.dataset.from===from.dataset.nodeId&&item.dataset.to===to.dataset.nodeId);
    if(duplicate)return;
    const rel=document.createElement('span');
    rel.className='surface-relation';
    rel.dataset.from=from.dataset.nodeId;
    rel.dataset.to=to.dataset.nodeId;
    rel.dataset.label=label;
    canvas.appendChild(rel);
    this.drawSurfaceRelations(canvas);
  };
  const clearState=(source,target,ghost)=>{
    source?.classList.remove('relation-source','connection-dragging');
    target?.classList.remove('relation-target');
    ghost?.remove();
    svg.querySelector('.connection-preview')?.remove();
  };
  const showNewActivityForm=(source,clientX,clientY)=>{
    const drop=point(clientX,clientY);
    const form=document.createElement('form');
    form.className='workflow-drop-form';
    form.style.left=`${Math.max(12,drop.x-64)}px`;
    form.style.top=`${Math.max(76,drop.y-18)}px`;
    const options=activityCatalog.slice(0,8).map(item=>`<option value="${esc(item.name)}">${esc(item.nature)} · ${esc(item.name)}</option>`).join('');
    form.innerHTML=`<b>Nova atividade conectada</b><small>Origem: ${esc(source.querySelector('strong')?.textContent||'atividade')}</small><label>Categoria<select name="categoria">${options}</select></label><label>Nome da atividade<input name="nome" required placeholder="Ex.: Validar execução da frente"></label><label>Tempo previsto <input name="horas" type="number" min="0.5" step="0.5" value="4"> h</label><div class="workflow-drop-actions"><button type="button" data-cancel>Cancelar</button><button type="submit">Criar e conectar</button></div>`;
    canvas.appendChild(form);
    form.querySelector('[data-cancel]')?.addEventListener('click',()=>form.remove());
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const data=new FormData(form),category=activityCatalog.find(item=>item.name===data.get('categoria'));
      const name=String(data.get('nome')||category?.name||'Nova atividade').trim();
      const card=document.createElement('button');
      card.type='button';
      card.className='dedicated-activity workflow-card';
      card.dataset.nodeId=`workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;
      card.dataset.hours=String(data.get('horas')||4);
      card.style.left=`${Math.max(12,drop.x-64)}px`;
      card.style.top=`${Math.max(76,drop.y-18)}px`;
      card.style.width='154px';
      card.innerHTML=`<span class="activity-kind">${esc(category?.nature||'NOVA ATIVIDADE')}</span><strong>${esc(name)}</strong><small>${esc(data.get('horas')||4)} hora(s) previstas · responsável a definir</small><em>Preencher campos →</em><span class="surface-port" title="Arrastar para conectar">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
      form.replaceWith(card);
      this.makeSurfaceDrag(card,canvas);
      this.bindWorkflowFieldTrees();
      relation(source,card,'gera');
      notify('Card criado e conectado à atividade de origem.','success');
    });
    form.querySelector('input[name="nome"]')?.focus();
  };
  // Impede o antigo listener de clique da primeira renderização de disputar o gesto.
  canvas.addEventListener('click',event=>{
    if(event.target.closest('.surface-port')){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  canvas.addEventListener('pointerdown',event=>{
    const port=event.target.closest('.surface-port');
    if(!port||event.button!==0)return;
    const source=port.closest('.workflow-card');
    if(!source)return;
    event.preventDefault();
    event.stopPropagation();
    port.setPointerCapture?.(event.pointerId);
    source.classList.add('relation-source','connection-dragging');
    const ghost=document.createElement('div');
    ghost.className='connection-ghost connection-ghost-card';
    ghost.innerHTML='<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>';
    canvas.appendChild(ghost);
    let target=null;
    const move=ev=>{
      target=targetAt(ev.clientX,ev.clientY);
      canvas.querySelectorAll('.workflow-card').forEach(card=>card.classList.toggle('relation-target',card===target&&card!==source));
      const p=point(ev.clientX,ev.clientY);
      ghost.style.left=`${Math.max(12,p.x+14)}px`;
      ghost.style.top=`${Math.max(76,p.y+14)}px`;
      preview(source,ev.clientX,ev.clientY,target&&target!==source?target:null);
    };
    const finish=ev=>{
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',finish);
      window.removeEventListener('pointercancel',finish);
      port.releasePointerCapture?.(event.pointerId);
      const finalTarget=targetAt(ev.clientX,ev.clientY);
      clearState(source,finalTarget,ghost);
      if(finalTarget&&finalTarget!==source){
        relation(source,finalTarget,'depende de');
        notify('Linha de relacionamento criada. Clique no rótulo para editar.','success');
      }else{
        showNewActivityForm(source,ev.clientX,ev.clientY);
        notify('Defina a nova atividade conectada.');
      }
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',finish,{once:true});
    window.addEventListener('pointercancel',finish,{once:true});
    move(event);
  },true);
};

const dashboardFilters=[
  ['execution','Execução Atual','activity','drenagem'],
  ['collaborators','Colaboradores','users','terraplanagem'],
  ['schedule','Cronograma','calendar-clock','pavimentacao'],
  ['leads','Leads','users-round','urbanizacao'],
  ['materials','Materiais','boxes','rede-agua'],
  ['risks','Riscos','triangle-alert','rede-eletrica']
];

export class MapFilterRail extends HTMLElement {
  connectedCallback(){this.render();}
  render(){
    const active=appStore.get().mapFilter||'execution';
    this.innerHTML=`<div class="map-filter-rail-head"><span>FILTROS DO MAPA</span><small>Selecione uma utilidade para destacar a área correspondente</small></div><div class="map-filter-rail-items">${dashboardFilters.map(([key,label,icon])=>`<button type="button" class="map-filter-chip ${active===key?'active':''}" data-map-filter="${key}">${ico(icon)}<span>${label}</span></button>`).join('')}</div>`;
    this.querySelectorAll('[data-map-filter]').forEach(button=>button.addEventListener('click',()=>this.select(button.dataset.mapFilter)));
    window.lucide?.createIcons();
  }
  select(key){
    const filter=dashboardFilters.find(item=>item[0]===key)||dashboardFilters[0];
    const map=document.querySelector('map-scene:not([compact])');
    appStore.set({mapFilter:key,lastAction:`Filtrou mapa por ${filter[1]}`});
    map?.setStageOverlay(filter[3],false);
    this.render();
  }
}
customElements.define('map-filter-rail',MapFilterRail);

ViewLayer.prototype.assistant=function(){
  const m=demoData.metrics;
  return `<div class="dashboard-home"><div class="scene-title dashboard-title"><span>IA · Belavista</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card dashboard-ai-panel"><div class="dashboard-panel-title"><span class="ai-logo">✦</span><div><h2>IA · Belavista</h2><small>Resumo operacional atualizado</small></div></div><p class="dashboard-greeting">Bom dia, Warley. 👋</p><p>Este é o resumo do empreendimento com base nos dados de hoje.</p><div class="dashboard-kpis"><div><b>${m.completeness||63}%</b><small>Completude<br>geral</small></div><div><b>${m.delayed}</b><small>Etapas<br>atrasadas</small></div><div><b>${m.criticalPurchases}</b><small>Compras<br>críticas</small></div><div><b>${m.review}</b><small>Pendências<br>de revisão</small></div></div><h3 class="dashboard-question">O que você deseja acompanhar agora?</h3><div class="dashboard-quick-actions"><button data-view="stages">${ico('calendar-check')} Ver etapas críticas</button><button data-view="inventory">${ico('package-check')} Ver compras necessárias</button><button data-view="stages">${ico('calendar-range')} Ver cronograma de atividades</button><button data-view="leads">${ico('user-round-search')} Ver leads hoje</button><button data-view="records">${ico('clipboard-pen-line')} Registrar andamento</button><button data-view="map">${ico('layers-3')} Abrir mapa de completude</button></div><div class="dashboard-prompt">Pergunte algo ou dê um comando…<span>↗</span></div><small class="dashboard-example">Ex.: “Adicionar compra de 20 postes para a rede elétrica”</small></glass-card><glass-card class="float-card dashboard-completion-card"><div class="card-head"><h3>${ico('layers-3')} Mapa de completude</h3><button class="card-close" aria-label="Ocultar card">×</button></div><small>Setores destacados conforme o filtro ativo</small><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">${ico('scan-search')} Ver detalhes</button></glass-card><glass-card class="float-card dashboard-collab-card"><h3>${ico('users')} Colaboradores ativos</h3><div class="dashboard-stat-row"><b>${m.collaborators}</b><span>Hoje no canteiro</span></div><div class="dashboard-stat-row"><b>8</b><span>Em atividades externas</span></div><div class="dashboard-stat-row"><b>5</b><span>Equipamentos em uso</span></div><button data-view="collaborators">${ico('users-round')} Ver equipe</button></glass-card><glass-card class="float-card dashboard-schedule-card"><div class="card-head"><h3>${ico('calendar-days')} Cronograma de atividades</h3><button class="card-close" aria-label="Ocultar card">×</button></div><small>Semana 18 · 28/04 — 04/05</small><div class="dashboard-week"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><div class="dashboard-list"><span>12 atividades planejadas</span><span>8 em andamento</span><span>2 atrasadas</span></div><button data-view="stages">${ico('external-link')} Ver cronograma</button></glass-card><glass-card class="float-card dashboard-leads-card"><div class="card-head"><h3>${ico('users-round')} Leads dos últimos 7 dias</h3><button class="card-close" aria-label="Ocultar card">×</button></div><div class="dashboard-sparkline">⌁⌃⌁⌃⌁⌃⌁⌃</div><div class="dashboard-lead-stats"><span><b>${m.leads}</b><small>Total de leads</small></span><span><b>A12, A15, B07</b><small>Mais procurados</small></span></div><button data-view="leads">${ico('external-link')} Ver leads</button></glass-card><glass-card class="float-card dashboard-purchases-card"><div class="card-head"><h3>${ico('shopping-cart')} Compras críticas</h3><button class="card-close" aria-label="Ocultar card">×</button></div><strong>Postes de concreto 11m</strong><div class="dashboard-purchase-metrics"><span>Estoque atual <b>12 un.</b></span><span>Necessário <b>20 un.</b></span><span>Déficit <b class="danger">8 un.</b></span></div><p>Previsão de entrega: 3 dias</p><button data-view="inventory">${ico('external-link')} Ver compras</button></glass-card><div class="dashboard-action-bar"><button data-view="stages">${ico('bot')} Explicar atrasos</button><button data-view="stages">${ico('wand-sparkles')} Sugerir próximos passos</button><button data-view="reports">${ico('triangle-alert')} Ver riscos</button><button data-view="reports">${ico('file-chart-column')} Resumo executivo</button></div><map-filter-rail></map-filter-rail></div>`;
};

ViewLayer.prototype.leads=function(){
  const s=appStore.get().selectedLead,lead=demoData.leads[s];
  return `<div class="kpi-strip"><stat-pill icon="users" label="Intenções cadastradas" value="238" tone="violet" sub="+28 hoje"></stat-pill><stat-pill icon="map-pin" label="Lotes com interesse" value="96" tone="blue"></stat-pill><stat-pill icon="phone" label="Leads em contato" value="61" tone="teal"></stat-pill><stat-pill icon="badge-check" label="Qualificados" value="37" tone="amber"></stat-pill></div><public-lead-form></public-lead-form><glass-card class="float-card lead-detail"><h3>${ico('user-round-search')} Lead selecionado</h3><div class="person"><span class="avatar">${lead.name[0]}</span><div><strong>${lead.name}</strong><small>${lead.status}</small></div></div><dl><dt>Lote desejado</dt><dd>${lead.lot}</dd><dt>Faixa de valor</dt><dd>${lead.budget}</dd><dt>Nascer do sol</dt><dd>${lead.sun}</dd><dt>Altitude</dt><dd>${lead.altitude}</dd><dt>Terreno</dt><dd>${lead.terrain}</dd><dt>Objetivo</dt><dd>${lead.objective}</dd></dl></glass-card><glass-card class="float-card lot-intents"><h3>${ico('users-round')} Intenções relacionadas</h3>${demoData.leads.map((x,i)=>`<button class="lead-row ${i===s?'selected':''}" data-lead="${i}"><span class="avatar">${x.name[0]}</span><span><b>${x.name}</b><small>${x.lot} · ${x.budget}</small></span><em>${x.status}</em></button>`).join('')}</glass-card>`;
};

ViewLayer.prototype.records=function(){
  const s=appStore.get(), filters={entity:'records',stage:'all',activity:'all',category:'all',responsible:'all',purchase:'all',query:'',...(s.recordFilters||{})};
  const records=s.records||[], unique=(values)=>[...new Set(values.filter(Boolean))], activityNames=unique([...demoData.activities.map(item=>item.name),...records.map(item=>item.atividade)]), stageNames=unique([...demoData.activities.map(item=>item.name),...records.map(item=>item.etapa)]), responsibleNames=unique([...demoData.collaborators.map(item=>item[0]),...records.map(item=>item.responsavel)]), categories=unique(activityCatalog.map(item=>item.nature)), purchases=demoData.purchases;
  const categoryOf=(record)=>activityCatalog.find(item=>String(record.atividade||'').toLowerCase().includes(String(item.name||'').toLowerCase()))?.nature||record.categoria||'Execução operacional';
  const entityMatch=(record)=>{const text=JSON.stringify(record).toLowerCase(), entity=filters.entity; if(entity==='all'||entity==='records')return true; if(entity==='projects')return Boolean(record.obra); if(entity==='stages')return Boolean(record.etapa||record.atividade); if(entity==='activities')return Boolean(record.atividade); if(entity==='collaborators')return Boolean(record.responsavel); if(entity==='materials')return /tubo|cimento|brita|areia|material|m[eé]dica/i.test(text); if(entity==='purchases')return /pe-|compra|fornecedor|poste|tubo|concreto/i.test(text); if(entity==='leads')return /lead|lote|interesse|cliente/i.test(text); if(entity==='activity_relations')return Boolean(record.atividade&&record.etapa); if(entity==='audit_events')return Boolean(record.updatedAt||record.createdAt); return true;};
  const filtered=records.filter(record=>{const text=JSON.stringify(record).toLowerCase(), q=String(filters.query||'').trim().toLowerCase(), purchase=String(filters.purchase||'all'); return entityMatch(record)&&(!q||text.includes(q))&&(filters.stage==='all'||record.etapa===filters.stage)&&(filters.activity==='all'||record.atividade===filters.activity)&&(filters.category==='all'||categoryOf(record)===filters.category)&&(filters.responsible==='all'||record.responsavel===filters.responsible)&&(purchase==='all'||text.includes(purchase.toLowerCase()));});
  const selected=records.find(record=>record.id===s.selectedRecord), photo=selected?.evidenceUri||'./assets/reference/dashboard.png';
  const opt=(value,label,current)=>`<option value="${esc(value)}" ${current===value?'selected':''}>${esc(label)}</option>`;
  const cards=filtered.map(record=>`<article class="record-card" data-record-open="${esc(record.id)}" tabindex="0" role="button"><div class="record-main"><span class="record-id">${esc(record.id)}</span><span class="record-category">${esc(categoryOf(record))}</span><strong>${esc(record.atividade||'Registro operacional')}</strong><small>${esc(record.data)} · ${esc(record.hora)} · ${esc(record.responsavel||'A definir')}</small><small>${esc(record.obra||'Aliança Park')} · ${esc(record.etapa||'Etapa não vinculada')}</small></div><img class="record-thumb" src="${esc(record.evidenceUri||'./assets/reference/dashboard.png')}" alt="Evidência de ${esc(record.atividade||'atividade')}" loading="lazy"><span class="record-status">${esc(record.status)}</span><div class="record-actions"><button data-record-edit="${esc(record.id)}">Editar</button><button data-record-delete="${esc(record.id)}">Excluir</button><button data-record-open="${esc(record.id)}">Abrir drill-in</button></div></article>`).join('');
  const detail=selected?`<aside class="record-detail"><div class="record-detail-head"><div><span class="activity-kind">DRILL-IN · ${esc(selected.id)}</span><h2>${esc(selected.atividade||'Registro operacional')}</h2></div><button type="button" data-record-close aria-label="Fechar detalhes">×</button></div><div class="record-detail-meta"><span>${esc(selected.status)}</span><small>${esc(selected.data)} · ${esc(selected.hora)}</small></div><img class="record-evidence" src="${esc(photo)}" alt="Foto ou evidência do registro"><div class="record-detail-grid"><div><small>OBRA</small><b>${esc(selected.obra||'Aliança Park')}</b></div><div><small>ETAPA</small><b>${esc(selected.etapa||'Não vinculada')}</b></div><div><small>CATEGORIA</small><b>${esc(categoryOf(selected))}</b></div><div><small>RESPONSÁVEL</small><b>${esc(selected.responsavel||'A definir')}</b></div><div><small>ATIVIDADE</small><b>${esc(selected.atividade||'Não vinculada')}</b></div><div><small>COMPRA / EVIDÊNCIA</small><b>${selected.evidenceUri?'Foto anexada':'Evidência padrão disponível'}</b></div></div><p class="record-detail-copy">${esc(selected.detalhes||'Sem observações registradas.')}</p><div class="record-detail-actions"><button data-record-edit="${esc(selected.id)}">Editar registro</button><button data-record-delete="${esc(selected.id)}">Excluir registro</button></div></aside>`:'<aside class="record-detail record-detail-empty"><span class="activity-kind">DRILL-IN DE REGISTROS</span><h2>Selecione um item</h2><p>Clique em qualquer registro para abrir fotos, evidências, relações e os dados completos da atividade.</p></aside>';
  queueMicrotask(()=>this.bindRecords?.());
  return `<div class="records-page"><div class="records-map-wash" aria-hidden="true"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-toolbar" aria-label="Filtros de registros"><label>Categoria de visualização<select data-record-filter="entity">${opt('records','Registros operacionais',filters.entity)}${opt('all','Todas as entidades',filters.entity)}${opt('projects','Obras',filters.entity)}${opt('stages','Etapas',filters.entity)}${opt('activities','Atividades',filters.entity)}${opt('collaborators','Colaboradores',filters.entity)}${opt('materials','Materiais',filters.entity)}${opt('purchases','Compras',filters.entity)}${opt('leads','Leads',filters.entity)}${opt('activity_relations','Relações de atividades',filters.entity)}${opt('audit_events','Auditoria',filters.entity)}</select></label><label>Etapa<select data-record-filter="stage">${opt('all','Todas as etapas',filters.stage)}${stageNames.map(value=>opt(value,value,filters.stage)).join('')}</select></label><label>Atividade<select data-record-filter="activity">${opt('all','Todas as atividades',filters.activity)}${activityNames.map(value=>opt(value,value,filters.activity)).join('')}</select></label><label>Categoria específica<select data-record-filter="category">${opt('all','Todas as categorias',filters.category)}${categories.map(value=>opt(value,value,filters.category)).join('')}</select></label><label>Responsável<select data-record-filter="responsible">${opt('all','Todos os responsáveis',filters.responsible)}${responsibleNames.map(value=>opt(value,value,filters.responsible)).join('')}</select></label><label>Compra relacionada<select data-record-filter="purchase">${opt('all','Todas as compras',filters.purchase)}${purchases.map(item=>opt(item.id,`${item.id} · ${item.desc}`,filters.purchase)).join('')}</select></label><label class="records-search">Buscar<input data-record-filter="query" value="${esc(filters.query)}" placeholder="ID, detalhe, fornecedor…"></label><button type="button" class="records-clear-filters" data-record-clear>Limpar filtros</button></div><div class="records-layout"><section class="records-list records-report-area"><div class="records-list-head"><div><b>Relatório de registros</b><small>${filtered.length} de ${records.length} itens · passe o mouse para revelar o mapa</small></div><span class="records-scope">${esc(filters.entity==='all'?'Todas as tabelas':filters.entity)}</span></div>${cards||'<div class="empty-records">Nenhum registro corresponde aos filtros atuais.</div>'}</section>${detail}<aside class="records-form-wrap ${s.editingRecord?'open':''}"><form class="record-form"><h2>${s.editingRecord?'Editar registro':'Adicionar registro'}</h2><label>Obra<select name="obra">${opt('Aliança Park','Aliança Park',s.records.find(r=>r.id===s.editingRecord)?.obra)}${opt('Belavista','Belavista',s.records.find(r=>r.id===s.editingRecord)?.obra)}</select></label><label>Atividade<select name="atividade">${activityNames.map(value=>opt(value,value,s.records.find(r=>r.id===s.editingRecord)?.atividade)).join('')}</select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${esc(s.records.find(r=>r.id===s.editingRecord)?.data||new Date().toISOString().slice(0,10))}"></label><label>Hora<input name="hora" type="time" value="${esc(s.records.find(r=>r.id===s.editingRecord)?.hora||'08:30')}"></label></div><label>Responsável<select name="responsavel">${opt('','A definir',s.records.find(r=>r.id===s.editingRecord)?.responsavel||'')}${responsibleNames.map(value=>opt(value,value,s.records.find(r=>r.id===s.editingRecord)?.responsavel)).join('')}</select></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${esc(s.records.find(r=>r.id===s.editingRecord)?.detalhes||'')}</textarea></label><label>Foto / evidência<input name="evidenceUri" value="${esc(s.records.find(r=>r.id===s.editingRecord)?.evidenceUri||'')}" placeholder="URL local ou caminho da foto"></label><label>Status<select name="status">${opt('Pendente','Pendente',s.records.find(r=>r.id===s.editingRecord)?.status)}${opt('Concluído','Concluído',s.records.find(r=>r.id===s.editingRecord)?.status)}</select></label><button class="record-confirm">${s.editingRecord?'Salvar alterações':'Confirmar registro'}</button>${s.editingRecord?'<button type="button" class="record-cancel">Cancelar</button>':''}</form></aside></div><div class="records-filter-foot"><span>Relacionamentos ativos: etapas · atividades · responsáveis · materiais · compras · evidências</span><span>${s.editingRecord?'Editando '+esc(s.editingRecord):'Clique em um card para abrir o drill-in'}</span></div></div></div>`;
};

ViewLayer.prototype.bindRecords=function(){
  const page=this.querySelector('.records-page'); if(!page||page.dataset.bound)return; page.dataset.bound='true';
  page.querySelectorAll('[data-record-filter]').forEach(control=>control.addEventListener('change',event=>{const key=event.currentTarget.dataset.recordFilter,recordFilters={...(appStore.get().recordFilters||{}),[key]:event.currentTarget.value};appStore.set({recordFilters});}));
  page.querySelector('[data-record-clear]')?.addEventListener('click',()=>appStore.set({recordFilters:{entity:'records',stage:'all',activity:'all',category:'all',responsible:'all',purchase:'all',query:''},selectedRecord:null}));
  page.querySelectorAll('.record-card[data-record-open]').forEach(card=>card.addEventListener('click',event=>{if(event.target.closest('button'))return;appStore.set({selectedRecord:card.dataset.recordOpen,lastAction:`Abriu drill-in do registro ${card.dataset.recordOpen}`});}));
  page.querySelectorAll('.record-card[data-record-open]').forEach(card=>card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();appStore.set({selectedRecord:card.dataset.recordOpen});}}));
  page.querySelectorAll('.record-actions [data-record-open]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();appStore.set({selectedRecord:button.dataset.recordOpen,lastAction:`Abriu drill-in do registro ${button.dataset.recordOpen}`});}));
  page.querySelector('[data-record-close]')?.addEventListener('click',()=>appStore.set({selectedRecord:null}));
};

// The stage utility session belongs to the stage header, before the free
// activity surface. The old generated activity buttons are legacy duplicates;
// the activity-layer below is the functional relation surface that remains.
const viewLayerAddStageUtilities = ViewLayer.prototype.addStageUtilities;
ViewLayer.prototype.addStageUtilities=function(){
  viewLayerAddStageUtilities.call(this);
  this.querySelectorAll('.stage-activity-card').forEach(card=>card.remove());
  const shell=this.querySelector('.stage-shell'),panel=shell?.querySelector('.stage-utilities'),body=shell?.querySelector('.stage-body');
  if(panel&&body)body.before(panel);
};

// Each stage keeps its operational views in one compact tab bar. The canvas
// remains the primary free surface, while the other panes expose the same
// stage data as schedule, agenda, and actionable to-dos.
ViewLayer.prototype.splitStageTabs=function(){
  const panel=this.querySelector('.stage-utilities');
  if(!panel||panel.dataset.split)return;
  const tabs=panel.querySelector('.utility-tabs');
  const content=panel.querySelector('.utility-content');
  if(!tabs||!content)return;
  panel.dataset.split='true';

  const agendaPane=document.createElement('div');
  agendaPane.className='utility-pane';
  agendaPane.dataset.pane='agenda';
  agendaPane.append(...Array.from(content.childNodes));

  tabs.innerHTML=`
    <button class="utility-tab active" type="button" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma</button>
    <button class="utility-tab" type="button" data-utility-tab="agenda">${ico('calendar-days')} Agenda</button>
    <button class="utility-tab" type="button" data-utility-tab="canvas">${ico('workflow')} Canvas organizacional</button>
    <button class="utility-tab" type="button" data-utility-tab="afazeres">${ico('list-checks')} A Fazeres</button>`;
  content.replaceChildren();

  const cronogramaPane=document.createElement('div');
  cronogramaPane.className='utility-pane';
  cronogramaPane.dataset.pane='cronograma';
  cronogramaPane.innerHTML=`<div class="timeline-utility">
    <span class="activity-kind">CRONOGRAMA DA ETAPA</span>
    <h3>Dependências e marcos</h3>
    <div class="mini-timeline"><b>Início</b><i></i><b>Medição</b><i></i><b>Validação</b><i></i><b>Conclusão</b></div>
    <p>Visualização dos marcos previstos e das dependências da etapa.</p>
  </div>`;

  const canvasPane=document.createElement('div');
  canvasPane.className='utility-pane utility-canvas-pane';
  canvasPane.dataset.pane='canvas';
  canvasPane.innerHTML=`<div class="utility-canvas-summary">
    <div><span class="activity-kind">CANVAS ORGANIZACIONAL</span><h3>Superfície livre da etapa</h3><p>Use os cards abaixo para criar relações e abrir o fluxo de preenchimento.</p></div>
    <div class="utility-canvas-stats"><b>3</b><small>cards ativos</small><b>2</b><small>relações</small></div>
    <button type="button" class="agenda-action" data-utility-focus="stage-canvas">Ver superfície livre</button>
  </div>`;

  const todoPane=document.createElement('div');
  todoPane.className='utility-pane';
  todoPane.dataset.pane='afazeres';
  const todoLabels=Array.from(agendaPane.querySelectorAll('.todo-grid label')).map(label=>label.cloneNode(true));
  todoPane.innerHTML=`<div class="todo-focus">
    <span class="activity-kind">A FAZERES DA ETAPA</span>
    <h3>Execução diária</h3>
    <p>Itens pendentes, responsáveis e alertas de prazo.</p>
    <div class="todo-grid"></div>
    <button type="button" class="agenda-action utility-add-todo">＋ Adicionar afazer</button>
  </div>`;
  todoPane.querySelector('.todo-grid').append(...todoLabels);

  content.append(cronogramaPane,agendaPane,canvasPane,todoPane);
  const panes=Array.from(content.querySelectorAll('[data-pane]'));
  const show=name=>{
    tabs.querySelectorAll('.utility-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.utilityTab===name));
    panes.forEach(pane=>{pane.hidden=pane.dataset.pane!==name;});
    notify(`${name==='afazeres'?'A fazeres':name[0].toUpperCase()+name.slice(1)} da etapa ativada.`);
  };
  tabs.querySelectorAll('[data-utility-tab]').forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.utilityTab)));
  canvasPane.querySelector('[data-utility-focus]')?.addEventListener('click',()=>{
    this.querySelector('.stage-canvas')?.scrollIntoView({behavior:'smooth',block:'start'});
    notify('Superfície livre da etapa destacada.','success');
  });
  todoPane.querySelector('.utility-add-todo')?.addEventListener('click',()=>{
    const label=prompt('Descreva o novo afazer da etapa:');
    if(!label?.trim())return;
    const item=document.createElement('label');
    item.innerHTML=`<input type="checkbox"> ${esc(label.trim())} <small>Agora · responsável a definir</small>`;
    todoPane.querySelector('.todo-grid').appendChild(item);
    notify('Afazer adicionado à etapa.','success');
  });
  show('cronograma');
};

// Dashboard cards float above the persistent map and can be repositioned
// without changing the map/model scene or triggering a view rerender.
ViewLayer.prototype.bindDashboardCardDrag=function(){
  const home=this.querySelector('.dashboard-home');
  if(!home)return;
  home.querySelectorAll(':scope > .float-card').forEach(card=>{
    if(card.dataset.dashboardDragBound)return;
    card.dataset.dashboardDragBound='true';
    card.style.touchAction='none';
    card.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button,input,textarea,select,a'))return;
      event.preventDefault();
      const parent=home.getBoundingClientRect(),rect=card.getBoundingClientRect();
      const initial={x:rect.left-parent.left,y:rect.top-parent.top},origin={x:event.clientX,y:event.clientY};
      let moved=false;
      const move=ev=>{
        const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
        if(!moved&&Math.hypot(dx,dy)<3)return;
        moved=true;
        const x=Math.max(8,Math.min(Math.max(8,parent.width-card.offsetWidth-8),initial.x+dx));
        const y=Math.max(8,Math.min(Math.max(8,parent.height-card.offsetHeight-8),initial.y+dy));
        card.style.left=`${x}px`;card.style.top=`${y}px`;card.style.right='auto';card.style.bottom='auto';card.style.transform='none';
        card.classList.add('dashboard-card-dragging');
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);
        card.releasePointerCapture?.(event.pointerId);card.classList.remove('dashboard-card-dragging');
        if(moved)notify('Card do mapa reposicionado.');
      };
      card.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});
    });
  });
};

const viewLayerBind = ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){viewLayerBind.call(this);this.bindDashboardCardDrag();};

customElements.define('view-layer', ViewLayer);

export {ico, esc};
