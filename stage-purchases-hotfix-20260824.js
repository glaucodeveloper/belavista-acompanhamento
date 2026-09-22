import {appStore,demoData,reportCatalog} from './state.js?v=site-materials-8';

const AppSidebar=customElements.get('app-sidebar');
const ViewLayer=customElements.get('view-layer');
if(!AppSidebar||!ViewLayer)throw new Error('Aliança Park stage/purchases hotfix: componentes base indisponíveis.');

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ico=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
const shortDate=value=>{if(!value)return 'Sem data';const [y,m,d]=String(value).slice(0,10).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(value)};
const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error('Falha ao ler arquivo.'));reader.readAsDataURL(file);});
function feedback(message,tone='info'){
  let host=document.querySelector('.stage-purchase-toast');
  if(!host){host=document.createElement('div');host.className='stage-purchase-toast';document.body.appendChild(host);}
  host.textContent=message;host.dataset.tone=tone;host.classList.add('show');clearTimeout(host._timer);host._timer=setTimeout(()=>host.classList.remove('show'),2600);
}

// ---------------------------------------------------------------------------
// Etapas: overview sempre começa por todas as etapas e mantém diagramas visíveis.
// ---------------------------------------------------------------------------
const sidebarRender=AppSidebar.prototype.render;
AppSidebar.prototype.render=function(){
  sidebarRender.call(this);
  const state=appStore.get();
  const stages=this.querySelector('[data-view="stages"]');
  stages?.addEventListener('click',()=>{
    // O botão de topo da árvore sempre significa "todas as etapas".
    appStore.set({view:'stages',stageSelected:false,activityDedicated:false,selectedActivity:null,lastAction:'Abriu todas as etapas da obra'});
  });
  if(!this.querySelector('[data-view="purchases"]')){
    const records=this.querySelector('[data-view="records"]');
    const button=document.createElement('button');
    button.className=`nav-item ${state.view==='purchases'?'active':''}`;
    button.dataset.view='purchases';
    button.innerHTML=`${ico('receipt-text')}<span>Compras e recibos</span>`;
    button.addEventListener('click',()=>appStore.set({view:'purchases',activityDedicated:false,selectedActivity:null,lastAction:'Abriu compras e recibos'}));
    records?.insertAdjacentElement('afterend',button);
  }
  window.lucide?.createIcons();
};

const diagramCards=()=>`<section class="stage-diagram-hub" data-stage-diagram-hub><header><div><span>DIAGRAMAS OPERACIONAIS</span><h2>Quatro leituras da etapa</h2><p>Os diagramas anteriores continuam disponíveis como visualizações completas e usam a etapa selecionada.</p></div></header><div class="stage-diagram-grid">
  <button data-stage-diagram="pert"><div class="mini-pert"><i></i><i></i><i></i><b></b><b></b></div><strong>PERT Canvas</strong><small>Dependências e liberação de atividades</small></button>
  <button data-stage-diagram="actions"><div class="mini-matrix"><i></i><i></i><i></i><span></span><b></b></div><strong>Impact × Readiness</strong><small>Ações da IA por impacto e prontidão</small></button>
  <button data-stage-diagram="raci"><div class="mini-raci"><i>R</i><i>A</i><i>C</i><i>I</i><span></span><span></span><span></span><span></span></div><strong>RACI interativa</strong><small>Responsabilidade por atividade</small></button>
  <button data-stage-diagram="raid"><div class="mini-raid"><i></i><i></i><i></i><i></i></div><strong>RAID Workspace</strong><small>Riscos, premissas, problemas e dependências</small></button>
</div></section>`;

function enhanceStageSurface(root){
  if(appStore.get().view!=='stages')return;
  const overview=root.querySelector('.stage-overview-rework');
  const detail=root.querySelector('.stage-detail-rework');
  if(overview){
    const summary=overview.querySelector('.stage-summary-panel'),layout=overview.querySelector('.stage-explorer-layout');
    if(summary&&layout&&summary.previousElementSibling!==overview.querySelector('.stage-rework-head'))layout.before(summary);
    const main=overview.querySelector('.stage-rework-main'),rel=main?.querySelector('.stage-relational-panel');
    if(main&&!main.querySelector('[data-stage-diagram-hub]'))rel?.insertAdjacentHTML('afterend',diagramCards());
  }
  if(detail){
    const main=detail.querySelector('.stage-rework-main'),planner=main?.querySelector('.stage-planner-panel');
    if(main&&!main.querySelector('[data-stage-diagram-hub]'))planner?.insertAdjacentHTML('afterend',diagramCards());
  }
  window.lucide?.createIcons();
}

// Tabs robustas: delegação em capture e atributo hidden explícito. Isso evita
// depender da cadeia de ViewLayer.bind() que hoje é estendida por vários módulos.
document.addEventListener('click',event=>{
  const openAll=event.target.closest?.('.nav-item[data-view="stages"],.chat-quick-actions [data-view="stages"]');
  if(openAll){event.preventDefault();event.stopImmediatePropagation();appStore.set({view:'stages',stageSelected:false,activityDedicated:false,selectedActivity:null,lastAction:'Abriu todas as etapas da obra'});return;}
  const tab=event.target.closest?.('[data-stage-pane-tab]');
  if(tab){
    event.preventDefault();event.stopImmediatePropagation();
    const host=tab.closest('.stage-planner-panel'),name=tab.dataset.stagePaneTab;
    if(!host)return;
    host.querySelectorAll('[data-stage-pane-tab]').forEach(item=>{const active=item===tab;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});
    host.querySelectorAll('.stage-planner-panes>[data-stage-pane]').forEach(pane=>{const active=pane.dataset.stagePane===name;pane.classList.toggle('active',active);pane.hidden=!active;});
    try{sessionStorage.setItem(`belavista.stage-pane.${appStore.get().selectedStage||'overview'}`,name)}catch{}
    return;
  }
  const legacy=event.target.closest?.('[data-stage-plan]');
  if(legacy){
    event.preventDefault();event.stopImmediatePropagation();
    const panel=legacy.closest('.stage-planning-panel,.stage-planning-surface,.utility-panel')||legacy.parentElement?.parentElement;
    if(!panel)return;
    panel.querySelectorAll('[data-stage-plan]').forEach(item=>item.classList.toggle('active',item===legacy));
    panel.querySelectorAll('[data-stage-pane]').forEach(pane=>pane.hidden=pane.dataset.stagePane!==legacy.dataset.stagePlan);
    return;
  }
  const diagram=event.target.closest?.('[data-stage-diagram]');
  if(diagram){
    event.preventDefault();event.stopImmediatePropagation();
    appStore.set({view:diagram.dataset.stageDiagram,stageSelected:true,activityDedicated:false,lastAction:`Abriu diagrama ${diagram.textContent.trim()}`});
  }
},true);

function restoreStagePane(root){
  const panel=root.querySelector('.stage-planner-panel');if(!panel)return;
  let name='schedule';try{name=sessionStorage.getItem(`belavista.stage-pane.${appStore.get().selectedStage||'overview'}`)||'schedule'}catch{}
  const button=panel.querySelector(`[data-stage-pane-tab="${CSS.escape(name)}"]`)||panel.querySelector('[data-stage-pane-tab="schedule"]');
  panel.querySelectorAll('[data-stage-pane-tab]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});
  panel.querySelectorAll('.stage-planner-panes>[data-stage-pane]').forEach(pane=>{const active=pane.dataset.stagePane===button?.dataset.stagePaneTab;pane.classList.toggle('active',active);pane.hidden=!active;});
}

// ---------------------------------------------------------------------------
// Compras / recibos persistentes.
// ---------------------------------------------------------------------------
let receiptLoadPromise=null;
function applyReceiptsToReports(receipts,summary){
  const supplier=reportCatalog.find(item=>item.id==='supplier-payments');
  if(supplier){
    supplier.source='Compras · Recibos armazenados · Documentos fiscais';
    supplier.metrics=[
      ['Recibos armazenados',String(summary.count||0),'Arquivos persistidos'],
      ['Valor documentado',money(summary.totalCents),'Soma dos recibos'],
      ['Fornecedores',String(summary.suppliers||0),'Com documentos'],
      ['Sem pedido vinculado',String(summary.unlinked||0),'Revisar associação']
    ];
    supplier.rows=(receipts.length?receipts.slice(0,24).map(item=>[
      item.supplier||'Fornecedor não informado',
      item.documentNumber||item.fileName,
      `${item.purchaseId||'Sem pedido'} · ${item.stage||'Sem etapa'}`,
      shortDate(item.issueDate),
      'Documento armazenado'
    ]):[['Nenhum recibo','—','Use Compras e recibos para armazenar documentos','—','Aguardando']]);
  }
  const monthly=reportCatalog.find(item=>item.id==='monthly-spend');
  if(monthly&&receipts.length){
    const byMonth=new Map();
    receipts.forEach(item=>{const month=String(item.issueDate||item.createdAt||'').slice(0,7)||'Sem data';const row=byMonth.get(month)||{month,total:0,terr:0,dren:0,pav:0};row.total+=Number(item.amountCents)||0;const stage=String(item.stage||'').toLowerCase();if(stage.includes('terra'))row.terr+=Number(item.amountCents)||0;if(stage.includes('dren'))row.dren+=Number(item.amountCents)||0;if(stage.includes('pav'))row.pav+=Number(item.amountCents)||0;byMonth.set(month,row);});
    monthly.source='Recibos armazenados · agrupamento por competência e etapa';
    monthly.metrics=[['Recibos',String(summary.count||0),'Base documental'],['Total documentado',money(summary.totalCents),'Acumulado'],['Competência atual',money(summary.currentMonthCents),'Recibos do mês'],['Etapas com recibos',String(summary.byStage?.length||0),'Centros documentados']];
    monthly.rows=[...byMonth.values()].sort((a,b)=>String(b.month).localeCompare(String(a.month))).slice(0,12).map(row=>[row.month,money(row.terr),money(row.dren),money(row.pav),money(row.total)]);
  }
}
async function ensureReceipts(force=false){
  const state=appStore.get();if(state.purchaseReceiptsLoaded&&!force)return state.purchaseReceipts||[];
  if(receiptLoadPromise&&!force)return receiptLoadPromise;
  receiptLoadPromise=(async()=>{
    try{
      const response=await fetch('/api/purchase-receipts',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json(),receipts=Array.isArray(payload.receipts)?payload.receipts:[],summary=payload.summary||{};
      applyReceiptsToReports(receipts,summary);
      appStore.set({purchaseReceipts:receipts,purchaseReceiptSummary:summary,purchaseReceiptsLoaded:true});
      return receipts;
    }catch(error){console.warn('Recibos persistentes indisponíveis.',error);appStore.set({purchaseReceiptsLoaded:true,purchaseReceiptsError:String(error?.message||error)});return []}
    finally{receiptLoadPromise=null;}
  })();
  return receiptLoadPromise;
}

const basePurchases=ViewLayer.prototype.purchases;
ViewLayer.prototype.purchases=function(){
  const state=appStore.get(),receipts=state.purchaseReceipts||[],summary=state.purchaseReceiptSummary||{},orders=demoData.purchases||[];
  const delayed=orders.filter(item=>/atras/i.test(item.status)).length;
  const receiptRows=receipts.length?receipts.map(item=>`<tr data-receipt-row="${esc(item.id)}"><td><a href="${esc(item.fileUrl)}" target="_blank" rel="noopener">${ico(item.mimeType==='application/pdf'?'file-text':'image')} ${esc(item.fileName)}</a></td><td>${esc(item.purchaseId||'—')}</td><td>${esc(item.supplier||'—')}</td><td>${esc(item.stage||'—')}</td><td>${money(item.amountCents)}</td><td>${shortDate(item.issueDate)}</td><td><button type="button" data-receipt-delete="${esc(item.id)}" aria-label="Excluir recibo">${ico('trash-2')}</button></td></tr>`).join(''):`<tr><td colspan="7"><div class="receipt-empty">Nenhum recibo armazenado. Adicione a primeira nota, recibo ou comprovante.</div></td></tr>`;
  return `<div class="purchases-receipts-workspace">
    <header class="purchase-page-head"><div><span class="activity-kind">SUPRIMENTOS · BASE DOCUMENTAL</span><h1>Compras e recibos</h1><p>Cada comprovante fica armazenado localmente, ligado ao pedido e à etapa, e alimenta os relatórios financeiros e de suprimentos.</p></div><button type="button" data-receipts-refresh>${ico('refresh-cw')} Atualizar documentos</button></header>
    <div class="purchase-kpis"><article><small>PEDIDOS VISÍVEIS</small><b>${orders.length}</b><span>${delayed} atrasados</span></article><article><small>RECIBOS ARMAZENADOS</small><b>${summary.count||0}</b><span>${summary.suppliers||0} fornecedores</span></article><article><small>VALOR DOCUMENTADO</small><b>${money(summary.totalCents||0)}</b><span>base dos relatórios</span></article><article><small>COMPETÊNCIA ATUAL</small><b>${money(summary.currentMonthCents||0)}</b><span>recibos do mês</span></article></div>
    <div class="purchase-doc-layout"><section class="purchase-receipt-capture"><header><div><span class="activity-kind">NOVO DOCUMENTO</span><h2>Armazenar recibo</h2><p>PDF ou imagem de até 12 MB. O arquivo permanece em <code>data/receipts</code> e a referência fica no SQLite.</p></div></header><form data-receipt-form>
      <label class="receipt-file full"><span>Arquivo do recibo / NF / comprovante</span><input required type="file" name="receiptFile" accept="application/pdf,image/jpeg,image/png,image/webp"><small data-receipt-file-name>Selecione PDF, JPG, PNG ou WEBP</small></label>
      <label>Pedido<select name="purchaseId"><option value="">Sem pedido vinculado</option>${orders.map(item=>`<option value="${esc(item.id)}" data-supplier="${esc(item.supplier)}" data-stage="${esc(item.stage)}">${esc(item.id)} · ${esc(item.desc)}</option>`).join('')}</select></label>
      <label>Fornecedor<input name="supplier" placeholder="Fornecedor"></label>
      <label>Etapa<select name="stage"><option value="">Sem etapa</option>${demoData.activities.map(stage=>`<option>${esc(stage.name)}</option>`).join('')}</select></label>
      <label>Valor do documento (R$)<input name="amount" inputmode="decimal" placeholder="0,00"></label>
      <label>Nº do documento<input name="documentNumber" placeholder="NF, recibo ou referência"></label>
      <label>Data de emissão<input name="issueDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
      <label class="full">Observação<textarea name="notes" rows="2" placeholder="Condição de pagamento, material, centro de custo ou observação"></textarea></label>
      <footer class="full"><span>${state.purchaseReceiptsError?'Servidor de recibos indisponível: '+esc(state.purchaseReceiptsError):'O documento passa a compor Suprimentos e Resumo mensal de gastos.'}</span><button type="submit">${ico('archive')} Armazenar documento</button></footer>
    </form></section>
    <section class="purchase-orders-panel"><header><div><span class="activity-kind">PEDIDOS</span><h2>Compromissos em acompanhamento</h2></div></header><div class="purchase-orders-list">${orders.map(item=>`<article><span><b>${esc(item.id)}</b><small>${esc(item.stage)}</small></span><div><strong>${esc(item.desc)}</strong><small>${esc(item.supplier)}</small></div><em>${esc(item.value)}<small>${esc(item.status)}</small></em></article>`).join('')}</div></section></div>
    <section class="purchase-receipts-panel"><header><div><span class="activity-kind">ARQUIVO FISCAL</span><h2>Todos os recibos armazenados</h2><p>Abra o documento original, confira o vínculo e remova apenas quando o lançamento estiver incorreto.</p></div><span>${receipts.length} documento(s)</span></header><div class="receipt-table-wrap"><table><thead><tr><th>Arquivo</th><th>Pedido</th><th>Fornecedor</th><th>Etapa</th><th>Valor</th><th>Emissão</th><th></th></tr></thead><tbody>${receiptRows}</tbody></table></div></section>
  </div>`;
};

const baseReports=ViewLayer.prototype.reports;
ViewLayer.prototype.reports=function(){
  const html=baseReports.call(this),state=appStore.get(),summary=state.purchaseReceiptSummary||{},receipts=state.purchaseReceipts||[];
  const stages=(summary.byStage||[]).slice(0,6).map(row=>`<span><b>${esc(row.stage)}</b><small>${row.count} docs · ${money(row.amountCents)}</small></span>`).join('')||'<span><b>Sem documentos</b><small>Adicione recibos em Compras</small></span>';
  const contribution=`<section class="receipt-report-contribution"><header><div><span class="activity-kind">BASE DOCUMENTAL DE COMPRAS</span><h3>Recibos que contribuem para este relatório</h3><p>Valores documentados são derivados dos comprovantes persistidos, sem substituir orçamento ou valores planejados.</p></div><button type="button" data-view-purchases>${ico('receipt-text')} Abrir recibos</button></header><div class="receipt-report-metrics"><article><small>DOCUMENTOS</small><b>${summary.count||0}</b></article><article><small>VALOR DOCUMENTADO</small><b>${money(summary.totalCents||0)}</b></article><article><small>NO MÊS</small><b>${money(summary.currentMonthCents||0)}</b></article><article><small>FORNECEDORES</small><b>${summary.suppliers||0}</b></article></div><div class="receipt-report-stages">${stages}</div>${receipts.length?`<footer>Último documento: ${esc(receipts[0].fileName)} · ${esc(receipts[0].supplier||'fornecedor não informado')} · ${money(receipts[0].amountCents)}</footer>`:''}</section>`;
  return html.replace('<glass-card class="float-card reports-main">',`${contribution}<glass-card class="float-card reports-main">`);
};

const baseBind=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  baseBind.call(this);
  const state=appStore.get();
  if(state.view==='purchases'||state.view==='reports')ensureReceipts();
  this.querySelector('[data-receipts-refresh]')?.addEventListener('click',()=>ensureReceipts(true));
  this.querySelector('[data-view-purchases]')?.addEventListener('click',()=>appStore.set({view:'purchases',lastAction:'Abriu recibos a partir do relatório'}));
  const form=this.querySelector('[data-receipt-form]');
  if(form){
    const file=form.elements.receiptFile,name=form.querySelector('[data-receipt-file-name]');
    file?.addEventListener('change',()=>{name.textContent=file.files?.[0]?`${file.files[0].name} · ${(file.files[0].size/1024/1024).toFixed(2)} MB`:'Selecione PDF, JPG, PNG ou WEBP';});
    form.elements.purchaseId?.addEventListener('change',event=>{const option=event.target.selectedOptions?.[0];if(!option)return;if(option.dataset.supplier)form.elements.supplier.value=option.dataset.supplier;if(option.dataset.stage){const stage=[...form.elements.stage.options].find(item=>item.textContent.toLowerCase().includes(option.dataset.stage.toLowerCase().split(' ')[0]));if(stage)form.elements.stage.value=stage.value;}});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const file=form.elements.receiptFile.files?.[0];if(!file)return;
      if(file.size>12_000_000){feedback('Arquivo maior que 12 MB.','warning');return;}
      const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Armazenando…';
      try{
        const parseAmount=value=>{const normalized=String(value||'').trim().replace(/\./g,'').replace(',','.');return Math.round((Number(normalized)||0)*100)};
        const dataUrl=await readFile(file),fd=new FormData(form),payload={purchaseId:String(fd.get('purchaseId')||''),supplier:String(fd.get('supplier')||''),stage:String(fd.get('stage')||''),amountCents:parseAmount(fd.get('amount')),documentNumber:String(fd.get('documentNumber')||''),issueDate:String(fd.get('issueDate')||''),notes:String(fd.get('notes')||''),fileName:file.name,mimeType:file.type,dataUrl};
        const response=await fetch('/api/purchase-receipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const json=await response.json();if(!response.ok)throw new Error(json.error||`HTTP ${response.status}`);
        appStore.set({lastAction:`Armazenou recibo ${file.name}`});await ensureReceipts(true);feedback('Recibo armazenado e incorporado aos relatórios.','success');
      }catch(error){console.error(error);feedback(error.message||'Não foi possível armazenar o recibo.','warning');button.disabled=false;button.innerHTML=`${ico('archive')} Armazenar documento`;window.lucide?.createIcons();}
    });
  }
  this.querySelectorAll('[data-receipt-delete]').forEach(button=>button.addEventListener('click',async()=>{
    if(!confirm('Remover este recibo e o arquivo armazenado?'))return;
    try{const response=await fetch(`/api/purchase-receipts/${encodeURIComponent(button.dataset.receiptDelete)}`,{method:'DELETE'});const json=await response.json();if(!response.ok)throw new Error(json.error||`HTTP ${response.status}`);appStore.set({lastAction:'Removeu recibo de compra'});await ensureReceipts(true);feedback('Recibo removido.','success');}catch(error){feedback(error.message||'Falha ao remover recibo.','warning');}
  }));
};

const baseRender=ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){
  baseRender.call(this);
  enhanceStageSurface(this);
  restoreStagePane(this);
};

// Se a aplicação foi restaurada diretamente em "Etapas" sem uma seleção
// intencional desta sessão, a primeira superfície é a visão com todas as etapas.
if(appStore.get().view==='stages'&&appStore.get().activityDedicated)appStore.set({activityDedicated:false,stageSelected:false,selectedActivity:null});
