const pending = new Map();
let requestCounter = 0;

function nextRequestId() {
  requestCounter += 1;
  return `model-${Date.now()}-${requestCounter}`;
}

function nativeAvailable() {
  return typeof globalThis.ipc?.postMessage === 'function';
}

function decode(raw) {
  let value = raw;

  for (let pass = 0; pass < 3; pass += 1) {
    if (typeof value !== 'string') break;

    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }

  return value;
}

export function installNativeModelBridge() {
  globalThis.RubyNativeModelBridge = {
    resolve(requestId, raw) {
      const item = pending.get(String(requestId));
      if (!item) return false;

      pending.delete(String(requestId));
      clearTimeout(item.timer);

      const envelope = decode(raw);

      if (!envelope || typeof envelope !== 'object') {
        item.reject(
          new Error(`invalid native model response: ${String(raw)}`)
        );
        return true;
      }

      if (envelope.ok === false) {
        item.reject(
          new Error(envelope.error || 'native model request failed')
        );
        return true;
      }

      const response = decode(envelope.response);

      if (!response || typeof response !== 'object') {
        item.reject(
          new Error(
            `model endpoint returned invalid JSON: ${String(envelope.response).slice(0, 300)}`
          )
        );
        return true;
      }

      item.resolve(response);
      return true;
    },
  };

  return true;
}

export function completeViaNative({
  endpoint,
  model,
  messages,
  prompt,
  max_tokens = 512,
  temperature = 0.2,
  timeout_ms = 30000,
}) {
  if (!nativeAvailable()) {
    return Promise.reject(
      new Error('native model proxy is unavailable')
    );
  }

  const requestId = nextRequestId();

  const body = JSON.stringify({
    model,
    messages:
      messages ??
      [{ role: 'user', content: String(prompt ?? '') }],
    max_tokens,
    temperature,
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(
        new Error(
          `native model proxy timed out after ${timeout_ms}ms for ${endpoint}`
        )
      );
    }, Number(timeout_ms) + 3000);

    pending.set(requestId, {
      resolve,
      reject,
      timer,
    });

    const encoded = new URLSearchParams({
      requestId,
      endpoint: String(endpoint),
      timeoutMs: String(timeout_ms),
      payload: body,
    }).toString();

    globalThis.ipc.postMessage(
      `ruby:model-complete:request:${encoded}`
    );
  });
}