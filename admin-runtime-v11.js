// BELAVISTA_ADMIN_RUNTIME_V11
// Cloud admin adapter: stage config over GitHub-backed Worker, evidence-gated cash events,
// and separation between the public presentation map and the administrative map.

const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageNames={1:'Terraplanagem',2:'Drenagem Pluvial',3:'Pavimentação',4:'Rede de Água',5:'Rede Elétrica',6:'Sinalização',7:'Projeto executivo',8:'Meio-fio'};
const stageKeys={1:'terraplanagem',2:'drenagem',3:'pavimentacao',4:'rede-agua',5:'rede-eletrica',6:'sinalizacao',7:'projeto-executivo',8:'meio-fio'};

function baseUrl(){
  const runtime=String(globalThis.BELAVISTA_API_BASE||'').replace(/\/$/,'');
  if(runtime)return runtime;
  try{const saved=JSON.parse(localStorage.getItem('belavista.integrations.v1')||'{}');if(saved.apiBase)return String(saved.apiBase).replace(/\/$/,'');}catch{}
  return String(document.querySelector('meta[name="belavista-api-base"]')?.content||'').replace(/\/$/,'');
}
function api(path){const base=baseUrl();return base?`${base}${path}`:path;}
async function authHeaders(extra={}){
  const headers=new Headers(extra);
  try{const token=await globalThis.BELAVISTA_GET_ID_TOKEN?.();if(token)headers.set('Authorization',`Bearer ${token}`);}catch{}
  return headers;
}
async function adminFetch(path,init={}){
  const headers=await authHeaders(init.headers||{});
  return fetch(api(path),{...init,headers});
}
function stageKey(id,name=''){return stageKeys[Number(id)]||text(name,100).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`stage-${id}`;}
function arrays(v){return Array.isArray(v)?v:[];}
function object(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function listFromDoc(data){
  if(Array.isArray(data))return data;
  if(Array.isArray(data?.stages))return data.stages;
  return [];
}
function profileFromDoc(data,id,name){
  const key=stageKey(id,name),profiles=object(data?.stageProfiles||data?.profiles);
  return object(profiles[key]||profiles[String(id)]||profiles[name]);
}
function stateFromDoc(data,id,name){
  const key=stageKey(id,name),states=object(data?.stageState||data?.state);
  return object(states[key]||states[String(id)]||states[name]);
}
function findStage(data,id){
  const name=stageNames[Number(id)]||`Etapa ${id}`;
  const list=listFromDoc(data);
  return list.find(item=>Number(item?.id)===Number(id)||String(item?.key||item?.stageId||'')===stageKey(id,name)||String(item?.name||'').toLowerCase()===name.toLowerCase())||{};
}
function toAi(profile={},stage={}){
  const src={...object(stage.aiConfig),...object(stage.ai),...object(profile.aiConfig),...object(profile.ai),...profile};
  return {
    requirements:arrays(src.requirements),
    conditions:arrays(src.conditions||src.peculiarities),
    typicalDescription:text(src.typicalDescription||src.executionDescription||src.description||'',6000),
    requestHints:arrays(src.requestHints||src.planningHints),
    evidenceFocus:arrays(src.evidenceFocus||src.evidenceRequirements),
    procurementFocus:arrays(src.procurementFocus||src.purchaseFocus),
    notificationTargets:object(src.notificationTargets),
    executionProfile:{...object(src.executionProfile),materialsTable:arrays(src.executionProfile?.materialsTable||src.materialsTable)},
    updatedAt:src.updatedAt||src.modifiedAt||null
  };
}
function makeStageReport(doc,id){
  const name=stageNames[Number(id)]||`Etapa ${id}`,stage=findStage(doc,id),profile=profileFromDoc(doc,id,name),state=stateFromDoc(doc,id,name),aiConfig=toAi(profile,stage);
  return {
    id:Number(id),name:text(stage.name||name,160),owner:text(stage.owner||stage.ownerName||profile.owner||'',160),
    status:text(state.status||stage.status||'planejado',60),progress:Number(state.progress??stage.progress??0)||0,week:text(stage.week||stage.reference||profile.week||'',160),
    aiConfig,
    activities:arrays(stage.activities||profile.activities),purchases:arrays(stage.purchases||profile.purchases),materials:arrays(stage.materials||profile.materials),
    records:arrays(stage.records||profile.records),receipts:arrays(stage.receipts||profile.receipts),outsourcing:arrays(stage.outsourcing||profile.outsourcing),relations:arrays(stage.relations||profile.relations),cashEntries:arrays(stage.cashEntries||profile.cashEntries),
    summary:object(stage.summary||profile.summary),situation:object(stage.situation||profile.situation)
  };
}
function mergeStageDoc(data,id,patch,aiOnly=false){
  const name=stageNames[Number(id)]||`Etapa ${id}`,key=stageKey(id,name),next=structuredClone(data??{}),list=listFromDoc(next);
  if(list.length){
    const index=list.findIndex(item=>Number(item?.id)===Number(id)||String(item?.key||item?.stageId||'')===key||String(item?.name||'').toLowerCase()===name.toLowerCase());
    const current=index>=0?list[index]:{id:Number(id),key,name};
    if(aiOnly){list[index>=0?index:list.length]={...current,aiConfig:{...object(current.aiConfig),...patch},updatedAt:new Date().toISOString()};}
    else {list[index>=0?index:list.length]={...current,...patch,updatedAt:new Date().toISOString()};}
    if(Array.isArray(next))return list;
    next.stages=list;return next;
  }
  const profiles={...object(next.stageProfiles||next.profiles)};
  const current=object(profiles[key]);
  profiles[key]=aiOnly?{...current,...patch,aiConfig:{...object(current.aiConfig),...patch},updatedAt:new Date().toISOString()}:{...current,...patch,updatedAt:new Date().toISOString()};
  next.stageProfiles=profiles;
  return next;
}

// Translate obsolete local-only /api/stages-admin routes into the GitHub-backed Worker config route.
const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async function(input,init={}){
  let url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return nativeFetch(input,init);}
  const match=url.pathname.match(/^\/api\/stages-admin\/(\d+)(?:\/(ai|report))?$/);
  if(!match)return nativeFetch(input,init);
  const id=Number(match[1]),resource=match[2]||'',method=String(init.method||(typeof input!=='string'&&input.method)||'GET').toUpperCase();
  const headers=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined));
  const configUrl=new URL('/api/admin/config/stages',url.origin).href;
  try{
    const read=await nativeFetch(configUrl,{method:'GET',headers,cache:'no-store'}),raw=await read.text();
    if(!read.ok)return new Response(raw,{status:read.status,headers:{'content-type':'application/json'}});
    const config=raw?JSON.parse(raw):{},data=config.data??config;
    if(method==='GET'&&resource==='report')return Response.json({report:makeStageReport(data,id),source:config.source,sha:config.sha});
    if(method==='GET')return Response.json({stage:makeStageReport(data,id),source:config.source,sha:config.sha});
    if(method==='PUT'){
      const bodyText=typeof init.body==='string'?init.body:'{}',patch=bodyText?JSON.parse(bodyText):{};
      const next=mergeStageDoc(data,id,patch,resource==='ai');
      const write=await nativeFetch(configUrl,{method:'PUT',headers:new Headers([...headers.entries(),['Content-Type','application/json']]),body:JSON.stringify({data:next,sha:config.sha})});
      const savedText=await write.text();if(!write.ok)return new Response(savedText,{status:write.status,headers:{'content-type':'application/json'}});
      return Response.json({stage:makeStageReport(next,id),saved:savedText?JSON.parse(savedText):{},source:'github-worker'}, {status:200});
    }
    return Response.json({error:'Método não permitido.'},{status:405});
  }catch(error){return Response.json({error:`Falha na configuração persistente da etapa: ${error.message}`},{status:502});}
};

function blankCashForm(){
  const today=new Date().toISOString().slice(0,10);
  return `<form class="cash-entry-control" data-v8-cash-entry data-cash-evidence-v11><header><div><span class="activity-kind">NOVO LANÇAMENTO · COMPROVAÇÃO OBRIGATÓRIA</span><h2>Movimentar fluxo de caixa</h2></div><small>Qualquer sessão administrativa pode registrar; o fato só entra no ciclo após uma evidência.</small></header><div><label>Tipo<select name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Data<input type="date" name="date" value="${today}" required></label><label>Categoria<input name="category" placeholder="Venda, obra, ajuste…" required></label><label>Etapa<select name="stage"><option>Geral</option>${Object.values(stageNames).map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><label>Valor (R$)<input name="amount" inputmode="decimal" placeholder="0,00" required></label><label class="wide">Origem / descrição<input name="description" placeholder="Identifique recebimento, pagamento, estorno ou ajuste" required></label></div><footer><span data-v8-cash-status>Inclua comprovante ou desenhe/assine no quadro.</span><button type="submit">Registrar fato e recalcular pela IA</button></footer></form>`;
}
function evidenceMarkup(){return `<section class="cash-evidence-v11" data-cash-evidence><div><span>COMPROVAÇÃO DO LANÇAMENTO</span><b>Comprovante ou assinatura/desenho</b><small>Uma das duas evidências é obrigatória.</small></div><label class="cash-proof-file">Imagem / PDF<input type="file" name="cashProof" accept="image/*,application/pdf"></label><div class="cash-signature"><header><span>ASSINATURA / DESENHO NO CANVAS</span><button type="button" data-cash-sign-clear>Limpar</button></header><canvas width="720" height="190" data-cash-signature aria-label="Área para assinatura ou desenho com o dedo"></canvas><small>Use mouse, caneta ou dedo. O desenho será salvo como PNG.</small></div></section>`;}
function prepareCanvas(canvas){
  if(!canvas||canvas.dataset.bound)return;canvas.dataset.bound='1';const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='#f4f4f4';let active=false,last=null;
  const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return {x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height};};
  const start=e=>{e.preventDefault();active=true;last=pos(e);canvas.dataset.dirty='1';canvas.setPointerCapture?.(e.pointerId);};
  const move=e=>{if(!active)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;};
  const end=e=>{active=false;last=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}};
  canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
}
function enhanceFinance(){
  const page=document.querySelector('view-layer[data-view="finance"],.finance-control-page');if(!page)return;
  let form=page.querySelector('form[data-v8-cash-entry]');
  if(!form){const boundary=page.querySelector('.role-boundary-notice');if(boundary){const holder=document.createElement('div');holder.innerHTML=blankCashForm();boundary.replaceWith(holder.firstElementChild);form=page.querySelector('form[data-v8-cash-entry]');}}
  if(!form)return;
  form.dataset.cashEvidenceV11='1';
  if(!form.querySelector('[data-cash-evidence]'))form.querySelector('footer')?.insertAdjacentHTML('beforebegin',evidenceMarkup());
  const canvas=form.querySelector('[data-cash-signature]');prepareCanvas(canvas);
  form.querySelector('[data-cash-sign-clear]')?.addEventListener('click',()=>{const c=form.querySelector('[data-cash-signature]');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);if(c)delete c.dataset.dirty;});
}
function fileDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Falha ao ler comprovante.'));r.readAsDataURL(file);});}
function amountToCents(value){return Math.round((Number(String(value||'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,''))||0)*100);}
async function submitCash(form){
  const status=form.querySelector('[data-v8-cash-status]'),button=form.querySelector('button[type="submit"]'),d=Object.fromEntries(new FormData(form)),amountCents=amountToCents(d.amount);
  if(!amountCents){status.textContent='Informe um valor maior que zero.';return;}
  const file=form.querySelector('input[name="cashProof"]')?.files?.[0],canvas=form.querySelector('[data-cash-signature]');
  if(!file&&!canvas?.dataset.dirty){status.textContent='Anexe um comprovante ou assine/desenhe no quadro.';return;}
  button.disabled=true;status.textContent='Salvando evidência no GitHub…';
  try{
    let evidence;
    if(file){if(file.size>6*1024*1024)throw new Error('Comprovante deve ter no máximo 6 MB.');evidence={kind:'upload',fileName:text(file.name,120),contentType:text(file.type||'application/octet-stream',100),dataUrl:await fileDataUrl(file)};}
    else evidence={kind:'canvas-signature',fileName:`assinatura-caixa-${Date.now()}.png`,contentType:'image/png',dataUrl:canvas.toDataURL('image/png')};
    const proofRes=await adminFetch('/api/admin/cash-evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({evidence})});
    const proofJson=await proofRes.json();if(!proofRes.ok)throw new Error(proofJson.error||`HTTP ${proofRes.status}`);
    status.textContent='Evidência salva. Enviando o fato para a transição NVIDIA…';
    const stateRes=await adminFetch('/api/admin/config/state',{cache:'no-store'}),stateJson=await stateRes.json();if(!stateRes.ok)throw new Error(stateJson.error||`HTTP ${stateRes.status}`);
    const previousState=stateJson.data??stateJson;
    const actor={id:'admin-web',role:'admin'};
    const event={id:`cash-${Date.now()}`,type:'cash.entry.recorded',at:new Date().toISOString(),actor,payload:{kind:d.kind==='saida'?'saida':'entrada',stage:text(d.stage,120)||'Geral',category:text(d.category,120),description:text(d.description,500),date:text(d.date,20),amountCents,evidence:proofJson.proof}};
    const loopRes=await adminFetch('/api/operational-loop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'strict-ai-state-transition',persist:true,previousState,event,inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true}})});
    const loop=await loopRes.json();if(!loopRes.ok)throw new Error(loop.error||`HTTP ${loopRes.status}`);
    status.textContent='Lançamento comprovado e incorporado ao estado pela NVIDIA.';form.reset();canvas?.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);if(canvas)delete canvas.dataset.dirty;
    window.dispatchEvent(new CustomEvent('belavista:operational-refresh',{detail:{source:'cash-evidence-v11',loop}}));
    setTimeout(()=>location.reload(),650);
  }catch(error){status.textContent=error.message||'Falha ao registrar o lançamento.';button.disabled=false;}
}
document.addEventListener('submit',event=>{const form=event.target.closest?.('form[data-v8-cash-entry][data-cash-evidence-v11]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();submitCash(form);},true);

function patchAdminMap(){
  const MapScene=customElements.get('map-scene');if(MapScene&&!MapScene.prototype.__adminMapV11){
    MapScene.prototype.__adminMapV11=true;
    const previous=MapScene.prototype.setMapContext;
    MapScene.prototype.setMapContext=function(view){
      const result=previous?.call(this,view);const pub=this.hasAttribute('data-public-presentation');this.dataset.mapContext=pub?'public-leads':view;
      const category=this.querySelector('.map-category-switcher'),rotation=this.querySelector('.map-rotation-controls'),legend=this.querySelector('.map-gesture-legend'),badge=this.querySelector('.map-badge');
      const adminInteractive=new Set(['assistant','map','records']);
      if(category)category.hidden=pub||!adminInteractive.has(view);
      if(rotation)rotation.hidden=pub||!adminInteractive.has(view);
      if(legend)legend.hidden=pub||!['assistant','map','records'].includes(view);
      if(badge)badge.hidden=pub||!['assistant','map','records'].includes(view);
      if(pub)this.dataset.mapControls='public-disabled';else if(view==='map')this.dataset.mapControls='admin-map-enabled';
      return result;
    };
  }
  const ViewLayer=customElements.get('view-layer');if(ViewLayer&&!ViewLayer.prototype.__adminMapViewV11){
    ViewLayer.prototype.__adminMapViewV11=true;const old=ViewLayer.prototype.map;
    ViewLayer.prototype.map=function(){return String(old.call(this)).replace('<stage-cash-dashboard></stage-cash-dashboard>','');};
  }
  document.querySelectorAll('map-scene').forEach(map=>map.setMapContext?.(map.hasAttribute('data-public-presentation')?'public-leads':(document.querySelector('view-layer')?.dataset.view||'map')));
}
customElements.whenDefined('map-scene').then(patchAdminMap);customElements.whenDefined('view-layer').then(patchAdminMap);
new MutationObserver(()=>{enhanceFinance();if(document.querySelector('view-layer[data-view="map"]'))patchAdminMap();}).observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(enhanceFinance);
console.info('[BELAVISTA_ADMIN_RUNTIME_V11] ativo');
