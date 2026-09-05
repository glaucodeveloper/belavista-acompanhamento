// BELAVISTA_ADMIN_PUBLIC_MAP_WIDGETS_V5352
// BELAVISTA_ORIGINAL_ADMIN_MAP_TOOLBAR_TRIM_V5350
(()=>{
  'use strict';
  const MARK='BELAVISTA_MAP_WIDGETS_V7_MOBILE_COMMERCIAL';
  if(window.__belavistaMapWidgetsV7MobileCommercial)return;
  window.__belavistaMapWidgetsV7MobileCommercial=true;

  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  let store=null,ViewLayer=null,demo=null,host=null,unsub=null;
  let openKinds=new Set();
  let stageTab='overview';
  let stageEditor=null;
  let zCounter=120;
  const positions=new Map();

  async function bootstrap(){
    for(let i=0;i<160;i++){
      store=globalThis.__belavistaAppStore||null;
      demo=globalThis.__belavistaDemoData||null;
      ViewLayer=customElements.get('view-layer')||null;
      if(store&&demo&&ViewLayer&&document.querySelector('map-scene'))break;
      await wait(50);
    }
    if(!store||!demo||!ViewLayer){console.error(`[${MARK}] dependências indisponíveis`);return;}
    document.getElementById('belavista-hard-map-widgets-v4')?.remove();
    document.getElementById('belavista-map-page-widgets')?.remove();
    ensureHost();
    await loadCommercialSales();
    interceptSidebar();
    unsub?.();
    unsub=store.subscribe(()=>renderOpenWindows());
    addEventListener('resize',positionLauncher,{passive:true});
    addEventListener('scroll',positionLauncher,{passive:true});
    new MutationObserver(()=>{ensureHost();positionLauncher();syncSidebar();}).observe(document.body,{childList:true,subtree:true});
    render();
    console.info(`[${MARK}] ativo`);
  }

  function ensureHost(){
    if(host?.isConnected)return host;
    host=document.getElementById('belavista-map-widgets-v5');
    if(!host){
      host=document.createElement('section');
      host.id='belavista-map-widgets-v5';
      host.innerHTML='<nav class="map-v5-launcher" aria-label="Abrir módulos sobre o mapa"></nav><div class="map-v5-layer"></div>';
      document.body.append(host);
      host.addEventListener('click',onClick,true);
      host.addEventListener('submit',onSubmit,true);
      host.addEventListener('input',onInput,true);
      host.addEventListener('change',onInput,true);
      bindDrag();
    }
    return host;
  }

  async function loadCommercialSales(){
    try{const response=await fetch('/api/commercial-sales');if(!response.ok)return;const payload=await response.json();store.update(state=>({...state,commercialSales:Array.isArray(payload.sales)?payload.sales:[]}));}catch{}
  }

  function mapRect(){
    const map=document.querySelector('map-scene[data-persistent-map="true"],map-scene:not([compact])');
    if(!map)return null;
    const r=map.getBoundingClientRect();
    return r.width>120&&r.height>120?r:null;
  }

  const MODULES=[
    ['stages','waypoints','Etapas'],
    ['diary','square-pen','Diário']
  ];
  const moduleIndex=kind=>MODULES.findIndex(([id])=>id===kind);
  const operationalHeaders=(extra={})=>{const actor=store?.get()?.currentActor||{role:'owner',uid:'local-warley',name:'Warley'};return {'X-Belavista-Role':actor.role,'X-Belavista-User':actor.uid,'X-Belavista-Name':actor.name,...extra};};

  function render(){
    ensureHost();
    const nav=host.querySelector('.map-v5-launcher');
    nav.innerHTML=MODULES.map(([kind,ico,label])=>`<button type="button" data-v5-open="${kind}" class="${openKinds.has(kind)?'active':''}" title="Abrir ${label} sobre o mapa">${icon(ico)}<span>${label}</span></button>`).join('');
    renderOpenWindows();
    positionLauncher();
    window.lucide?.createIcons();
  }

  function positionLauncher(){
    if(!host)return;
    if(store?.get()?.view!=='map'){host.hidden=true;return;}
    const r=mapRect();
    if(!r){host.hidden=true;return;}
    host.hidden=false;
    const nav=host.querySelector('.map-v5-launcher');
    nav.style.left=`${Math.round(r.left+24)}px`;
    nav.style.top=`${Math.round(r.top+18)}px`;
  }

  function defaultPosition(kind,index,win){
    const r=mapRect()||{left:58,top:64,width:innerWidth-58,height:innerHeight-64};
    const offsets={stages:[160,82],diary:[230,116],records:[300,150],lots:[370,90],sales:[440,125],quickSale:[300,88],brokerage:[510,160]};
    const [dx,dy]=offsets[kind]||[160+index*44,90+index*34];
    const width=win?.offsetWidth||720,height=win?.offsetHeight||480;
    return {left:Math.max(6,Math.min(innerWidth-width-6,Math.max(r.left+20,r.left+dx))),top:Math.max(54,Math.min(innerHeight-height-6,Math.max(r.top+18,r.top+dy)))};
  }

  function renderOpenWindows(){
    ensureHost();
    const layer=host.querySelector('.map-v5-layer');
    const kinds=[...openKinds];
    layer.innerHTML=kinds.map((kind,index)=>windowHtml(kind,index)).join('');
    layer.querySelectorAll('[data-v5-window]').forEach((win,index)=>{
      const kind=win.dataset.v5Window;
      const requested=positions.get(kind)||readPosition(kind)||defaultPosition(kind,index,win),saved={left:Math.max(6,Math.min(innerWidth-win.offsetWidth-6,Number(requested.left)||6)),top:Math.max(54,Math.min(innerHeight-win.offsetHeight-6,Number(requested.top)||54))};
      win.style.left=`${saved.left}px`;win.style.top=`${saved.top}px`;win.style.zIndex=String(110+index);
    });
    bindRichEmbedded(layer);
    syncSidebar();
    window.lucide?.createIcons();
    positionLauncher();
  }

  function windowHtml(kind,index){
    const meta={
      stages:['ETAPAS DA OBRA','Etapas','Editar, adicionar e navegar pelas abstrações operacionais.'],
      diary:['DIÁRIO DE OBRA','Novo apontamento','Registrar execução e evidências. A lista vive em um widget separado.'],
      records:['REGISTROS','Lista de registros','Consultar, editar e reabrir apontamentos.'],
      lots:['LOTEAMENTO','Lotes','Interesses, intenção e situação comercial por lote.'],
      sales:['COMERCIAL','Vendas','Negócios, propostas, reservas e contratos.'],
      quickSale:['COMERCIAL','Nova venda','Cadastro rápido com contrato, anexos e fotos.'],
      brokerage:['CONTATOS','Corretores','Contatos rápidos para conversar e encaminhar clientes.']
    }[kind]||['MÓDULO',kind,''];
    const pageIndex=moduleIndex(kind),pagination=pageIndex>=0?`<nav class="map-v5-category-pagination" aria-label="Navegar entre categorias de widget"><button type="button" data-v5-page-delta="-1" aria-label="Categoria anterior">${icon('chevron-left')}</button><div><span>JANELA ${String(pageIndex+1).padStart(2,'0')} / ${String(MODULES.length).padStart(2,'0')}</span><b>${esc(MODULES[pageIndex][2])}</b></div><button type="button" data-v5-page-delta="1" aria-label="Próxima categoria">${icon('chevron-right')}</button></nav>`:'';
    return `<section class="map-v5-window map-v5-${kind} ${pageIndex>=0?'has-v5-pagination':''}" data-v5-window="${kind}">
      ${pagination}
      <header class="map-v5-head" data-v5-drag><div><span>${meta[0]}</span><h2>${meta[1]}</h2><small>${meta[2]}</small></div><div class="map-v5-head-actions">${kind==='diary'?`<button type="button" data-v5-open-records>${icon('list')} Lista de registros</button>`:''}<button type="button" class="map-v5-close" data-v5-close="${kind}" aria-label="Fechar">×</button></div></header>
      <div class="map-v5-body">${contentFor(kind)}</div>
    </section>`;
  }

  function contentFor(kind){
    if(kind==='stages')return stagesWorkspace();
    if(kind==='diary')return diaryForm();
    if(kind==='records')return recordsList();
    if(kind==='lots')return lotsWidget();
    if(kind==='sales')return salesWidget();
    if(kind==='quickSale')return quickSaleWidget();
    if(kind==='brokerage')return brokerageWidget();
    return '';
  }


  function executionPlanForStage(stage){
    const model=globalThis.__belavistaExecutionModel||{stages:[]};
    const key=String(stage?.name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const alias=key.includes('projeto')?'project':key.includes('terra')?'earthwork':key.includes('dren')?'drainage':key.includes('agua')?'water':key.includes('eletr')?'electrical':key.includes('meio')?'curbs':key.includes('paviment')?'paving':null;
    return model.stages?.find(item=>item.key===alias)||null;
  }
  function productionForStage(stage){
    const base=executionPlanForStage(stage);
    if(!base)return null;
    const overrides=store.get().productionOverrides||{};
    return {...base.production,...(overrides[stage.id]||{}),stageKey:base.key,dependsOn:base.dependsOn||[],priority:base.priority||0,baseMaterials:base.materials||[]};
  }
  function materialsForStage(stage){
    const base=(demo.stageMaterials?.[stage.name]||[]).map(item=>({...item}));
    const custom=(store.get().stageMaterialOverrides||{})[stage.id]||[];
    return [...base,...custom];
  }

  function allStages(){
    const overrides=store.get().stageOverrides||{};
    return demo.activities.map(stage=>({...stage,...(overrides[stage.id]||{})}));
  }
  function selectedStage(){
    const stages=allStages();
    return stages.find(x=>String(x.id)===String(store.get().selectedStage))||stages[0];
  }
  function stageList(key,stageId){return (Array.isArray(store.get()[key])?store.get()[key]:[]).filter(x=>String(x.stageId)===String(stageId));}
  function baseWork(stage){
    const custom=stageList('stagePropertyWorkItems',stage.id);
    if(custom.length)return custom;
    const labels=['Preparar frente','Confirmar locação','Executar serviço','Medição e liberação'];
    return labels.map((name,i)=>({id:`base-work-${stage.id}-${i}`,stageId:stage.id,name,owner:stage.owner,duration:[8,6,24,6][i],predecessor:i?`base-work-${stage.id}-${i-1}`:'',milestone:i===3?'Liberação':'',status:i===0&&stage.progress>0?'Em execução':'Planejada',base:true}));
  }
  function baseAgenda(stage){
    const custom=stageList('stageAgendaItems',stage.id);if(custom.length)return custom;
    return [{id:`base-ag-${stage.id}-1`,stageId:stage.id,title:'Reunião de frente',date:new Date().toISOString().slice(0,10),time:'08:00',owner:stage.owner,relation:'Planejamento da frente',status:'Confirmado',base:true},{id:`base-ag-${stage.id}-2`,stageId:stage.id,title:'Medição de campo',date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'15:30',owner:stage.owner,relation:'Medição / evidências',status:'Planejado',base:true}];
  }
  function baseRelations(stage){
    const custom=stageList('stageRelationItems',stage.id);if(custom.length)return custom;
    const work=baseWork(stage);return work.slice(1).map((item,i)=>({id:`base-rel-${stage.id}-${i}`,stageId:stage.id,from:work[i].name,type:'libera',to:item.name,constraint:'Conclusão da predecessora',base:true}));
  }
  function baseTodos(stage){
    const custom=stageList('stageTodoItems',stage.id);if(custom.length)return custom;
    return [{id:`base-todo-${stage.id}-1`,stageId:stage.id,title:`Liberar próxima frente de ${stage.name}`,owner:stage.owner,impact:88,readiness:72,dependency:'Medição validada',status:'Disponível',base:true},{id:`base-todo-${stage.id}-2`,stageId:stage.id,title:'Confirmar material crítico',owner:stage.owner,impact:72,readiness:46,dependency:'Recebimento',status:'Preparação',base:true}];
  }

  const STAGE_TABS=[['overview','Visão geral'],['production','Produção & materiais'],['schedule','Cronograma'],['agenda','Agenda'],['relations','Relações'],['todos','Afazeres'],['pert','PERT'],['raci','RACI'],['raid','RAID']];
  function stagesWorkspace(){
    const stage=selectedStage(),stages=allStages();
    const ix=Math.max(0,stages.findIndex(s=>String(s.id)===String(stage.id)));
    return `<div class="v5-stage-workspace">
      <aside class="v5-stage-tree"><header><b>Todas as etapas</b><span>${stages.length} frentes</span></header>${stages.map((s,i)=>`<button type="button" data-v5-stage="${s.id}" class="${String(s.id)===String(stage.id)?'active':''}"><i>${String(i+1).padStart(2,'0')}</i><span><b>${esc(s.name)}</b><small>${esc(s.owner)} · ${clamp(s.progress)}%</small></span><em>${esc(s.week||'')}</em></button>`).join('')}</aside>
      <main class="v5-stage-main"><div class="v5-stage-toolbar"><div><span>ETAPA SELECIONADA</span><h3>${esc(stage.name)}</h3><small>${esc(stage.owner)} · ${clamp(stage.progress)}% · ${esc(stage.status)}</small></div><div><button type="button" data-v5-stage-prev ${ix===0?'disabled':''}>${icon('chevron-left')}</button><button type="button" data-v5-edit-stage>${icon('pencil')} Editar etapa</button><button type="button" data-v5-stage-next ${ix===stages.length-1?'disabled':''}>${icon('chevron-right')}</button></div></div>
      ${stageEditor?.type==='stage'?stageEditForm(stage):''}
      <nav class="v5-stage-tabs">${STAGE_TABS.map(([key,label])=>`<button type="button" data-v5-stage-tab="${key}" class="${stageTab===key?'active':''}">${label}</button>`).join('')}</nav>
      <section class="v5-stage-pane">${stageTabContent(stage)}</section></main>
    </div>`;
  }

  function stageEditForm(stage){return `<form class="v5-inline-form v5-stage-edit" data-v5-stage-form="stage"><label>Nome<input name="name" value="${esc(stage.name)}" required></label><label>Responsável<input name="owner" value="${esc(stage.owner)}" required></label><label>Avanço (%)<input name="progress" type="number" min="0" max="100" value="${clamp(stage.progress)}"></label><label>Status<select name="status">${['planejado','andamento','concluido'].map(x=>`<option value="${x}" ${stage.status===x?'selected':''}>${x}</option>`).join('')}</select></label><footer><button type="button" data-v5-editor-cancel>Cancelar</button><button type="submit">Salvar etapa</button></footer></form>`;}

  function stageTabContent(stage){
    if(stageTab==='overview')return stageOverview(stage);
    if(stageTab==='production')return stageProduction(stage);
    if(stageTab==='schedule')return stageSchedule(stage);
    if(stageTab==='agenda')return stageAgenda(stage);
    if(stageTab==='relations')return stageRelations(stage);
    if(stageTab==='todos')return stageTodos(stage);
    if(stageTab==='pert')return invoke('pert');
    if(stageTab==='raci')return invoke('raci');
    if(stageTab==='raid')return invoke('raid');
    return '';
  }
  function stageOverview(stage){
    const work=baseWork(stage),agenda=baseAgenda(stage),rels=baseRelations(stage),todos=baseTodos(stage);
    return `<div class="v5-stage-overview"><section><span>RESUMO</span><b>${clamp(stage.progress)}%</b><i><em style="width:${clamp(stage.progress)}%"></em></i><small>${work.length} atividades · ${agenda.length} compromissos</small></section><section><span>RELAÇÕES</span><b>${rels.length}</b><small>dependências modeladas</small></section><section><span>AÇÕES</span><b>${todos.length}</b><small>itens Impact × Readiness</small></section><section><span>RESPONSÁVEL</span><b class="small">${esc(stage.owner)}</b><small>${esc(stage.week||'')}</small></section></div><div class="v5-stage-navigation-cards">${[['production','Produção & materiais','Unidades de produção, ritmos e insumos'],['schedule','Cronograma','Atividades, duração e milestones'],['agenda','Agenda','Compromissos e envolvidos'],['relations','Relações','Dependências e canvas'],['todos','Afazeres','Impacto × prontidão'],['pert','PERT','Fluxo de dependências'],['raci','RACI','Papéis e responsáveis'],['raid','RAID','Riscos e dependências']].map(([k,t,d])=>`<button type="button" data-v5-stage-tab="${k}"><b>${t}</b><span>${d}</span>${icon('arrow-up-right')}</button>`).join('')}</div>`;
  }


  function stageProduction(stage){
    const production=productionForStage(stage),materials=materialsForStage(stage);
    if(!production)return `<div class="v5-empty">Etapa sem modelo de produção associado.</div>`;
    const quantity=Number(production.quantity)||0,rate=Math.max(.0001,Number(production.rate)||1),days=quantity/rate;
    return `<div class="v8-production-pane">
      <div class="v5-pane-head"><div><span>BASE DE PRODUÇÃO EDITÁVEL</span><h3>${esc(stage.name)}</h3><p>As estimativas são premissas de planejamento e mudam quando quantidade ou produtividade são ajustadas.</p></div><span class="v8-priority">Prioridade ${production.priority}</span></div>
      <div class="v8-production-grid">
        <article><small>Quantidade-base</small><b>${quantity.toLocaleString('pt-BR',{maximumFractionDigits:2})}</b><span>${esc(production.unit)}</span></article>
        <article><small>Produtividade</small><b>${rate.toLocaleString('pt-BR',{maximumFractionDigits:2})}</b><span>${esc(production.rateUnit)}</span></article>
        <article><small>Tempo sugerido</small><b>${Math.ceil(days)}</b><span>dias produtivos</span></article>
        <article><small>Dependências</small><b class="small">${production.dependsOn.length?production.dependsOn.join(' → '):'Início'}</b><span>sequência operacional</span></article>
      </div>
      <form class="v5-inline-form v8-production-form" data-v8-production-form>
        <label>Quantidade<input name="quantity" type="number" step="0.01" min="0" value="${quantity}"></label>
        <label>Unidade<input name="unit" value="${esc(production.unit)}"></label>
        <label>Produtividade<input name="rate" type="number" step="0.01" min="0.01" value="${rate}"></label>
        <label>Unidade da produtividade<input name="rateUnit" value="${esc(production.rateUnit)}"></label>
        <footer><button type="submit">Recalcular e salvar premissa</button></footer>
      </form>
      <section class="v8-materials-panel">
        <header><div><span>MATERIAIS / RECURSOS</span><h3>Composição da etapa</h3></div><button type="button" data-v8-add-material>${icon('plus')} Material</button></header>
        <div class="v8-material-list">${materials.map(item=>`<article><div><b>${esc(item.name)}</b><small>${esc(item.scope||'')}</small></div><span>${item.quantity==null?'A dimensionar':`${Number(item.quantity).toLocaleString('pt-BR')} ${esc(item.unit||'')}`}</span><em>${esc(item.status||'Planejado')}</em></article>`).join('')}</div>
        <form class="v5-inline-form v8-material-form" data-v8-material-form hidden>
          <label>Material<input name="name" required></label><label>Quantidade<input name="quantity" type="number" step="0.01" min="0"></label><label>Unidade<input name="unit" placeholder="m, m², m³, un, viagem..."></label><label>Escopo<input name="scope"></label><footer><button type="submit">Adicionar material</button></footer>
        </form>
      </section>
    </div>`;
  }

  function editorButton(type,id){return `<div class="v5-row-actions"><button type="button" data-v5-edit-item="${type}:${id}" aria-label="Editar">${icon('pencil')}</button><button type="button" data-v5-delete-item="${type}:${id}" aria-label="Excluir">${icon('trash-2')}</button></div>`;}
  function stageSchedule(stage){
    const items=baseWork(stage),editing=stageEditor?.type==='work'?stageEditor.id:null;
    return `<div class="v5-pane-head"><div><span>CRONOGRAMA EDITÁVEL</span><h3>Atividades e propriedades</h3><p>Duração, responsável, predecessora, status e marco são propriedades editáveis.</p></div><button type="button" data-v5-add-item="work">${icon('plus')} Atividade</button></div><div class="v5-work-list">${items.map((x,i)=>`<article><i>${String(i+1).padStart(2,'0')}</i><div><b>${esc(x.name)}</b><small>${esc(x.owner)} · ${x.duration}h</small></div><span>${esc(x.status)}</span><em>${esc(x.milestone||'sem marco')}</em>${editorButton('work',x.id)}</article>`).join('')}</div>${stageEditor?.type==='work'?workForm(stage,items,editing):''}`;
  }
  function workForm(stage,items,id){const x=items.find(i=>String(i.id)===String(id))||{};return `<form class="v5-inline-form" data-v5-item-form="work" data-edit-id="${esc(id||'')}"><label>Atividade<input name="name" required value="${esc(x.name||'')}" placeholder="Ex.: Compactar subleito"></label><label>Duração (h)<input name="duration" type="number" min="0.5" step="0.5" value="${x.duration||8}"></label><label>Responsável<input name="owner" value="${esc(x.owner||stage.owner)}"></label><label>Predecessora<select name="predecessor"><option value="">Sem predecessora</option>${items.filter(i=>String(i.id)!==String(id)).map(i=>`<option value="${esc(i.id)}" ${String(x.predecessor)===String(i.id)?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label><label>Marco<input name="milestone" value="${esc(x.milestone||'')}"></label><label>Status<select name="status">${['Planejada','Disponível','Em execução','Concluída'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></label><footer><button type="button" data-v5-editor-cancel>Cancelar</button><button type="submit">${id?'Salvar':'Adicionar'}</button></footer></form>`;}

  function stageAgenda(stage){const items=baseAgenda(stage),id=stageEditor?.type==='agenda'?stageEditor.id:null;return `<div class="v5-pane-head"><div><span>AGENDA EDITÁVEL</span><h3>Compromissos da etapa</h3><p>Navegue, altere responsáveis e adicione compromissos ligados às entidades.</p></div><button type="button" data-v5-add-item="agenda">${icon('calendar-plus')} Compromisso</button></div><div class="v5-agenda-list">${items.map(x=>`<article><time>${esc(x.time)}</time><div><b>${esc(x.title)}</b><small>${esc(x.date)} · ${esc(x.owner)}</small><p>${esc(x.relation)}</p></div><span>${esc(x.status)}</span>${editorButton('agenda',x.id)}</article>`).join('')}</div>${stageEditor?.type==='agenda'?agendaForm(stage,items,id):''}`;}
  function agendaForm(stage,items,id){const x=items.find(i=>String(i.id)===String(id))||{};return `<form class="v5-inline-form" data-v5-item-form="agenda" data-edit-id="${esc(id||'')}"><label>Título<input name="title" required value="${esc(x.title||'')}"></label><label>Data<input type="date" name="date" value="${esc(x.date||new Date().toISOString().slice(0,10))}"></label><label>Hora<input type="time" name="time" value="${esc(x.time||'08:00')}"></label><label>Responsável<input name="owner" value="${esc(x.owner||stage.owner)}"></label><label>Relação<input name="relation" value="${esc(x.relation||'')}"></label><label>Status<select name="status">${['Planejado','Confirmado','Aguardando','Concluído'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></label><footer><button type="button" data-v5-editor-cancel>Cancelar</button><button type="submit">${id?'Salvar':'Adicionar'}</button></footer></form>`;}

  function stageRelations(stage){const items=baseRelations(stage),work=baseWork(stage),id=stageEditor?.type==='relation'?stageEditor.id:null;return `<div class="v5-pane-head"><div><span>CANVAS RELACIONAL</span><h3>Relações como propriedades</h3><p>Origem, tipo, destino e restrição podem ser adicionados ou editados.</p></div><button type="button" data-v5-add-item="relation">${icon('git-branch-plus')} Relação</button></div><div class="v5-relation-canvas">${items.map(x=>`<article><b>${esc(x.from)}</b><span>${esc(x.type)}</span><b>${esc(x.to)}</b><small>${esc(x.constraint||'Sem restrição')}</small>${editorButton('relation',x.id)}</article>`).join('')}</div>${stageEditor?.type==='relation'?relationForm(stage,items,work,id):''}`;}
  function relationForm(stage,items,work,id){const x=items.find(i=>String(i.id)===String(id))||{};return `<form class="v5-inline-form" data-v5-item-form="relation" data-edit-id="${esc(id||'')}"><label>Origem<select name="from">${work.map(i=>`<option ${x.from===i.name?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label><label>Relação<select name="type">${['libera','depende de','bloqueia','mede','fornece para'].map(v=>`<option ${x.type===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Destino<select name="to">${work.map(i=>`<option ${x.to===i.name?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label><label class="wide">Restrição<input name="constraint" value="${esc(x.constraint||'')}"></label><footer><button type="button" data-v5-editor-cancel>Cancelar</button><button type="submit">${id?'Salvar':'Adicionar'}</button></footer></form>`;}

  function stageTodos(stage){const items=baseTodos(stage),id=stageEditor?.type==='todo'?stageEditor.id:null;return `<div class="v5-pane-head"><div><span>IMPACT × READINESS</span><h3>Afazeres e atitudes</h3><p>Edite impacto, prontidão, bloqueio e responsável. Alto à direita representa ação pronta.</p></div><button type="button" data-v5-add-item="todo">${icon('plus')} Ação</button></div><div class="v5-readiness"><div class="v5-matrix"><span class="axis-y">IMPACTO</span><span class="axis-x">PRONTIDÃO</span><b>EXECUTAR AGORA</b>${items.map(x=>`<button type="button" class="v5-action-point" style="--x:${clamp(x.readiness)}%;--y:${clamp(x.impact)}%" data-v5-edit-item="todo:${x.id}" title="${esc(x.title)}">${esc(x.title)}</button>`).join('')}</div><div class="v5-action-list">${items.map(x=>`<article><div><b>${esc(x.title)}</b><small>${esc(x.owner)} · ${esc(x.dependency)}</small></div><span>${clamp(x.impact)} / ${clamp(x.readiness)}</span>${editorButton('todo',x.id)}</article>`).join('')}</div></div>${stageEditor?.type==='todo'?todoForm(stage,items,id):''}`;}
  function todoForm(stage,items,id){const x=items.find(i=>String(i.id)===String(id))||{};return `<form class="v5-inline-form" data-v5-item-form="todo" data-edit-id="${esc(id||'')}"><label>Ação<input name="title" required value="${esc(x.title||'')}"></label><label>Responsável<input name="owner" value="${esc(x.owner||stage.owner)}"></label><label>Impacto<input type="number" name="impact" min="0" max="100" value="${x.impact??70}"></label><label>Prontidão<input type="number" name="readiness" min="0" max="100" value="${x.readiness??50}"></label><label>Dependência<input name="dependency" value="${esc(x.dependency||'')}"></label><label>Status<select name="status">${['Preparação','Disponível','Em execução','Concluído'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></label><footer><button type="button" data-v5-editor-cancel>Cancelar</button><button type="submit">${id?'Salvar':'Adicionar'}</button></footer></form>`;}

  function invoke(name){
    const fn=ViewLayer?.prototype?.[name];if(typeof fn!=='function')return `<div class="v5-empty">Conteúdo indisponível.</div>`;
    try{return fn.call({});}catch(error){console.error(`[${MARK}] ${name}`,error);return `<div class="v5-empty">Falha ao montar ${esc(name)}.</div>`;}
  }

  function currentEditingRecord(){const id=store.get().editingRecord;return id&&id!=='new'?(store.get().records||[]).find(x=>String(x.id)===String(id)):null;}
  function diaryForm(){
    const e=currentEditingRecord(),stage=selectedStage();
    return `<div class="v5-diary-only"><div class="v5-diary-context"><span>NOVO APONTAMENTO</span><h3>${e?'Editar registro':'Registrar atualização'}</h3><p>Um formulário único, sem a lista competir por espaço. Consulte os registros no widget separado.</p></div><form class="v5-record-form" data-v5-record-form><div class="v5-form-grid"><label>Etapa<select name="atividade">${allStages().map(s=>`<option ${e?.atividade===s.name?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Data<input name="data" type="date" value="${esc(e?.data||new Date().toISOString().slice(0,10))}"></label><label>Hora<input name="hora" type="time" value="${esc(e?.hora||new Date().toTimeString().slice(0,5))}"></label><label>Responsável<input name="responsavel" value="${esc(e?.responsavel||stage.owner)}"></label><label>Status<select name="status">${['Pendente','Em andamento','Concluído'].map(v=>`<option ${e?.status===v?'selected':''}>${v}</option>`).join('')}</select><label class="wide">Descrição do diário<textarea name="detalhes" rows="6" placeholder="O que foi executado, medido ou encontrado...">${esc(e?.detalhes||'')}</textarea></label></div><div class="v5-record-map-link"><div>${icon('mouse-pointer-2')}<span><b>Seleção do mapa</b><small>${store.get().recordMapArea?'Há partes selecionadas para este apontamento.':'Selecione partes diretamente no mapa quando necessário.'}</small></span></div><button type="button" data-v5-record-list>${icon('list')} Ver lista de registros</button></div><footer><button type="button" data-v5-record-reset>Limpar</button><button type="submit">${e?'Salvar alterações':'Adicionar ao Diário'}</button></footer></form></div>`;
  }

  function recordsList(){
    const rows=store.get().records||[];
    return `<div class="v5-record-list-widget"><div class="v5-list-toolbar"><label>Buscar<input data-v5-record-search placeholder="ID, atividade, responsável..."></label><button type="button" data-v5-new-from-list>${icon('plus')} Novo apontamento</button></div><div class="v5-record-list" data-v5-record-list-container>${rows.map(r=>`<article data-search="${esc(JSON.stringify(r).toLowerCase())}"><div><span>${esc(r.id)}</span><b>${esc(r.atividade)}</b><small>${esc(r.data)} · ${esc(r.hora)} · ${esc(r.responsavel)}</small><p>${esc(r.detalhes||'')}</p></div><em>${esc(r.status)}</em><div><button type="button" data-v5-record-edit="${esc(r.id)}">${icon('pencil')} Editar</button><button type="button" data-v5-record-delete="${esc(r.id)}">${icon('trash-2')}</button></div></article>`).join('')||'<div class="v5-empty">Nenhum registro cadastrado.</div>'}</div></div>`;
  }

  const SALES_TABLE=[
    {id:'CT-2026-041',lot:'Q12-L54',label:'Lote 54 · Q-12',area:'420 m²',price:480000,status:'Assinado',client:'Juliana Pereira',purpose:'Moradia e investimento',broker:'Marina Alves',payment:'Entrada de 10% + 96 parcelas',plans:[{id:'cash',name:'À vista',entry:480000,installments:0,discount:6},{id:'96x',name:'Plano 96x',entry:48000,installments:96,rate:0},{id:'120x',name:'Plano 120x',entry:72000,installments:120,rate:0}]},
    {id:'CT-2026-038',lot:'Q03-L12',label:'Lote 12 · Q-03',area:'450 m²',price:520000,status:'Em análise',client:'Camila Andrade',purpose:'Investimento',broker:'Marina Alves',payment:'Entrada de 10% + financiamento',plans:[{id:'cash',name:'À vista',entry:520000,installments:0,discount:6},{id:'84x',name:'Plano 84x',entry:104000,installments:84,rate:0},{id:'bank',name:'Entrada + financiamento',entry:52000,installments:0,rate:0}]},
    {id:'CT-2026-034',lot:'Q18-L93',label:'Lote 93 · Q-18',area:'500 m²',price:540000,status:'Reserva',client:'Diego Souza',purpose:'Veraneio',broker:'Marina Alves',payment:'Reserva + entrada + 96 parcelas',plans:[{id:'cash',name:'À vista',entry:540000,installments:0,discount:5},{id:'96x',name:'Plano 96x',entry:81000,installments:96,rate:0},{id:'120x',name:'Plano 120x',entry:108000,installments:120,rate:0}]},
    {id:'CT-2026-029',lot:'Q07-L08',label:'Lote 08 · Q-07',area:'360 m²',price:450000,status:'Assinado',client:'Renato Braga',purpose:'Moradia',broker:'Lucas Barros',payment:'Entrada + 84 parcelas',plans:[{id:'cash',name:'À vista',entry:450000,installments:0,discount:5},{id:'84x',name:'Plano 84x',entry:90000,installments:84,rate:0},{id:'96x',name:'Plano 96x',entry:67500,installments:96,rate:0}]},
    {id:'CT-2026-027',lot:'Q09-L31',label:'Lote 31 · Q-09',area:'390 m²',price:470000,status:'Proposta',client:'Fernanda Lima',purpose:'Investimento',broker:'Lucas Barros',payment:'Condição em negociação',plans:[{id:'cash',name:'À vista',entry:470000,installments:0,discount:5},{id:'96x',name:'Plano 96x',entry:70500,installments:96,rate:0},{id:'120x',name:'Plano 120x',entry:94000,installments:120,rate:0}]},
    {id:'CT-2026-021',lot:'Q14-L22',label:'Lote 22 · Q-14',area:'420 m²',price:425000,status:'Assinado',client:'Gabriel Rocha',purpose:'Moradia',broker:'Renata Costa',payment:'Sinal + financiamento',plans:[{id:'cash',name:'À vista',entry:425000,installments:0,discount:5},{id:'84x',name:'Plano 84x',entry:85000,installments:84,rate:0},{id:'bank',name:'Entrada + financiamento',entry:42500,installments:0,rate:0}]},
    {id:'CT-2026-018',lot:'Q15-L40',label:'Lote 40 · Q-15',area:'380 m²',price:390000,status:'Reserva',client:'Patrícia Melo',purpose:'Moradia',broker:'Renata Costa',payment:'Reserva + proposta comercial',plans:[{id:'cash',name:'À vista',entry:390000,installments:0,discount:5},{id:'96x',name:'Plano 96x',entry:58500,installments:96,rate:0},{id:'120x',name:'Plano 120x',entry:78000,installments:120,rate:0}]}
  ];
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(value)||0);

  const BROKER_CONTACTS=[
    {id:'marina',name:'Marina Alves',role:'Consultora imobiliária',creci:'CRECI-GO 31.842',initials:'MA',phone:'5562998451221',email:'marina@belavista.local',note:'Carteira residencial e investimento',status:'Disponível'},
    {id:'lucas',name:'Lucas Barros',role:'Gerente comercial',creci:'CRECI-GO 18.304',initials:'LB',phone:'5562998123400',email:'lucas@belavista.local',note:'Negociação e fechamento',status:'Em atendimento'},
    {id:'renata',name:'Renata Costa',role:'Corretora parceira',creci:'CRECI-GO 40.290',initials:'RC',phone:'5562998345600',email:'renata@belavista.local',note:'Captação e relacionamento',status:'Disponível'}
  ];

  const normalizeLot=value=>String(value||'').toUpperCase().replace(/LOTE|QUADRA|[\s·._-]/g,'').replace(/^Q?(\d+)L?(\d+)$/,'Q$1L$2');
  const lotMatch=(row,value)=>{const a=normalizeLot(row.lot),b=normalizeLot(value);if(a===b)return true;const digits=String(value||'').match(/\d+/g)||[];return digits.length>=2&&a===`Q${Number(digits[1]??digits[0])}L${Number(digits[0])}`;};

  function lotsWidget(){
    const leads=[...(store.get().publicLeads||[]),...(demo.leads||[])];const lots=new Map();
    leads.forEach(lead=>{const lot=lead.lot||'Sem lote';const row=lots.get(lot)||{lot,leads:[],objectives:new Set(),status:new Set()};row.leads.push(lead);row.objectives.add(lead.objective||'Não informado');row.status.add(lead.status||'Novo');lots.set(lot,row);});
    const selected=store.get().selectedLotWidget;
    return `<div class="v5-commercial-widget"><div class="v8-public-lots-link"><div><span>PÁGINA PÚBLICA</span><b>Visualização comercial de lotes</b></div><a href="./public-leads.html" target="_blank" rel="noopener">${icon('external-link')} Abrir página publicada</a></div><div class="v5-commercial-kpis"><section><span>LOTES COM INTERESSE</span><b>${demo.metrics?.lotsWithInterest||lots.size}</b></section><section><span>INTENÇÕES</span><b>${demo.metrics?.leads||leads.length}</b></section><section><span>AMOSTRA RELACIONADA</span><b>${lots.size}</b></section></div><div class="v5-list-toolbar"><label>Buscar lote<input data-v5-lot-search placeholder="Quadra, lote, cliente..."></label></div><div class="v5-lot-grid" data-v5-lot-container>${[...lots.values()].map(row=>`<article class="${selected===row.lot?'selected':''}" data-search="${esc((row.lot+' '+row.leads.map(x=>x.name).join(' ')).toLowerCase())}"><header><b>${esc(row.lot)}</b><span>${row.leads.length} intenção(ões)</span></header><p>${[...row.objectives].map(x=>`<em>${esc(x)}</em>`).join('')}</p>${row.leads.map(x=>`<div><span>${esc(x.name)}</span><small>${esc(x.status)} · ${esc(x.budget||'')}</small></div>`).join('')}<button type="button" data-v5-lot-focus="${esc(row.lot)}">${icon('badge-dollar-sign')} Ver valores e negociação</button></article>`).join('')}</div></div>`;
  }

  function commissionMarkup(){const previousProfile=store.get().selectedCommissionProfile,previousContract=store.get().selectedCommissionContract;if(previousProfile||previousContract)return `<div class="v5-commercial-reset"><button type="button" data-v5-commission-root>${icon('arrow-left')} Voltar à tabela de vendas</button></div>${invoke('commissions')}`;return invoke('commissions');}

  function salesPlanCards(row){return `<div class="v6-plan-grid">${row.plans.map(plan=>{const discounted=plan.discount?row.price*(1-plan.discount/100):row.price;const financed=Math.max(0,row.price-plan.entry);const installment=plan.installments?Math.round(financed/plan.installments):0;return `<article><header><b>${esc(plan.name)}</b>${plan.discount?`<em>-${plan.discount}%</em>`:''}</header><div><span>Entrada</span><strong>${money(plan.entry)}</strong></div><div><span>${plan.installments?'Parcelas':'Preço final'}</span><strong>${plan.installments?`${plan.installments} × ${money(installment)}`:money(discounted)}</strong></div><small>${plan.installments?'Simulação comercial sem juros/correção nesta demonstração.':'Condição para pagamento integral.'}</small></article>`;}).join('')}</div>`;}

  function salesTableWidget(){
    const persisted=(store.get().commercialSales||[]).map(sale=>({id:sale.id,lot:sale.lot||'—',label:sale.lot||'Venda local',area:'—',price:(Number(sale.valueCents)||0)/100,status:sale.status||'Reserva',client:sale.client||'Cliente',purpose:sale.notes||'Cadastro rápido',broker:sale.broker||'A definir',payment:'Contrato/anexos registrados',files:sale.files||[],plans:[{id:'local',name:'Condição cadastrada',entry:(Number(sale.valueCents)||0)/100,installments:0,discount:0}]}));const allRows=[...persisted,...SALES_TABLE];const selected=store.get().selectedLotWidget||'';const selectedRow=allRows.find(row=>lotMatch(row,selected));const rows=[...allRows].sort((a,b)=>selectedRow?(a===selectedRow?-1:b===selectedRow?1:0):0);const total=rows.reduce((sum,row)=>sum+row.price,0);
    return `<div class="v6-sales-table"><div class="v5-commercial-kpis"><section><span>LOTES NA TABELA</span><b>${rows.length}</b></section><section><span>VALOR MÉDIO</span><b>${money(total/Math.max(rows.length,1))}</b></section><section><span>NEGOCIAÇÕES ATIVAS</span><b>${rows.filter(x=>x.status!=='Assinado').length}</b></section></div>${selectedRow?`<div class="v6-sales-context">${icon('map-pin')}<span><b>${esc(selectedRow.label)}</b><small>Veio da seleção em Lotes. A tabela foi priorizada para esta unidade.</small></span><button type="button" data-v6-clear-lot>Limpar prioridade</button></div>`:''}<div class="v6-sales-toolbar"><label>Buscar lote ou cliente<input data-v6-sales-search placeholder="Q12-L54, Juliana..."></label><span>Tabela comercial → plano → proposta → contrato</span></div><div class="v6-sales-table-wrap"><table><thead><tr><th>Lote</th><th>Área</th><th>Valor</th><th>Cliente / situação</th><th>Plano atual</th><th>Corretor</th><th></th></tr></thead><tbody>${rows.map(row=>`<tr data-v6-sale-row data-search="${esc((row.lot+' '+row.label+' '+row.client+' '+row.status+' '+row.broker).toLowerCase())}" class="${selectedRow===row?'selected':''}"><td><b>${esc(row.lot)}</b><small>${esc(row.label)}</small></td><td>${esc(row.area)}</td><td><strong>${money(row.price)}</strong></td><td><b>${esc(row.client)}</b><small>${esc(row.status)} · ${esc(row.purpose)}</small></td><td><span>${esc(row.payment)}</span></td><td>${esc(row.broker)}</td><td class="v6-sale-actions"><button type="button" data-v6-toggle-plan="${row.id}">${icon('rows-3')} Planos</button><button type="button" data-v6-open-contract="${row.id}">${icon('file-signature')} Contrato${row.files?.length?` · ${row.files.length}`:''}</button></td></tr><tr class="v6-plan-row" data-v6-plan-row="${row.id}" hidden><td colspan="7"><div class="v6-plan-head"><div><span>PLANOS DE NEGOCIAÇÃO</span><b>${esc(row.label)} · ${money(row.price)}</b></div><button type="button" data-v6-create-proposal="${row.id}">${icon('file-plus-2')} Criar proposta</button></div>${salesPlanCards(row)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function salesWidget(){if(store.get().selectedCommissionContract)return `<div class="v5-sales-surface v6-contract-surface">${commissionMarkup()}</div>`;return `<div class="v5-sales-surface">${salesTableWidget()}</div>`;}
  function brokerageWidget(){return `<div class="v7-contact-widget"><div class="v7-contact-intro"><div><span>CONTATOS RÁPIDOS</span><h3>Corretores</h3><p>Este widget serve somente para contato. Situação, carteira e indicadores ficam na página completa de Corretores.</p></div><button type="button" data-v7-broker-page>${icon('table-2')} Gestão de corretores</button></div><div class="v7-contact-grid">${BROKER_CONTACTS.map(person=>`<article><header><span class="v7-contact-avatar">${person.initials}</span><span><b>${esc(person.name)}</b><small>${esc(person.role)}</small><em>${esc(person.status)}</em></span></header><div class="v7-contact-meta"><span>${icon('badge-check')} ${esc(person.creci)}</span><span>${icon('mail')} ${esc(person.email)}</span><span>${icon('briefcase-business')} ${esc(person.note)}</span></div><footer><a href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${icon('message-circle')} WhatsApp</a><a href="tel:+${esc(person.phone)}">${icon('phone')} Ligar</a></footer></article>`).join('')}</div></div>`;}

  function quickSaleWidget(){
    const sales=store.get().commercialSales||[];
    return `<div class="v7-quick-sale"><div class="v7-quick-sale-intro"><span>CAPTURA COMERCIAL</span><h3>Adicionar venda e contrato</h3><p>Registre o negócio sem sair do mapa e anexe contrato, documentos e fotos feitas no celular.</p></div><form data-v7-quick-sale><div class="v7-quick-grid"><label>Lote<input name="lot" required placeholder="Q12-L54"></label><label>Cliente<input name="client" required placeholder="Nome do comprador"></label><label>WhatsApp<input name="clientPhone" inputmode="tel" placeholder="(62) 99999-9999"></label><label>Valor da venda<input name="value" inputmode="decimal" required placeholder="480.000,00"></label><label>Corretor<select name="broker">${BROKER_CONTACTS.map(person=>`<option>${esc(person.name)}</option>`).join('')}</select></label><label>Situação<select name="status">${['Reserva','Proposta','Em análise','Assinado'].map(status=>`<option>${status}</option>`).join('')}</select><label class="wide">Observações<textarea name="notes" rows="3" placeholder="Plano, sinal, condição de negociação..."></textarea></label><label class="wide v7-file-drop">${icon('paperclip')}<span><b>Contrato, documentos e fotos</b><small>PDF, JPG, PNG ou WEBP · até 8 arquivos / 30 MB no total</small></span><input type="file" name="files" multiple accept="application/pdf,image/jpeg,image/png,image/webp"></label><div class="wide v7-camera-row"><label>${icon('camera')} Foto rápida<input type="file" name="camera" accept="image/*" capture="environment"></label><output data-v7-file-summary>Nenhum anexo selecionado.</output></div></div><footer><button type="reset">Limpar</button><button type="submit">${icon('save')} Salvar venda</button></footer></form>${sales.length?`<section class="v7-recent-sales"><span>ÚLTIMAS ADIÇÕES</span>${sales.slice(0,3).map(sale=>`<article><b>${esc(sale.lot||sale.id)}</b><span>${esc(sale.client)} · ${money((Number(sale.valueCents)||0)/100)}</span><small>${sale.files?.length||0} anexo(s)</small></article>`).join('')}</section>`:''}</div>`;
  }


  function onClick(event){
    const pageButton=event.target.closest('[data-v5-page-delta]');
    if(pageButton){
      event.preventDefault();event.stopPropagation();
      const win=pageButton.closest('[data-v5-window]'),current=win?.dataset.v5Window,index=moduleIndex(current);if(index<0)return;
      const next=(index+Number(pageButton.dataset.v5PageDelta)+MODULES.length)%MODULES.length,nextKind=MODULES[next][0];
      const rect=win.getBoundingClientRect(),position={left:rect.left,top:rect.top};positions.set(nextKind,position);savePosition(nextKind,position);
      openKinds.delete(current);openKinds.add(nextKind);if(nextKind==='stages')stageTab='overview';if(nextKind==='sales'||nextKind==='brokerage')store.set({selectedCommissionProfile:null,selectedCommissionContract:null});render();return;
    }
    const opener=event.target.closest('[data-v5-open]');
    if(opener){event.preventDefault();event.stopPropagation();const kind=opener.dataset.v5Open;if(openKinds.has(kind))openKinds.delete(kind);else openKinds.add(kind);if(kind==='stages')stageTab='overview';if(kind==='sales'||kind==='brokerage')store.set({selectedCommissionProfile:null,selectedCommissionContract:null});render();return;}
    const closer=event.target.closest('[data-v5-close]');if(closer){event.preventDefault();openKinds.delete(closer.dataset.v5Close);render();return;}
    if(event.target.closest('[data-v5-open-records],[data-v5-record-list]')){event.preventDefault();openKinds.add('records');render();return;}
    if(event.target.closest('[data-v5-new-from-list]')){event.preventDefault();store.set({editingRecord:'new'});openKinds.add('diary');render();return;}
    if(event.target.closest('[data-v5-record-reset]')){event.preventDefault();store.set({editingRecord:null});render();return;}

    const stageButton=event.target.closest('[data-v5-stage]');if(stageButton){event.preventDefault();store.set({selectedStage:Number(stageButton.dataset.v5Stage),stageSelected:true,lastAction:`Selecionou etapa ${stageButton.dataset.v5Stage}`});stageEditor=null;return;}
    const stageTabBtn=event.target.closest('[data-v5-stage-tab]');if(stageTabBtn){event.preventDefault();stageTab=stageTabBtn.dataset.v5StageTab;stageEditor=null;render();return;}
    if(event.target.closest('[data-v5-stage-prev],[data-v5-stage-next]')){event.preventDefault();const stages=allStages(),cur=stages.findIndex(s=>String(s.id)===String(selectedStage().id)),dir=event.target.closest('[data-v5-stage-prev]')?-1:1,next=stages[cur+dir];if(next)store.set({selectedStage:next.id,stageSelected:true});return;}
    if(event.target.closest('[data-v5-edit-stage]')){event.preventDefault();stageEditor={type:'stage',id:selectedStage().id};render();return;}
    const add=event.target.closest('[data-v5-add-item]');if(add){event.preventDefault();stageEditor={type:add.dataset.v5AddItem,id:null};render();return;}
    const edit=event.target.closest('[data-v5-edit-item]');if(edit){event.preventDefault();const [type,id]=edit.dataset.v5EditItem.split(':');stageEditor={type,id};render();return;}
    const del=event.target.closest('[data-v5-delete-item]');if(del){event.preventDefault();const [type,id]=del.dataset.v5DeleteItem.split(':');deleteStageItem(type,id);return;}
    if(event.target.closest('[data-v5-editor-cancel]')){event.preventDefault();stageEditor=null;render();return;}

    const recordEdit=event.target.closest('[data-v5-record-edit]');if(recordEdit){event.preventDefault();store.set({editingRecord:recordEdit.dataset.v5RecordEdit});openKinds.add('diary');render();return;}
    const recordDelete=event.target.closest('[data-v5-record-delete]');if(recordDelete){event.preventDefault();deleteRecord(recordDelete.dataset.v5RecordDelete);return;}
    if(event.target.closest('[data-v8-add-material]')){event.preventDefault();const form=layer.querySelector('[data-v8-material-form]');if(form)form.hidden=!form.hidden;return;}
    if(event.target.closest('[data-v7-broker-page]')){event.preventDefault();openKinds.delete('brokerage');store.set({view:'brokers',lastAction:'Abriu a página de corretores'});render();return;}
    const lotFocus=event.target.closest('[data-v5-lot-focus]');if(lotFocus){event.preventDefault();const lot=lotFocus.dataset.v5LotFocus;store.set({selectedLotWidget:lot,lastAction:`Abriu valores e negociação de ${lot}`});openKinds.add('sales');render();return;}
    const planToggle=event.target.closest('[data-v6-toggle-plan]');if(planToggle){event.preventDefault();const row=host.querySelector(`[data-v6-plan-row="${CSS.escape(planToggle.dataset.v6TogglePlan)}"]`);if(row)row.hidden=!row.hidden;return;}
    const contractOpen=event.target.closest('[data-v6-open-contract]');if(contractOpen){event.preventDefault();const local=(store.get().commercialSales||[]).find(item=>item.id===contractOpen.dataset.v6OpenContract);const contractFile=local?.files?.find(file=>file.mimeType==='application/pdf')||local?.files?.[0];if(contractFile?.fileUrl){window.open(contractFile.fileUrl,'_blank','noopener');return;}store.set({selectedCommissionContract:contractOpen.dataset.v6OpenContract,selectedCommissionProfile:null,lastAction:`Abriu contrato ${contractOpen.dataset.v6OpenContract} pela tabela de vendas`});return;}
    if(event.target.closest('[data-v6-clear-lot]')){event.preventDefault();store.set({selectedLotWidget:null,lastAction:'Limpou a prioridade de lote na tabela de vendas'});return;}
    const proposal=event.target.closest('[data-v6-create-proposal]');if(proposal){event.preventDefault();const row=SALES_TABLE.find(x=>x.id===proposal.dataset.v6CreateProposal);if(row){store.set({selectedLotWidget:row.label,lastAction:`Preparou proposta comercial para ${row.label}`});alert(`Proposta preparada para ${row.label}. Escolha um plano e prossiga para o contrato quando aprovado.`);}return;}

    if(event.target.closest('[data-v5-commission-root]')){event.preventDefault();store.set({selectedCommissionProfile:null,selectedCommissionContract:null});return;}
    const profile=event.target.closest('[data-commission-profile]');if(profile){event.preventDefault();store.set({selectedCommissionProfile:profile.dataset.commissionProfile,selectedCommissionContract:null});return;}
    const contract=event.target.closest('[data-commission-open]');if(contract){event.preventDefault();store.set({selectedCommissionContract:contract.dataset.commissionOpen});return;}
    const newCommission=event.target.closest('[data-commission-new]');if(newCommission){event.preventDefault();store.set({commissionEditorOpen:true,commissionEditing:null});return;}
    const editCommission=event.target.closest('[data-commission-edit]');if(editCommission){event.preventDefault();store.set({commissionEditorOpen:true,commissionEditing:{id:editCommission.dataset.commissionEdit}});return;}

    const pert=event.target.closest('[data-pert-node]');if(pert){event.preventDefault();store.set({selectedPertNode:pert.dataset.pertNode});return;}
    const raci=event.target.closest('[data-raci-cell]');if(raci){event.preventDefault();store.set({selectedRaciCell:raci.dataset.raciCell});return;}
    const raid=event.target.closest('[data-raid-card]');if(raid){event.preventDefault();store.set({selectedRaidItem:raid.dataset.raidCard});return;}
  }

  function onInput(event){
    if(event.target.matches('[data-v7-quick-sale] input[type="file"]')){const form=event.target.closest('[data-v7-quick-sale]'),files=[...(form?.elements.files?.files||[]),...(form?.elements.camera?.files||[])],out=form?.querySelector('[data-v7-file-summary]');if(out)out.textContent=files.length?`${files.length} arquivo(s) · ${files.map(f=>f.name).join(', ')}`:'Nenhum anexo selecionado.';}
    if(event.target.matches('[data-v5-record-search]')){const q=event.target.value.toLowerCase();host.querySelectorAll('[data-v5-record-list-container] article').forEach(x=>x.hidden=!x.dataset.search.includes(q));}
    if(event.target.matches('[data-v5-lot-search]')){const q=event.target.value.toLowerCase();host.querySelectorAll('[data-v5-lot-container] article').forEach(x=>x.hidden=!x.dataset.search.includes(q));}
    if(event.target.matches('[data-v6-sales-search]')){const q=event.target.value.toLowerCase();host.querySelectorAll('[data-v6-sale-row]').forEach(x=>x.hidden=!x.dataset.search.includes(q));host.querySelectorAll('[data-v6-plan-row]').forEach(x=>{if(x.previousElementSibling?.hidden)x.hidden=true;});}
  }

  async function onSubmit(event){
    const quickSale=event.target.closest('[data-v7-quick-sale]');if(quickSale){event.preventDefault();const data=Object.fromEntries(new FormData(quickSale));const files=[...(quickSale.elements.files?.files||[]),...(quickSale.elements.camera?.files||[])];const read=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({fileName:file.name,mimeType:file.type,kind:file.type==='application/pdf'?'contract':'photo',dataUrl:reader.result});reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});try{const payload={lot:data.lot,client:data.client,clientPhone:data.clientPhone,broker:data.broker,status:data.status,notes:data.notes,valueCents:Math.round(Number(String(data.value||'').replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,''))*100)||0,files:await Promise.all(files.map(read))};const response=await fetch('/api/commercial-sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||`HTTP ${response.status}`);}const result=await response.json();store.update(state=>({...state,commercialSales:[result.sale,...(state.commercialSales||[])],selectedLotWidget:result.sale.lot,lastAction:`Cadastrou venda ${result.sale.id}`}));quickSale.reset();openKinds.delete('quickSale');openKinds.add('sales');render();}catch(error){alert(`Não foi possível salvar a venda: ${error.message}`);}return;}

    const prodForm=event.target.closest('[data-v8-production-form]');if(prodForm){event.preventDefault();const data=Object.fromEntries(new FormData(prodForm)),stage=selectedStage(),all={...(store.get().productionOverrides||{})};all[stage.id]={quantity:Number(data.quantity)||0,unit:data.unit||'',rate:Math.max(.01,Number(data.rate)||.01),rateUnit:data.rateUnit||''};store.set({productionOverrides:all,lastAction:`Atualizou premissa de produção de ${stage.name}`});return;}
    const matForm=event.target.closest('[data-v8-material-form]');if(matForm){event.preventDefault();const data=Object.fromEntries(new FormData(matForm)),stage=selectedStage(),all={...(store.get().stageMaterialOverrides||{})},list=[...(all[stage.id]||[])];list.push({id:uid('MAT'),name:data.name,quantity:data.quantity===''?null:Number(data.quantity),unit:data.unit||'',scope:data.scope||'',status:'Adicionado'});all[stage.id]=list;store.set({stageMaterialOverrides:all,lastAction:`Adicionou material ${data.name} em ${stage.name}`});return;}
    const stageForm=event.target.closest('[data-v5-stage-form]');if(stageForm){event.preventDefault();const data=Object.fromEntries(new FormData(stageForm)),stage=selectedStage(),overrides={...(store.get().stageOverrides||{}),[stage.id]:{name:data.name,owner:data.owner,progress:clamp(data.progress),status:data.status}};stageEditor=null;store.set({stageOverrides:overrides,lastAction:`Atualizou propriedades da etapa ${data.name}`});return;}
    const itemForm=event.target.closest('[data-v5-item-form]');if(itemForm){event.preventDefault();saveStageItem(itemForm);return;}
    const recordForm=event.target.closest('[data-v5-record-form]');if(recordForm){event.preventDefault();await saveRecord(recordForm);return;}
  }

  function stageKey(type){return {work:'stagePropertyWorkItems',agenda:'stageAgendaItems',relation:'stageRelationItems',todo:'stageTodoItems'}[type];}
  function normalizeBase(items,stage,type){return items.map(x=>({...x,base:false,id:x.id,stageId:stage.id}));}
  function saveStageItem(form){
    const type=form.dataset.v5ItemForm,key=stageKey(type),stage=selectedStage(),data=Object.fromEntries(new FormData(form)),id=form.dataset.editId||uid(type);
    let current=Array.isArray(store.get()[key])?[...store.get()[key]]:[];
    const stageItems=type==='work'?baseWork(stage):type==='agenda'?baseAgenda(stage):type==='relation'?baseRelations(stage):baseTodos(stage);
    if(!current.some(x=>String(x.stageId)===String(stage.id))&&stageItems.some(x=>x.base)) current=[...current,...normalizeBase(stageItems,stage,type)];
    const item={id,stageId:stage.id,...data};
    if(type==='work')item.duration=Number(data.duration)||8;
    if(type==='todo'){item.impact=clamp(data.impact);item.readiness=clamp(data.readiness);}
    const ix=current.findIndex(x=>String(x.id)===String(form.dataset.editId));if(ix>=0)current[ix]={...current[ix],...item};else current.push(item);
    stageEditor=null;store.set({[key]:current,lastAction:`${form.dataset.editId?'Editou':'Adicionou'} ${type} em ${stage.name}`});
  }
  function deleteStageItem(type,id){
    if(!confirm('Excluir este item?'))return;const key=stageKey(type),stage=selectedStage();let current=Array.isArray(store.get()[key])?[...store.get()[key]]:[];
    if(!current.some(x=>String(x.stageId)===String(stage.id))){const base=type==='work'?baseWork(stage):type==='agenda'?baseAgenda(stage):type==='relation'?baseRelations(stage):baseTodos(stage);current=[...current,...normalizeBase(base,stage,type)];}
    current=current.filter(x=>String(x.id)!==String(id));stageEditor=null;store.set({[key]:current,lastAction:`Excluiu ${type} ${id}`});
  }

  async function saveRecord(form){
    const data=Object.fromEntries(new FormData(form)),raw=store.get().editingRecord,editing=raw&&raw!=='new'?raw:null;
    data.obra='Aliança Park';
    try{const response=await fetch(editing?`/api/records/${encodeURIComponent(editing)}`:'/api/records',{method:editing?'PUT':'POST',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify(data)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const record=await response.json();store.update(s=>({...s,records:editing?(s.records||[]).map(x=>String(x.id)===String(editing)?record:x):[record,...(s.records||[])],editingRecord:null,lastAction:editing?'Atualizou registro':'Criou registro'}));openKinds.add('records');render();}catch(error){alert(`Não foi possível salvar: ${error.message}`);}
  }
  async function deleteRecord(id){if(!confirm('Excluir este registro?'))return;try{const r=await fetch(`/api/records/${encodeURIComponent(id)}`,{method:'DELETE',headers:operationalHeaders()});if(!r.ok)throw new Error(`HTTP ${r.status}`);store.update(s=>({...s,records:(s.records||[]).filter(x=>String(x.id)!==String(id)),editingRecord:null,lastAction:`Excluiu registro ${id}`}));}catch(error){alert(`Não foi possível excluir: ${error.message}`);}}

  function bindRichEmbedded(layer){
    layer.querySelectorAll('.commission-entry-form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();}));
  }

  function interceptSidebar(){
    window.__belavistaV5SidebarIntercept=true;
  }
  function syncSidebar(){
    /* A sidebar permanece dedicada às páginas longas; os widgets usam o launcher sobre o mapa. */
  }

  function bindDrag(){
    host.addEventListener('pointerdown',event=>{
      const head=event.target.closest('[data-v5-drag]');if(!head||event.button!==0||event.target.closest('button,input,textarea,select,a,label'))return;
      const win=head.closest('[data-v5-window]');if(!win)return;event.preventDefault();zCounter++;win.style.zIndex=String(zCounter);
      const rect=win.getBoundingClientRect(),sx=event.clientX,sy=event.clientY;
      const move=ev=>{const left=Math.max(6,Math.min(innerWidth-win.offsetWidth-6,rect.left+ev.clientX-sx)),top=Math.max(54,Math.min(innerHeight-win.offsetHeight-6,rect.top+ev.clientY-sy));win.style.left=`${left}px`;win.style.top=`${top}px`;};
      const up=()=>{removeEventListener('pointermove',move,true);removeEventListener('pointerup',up,true);positions.set(win.dataset.v5Window,{left:parseFloat(win.style.left)||win.offsetLeft,top:parseFloat(win.style.top)||win.offsetTop});savePosition(win.dataset.v5Window,positions.get(win.dataset.v5Window));};
      addEventListener('pointermove',move,true);addEventListener('pointerup',up,true);
    },true);
  }
  function savePosition(kind,pos){try{sessionStorage.setItem(`belavista.v5.${kind}`,JSON.stringify(pos));}catch{}}
  function readPosition(kind){try{return JSON.parse(sessionStorage.getItem(`belavista.v5.${kind}`)||'null');}catch{return null;}}

  bootstrap();
})();
