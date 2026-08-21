import './components.js?v=73';
import {appStore} from './state.js';

const STORAGE_KEY='belavista.install.v1';
const qs=new URLSearchParams(location.search);

class InstallScreen extends HTMLElement {
  connectedCallback(){ document.querySelector('#boot')?.remove(); this.render(); this.bind(); }
  render(){
    const saved=localStorage.getItem(STORAGE_KEY);
    const demo=qs.get('demo')==='1';
    if(saved||demo){ this.hidden=true; queueMicrotask(()=>startApp(saved?JSON.parse(saved):{mode:'demo'})); return; }
    this.hidden=false;
    this.innerHTML=`<section class="install-wrap"><div class="install-panel"><div class="install-brand"><span class="install-mark">◢</span><div><strong>Belavista</strong><small>LOTEAMENTO · CONFIGURAÇÃO LOCAL</small></div></div><h1>Instalar o painel local</h1><p class="install-copy">Configure o projeto, salve a integração neste dispositivo e instale a PWA. O sistema funciona como SPA e mantém o shell em cache para não recarregar a interface entre módulos.</p><div class="install-grid"><label>Nome do empreendimento<input id="projectName" value="Empreendimento Belavista" /></label><label>Repositório GitHub<input id="repo" placeholder="usuario/belavista-acompanhamento" /></label><label class="full">Personal Access Token (PAT)<input id="pat" type="password" autocomplete="off" placeholder="github_pat_…" /></label></div><div class="security-note"><b>Segurança:</b> por solicitação desta instalação, o PAT pode ser salvo no <code>localStorage</code> deste navegador. Isso não é recomendado para produção porque scripts da mesma origem podem lê-lo. Use um token de escopo mínimo e um perfil de navegador dedicado.</div><label class="remember"><input id="remember" type="checkbox" checked /> Salvar configuração e PAT neste dispositivo</label><div class="install-actions"><button id="validate" class="ghost">Validar PAT</button><button id="demo" class="ghost">Abrir modo demonstração</button><button id="install" class="primary">Salvar e entrar</button></div><div id="installStatus" class="install-status" aria-live="polite"></div><div class="script-box"><div><strong>Criar um novo repositório com GitHub CLI + SSH</strong><span>Script incluído em <code>scripts/create-repo.sh</code></span></div><pre>bash scripts/create-repo.sh belavista-acompanhamento private</pre></div><button id="pwaInstall" class="pwa-install" disabled>Instalar PWA neste dispositivo</button></div></section>`;
  }
  bind(){
    this.querySelector('#demo')?.addEventListener('click',()=>{this.hidden=true;startApp({mode:'demo'});});
    this.querySelector('#validate')?.addEventListener('click',()=>this.validatePat());
    this.querySelector('#install')?.addEventListener('click',()=>this.save());
    this.querySelector('#pwaInstall')?.addEventListener('click',async()=>{const p=appStore.get().installPrompt;if(!p)return;await p.prompt();appStore.set({installPrompt:null});this.updateInstallButton();});
    this.updateInstallButton();
  }
  updateInstallButton(){ const b=this.querySelector('#pwaInstall'); if(!b)return; b.disabled=!appStore.get().installPrompt; b.textContent=b.disabled?'Instalação PWA disponível após abrir a página':'Instalar PWA neste dispositivo'; }
  async validatePat(){
    const token=this.querySelector('#pat').value.trim(); const status=this.querySelector('#installStatus'); if(!token){status.textContent='Informe um PAT para validar.';return;}
    status.textContent='Validando…';
    try{const r=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error(`GitHub respondeu ${r.status}`);const u=await r.json();status.textContent=`PAT válido para ${u.login}.`;status.className='install-status ok';}
    catch(err){status.textContent=`Não foi possível validar: ${err.message}`;status.className='install-status err';}
  }
  save(){
    const cfg={projectName:this.querySelector('#projectName').value.trim()||'Empreendimento Belavista',repo:this.querySelector('#repo').value.trim(),pat:this.querySelector('#pat').value.trim(),savedAt:new Date().toISOString()};
    if(this.querySelector('#remember').checked)localStorage.setItem(STORAGE_KEY,JSON.stringify(cfg));
    this.hidden=true;startApp(cfg);
  }
}
customElements.define('install-screen',InstallScreen);

class BelavistaApp extends HTMLElement {
  connectedCallback(){ document.querySelector('#boot')?.remove(); this.render(); this.bind(); }
  render(){this.innerHTML=`<div class="app-shell ${appStore.get().sidebarCollapsed?'sidebar-collapsed':''}"><app-sidebar></app-sidebar><div class="app-main"><app-topbar></app-topbar><main class="scene"><map-scene></map-scene><view-layer></view-layer><ai-chat></ai-chat></main></div></div>`;window.lucide?.createIcons();}
  bind(){
    appStore.subscribe(s=>{this.dataset.view=s.view;this.querySelector('.app-shell')?.classList.toggle('sidebar-collapsed',s.sidebarCollapsed);setTimeout(()=>window.lucide?.createIcons(),0);});
    this.addEventListener('click',e=>{if(e.target.closest('#reinstall')){localStorage.removeItem(STORAGE_KEY);location.href=location.pathname;}if(e.target.closest('#clearPat')){const cfg=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');cfg.pat='';localStorage.setItem(STORAGE_KEY,JSON.stringify(cfg));alert('PAT removido do armazenamento local.');}});
  }
}
customElements.define('belavista-app',BelavistaApp);

function startApp(config){
  const boot=document.querySelector('#boot'); if(boot)boot.remove();
  const app=document.querySelector('belavista-app'); app.hidden=false; appStore.set({config,theme:'dark'}); document.documentElement.dataset.theme='dark';
  if(window.matchMedia?.('(max-width: 760px)').matches) appStore.set({view:'records',lastAction:'Modo mobile de registros ativado'});
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(console.warn);
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();appStore.set({installPrompt:e});document.querySelector('install-screen')?.updateInstallButton?.();});
window.addEventListener('appinstalled',()=>appStore.set({installPrompt:null}));
