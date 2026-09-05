(()=>{
  'use strict';
  const MARK='BELAVISTA_MAP_WIDGETS_V4';
  if(window.__belavistaMapWidgetsV4)return;
  window.__belavistaMapWidgetsV4=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  let store=null, ViewLayer=null, host=null, openKind=null, stageSubview='stages', renderQueued=false, lastMapRect=null;

  async function bootstrap(){
    for(let i=0;i<120;i++){
      store=window.__belavistaAppStore||null;
      ViewLayer=customElements.get('view-layer')||null;
      if(store&&ViewLayer&&document.querySelector('map-scene[data-persistent-map="true"]'))break;
      await sleep(50);
    }
    if(!store||!ViewLayer){console.error(`[${MARK}] appStore/ViewLayer indisponível`);return;}
    document.getElementById('belavista-map-page-widgets')?.remove();
    ensureHost();
    bindStore();
    positionLauncher();
    render();
    addEventListener('resize',positionLauncher,{passive:true});
    addEventListener('scroll',positionLauncher,{passive:true});
    new ResizeObserver(positionLauncher).observe(document.querySelector('map-scene[data-persistent-map="true"]'));
    new MutationObserver(()=>{ensureHost();positionLauncher();}).observe(document.body,{childList:true,subtree:true});
    console.info(`[${MARK}] ativo`);
  }

  function ensureHost(){
    if(host?.isConnected)return host;
    host=document.getElementById('belavista-hard-map-widgets-v4');
    if(!host){
      host=document.createElement('section');
      host.id='belavista-hard-map-widgets-v4';
      host.dataset.widgetLauncher='v4';
      host.innerHTML='<nav class="map-v4-launcher" aria-label="Ferramentas sobre o mapa"></nav><div class="map-v4-window-layer"></div>';
      document.body.appendChild(host);
      host.addEventListener('click',onClick,true);
      host.addEventListener('submit',onSubmit,true);
      bindDragLayer();
    }
    return host;
  }

  function mapRect(){
    const map=document.querySelector('map-scene[data-persistent-map="true"]');
    if(!map)return null;
    const r=map.getBoundingClientRect();
    if(r.width<80||r.height<80)return null;
    return r;
  }

  function positionLauncher(){
    ensureHost();
    const r=mapRect();
    if(!r){host.hidden=true;return;}
    host.hidden=false;
    lastMapRect=r;
    const nav=host.querySelector('.map-v4-launcher');
    nav.style.left=`${Math.round(r.left+22)}px`;
    nav.style.top=`${Math.round(r.top+18)}px`;
    const layer=host.querySelector('.map-v4-window-layer');
    layer.style.setProperty('--map-left',`${Math.round(r.left)}px`);
    layer.style.setProperty('--map-top',`${Math.round(r.top)}px`);
    layer.style.setProperty('--map-width',`${Math.round(r.width)}px`);
    layer.style.setProperty('--map-height',`${Math.round(r.height)}px`);
  }

  function bindStore(){
    if(window.__belavistaMapWidgetsV4Unsub)return;
    window.__belavistaMapWidgetsV4Unsub=store.subscribe(()=>{
      if(!openKind)return;
      queueRender();
    });
  }

  function queueRender(){
    if(renderQueued)return;
    renderQueued=true;
    queueMicrotask(()=>{renderQueued=false;render();});
  }

  function invoke(name){
    const fn=ViewLayer?.prototype?.[name];
    if(typeof fn!=='function')return `<div class="map-v4-empty">Conteúdo <b>${esc(name)}</b> indisponível nesta versão.</div>`;
    try{return fn.call({});}
    catch(error){console.error(`[${MARK}] ${name}`,error);return `<div class="map-v4-empty">Falha ao montar ${esc(name)}: ${esc(error?.message||error)}</div>`;}
  }

  function stageContent(){
    const name=stageSubview==='stages'?(typeof ViewLayer.prototype.stagesCanvas==='function'?'stagesCanvas':'stages'):stageSubview;
    return invoke(name);
  }

  function render(){
    ensureHost();
    document.getElementById('belavista-map-page-widgets')?.remove();
    const nav=host.querySelector('.map-v4-launcher');
    nav.innerHTML=`
      <button type="button" data-v4-open="stages" class="${openKind==='stages'?'active':''}" title="Etapas da obra sobre o mapa">${icon('waypoints')}<span>Etapas</span></button>
      <button type="button" data-v4-open="records" class="${openKind==='records'?'active':''}" title="Diário da obra sobre o mapa">${icon('notebook-tabs')}<span>Diário</span></button>`;
    const layer=host.querySelector('.map-v4-window-layer');
    if(!openKind){layer.innerHTML='';window.lucide?.createIcons();positionLauncher();return;}
    const saved=readPosition(openKind);
    const style=saved?`left:${saved.left}px!important;top:${saved.top}px!important;right:auto!important;bottom:auto!important;`:'';
    if(openKind==='stages'){
      const tabs=[['stages','Todas as etapas'],['pert','PERT'],['actions','Ações IA'],['raci','RACI'],['raid','RAID']];
      layer.innerHTML=`<section class="map-v4-window map-v4-stages" data-v4-window="stages" style="${style}">
        <header class="map-v4-window-head" data-v4-drag-handle><div><span>ETAPAS DA OBRA</span><h2>${esc(tabs.find(([k])=>k===stageSubview)?.[1]||'Etapas')}</h2><small>Conteúdo da aplicação aberto sobre o mapa do loteamento</small></div><button type="button" data-v4-close aria-label="Fechar">×</button></header>
        <nav class="map-v4-tabs">${tabs.map(([k,l])=>`<button type="button" data-v4-stage-tab="${k}" class="${stageSubview===k?'active':''}">${l}</button>`).join('')}</nav>
        <div class="map-v4-content">${stageContent()}</div>
      </section>`;
    }else{
      layer.innerHTML=`<section class="map-v4-window map-v4-records" data-v4-window="records" style="${style}">
        <header class="map-v4-window-head" data-v4-drag-handle><div><span>DIÁRIO DE OBRA</span><h2>Registros e apontamentos</h2><small>Conteúdo completo do Diário aberto sobre o mapa</small></div><button type="button" data-v4-close aria-label="Fechar">×</button></header>
        <div class="map-v4-content">${invoke('records')}</div>
      </section>`;
    }
    bindEmbeddedControls();
    window.lucide?.createIcons();
    positionLauncher();
  }

  function onClick(event){
    const open=event.target.closest('[data-v4-open]');
    if(open){event.preventDefault();event.stopPropagation();openKind=open.dataset.v4Open; if(openKind==='stages')stageSubview='stages';render();return;}
    if(event.target.closest('[data-v4-close]')){event.preventDefault();event.stopPropagation();openKind=null;render();return;}
    const tab=event.target.closest('[data-v4-stage-tab]');
    if(tab){event.preventDefault();event.stopPropagation();stageSubview=tab.dataset.v4StageTab;render();return;}

    const view=event.target.closest('[data-view]');
    if(view&&host.contains(view)){
      const target=view.dataset.view;
      if(['stages','pert','actions','raci','raid'].includes(target)){event.preventDefault();event.stopImmediatePropagation();openKind='stages';stageSubview=target==='stages'?'stages':target;render();return;}
      if(target==='records'){event.preventDefault();event.stopImmediatePropagation();openKind='records';render();return;}
    }

    const stage=event.target.closest('[data-stage-index],[data-stage-tree]');
    if(stage&&openKind==='stages'){
      event.preventDefault();event.stopPropagation();
      const id=stage.dataset.stageIndex??stage.dataset.stageTree;
      store.set({selectedStage:Number.isFinite(Number(id))?Number(id):id,stageSelected:true,activityDedicated:false,lastAction:`Selecionou etapa ${id} no widget do mapa`});
      stageSubview='stages';return;
    }
    const overview=event.target.closest('[data-stage-overview]');
    if(overview&&openKind==='stages'){event.preventDefault();event.stopPropagation();store.set({stageSelected:false,activityDedicated:false,lastAction:'Voltou a todas as etapas no widget do mapa'});return;}

    const paneTab=event.target.closest('[data-stage-pane-tab]');
    if(paneTab){event.preventDefault();event.stopPropagation();const panel=paneTab.closest('.stage-planner-panel,.stage-planning-panel,.stage-utilities');if(panel){panel.querySelectorAll('[data-stage-pane-tab]').forEach(b=>b.classList.toggle('active',b===paneTab));panel.querySelectorAll('[data-stage-pane]').forEach(p=>{const active=p.dataset.stagePane===paneTab.dataset.stagePaneTab;p.classList.toggle('active',active);p.hidden=!active;});}return;}

    const newRecord=event.target.closest('.records-new');
    if(newRecord&&openKind==='records'){event.preventDefault();event.stopPropagation();store.set({editingRecord:'new',lastAction:'Novo registro no widget do mapa'});return;}
    const edit=event.target.closest('[data-record-edit]');
    if(edit&&openKind==='records'){event.preventDefault();event.stopPropagation();store.set({editingRecord:edit.dataset.recordEdit,lastAction:`Editou registro ${edit.dataset.recordEdit}`});return;}
    const cancel=event.target.closest('.record-cancel');
    if(cancel&&openKind==='records'){event.preventDefault();store.set({editingRecord:null});return;}
    const del=event.target.closest('[data-record-delete]');
    if(del&&openKind==='records'){event.preventDefault();event.stopPropagation();deleteRecord(del.dataset.recordDelete);return;}

    const pert=event.target.closest('[data-pert-node]');
    if(pert){event.preventDefault();store.set({selectedPertNode:pert.dataset.pertNode,lastAction:`Selecionou ${pert.dataset.pertNode} no PERT`});return;}
    const ai=event.target.closest('[data-ai-action]');
    if(ai){event.preventDefault();store.set({selectedAiAction:ai.dataset.aiAction,lastAction:'Selecionou ação IA'});return;}
    const raci=event.target.closest('[data-raci-cell]');
    if(raci){event.preventDefault();store.set({selectedRaciCell:raci.dataset.raciCell,lastAction:'Selecionou relação RACI'});return;}
    const raid=event.target.closest('[data-raid-card]');
    if(raid){event.preventDefault();store.set({selectedRaidItem:raid.dataset.raidCard,lastAction:'Selecionou item RAID'});return;}
  }

  function bindEmbeddedControls(){
    // Impede que handlers globais da SPA capturem primeiro os links de Etapas/Diário.
    host.querySelectorAll('.map-v4-content [data-view]').forEach(el=>el.dataset.v4Embedded='true');
  }

  async function deleteRecord(id){
    if(!confirm('Excluir este registro?'))return;
    try{
      const r=await fetch(`/api/records/${encodeURIComponent(id)}`,{method:'DELETE'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      store.update(s=>({...s,records:(s.records||[]).filter(x=>String(x.id)!==String(id)),editingRecord:null,lastAction:`Excluiu registro ${id}`}));
    }catch(error){alert(`Não foi possível excluir: ${error.message}`);}
  }

  async function onSubmit(event){
    const form=event.target.closest('.record-form');
    if(!form||openKind!=='records')return;
    event.preventDefault();event.stopPropagation();
    const data=Object.fromEntries(new FormData(form).entries());
    const raw=store.get().editingRecord,editing=raw&&raw!=='new'?raw:null;
    try{
      const r=await fetch(editing?`/api/records/${encodeURIComponent(editing)}`:'/api/records',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const record=await r.json();
      store.update(s=>({...s,records:editing?(s.records||[]).map(x=>String(x.id)===String(editing)?record:x):[record,...(s.records||[])],editingRecord:null,lastAction:editing?'Atualizou registro':'Criou registro'}));
    }catch(error){alert(`Não foi possível salvar: ${error.message}`);}
  }

  function bindDragLayer(){
    host.addEventListener('pointerdown',event=>{
      const head=event.target.closest('[data-v4-drag-handle]');
      if(!head||event.target.closest('button,input,textarea,select,a,label'))return;
      const win=head.closest('[data-v4-window]');if(!win)return;
      event.preventDefault();
      const rect=win.getBoundingClientRect(),startX=event.clientX,startY=event.clientY;
      const move=ev=>{
        const left=Math.max(8,Math.min(innerWidth-win.offsetWidth-8,rect.left+ev.clientX-startX));
        const top=Math.max(56,Math.min(innerHeight-win.offsetHeight-8,rect.top+ev.clientY-startY));
        win.style.setProperty('left',`${left}px`,'important');win.style.setProperty('top',`${top}px`,'important');win.style.setProperty('right','auto','important');win.style.setProperty('bottom','auto','important');
      };
      const up=()=>{removeEventListener('pointermove',move,true);removeEventListener('pointerup',up,true);savePosition(win.dataset.v4Window,win);};
      addEventListener('pointermove',move,true);addEventListener('pointerup',up,true);
    },true);
  }

  function savePosition(kind,win){try{sessionStorage.setItem(`belavista.map-v4.${kind}`,JSON.stringify({left:win.offsetLeft,top:win.offsetTop}));}catch{}}
  function readPosition(kind){try{return JSON.parse(sessionStorage.getItem(`belavista.map-v4.${kind}`)||'null');}catch{return null;}}

  bootstrap();
})();
