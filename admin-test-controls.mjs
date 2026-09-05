const STORAGE_KEY='belavista.admin.testControlsEnabled.v1';
const CHANNEL_NAME='belavista-admin-test-controls-v1';
const cases=[
  ['Entradas',[['input.record','Registro incompleto'],['input.production','Medição de produção'],['input.material','Material pendente'],['input.cash','Mudança no caixa'],['input.lead','Mensagem de lead'],['input.reserve','Pedido de reserva'],['input.payment','Pagamento recebido']]],
  ['Gerações',[['generation.readiness','Prontidão operacional'],['generation.agenda','Agenda e cronograma'],['generation.report','Repasse mensal']]],
  ['Notificações',[['notification.cash','Risco de caixa'],['notification.material','Alerta de material'],['notification.coelba','Prazo Coelba']]],
  ['Propagações',[['propagation.calibration','Recalcular dependências'],['propagation.release','Liberar próxima frente'],['propagation.lead','Propagar CRM']]]
];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const enabled=()=>localStorage.getItem(STORAGE_KEY)==='1';
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(CHANNEL_NAME):null;
let root;

async function requestHeaders(){
  const actor=globalThis.BELAVISTA_ADMIN_ACTOR||{};
  let token='';try{token=await globalThis.BELAVISTA_GET_ID_TOKEN?.()||'';}catch{}
  return {'content-type':'application/json','x-belavista-role':actor.role||'developer','x-belavista-user':actor.uid||'admin-test-controls','x-belavista-name':actor.name||'Laboratório administrativo',...(token?{authorization:`Bearer ${token}`}:{})};
}

function pageContext(){
  const heading=document.querySelector('main h1, belavista-app h1, .page-title, [data-page-title]');
  return heading?.textContent?.trim()||document.title||location.pathname;
}

function renderState(){
  const active=enabled();
  if(root)root.hidden=!active;
  document.querySelectorAll('[data-admin-test-mode]').forEach(input=>{input.checked=active;input.setAttribute('aria-checked',String(active));});
  document.documentElement.dataset.adminTestControls=active?'enabled':'disabled';
}

function setEnabled(active,{broadcast=true}={}){
  localStorage.setItem(STORAGE_KEY,active?'1':'0');
  renderState();
  if(broadcast)channel?.postMessage({type:'mode',enabled:active});
  globalThis.dispatchEvent(new CustomEvent('belavista:test-controls-changed',{detail:{enabled:active}}));
}

async function runCase(caseId,button){
  const result=root.querySelector('[data-admin-test-result]');
  const allButtons=root.querySelectorAll('button[data-case-id],[data-run-all]');
  allButtons.forEach(item=>item.disabled=true);result.dataset.tone='';result.innerHTML=`<strong>Executando cenário…</strong><span>${escapeHtml(pageContext())}</span>`;
  try{
    const response=await fetch('/api/automation/test',{method:'POST',cache:'no-store',headers:await requestHeaders(),body:JSON.stringify(caseId?{scenario:'single',caseId,context:{pathname:location.pathname,page:pageContext()}}:{scenario:'suite',context:{pathname:location.pathname,page:pageContext()}})});
    const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);
    const tests=payload.tests||[],actions=tests.reduce((sum,item)=>sum+Number(item.outputs?.propagation?.count||0),0),notifications=tests.reduce((sum,item)=>sum+Number(item.outputs?.notifications?.previewCount||0),0);
    result.dataset.tone='ok';result.innerHTML=`<strong>${tests.length} cenário${tests.length===1?'':'s'} concluído${tests.length===1?'':'s'}</strong><span>${actions} propagação(ões) · ${notifications} notificação(ões) simuladas.</span><small>Execução ${escapeHtml(payload.testRunId||'—')} · saída externa desabilitada</small>`;
    globalThis.dispatchEvent(new CustomEvent('belavista:test-case-completed',{detail:{caseId,payload}}));
  }catch(error){result.dataset.tone='error';result.innerHTML=`<strong>Falha ao executar</strong><span>${escapeHtml(error.message)}</span>`;}
  finally{allButtons.forEach(item=>item.disabled=false);button?.focus();}
}

function mount(){
  if(!location.pathname.startsWith('/admin'))return;
  root=document.createElement('aside');root.className='admin-test-controls';root.hidden=true;root.setAttribute('aria-label','Casos de teste administrativos');
  root.innerHTML=`<button class="admin-test-launcher" type="button" aria-expanded="false"><span>Casos de teste</span><small>16</small></button><section class="admin-test-drawer" aria-hidden="true"><header><div><span>LABORATÓRIO GLOBAL</span><strong>Entradas, gerações e propagações</strong></div><button class="admin-test-close" type="button" aria-label="Fechar">×</button></header><div class="admin-test-context"><span data-admin-test-context></span><b>SAÍDA EXTERNA DESATIVADA</b></div><div class="admin-test-groups">${cases.map(([group,items])=>`<section class="admin-test-group"><h3>${escapeHtml(group)}</h3><div>${items.map(([id,label])=>`<button class="admin-test-case" type="button" data-case-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join('')}</div></section>`).join('')}</div><button class="admin-test-all" type="button" data-run-all>Executar suíte completa</button><div class="admin-test-result" data-admin-test-result><span>Escolha um cenário para inspecionar sua propagação nesta página.</span></div></section>`;
  document.body.appendChild(root);
  const launcher=root.querySelector('.admin-test-launcher'),drawer=root.querySelector('.admin-test-drawer');
  const close=()=>{root.classList.remove('is-open');launcher.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');};
  launcher.addEventListener('click',()=>{const open=!root.classList.contains('is-open');root.classList.toggle('is-open',open);launcher.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-hidden',String(!open));root.querySelector('[data-admin-test-context]').textContent=pageContext();});
  root.querySelector('.admin-test-close').addEventListener('click',close);
  root.querySelectorAll('[data-case-id]').forEach(button=>button.addEventListener('click',()=>runCase(button.dataset.caseId,button)));
  root.querySelector('[data-run-all]').addEventListener('click',event=>runCase('',event.currentTarget));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  renderState();
}

document.addEventListener('change',event=>{if(event.target.matches('[data-admin-test-mode]'))setEnabled(event.target.checked);});
addEventListener('storage',event=>{if(event.key===STORAGE_KEY)renderState();});
channel?.addEventListener('message',event=>{if(event.data?.type==='mode')setEnabled(Boolean(event.data.enabled),{broadcast:false});});
globalThis.BELAVISTA_ADMIN_TEST_CONTROLS={get enabled(){return enabled();},setEnabled,runCase};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
