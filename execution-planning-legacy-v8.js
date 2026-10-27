import {appStore,demoData,executionModel,cashFlowSeed,commissionReasonDefaults} from './state.js?v=navigation-state-v22&ts-state-catalogs-program-owner-v1';

const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format((Number(cents)||0)/100);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const notify=(message,tone='info')=>window.dispatchEvent(new CustomEvent('belavista:notify',{detail:{message,tone}}));
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const toDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
let apiCash=[],cashSummary=null,commissionReasons=[],outsourcing=[],brokerReports=[];
let observer=null;

const stageByKey=key=>executionModel.stages.find(s=>s.key===key);
const stageDemoByPlan=plan=>demoData.activities.find(a=>a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(plan.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(' ')[0]))||demoData.activities[0];
const productionOf=plan=>{
  const stage=stageDemoByPlan(plan),ov=(appStore.get().productionOverrides||{})[stage.id]||{},p={...plan.production,...ov};
  return {...p,days:(Number(p.quantity)||0)/Math.max(.0001,Number(p.rate)||1),stage};
};
const allCash=()=>[...cashFlowSeed,...(appStore.get().cashFlowLocal||[]),...apiCash];
const calcCash=()=>{
  if(cashSummary)return cashSummary;
  return allCash().reduce((a,e)=>{const v=Number(e.amountCents)||0;e.kind==='entrada'?a.entriesCents+=v:a.exitsCents+=v;a.balanceCents=a.entriesCents-a.exitsCents;return a;},{entriesCents:0,exitsCents:0,balanceCents:0});
};
const readiness=()=>{
  const balance=calcCash().balanceCents;
  const totalWeight=executionModel.stages.reduce((s,x)=>s+x.cashWeight,0)||1;
  return executionModel.stages.map((plan,i)=>{
    const prod=productionOf(plan),stage=prod.stage,dependencyDone=plan.dependsOn.every(dep=>{const d=stageByKey(dep);const sd=d&&stageDemoByPlan(d);return sd?Number(sd.progress)>=80:true;});
    const envelope=Math.max(1,Math.round(280000000*(plan.cashWeight/totalWeight)));
    const cashCoverage=Math.max(0,Math.min(100,Math.round(balance/envelope*100)));
    const materialScore=Math.min(100,Math.round((demoData.stageMaterials?.[stage.name]?.filter(x=>x.quantity!=null).length||1)/Math.max(1,demoData.stageMaterials?.[stage.name]?.length||1)*100));
    const score=Math.round((dependencyDone?35:5)+Math.min(35,cashCoverage*.35)+Math.min(30,materialScore*.3));
    return {plan,stage,prod,dependencyDone,cashCoverage,materialScore,score,envelope};
  });
};

async function loadApi(){
  try{const r=await fetch('/api/cash-flow',{cache:'no-store'});if(r.ok){const j=await r.json();apiCash=j.entries||[];cashSummary=j.summary||null;}}catch{}
  try{const r=await fetch('/api/commission-reasons',{cache:'no-store'});if(r.ok){const j=await r.json();commissionReasons=j.reasons||[];}}catch{}
  try{const r=await fetch('/api/outsourcing-receipts',{cache:'no-store'});if(r.ok){const j=await r.json();outsourcing=j.receipts||[];}}catch{}
  try{const r=await fetch('/api/broker-reports',{cache:'no-store'});if(r.ok){const j=await r.json();brokerReports=j.files||[];}}catch{}
}

function cashPanel(){
  const current=appStore.get();
  if(current.view!=='assistant'){qs('#v8-cash-panel')?.remove();return;}
  let panel=qs('#v8-cash-panel');if(!panel){panel=document.createElement('section');panel.id='v8-cash-panel';panel.className='v8-cash-panel';document.body.appendChild(panel);}
  const cash=calcCash(),stages=readiness(),next=stages.filter(x=>Number(x.stage.progress)<100).sort((a,b)=>b.plan.priority-a.plan.priority||b.score-a.score)[0]||stages[0];
  const suggestions=[];
  if(next&&!next.dependencyDone)suggestions.push(`Concluir predecessoras antes de liberar ${next.stage.name}.`);
  if(next&&next.cashCoverage<70)suggestions.push(`Reservar caixa para ${next.stage.name}; cobertura estimada ${next.cashCoverage}%.`);
  if(next&&next.materialScore<75)suggestions.push(`Completar dimensionamento de materiais de ${next.stage.name}.`);
  if(next&&next.plan.key==='electrical')suggestions.push('Rede elétrica está marcada como prioridade e deve anteceder pavimentação.');
  panel.innerHTML=`<header><div><span>FLUXO DE CAIXA · ABERTURA</span><h3>Caixa dita a liberação das frentes</h3></div><button type="button" data-v8-cash-close>${icon('x')}</button></header>
    <div class="v8-cash-kpis"><article><small>Entradas</small><b>${money(cash.entriesCents)}</b></article><article><small>Saídas</small><b>${money(cash.exitsCents)}</b></article><article><small>Saldo operacional</small><b>${money(cash.balanceCents)}</b></article></div>
    <div class="v8-cash-next"><span>PRÓXIMA FRENTE SUGERIDA</span><b>${esc(next?.stage.name||'—')}</b><em>prontidão ${next?.score||0}% · cobertura de caixa ${next?.cashCoverage||0}%</em></div>
    <div class="v8-stage-sequence">${stages.map(x=>`<button type="button" data-v8-focus-stage="${x.stage.id}" class="${x.stage.name===next?.stage.name?'active':''}"><span>${esc(x.stage.name)}</span><b>${x.score}%</b><i style="--p:${x.score}%"></i></button>`).join('')}</div>
    <ul class="v8-suggestions">${suggestions.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Caixa e dependências permitem manter a sequência planejada.</li>'}</ul>
    <details><summary>Registrar movimento</summary><form data-v8-cash-form><label>Tipo<select name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Etapa<select name="stage"><option>Geral</option>${demoData.activities.map(s=>`<option>${esc(s.name)}</option>`).join('')}</select></label><label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Valor (R$)<input name="amount" type="number" min="0" step="0.01" required></label><label class="wide">Descrição<input name="description" required></label><button type="submit">Registrar e recalcular</button></form></details>`;
  window.lucide?.createIcons();
}

function augmentBrokers(){
  const page=qs('.v7-brokers-page');if(!page||qs('.v8-commission-reasons',page))return;
  const reasons=commissionReasons.length?commissionReasons:commissionReasonDefaults.map((x,i)=>({...x,sharePercent:[40,30,30][i],warleyPercent:i===2?70:50,counterpartyPercent:i===2?30:50}));
  const section=document.createElement('section');section.className='v8-commission-reasons v7-sheet';
  section.innerHTML=`<header><div><span class="activity-kind">RAZÕES DE COMISSÃO</span><h2>Regras de repasse</h2><p>Premissa inicial editável; a taxa-base dos relatórios usa BELAVISTA_COMMISSION_RATE (6% por padrão).</p></div><span class="v8-report-count">${brokerReports.length} arquivo(s) gerado(s)</span></header><div class="v8-reason-grid">${reasons.map(r=>`<form data-v8-reason-form="${esc(r.id)}"><label>Razão<input name="label" value="${esc(r.label)}"></label><label>Participação do repasse (%)<input name="sharePercent" type="number" min="0" max="100" step="0.1" value="${Number(r.sharePercent??0)}"></label><label class="wide">Descrição<input name="description" value="${esc(r.description||'')}"></label><button type="submit">${icon('save')} Editar</button></form>`).join('')}</div>${brokerReports.length?`<div class="v8-report-files">${brokerReports.slice(0,12).map(f=>`<a href="${esc(f.url)}" target="_blank"><b>${esc(f.month||'')}</b><span>${esc(f.name)}</span></a>`).join('')}</div>`:'<p class="v8-report-empty">Os cron jobs gerarão XLSX e PDF no próximo startup.</p>'}</section>`;
  page.appendChild(section);window.lucide?.createIcons();
}

function augmentPurchases(){
  const page=qs('.purchase-page');if(!page||qs('.v8-outsourcing',page))return;
  const section=document.createElement('section');section.className='v8-outsourcing';
  section.innerHTML=`<header><div><span class="activity-kind">TERCEIRIZAÇÕES</span><h2>Comprovantes de serviços terceirizados</h2><p>Guarde contrato, medição, nota ou comprovante ligado à etapa e ao serviço.</p></div><span>${outsourcing.length} documento(s)</span></header><form data-v8-outsourcing-form><label>Prestador<input name="contractor" required></label><label>Etapa<select name="stage">${demoData.activities.map(s=>`<option>${esc(s.name)}</option>`).join('')}</select></label><label>Serviço<input name="service" required></label><label>Valor (R$)<input name="amount" type="number" min="0" step="0.01"></label><label>Emissão<input name="issueDate" type="date"></label><label>Nº documento<input name="documentNumber"></label><label class="wide">Comprovante<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><label class="wide">Observações<input name="notes"></label><button type="submit">Armazenar comprovante</button></form><div class="v8-outsourcing-list">${outsourcing.map(r=>`<a href="${r.fileUrl}" target="_blank"><b>${esc(r.contractor||'Prestador')}</b><span>${esc(r.stage)} · ${esc(r.service)}</span><em>${money(r.amountCents)}</em></a>`).join('')||'<p>Nenhum comprovante de terceirização armazenado.</p>'}</div>`;
  page.appendChild(section);window.lucide?.createIcons();
}

function augmentStageProduction(){
  const pane=qs('.v8-production-pane');if(!pane)return;
  if(qs('.v8-field-note',pane))return;
  const note=document.createElement('aside');note.className='v8-field-note';note.innerHTML=`<b>Premissas extraídas das anotações de campo</b><span>Terraplanagem: corte 18.142,35 m³ · aterro 1.764,29 m³ · compensação 16.378,06 m³. Drenagem: ~800 m e 49 bocas de lobo. Meio-fio: ~8.000 m. Rede elétrica: ~120 postes. Rede de água: 298 lotes.</span><small>Os ritmos de produção são sugestões editáveis; registre a produção real por viagem interna, m, m², m³, poste, ramal ou unidade.</small>`;pane.prepend(note);
}

function runAugments(){cashPanel();augmentBrokers();augmentPurchases();augmentStageProduction();}

document.addEventListener('submit',async event=>{
  const cash=event.target.closest('[data-v8-cash-form]');if(cash){event.preventDefault();const d=Object.fromEntries(new FormData(cash));const payload={kind:d.kind,stage:d.stage,date:d.date,description:d.description,category:'Operação',amountCents:Math.round((Number(d.amount)||0)*100)};try{const r=await fetch('/api/cash-flow',{method:'POST',headers:{'Content-Type':'application/json','x-belavista-role':'owner','x-belavista-user':'local-warley','x-belavista-name':'Warley'},body:JSON.stringify(payload)});if(!r.ok){const error=await r.json().catch(()=>({}));throw new Error(error.error||'Não foi possível registrar o caixa.');}const j=await r.json();apiCash=[j.entry,...apiCash];cashSummary=j.summary;cash.reset();cashPanel();}catch(error){notify?.(error.message||'Falha ao registrar caixa.','warning');}return;}
  const reason=event.target.closest('[data-v8-reason-form]');if(reason){event.preventDefault();const d=Object.fromEntries(new FormData(reason));try{const r=await fetch(`/api/commission-reasons/${encodeURIComponent(reason.dataset.v8ReasonForm)}`,{method:'PUT',headers:{'Content-Type':'application/json','x-belavista-role':'admin','x-belavista-user':'local-admin','x-belavista-name':'Administrador'},body:JSON.stringify({label:d.label,description:d.description,sharePercent:Number(d.sharePercent),active:true})});if(!r.ok)throw new Error();const j=await r.json();commissionReasons=j.reasons||commissionReasons;appStore.set({commissionReasons,lastAction:`Atualizou regra de comissão ${reason.dataset.v8ReasonForm}`});runAugments();}catch{}return;}
  const out=event.target.closest('[data-v8-outsourcing-form]');if(out){event.preventDefault();const fd=new FormData(out),file=fd.get('file');if(!(file instanceof File)||!file.size)return;const dataUrl=await toDataUrl(file);const payload={contractor:fd.get('contractor'),stage:fd.get('stage'),service:fd.get('service'),amountCents:Math.round((Number(fd.get('amount'))||0)*100),issueDate:fd.get('issueDate'),documentNumber:fd.get('documentNumber'),notes:fd.get('notes'),fileName:file.name,dataUrl};const r=await fetch('/api/outsourcing-receipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(r.ok){const j=await r.json();outsourcing=[j.receipt,...outsourcing];out.reset();qs('.v8-outsourcing')?.remove();augmentPurchases();}return;}
},true);

document.addEventListener('click',event=>{
  const stage=event.target.closest('[data-v8-focus-stage]');if(stage){appStore.set({selectedStage:Number(stage.dataset.v8FocusStage),stageSelected:true,lastAction:'Focou etapa sugerida pelo caixa'});return;}
  if(event.target.closest('[data-v8-cash-close]')){qs('#v8-cash-panel')?.remove();return;}
},true);

await loadApi();runAugments();
observer=new MutationObserver(()=>runAugments());observer.observe(document.body,{childList:true,subtree:true});
appStore.subscribe(()=>runAugments());
console.info('[BELAVISTA_EXECUTION_PLANNING_V8] ativo');
