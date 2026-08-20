import {appStore, demoData, viewThemes, windows} from './state.js';

const ico = (name, cls='') => `<i data-lucide="${name}" class="${cls}"></i>`;
const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

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
  connectedCallback(){ this.render(); appStore.subscribe(()=>this.render()); }
  render(){
    const view=appStore.get().view;
    const items=[['assistant','sparkles','IA · Assistente'],['map','map','Mapa'],['stages','workflow','Etapas e Cronograma'],['purchases','shopping-cart','Compras'],['inventory','package-open','Inventário'],['leads','users','Leads'],['collaborators','user-round-cog','Colaboradores'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Configurações']];
    this.innerHTML=`<aside class="sidebar"><div class="brand"><div class="brand-mark">◢</div><div><strong>Belavista</strong><span>LOTEAMENTO</span></div></div><nav>${items.map(([id,icon,label])=>`<button class="nav-item ${view===id?'active':''}" data-view="${id}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav><div class="sidebar-foot"><div class="profile"><span class="avatar">W</span><div><strong>Warley</strong><small>Administrador</small></div></div><div class="integration"><span></span>Integração ativa</div></div></aside>`;
    this.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>appStore.set({view:btn.dataset.view, chatManual:false})));
    window.lucide?.createIcons();
  }
}
customElements.define('app-sidebar', AppSidebar);

export class AppTopbar extends HTMLElement {
  connectedCallback(){ this.render(); }
  render(){
    this.innerHTML=`<header class="topbar"><button class="project-switch">Empreendimento Belavista ${ico('chevron-down')}</button><div class="top-meta"><div>${ico('sun')}<span><b>26°C</b><small>Ensolarado</small></span></div><div class="complete-ring"><span>63%</span></div><div><span><b>Completude geral</b><small>Atualizado agora</small></span></div></div><div class="top-actions"><button id="syncBtn" class="ghost">${ico('refresh-cw')} Sincronizar dados</button><button class="icon-btn" aria-label="Notificações">${ico('bell')}<span class="badge">3</span></button><div class="profile top-profile"><span class="avatar">W</span><div><strong>Warley</strong><small>Administrador</small></div>${ico('chevron-down')}</div></div></header>`;
    this.querySelector('#syncBtn')?.addEventListener('click', e=>{ e.currentTarget.classList.add('spinning'); setTimeout(()=>e.currentTarget.classList.remove('spinning'),650); });
    window.lucide?.createIcons();
  }
}
customElements.define('app-topbar', AppTopbar);

export class AiChat extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(()=>this.positionForView()); this.enableDrag(); }
  positionForView(){
    if(appStore.get().chatManual) return;
    const theme=viewThemes[appStore.get().view]||viewThemes.assistant;
    this.classList.toggle('dock-right', theme.chat==='right');
    this.classList.toggle('dock-left', theme.chat!=='right');
  }
  render(){
    this.className='ai-chat floating-panel dock-left';
    this.innerHTML=`<div class="chat-head drag-handle"><span class="ai-logo">✦</span><div><strong>IA · Belavista</strong><small>Assistente contextual</small></div><button class="icon-btn compact close-chat">${ico('minus')}</button></div><div class="chat-scroll"><div class="ai-msg">Bom dia, Warley. Estou acompanhando o contexto desta tela e posso abrir cards, explicar riscos ou registrar ações.</div><div class="chat-summary"><div><b>63%</b><small>completude</small></div><div><b>2</b><small>etapas atrasadas</small></div><div><b>3</b><small>compras críticas</small></div></div><div class="chat-actions"><button data-cmd="Atrasos">${ico('triangle-alert')} Explicar atrasos</button><button data-cmd="Próximos passos">${ico('wand-sparkles')} Sugerir próximos passos</button><button data-cmd="Riscos">${ico('shield-alert')} Ver riscos</button></div><div class="chat-log" aria-live="polite"></div></div><form class="chat-form"><input aria-label="Mensagem para IA" placeholder="Pergunte algo ou dê um comando…"/><button aria-label="Enviar">${ico('send')}</button></form>`;
    this.querySelector('.close-chat').addEventListener('click',()=>this.classList.toggle('collapsed'));
    this.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>this.respond(b.dataset.cmd)));
    this.querySelector('form').addEventListener('submit',e=>{e.preventDefault(); const input=e.currentTarget.querySelector('input'); if(!input.value.trim())return; this.respond(input.value.trim()); input.value='';});
    this.positionForView(); window.lucide?.createIcons();
  }
  async respond(text){
    const log=this.querySelector('.chat-log');
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
    const handle=this.querySelector('.drag-handle'); let drag=null;
    handle.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; const r=this.getBoundingClientRect(); drag={x:e.clientX-r.left,y:e.clientY-r.top}; handle.setPointerCapture(e.pointerId); appStore.set({chatManual:true}); });
    handle.addEventListener('pointermove',e=>{ if(!drag)return; const parent=this.parentElement.getBoundingClientRect(); const x=Math.max(8,Math.min(parent.width-this.offsetWidth-8,e.clientX-parent.left-drag.x)); const y=Math.max(80,Math.min(parent.height-this.offsetHeight-8,e.clientY-parent.top-drag.y)); this.style.left=x+'px'; this.style.top=y+'px'; this.style.right='auto'; this.style.bottom='auto'; });
    handle.addEventListener('pointerup',()=>drag=null);
  }
}
customElements.define('ai-chat', AiChat);

export class MapScene extends HTMLElement {
  connectedCallback(){
    this.innerHTML=`<div class="map-fallback"></div><div class="map-host"></div><canvas class="three-overlay"></canvas><div class="map-tint"></div><div class="map-badge">${ico('layers-3')} <span>Visão temática</span></div>`;
    this.initWhenReady(); appStore.subscribe(s=>this.setTheme(s.view));
  }
  initWhenReady(){
    const start=Date.now(); const tick=()=>{ if(window.L){ this.initLeaflet(); this.initThree(); return; } if(Date.now()-start<7000) setTimeout(tick,100); else this.classList.add('fallback-only'); }; tick();
  }
  initLeaflet(){
    const host=this.querySelector('.map-host'); this.map=L.map(host,{zoomControl:false, attributionControl:true, preferCanvas:true}).setView(viewThemes.assistant.center,viewThemes.assistant.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(this.map);
    L.control.zoom({position:'bottomright'}).addTo(this.map);
    this.map.on('move zoom resize',()=>this.syncThree());
    appStore.set({mapReady:true}); this.setTheme(appStore.get().view);
  }
  async initThree(){
    try {
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); this.THREE=THREE;
      const canvas=this.querySelector('.three-overlay'); this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
      this.scene=new THREE.Scene(); this.camera=new THREE.OrthographicCamera(); this.camera.position.z=10;
      const geo=new THREE.CircleGeometry(8,32); const colors=[0x7d64ff,0x2fe6ae,0xffb020,0x55a8ff,0xff5c58];
      this.markerGroup=new THREE.Group(); this.scene.add(this.markerGroup);
      const coords=[[-16.708,-49.092],[-16.706,-49.089],[-16.711,-49.094],[-16.704,-49.088],[-16.710,-49.091]];
      coords.forEach((c,i)=>{ const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:colors[i],transparent:true,opacity:.92})); mesh.userData.latlng=c; this.markerGroup.add(mesh); });
      this.syncThree();
    } catch(err){ console.warn('Three.js indisponível, mantendo mapa 2D.',err); }
  }
  syncThree(){
    if(!this.renderer||!this.map) return; const host=this.querySelector('.map-host'); const w=host.clientWidth,h=host.clientHeight; if(!w||!h)return;
    this.renderer.setSize(w,h,false); this.camera.left=0;this.camera.right=w;this.camera.top=0;this.camera.bottom=h;this.camera.near=-100;this.camera.far=100;this.camera.updateProjectionMatrix();
    for(const m of this.markerGroup.children){ const p=this.map.latLngToContainerPoint(m.userData.latlng); m.position.set(p.x,p.y,0); }
    this.renderer.render(this.scene,this.camera);
  }
  setTheme(view){
    const theme=viewThemes[view]||viewThemes.assistant; this.dataset.tint=theme.tint;
    if(this.map) this.map.flyTo(theme.center,theme.zoom,{duration:.7});
    const label={assistant:'Execução atual',map:'Mapa geral',stages:'Cronograma',purchases:'Compras',inventory:'Materiais',leads:'Leads',collaborators:'Colaboradores',reports:'Indicadores',settings:'Configuração'}[view];
    const span=this.querySelector('.map-badge span'); if(span) span.textContent=label;
  }
}
customElements.define('map-scene', MapScene);

const statusClass = s => String(s).toLowerCase().replaceAll(' ','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export class ViewLayer extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(()=>this.render()); }
  render(){ const view=appStore.get().view; this.dataset.view=view; this.innerHTML=this[view]?.() || this.assistant(); window.lucide?.createIcons(); this.bind(); }
  bind(){
    this.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:b.dataset.view,chatManual:false})));
    this.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>{appStore.set({selectedLead:+b.dataset.lead});this.render();}));
  }
  assistant(){ return `<div class="scene-title"><span>IA · Belavista</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card map-complete"><h3>${ico('layers-3')} Mapa de completude</h3><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">Ver detalhes</button></glass-card><glass-card class="float-card collab-card"><h3>${ico('users')} Colaboradores ativos</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Em atividades externas</span><button data-view="collaborators">Ver equipe</button></glass-card><glass-card class="float-card mini chrono"><h3>${ico('calendar-days')} Cronograma</h3><p>Semana 18 · 12 atividades</p><div class="weekdots"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><button data-view="stages">Ver cronograma</button></glass-card><glass-card class="float-card mini leads-card"><h3>${ico('users-round')} Leads · 7 dias</h3><div class="sparkline">⌁⌃⌁⌃⌁⌃⌁</div><strong>24</strong><small>Total no período</small><button data-view="leads">Ver leads</button></glass-card><glass-card class="float-card mini buy-card"><h3>${ico('shopping-cart')} Compras críticas</h3><strong>Postes de concreto</strong><span>Déficit 8 un.</span><button data-view="purchases">Ver compras</button></glass-card>`; }
  map(){ return `<glass-card class="float-card overview wide"><h3>${ico('map')} Mapa operacional</h3><p>Selecione uma visão temática. O ângulo, o filtro e os cards mudam conforme o aspecto acompanhado.</p><div class="theme-grid">${['stages','collaborators','leads','inventory','purchases'].map(v=>`<button data-view="${v}">${ico({stages:'calendar',collaborators:'users',leads:'user-search',inventory:'package',purchases:'shopping-cart'}[v])}<span>${{stages:'Etapas + cronograma',collaborators:'Colaboradores',leads:'Intenções',inventory:'Materiais',purchases:'Compras'}[v]}</span></button>`).join('')}</div></glass-card>`; }
  stages(){ const a=demoData.activities; return `<glass-card class="float-card timeline-card"><div class="card-head"><div><h3>${ico('calendar-clock')} Etapas + Cronograma</h3><small>Semanas 23 — 28</small></div><span class="chip violet">Semana atual · 25</span></div><div class="timeline">${a.map((x,i)=>`<div class="timeline-step ${x.status}"><b>${x.week}</b><span></span><strong>${x.name}</strong><small>${x.progress}% · ${x.owner}</small></div>`).join('')}</div></glass-card><glass-card class="float-card activity-list"><h3>${ico('list-checks')} Atividades da semana</h3>${a.slice(1,5).map(x=>`<div class="row"><span>${x.name}<small>${x.owner}</small></span><em class="status ${statusClass(x.status)}">${x.status}</em></div>`).join('')}</glass-card><glass-card class="float-card dep-card"><h3>${ico('triangle-alert')} Dependências e atrasos</h3><div class="alert-line"><b>Execução de meio-fio</b><span>Bloqueado</span></div><div class="alert-line"><b>Rede de água</b><span>Aguardando projeto</span></div><button>Ver análise completa</button></glass-card><glass-card class="float-card team-card"><h3>${ico('users')} Equipe escalada</h3>${demoData.collaborators.map(x=>`<div class="row"><span>${x[0]}<small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card>`; }
  inventory(){ return `<div class="kpi-strip"><stat-pill icon="coins" label="Valor em estoque" value="${demoData.metrics.inventoryValue}" tone="amber"></stat-pill><stat-pill icon="triangle-alert" label="Itens críticos" value="7" tone="red" sub="Requer atenção"></stat-pill><stat-pill icon="wrench" label="Materiais em uso" value="12" tone="teal"></stat-pill><stat-pill icon="lock-keyhole" label="Reservas" value="R$ 487.320" tone="violet"></stat-pill></div><glass-card class="float-card inventory-table"><h3>${ico('package-open')} Inventário de materiais</h3><table><thead><tr><th>Material</th><th>Estoque</th><th>Reservado</th><th>Em uso</th><th>Nível</th></tr></thead><tbody>${demoData.materials.map(r=>`<tr><td>${r[0]}</td><td>${r[1]} ${r[4]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="level ${r[5]}">${r[5]}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card inventory-use"><h3>${ico('zap')} Materiais em uso agora</h3>${demoData.materials.slice(0,6).map((r,i)=>`<div class="row"><span>${r[0]}<small>${['Drenagem','Pavimentação','Rede Elétrica'][i%3]} · Frente 0${i%3+1}</small></span><em>${r[3]} ${r[4]}</em></div>`).join('')}</glass-card><glass-card class="float-card inventory-alert"><h3>${ico('triangle-alert')} Alertas de estoque</h3>${demoData.materials.filter(r=>r[5]!=='bom').map(r=>`<div class="alert-line"><b>${r[0]}</b><span>${r[5]==='critico'?'2 dias':'5 dias'}</span></div>`).join('')}</glass-card>`; }
  leads(){ const s=appStore.get().selectedLead, lead=demoData.leads[s]; return `<div class="kpi-strip"><stat-pill icon="users" label="Intenções cadastradas" value="238" tone="violet" sub="+28 hoje"></stat-pill><stat-pill icon="map-pin" label="Lotes com interesse" value="96" tone="blue"></stat-pill><stat-pill icon="phone" label="Leads em contato" value="61" tone="teal"></stat-pill><stat-pill icon="badge-check" label="Qualificados" value="37" tone="amber"></stat-pill></div><glass-card class="float-card lead-legend"><h3>${ico('map-pinned')} Intenções</h3><ul class="legend"><li><i class="dot green"></i> Moradia</li><li><i class="dot blue"></i> Investimento</li><li><i class="dot amber"></i> Veraneio</li><li><i class="dot violet"></i> Moradia + Investimento</li></ul></glass-card><glass-card class="float-card lead-detail"><h3>Detalhes do lead selecionado</h3><div class="person"><span class="avatar">${lead.name[0]}</span><div><strong>${lead.name}</strong><small>${lead.status}</small></div></div><dl><dt>Lote desejado</dt><dd>${lead.lot}</dd><dt>Faixa de valor</dt><dd>${lead.budget}</dd><dt>Nascer do sol</dt><dd>${lead.sun}</dd><dt>Altitude</dt><dd>${lead.altitude}</dd><dt>Terreno</dt><dd>${lead.terrain}</dd><dt>Objetivo</dt><dd>${lead.objective}</dd></dl></glass-card><glass-card class="float-card lot-intents"><h3>Intenções relacionadas</h3>${demoData.leads.map((x,i)=>`<button class="lead-row ${i===s?'selected':''}" data-lead="${i}"><span class="avatar">${x.name[0]}</span><span><b>${x.name}</b><small>${x.lot} · ${x.budget}</small></span><em>${x.status}</em></button>`).join('')}</glass-card>`; }
  purchases(){ return `<div class="kpi-strip"><stat-pill icon="clipboard-list" label="Pedidos em aberto" value="12" tone="violet" sub="R$ 485.230"></stat-pill><stat-pill icon="truck" label="Em andamento" value="8" tone="blue" sub="R$ 258.900"></stat-pill><stat-pill icon="clock-alert" label="Atrasadas" value="3" tone="amber" sub="R$ 78.600"></stat-pill><stat-pill icon="circle-check" label="Recebidas no mês" value="18" tone="teal" sub="R$ 612.450"></stat-pill></div><glass-card class="float-card purchase-analysis"><h3>${ico('sparkles')} IA · Análise de compras</h3><p>Há 3 pedidos atrasados com impacto direto em etapas críticas.</p><ul><li>Rede elétrica: postes com 8 dias de atraso</li><li>Drenagem: tubos com 5 dias de atraso</li></ul><button>Ver recomendações</button></glass-card><glass-card class="float-card purchase-summary"><h3>${ico('pie-chart')} Resumo de compras</h3><div class="donut"><span>R$ 1,43M<small>Total no mês</small></span></div><ul class="legend"><li><i class="dot violet"></i> Elétrica 32%</li><li><i class="dot blue"></i> Tubos 25%</li><li><i class="dot green"></i> Concreto 18%</li><li><i class="dot amber"></i> Diversos 15%</li></ul></glass-card><glass-card class="float-card purchases-table"><h3>${ico('shopping-cart')} Pedidos</h3><table><thead><tr><th>ID</th><th>Fornecedor</th><th>Descrição</th><th>Etapa</th><th>Valor</th><th>Status</th></tr></thead><tbody>${demoData.purchases.map(x=>`<tr><td>${x.id}</td><td>${x.supplier}</td><td>${x.desc}</td><td>${x.stage}</td><td>${x.value}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card deliveries"><h3>${ico('truck')} Próximas entregas</h3><div class="row"><span>18 MAI<small>Concreto FCK 25MPa</small></span><em>Em andamento</em></div><div class="row"><span>20 MAI<small>Cabo de alumínio</small></span><em>Em andamento</em></div><div class="row"><span>22 MAI<small>Caixa de passagem</small></span><em>Pendente</em></div></glass-card>`; }
  collaborators(){ return `<glass-card class="float-card collab-main"><h3>${ico('users')} Colaboradores</h3><p>Visualização das pessoas e frentes ativas sobre o mapa.</p>${demoData.collaborators.map((x,i)=>`<div class="collab-row"><span class="avatar">${x[0][0]}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card><glass-card class="float-card collab-stats"><h3>${ico('hard-hat')} Presença e alocação</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Atividades externas</span><b>5</b><span>Equipamentos em uso</span></glass-card>`; }
  reports(){ return `<glass-card class="float-card reports-main"><h3>${ico('chart-no-axes-combined')} Relatórios / Indicadores</h3><p>Resumo contextual consolidado pelas entidades e registros do sistema.</p><div class="report-grid"><div><small>Avanço físico</small><strong>68,4%</strong></div><div><small>Etapas ativas</small><strong>4</strong></div><div><small>Materiais em atenção</small><strong>3</strong></div><div><small>Pendências</small><strong>7</strong></div></div><button>${ico('file-down')} Gerar PDF</button></glass-card>`; }
  settings(){ return `<glass-card class="float-card settings-card"><h3>${ico('settings')} Configurações</h3><p>Configuração local da PWA e integração opcional com GitHub.</p><button id="reinstall">Reabrir instalação</button><button id="clearPat">Limpar PAT local</button></glass-card>`; }
}
customElements.define('view-layer', ViewLayer);

export {ico, esc};
