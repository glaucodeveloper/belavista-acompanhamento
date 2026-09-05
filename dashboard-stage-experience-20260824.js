import {appStore,demoData,activityCatalog} from './state.js?v=site-materials-8';

const ViewLayer=customElements.get('view-layer');
if(!ViewLayer) throw new Error('Aliança Park dashboard/stage experience: ViewLayer indisponível.');

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ico=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const pct=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(value)||0);
const purchaseValue=value=>Number(String(value||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
const stageById=id=>demoData.activities.find(item=>String(item.id)===String(id))||demoData.activities[0];
const stateList=(key)=>Array.isArray(appStore.get()[key])?appStore.get()[key]:[];

function stageSeed(stage){
  const catalog=activityCatalog.filter(item=>{
    const n=String(item.nature).toLowerCase(),s=String(stage.name).toLowerCase();
    return s.includes(n)||n.includes(s.split(' ')[0])||['Planejamento e projeto','Medição e financeiro','Qualidade'].includes(item.nature);
  });
  return (catalog.length?catalog:activityCatalog.slice(0,4)).slice(0,4);
}

function stageWorkItems(stage){
  const custom=stateList('stagePropertyWorkItems').filter(item=>String(item.stageId)===String(stage.id));
  const seeded=stageSeed(stage).map((item,index)=>({
    id:`seed-${stage.id}-${index}`,
    stageId:stage.id,
    name:item.name,
    owner:index===0?stage.owner:(demoData.collaborators[index%demoData.collaborators.length]?.[0]||stage.owner),
    duration:[8,16,12,6][index]||8,
    predecessor:index?`seed-${stage.id}-${index-1}`:'',
    milestone:index===3?'Liberação da frente':'',
    status:index===0&&stage.progress>0?'Em execução':'Planejada',
    source:'catalog'
  }));
  return [...seeded,...custom];
}

function stageAgendaItems(stage){
  const custom=stateList('stageAgendaItems').filter(item=>String(item.stageId)===String(stage.id));
  const base=[
    {id:`agenda-${stage.id}-1`,stageId:stage.id,title:'Reunião de frente',date:new Date().toISOString().slice(0,10),time:'08:00',owner:stage.owner,relation:'Alinhar execução e bloqueios',status:'Confirmado',source:'seed'},
    {id:`agenda-${stage.id}-2`,stageId:stage.id,title:'Medição de campo',date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'15:30',owner:'Paula Nascimento',relation:'Medição / evidências',status:'Planejado',source:'seed'}
  ];
  return [...base,...custom];
}

function stageRelations(stage){
  const custom=stateList('stageRelationItems').filter(item=>String(item.stageId)===String(stage.id));
  const work=stageWorkItems(stage);
  const base=work.slice(1).map((item,index)=>({id:`rel-${stage.id}-${index}`,stageId:stage.id,from:work[index]?.name||stage.name,to:item.name,type:index%2?'depende de':'libera',constraint:index%2?'Medição anterior':'Conclusão da predecessora',source:'seed'}));
  return [...base,...custom];
}

function stageTodoItems(stage){
  const custom=stateList('stageTodoItems').filter(item=>String(item.stageId)===String(stage.id));
  const base=[
    {id:`todo-${stage.id}-1`,stageId:stage.id,title:`Liberar próxima frente de ${stage.name}`,owner:stage.owner,impact:88,readiness:76,dependency:'Medição validada',status:'Disponível',source:'seed'},
    {id:`todo-${stage.id}-2`,stageId:stage.id,title:'Confirmar material crítico',owner:'Mariana Lopes',impact:72,readiness:48,dependency:'Recebimento / recibo',status:'Preparação',source:'seed'},
    {id:`todo-${stage.id}-3`,stageId:stage.id,title:'Registrar evidência fotográfica',owner:'Paula Nascimento',impact:44,readiness:92,dependency:'Execução em campo',status:'Disponível',source:'seed'}
  ];
  return [...base,...custom];
}

function schedulePropertyLab(stage){
  const items=stageWorkItems(stage);
  return `<section class="stage-property-lab stage-property-schedule" data-stage-property-lab="schedule">
    <header><div><span>PROPRIEDADES DO CRONOGRAMA</span><h4>Atividades, duração, dependências e marcos</h4><p>O Gantt passa a ser editável por propriedades. Cada item mantém responsável, duração, predecessora, status e milestone.</p></div><button type="button" data-stage-add-toggle="work">${ico('plus')} Adicionar atividade</button></header>
    <div class="stage-property-rows">${items.map((item,index)=>`<article><b>${String(index+1).padStart(2,'0')}</b><div><strong>${esc(item.name)}</strong><small>${esc(item.owner)} · ${item.duration}h · ${esc(item.status)}</small></div><span>${item.predecessor?'DEP '+esc(item.predecessor.split('-').at(-1)):'INÍCIO'}</span><em>${esc(item.milestone||'sem marco')}</em></article>`).join('')}</div>
    <form class="stage-inline-add" data-stage-add-form="work" hidden><label>Atividade<input name="name" required placeholder="Ex.: Compactar subleito"></label><label>Duração (h)<input name="duration" type="number" min="0.5" step="0.5" value="8"></label><label>Responsável<select name="owner">${demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('')}</select></label><label>Predecessora<select name="predecessor"><option value="">Sem predecessora</option>${items.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>Milestone<input name="milestone" placeholder="Ex.: Liberação Q3"></label><label>Status<select name="status"><option>Planejada</option><option>Disponível</option><option>Em execução</option></select></label><footer><button type="button" data-stage-add-cancel>Cancelar</button><button type="submit">Adicionar ao cronograma</button></footer></form>
  </section>`;
}

function agendaPropertyLab(stage){
  const items=stageAgendaItems(stage);
  return `<section class="stage-property-lab stage-property-agenda" data-stage-property-lab="agenda">
    <header><div><span>PROPRIEDADES DA AGENDA</span><h4>Compromissos ligados às entidades da etapa</h4><p>Eventos carregam responsável, relação operacional e estado de confirmação.</p></div><button type="button" data-stage-add-toggle="agenda">${ico('calendar-plus')} Novo compromisso</button></header>
    <div class="stage-agenda-property-grid">${items.map(item=>`<article><time>${esc(item.time)}</time><div><strong>${esc(item.title)}</strong><small>${esc(item.date)} · ${esc(item.owner)}</small><p>${esc(item.relation)}</p></div><span>${esc(item.status)}</span></article>`).join('')}</div>
    <form class="stage-inline-add" data-stage-add-form="agenda" hidden><label>Título<input name="title" required placeholder="Ex.: Inspeção de drenagem"></label><label>Data<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><label>Hora<input name="time" type="time" value="08:00"></label><label>Responsável<select name="owner">${demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('')}</select></label><label class="wide">Relação com a etapa<input name="relation" placeholder="Atividade, compra, medição ou dependência"></label><label>Status<select name="status"><option>Planejado</option><option>Confirmado</option><option>Aguardando</option></select></label><footer><button type="button" data-stage-add-cancel>Cancelar</button><button type="submit">Adicionar à agenda</button></footer></form>
  </section>`;
}

function relationPropertyLab(stage){
  const relations=stageRelations(stage),work=stageWorkItems(stage);
  return `<section class="stage-property-lab stage-property-relations" data-stage-property-lab="relations">
    <header><div><span>PERT · PROPRIEDADES RELACIONAIS</span><h4>Dependências como dados editáveis</h4><p>As linhas do canvas ganham tipo, origem, destino e restrição. O formulário cria relações usando as mesmas propriedades.</p></div><div class="stage-diagram-shortcuts"><button type="button" data-stage-diagram-jump="pert">PERT</button><button type="button" data-stage-diagram-jump="raci">RACI</button><button type="button" data-stage-diagram-jump="raid">RAID</button></div></header>
    <div class="stage-relation-property-list">${relations.map(item=>`<article><span>${esc(item.from)}</span><b>${esc(item.type)}</b><span>${esc(item.to)}</span><small>${esc(item.constraint||'Sem restrição')}</small></article>`).join('')}</div>
    <button type="button" class="stage-relation-add-button" data-stage-add-toggle="relation">${ico('git-branch-plus')} Criar relação por propriedades</button>
    <form class="stage-inline-add" data-stage-add-form="relation" hidden><label>Origem<select name="from">${work.map(item=>`<option>${esc(item.name)}</option>`).join('')}</select></label><label>Relação<select name="type"><option>libera</option><option>depende de</option><option>bloqueia</option><option>mede</option><option>fornece para</option></select></label><label>Destino<select name="to">${work.map(item=>`<option>${esc(item.name)}</option>`).join('')}</select></label><label class="wide">Restrição / condição<input name="constraint" placeholder="Ex.: conclusão + medição aprovada"></label><footer><button type="button" data-stage-add-cancel>Cancelar</button><button type="submit">Criar relação</button></footer></form>
  </section>`;
}

function todoPropertyLab(stage){
  const items=stageTodoItems(stage);
  return `<section class="stage-property-lab stage-property-todo" data-stage-property-lab="todo">
    <header><div><span>IMPACT × READINESS</span><h4>Ações posicionadas por impacto e prontidão</h4><p>O alto à direita representa atitudes que podem ser adiantadas agora. O cadastro usa as mesmas propriedades do diagrama.</p></div><button type="button" data-stage-add-toggle="todo">${ico('plus')} Adicionar ação</button></header>
    <div class="stage-readiness-layout"><div class="stage-readiness-matrix"><span class="axis-y">IMPACTO</span><span class="axis-x">PRONTIDÃO</span><b class="execute-zone">EXECUTAR AGORA</b>${items.map((item,index)=>`<button type="button" class="readiness-point" style="--x:${pct(item.readiness)}%;--y:${100-pct(item.impact)}%" title="${esc(item.title)}"><i>${index+1}</i><span>${esc(item.title)}</span></button>`).join('')}</div><div class="stage-readiness-list">${items.map((item,index)=>`<article><b>${index+1}</b><div><strong>${esc(item.title)}</strong><small>${esc(item.owner)} · ${esc(item.dependency)}</small></div><span>${pct(item.impact)} / ${pct(item.readiness)}</span><em>${esc(item.status)}</em></article>`).join('')}</div></div>
    <form class="stage-inline-add" data-stage-add-form="todo" hidden><label class="wide">Ação<input name="title" required placeholder="Ex.: Liberar inspeção da rua B"></label><label>Responsável<select name="owner">${demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('')}</select></label><label>Impacto<input name="impact" type="number" min="0" max="100" value="80"></label><label>Prontidão<input name="readiness" type="number" min="0" max="100" value="60"></label><label>Dependência<input name="dependency" placeholder="Material, contrato, atividade…"></label><label>Status<select name="status"><option>Preparação</option><option>Disponível</option><option>Bloqueada</option></select></label><footer><button type="button" data-stage-add-cancel>Cancelar</button><button type="submit">Adicionar à matriz</button></footer></form>
  </section>`;
}

function enhanceStageTabs(root,force=false){
  if(!force&&appStore.get().view!=='stages') return;
  const stage=stageById(appStore.get().selectedStage);
  const panel=root.querySelector('.stage-planning-panel,.stage-planner-panel,.stage-utilities');
  if(!panel) return;
  const panes=[...panel.querySelectorAll('[data-stage-pane]')];
  for(const pane of panes){
    if(pane.querySelector('[data-stage-property-lab]')) continue;
    const name=pane.dataset.stagePane;
    if(name==='cronograma'||name==='schedule') pane.insertAdjacentHTML('beforeend',schedulePropertyLab(stage));
    else if(name==='agenda') pane.insertAdjacentHTML('beforeend',agendaPropertyLab(stage));
    else if(name==='canvas') pane.insertAdjacentHTML('beforeend',relationPropertyLab(stage));
    else if(name==='afazeres'||name==='todo') pane.insertAdjacentHTML('beforeend',todoPropertyLab(stage));
  }
  const existing=panel.querySelector('.stage-diagram-dock');
  if(!existing){
    panel.insertAdjacentHTML('afterbegin',`<nav class="stage-diagram-dock" aria-label="Diagramas da etapa"><span>DIAGRAMAS</span><button type="button" data-stage-diagram-jump="pert">PERT</button><button type="button" data-stage-diagram-jump="actions">Impact × Readiness</button><button type="button" data-stage-diagram-jump="raci">RACI</button><button type="button" data-stage-diagram-jump="raid">RAID</button></nav>`);
  }
}

function dashboardStageSubview(){
  const value=appStore.get().dashboardStageSubview||'stages';
  return ['stages','pert','actions','raci','raid'].includes(value)?value:'stages';
}

function dashboardStageContent(){
  const subview=dashboardStageSubview();
  const renderer=subview==='stages'?'stagesCanvas':subview;
  const fn=ViewLayer.prototype[renderer];
  if(typeof fn!=='function') return '<div class="dashboard-overlay-empty">Conteúdo da etapa indisponível.</div>';
  try{return fn.call({});}catch(error){console.warn('Falha ao renderizar conteúdo de etapa no mapa.',error);return `<div class="dashboard-overlay-empty">Não foi possível carregar ${esc(subview)}.</div>`;}
}

function dashboardStagesWidget(){
  const subview=dashboardStageSubview(),selected=stageById(appStore.get().selectedStage),average=Math.round(demoData.activities.reduce((sum,item)=>sum+pct(item.progress),0)/demoData.activities.length);
  const labels={stages:'Etapas',pert:'PERT',actions:'Ações IA',raci:'RACI',raid:'RAID'};
  return `<glass-card class="float-card dashboard-overlay-widget dashboard-page-widget dashboard-stages-widget"><div class="dashboard-overlay-head dashboard-page-widget-head widget-drag-handle"><div><span>ETAPAS DA OBRA · SOBRE O MAPA</span><h3>${subview==='stages'?(appStore.get().stageSelected?esc(selected.name):'Todas as etapas'):labels[subview]}</h3><small>${average}% de avanço médio · o mapa permanece como plano espacial</small></div><button type="button" class="dashboard-page-close" data-dashboard-overlay-close aria-label="Fechar">×</button></div><nav class="dashboard-page-widget-tabs">${Object.entries(labels).map(([key,label])=>`<button type="button" data-dashboard-stage-subview="${key}" class="${subview===key?'active':''}">${esc(label)}</button>`).join('')}</nav><div class="dashboard-page-widget-scroll" data-dashboard-stage-page>${dashboardStageContent()}</div></glass-card>`;
}

function dashboardRecordsWidget(){
  let content='';
  try{content=ViewLayer.prototype.records.call({});}catch(error){console.warn('Falha ao renderizar Diário no mapa.',error);content='<div class="dashboard-overlay-empty">Não foi possível carregar o Diário.</div>';}
  return `<glass-card class="float-card dashboard-overlay-widget dashboard-page-widget dashboard-records-widget"><div class="dashboard-overlay-head dashboard-page-widget-head widget-drag-handle"><div><span>DIÁRIO DE OBRA · SOBRE O MAPA</span><h3>Registros e apontamentos</h3><small>O conteúdo completo do Diário permanece aberto sobre o loteamento</small></div><button type="button" class="dashboard-page-close" data-dashboard-overlay-close aria-label="Fechar">×</button></div><div class="dashboard-page-widget-scroll dashboard-records-page-embed" data-dashboard-records-page>${content}</div></glass-card>`;
}

function bindDashboardRecordPersistence(root){
  const widget=root.querySelector('.dashboard-records-widget');if(!widget)return;
  root.bindRecords?.();
  widget.querySelectorAll('[data-record-edit]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({editingRecord:button.dataset.recordEdit,dashboardOverlay:'records',lastAction:`Editou registro ${button.dataset.recordEdit} no widget do mapa`});}));
  widget.querySelectorAll('[data-record-delete]').forEach(button=>button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();if(!confirm('Excluir este registro?'))return;try{const response=await fetch(`/api/records/${encodeURIComponent(button.dataset.recordDelete)}`,{method:'DELETE'});if(!response.ok)throw new Error(`HTTP ${response.status}`);appStore.update(state=>({...state,records:(state.records||[]).filter(item=>item.id!==button.dataset.recordDelete),selectedRecord:null,dashboardOverlay:'records',lastAction:'Excluiu registro no widget do mapa'}));}catch(error){console.warn('Exclusão de registro indisponível.',error);}}));
  widget.querySelector('.record-cancel')?.addEventListener('click',event=>{event.preventDefault();appStore.set({editingRecord:null,dashboardOverlay:'records'});});
  const form=widget.querySelector('.record-form');
  if(form&&!form.dataset.dashboardSubmitBound){form.dataset.dashboardSubmitBound='true';form.addEventListener('submit',async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form).entries()),rawId=appStore.get().editingRecord,editingId=rawId&&rawId!=='new'?rawId:null,contextFields=[...form.querySelectorAll('[data-record-context-field]')].map(input=>`${input.dataset.recordContextLabel}: ${String(input.value||'').trim()}`).filter(item=>!item.endsWith(': '));if(contextFields.length)data.detalhes=[data.detalhes,`Campos de ${form.dataset.recordNature||'execução'}:`,...contextFields].filter(Boolean).join('\n');try{const response=await fetch(editingId?`/api/records/${encodeURIComponent(editingId)}`:'/api/records',{method:editingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const record=await response.json();appStore.update(state=>({...state,records:editingId?(state.records||[]).map(item=>item.id===editingId?record:item):[record,...(state.records||[])],editingRecord:null,recordContext:null,recordCameraName:null,recordCameraPreview:null,dashboardOverlay:'records',lastAction:editingId?'Atualizou registro pelo widget do mapa':'Criou registro pelo widget do mapa'}));}catch(error){console.warn('Persistência de registro indisponível.',error);}});}
}

function bindDashboardStageContent(root){
  const widget=root.querySelector('.dashboard-stages-widget');if(!widget)return;
  widget.querySelectorAll('[data-dashboard-stage-subview]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({dashboardStageSubview:button.dataset.dashboardStageSubview,dashboardOverlay:'stages',lastAction:`Abriu ${button.textContent.trim()} no widget de etapas`});}));
  widget.querySelectorAll('[data-stage-tree]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({selectedStage:Number(button.dataset.stageTree),stageSelected:true,dashboardStageSubview:'stages',dashboardOverlay:'stages',lastAction:`Selecionou etapa ${button.dataset.stageTree} sobre o mapa`});}));
  widget.querySelectorAll('[data-stage-overview]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({stageSelected:false,dashboardStageSubview:'stages',dashboardOverlay:'stages',lastAction:'Voltou a todas as etapas no widget do mapa'});}));
  widget.querySelectorAll('[data-stage-pane-tab]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();const host=button.closest('.stage-planner-panel,.stage-planning-panel,.stage-utilities');if(!host)return;const name=button.dataset.stagePaneTab;host.querySelectorAll('[data-stage-pane-tab]').forEach(item=>item.classList.toggle('active',item===button));host.querySelectorAll('[data-stage-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.stagePane===name));}));
  widget.querySelectorAll('[data-stage-diagram-jump]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({dashboardStageSubview:button.dataset.stageDiagramJump,dashboardOverlay:'stages',lastAction:`Abriu ${button.dataset.stageDiagramJump} dentro do widget de etapas`});}));
  widget.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const target=button.dataset.view;if(['stages','pert','actions','raci','raid'].includes(target)){appStore.set({dashboardStageSubview:target,dashboardOverlay:'stages',lastAction:`Abriu ${target} no widget de etapas`});return;}if(target==='records'){appStore.set({dashboardOverlay:'records',dashboardStageSubview:'stages',lastAction:'Abriu Diário sobre o mapa a partir de Etapas'});return;}if(['agenda','activities','progress'].includes(target)){appStore.set({dashboardStageSubview:'stages',stageSelected:true,dashboardOverlay:'stages',lastAction:`Manteve ${target} no contexto da etapa sobre o mapa`});}}));
  widget.querySelectorAll('[data-pert-node]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedPertNode:button.dataset.pertNode,dashboardStageSubview:'pert',dashboardOverlay:'stages'})));
  widget.querySelector('[data-pert-complete]')?.addEventListener('click',event=>{const id=event.currentTarget.dataset.pertComplete,overrides={...(appStore.get().pertOverrides||{}),[id]:{...(appStore.get().pertOverrides?.[id]||{}),progress:100}};appStore.set({pertOverrides:overrides,selectedPertNode:id,dashboardStageSubview:'pert',dashboardOverlay:'stages',lastAction:`Concluiu nó PERT ${id}`});});
  widget.querySelectorAll('[data-ai-action]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedAiAction:button.dataset.aiAction,dashboardStageSubview:'actions',dashboardOverlay:'stages'})));
  widget.querySelectorAll('[data-raci-cell]').forEach(cell=>cell.addEventListener('click',()=>appStore.set({selectedRaciCell:cell.dataset.raciCell,dashboardStageSubview:'raci',dashboardOverlay:'stages'})));
  widget.querySelectorAll('[data-raid-card]').forEach(card=>card.addEventListener('click',()=>appStore.set({selectedRaidItem:card.dataset.raidCard,dashboardStageSubview:'raid',dashboardOverlay:'stages'})));
}

function enhanceDashboard(root){
  if(appStore.get().view!=='assistant') return;
  const home=root.querySelector('.dashboard-home');
  if(!home) return;
  if(!home.querySelector('[data-dashboard-map-nav]')){
    home.insertAdjacentHTML('beforeend',`<nav class="dashboard-map-navigation" data-dashboard-map-nav aria-label="Navegação rápida sobre o mapa"><button type="button" data-dashboard-overlay="stages">${ico('waypoints')}<span>Etapas</span></button><button type="button" data-dashboard-overlay="records">${ico('notebook-tabs')}<span>Diário</span></button></nav>`);
  }
  home.querySelector('.dashboard-overlay-widget')?.remove();
  const overlay=appStore.get().dashboardOverlay;
  if(overlay==='stages'){home.insertAdjacentHTML('beforeend',dashboardStagesWidget());enhanceStageTabs(home,true);}
  if(overlay==='records') home.insertAdjacentHTML('beforeend',dashboardRecordsWidget());
}


function bindPostRenderEnhancements(root){
  root.querySelectorAll('[data-dashboard-overlay]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    const next=button.dataset.dashboardOverlay,current=appStore.get().dashboardOverlay,opening=current!==next;
    appStore.set({dashboardOverlay:opening?next:null,...(opening&&next==='stages'?{stageSelected:false,dashboardStageSubview:'stages'}:{}),lastAction:`${opening?'Abriu':'Fechou'} widget ${next} no mapa`});
  }));
  root.querySelector('[data-dashboard-overlay-close]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({dashboardOverlay:null,lastAction:'Fechou widget de navegação do dashboard'});});
  bindDashboardStageContent(root);
  bindDashboardRecordPersistence(root);

  root.querySelectorAll('[data-stage-add-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const form=root.querySelector(`[data-stage-add-form="${CSS.escape(button.dataset.stageAddToggle)}"]`);if(!form)return;form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input,select')?.focus();
  }));
  root.querySelectorAll('[data-stage-add-cancel]').forEach(button=>button.addEventListener('click',()=>{button.closest('form').hidden=true;}));
  root.querySelectorAll('[data-stage-diagram-jump]').forEach(button=>button.addEventListener('click',event=>{if(button.closest('.dashboard-stages-widget'))return;event.preventDefault();appStore.set({view:button.dataset.stageDiagramJump,stageSelected:true,activityDedicated:false,lastAction:`Abriu ${button.dataset.stageDiagramJump} pelas propriedades da etapa`});}));

  root.querySelectorAll('[data-stage-add-form]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(form).entries()),stage=stageById(appStore.get().selectedStage),kind=form.dataset.stageAddForm,id=`${kind}-${Date.now().toString(36)}`;
    if(kind==='work'){
      const next=[...stateList('stagePropertyWorkItems'),{id,stageId:stage.id,name:data.name,owner:data.owner,duration:Number(data.duration)||8,predecessor:data.predecessor,milestone:data.milestone,status:data.status,source:'user'}];
      appStore.set({stagePropertyWorkItems:next,lastAction:`Adicionou atividade ${data.name} às propriedades do cronograma`});
    }else if(kind==='agenda'){
      const next=[...stateList('stageAgendaItems'),{id,stageId:stage.id,title:data.title,date:data.date,time:data.time,owner:data.owner,relation:data.relation,status:data.status,source:'user'}];
      appStore.set({stageAgendaItems:next,lastAction:`Adicionou ${data.title} à agenda da etapa`});
    }else if(kind==='relation'){
      const next=[...stateList('stageRelationItems'),{id,stageId:stage.id,from:data.from,type:data.type,to:data.to,constraint:data.constraint,source:'user'}];
      appStore.set({stageRelationItems:next,lastAction:`Criou relação ${data.type} na etapa`});
    }else if(kind==='todo'){
      const next=[...stateList('stageTodoItems'),{id,stageId:stage.id,title:data.title,owner:data.owner,impact:pct(data.impact),readiness:pct(data.readiness),dependency:data.dependency,status:data.status,source:'user'}];
      appStore.set({stageTodoItems:next,lastAction:`Adicionou ação ${data.title} à matriz Impact × Readiness`});
    }
  }));
}

function purchasesIntelligence(state){
  const receipts=state.purchaseReceipts||[],orders=demoData.purchases||[];
  const linked=new Set(receipts.map(item=>item.purchaseId).filter(Boolean));
  const stages=new Map();
  orders.forEach(item=>{const key=item.stage||'Outros';const row=stages.get(key)||{count:0,total:0};row.count++;row.total+=purchaseValue(item.value);stages.set(key,row);});
  const stageRows=[...stages.entries()].sort((a,b)=>b[1].total-a[1].total),max=Math.max(1,...stageRows.map(([,row])=>row.total));
  const coverage=orders.length?Math.round(linked.size/orders.length*100):0;
  const delayed=orders.filter(item=>/atras/i.test(item.status));
  return `<section class="purchase-intelligence-panel"><header><div><span>INTELIGÊNCIA DE SUPRIMENTOS</span><h2>Pedidos, documentos e liberação de frentes</h2><p>Mesmo sem recibos armazenados, a página parte dos pedidos existentes e mostra onde falta documentação ou ação operacional.</p></div><div class="purchase-doc-coverage"><b>${coverage}%</b><small>pedidos com documento vinculado</small></div></header><div class="purchase-intelligence-grid"><section><h3>Fluxo de compra</h3><div class="purchase-flow"><span class="done">Solicitação</span><i></i><span class="done">Pedido</span><i></i><span class="${receipts.length?'done':''}">Documento</span><i></i><span>Conferência</span><i></i><span>Relatório</span></div><div class="purchase-alerts">${delayed.map(item=>`<article><b>${esc(item.id)}</b><span>${esc(item.desc)}</span><em>${esc(item.delay)} · ${esc(item.stage)}</em></article>`).join('')||'<article><b>Sem atrasos críticos</b><span>Pedidos atuais dentro do acompanhamento.</span></article>'}</div></section><section><h3>Compromissos por etapa</h3><div class="purchase-stage-bars">${stageRows.map(([name,row])=>`<div><span>${esc(name)}</span><i><b style="width:${Math.max(8,row.total/max*100)}%"></b></i><em>${money(row.total)} · ${row.count} pedido(s)</em></div>`).join('')}</div></section><section><h3>Pendências documentais</h3><div class="purchase-document-gaps">${orders.map(item=>`<button type="button" data-purchase-link-receipt="${esc(item.id)}" class="${linked.has(item.id)?'documented':''}"><span>${linked.has(item.id)?ico('circle-check'):ico('file-plus-2')}</span><div><b>${esc(item.id)}</b><small>${esc(item.supplier)} · ${esc(item.desc)}</small></div><em>${linked.has(item.id)?'documentado':'vincular recibo'}</em></button>`).join('')}</div></section></div></section>`;
}

const previousPurchases=ViewLayer.prototype.purchases;
ViewLayer.prototype.purchases=function(){
  const state=appStore.get();
  const base=previousPurchases?.call(this)||`<div class="purchases-receipts-workspace"><header class="purchase-page-head"><div><span class="activity-kind">SUPRIMENTOS</span><h1>Compras e recibos</h1><p>Pedidos, documentos e conferência financeira.</p></div></header></div>`;
  return base.replace(/(<div class="purchase-doc-layout">)/,`${purchasesIntelligence(state)}$1`).replace('Nenhum recibo armazenado. Adicione a primeira nota, recibo ou comprovante.','Ainda não há recibos armazenados. Os pedidos permanecem visíveis acima; selecione uma pendência documental para preencher o primeiro comprovante.');
};

const previousRender=ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){
  previousRender.call(this);
  enhanceStageTabs(this);
  enhanceDashboard(this);
  bindPostRenderEnhancements(this);
  if(appStore.get().view==='assistant') this.bindFloatingWidgets?.();
  window.lucide?.createIcons();
};

const previousBind=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  previousBind.call(this);

  this.querySelectorAll('[data-dashboard-overlay]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    const next=button.dataset.dashboardOverlay,current=appStore.get().dashboardOverlay;
    appStore.set({dashboardOverlay:current===next?null:next,lastAction:`${current===next?'Fechou':'Abriu'} widget ${next} no mapa`});
  }));
  this.querySelector('[data-dashboard-overlay-close]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({dashboardOverlay:null,lastAction:'Fechou widget de navegação do dashboard'});});
  this.querySelectorAll('[data-dashboard-stage-select]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedStage:Number(button.dataset.dashboardStageSelect),dashboardOverlay:'stages',lastAction:`Selecionou etapa ${button.dataset.dashboardStageSelect} no widget`})));
  this.querySelector('[data-dashboard-open-stages]')?.addEventListener('click',()=>appStore.set({view:'stages',stageSelected:false,activityDedicated:false,dashboardOverlay:null,lastAction:'Abriu todas as etapas pelo dashboard'}));
  this.querySelector('[data-dashboard-open-records]')?.addEventListener('click',()=>appStore.set({view:'records',sidebarCollapsed:true,dashboardOverlay:null,lastAction:'Abriu Diário pelo dashboard'}));
  this.querySelector('[data-dashboard-new-record]')?.addEventListener('click',()=>appStore.set({view:'records',editingRecord:'new',sidebarCollapsed:true,dashboardOverlay:null,lastAction:'Abriu novo registro pelo dashboard'}));

  this.querySelectorAll('[data-stage-add-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const form=this.querySelector(`[data-stage-add-form="${CSS.escape(button.dataset.stageAddToggle)}"]`);if(!form)return;form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input,select')?.focus();
  }));
  this.querySelectorAll('[data-stage-add-cancel]').forEach(button=>button.addEventListener('click',()=>{button.closest('form').hidden=true;}));
  this.querySelectorAll('[data-stage-diagram-jump]').forEach(button=>button.addEventListener('click',()=>appStore.set({view:button.dataset.stageDiagramJump,stageSelected:true,activityDedicated:false,lastAction:`Abriu ${button.dataset.stageDiagramJump} pelas propriedades da etapa`})));

  this.querySelectorAll('[data-stage-add-form]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(form).entries()),stage=stageById(appStore.get().selectedStage),kind=form.dataset.stageAddForm,id=`${kind}-${Date.now().toString(36)}`;
    if(kind==='work'){
      const next=[...stateList('stagePropertyWorkItems'),{id,stageId:stage.id,name:data.name,owner:data.owner,duration:Number(data.duration)||8,predecessor:data.predecessor,milestone:data.milestone,status:data.status,source:'user'}];
      appStore.set({stagePropertyWorkItems:next,lastAction:`Adicionou atividade ${data.name} às propriedades do cronograma`});
    }else if(kind==='agenda'){
      const next=[...stateList('stageAgendaItems'),{id,stageId:stage.id,title:data.title,date:data.date,time:data.time,owner:data.owner,relation:data.relation,status:data.status,source:'user'}];
      appStore.set({stageAgendaItems:next,lastAction:`Adicionou ${data.title} à agenda da etapa`});
    }else if(kind==='relation'){
      const next=[...stateList('stageRelationItems'),{id,stageId:stage.id,from:data.from,type:data.type,to:data.to,constraint:data.constraint,source:'user'}];
      appStore.set({stageRelationItems:next,lastAction:`Criou relação ${data.type} na etapa`});
    }else if(kind==='todo'){
      const next=[...stateList('stageTodoItems'),{id,stageId:stage.id,title:data.title,owner:data.owner,impact:pct(data.impact),readiness:pct(data.readiness),dependency:data.dependency,status:data.status,source:'user'}];
      appStore.set({stageTodoItems:next,lastAction:`Adicionou ação ${data.title} à matriz Impact × Readiness`});
    }
  }));

  this.querySelectorAll('[data-purchase-link-receipt]').forEach(button=>button.addEventListener('click',()=>{
    const form=this.querySelector('[data-receipt-form]');if(!form)return;
    const select=form.elements.purchaseId;if(select){select.value=button.dataset.purchaseLinkReceipt;select.dispatchEvent(new Event('change',{bubbles:true}));}
    form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.receiptFile?.focus();
  }));
};

// BELAVISTA_MAP_PAGE_WIDGETS_GLOBAL_V3
// Etapas e Diário são superfícies do mapa: o conteúdo completo abre em
// janelas flutuantes sobre o loteamento em vez de trocar a rota da SPA.
const MAP_WIDGET_HOST_ID='belavista-map-page-widgets';
let mapWidgetRenderQueued=false;

function mapWidgetHost(){
  let host=document.getElementById(MAP_WIDGET_HOST_ID);
  if(host)return host;
  host=document.createElement('section');
  host.id=MAP_WIDGET_HOST_ID;
  host.className='belavista-map-page-widgets';
  host.setAttribute('aria-live','polite');
  document.body.append(host);
  return host;
}

function mapWidgetWorkspaceVisible(){
  const view=appStore.get().view;
  return view==='assistant'||view==='map';
}

function bindGlobalMapWidgetHost(host){
  host.querySelectorAll('[data-dashboard-overlay]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    const next=button.dataset.dashboardOverlay,current=appStore.get().dashboardOverlay;
    appStore.set({
      view:'assistant',
      dashboardOverlay:current===next?null:next,
      ...(next==='stages'&&current!==next?{stageSelected:false,dashboardStageSubview:'stages'}:{}),
      lastAction:`${current===next?'Fechou':'Abriu'} ${next==='stages'?'Etapas':'Diário'} sobre o mapa`
    });
  }));
  host.querySelectorAll('[data-dashboard-overlay-close]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    appStore.set({dashboardOverlay:null,lastAction:'Fechou widget sobre o mapa'});
  }));

  if(host.querySelector('.dashboard-stages-widget')){
    enhanceStageTabs(host,true);
    bindDashboardStageContent(host);
  }
  if(host.querySelector('.dashboard-records-widget')){
    // O binder original do Diário vive no ViewLayer. Emprestá-lo ao host
    // mantém filtros, formulário, drill-in e seleção funcionando na janela.
    if(typeof ViewLayer.prototype.bindRecords==='function') host.bindRecords=ViewLayer.prototype.bindRecords.bind(host);
    bindDashboardRecordPersistence(host);
  }
  host.querySelectorAll('.dashboard-page-widget').forEach(widget=>{
    widget.dataset.globalMapWidget='true';
    widget.classList.add('widget-movable');
    if(widget.dataset.globalDragBound)return;
    widget.dataset.globalDragBound='true';
    const handle=widget.querySelector('.dashboard-page-widget-head');
    handle?.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button,input,textarea,select,a,label'))return;
      event.preventDefault();
      const rect=widget.getBoundingClientRect(),start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
      const move=ev=>{
        const left=Math.max(8,Math.min(window.innerWidth-widget.offsetWidth-8,start.left+ev.clientX-start.x));
        const top=Math.max(56,Math.min(window.innerHeight-widget.offsetHeight-8,start.top+ev.clientY-start.y));
        widget.style.setProperty('left',`${left}px`,'important');
        widget.style.setProperty('top',`${top}px`,'important');
        widget.style.setProperty('right','auto','important');
        widget.style.setProperty('bottom','auto','important');
      };
      const up=()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);try{sessionStorage.setItem(`belavista.global-map-widget.${widget.classList.contains('dashboard-stages-widget')?'stages':'records'}`,JSON.stringify({left:widget.offsetLeft,top:widget.offsetTop}))}catch{}};
      document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);
    });
    try{const key=`belavista.global-map-widget.${widget.classList.contains('dashboard-stages-widget')?'stages':'records'}`,saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved){widget.style.setProperty('left',`${saved.left}px`,'important');widget.style.setProperty('top',`${saved.top}px`,'important');widget.style.setProperty('right','auto','important');widget.style.setProperty('bottom','auto','important');}}catch{}
  });
  window.lucide?.createIcons();
}

function renderGlobalMapWidgets(){
  mapWidgetRenderQueued=false;
  const host=mapWidgetHost(),state=appStore.get();
  if(!mapWidgetWorkspaceVisible()){
    host.hidden=true;
    host.innerHTML='';
    return;
  }
  host.hidden=false;
  const overlay=state.dashboardOverlay;
  host.innerHTML=`<nav class="dashboard-map-navigation dashboard-map-navigation-global" aria-label="Abrir conteúdo sobre o mapa">
    <button type="button" data-dashboard-overlay="stages" class="${overlay==='stages'?'active':''}" title="Etapas sobre o mapa">${ico('waypoints')}<span>Etapas</span></button>
    <button type="button" data-dashboard-overlay="records" class="${overlay==='records'?'active':''}" title="Diário sobre o mapa">${ico('notebook-tabs')}<span>Diário</span></button>
  </nav>${overlay==='stages'?dashboardStagesWidget():overlay==='records'?dashboardRecordsWidget():''}`;
  bindGlobalMapWidgetHost(host);
}

function queueGlobalMapWidgets(){
  if(mapWidgetRenderQueued)return;
  mapWidgetRenderQueued=true;
  queueMicrotask(renderGlobalMapWidgets);
}

// Substitui a navegação lateral para Etapas/Registros: o mapa continua como
// plano de fundo e a página solicitada aparece dentro da janela flutuante.
document.addEventListener('click',event=>{
  const trigger=event.target.closest('app-sidebar [data-view], ai-chat [data-view]');
  if(!trigger)return;
  const requested=trigger.dataset.view;
  if(requested!=='stages'&&requested!=='records')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  appStore.set({
    view:'assistant',
    dashboardOverlay:requested==='stages'?'stages':'records',
    ...(requested==='stages'?{stageSelected:false,activityDedicated:false,dashboardStageSubview:'stages'}:{editingRecord:null}),
    lastAction:`Abriu ${requested==='stages'?'Etapas':'Diário'} como widget sobre o mapa`
  });
},true);

// Mantém a indicação ativa na sidebar mesmo com a rota física no mapa.
function syncOverlaySidebar(){
  const overlay=appStore.get().dashboardOverlay,sidebar=document.querySelector('app-sidebar');
  if(!sidebar)return;
  sidebar.querySelectorAll('.nav-item[data-view="stages"],.nav-item[data-view="records"]').forEach(button=>button.classList.toggle('active',button.dataset.view===overlay));
  if(overlay) sidebar.querySelector('.nav-item[data-view="assistant"]')?.classList.remove('active');
}

appStore.subscribe(()=>{
  queueGlobalMapWidgets();
  queueMicrotask(syncOverlaySidebar);
});

new MutationObserver(()=>{
  if(document.querySelector('belavista-app')){
    queueGlobalMapWidgets();
    syncOverlaySidebar();
  }
}).observe(document.documentElement,{childList:true,subtree:true});

queueGlobalMapWidgets();
