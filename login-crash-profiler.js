// BELAVISTA_LOGIN_CRASH_PROFILE_V1
// Captura somente diagnósticos técnicos da abertura. Credenciais e valores de
// formulários nunca entram no perfil; os eventos ficam na sessão do navegador.
(() => {
  if (globalThis.BELAVISTA_LOGIN_PROFILE) return;

  const storageKey = 'belavista.login.profile.v1';
  const startedAt = performance.now();
  const sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const events = [];
  const listeners = new Set();
  const text = (value, max = 1200) => String(value ?? '').slice(0, max);
  const errorData = error => ({
    message: text(error?.message || error || 'Erro sem mensagem'),
    name: text(error?.name || 'Error', 120),
    stack: text(error?.stack || '', 4000)
  });
  const runtime = () => ({
    href: `${location.pathname}${location.search}`,
    userAgent: text(navigator.userAgent, 500),
    viewport: `${innerWidth}x${innerHeight}`,
    visibility: document.visibilityState,
    connection: text(navigator.connection?.effectiveType || '', 40)
  });
  const snapshot = () => ({
    version: 1,
    sessionId,
    startedAt: new Date(Date.now() - Math.max(0, performance.now() - startedAt)).toISOString(),
    elapsedMs: Math.round(Math.max(0, performance.now() - startedAt)),
    runtime: runtime(),
    events: events.slice(-80)
  });
  const persist = () => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(snapshot())); } catch {}
  };
  const notify = () => listeners.forEach(listener => { try { listener(snapshot()); } catch {} });
  const mark = (name, detail = {}) => {
    events.push({ atMs: Math.round(Math.max(0, performance.now() - startedAt)), name: text(name, 100), detail });
    if (events.length > 80) events.splice(0, events.length - 80);
    persist();
    notify();
  };
  const capture = (name, error, detail = {}) => mark(name, { ...detail, error: errorData(error) });
  const profile = {
    version: 1,
    sessionId,
    mark,
    capture,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot,
    clear() { events.length = 0; persist(); notify(); }
  };
  globalThis.BELAVISTA_LOGIN_PROFILE = profile;

  window.addEventListener('error', event => {
    if (event.target && event.target !== window) {
      const resource = event.target;
      capture('resource.error', new Error(`Falha ao carregar ${resource.src || resource.href || resource.tagName || 'recurso'}`), { tag: resource.tagName || '' });
      return;
    }
    capture('window.error', event.error || new Error(event.message || 'Erro global'), { file: event.filename || '', line: event.lineno || 0, column: event.colno || 0 });
  }, true);
  window.addEventListener('unhandledrejection', event => capture('unhandledrejection', event.reason || new Error('Promise rejeitada sem tratamento')));
  mark('profiler.ready');
})();
