const SELECTOR = '[data-native-webview-content="true"]';

const pendingSnapshots = new Map();
const pendingActions = new Map();
let requestCounter = 0;

function bridgeTrace(message, detail = null) {
  const suffix = detail == null
    ? ''
    : ` ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  const line = `[WebViewContent] ${message}${suffix}`;

  console.log(line);

  try {
    globalThis.ipc?.postMessage?.(`ruby:log:webview-content:${line}`);
  } catch {
    // Browser/Capacitor mode may not expose Wry IPC.
  }
}

function nativeIpcAvailable() {
  return typeof globalThis.ipc?.postMessage === 'function';
}

function nextRequestId(prefix) {
  requestCounter += 1;
  return `${prefix}-${Date.now()}-${requestCounter}`;
}

function post(kind, fields) {
  if (!nativeIpcAvailable()) {
    throw new Error('Native WebViewContent IPC is unavailable');
  }

  const encoded = new URLSearchParams(fields).toString();
  globalThis.ipc.postMessage(`ruby:webview-content:${kind}:${encoded}`);
}

function decodeHostResult(raw) {
  let value = raw;

  for (let pass = 0; pass < 3; pass += 1) {
    if (typeof value !== 'string') break;

    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }

  if (value && typeof value === 'object') return value;

  return {
    ok: false,
    error: `Invalid native WebViewContent result: ${String(raw)}`,
  };
}

function settlePending(map, requestId, raw, fallbackLabel) {
  const pending = map.get(String(requestId));

  // Duplicate, late or otherwise invalid native callbacks are terminally
  // ignored. Never recreate a promise or start another browser operation.
  if (!pending) return false;

  map.delete(String(requestId));
  clearTimeout(pending.timer);

  bridgeTrace(`${fallbackLabel}:callback`, {
    requestId: String(requestId),
    elapsedMs: Math.round((performance?.now?.() ?? Date.now()) - pending.startedAt),
  });

  const result = decodeHostResult(raw);
  if (result?.ok === false) {
    pending.reject(new Error(result.error || `${fallbackLabel} failed`));
  } else {
    pending.resolve(result);
  }

  return true;
}

export function requestNativeSnapshot(id, timeoutMs = 15000) {
  const requestId = nextRequestId('snapshot');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingSnapshots.delete(requestId);
      bridgeTrace('snapshot:timeout', { requestId, id: String(id), timeoutMs });
      reject(new Error(`Browser snapshot timed out for ${id}`));
    }, timeoutMs);

    pendingSnapshots.set(requestId, {
      resolve,
      reject,
      timer,
      startedAt: performance?.now?.() ?? Date.now(),
    });

    bridgeTrace('snapshot:send', { requestId, id: String(id) });

    try {
      post('snapshot', {
        requestId,
        id: String(id),
      });
    } catch (error) {
      clearTimeout(timer);
      pendingSnapshots.delete(requestId);
      reject(error);
    }
  });
}

export function performNativeBrowserAction(
  id,
  action,
  { target = '', text = '', url = '' } = {},
  timeoutMs = 15000,
) {
  const requestId = nextRequestId('action');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingActions.delete(requestId);
      bridgeTrace('action:timeout', {
        requestId,
        id: String(id),
        action: String(action),
        timeoutMs,
      });
      reject(new Error(`Browser action ${action} timed out for ${id}`));
    }, timeoutMs);

    pendingActions.set(requestId, {
      resolve,
      reject,
      timer,
      startedAt: performance?.now?.() ?? Date.now(),
    });

    bridgeTrace('action:send', {
      requestId,
      id: String(id),
      action: String(action),
      target: String(target || ''),
    });

    try {
      post('action', {
        requestId,
        id: String(id),
        action: String(action),
        target: String(target || ''),
        text: String(text ?? ''),
        url: String(url || ''),
      });
    } catch (error) {
      clearTimeout(timer);
      pendingActions.delete(requestId);
      reject(error);
    }
  });
}

function clippedRect(element) {
  const base = element.getBoundingClientRect();

  let left = Math.max(0, base.left);
  let top = Math.max(0, base.top);
  let right = Math.min(globalThis.innerWidth, base.right);
  let bottom = Math.min(globalThis.innerHeight, base.bottom);

  let parent = element.parentElement;
  while (parent && parent !== document.documentElement) {
    const style = getComputedStyle(parent);
    const clipsX = ['hidden', 'auto', 'scroll', 'clip'].includes(style.overflowX);
    const clipsY = ['hidden', 'auto', 'scroll', 'clip'].includes(style.overflowY);

    if (clipsX || clipsY) {
      const rect = parent.getBoundingClientRect();
      if (clipsX) {
        left = Math.max(left, rect.left);
        right = Math.min(right, rect.right);
      }
      if (clipsY) {
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
      }
    }

    parent = parent.parentElement;
  }

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function snapshot(element) {
  const id =
    element.dataset.webviewContentId ||
    element.id ||
    '';

  const url = element.dataset.webviewUrl || '';
  const requestedVisible = element.dataset.webviewVisible !== 'false';
  const style = getComputedStyle(element);
  const rect = clippedRect(element);

  const visible =
    requestedVisible &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || '1') > 0 &&
    rect.width >= 1 &&
    rect.height >= 1;

  return {
    id,
    url,
    x: rect.x.toFixed(2),
    y: rect.y.toFixed(2),
    width: rect.width.toFixed(2),
    height: rect.height.toFixed(2),
    visible: visible ? '1' : '0',
  };
}

function signature(value) {
  return JSON.stringify(value);
}

export function installNativeWebViewContentBridge() {
  if (!nativeIpcAvailable()) return false;
  globalThis.RubyNativeWebViewContent = true;

  const last = new Map();
  const observed = new Set();
  const resizeObserver = new ResizeObserver(() => schedule());

  let queued = false;

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sync();
    });
  }

  function sync() {
    const nodes = [...document.querySelectorAll(SELECTOR)];
    const present = new Set();

    for (const node of nodes) {
      const value = snapshot(node);
      if (!value.id || !value.url) continue;

      present.add(value.id);

      if (!observed.has(node)) {
        observed.add(node);
        resizeObserver.observe(node);
      }

      const nextSignature = signature(value);
      if (last.get(value.id) !== nextSignature) {
        last.set(value.id, nextSignature);
        post('upsert', value);
      }
    }

    for (const [id] of last) {
      if (!present.has(id)) {
        post('remove', { id });
        last.delete(id);
      }
    }

    for (const node of [...observed]) {
      if (!document.documentElement.contains(node)) {
        resizeObserver.unobserve(node);
        observed.delete(node);
      }
    }
  }

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'style',
      'class',
      'hidden',
      'data-webview-url',
      'data-webview-visible',
    ],
  });

  globalThis.addEventListener('resize', schedule);
  globalThis.addEventListener('scroll', schedule, true);
  globalThis.addEventListener('beforeunload', () => {
    for (const [id] of last) {
      post('remove', { id });
    }
    last.clear();
  });

  globalThis.RubyNativeWebViewContent = {
    sync: schedule,

    resolveSnapshot(requestId, result) {
      return settlePending(
        pendingSnapshots,
        requestId,
        result,
        'Browser snapshot',
      );
    },

    resolveAction(requestId, result) {
      return settlePending(
        pendingActions,
        requestId,
        result,
        'Browser action',
      );
    },
  };

  schedule();
  return true;
}