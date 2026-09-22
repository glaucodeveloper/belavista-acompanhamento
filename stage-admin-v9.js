import {appStore} from './state.js?v=operations-v19';
import {apiFetch} from './api-client.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
const number=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Number(value)||0);
const splitLines=value=>String(value||'').split(/\r?\n|,/).map(item=>item.trim()).filter(Boolean);
const actorHeaders=(extra={})=>{const actor=appStore.get().currentActor||{role:'owner',uid:'local-warley',name:'Warley'};return {'X-Belavista-Role':actor.role,'X-Belavista-User':actor.uid,'X-Belavista-Name':actor.name,...extra};};
const notify=(message,tone='info')=>window.dispatchEvent(new CustomEvent('belavista:notify',{detail:{message,tone}}));
const cache=new Map();
let activeTab='overview';
let lastStageId=null;

function currentStageId(){
  return Number(appStore.get().selectedStage)||null;
}

function ensureAiFields(form){
  if(!form||form.querySelector('[data-stage-ai-core]'))return;
  const firstLabel=form.querySelector('label');
  const block=document.createElement('div');
  block.className='stage-ai-core-grid';
  block.dataset.stageAiCore='true';
  block.innerHTML=`<label>Requisitos obrigatórios para a IA<textarea name="requirements" rows="4" placeholder="Uma regra por linha. Ex.: só liberar após medição validada."></textarea></label><label>Condições de execução, liberação e bloqueio<textarea name="conditions" rows="4" placeholder="Uma condição por linha. Ex.: bloquear se cobertura de materiais for menor que 80%."></textarea></label>`;
  firstLabel?.insertAdjacentElement('beforebegin',block);
}

function setFormValues(data){
  const form=document.querySelector('.stage-dedicated [data-stage-context-form]');
  if(!form)return;
  ensureAiFields(form);
  const ai=data?.aiConfig||{};
  const execution=ai.executionProfile||{};
  const set=(name,value)=>{const field=form.elements.namedItem(name);if(field)field.value=value??'';};
  set('requirements',(ai.requirements||[]).join('\n'));
  set('conditions',(ai.conditions||[]).join('\n'));
  set('typicalDescription',ai.typicalDescription||form.elements.typicalDescription?.value||'');
  set('requestHints',(ai.requestHints||[]).join('\n'));
  set('evidenceFocus',(ai.evidenceFocus||[]).join('\n'));
  set('procurementFocus',(ai.procurementFocus||[]).join('\n'));
  set('notifyOwner',(ai.notificationTargets?.owner||[]).join(', '));
  set('notifyAdmin',(ai.notificationTargets?.admin||[]).join(', '));
  set('notifyForeman',(ai.notificationTargets?.foreman||[]).join(', '));
  const materials=Array.isArray(execution.materialsTable)?execution.materialsTable:[];
  if(materials.length){
    const tbody=form.querySelector('[data-stage-materials]');
    if(tbody){
      tbody.innerHTML=materials.map(item=>`<tr data-stage-material-row><td><input name="materialName" value="${esc(item.name)}"></td><td><input name="materialDescription" value="${esc(item.description)}"></td><td><input name="materialQuantity" value="${esc(item.quantity)}" inputmode="decimal"></td><td><input name="materialUnit" value="${esc(item.unit)}"></td><td><input name="materialStatus" value="${esc(item.status||'Planejado')}"></td></tr>`).join('');
    }
  }
  const status=form.querySelector('[data-stage-context-status]');
  if(status)status.textContent=ai.updatedAt?`Configuração persistida em ${new Date(ai.updatedAt).toLocaleString('pt-BR')}.`:'Configure requisitos, condições e contexto operacional desta etapa.';
}

const emptyRow=(cols,label)=>`<tr><td colspan="${cols}" class="stage-admin-empty">${label}</td></tr>`;

function overviewHtml(data){
  const s=data.situation||{};
  return `<div class="stage-admin-kpis">
    <article><small>ATIVIDADES</small><strong>${s.activities?.total??data.activities?.length??0}</strong><span>${s.activities?.averageProgress??0}% de avanço médio</span></article>
    <article><small>COMPRAS</small><strong>${money(s.purchases?.valueCents??data.summary?.purchaseTotalCents)}</strong><span>${s.purchases?.late??0} com atraso indicado</span></article>
    <article><small>MATERIAIS</small><strong>${s.materials?.total??data.materials?.length??0}</strong><span>${s.materials?.critical??0} críticos</span></article>
    <article><small>SERVIÇOS</small><strong>${s.services?.total??data.outsourcing?.length??0}</strong><span>${money(s.services?.valueCents||0)}</span></article>
    <article><small>EVIDÊNCIAS</small><strong>${(s.evidence?.records??data.records?.length??0)+(s.evidence?.receipts??data.receipts?.length??0)}</strong><span>registros + comprovantes</span></article>
    <article><small>SALDO DA ETAPA</small><strong>${money(s.cash?.balanceCents??((data.summary?.cashInCents||0)-(data.summary?.cashOutCents||0)))}</strong><span>entradas − saídas vinculadas</span></article>
  </div>
  <div class="stage-admin-overview-grid">
    <form data-stage-admin-meta class="stage-admin-meta-form">
      <header><div><span>PROPRIEDADES DA ETAPA</span><h4>Administração da frente</h4></div><small>Atualização auditável</small></header>
      <label>Nome<input name="name" value="${esc(data.name)}"></label>
      <label>Responsável<input name="owner" value="${esc(data.owner)}"></label>
      <label>Status<select name="status">${['planejado','andamento','concluido','bloqueado'].map(value=>`<option value="${value}" ${String(data.status).toLowerCase()===value?'selected':''}>${value}</option>`).join('')}</select></label>
      <label>Avanço (%)<input name="progress" type="number" min="0" max="100" value="${Number(data.progress)||0}"></label>
      <label>Semana / referência<input name="week" value="${esc(data.week||'')}"></label>
      <footer><span data-stage-admin-meta-status>Alterações alimentam o histórico da etapa.</span><button type="submit">Salvar propriedades</button></footer>
    </form>
    <section class="stage-admin-ai-summary"><header><span>INTELIGÊNCIA DA ETAPA</span><h4>Requisitos e condições vigentes</h4></header><div><small>REQUISITOS</small>${(data.aiConfig?.requirements||[]).map(item=>`<p>${esc(item)}</p>`).join('')||'<p>Nenhum requisito persistido.</p>'}</div><div><small>CONDIÇÕES</small>${(data.aiConfig?.conditions||[]).map(item=>`<p>${esc(item)}</p>`).join('')||'<p>Nenhuma condição persistida.</p>'}</div><div><small>DESCRIÇÃO TÍPICA</small><p>${esc(data.aiConfig?.typicalDescription||'Ainda não configurada.')}</p></div></section>
  </div>`;
}

function activitiesHtml(data){
  const rows=data.activities||[];
  return `<div class="stage-admin-table-wrap"><table><thead><tr><th>Atividade</th><th>Categoria</th><th>Status</th><th>Avanço</th><th>Responsável</th><th>Planejamento</th></tr></thead><tbody>${rows.map(item=>`<tr><td><b>${esc(item.name)}</b></td><td>${esc(item.category||'—')}</td><td>${esc(item.status||'—')}</td><td>${Number(item.progress)||0}%</td><td>${esc(item.ownerId||'—')}</td><td>${esc(item.plannedStart||'—')} → ${esc(item.plannedEnd||'—')}</td></tr>`).join('')||emptyRow(6,'Nenhuma atividade vinculada.')}</tbody></table></div>`;
}

function purchasesHtml(data){
  const rows=data.purchases||[];
  return `<div class="stage-admin-table-wrap"><table><thead><tr><th>ID</th><th>Fornecedor</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Previsto</th><th>Atraso</th></tr></thead><tbody>${rows.map(item=>`<tr><td><code>${esc(item.id)}</code></td><td>${esc(item.supplier)}</td><td>${esc(item.description)}</td><td>${money(item.valueCents)}</td><td>${esc(item.status)}</td><td>${esc(item.expectedDate||'—')}</td><td>${esc(item.delay||'—')}</td></tr>`).join('')||emptyRow(7,'Nenhuma compra vinculada.')}</tbody></table></div><section class="stage-admin-secondary-list"><h4>Comprovantes de compras</h4>${(data.receipts||[]).map(item=>`<article><div><b>${esc(item.supplier||'Fornecedor')}</b><span>${esc(item.documentNumber||'Sem número')} · ${esc(item.issueDate||'sem data')}</span></div><strong>${money(item.amountCents)}</strong><small>${esc(item.fileName||item.notes||'Comprovante')}</small></article>`).join('')||'<p class="stage-admin-empty">Nenhum comprovante associado.</p>'}</section>`;
}

function materialsHtml(data){
  const rows=data.materials||[];
  return `<div class="stage-admin-table-wrap"><table><thead><tr><th>Material</th><th>Planejado</th><th>Recebido</th><th>Usado</th><th>Saldo recebido</th><th>Status</th></tr></thead><tbody>${rows.map(item=>`<tr><td><b>${esc(item.name)}</b><small>${esc(item.unit||'')}</small></td><td>${number(item.plannedQuantity)}</td><td>${number(item.receivedQuantity)}</td><td>${number(item.usedQuantity)}</td><td>${number((Number(item.receivedQuantity)||0)-(Number(item.usedQuantity)||0))}</td><td>${esc(item.status||'—')}</td></tr>`).join('')||emptyRow(6,'Nenhum material recebeu vínculo auditável com esta etapa.')}</tbody></table></div>`;
}

function servicesHtml(data){
  const rows=data.outsourcing||[];
  return `<div class="stage-admin-table-wrap"><table><thead><tr><th>Prestador</th><th>Serviço</th><th>Valor</th><th>Emissão</th><th>Documento</th><th>Observações</th></tr></thead><tbody>${rows.map(item=>`<tr><td><b>${esc(item.contractor)}</b></td><td>${esc(item.service)}</td><td>${money(item.amountCents)}</td><td>${esc(item.issueDate||'—')}</td><td>${esc(item.documentNumber||'—')}</td><td>${esc(item.notes||'—')}</td></tr>`).join('')||emptyRow(6,'Nenhum serviço terceirizado vinculado.')}</tbody></table></div>`;
}

function recordsHtml(data){
  const rows=data.records||[];
  return `<div class="stage-admin-table-wrap"><table><thead><tr><th>Registro</th><th>Data</th><th>Responsável</th><th>Descrição</th><th>Status</th></tr></thead><tbody>${rows.map(item=>`<tr><td><code>${esc(item.id)}</code></td><td>${esc(item.data||'—')} ${esc(item.hora||'')}</td><td>${esc(item.responsavel||'—')}</td><td>${esc(item.detalhes||'—')}</td><td>${esc(item.status||'—')}</td></tr>`).join('')||emptyRow(5,'Nenhum registro de campo vinculado.')}</tbody></table></div>`;
}

function historyHtml(data){
  const rows=data.auditEvents||[];
  return `<div class="stage-admin-history">${rows.map(item=>`<article><time>${item.createdAt?new Date(item.createdAt).toLocaleString('pt-BR'):'—'}</time><div><b>${esc(item.entity)} · ${esc(item.action)}</b><span>${esc(item.entityId||'')}</span><p>${esc(historySummary(item))}</p></div></article>`).join('')||'<p class="stage-admin-empty">Nenhum evento auditável registrado para esta etapa.</p>'}</div>`;
}

function historySummary(item){
  const payload=item.payload||{};
  const entries=Object.entries(payload).filter(([,value])=>['string','number','boolean'].includes(typeof value)).slice(0,5);
  return entries.map(([key,value])=>`${key}: ${value}`).join(' · ')||'Alteração registrada.';
}

function contentHtml(data,tab){
  if(tab==='activities')return activitiesHtml(data);
  if(tab==='purchases')return purchasesHtml(data);
  if(tab==='materials')return materialsHtml(data);
  if(tab==='services')return servicesHtml(data);
  if(tab==='records')return recordsHtml(data);
  if(tab==='history')return historyHtml(data);
  return overviewHtml(data);
}

function workspaceHtml(data){
  const tabs=[['overview','Situação'],['activities','Atividades'],['purchases','Compras'],['materials','Materiais'],['services','Serviços'],['records','Registros'],['history','Histórico']];
  return `<section class="stage-admin-workspace" data-stage-admin-workspace><header class="stage-admin-head"><div><span>ADMINISTRAÇÃO DA ETAPA</span><h2>Histórico, situação e configuração operacional</h2><p>Compras, materiais, serviços, atividades, registros e regras que alimentam a inteligência da frente.</p></div><button type="button" data-stage-admin-refresh>Atualizar leitura</button></header><nav class="stage-admin-tabs">${tabs.map(([key,label])=>`<button type="button" data-stage-admin-tab="${key}" class="${activeTab===key?'active':''}">${label}</button>`).join('')}</nav><div class="stage-admin-content" data-stage-admin-content>${contentHtml(data,activeTab)}</div></section>`;
}

function bindWorkspace(workspace,data){
  workspace.querySelectorAll('[data-stage-admin-tab]').forEach(button=>button.addEventListener('click',()=>{activeTab=button.dataset.stageAdminTab;workspace.querySelectorAll('[data-stage-admin-tab]').forEach(item=>item.classList.toggle('active',item===button));workspace.querySelector('[data-stage-admin-content]').innerHTML=contentHtml(data,activeTab);bindWorkspaceContent(workspace,data);}));
  workspace.querySelector('[data-stage-admin-refresh]')?.addEventListener('click',()=>loadStage(data.id,true));
  bindWorkspaceContent(workspace,data);
}

function bindWorkspaceContent(workspace,data){
  const form=workspace.querySelector('[data-stage-admin-meta]');
  if(form&&!form.dataset.bound){
    form.dataset.bound='1';
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const payload=Object.fromEntries(new FormData(form));payload.progress=Number(payload.progress)||0;
      const status=form.querySelector('[data-stage-admin-meta-status]');
      try{
        status.textContent='Salvando…';
        const response=await apiFetch(`/api/stages-admin/${data.id}`,{method:'PUT',headers:actorHeaders({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
        const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);
        const next=result.stage||result;cache.set(Number(data.id),next);status.textContent='Propriedades salvas e adicionadas ao histórico.';notify('Etapa atualizada.','success');
        await loadStage(data.id,true);
      }catch(error){status.textContent=error.message||'Falha ao salvar.';notify('Não foi possível atualizar a etapa.','warning');}
    });
  }
}

function renderData(data){
  const page=document.querySelector('.stage-dedicated');
  if(!page||Number(data.id)!==currentStageId())return;
  setFormValues(data);
  const existing=page.querySelector('[data-stage-admin-workspace]');
  const holder=document.createElement('div');holder.innerHTML=workspaceHtml(data);const next=holder.firstElementChild;
  if(existing)existing.replaceWith(next);else page.querySelector('.dedicated-canvas')?.insertAdjacentElement('beforebegin',next);
  bindWorkspace(next,data);
  const head=page.querySelector('.dedicated-head');
  if(head){
    const progress=head.querySelector('.stage-dedicated-progress');if(progress)progress.textContent=`${Number(data.progress)||0}%`;
    const p=head.querySelector('p');if(p)p.textContent=`${data.week||'Sem referência'} · ${data.owner||'A definir'} · ${data.status||'planejado'} · acompanhamento operacional`;
  }
}

async function loadStage(stageId,force=false){
  stageId=Number(stageId);if(!stageId)return;
  if(cache.has(stageId)&&!force){renderData(cache.get(stageId));return;}
  const page=document.querySelector('.stage-dedicated');
  page?.setAttribute('data-stage-admin-loading','true');
  try{
    const response=await apiFetch(`/api/stages-admin/${stageId}/report`,{cache:'no-store',headers:actorHeaders()});
    const payload=await response.json();if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);
    const data=payload.report||payload.stage||payload;cache.set(stageId,data);renderData(data);
  }catch(error){
    console.info('[stage-admin] relatório persistente indisponível',error);
    const form=document.querySelector('.stage-dedicated [data-stage-context-form]');ensureAiFields(form);
    const workspace=document.querySelector('.stage-dedicated [data-stage-admin-workspace]');
    if(!workspace){const fallback=document.createElement('section');fallback.className='stage-admin-workspace stage-admin-offline';fallback.dataset.stageAdminWorkspace='';fallback.innerHTML=`<header class="stage-admin-head"><div><span>ADMINISTRAÇÃO DA ETAPA</span><h2>Leitura persistente indisponível</h2><p>A configuração local continua utilizável; o histórico será carregado quando a API da etapa responder.</p></div></header>`;document.querySelector('.stage-dedicated .dedicated-canvas')?.insertAdjacentElement('beforebegin',fallback);}
  }finally{page?.removeAttribute('data-stage-admin-loading');}
}

function bindAiPersistence(form){
  if(!form||form.dataset.stageAdminBound)return;
  form.dataset.stageAdminBound='1';ensureAiFields(form);
  form.addEventListener('submit',async()=>{
    const stageId=currentStageId();if(!stageId)return;
    const materialRows=[...form.querySelectorAll('[data-stage-material-row]')].map(row=>({name:row.querySelector('[name="materialName"]')?.value||'',description:row.querySelector('[name="materialDescription"]')?.value||'',quantity:row.querySelector('[name="materialQuantity"]')?.value||'',unit:row.querySelector('[name="materialUnit"]')?.value||'',status:row.querySelector('[name="materialStatus"]')?.value||''})).filter(item=>item.name||item.description||item.quantity);
    const current=cache.get(stageId)?.aiConfig||{};
    const payload={
      requirements:splitLines(form.elements.requirements?.value),
      conditions:splitLines(form.elements.conditions?.value),
      typicalDescription:form.elements.typicalDescription?.value||'',
      requestHints:splitLines(form.elements.requestHints?.value),
      evidenceFocus:splitLines(form.elements.evidenceFocus?.value),
      procurementFocus:splitLines(form.elements.procurementFocus?.value),
      notificationTargets:{owner:splitLines(form.elements.notifyOwner?.value),admin:splitLines(form.elements.notifyAdmin?.value),foreman:splitLines(form.elements.notifyForeman?.value)},
      executionProfile:{...(current.executionProfile||{}),materialsTable:materialRows}
    };
    try{
      const key=form.dataset.stageContextForm,settings=JSON.parse(localStorage.getItem('belavista.integrations.v1')||'{}');
      const previous=settings.stageProfiles?.[key]||{};
      settings.stageProfiles={...(settings.stageProfiles||{}),[key]:{...previous,requirements:payload.requirements,conditions:payload.conditions}};
      localStorage.setItem('belavista.integrations.v1',JSON.stringify(settings));
      appStore.set({integrationSettings:{...(appStore.get().integrationSettings||{}),stageProfiles:{...(appStore.get().integrationSettings?.stageProfiles||{}),[key]:{...(appStore.get().integrationSettings?.stageProfiles?.[key]||{}),requirements:payload.requirements,conditions:payload.conditions}}}});
    }catch{}
    const status=form.querySelector('[data-stage-context-status]');
    try{
      if(status)status.textContent='Persistindo requisitos e condições…';
      const response=await apiFetch(`/api/stages-admin/${stageId}/ai`,{method:'PUT',headers:actorHeaders({'Content-Type':'application/json'}),body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);
      const stage=result.stage||result;cache.set(stageId,stage);if(status)status.textContent='Requisitos, condições e contexto persistidos. O ciclo operacional pode usar essa configuração.';notify('Configuração de IA da etapa persistida.','success');
      await loadStage(stageId,true);
    }catch(error){if(status)status.textContent=`Contexto local salvo; persistência da etapa falhou: ${error.message}`;console.info('[stage-admin] persistência de IA indisponível',error);}
  });
}

function enhance(){
  const page=document.querySelector('.stage-dedicated');
  if(!page)return;
  const stageId=currentStageId();
  const form=page.querySelector('[data-stage-context-form]');
  ensureAiFields(form);bindAiPersistence(form);
  if(stageId!==lastStageId){activeTab='overview';lastStageId=stageId;}
  if(stageId&&!page.dataset.stageAdminRequested){page.dataset.stageAdminRequested='1';loadStage(stageId);}
}

new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
addEventListener('belavista:stage-admin-refresh',()=>{const id=currentStageId();if(id)loadStage(id,true);});
queueMicrotask(enhance);
