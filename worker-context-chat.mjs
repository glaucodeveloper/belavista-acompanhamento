// BELAVISTA_WORKER_CONTEXT_CHAT_V5407
// Assistente local e persistente para o monitor de workers e suas rotas
// dedicadas. O módulo não depende do shell que cada página reconstrói.

const THREAD_KEY = 'belavista.worker-context-chat.v1';
const VOICE_KEY = 'belavista.worker-context-chat.voice.v1';
const NAV_KEY = 'belavista.worker-context-chat.last-route.v1';
const MAX_MESSAGES = 60;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const qs = (selector, scope = document) => scope.querySelector(selector);
const now = () => new Date().toISOString();
const labelForPath = path => {
  if (/\/activity/.test(path)) return 'atividade dedicada';
  if (/\/stage/.test(path)) return 'etapa dedicada';
  return 'monitoria dos workers';
};

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function currentContext() {
  const text = selector => String(qs(selector)?.textContent || '').trim();
  return {
    route: `${location.pathname}${location.search}`,
    surface: labelForPath(location.pathname),
    heading: text('h1'),
    worker: text('[data-worker-status]'),
    cycle: text('[data-cycle-status]'),
    connection: text('[data-connection]') || text('[data-sync-state]'),
    cash: text('[data-cash]'),
    events: text('[data-event-count]'),
    agenda: text('[data-agenda-count]'),
    records: text('[data-record-count]') || text('[data-input-count]'),
    stage: new URLSearchParams(location.search).get('stage') || '',
    activity: new URLSearchParams(location.search).get('activity') || ''
  };
}

function contextSummary(context) {
  return [
    context.heading && `tela: ${context.heading}`,
    context.worker && `worker: ${context.worker}`,
    context.cycle && `ciclo: ${context.cycle}`,
    context.cash && `caixa: ${context.cash}`,
    context.events && `eventos: ${context.events}`,
    context.agenda && `agenda: ${context.agenda}`,
    context.records && `registros: ${context.records}`
  ].filter(Boolean).join(' · ') || 'estado operacional ainda não informado';
}

class WorkerContextChat {
  constructor() {
    this.messages = readJson(THREAD_KEY, []);
    this.messages = Array.isArray(this.messages) ? this.messages.slice(-MAX_MESSAGES) : [];
    this.editingId = null;
    this.voiceEnabled = readJson(VOICE_KEY, false) === true;
    this.lastSnapshot = null;
    this.route = `${location.pathname}${location.search}`;
    this.observer = null;
    this.poll = null;
    this.pendingObservation = null;
    this.contextFadeTimer = null;
  }

  mount() {
    if (document.querySelector('[data-worker-context-assistant]')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <aside class="worker-context-assistant" data-worker-context-assistant aria-label="Assistente operacional dos workers">
        <header class="worker-context-chat-head">
          <div><span class="worker-context-mark">✦</span><div><strong>IA · worker operacional</strong><small data-worker-chat-monitor>Observando ${esc(labelForPath(location.pathname))}</small></div></div>
          <div class="worker-context-chat-head-actions"><button type="button" data-worker-chat-voice aria-pressed="${String(this.voiceEnabled)}" title="Ativar avisos falados">◖</button><button type="button" data-worker-chat-minimize aria-label="Minimizar assistente">−</button></div>
        </header>
        <div class="worker-context-chat-body">
          <div class="worker-context-chat-intro"><strong>Conversa de operação</strong><span>Entradas, edições, inferências e alertas ficam registrados nesta sessão.</span></div>
          <div class="worker-context-fade" data-worker-context-fade aria-live="polite" aria-atomic="true" hidden></div>
          <div class="worker-context-chat-log" data-worker-chat-log aria-live="polite"></div>
          <div class="worker-context-chat-quick" aria-label="Ações rápidas">
            <button type="button" data-worker-chat-action="cycle">Executar ciclo</button>
            <button type="button" data-worker-chat-action="tests">Rodar suíte</button>
            <button type="button" data-worker-chat-action="alerts">Abrir alertas</button>
            <button type="button" data-worker-chat-action="requirements">Revisar requisitos</button>
          </div>
          <form class="worker-context-chat-form" data-worker-chat-form>
            <textarea name="message" rows="2" maxlength="2000" placeholder="Descreva um fato, peça uma ação ou revise uma diretriz…" aria-label="Mensagem para o assistente dos workers"></textarea>
            <div><small data-worker-chat-status>Pronto para observar e organizar.</small><button type="submit" data-worker-chat-submit>Enviar</button></div>
          </form>
        </div>
      </aside>`);
    this.root = qs('[data-worker-context-assistant]');
    this.log = qs('[data-worker-chat-log]', this.root);
    this.input = qs('textarea', this.root);
    this.status = qs('[data-worker-chat-status]', this.root);
    this.render();
    this.bind();
    this.observe();
    this.announceRouteChange();
  }

  bind() {
    qs('[data-worker-chat-minimize]', this.root)?.addEventListener('click', () => {
      const collapsed = this.root.classList.toggle('is-collapsed');
      this.root.dataset.collapsed = String(collapsed);
      qs('[data-worker-chat-minimize]', this.root).textContent = collapsed ? '+' : '−';
      qs('[data-worker-chat-minimize]', this.root).setAttribute('aria-label', collapsed ? 'Restaurar assistente' : 'Minimizar assistente');
    });
    qs('[data-worker-chat-voice]', this.root)?.addEventListener('click', event => {
      this.voiceEnabled = !this.voiceEnabled;
      localStorage.setItem(VOICE_KEY, JSON.stringify(this.voiceEnabled));
      event.currentTarget.setAttribute('aria-pressed', String(this.voiceEnabled));
      event.currentTarget.title = this.voiceEnabled ? 'Desativar avisos falados' : 'Ativar avisos falados';
      this.status.textContent = this.voiceEnabled ? 'Avisos falados ativados neste dispositivo.' : 'Avisos falados desativados.';
      if (!this.voiceEnabled) globalThis.speechSynthesis?.cancel();
    });
    qs('[data-worker-chat-form]', this.root)?.addEventListener('submit', event => {
      event.preventDefault();
      const value = this.input.value.trim();
      if (!value) return;
      const editing = this.editingId;
      this.input.value = '';
      this.editingId = null;
      this.submit(value, editing);
    });
    this.input?.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        qs('[data-worker-chat-form]', this.root)?.requestSubmit();
      }
    });
    this.root.addEventListener('click', event => {
      const edit = event.target.closest('[data-worker-chat-edit]');
      if (edit) this.startEdit(edit.dataset.workerChatEdit);
      const speak = event.target.closest('[data-worker-chat-speak]');
      if (speak) this.speak(speak.dataset.workerChatSpeak);
      const action = event.target.closest('[data-worker-chat-action]');
      if (action) this.runAction(action.dataset.workerChatAction);
    });
  }

  render() {
    if (!this.log) return;
    this.log.innerHTML = this.messages.map(item => {
      const isUser = item.kind === 'user';
      const text = esc(item.text);
      const meta = `${isUser ? 'Entrada registrada' : item.auto ? 'Observação automática' : 'Resposta da IA'} · ${new Date(item.at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      return `<article class="worker-chat-message ${isUser ? 'is-user' : 'is-assistant'}" data-message-id="${esc(item.id)}"><div class="worker-chat-message-meta"><span>${esc(meta)}</span>${isUser ? `<button type="button" data-worker-chat-edit="${esc(item.id)}">Editar</button>` : `<button type="button" data-worker-chat-speak="${esc(item.text)}" aria-label="Ouvir resposta">Ouvir</button>`}</div><p>${text}</p>${item.audit ? `<small class="worker-chat-audit">${esc(item.audit)}</small>` : ''}</article>`;
    }).join('');
    this.log.scrollTop = this.log.scrollHeight;
  }

  save() {
    this.messages = this.messages.slice(-MAX_MESSAGES);
    localStorage.setItem(THREAD_KEY, JSON.stringify(this.messages));
  }

  add(kind, text, options = {}) {
    const value = String(text || '').trim().slice(0, 2000);
    if (!value) return null;
    const item = {
      id: `worker-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind, text: value, at: now(), auto: Boolean(options.auto),
      audit: options.audit || ''
    };
    this.messages.push(item);
    this.save();
    this.render();
    return item;
  }

  startEdit(id) {
    const item = this.messages.find(message => message.id === id && message.kind === 'user');
    if (!item) return;
    this.editingId = id;
    this.input.value = item.text;
    this.input.focus();
    qs('[data-worker-chat-submit]', this.root).textContent = 'Atualizar';
    this.status.textContent = 'Editando entrada; envie para reavaliar a diretriz.';
  }

  async submit(text, editingId = null) {
    if (editingId) {
      const item = this.messages.find(message => message.id === editingId);
      if (item) {
        item.text = text;
        item.at = now();
        item.audit = 'Entrada editada pelo usuário · aguardando nova inferência';
        const index = this.messages.indexOf(item);
        this.messages.splice(index + 1, this.messages.length - index - 1);
      }
      this.save();
      this.render();
      qs('[data-worker-chat-submit]', this.root).textContent = 'Enviar';
    } else {
      this.add('user', text, { audit: `Contexto capturado: ${contextSummary(currentContext())}` });
    }
    this.status.textContent = 'Lendo contexto, relações e saídas possíveis…';
    const reply = await this.ask(text);
    this.add('assistant', reply.text, { audit: reply.audit });
    this.status.textContent = reply.source === 'endpoint' ? 'Resposta recebida do endpoint; trilha registrada.' : 'Modo local de demonstração; saída externa desabilitada.';
    this.executeSafeActions(text);
    if (this.voiceEnabled) this.speak(reply.text);
  }

  async ask(message) {
    const context = currentContext();
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message, view: 'workers', context: {
            ...context,
            summary: contextSummary(context),
            capabilities: ['observar eventos', 'editar entradas', 'organizar agenda', 'programar cronograma', 'recalcular materiais e equipe', 'preparar notificações locais']
          }
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return {
        text: String(payload.text || '').trim() || 'O endpoint de IA retornou uma resposta vazia.',
        source: 'endpoint',
        audit: `Endpoint consultado · ${contextSummary(context)}`
      };
    } catch (error) {
      return {
        text: `Endpoint de IA indisponível · ${error.message}`,
        source: 'error',
        audit: `Nenhuma resposta local foi usada · ${contextSummary(context)}`
      };
    }
  }

  runAction(action) {
    const messages = {
      cycle: 'Execute o ciclo operacional e explique como caixa, materiais, pessoal e dependências organizam a agenda.',
      tests: 'Execute a suíte de testes e mostre entradas, saídas, notificações e propagações.',
      alerts: 'Abra as notificações e explique o último alerta do worker.',
      requirements: 'Revise os requisitos e as condições de liberação desta etapa.'
    };
    if (action === 'cycle') qs('[data-run-cycle]')?.click();
    if (action === 'tests') (qs('[data-run-suite]') || qs('[data-run-development-cycle]'))?.click();
    if (action === 'alerts') qs('[data-notification-toggle]')?.click() || qs('[data-open-communications="notifications"]')?.click();
    if (action === 'requirements') {
      qs('[data-requirements-catalog]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      qs('[data-requirements-search]')?.focus();
    }
    this.input.value = messages[action] || '';
    qs('[data-worker-chat-form]', this.root)?.requestSubmit();
  }

  executeSafeActions(text) {
    const lower = String(text).toLocaleLowerCase('pt-BR');
    if (/abrir.*alert|notifica/.test(lower)) qs('[data-notification-toggle]')?.click() || qs('[data-open-communications="notifications"]')?.click();
    if (/abrir.*contato|mensag/.test(lower)) qs('[data-open-communications="messages"]')?.click();
    if (/requis|cat[aá]logo/.test(lower)) qs('[data-requirements-catalog]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (/execut.*ciclo/.test(lower)) qs('[data-run-cycle]')?.click();
  }

  speak(text) {
    const synth = globalThis.speechSynthesis;
    if (!synth || typeof globalThis.SpeechSynthesisUtterance !== 'function') {
      this.status.textContent = 'Este navegador não disponibiliza avisos falados.';
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    synth.speak(utterance);
  }

  announceRouteChange() {
    const previous = sessionStorage.getItem(NAV_KEY);
    sessionStorage.setItem(NAV_KEY, this.route);
    if (previous && previous !== this.route) {
      this.showContextualFade(`Navegação observada: ${labelForPath(location.pathname)}. Vou acompanhar as entradas e saídas desta superfície.`);
    }
  }

  showContextualFade(message) {
    const node = qs('[data-worker-context-fade]', this.root);
    if (!node) return;
    clearTimeout(this.contextFadeTimer);
    node.textContent = '';
    const label = document.createElement('span');
    label.textContent = 'Percepção contextual · IA';
    const text = document.createElement('p');
    text.textContent = String(message || '');
    node.append(label, text);
    node.hidden = false;
    node.classList.remove('is-visible');
    requestAnimationFrame(() => node.classList.add('is-visible'));
    this.contextFadeTimer = setTimeout(() => {
      node.classList.remove('is-visible');
      setTimeout(() => { if (!node.classList.contains('is-visible')) node.hidden = true; }, 420);
    }, 4200);
  }

  observe() {
    this.lastSnapshot = JSON.stringify(currentContext());
    const announce = (kind, detail) => {
      const message = typeof detail === 'string' ? detail : detail?.message || detail?.title || `O sistema registrou ${kind}.`;
      const key = `${kind}:${message}`;
      if (this.pendingObservation === key) return;
      this.pendingObservation = key;
      this.showContextualFade(message);
      if (this.voiceEnabled) this.speak(message);
    };
    ['belavista:test-case-completed', 'belavista:test-controls-changed', 'belavista:integrations-saved', 'belavista:worker-cycle-completed', 'belavista:worker-state-changed'].forEach(type => {
      globalThis.addEventListener(type, event => announce(type.replace('belavista:', ''), event.detail));
    });
    globalThis.addEventListener('popstate', () => announce('navegação', `Navegação observada: ${labelForPath(location.pathname)}.`));
    globalThis.addEventListener('hashchange', () => announce('navegação', 'A seção da superfície foi alterada; contexto mantido na conversa.'));
    const checkContext = () => {
      const next = JSON.stringify(currentContext());
      if (next === this.lastSnapshot) return;
      const previous = JSON.parse(this.lastSnapshot || '{}');
      const current = JSON.parse(next);
      this.lastSnapshot = next;
      if (previous.cycle !== current.cycle && current.cycle) announce('ciclo', `Atualização do ciclo: ${current.cycle}`);
      if (previous.worker !== current.worker && current.worker) announce('worker', `Estado do worker alterado para ${current.worker}.`);
      if (previous.cash !== current.cash && current.cash) announce('caixa', `O caixa mestre foi atualizado para ${current.cash}. A prioridade das etapas e materiais deve ser recalculada.`);
      if (previous.events !== current.events && current.events) announce('eventos', `O monitor recebeu ${current.events} evento(s) operacional(is). Confira a trilha e os responsáveis.`);
      if (previous.agenda !== current.agenda && current.agenda) announce('agenda', `A agenda visível foi atualizada para ${current.agenda} item(ns).`);
      if (previous.records !== current.records && current.records) announce('registros', `O histórico de registros mudou para ${current.records} item(ns). Confira evidências, responsável e local da atividade.`);
      this.poll = globalThis.setTimeout(checkContext, 5000);
    };
    // Agenda a leitura em período ocioso para não competir com a renderização
    // da página. O fallback mantém compatibilidade com navegadores móveis.
    const scheduleContextCheck = () => {
      const run = () => (globalThis.requestIdleCallback
        ? globalThis.requestIdleCallback(checkContext, { timeout: 1200 })
        : globalThis.setTimeout(checkContext, 0));
      run();
    };
    scheduleContextCheck();
    let monitorFrame = 0;
    this.observer = new MutationObserver(() => {
      if (monitorFrame) return;
      monitorFrame = globalThis.requestAnimationFrame(() => {
        monitorFrame = 0;
        const monitor = qs('[data-worker-chat-monitor]', this.root);
        if (monitor) monitor.textContent = `Observando ${labelForPath(location.pathname)} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}

const assistant = new WorkerContextChat();
assistant.mount();
globalThis.belavistaWorkerAssistant = assistant;
