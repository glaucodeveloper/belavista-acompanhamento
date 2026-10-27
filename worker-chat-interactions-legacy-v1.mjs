/** Recovery UI behavior for cached component bundles without typed chat owners. */
export function applyWorkerChatCollapsedStateLegacyV1(root, collapsed, native, documentRef = globalThis.document) {
  if (!root || !documentRef) return false;
  root.classList.toggle('is-collapsed', collapsed);
  root.dataset.collapsed = String(collapsed);
  const mobileTab = documentRef.querySelector('[data-mobile-chat-tab]');
  if (mobileTab) {
    mobileTab.setAttribute('aria-expanded', String(!collapsed));
    mobileTab.classList.toggle('active', !collapsed);
  }
  if (native) {
    const app = documentRef.querySelector('#app.app');
    if (collapsed) {
      if (app) delete app.dataset.mobileTab;
      documentRef.body.classList.remove('mobile-chat-tab-active');
    } else {
      if (app) app.dataset.mobileTab = 'chat';
      documentRef.body.classList.add('mobile-chat-tab-active');
    }
  }
  const minimize = root.querySelector('[data-worker-chat-minimize]');
  if (minimize) {
    minimize.textContent = collapsed ? '+' : '−';
    minimize.setAttribute('aria-label', collapsed ? 'Restaurar assistente' : 'Minimizar assistente');
  }
  return true;
}

export function applyWorkerChatTabLegacyV1(root, input, tab) {
  if (!root) return false;
  const selected = tab === 'register' ? 'register' : 'conversation';
  root.dataset.chatTab = selected;
  root.querySelectorAll('[data-worker-chat-tab]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.workerChatTab === selected));
  });
  const panel = root.querySelector('[data-worker-chat-register-panel]');
  if (panel) panel.hidden = selected !== 'register';
  if (input) input.placeholder = selected === 'register'
    ? 'Descreva a foto ou o registro…'
    : 'Descreva um fato, peça uma ação ou revise uma diretriz…';
  return true;
}

export function applyWorkerChatPendingStateLegacyV1(root, log, button, status, pending, label = '') {
  root?.classList.toggle('is-pending', pending);
  log?.setAttribute('aria-busy', String(pending));
  if (button) {
    button.disabled = pending;
    button.innerHTML = pending
      ? '<span class="worker-chat-spinner" aria-hidden="true"></span><span>Enviando</span>'
      : 'Enviar';
  }
  if (pending && status) status.textContent = label;
  return Boolean(root || log || button || status);
}

export function runWorkerChatQuickActionLegacyV1(root, action, documentRef = globalThis.document) {
  if (!root || !documentRef) return false;
  const messages = {
    cycle: 'Execute o ciclo operacional e explique como caixa, materiais, pessoal e dependências organizam a agenda.',
    tests: 'Execute a suíte de testes e mostre entradas, saídas, notificações e propagações.',
    alerts: 'Abra as notificações e explique o último alerta do worker.',
    requirements: 'Revise os requisitos e as condições de liberação desta etapa.',
  };
  if (action === 'cycle') documentRef.querySelector('[data-run-cycle]')?.click();
  if (action === 'tests') (documentRef.querySelector('[data-run-suite]') || documentRef.querySelector('[data-run-development-cycle]'))?.click();
  if (action === 'alerts') documentRef.querySelector('[data-notification-toggle]')?.click() || documentRef.querySelector('[data-open-communications="notifications"]')?.click();
  if (action === 'requirements') {
    documentRef.querySelector('[data-requirements-catalog]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    documentRef.querySelector('[data-requirements-search]')?.focus();
  }
  const input = root.querySelector('[data-worker-chat-form] textarea[name="message"]');
  const form = root.querySelector('[data-worker-chat-form]');
  if (input) input.value = messages[action] || '';
  form?.requestSubmit();
  return true;
}

/** Recovery view for cached component bundles without the typed message-edit owner. */
export function applyWorkerChatEditLegacyV1(root, presentation) {
  if (!root || !presentation) return false;
  const input = root.querySelector('textarea[name="message"]');
  if (!input) return false;
  input.value = String(presentation.text || '');
  input.focus();
  const submit = root.querySelector('[data-worker-chat-submit]');
  if (submit) submit.textContent = String(presentation.submitLabel || 'Atualizar');
  const status = root.querySelector('[data-worker-chat-status]');
  if (status) status.textContent = String(presentation.status || 'Editando entrada; envie para reavaliar a diretriz.');
  return true;
}

/** Recovery command for cached program bundles without the typed edit projection. */
export function projectWorkerChatEditCommandLegacyV1(messages, messageId) {
  const id = String(messageId || '');
  const message = (Array.isArray(messages) ? messages : []).find(item => item?.id === id && item?.kind === 'user');
  if (!message) return null;
  return {
    editingId: id,
    text: String(message.text || ''),
    submitLabel: 'Atualizar',
    status: 'Editando entrada; envie para reavaliar a diretriz.',
  };
}

/** Install the old delegated chat controls only when a cached TS bundle lacks its installer. */
export function installWorkerChatInteractionEventsLegacyV1(root, ports = {}) {
  if (!root) return false;
  root.addEventListener('click', event => {
    const target = event.target?.closest ? event.target : event.target?.parentElement;
    if (!target) return;
    if (target.closest('[data-chat-discard="record"]')) {
      ports.discardRecord?.();
      return;
    }
    if (target.closest('[data-chat-apply="record"]')) {
      ports.applyRecord?.();
      return;
    }
    if (target.closest('[data-worker-chat-minimize]')) ports.minimize?.();
    if (target.closest('.worker-context-chat-head') && ports.isCollapsed?.() && !target.closest('button')) {
      ports.openCollapsedHead?.();
    }
    const voice = target.closest('[data-worker-chat-voice]');
    if (voice) {
      const state = ports.toggleVoice?.();
      if (state) {
        voice.setAttribute('aria-pressed', String(state.enabled));
        voice.title = state.enabled ? 'Desativar avisos falados' : 'Ativar avisos falados';
        ports.setStatus?.(state.status);
      }
    }
    if (target.closest('[data-worker-chat-speaker-preview]')) ports.previewSpeaker?.();
    if (target.closest('[data-service-refresh]')) ports.refreshServiceRequest?.();
    const edit = target.closest('[data-worker-chat-edit]');
    if (edit) ports.startEdit?.(edit.dataset.workerChatEdit || '');
    const speak = target.closest('[data-worker-chat-speak]');
    if (speak) ports.speak?.(speak.dataset.workerChatSpeak || '');
    const action = target.closest('[data-worker-chat-action]');
    if (action) ports.runAction?.(action.dataset.workerChatAction || '');
    const collapse = target.closest('[data-worker-chat-collapse]');
    if (collapse) {
      const message = collapse.closest('[data-message-id]');
      if (!message) return;
      const collapsed = message.classList.toggle('is-collapsed');
      collapse.setAttribute('aria-expanded', String(!collapsed));
      collapse.textContent = collapsed ? 'Expandir' : 'Recolher';
    }
  });
  root.addEventListener('change', event => {
    const target = event.target;
    if (target?.matches?.('[data-worker-chat-speaker]')) {
      const state = ports.selectSpeaker?.(target.value);
      if (state) {
        target.value = state.profile;
        ports.setStatus?.(state.status);
      }
    }
    if (target?.matches?.('[data-service-select]')) ports.selectService?.(target.value);
  });
  return true;
}

/** Install the old composer bindings only when a cached TS bundle lacks its installer. */
export function installWorkerChatComposerEventsLegacyV1(root, ports = {}) {
  if (!root) return null;
  root.querySelectorAll('[data-worker-chat-tab]').forEach(button => button.addEventListener('click', () => ports.selectTab?.(button.dataset.workerChatTab || 'conversation')));
  const cameraInput = root.querySelector('[data-worker-chat-camera-input]');
  const fileInput = root.querySelector('[data-worker-chat-file-input]');
  root.querySelector('[data-worker-chat-capture]')?.addEventListener('click', () => cameraInput?.click());
  root.querySelector('[data-worker-chat-camera]')?.addEventListener('click', () => cameraInput?.click());
  root.querySelector('[data-worker-chat-file]')?.addEventListener('click', () => fileInput?.click());
  for (const [input, source] of [[cameraInput, 'camera'], [fileInput, 'file']]) {
    input?.addEventListener('change', event => {
      for (const file of [...(event.currentTarget.files || [])]) ports.readImage?.(file, source);
      event.currentTarget.value = '';
    });
  }
  const pasteHandler = event => {
    const item = [...(event.clipboardData?.items || [])].find(entry => entry.kind === 'file' && /^image\/(?:png|jpeg|webp)$/i.test(entry.type));
    const file = item?.getAsFile?.();
    if (!file) return;
    event.preventDefault();
    ports.readImage?.(file, 'clipboard');
  };
  root.addEventListener('paste', pasteHandler);
  root.querySelector('[data-worker-chat-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    ports.submitComposer?.();
  });
  root.querySelector('textarea[name="message"]')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    root.querySelector('[data-worker-chat-form]')?.requestSubmit();
  });
  return pasteHandler;
}

export function openWorkerChatRecordDrawerLegacyV1(draft, ports = {}) {
  const documentRef = ports.documentRef || globalThis.document;
  const status = ports.statusElement;
  const drawer = documentRef?.querySelector('.control-record-drawer-v2');
  if (!drawer) {
    if (status) status.textContent = 'Abra o Dashboard para revisar o registro.';
    return null;
  }
  ports.previousDialog?.remove();
  const dialog = documentRef.createElement('dialog');
  dialog.className = 'worker-chat-record-dialog';
  dialog.setAttribute('aria-label', 'Finalizar registro do anexo');
  const close = documentRef.createElement('button');
  close.type = 'button';
  close.textContent = 'Voltar ao chat';
  close.addEventListener('click', () => dialog.close());
  dialog.append(close, drawer);
  documentRef.body.append(dialog);
  dialog.addEventListener('close', () => {
    documentRef.querySelector('.control-center-workspace-v2')?.append(drawer);
    dialog.remove();
  }, { once: true });
  dialog.showModal();
  const input = drawer.querySelector('input[name="evidence"]');
  if (input && draft?.dataUrl) {
    const binary = globalThis.atob(draft.dataUrl.split(',')[1]);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const transfer = new globalThis.DataTransfer();
    transfer.items.add(new globalThis.File([bytes], draft.attachmentRef?.name || 'anexo.png', {
      type: draft.dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/png',
    }));
    input.files = transfer.files;
    input.dataset.chatOcrPrepared = 'true';
    input.dispatchEvent(new globalThis.Event('change', { bubbles: true }));
    queueMicrotask(() => { delete input.dataset.chatOcrPrepared; });
  }
  return dialog;
}
