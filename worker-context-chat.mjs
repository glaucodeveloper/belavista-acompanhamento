// BELAVISTA_WORKER_CONTEXT_CHAT_V5407
// Assistente local e persistente para o monitor de workers e suas rotas
// dedicadas. O módulo não depende do shell que cada página reconstrói.
import { parseLotStatusCommand, applyLotStatusCommand } from './lot-status-command.mjs';

const THREAD_KEY = 'belavista.worker-context-chat.v1';
const SERVICE_KEY = 'belavista.worker-context-chat.service-id.v1';
const VOICE_KEY = 'belavista.worker-context-chat.voice.v1';
const NAV_KEY = 'belavista.worker-context-chat.last-route.v1';
const MAX_MESSAGES = 60;
const CHAT_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const WORKER_OPERATIONAL_EXECUTION_INSTRUCTION_V2 = `Trate pedidos operacionais como intenção de execução, não apenas como perguntas. Execute no sistema tudo que estiver representado por ferramentas seguras e não invente fatos. Quando compreender etapa ou atividade, mas faltarem dados para concluir, crie um apontamento Pendente no cronograma com o que já é conhecido e pergunte somente os detalhes faltantes. Quando depender de evidência, nota, projeto, autorização ou outro documento, peça esse documento e abra o fluxo documental quando isso ajudar. Se a compreensão indicar algo completamente externo ao sistema e não houver ação interna segura, não fabrique registro, conclusão, compra ou agenda: peça apenas a evidência/documento necessário. Nunca afirme que executou algo que nenhuma ferramenta confirmou. Diferencie fato observado, inferência e dado a confirmar.`;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const qs = (selector, scope = document) => scope.querySelector(selector);
const now = () => new Date().toISOString();
const serviceStatusLabel = status => ({triage:'Em triagem',planned:'Planejada',in_progress:'Em execução',waiting_files:'Aguardando arquivos',completed:'Concluída',cancelled:'Cancelada'}[status]||status);
const waitForUi = async (predicate, timeout = 1200) => {
  const until = performance.now() + timeout;
  while (performance.now() < until) {
    if (predicate()) return true;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return Boolean(predicate());
};
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
    const saved = readJson(THREAD_KEY, []);
    this.messages = Array.isArray(saved) ? saved.filter(item => item.kind === 'assistant').slice(-1) : [];
    this.editingId = null;
    this.voiceEnabled = readJson(VOICE_KEY, false) === true;
    this.lastSnapshot = null;
    this.route = `${location.pathname}${location.search}`;
    this.observer = null;
    this.poll = null;
    this.pendingObservation = null;
    this.contextFadeTimer = null;
    this.attachment = null;
    this.files = [];
    this.currentRequest = null;
    this.requests = [];
    this.pasteHandler = null;
    this.pending = false;
    this.pendingLabel = '';
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
          <div class="worker-context-chat-intro"><strong>Resposta atual</strong><span>Peça um serviço de qualquer área; solicitações e arquivos ficam acompanháveis pelo número gerado.</span></div>
          <div class="worker-context-fade" data-worker-context-fade aria-live="polite" aria-atomic="true" hidden></div>
          <div class="worker-context-chat-log" data-worker-chat-log aria-live="polite" aria-busy="false"></div>
          <div class="worker-context-chat-quick" aria-label="Ações rápidas">
            <button type="button" data-worker-chat-action="cycle">Executar ciclo</button>
            <button type="button" data-worker-chat-action="tests">Rodar suíte</button>
            <button type="button" data-worker-chat-action="alerts">Abrir alertas</button>
            <button type="button" data-worker-chat-action="requirements">Revisar requisitos</button>
          </div>
          <form class="worker-context-chat-form" data-worker-chat-form>
            <div class="worker-context-chat-attachment" data-worker-chat-attachment aria-live="polite" hidden></div>
            <div class="worker-context-chat-input-shell">
              <textarea name="message" rows="2" maxlength="2000" placeholder="Descreva um fato, peça uma ação ou revise uma diretriz…" aria-label="Mensagem para o assistente dos workers"></textarea>
              <div class="worker-chat-attachment-rail" role="group" aria-label="Anexos da mensagem">
                <button type="button" data-worker-chat-file aria-label="Anexar arquivo" title="Anexar um arquivo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.5h7l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M14 3.5V8h4M9 12h6M9 15h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Anexo</span></button>
              </div>
              <input type="file" class="worker-context-chat-image-input" data-worker-chat-file-input accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.dwg,.dxf" aria-label="Selecionar anexo">
            </div>
            <span class="worker-chat-key-hint">Enter envia · Shift+Enter quebra linha</span>
            <div><small data-worker-chat-status role="status" aria-live="polite">Pronto para observar e organizar.</small><button type="submit" data-worker-chat-submit>Enviar</button></div>
          </form>
        </div>
      </aside>`);
    this.root = qs('[data-worker-context-assistant]');
    this.log = qs('[data-worker-chat-log]', this.root);
    this.input = qs('textarea', this.root);
    this.status = qs('[data-worker-chat-status]', this.root);
    this.render();
    this.bind();
    window.addEventListener('belavista:chat-record-saved', event => {
      if (!this.recordDialog?.open) return;
      const draft = this.recordDraft;
      const record = event.detail || {};
      this.recordDraft = null;
      const id = record.id || 'sem identificador';
      const items = Array.isArray(record.propagatedItems) ? record.propagatedItems : Array.isArray(record.properties) ? (record.properties.find(item => item?.key === 'items')?.value || []) : (draft?.ocr?.items || []);
      const allocations = items.map(item => {
        const itemName = item.description || item.materialName || item.materialId || 'item sem descrição';
        const stage = item.stageName || item.stageKey || 'etapa a confirmar';
        const activity = item.activityName || item.activityId || 'serviço a confirmar';
        const kind = item.itemKind || 'item';
        return `${itemName} → ${stage} · ${activity} · ${kind}`;
      });
      const allocationText = allocations.length ? ` Alocação registrada: ${allocations.join(' | ')}.` : ' Nenhuma alocação detalhada foi retornada; confira os itens no registro.';
      this.add('assistant', `Registro ${id} confirmado no sistema.${allocationText}`);
      this.status.textContent = `Registro ${id} salvo com retorno de alocação.`;
      this.recordDialog.close();
    });
    this.observe();
    this.announceRouteChange();
    this.refreshServiceRequests();
  }

  bind() {
    this.root.addEventListener('click', event => {
      if (event.target.closest('[data-chat-discard="record"]')) {
        this.recordDraft = null;
        this.status.textContent = 'Leitura descartada; o anexo original permanece disponível no histórico.';
        this.render();
        return;
      }
      if (!event.target.closest('[data-chat-apply="record"]') || !this.recordDraft) return;
      const store = globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.appStore || globalThis.__belavistaAppStore;
      if (!store) return;
      const { ocr, attachmentRef, requestId } = this.recordDraft;
      store.set({ view: 'control', controlEventDraft: { title: this.currentRequest?.title || 'Nota / comprovante',
        details: 'Registro preparado a partir do anexo do chat.', category: 'ocorrencia' }, recordContext: {
        ocr, attachmentRef, requestId, attachmentDataUrl: this.recordDraft.dataUrl, label: `Solicitação ${requestId || 'do chat'}`
      }, lastAction: 'Preparou OCR do chat para revisão do registro' });
      document.querySelector('view-layer')?.render();
      this.openRecordDrawer();
    });
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
    const cameraInput = qs('[data-worker-chat-camera-input]', this.root);
    const fileInput = qs('[data-worker-chat-file-input]', this.root);
    qs('[data-worker-chat-camera]', this.root)?.addEventListener('click', () => cameraInput?.click());
    qs('[data-worker-chat-file]', this.root)?.addEventListener('click', () => fileInput?.click());
    for(const input of [cameraInput,fileInput]) input?.addEventListener('change', event => {
      for (const file of [...(event.currentTarget.files || [])]) this.readImage(file, 'file');
      event.currentTarget.value = '';
    });
    this.pasteHandler = event => {
      const item = [...(event.clipboardData?.items || [])].find(entry => entry.kind === 'file' && /^image\/(?:png|jpeg|webp)$/i.test(entry.type));
      const file = item?.getAsFile?.();
      if (!file) return;
      event.preventDefault();
      this.readImage(file, 'clipboard');
    };
    this.root.addEventListener('paste', this.pasteHandler);
    qs('[data-worker-chat-form]', this.root)?.addEventListener('submit', event => {
      event.preventDefault();
      if (this.pending) return;
      const value = this.input.value.trim();
      if (!value && !this.files.length) return;
      const editing = this.editingId;
      const attachment = this.attachment;
      const files = [...this.files];
      this.input.value = '';
      this.editingId = null;
      this.attachment = null;
      this.files = [];
      this.renderAttachment();
      this.submit(value || 'Analise os arquivos anexados e descreva os fatos visíveis e seus impactos operacionais.', editing, attachment, files);
    });
    this.input?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        qs('[data-worker-chat-form]', this.root)?.requestSubmit();
      }
    });
    this.root.addEventListener('click', event => {
      if(event.target.closest('[data-service-refresh]')) this.refreshServiceRequest();
      const edit = event.target.closest('[data-worker-chat-edit]');
      if (edit) this.startEdit(edit.dataset.workerChatEdit);
      const speak = event.target.closest('[data-worker-chat-speak]');
      if (speak) this.speak(speak.dataset.workerChatSpeak);
      const action = event.target.closest('[data-worker-chat-action]');
      if (action) this.runAction(action.dataset.workerChatAction);
      const collapse = event.target.closest('[data-worker-chat-collapse]');
      if (collapse) {
        const message = collapse.closest('[data-message-id]');
        if (!message) return;
        const collapsed = message.classList.toggle('is-collapsed');
        collapse.setAttribute('aria-expanded', String(!collapsed));
        collapse.textContent = collapsed ? 'Expandir' : 'Recolher';
      }
    });
    this.root.addEventListener('change',event=>{
      if(!event.target.matches('[data-service-select]'))return;
      localStorage.setItem(SERVICE_KEY,event.target.value);
      this.refreshServiceRequest();
    });
  }

  render() {
    if (!this.log) return;
    const item = this.messages.at(-1);
    const request = this.currentRequest;
    this.log.innerHTML = `${this.pending ? `<article class="worker-chat-pending" role="status"><span class="worker-chat-spinner" aria-hidden="true"></span><span><strong>${esc(this.pendingLabel || 'Preparando resposta…')}</strong><small>Você pode continuar nesta página enquanto preparo o resultado.</small></span></article>` : item ? `<article class="worker-context-chat-message worker-chat-message is-assistant"><div class="worker-chat-message-meta"><span>Resposta do assistente · ${new Date(item.at || Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><button type="button" data-worker-chat-speak="${esc(item.text)}" aria-label="Ouvir resposta">Ouvir</button></div><p>${esc(item.text)}</p></article>` : '<p class="worker-chat-empty">Descreva o serviço necessário ou faça uma pergunta.</p>'}${request ? `<section class="worker-chat-service" aria-label="Acompanhamento da solicitação"><div><b>Solicitação ${esc(request.id)}</b><span>${esc(serviceStatusLabel(request.status))}</span></div><p>${esc(request.title)}</p><small>${esc(request.domain)}${request.stageKey ? ` · etapa ${esc(request.stageKey)}` : ''}${request.activityId ? ` · atividade ${esc(request.activityId)}` : ''}</small><ul>${(request.files||[]).map(file=>`<li><a href="${esc(file.fileUrl)}" target="_blank" rel="noopener">${esc(file.fileName)}</a></li>`).join('') || '<li>Sem arquivo vinculado</li>'}</ul><button type="button" data-service-refresh>Atualizar acompanhamento</button></section>` : ''}`;
    if(request&&this.requests.length>1)this.log.querySelector('.worker-chat-service')?.insertAdjacentHTML('afterbegin',`<label class="worker-chat-service-select">Meus pedidos<select data-service-select aria-label="Selecionar solicitação">${this.requests.map(entry=>`<option value="${esc(entry.id)}" ${entry.id===request.id?'selected':''}>${esc(entry.id)} · ${esc(entry.title.slice(0,30))}</option>`).join('')}</select></label>`);
    this.log.scrollTop = this.log.scrollHeight;
    if (!this.pending && this.recordDraft) this.log.insertAdjacentHTML('beforeend', this.recordVerificationMarkup());
  }

  recordVerificationMarkup() {
    const ocr = this.recordDraft?.ocr || {};
    const properties = Array.isArray(ocr.properties) ? ocr.properties : [];
    const items = Array.isArray(ocr.items) ? ocr.items : [];
    const extractedText = ocr.text || ocr.rawText || ocr.extractedText || '';
    const rows = properties.slice(0, 8).map(property => {
      const value = Array.isArray(property.value)
        ? property.value.map(item => item.description || item.name || JSON.stringify(item)).join(', ')
        : property.value;
      return `<div class="worker-chat-record-check-row"><dt>${esc(property.label || property.key || 'Campo')}</dt><dd>${esc(value == null || value === '' ? '—' : String(value))}</dd></div>`;
    }).join('');
    const allocations = items.map((item, index) => `<article class="worker-chat-allocation" data-record-allocation-index="${index}"><div><b>${esc(item.description || item.materialName || 'Item sem descrição')}</b><span>${esc(item.itemKind || 'outro')} · ${esc(item.quantity || 0)} ${esc(item.unit || '')}</span></div><dl><dt>Etapa</dt><dd>${esc(item.stageName || item.stageKey || 'A confirmar')}</dd><dt>Serviço / atividade</dt><dd>${esc(item.activityName || item.activityId || 'A confirmar')}</dd><dt>Material</dt><dd>${esc(item.materialName || item.materialId || (item.itemKind === 'servico' ? 'Não aplicável' : 'A confirmar'))}</dd></dl></article>`).join('');
    return `<section class="worker-chat-record-verification" data-record-verification aria-label="Verificação da nota extraída"><header><div><span>ETAPA 1 · VERIFICAÇÃO</span><h3>Confira a nota antes do registro</h3></div><strong>${esc(ocr.reviewRequired === false ? 'Leitura consistente' : 'Revisão humana')}</strong></header>${extractedText ? `<p class="worker-chat-record-extracted"><b>Texto identificado</b><span>${esc(extractedText)}</span></p>` : ''}${rows ? `<dl>${rows}</dl>` : '<p class="worker-chat-record-empty">O worker não retornou campos estruturados. Revise o anexo na etapa seguinte.</p>'}${allocations ? `<section class="worker-chat-allocation-section"><header><b>Alocação sugerida</b><span>Etapa · serviço · material</span></header>${allocations}<small>As alocações são sugestões da leitura e precisam ser confirmadas no registro.</small></section>` : ''}<footer><button type="button" data-chat-discard="record">Descartar leitura</button><button type="button" data-chat-apply="record" data-request-id="${esc(this.recordDraft.requestId || '')}">Confirmar leitura e abrir registro</button></footer></section>`;
  }

  openRecordDrawer() {
    const drawer = document.querySelector('.control-record-drawer-v2');
    if (!drawer) { this.status.textContent = 'Abra a Central operacional para revisar o registro.'; return; }
    this.recordDialog?.remove();
    const dialog = document.createElement('dialog');
    dialog.className = 'worker-chat-record-dialog';
    dialog.setAttribute('aria-label', 'Finalizar registro do anexo');
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Voltar ao chat';
    close.addEventListener('click', () => dialog.close());
    dialog.append(close, drawer);
    document.body.append(dialog);
    this.recordDialog = dialog;
    dialog.addEventListener('close', () => {
      document.querySelector('.control-center-workspace-v2')?.append(drawer);
      dialog.remove();
    }, { once: true });
    dialog.showModal();
    const input = drawer.querySelector('input[name="evidence"]');
    const draft = this.recordDraft;
    if (input && draft?.dataUrl) {
      const binary = atob(draft.dataUrl.split(',')[1]);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], draft.attachmentRef?.name || 'anexo.png', {
        type: draft.dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/png'
      }));
      input.files = transfer.files;
      input.dataset.chatOcrPrepared = 'true';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      queueMicrotask(() => { delete input.dataset.chatOcrPrepared; });
    }
  }

  save() {
    this.messages = this.messages.filter(item => item.kind === 'assistant').slice(-1);
    localStorage.setItem(THREAD_KEY, JSON.stringify(this.messages));
  }

  add(kind, text, options = {}) {
    if(kind === 'user') return null;
    const value = String(text || '').trim().slice(0, 2000);
    if (!value) return null;
    const item = {
      id: `worker-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind, text: value, at: now(), auto: Boolean(options.auto),
      audit: options.audit || '',
      attachment: options.attachment ? { name: String(options.attachment.name || 'imagem'), mimeType: String(options.attachment.mimeType || 'image/png') } : null
    };
    this.messages = [item];
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

  async submit(text, editingId = null, attachment = null, files = [], options = {}) {
    if(this.pending)return;
    const directOperational = options?.mode === 'priority';
    this.setPending(true, directOperational ? 'Executando prioridade operacional…' : (this.isServiceRequest(text) ? 'Registrando solicitação e arquivos…' : 'Consultando o assistente…'));
    try { await this.performSubmit(text, editingId, attachment, files, options); }
    catch(error) { this.input.value=text; this.files=files; this.attachment=attachment; this.renderAttachment(); this.add('assistant', `Não foi possível concluir: ${error.message}`); this.status.textContent='Falha no envio. Texto e anexos preservados para tentar novamente.'; }
    finally { this.setPending(false); }
  }

  setPending(value,label='') {
    this.pending=value;
    this.pendingLabel=label;
    this.root?.classList.toggle('is-pending',value);
    if(this.log)this.log.setAttribute('aria-busy',String(value));
    const button=qs('[data-worker-chat-submit]',this.root);
    if(button){button.disabled=value;button.innerHTML=value?'<span class="worker-chat-spinner" aria-hidden="true"></span><span>Enviando</span>':'Enviar';}
    if(value)this.status.textContent=label;
    this.render();
  }

  async performSubmit(text, editingId = null, attachment = null, files = [], options = {}) {
    this.recordDraft = null;
    const directOperational = options?.mode === 'priority';
    const lotCommand = !attachment && !files.length ? parseLotStatusCommand(text) : null;
    if (lotCommand) {
      const store = globalThis.__belavistaAppStore;
      const answer = lotCommand.error ? lotCommand.error : !location.pathname.startsWith('/admin') || !store
        ? 'A alteração de status está disponível apenas no painel administrativo.'
        : applyLotStatusCommand(store, lotCommand);
      this.add('assistant', answer, { audit: lotCommand.error ? 'Comando de lote não executado' : 'Controle do lote' });
      this.status.textContent = lotCommand.error ? 'Nenhuma alteração foi feita.' : answer;
      return;
    }
    if(!directOperational&&/(estado|status|andamento)/i.test(text)&&/(solicita[cç][aã]o|pedido|servi[cç]o)/i.test(text)&&localStorage.getItem(SERVICE_KEY)){
      await this.refreshServiceRequest();
      const request=this.currentRequest;
      this.add('assistant',request?`Solicitação ${request.id}: ${serviceStatusLabel(request.status)}. ${request.files.length} arquivo(s) vinculado(s).`:'Não foi possível consultar a solicitação agora.');
      this.status.textContent='Acompanhamento consultado.';
      return;
    }
    if(!directOperational&&this.isServiceRequest(text)){
      try{
        const request=await this.createServiceRequest(text,files);
        const answer=`Solicitação ${request.id} recebida em triagem para ${request.domain}. ${request.files.length} arquivo(s) vinculado(s). Acompanhe o estado abaixo; nenhuma alteração operacional foi executada automaticamente.`;
        this.add('assistant',answer);
        this.status.textContent='Solicitação registrada e aguardando triagem.';
        if (attachment && /\b(nota|comprovante|registro|ocr)\b/i.test(text)) {
          const reply = await this.ask(text, attachment, { ...options, requestContext: { requestId: request.id } });
          if (reply.recordOcr && !reply.recordOcr.error) {
            this.recordDraft = { ocr: reply.recordOcr, attachmentRef: reply.attachment, requestId: request.id, dataUrl: attachment.dataUrl };
            this.add('assistant', `Solicitação ${request.id} · ${reply.text}`);
            this.status.textContent = 'Leitura concluída. Revise os campos antes de confirmar o registro.';
          } else {
            this.add('assistant', `Solicitação ${request.id} registrada. ${reply.text}`);
            this.status.textContent = 'Solicitação preservada; leitura OCR indisponível.';
          }
        }
        if(this.voiceEnabled)this.speak(answer);
      }catch(error){this.input.value=text;this.files=files;this.attachment=attachment;this.renderAttachment();this.add('assistant',`Não foi possível registrar a solicitação: ${error.message}`);this.status.textContent='Solicitação não registrada; texto e anexos preservados.';}
      return;
    }
    const reply = await this.ask(text, attachment, options);
    if (reply.recordOcr && !reply.recordOcr.error) this.recordDraft = {
      ocr: reply.recordOcr, attachmentRef: reply.attachment, requestId: null, dataUrl: attachment?.dataUrl
    };
    if(reply.source==='error'){this.input.value=text;this.files=files;this.attachment=attachment;this.renderAttachment();}
    const localCalls = this.localUiIntent(text);
    const actionRequested = directOperational || /(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar|registre|registrar|filtre|filtrar|destaque|destacar|aproxime|aproximar|afaste|afastar|gire|girar|imprima|imprimir|execute|executar|fa[cç]a|fazer)/i.test(text);
    const calls = !actionRequested ? [] : (directOperational && reply.toolCalls?.length ? reply.toolCalls : localCalls.length ? localCalls.map(call => {
      const proposed = reply.toolCalls?.find(item => item?.name === call.name);
      return call.name === 'records.open_form' && proposed ? { ...call, arguments: { ...call.arguments, ...(proposed.arguments || {}) } } : call;
    }) : (Array.isArray(reply.toolCalls) ? reply.toolCalls : []));
    const results = await this.executeToolCalls(calls);
    const actionText = results.length ? results.join(' ') : '';
    const answer = [reply.text, actionText].filter(Boolean).join('\n\n');
    this.add('assistant', answer, { audit: `${reply.audit}${actionText ? ` · ${actionText}` : ''}` });
    this.status.textContent = actionText || (reply.source === 'endpoint' ? 'Resposta recebida; nenhuma ação na interface.' : 'Endpoint indisponível; nenhuma ação executada.');
    if (this.voiceEnabled) this.speak(answer);
  }

  isServiceRequest(text) {
    const value=String(text||'').trim();
    if(/^(qual|quais|como|quando|onde|por que|o que|me explique|explique)\b/i.test(value))return false;
    return /\b(solicito|solicitar|preciso que|fa[cç]a|fazer|crie|criar|prepare|preparar|atualize|atualizar|alterar|corrija|corrigir|revisar|agendar|comprar|registrar|gerar|elabore|executar)\b/i.test(value);
  }

  async createServiceRequest(text,files=[]) {
    const state=globalThis.__belavistaAppStore?.get?.()||{};
    const lower=String(text).toLocaleLowerCase('pt-BR');
    const domain=[['obra',/obra|etapa|atividade|cronograma|drenagem|pavimenta/],['suprimentos',/material|compra|fornecedor|estoque/],['documentos',/documento|pdf|dwg|licen[cç]a|projeto/],['comercial',/lead|cliente|reserva|contrato|comiss[aã]o|corretor/],['financeiro',/caixa|pagamento|lan[cç]amento|despesa|financeir/],['relatorios',/relat[oó]rio|indicador|balan[cç]o/]].find(([,pattern])=>pattern.test(lower))?.[0]||String(state.view||'geral');
    const response=await fetch('/api/service-requests',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({title:String(text).trim().slice(0,140),description:String(text).trim(),domain,stageKey:String(state.selectedStage?.key||state.selectedStage||new URLSearchParams(location.search).get('stage')||''),activityId:String(state.selectedActivity?.id||new URLSearchParams(location.search).get('activity')||''),files:files.map(file=>({fileName:file.name,dataUrl:file.dataUrl}))})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.request)throw new Error(payload.error||`HTTP ${response.status}`);
    this.currentRequest=payload.request;
    localStorage.setItem(SERVICE_KEY,payload.request.id);
    await this.refreshServiceRequests();
    this.currentRequest = payload.request;
    this.requests = [payload.request, ...this.requests.filter(item => item.id !== payload.request.id)];
    localStorage.setItem(SERVICE_KEY, payload.request.id);
    this.render();
    return payload.request;
  }

  async refreshServiceRequest(){
    const id=localStorage.getItem(SERVICE_KEY);
    if(!id)return;
    try{const response=await fetch(`/api/service-requests/${encodeURIComponent(id)}`,{cache:'no-store'});if(!response.ok)return;const payload=await response.json();this.currentRequest=payload.request||null;this.render();}
    catch{this.status.textContent='Acompanhamento temporariamente indisponível.';}
  }

  async refreshServiceRequests(){
    try{
      const response=await fetch('/api/service-requests',{cache:'no-store'});
      if(!response.ok)return;
      const payload=await response.json();
      this.requests=Array.isArray(payload.requests)?payload.requests:[];
      const id=localStorage.getItem(SERVICE_KEY);
      this.currentRequest=this.requests.find(item=>item.id===id)||this.requests[0]||null;
      if(this.currentRequest)localStorage.setItem(SERVICE_KEY,this.currentRequest.id);
      this.render();
    }catch{}
  }

  localUiIntent(message) {
    const text = String(message || '').toLocaleLowerCase('pt-BR');
    if (!/\b(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar|destaque|destacar|aproxime|aproximar|afaste|afastar|gire|girar)\b/.test(text)) return [];
    if (/\b(mapa|vista 3d)\b/.test(text)) {
      const overlay = [['terraplanagem',/terraplanagem/],['drenagem',/drenagem/],['rede-agua',/rede de [aá]gua/],['rede-eletrica',/rede el[eé]trica/],['pavimentacao',/pavimenta[cç][aã]o|asfalto/],['urbanizacao',/pra[cç]a|urbaniza[cç][aã]o/]].find(([,pattern])=>pattern.test(text))?.[0];
      if (overlay && /destac|mostr|real[cç]ar/.test(text)) return [{ name: 'map.set_overlay', arguments: { category: overlay } }];
      if (/aproxim/.test(text)) return [{ name: 'map.adjust_view', arguments: { zoomDelta: .22 } }];
      if (/afast/.test(text)) return [{ name: 'map.adjust_view', arguments: { zoomDelta: -.22 } }];
      if (/gir/.test(text)) return [{ name: 'map.adjust_view', arguments: { rotationDelta: /esquerd/.test(text) ? -20 : 20 } }];
    }
    if (/\b(evento|ocorr[eê]ncia|registro geral)\b/.test(text) && /\b(novo|nova|criar|adicionar|registrar)\b/.test(text)) return [{ name: 'records.open_form', arguments: {} }];
    const destinations = [
      ['documents', /documento/], ['materials', /materia(is|l)/], ['contracts', /contrato/],
      ['brokers-board', /corretor/], ['brokers', /comiss[aã]o|negocia[cç][aã]o/],
      ['reports', /relat[oó]rio/], ['finance', /finan[cç]|caixa|dre/],
      ['personnel', /encarregado|pessoal|equipe/], ['leads', /lead|cliente/],
      ['map', /mapa/], ['settings', /configura[cç]/], ['control', /central operacional/],
      ['agenda', /agenda|compromisso/], ['actions', /a[cç][oõ]es ia|a[cç][aã]o ia/],
      ['activities', /atividade/], ['progress', /andamento|apontamento/],
      ['records', /registro/], ['stages', /etapa|cronograma/]
    ];
    const target = destinations.find(([, pattern]) => pattern.test(text))?.[0];
    if (!target) return [];
    const create = /\b(novo|nova|criar|adicionar)\b/.test(text);
    if (target === 'reports' && !create) {
      const family = /financeir|dre|caixa/.test(text) ? 'Financeiro' : /constru[cç]|obra/.test(text) ? 'Construção' : /suprimento|material|compra/.test(text) ? 'Suprimentos' : /comercial|venda|lead/.test(text) ? 'Comercial' : /governan[cç]/.test(text) ? 'Governança' : null;
      if (family) return [{ name: 'reports.select', arguments: { family } }];
    }
    return [{ name: create ? 'ui.open_form' : 'ui.navigate', arguments: { view: target } }];
  }

  async executeToolCalls(calls) {
    if (!location.pathname.startsWith('/admin')) return calls.length ? ['Ação disponível apenas no painel administrativo.'] : [];
    const store = globalThis.__belavistaAppStore;
    const allowed = new Set(['map','control','materials','documents','stages','agenda','actions','activities','records','progress','personnel','leads','contracts','brokers','brokers-board','finance','reports','settings']);
    const forms = { materials: '[data-material-new]', documents: '[data-document-new]', agenda: '[data-agenda-new-v3]', activities: '[data-activity-new]', progress: '[data-progress-new]', contracts: '[data-contract-new]', brokers: '[data-commission-new]', reports: '[data-report-builder-open]' };
    const results = [];
    for (const call of calls.slice(0, 4)) {
      const args = call?.arguments || call?.args || {};
      const view = String(args.view || '');
      if (call?.name === 'records.open_form') {
        if (!store) { results.push('Ficha não abriu: estado da aplicação indisponível.'); continue; }
        document.querySelector('.sidebar [data-view="control"]')?.click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        store.set({ view: 'control', controlEventTab: 'event', controlEventDraft: {
          title: String(args.activity || '').slice(0, 120), responsible: String(args.responsible || '').slice(0, 120),
          details: String(args.details || '').slice(0, 4000),
          category: ['ocorrencia','vistoria','reuniao','comunicacao','decisao','outro'].includes(args.category) ? args.category : 'ocorrencia'
        }, lastAction: 'Chat preparou evento para revisão' });
        results.push(store.get().view === 'control' ? 'Ficha de evento aberta para revisão; nenhum dado foi gravado.' : 'Ficha de evento não abriu.');
        continue;
      }
      if (call?.name === 'agenda.create_pending') {
        if (!store) { results.push('Apontamento não criado: estado da aplicação indisponível.'); continue; }
        const state = store.get() || {};
        const today = new Date();
        const iso = value => {
          const date = value ? new Date(`${value}T12:00:00`) : null;
          if (date && Number.isFinite(date.getTime())) return value;
          return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        };
        const date = iso(String(args.date || '').trim());
        let persisted = { version: 3, initialized: true, events: [] };
        try {
          const parsed = JSON.parse(localStorage.getItem('belavista.agenda-calendar.v3') || 'null');
          if (parsed && Array.isArray(parsed.events)) persisted = { version: 3, initialized: true, events: parsed.events };
        } catch {}
        const sameDay = persisted.events.filter(item => String(item?.date || '') === date);
        const toMinutes = value => { const match = String(value || '').match(/^(\d{2}):(\d{2})$/); return match ? Number(match[1])*60 + Number(match[2]) : 0; };
        const requestedStart = String(args.start || '').trim();
        const latest = sameDay.reduce((max,item) => Math.max(max, toMinutes(item.start) + Math.round((Number(item.durationHours)||1)*60)), 8*60);
        const slotMinutes = /^\d{2}:\d{2}$/.test(requestedStart) ? toMinutes(requestedStart) : Math.min(18*60, Math.max(8*60, Math.ceil(latest/30)*30));
        const start = `${String(Math.floor(slotMinutes/60)).padStart(2,'0')}:${String(slotMinutes%60).padStart(2,'0')}`;
        const stageKey = String(args.stageKey || state.selectedStageV9 || state.selectedStage?.key || state.selectedStage || '').trim();
        const stageName = String(args.stageName || args.relation || '').trim();
        const title = String(args.title || args.activityName || 'Apontamento pendente da IA').trim().slice(0,160);
        const id = `agenda-worker-ai-${Date.now().toString(36)}`;
        const event = { id, title, stageKey, stageName, activityId:String(args.activityId||'').trim(), activityName:String(args.activityName||title).trim().slice(0,160), owner:String(args.owner||'').trim().slice(0,120), date, start, durationHours:Math.max(.5,Math.min(24,Number(args.durationHours)||1.5)), spanDays:Math.max(1,Math.min(7,Number(args.spanDays)||1)), status:'Pendente', aiPending:true, notes:String(args.notes||'').trim().slice(0,1200), detailsNeeded:String(args.detailsNeeded||'').trim().slice(0,800), evidenceRequired:Boolean(args.evidenceRequired) };
        try { localStorage.setItem('belavista.agenda-calendar.v3', JSON.stringify({ version:3, initialized:true, events:[...persisted.events,event] })); } catch {}
        const agendaItem = { ...event, name:title, activity:event.activityName, responsible:event.owner, time:start, plannedStart:`${date}T${start}:00` };
        store.set({ view:'agenda', ...(stageKey ? { selectedStageV9:stageKey, selectedStage:stageKey } : {}), selectedAgendaEventV3:id, operationalAgenda:[...(state.operationalAgenda||[]).filter(item=>String(item?.id||'')!==id),agendaItem], agendaCalendarRevisionV3:Date.now(), agendaCalendarRevisionV7:Date.now(), lastAction:`Assistente dos workers criou apontamento pendente ${title}` });
        results.push(`Apontamento pendente criado no cronograma${stageName ? ` de ${stageName}` : ''}; complete os detalhes solicitados.`);
        continue;
      }
      if (call?.name === 'documents.open_form') {
        if (!store) { results.push('Documentos não abriram: estado da aplicação indisponível.'); continue; }
        store.set({ view:'documents', documentsEditId:'new', lastAction:`Assistente dos workers solicitou documento${args.reason ? `: ${String(args.reason).slice(0,120)}` : ''}` });
        results.push('Inclusão de documento aberta para anexar a evidência solicitada.');
        continue;
      }
      if ((call?.name === 'ui.navigate' || call?.name === 'ui.open_form') && allowed.has(view)) {
        if (!store || !document.querySelector(`.sidebar [data-view="${view}"], aside [data-view="${view}"]`)) {
          results.push(`${view}: acesso ou navegação indisponível.`); continue;
        }
        document.querySelector(`.sidebar [data-view="${view}"], aside [data-view="${view}"]`).click();
        if (!await waitForUi(() => document.querySelector(`.sidebar [data-view="${view}"].active, aside [data-view="${view}"].active`))) { results.push(`${view}: página não abriu.`); continue; }
        if (call.name === 'ui.open_form') {
          await waitForUi(() => forms[view] && document.querySelector(forms[view]));
          const button = forms[view] && document.querySelector(forms[view]);
          if (!button) { results.push(`${view}: formulário não encontrado nesta página.`); continue; }
          button.click();
          results.push(`${view}: formulário aberto para revisão; nada foi salvo.`);
        } else results.push(`${view}: página aberta.`);
        continue;
      }
      if (call?.name === 'reports.select' && store) {
        const family = ['Financeiro','Construção','Suprimentos','Comercial','Governança'].includes(args.family) ? args.family : 'Financeiro';
        const familyButton = document.querySelector(`.sidebar [data-view="reports"][data-report-family="${family}"]`);
        familyButton?.click();
        await waitForUi(() => familyButton?.classList.contains('active'));
        store.set({ view: 'reports', reportFamily: family, ...(args.reportType ? { reportType: String(args.reportType).slice(0, 80) } : {}), lastAction: `Chat abriu relatórios de ${family}` });
        results.push(document.querySelector(`.sidebar [data-view="reports"][data-report-family="${family}"].active`) ? `Relatórios de ${family} abertos.` : `Relatórios de ${family} não abriram.`); continue;
      }
      if (call?.name === 'commissions.filter' && store) {
        document.querySelector('.sidebar [data-view="brokers"]')?.click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        store.set({ view: 'brokers', commissionFilters: { query: String(args.query || '').slice(0, 120), status: String(args.status || 'all'), profile: String(args.profile || 'all') }, lastAction: 'Chat filtrou negociações' });
        results.push('Filtro comercial aplicado.'); continue;
      }
      if (call?.name === 'map.set_overlay') {
        const map = document.querySelector('map-scene');
        const category = String(args.category || '');
        if (!map?.setStageOverlay || !['terraplanagem','drenagem','rede-agua','rede-eletrica','pavimentacao','urbanizacao','clear'].includes(category)) { results.push('Destaque do mapa indisponível.'); continue; }
        if (category === 'clear') map.clearStageOverlay?.(false);
        else map.setStageOverlay?.(category, false);
        results.push(category === 'clear' ? 'Destaque do mapa removido.' : `Mapa: ${category} destacada.`); continue;
      }
      if (call?.name === 'map.adjust_view') {
        const map = document.querySelector('map-scene');
        if (!map?.setSceneZoom) { results.push('Controle de vista do mapa indisponível.'); continue; }
        if (args.fit) map.fitSceneView?.(true);
        else {
          if (Number.isFinite(Number(args.zoomDelta))) map.setSceneZoom(map.sceneManualZoom + Math.max(-1, Math.min(1, Number(args.zoomDelta))), true);
          if (Number.isFinite(Number(args.tiltDelta))) map.setSceneTiltAdjust?.(map.sceneTiltAdjust + Math.max(-24, Math.min(24, Number(args.tiltDelta))), true);
          if (Number.isFinite(Number(args.rotationDelta))) map.setSceneRotation?.(map.sceneManualRotation + Math.max(-90, Math.min(90, Number(args.rotationDelta))), true);
        }
        results.push('Vista do mapa ajustada.'); continue;
      }
      if (call?.name === 'map.set_tiles') {
        const map = document.querySelector('map-scene');
        if (!map?.setMapTileMode || !['satellite','osm'].includes(args.mode)) { results.push('Base cartográfica indisponível.'); continue; }
        map.setMapTileMode(args.mode, true);
        results.push(`Base ${args.mode === 'osm' ? 'OSM' : 'satélite'} selecionada.`); continue;
      }
      if (call?.name === 'ui.print') { results.push('Impressão não iniciada: use o comando de impressão da página para confirmar.'); continue; }
      if (call?.name) results.push(`${call.name}: ação ainda não disponível neste chat.`);
    }
    return results;
  }

  readImage(file, source = 'file') {
    if (!file) return;
    const extension=String(file.name||'').toLowerCase().split('.').pop();
    const mimeType = String(file.type || (extension==='dwg'||extension==='dxf'?'application/octet-stream':'')).toLowerCase();
    if (!['image/png','image/jpeg','image/webp','application/pdf','application/octet-stream','application/acad','image/vnd.dwg','application/dxf'].includes(mimeType) || (mimeType==='application/octet-stream'&&!['dwg','dxf'].includes(extension))) {
      this.status.textContent = 'Use imagem, PDF, DWG ou DXF.';
      return;
    }
    if (Number(file.size) > 6 * 1024 * 1024) {
      this.status.textContent = 'Use um arquivo de no máximo 6 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '').replace(/^data:[^;]*/,`data:${mimeType}`);
      if (!/^data:[\w.+/-]+;base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)) {
        this.status.textContent = 'Não foi possível preparar o arquivo.';
        return;
      }
      const prepared={name:String(file.name||`arquivo-${source}`),mimeType,dataUrl,source};
      this.files = [prepared];
      this.attachment = /^image\//.test(mimeType) ? prepared : null;
      this.renderAttachment();
      // O anexo fica visível para que a mensagem possa ser contextualizada;
      // ele é enviado automaticamente junto com o próximo envio do formulário.
      // Disparar o submit aqui faria a seleção limpar o anexo antes de o usuário
      // terminar a instrução (e quebraria o fluxo de inferência de nota).
      this.status.textContent = 'Anexo preparado; escreva a instrução e envie para o worker.';
    };
    reader.onerror = () => { this.status.textContent = 'Não foi possível ler o arquivo.'; };
    reader.readAsDataURL(file);
  }

  renderAttachment() {
    const slot = qs('[data-worker-chat-attachment]', this.root);
    if (!slot) return;
    slot.hidden = !this.files.length;
    slot.innerHTML = this.files.map((file,index)=>`<span><b>${esc(file.name)}</b><small>${esc(file.mimeType)}</small></span><button type="button" data-worker-chat-attachment-remove="${index}" aria-label="Remover ${esc(file.name)}">×</button>`).join('');
    slot.querySelectorAll('[data-worker-chat-attachment-remove]').forEach(button=>button.addEventListener('click', () => {
      this.files.splice(Number(button.dataset.workerChatAttachmentRemove),1);
      this.attachment=this.files.find(file=>/^image\//.test(file.mimeType))||null;
      const input = qs('[data-worker-chat-camera-input]', this.root);
      if (input) input.value = '';
      this.renderAttachment();
      this.status.textContent = 'Arquivo removido.';
    }));
  }

  async ask(message, attachment = null, options = {}) {
    const context = currentContext();
    try {
      const endpoint = attachment ? '/api/ai/vision-reasoning' : '/api/ai';
      const response = await fetch(endpoint, {
        method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message, view: location.pathname.startsWith('/admin') ? (globalThis.__belavistaAppStore?.get()?.view || 'control') : 'workers',
          instruction: String(options?.instruction || WORKER_OPERATIONAL_EXECUTION_INSTRUCTION_V2),
          requestContext: options?.requestContext && typeof options.requestContext === 'object' ? options.requestContext : null,
          context: {
            ...context,
            summary: contextSummary(context),
            capabilities: ['observar eventos', 'editar entradas', 'organizar agenda', 'programar cronograma', 'recalcular materiais e equipe', 'preparar notificações locais', 'criar apontamento pendente', 'solicitar documento operacional']
          },
          attachment: attachment ? { name: attachment.name, mimeType: attachment.mimeType, dataUrl: attachment.dataUrl } : null
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return {
        text: String(payload.text || '').trim() || 'O endpoint de IA retornou uma resposta vazia.',
        toolCalls: Array.isArray(payload.toolCalls) ? payload.toolCalls : [],
        recordOcr: payload.recordOcr || null,
        attachment: payload.attachment || null,
        source: 'endpoint',
        audit: `Endpoint consultado${payload.vision ? ` · NVIDIA ${payload.model || 'multimodal reasoning'}` : ''} · ${contextSummary(context)}`
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
        if (!monitor) return;
        const next = `Observando ${labelForPath(location.pathname)} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        // O monitor está dentro do body observado. Reescrever o mesmo texto
        // a cada callback criava MutationObserver → textContent → observer,
        // mantendo a aba ocupada mesmo sem interação ou renderização 3D.
        if (monitor.textContent !== next) monitor.textContent = next;
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}

const assistant = new WorkerContextChat();
assistant.mount();
globalThis.belavistaWorkerAssistant = assistant;
