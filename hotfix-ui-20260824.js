import './components.js?v=site-materials-8';
const AppSidebar=customElements.get('app-sidebar');
const AppTopbar=customElements.get('app-topbar');
const AiChat=customElements.get('ai-chat');
const MapScene=customElements.get('map-scene');
const ViewLayer=customElements.get('view-layer');
if(!AppSidebar||!AppTopbar||!AiChat||!MapScene||!ViewLayer) throw new Error('Aliança Park components registry incompleto antes do hotfix');
import {appStore,demoData} from './state.js?v=site-materials-8';

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const HIDDEN_WIDGETS_KEY='belavista.hidden-widgets.v1';
const hiddenWidgetKeys=new Set((()=>{try{return JSON.parse(sessionStorage.getItem(HIDDEN_WIDGETS_KEY)||'[]')}catch{return []}})());
const widgetKey=card=>[...card.classList].filter(name=>name!=='float-card').sort().join('.')||card.dataset.widgetId||'float-card';
const saveHiddenWidgets=()=>{try{sessionStorage.setItem(HIDDEN_WIDGETS_KEY,JSON.stringify([...hiddenWidgetKeys]))}catch{}};
function hideFloatingWidget(card){if(!card)return;hiddenWidgetKeys.add(widgetKey(card));saveHiddenWidgets();card.remove();}
function applyHiddenWidgets(root){root?.querySelectorAll?.('.float-card').forEach(card=>{if(hiddenWidgetKeys.has(widgetKey(card)))card.remove();});}
function stageMatchesText(stage,text=''){
  const target=String(text||'').trim().toLocaleLowerCase('pt-BR');
  if(!target)return false;
  const name=String(stage?.name||'').toLocaleLowerCase('pt-BR');
  const aliases=[name,name.replace(' pluvial',''),name.replace('rede de ','rede '),name.split(/\s+/)[0]].filter(value=>value.length>3);
  return aliases.some(alias=>target.includes(alias)||alias.includes(target));
}

export function computedStagePackets(stage,state=appStore.get()){
  if(!stage)return [0,0,0,0];
  const status=String(stage.status||'').toLocaleLowerCase('pt-BR');
  if(/conclu/.test(status))return [100,100,100,100];

  const records=(state.records||[]).filter(record=>stageMatchesText(stage,record.etapa)||stageMatchesText(stage,record.atividade));
  const purchases=(demoData.purchases||[]).filter(purchase=>stageMatchesText(stage,purchase.stage));
  const packets=[0,0,0,0];

  // 1. Preparação: existe evidência operacional real (registro, compra ou frente iniciada).
  if(records.length||purchases.length||/andamento|execu/.test(status))packets[0]=100;

  // 2. Suprimentos: deriva do estado dos pedidos vinculados à própria etapa.
  if(purchases.length){
    const delivered=purchases.filter(item=>/entreg|conclu|recebid|aprov/.test(String(item.status||'').toLowerCase())).length;
    const running=purchases.filter(item=>/andamento|process|separa|pedido|aberto/.test(String(item.status||'').toLowerCase())).length;
    const delayed=purchases.filter(item=>/atras|crit|bloque/.test(String(item.status||'').toLowerCase())).length;
    packets[1]=clamp(Math.round(((delivered*1)+(running*.65)+(delayed*.35))/purchases.length*100));
  } else if(records.length) packets[1]=50;

  // 3. Execução: média dos avanços efetivamente registrados no Diário.
  const measured=records.map(record=>Number(record.progresso)).filter(Number.isFinite).map(value=>clamp(value));
  if(measured.length)packets[2]=Math.round(measured.reduce((sum,value)=>sum+value,0)/measured.length);
  else if(records.length||/andamento|execu/.test(status))packets[2]=35;

  // 4. Liberação: somente evidência concluída libera 100% desta parcela.
  if(records.length){
    const completed=records.filter(record=>/conclu|aprov|liberad/.test(String(record.status||'').toLowerCase())).length;
    packets[3]=Math.round(completed/records.length*100);
  }

  // O PERT da etapa é uma medição operacional adicional; ele não herda
  // percentuais estáticos do card da etapa.
  if(stage.id===state.selectedStage){
    const pertValues=Object.values(state.pertOverrides||{}).map(item=>Number(item?.progress)).filter(Number.isFinite).map(value=>clamp(value));
    if(pertValues.length)packets[2]=Math.max(packets[2],Math.round(pertValues.reduce((sum,value)=>sum+value,0)/pertValues.length));
  }
  return packets.map(value=>clamp(Math.round(value)));
}

export function computedStageProgress(stage,state=appStore.get()){
  const packets=computedStagePackets(stage,state);
  return Math.round(packets.reduce((sum,value)=>sum+value,0)/Math.max(1,packets.length));
}

function syncCalculatedProgress(){
  const state=appStore.get();
  demoData.activities.forEach(stage=>{stage.progress=computedStageProgress(stage,state);});
  demoData.project.completeness=Math.round(demoData.activities.reduce((sum,stage)=>sum+stage.progress,0)/Math.max(1,demoData.activities.length));
  if(demoData.metrics)demoData.metrics.completeness=demoData.project.completeness;
}

const sidebarRender=AppSidebar.prototype.render;
AppSidebar.prototype.render=function(){
  sidebarRender.call(this);
  const records=this.querySelector('[data-view="records"] span');
  if(records)records.textContent='Diário';
};

const topbarRender=AppTopbar.prototype.render;
AppTopbar.prototype.render=function(){
  syncCalculatedProgress();topbarRender.call(this);
  const ring=this.querySelector('.complete-ring span');if(ring)ring.textContent=`${demoData.project.completeness}%`;
};

function stageTree(selectedId,detail=false){
  return `<aside class="stage-explorer" aria-label="Árvore de etapas"><div class="stage-explorer-head"><span>ETAPAS DA OBRA</span><b>Exploração sequencial</b><small>${demoData.activities.length} frentes em ordem de implantação</small></div><div class="stage-explorer-list">${demoData.activities.map((stage,index)=>`<button type="button" class="stage-explorer-card ${stage.id===selectedId?'active':''}" data-stage-tree="${stage.id}" aria-current="${stage.id===selectedId?'step':'false'}"><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(stage.name)}</b><small>${esc(stage.week)} · ${esc(stage.owner)}</small><i><u style="width:${stage.progress}%"></u></i></div><strong>${stage.progress}%</strong></button>`).join('')}</div>${detail?'<button type="button" class="stage-explorer-overview" data-stage-overview>← Visão geral das etapas</button>':''}</aside>`;
}

function stageRelationCanvas(){
  const nodes=demoData.activities.map((stage,index)=>{
    const col=index%3,row=Math.floor(index/3);
    return `<button type="button" class="stage-rel-node" data-stage-tree="${stage.id}" style="--x:${6+col*31}%;--y:${14+row*46}%"><span>${String(index+1).padStart(2,'0')}</span><b>${esc(stage.name)}</b><small>${stage.progress}% · ${esc(stage.owner)}</small></button>`;
  }).join('');
  const lines=`<svg viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true"><path d="M190 90 C260 90 250 90 330 90"/><path d="M505 90 C570 90 565 90 645 90"/><path d="M820 90 C900 90 900 250 820 290"/><path d="M645 290 C575 290 570 290 505 290"/><path d="M330 290 C255 290 255 290 190 290"/></svg>`;
  return `<section class="stage-relational-panel"><header><div><span class="stage-kicker">CANVAS RELACIONAL DAS ETAPAS</span><h2>Dependências da implantação</h2><p>Selecione uma etapa para aprofundar cronograma, agenda, atividades e afazeres.</p></div><span class="stage-rel-legend">Fluxo de liberação →</span></header><div class="stage-relational-canvas">${lines}${nodes}</div></section>`;
}

function generalSchedule(){
  const maxDays=54;
  return `<section class="stage-general-schedule"><header><div><span class="stage-kicker">CRONOGRAMA GERAL</span><h2>Calendário consolidado da implantação</h2></div><small>Percentuais derivados das frentes e registros vinculados.</small></header><div class="stage-general-gantt">${demoData.activities.map((stage,index)=>{
    const start=1+index*7,duration=Math.max(4,8-index%3),left=(start-1)/maxDays*100,width=duration/maxDays*100;
    return `<div class="stage-gantt-row"><span><b>${esc(stage.name)}</b><small>${esc(stage.owner)} · ${stage.progress}%</small></span><i><u style="left:${left}%;width:${width}%"><em>${stage.progress}%</em></u></i></div>`;
  }).join('')}</div></section>`;
}

function overallSummary(){
  const average=Math.round(demoData.activities.reduce((sum,stage)=>sum+stage.progress,0)/Math.max(1,demoData.activities.length));
  const completed=demoData.activities.filter(stage=>stage.progress>=100).length;
  const active=demoData.activities.filter(stage=>stage.progress>0&&stage.progress<100).length;
  const records=(appStore.get().records||[]).length;
  return `<section class="stage-summary-panel"><div><span class="stage-kicker">RESUMO DA OBRA</span><h2>Avanço calculado pelas frentes e apontamentos</h2><p>O indicador é recomputado a partir das atividades-base, registros de progresso e conclusões vinculadas.</p></div><div class="stage-summary-metrics"><article><small>AVANÇO MÉDIO</small><b>${average}%</b><i><u style="width:${average}%"></u></i></article><article><small>ETAPAS CONCLUÍDAS</small><b>${completed}/${demoData.activities.length}</b><span>${active} frentes ativas</span></article><article><small>APONTAMENTOS</small><b>${records}</b><span>registros no diário</span></article></div></section>`;
}

function stagePlanner(stage){
  const packetNames=['Preparar frente','Executar atividade principal','Validar medição','Liberar próxima frente'];
  const seed=stage.progress;
  const packets=computedStagePackets(stage);
  const agenda=[['08:30','Reunião de frente'],['11:00','Conferência de materiais'],['16:00','Medição e liberação']];
  return `<section class="stage-planner-panel"><nav class="stage-planner-tabs" aria-label="Quadro operacional da etapa"><button class="active" data-stage-pane-tab="schedule">${icon('calendar-range')} Cronograma</button><button data-stage-pane-tab="agenda">${icon('calendar-days')} Agenda</button><button data-stage-pane-tab="relations">${icon('git-branch')} Canvas relacional</button><button data-stage-pane-tab="todos">${icon('list-checks')} Afazeres</button></nav><div class="stage-planner-panes"><section data-stage-pane="schedule" class="active"><div class="stage-packet-gantt">${packetNames.map((name,index)=>`<article><span><b>${esc(name)}</b><small>${packets[index]}% concluído</small></span><i><u style="width:${packets[index]}%"></u></i></article>`).join('')}</div></section><section data-stage-pane="agenda">${agenda.map(([time,label])=>`<article class="stage-agenda-row"><time>${time}</time><div><b>${label}</b><small>${esc(stage.owner)} · ${esc(stage.name)}</small></div></article>`).join('')}</section><section data-stage-pane="relations"><div class="activity-mini-rel"><svg viewBox="0 0 900 260" preserveAspectRatio="none"><path d="M165 130 C250 130 250 80 345 80"/><path d="M500 80 C585 80 585 130 670 130"/></svg>${packetNames.slice(0,3).map((name,index)=>`<article style="--x:${5+index*34}%;--y:${index===1?16:48}%"><span>${index+1}</span><b>${esc(name)}</b><small>${packets[index]}%</small></article>`).join('')}</div></section><section data-stage-pane="todos"><div class="stage-todo-list">${packetNames.map((name,index)=>`<label><input type="checkbox" ${packets[index]>=100?'checked':''}><span><b>${esc(name)}</b><small>${packets[index]>=100?'Concluído':'Próxima ação operacional'}</small></span></label>`).join('')}</div></section></div></section>`;
}

function stageDetailSummary(stage){
  const packets=computedStagePackets(stage),done=packets.filter(value=>value>=100).length;
  return `<section class="stage-detail-summary"><div><span class="stage-kicker">RESUMO DA ETAPA</span><h2>${esc(stage.name)}</h2><p>O resumo fica abaixo do quadro de planejamento para manter cronograma, agenda, relações e afazeres como superfície principal.</p></div><div class="stage-detail-metrics"><article><small>AVANÇO CALCULADO</small><b>${stage.progress}%</b><i><u style="width:${stage.progress}%"></u></i></article><article><small>ATIVIDADES</small><b>${done}/4</b><span>${4-done} em acompanhamento</span></article><article><small>RESPONSÁVEL</small><b>${esc(stage.owner)}</b><span>${esc(stage.week)}</span></article></div></section>`;
}

const originalStagesCanvas=ViewLayer.prototype.stagesCanvas;
ViewLayer.prototype.stagesCanvas=function(){
  syncCalculatedProgress();
  const state=appStore.get(),selected=demoData.activities.find(stage=>stage.id===state.selectedStage)||demoData.activities[0];
  if(!state.stageSelected){
    return `<div class="stage-rework stage-overview-rework"><header class="stage-rework-head"><div><span class="stage-kicker">ETAPAS · ALIANÇA PARK</span><h1>Implantação da obra</h1><p>Visão geral reduzida a relações, resumo calculado e cronograma consolidado.</p></div></header><div class="stage-explorer-layout">${stageTree(selected.id,false)}<main class="stage-rework-main">${stageRelationCanvas()}${overallSummary()}${generalSchedule()}</main></div></div>`;
  }
  return `<div class="stage-rework stage-detail-rework"><header class="stage-rework-head"><div><span class="stage-kicker">ETAPA EM FOCO · ${esc(selected.week)}</span><h1>${esc(selected.name)}</h1><p>${esc(selected.owner)} · ${selected.progress}% calculado</p></div><button type="button" class="stage-overview-button" data-stage-overview>${icon('arrow-left')} Todas as etapas</button></header><div class="stage-explorer-layout">${stageTree(selected.id,true)}<main class="stage-rework-main">${stagePlanner(selected)}${stageDetailSummary(selected)}</main></div></div>`;
};

const originalRecords=ViewLayer.prototype.records;
ViewLayer.prototype.records=function(){
  syncCalculatedProgress();
  return originalRecords.call(this)
    .replaceAll('REGISTROS OPERACIONAIS','DIÁRIO DE OBRA')
    .replace('<h1>Registros</h1>','<h1>Diário</h1>')
    .replace('Obra → atividade → evidência → responsável → confirmação.','Apontamentos de execução, evidências, responsáveis e progresso físico.')
    .replace('Relatório de registros','Apontamentos do diário')
    .replace('Use “Pintar no mapa” no formulário para marcar a área executada.','Pressione o botão esquerdo, arraste sobre o modelo e solte para adicionar todas as partes atravessadas.')
    .replace('O modelo 3D fica à direita; clique em um lote, rua ou estrutura para vincular a evidência.','A seleção é aditiva e aceita indiscriminadamente solo, asfalto, lotes, estruturas e demais partes do GLB. Use × para limpar.')
    .replaceAll('Registros operacionais','Diário operacional')
    .replaceAll('registros','apontamentos');
};

const originalBind=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  originalBind.call(this);
  this.querySelectorAll('[data-stage-tree]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    appStore.set({view:'stages',selectedStage:Number(button.dataset.stageTree),stageSelected:true,activityDedicated:false,selectedActivity:null,lastAction:`Abriu etapa ${button.dataset.stageTree}`});
  }));
  this.querySelectorAll('[data-stage-overview]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();appStore.set({view:'stages',stageSelected:false,activityDedicated:false,selectedActivity:null,lastAction:'Voltou à visão geral das etapas'});
  }));
  this.querySelectorAll('[data-stage-pane-tab]').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.stagePaneTab,host=button.closest('.stage-planner-panel');
    host?.querySelectorAll('[data-stage-pane-tab]').forEach(item=>item.classList.toggle('active',item===button));
    host?.querySelectorAll('[data-stage-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.stagePane===name));
  }));
  if(appStore.get().view==='commissions'&&appStore.get().commissionEditing){
    const form=this.querySelector('.commission-entry-form'),editButton=this.querySelector(`[data-commission-edit="${CSS.escape(appStore.get().commissionEditing.id)}"]`),row=editButton?.closest('.commission-transaction-row');
    if(form&&row){row.insertAdjacentElement('afterend',form);form.classList.add('commission-entry-inline');form.scrollIntoView({block:'nearest'});}
  }
  if(appStore.get().view==='records'){
    const map=document.querySelector('map-scene:not([compact])');
    map?.enableRecordsAdditiveSelection?.();
  }
};

const finalRender=ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){syncCalculatedProgress();finalRender.call(this);applyHiddenWidgets(this);};

// Garante que "Voltar para a etapa" devolva à etapa específica, e não à visão geral.
document.addEventListener('click',event=>{
  const button=event.target.closest?.('button,a');
  if(!button)return;
  if(button.matches('[data-cmd="back-activity"]')||/voltar para a etapa/i.test(button.textContent||'')){
    event.preventDefault();event.stopImmediatePropagation();
    appStore.set({view:'stages',stageSelected:true,activityDedicated:false,selectedActivity:null,lastAction:'Voltou para a etapa'});
    return;
  }
  if(button.matches('.card-close,.detail-close,.leads-lot-close,[data-widget-close]')||/^fechar/i.test(button.getAttribute('aria-label')||'')){
    const recordDetail=button.closest('.record-detail');
    if(recordDetail){appStore.set({selectedRecord:null});return;}
    const lot=button.closest('.leads-lot-selected');if(lot){lot.hidden=true;return;}
    const floatCard=button.closest('.float-card');
    if(floatCard){event.preventDefault();event.stopImmediatePropagation();hideFloatingWidget(floatCard);return;}
    const removable=button.closest('.workflow-tree,.activity-detail,.activity-detail-drawer,.floating-widget');
    if(removable){event.preventDefault();event.stopImmediatePropagation();removable.remove();return;}
  }
},true);

function partAncestor(node){let current=node;while(current&&!current.userData?.partKind)current=current.parent;return current||null;}

MapScene.prototype.recordsAreaFromParts=function(parts=[]){
  const unique=[...new Map(parts.filter(Boolean).map(item=>[item.userData?.partId||item.uuid,item])).values()];
  const labels=unique.map(item=>item.userData?.partLabel||item.name||'Parte do empreendimento');
  const kinds=[...new Set(unique.map(item=>item.userData?.partKind||'other'))];
  return {label:`${unique.length} parte${unique.length===1?'':'s'} selecionada${unique.length===1?'':'s'}`,labels,kinds,partIds:unique.map(item=>item.userData?.partId||item.uuid),kind:kinds.length===1?kinds[0]:'mixed',nature:'Execução operacional',activity:'Registro de área selecionada',stage:demoData.activities.find(stage=>stage.id===appStore.get().selectedStage)?.name||'Etapa não vinculada',selectedAt:new Date().toISOString()};
};

MapScene.prototype.renderRecordsSelectionPanel=function(){
  this.querySelector('[data-records-additive-panel]')?.remove();
  const parts=[...(this._recordsSelectedParts?.values?.()||[])];if(!parts.length)return;
  const panel=document.createElement('aside');panel.dataset.recordsAdditivePanel='true';panel.className='map-selection-panel records-additive-panel';
  const area=this.recordsAreaFromParts(parts);
  panel.innerHTML=`<div class="map-selection-panel-head"><div><span class="activity-kind">SELEÇÃO ADITIVA · DIÁRIO</span><h2>${parts.length} parte${parts.length===1?'':'s'} selecionada${parts.length===1?'':'s'}</h2></div><button type="button" data-records-selection-clear aria-label="Fechar seleção">×</button></div><p class="map-selection-help">Arraste novamente para somar solo, asfalto, lotes ou estruturas. A seleção permanece até limpar ou usar no apontamento.</p><div class="map-selection-chips">${area.labels.slice(0,7).map(label=>`<span class="map-selection-chip">${esc(label)}</span>`).join('')}${area.labels.length>7?`<span class="map-selection-chip">+${area.labels.length-7}</span>`:''}</div><div class="map-selection-panel-actions"><button type="button" class="ghost" data-records-selection-clear>Limpar seleção</button><button type="button" class="primary" data-records-selection-use>Usar no Diário</button></div>`;
  this.appendChild(panel);
  panel.querySelectorAll('[data-records-selection-clear]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.clearRecordsAdditiveSelection();}));
  panel.querySelector('[data-records-selection-use]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const selectedArea=this.recordsAreaFromParts([...(this._recordsSelectedParts?.values?.()||[])]);appStore.set({editingRecord:'new',recordContext:selectedArea,selectedRecord:null,lastAction:`Vinculou ${selectedArea.label} ao Diário`});});
};

MapScene.prototype.clearRecordsAdditiveSelection=function(){
  for(const item of this._recordsSelectedParts?.values?.()||[]){delete item.userData.recordsAdditiveMaterial;this.restorePartMaterial?.(item);}
  this._recordsSelectedParts=new Map();this.querySelector('[data-records-additive-panel]')?.remove();delete this.dataset.recordsSelectionCount;this.renderer?.render(this.scene,this.camera);
};

MapScene.prototype.addRecordsParts=function(parts=[]){
  this._recordsSelectedParts??=new Map();
  parts.map(partAncestor).filter(Boolean).forEach(item=>{
    const key=item.userData?.partId||item.uuid;if(this._recordsSelectedParts.has(key))return;
    this._recordsSelectedParts.set(key,item);
    item.userData.recordsAdditiveMaterial=this.materialForColor?.(item.userData.defaultMaterial,0x78a9ff,.9)||item.material;
    item.material=item.userData.recordsAdditiveMaterial;
  });
  const all=[...this._recordsSelectedParts.values()];
  this.dataset.recordsSelectionCount=String(all.length);this.renderRecordsSelectionPanel();this.renderer?.render(this.scene,this.camera);
  const area=this.recordsAreaFromParts(all);this.lastRecordMapArea=area;this.dataset.recordPaintArea=JSON.stringify(area);this._recordPaintCallback?.(area);
  return area;
};

MapScene.prototype.enableRecordsAdditiveSelection=function(){
  this.recordPaintMode=true;this.dataset.recordPaintMode='true';
  if(this._recordsCaptureInstalled)return;
  const install=()=>{
    const canvas=this.querySelector('.three-overlay');if(!canvas||!this.camera||!this.modelGroup)return false;
    this._recordsCaptureInstalled=true;this._recordsSelectedParts??=new Map();
    let start=null,pointerId=null;
    const active=()=>appStore.get().view==='records';
    canvas.addEventListener('pointerdown',event=>{
      if(!active()||event.button!==0)return;
      event.preventDefault();event.stopImmediatePropagation();pointerId=event.pointerId;start={x:event.clientX,y:event.clientY};this.beginMapAreaSelection?.(event.clientX,event.clientY);canvas.setPointerCapture?.(event.pointerId);this.dataset.mapGesture='records-additive-select';
    },true);
    canvas.addEventListener('pointermove',event=>{
      if(!active()||pointerId!==event.pointerId||!start)return;
      event.preventDefault();event.stopImmediatePropagation();this.updateMapAreaSelection?.(event.clientX,event.clientY);
    },true);
    const finish=event=>{
      if(!active()||pointerId!==event.pointerId||!start)return;
      event.preventDefault();event.stopImmediatePropagation();
      const distance=Math.hypot(event.clientX-start.x,event.clientY-start.y);let parts=[];
      if(distance>3)parts=this.collectModelPartsInRect?.(start,{x:event.clientX,y:event.clientY})||[];
      else{
        const point=this.pointFromClient?.(event.clientX,event.clientY),canvasRect=canvas.getBoundingClientRect();
        if(point&&canvasRect.width&&canvasRect.height){
          this.pointer.x=(point.x/canvas.clientWidth)*2-1;this.pointer.y=-(point.y/canvas.clientHeight)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);
          const hit=this.raycaster.intersectObject(this.modelGroup,true)?.[0]?.object,part=partAncestor(hit);if(part)parts=[part];
        }
      }
      this.removeMapAreaSelection?.();if(parts.length)this.addRecordsParts(parts);canvas.releasePointerCapture?.(event.pointerId);start=null;pointerId=null;delete this.dataset.mapGesture;
    };
    canvas.addEventListener('pointerup',finish,true);canvas.addEventListener('pointercancel',event=>{if(pointerId===event.pointerId){this.removeMapAreaSelection?.();start=null;pointerId=null;delete this.dataset.mapGesture;}},true);
    return true;
  };
  if(!install()){let attempts=0;const timer=setInterval(()=>{attempts++;if(install()||attempts>80)clearInterval(timer);},100);}
};

const mapConnected=MapScene.prototype.connectedCallback;
MapScene.prototype.connectedCallback=function(){
  mapConnected.call(this);
  if(this.hasAttribute('compact'))return;
  const tune=state=>{
    if(!this.renderer)return;
    const records=state.view==='records';
    if(records){this.renderer.setPixelRatio?.(1);this.enableRecordsAdditiveSelection();this.querySelector('.map-selection-launch')?.setAttribute('hidden','');}
    else{this.renderer.setPixelRatio?.(Math.min(1.5,window.devicePixelRatio||1));this.setRecordPaintMode?.(false);this.querySelector('.map-selection-launch')?.removeAttribute('hidden');}
  };
  tune(appStore.get());this._hotfixMapUnsub=appStore.subscribe(tune);
};

const chatConnected=AiChat.prototype.connectedCallback;
AiChat.prototype.connectedCallback=function(){
  chatConnected.call(this);
  this.style.position='fixed';
  const handle=this.querySelector('.drag-handle');handle?.addEventListener('pointerdown',()=>{this.dataset.manualPosition='true';},{capture:true});
  const place=()=>{
    if(this.dataset.manualPosition==='true'||this.classList.contains('is-dragging')||this.classList.contains('is-resizing'))return;
    const view=appStore.get().view,margin=18;
    this.style.position='fixed';this.style.top='auto';this.style.transform='none';
    if(view==='leads'){
      this.style.left=`${margin}px`;this.style.right='auto';this.style.bottom=`${margin}px`;
    }else{
      this.style.left='auto';this.style.right=`${margin}px`;this.style.bottom=`${margin}px`;
    }
  };
  this._hotfixChatPlace=place;place();window.addEventListener('resize',place,{passive:true});window.addEventListener('scroll',place,{passive:true,capture:true});this._hotfixChatUnsub=appStore.subscribe(()=>place());
};

// A navegação usa o MapScene persistente existente; o source-base já mantém
// centerSceneInContext() sem reescrever pan/zoom/câmera.

syncCalculatedProgress();

// BELAVISTA_WIDGET_INTERACTION_FIX_V2
// Floating windows use one delegated interaction layer so rerenders do not
// invalidate close or drag handlers.
const WIDGET_DRAG_SELECTOR=[
  'map-scene .map-selection-panel',
  '.dashboard-home > .float-card',
  'map-filter-rail',
  '.floating-widget',
  '.lead-sidebar-widget',
  '.leads-lot-selected'
].join(',');

const WIDGET_INTERACTIVE_SELECTOR='button,input,textarea,select,a,label,[contenteditable="true"],[role="button"]';
const WIDGET_POSITIONS_KEY='belavista.widget-positions.v2';
const widgetPositions=(()=>{try{return JSON.parse(sessionStorage.getItem(WIDGET_POSITIONS_KEY)||'{}')}catch{return {}}})();
const draggableWidgetKey=widget=>{
  if(widget.matches('.map-selection-panel'))return '';
  if(widget.tagName==='MAP-FILTER-RAIL')return 'map-filter-rail';
  if(widget.dataset.widgetId)return `id:${widget.dataset.widgetId}`;
  const stable=[...widget.classList].filter(name=>!['float-card','widget-dragging'].includes(name)).sort().join('.');
  return stable?`${widget.tagName.toLowerCase()}:${stable}`:widget.tagName.toLowerCase();
};
const saveWidgetPosition=(widget,x,y)=>{
  const key=draggableWidgetKey(widget);if(!key)return;
  widgetPositions[key]={x:Math.round(x),y:Math.round(y)};
  try{sessionStorage.setItem(WIDGET_POSITIONS_KEY,JSON.stringify(widgetPositions))}catch{}
};
const applyStoredWidgetPosition=widget=>{
  const key=draggableWidgetKey(widget),pos=key&&widgetPositions[key];if(!pos)return;
  widget.style.setProperty('left',`${pos.x}px`,'important');
  widget.style.setProperty('top',`${pos.y}px`,'important');
  widget.style.setProperty('right','auto','important');
  widget.style.setProperty('bottom','auto','important');
  widget.style.setProperty('transform','none','important');
  widget.dataset.widgetManualPosition='true';
};
const applyStoredWidgetPositions=root=>{
  root?.querySelectorAll?.(WIDGET_DRAG_SELECTOR).forEach(applyStoredWidgetPosition);
};

function widgetCloseFromButton(button){
  const panel=button.closest?.('.map-selection-panel');
  if(panel){
    const scene=panel.closest('map-scene');
    // Close means close AND clear the transient visual selection represented
    // by the panel, so it cannot be recreated by stale selection state.
    if(panel.matches('[data-records-additive-panel]')||button.matches('[data-records-selection-clear]')){
      scene?.clearRecordsAdditiveSelection?.();
    }else if(panel.dataset.mapSelectionPanel==='status'||button.matches('[data-map-status-clear]')){
      scene?.clearMapStatusSelection?.();
    }else if(panel.dataset.mapSelectionPanel==='reservation'||button.matches('[data-map-selection-clear]')){
      scene?.clearLotSelection?.(false);
    }else{
      scene?.removeMapSelectionPanel?.();
      if(scene){
        scene.progressSelectionParts=[];
        scene.statusSelectionParts=[];
      }
    }
    panel.remove();
    return true;
  }

  const floatCard=button.closest?.('.float-card');
  if(floatCard){
    hideFloatingWidget(floatCard);
    return true;
  }

  const widget=button.closest?.('.floating-widget,.lead-sidebar-widget,.leads-lot-selected');
  if(widget){
    widget.hidden=true;
    widget.setAttribute('aria-hidden','true');
    return true;
  }
  return false;
}

// Capture before component-local handlers. Every × / close control in a
// floating selection window is therefore deterministic even after rerenders.
document.addEventListener('click',event=>{
  const button=event.target.closest?.(
    '[data-map-status-clear],[data-map-selection-clear],[data-map-selection-close],'+
    '[data-records-selection-clear],[data-widget-close],.card-close,.detail-close,.leads-lot-close'
  );
  if(!button)return;
  const floating=button.closest?.('.map-selection-panel,.float-card,.floating-widget,.lead-sidebar-widget,.leads-lot-selected');
  if(!floating)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  widgetCloseFromButton(button);
},true);

function widgetDragHandleAllows(widget,target){
  if(target.closest?.(WIDGET_INTERACTIVE_SELECTOR))return false;
  if(widget.matches('.map-selection-panel')){
    return Boolean(target.closest('.map-selection-panel-head'));
  }
  if(widget.matches('map-filter-rail')){
    return Boolean(target.closest('.map-filter-rail-head'));
  }
  const explicit=widget.querySelector?.('.widget-drag-handle,.drag-handle,.card-head,.dashboard-panel-title');
  if(explicit)return Boolean(target.closest('.widget-drag-handle,.drag-handle,.card-head,.dashboard-panel-title'));
  return true;
}

function widgetDragBounds(widget){
  const style=getComputedStyle(widget);
  const fixed=style.position==='fixed';
  if(fixed){
    return {left:0,top:0,width:window.innerWidth,height:window.innerHeight,fixed:true};
  }
  const parent=widget.offsetParent||widget.parentElement;
  const rect=parent?.getBoundingClientRect?.();
  if(rect)return {left:rect.left,top:rect.top,width:rect.width,height:rect.height,fixed:false};
  return {left:0,top:0,width:window.innerWidth,height:window.innerHeight,fixed:true};
}

document.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false)return;
  const widget=event.target.closest?.(WIDGET_DRAG_SELECTOR);
  if(!widget||!widgetDragHandleAllows(widget,event.target))return;
  if(matchMedia('(max-width: 760px)').matches&&!widget.matches('.map-selection-panel'))return;

  const rect=widget.getBoundingClientRect();
  const bounds=widgetDragBounds(widget);
  const origin={x:event.clientX,y:event.clientY};
  const initial={x:rect.left-bounds.left,y:rect.top-bounds.top};
  let moved=false;

  const move=ev=>{
    if(ev.pointerId!==event.pointerId)return;
    const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
    if(!moved&&Math.hypot(dx,dy)<4)return;
    moved=true;
    ev.preventDefault();
    const maxX=Math.max(8,bounds.width-widget.offsetWidth-8);
    const maxY=Math.max(8,bounds.height-widget.offsetHeight-8);
    const x=Math.max(8,Math.min(maxX,initial.x+dx));
    const y=Math.max(8,Math.min(maxY,initial.y+dy));

    // setProperty(..., important) intentionally beats the dashboard's static
    // !important layout rules once the user manually repositions a widget.
    widget.style.setProperty('left',`${x}px`,'important');
    widget.style.setProperty('top',`${y}px`,'important');
    widget.style.setProperty('right','auto','important');
    widget.style.setProperty('bottom','auto','important');
    widget.style.setProperty('transform','none','important');
    widget.dataset.widgetManualPosition='true';
    widget.dataset.dragX=String(x);
    widget.dataset.dragY=String(y);
    widget.classList.add('widget-dragging');
  };

  const finish=ev=>{
    if(ev.pointerId!==event.pointerId)return;
    document.removeEventListener('pointermove',move,true);
    document.removeEventListener('pointerup',finish,true);
    document.removeEventListener('pointercancel',finish,true);
    widget.releasePointerCapture?.(event.pointerId);
    widget.classList.remove('widget-dragging');
    if(moved){
      saveWidgetPosition(widget,Number(widget.dataset.dragX)||0,Number(widget.dataset.dragY)||0);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  widget.setPointerCapture?.(event.pointerId);
  document.addEventListener('pointermove',move,{capture:true,passive:false});
  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);
},true);

// Reapply manual positions after any view rerender without coupling them to
// appStore/map state.
const widgetPositionRender=ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){
  widgetPositionRender.call(this);
  requestAnimationFrame(()=>applyStoredWidgetPositions(this));
};
if(document.body){
  const widgetPositionObserver=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.matches?.(WIDGET_DRAG_SELECTOR))applyStoredWidgetPosition(node);
        applyStoredWidgetPositions(node);
      }
    }
  });
  widgetPositionObserver.observe(document.body,{childList:true,subtree:true});
  applyStoredWidgetPositions(document);
}
