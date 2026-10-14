const KEY = 'belavista.usage-preferences.v1';
const pages = {map:'Mapa', control:'Dashboard', stages:'Etapas e Cronograma', materials:'Materiais', documents:'Documentos', leads:'Leads', reports:'Relatórios'};
const defaults = {defaultPage:'map', density:'comfortable', reduceMotion:false, voiceEnabled:false};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function readUsagePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {...defaults, ...saved, defaultPage: pages[saved.defaultPage] ? saved.defaultPage : 'map'};
  } catch { return {...defaults}; }
}

export function applyUsagePreferences(preferences = readUsagePreferences()) {
  document.documentElement.dataset.usageDensity = preferences.density === 'compact' ? 'compact' : 'comfortable';
  document.documentElement.dataset.usageMotion = preferences.reduceMotion ? 'reduced' : 'normal';
  const assistant = globalThis.belavistaWorkerAssistant;
  if (assistant) {
    assistant.voiceEnabled = Boolean(preferences.voiceEnabled);
    assistant.root?.querySelector('[data-worker-chat-voice]')?.setAttribute('aria-pressed', String(preferences.voiceEnabled));
  }
  if (!document.getElementById('usage-preferences-style')) {
    const style = document.createElement('style');
    style.id = 'usage-preferences-style';
    style.textContent = `[data-usage-density="compact"] view-layer table td,[data-usage-density="compact"] view-layer table th{padding-top:5px!important;padding-bottom:5px!important}[data-usage-motion="reduced"] *,[data-usage-motion="reduced"] *::before,[data-usage-motion="reduced"] *::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}.usage-settings-page{display:grid;gap:20px;padding:24px;max-width:1100px;margin:auto;color:var(--text,#f4f4f4)}.usage-settings-page h1{margin:6px 0}.usage-settings-page p{color:#a8a8a8;line-height:1.5}.usage-settings-page fieldset{padding:20px;border:1px solid #525252;background:#202124;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.usage-settings-page legend{padding:0 8px;font-weight:600}.usage-settings-page label{display:grid;gap:7px;font-size:13px}.usage-settings-page input,.usage-settings-page select{padding:10px;background:#161616;color:#f4f4f4;border:1px solid #525252;border-radius:4px}.usage-settings-page .usage-check{display:flex;align-items:center;gap:10px}.usage-settings-page .usage-check input{width:18px;height:18px}.usage-settings-page footer{display:flex;align-items:center;justify-content:space-between;gap:16px}.usage-settings-page button[type="submit"]{padding:12px 20px;background:#0f62fe;color:white;border:0;cursor:pointer}.usage-settings-page [role="status"]{color:#6fdc8c}@media(max-width:700px){.usage-settings-page fieldset{grid-template-columns:1fr}.usage-settings-page footer{align-items:flex-start;flex-direction:column}}`;
    document.head.append(style);
  }
}

export function installUsageSettings({ViewLayer, appStore, readIntegrationSettings, integrationKey}) {
  applyUsagePreferences();
  ViewLayer.prototype.settings = function () {
    const prefs = readUsagePreferences();
    const business = {...(readIntegrationSettings() || {}), ...(appStore.get().integrationSettings || {})};
    const field = (label, name, value, type='text', extra='') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
    return `<section class="usage-settings-page"><header><span class="activity-kind">PREFERÊNCIAS E DADOS DO EMPREENDIMENTO</span><h1>Configurações de uso</h1><p>Personalize a interface e os dados usados no atendimento. As preferências são salvas neste navegador.</p></header><form data-usage-settings-form><fieldset><legend>Minha experiência</legend><label>Página ao abrir<select name="defaultPage">${Object.entries(pages).map(([id,label])=>`<option value="${id}" ${prefs.defaultPage===id?'selected':''}>${label}</option>`).join('')}</select></label><label>Densidade das tabelas<select name="density"><option value="comfortable" ${prefs.density==='comfortable'?'selected':''}>Confortável</option><option value="compact" ${prefs.density==='compact'?'selected':''}>Compacta</option></select></label><label class="usage-check"><input name="reduceMotion" type="checkbox" ${prefs.reduceMotion?'checked':''}>Reduzir animações</label><label class="usage-check"><input name="voiceEnabled" type="checkbox" ${prefs.voiceEnabled?'checked':''}>Ouvir respostas do assistente</label></fieldset><fieldset><legend>Contato e avisos</legend>${field('WhatsApp para atendimento','whatsappNumber',business.whatsappNumber || '', 'tel')}${field('Conta do Instagram','instagramAccount',business.instagramAccount || '')}<label class="usage-check"><input name="autoNotify" type="checkbox" ${business.autoNotify?'checked':''}>Receber avisos de caixa e materiais</label></fieldset><fieldset><legend>Reserva e recebimento</legend>${field('Chave Pix','pixKey',business.pixKey || '')}${field('Valor do sinal (R$)','signalAmount',business.signalAmount ?? 1000,'number','min="0" step="0.01" required')}${field('Nome do recebedor','pixReceiver',business.pixReceiver || 'ALIANCA PARK','text','maxlength="25" required')}${field('Cidade do recebedor','pixCity',business.pixCity || 'SENADOR CANEDO','text','maxlength="15" required')}</fieldset><footer><span role="status" data-usage-settings-status aria-live="polite"></span><button type="submit">Salvar preferências</button></footer></form></section>`;
  };
  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind?.apply(this,args);
    const form = this.querySelector('[data-usage-settings-form]');
    if (!form || form.dataset.bound) return result;
    form.dataset.bound = 'true';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const preferences = {defaultPage:String(data.get('defaultPage')),density:String(data.get('density')),reduceMotion:data.has('reduceMotion'),voiceEnabled:data.has('voiceEnabled')};
      const business = {...(readIntegrationSettings() || {}), ...(appStore.get().integrationSettings || {})};
      for (const name of ['whatsappNumber','instagramAccount','pixKey','pixReceiver','pixCity']) business[name] = String(data.get(name) || '').trim();
      business.signalAmount = Number(data.get('signalAmount'));
      business.autoNotify = data.has('autoNotify');
      try {
        localStorage.setItem(KEY, JSON.stringify(preferences));
        localStorage.setItem(integrationKey, JSON.stringify(business));
        localStorage.setItem('belavista.worker-context-chat.voice.v1', preferences.voiceEnabled?'1':'0');
        localStorage.setItem('belavista.ai-chat.voice-enabled.v1', preferences.voiceEnabled?'1':'0');
        applyUsagePreferences(preferences);
        appStore.set({integrationSettings:business,usagePreferences:preferences,lastAction:'Salvou configurações de uso'});
        this.querySelector('[data-usage-settings-status]').textContent = 'Preferências salvas.';
      } catch {
        form.querySelector('[data-usage-settings-status]').textContent = 'Não foi possível salvar neste navegador. Tente novamente.';
      }
    });
    return result;
  };
}
