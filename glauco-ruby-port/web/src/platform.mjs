import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { SemIfSystemOne } from './semif.mjs';
import { BrowserJevRuntime } from './browserjev.mjs';
import { installNativeModelBridge, completeViaNative } from './modelproxy.mjs';
import { clientGovService, installClientGovBridge } from './clientgov.mjs';

const nativeTarget = Capacitor.getPlatform() === 'android' ? 'android' : 'desktop';
const RubyModel = registerPlugin('RubyModel');
const capabilities = new Set(['filesystem', 'camera', 'location']);
const systemModelId = globalThis.RubyConfig?.systemModel ?? 'kev-0.6b';

const systemOneState = {
  state: 'idle',
  model: systemModelId,
  progress: 0,
  error: null,
  runtime: null,
  lastDecision: null,
  cached: null,
  savedLocal: false,
  source: null,
  cacheKey: null,
  storagePersistent: false,
  downloadSize: null,
};

let frameworkStartPromise = null;
let frameworkLifecycle = 'cold';
let mainWindowShown = false;

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '';
  if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(2)} GB`;
  if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(0)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function postHost(message) {
  try {
    if (globalThis.ipc?.postMessage) {
      globalThis.ipc.postMessage(String(message));
      return true;
    }
  } catch (error) {
    console.warn('[RubyPlatform/window] IPC failed', error);
  }
  return false;
}

function setWindowPhase(phase) {
  document.documentElement.dataset.rubyWindowPhase = String(phase);
}

function renderSystemOneStatus() {
  let node = document.querySelector('#ruby-system-one-status');
  if (!node) {
    node = document.createElement('div');
    node.id = 'ruby-system-one-status';
    document.body.appendChild(node);
  }

  // An authored Ruby loading_window is responsible for its own presentation.
  // Keep emitting ruby:system-one-status events but suppress the framework toast.
  if (document.documentElement.dataset.rubyWindowPhase === 'loading-component') {
    node.hidden = true;
    return;
  }

  const state = systemOneState.state;
  if (state === 'ready') {
    node.textContent = `System One ready Â· ${systemOneState.model}`;
    node.dataset.state = 'ready';
    setTimeout(() => {
      if (systemOneState.state === 'ready') node.hidden = true;
    }, 1800);
    return;
  }

  node.hidden = false;
  node.dataset.state = state;

  if (state === 'checking-local') {
    node.textContent = `Checking local System One ${systemOneState.model}â€¦`;
  } else if (state === 'loading') {
    const percent = Math.max(0, Math.min(100, Math.round((systemOneState.progress || 0) * 100)));
    const amount = systemOneState.total
      ? ` Â· ${formatBytes(systemOneState.loaded)} / ${formatBytes(systemOneState.total)}`
      : '';
    const verb = systemOneState.source === 'local' ? 'Loading local' : 'Installing locally';
    node.textContent = `${verb} System One ${systemOneState.model} Â· ${percent}%${amount}`;
  } else if (state === 'deciding') {
    node.textContent = 'System One decidingâ€¦';
  } else if (state === 'error') {
    node.textContent = `System One error: ${systemOneState.error || 'unknown error'}`;
  } else {
    node.hidden = true;
  }
}

function updateSystemOneState(detail) {
  Object.assign(systemOneState, detail || {});
  systemOneState.frameworkLifecycle = frameworkLifecycle;
  if (detail?.state !== 'error') systemOneState.error = null;
  renderSystemOneStatus();
  // General status is visible to diagnostics/runtime observers.
  globalThis.dispatchEvent(new CustomEvent('ruby:system-one-status', {
    detail: { ...systemOneState },
  }));

  // The Ruby loading_window receives ONLY pre-main startup events. Decisions
  // after the application is mounted cannot reach this channel.
  if (
    systemOneState.phase === 'startup' &&
    (frameworkLifecycle === 'cold' || frameworkLifecycle === 'loading')
  ) {
    globalThis.dispatchEvent(new CustomEvent('ruby:system-one-startup-status', {
      detail: { ...systemOneState },
    }));
  }
}

const systemOne = new SemIfSystemOne({
  model: systemModelId,
  onProgress: updateSystemOneState,
  onState: updateSystemOneState,
});
installClientGovBridge();
installNativeModelBridge();
const browserJev = new BrowserJevRuntime({
  systemOne,
  target: nativeTarget,
  complete: async (options) => {
    if (nativeTarget === 'android') {
      return RubyModel.complete(options);
    }

    return desktopModelComplete(options);
  },
});


function jsonResult(value) {
  return JSON.stringify(value ?? {});
}

async function frameworkOnStart() {
  if (frameworkStartPromise) return frameworkStartPromise;

  frameworkLifecycle = 'loading';

  frameworkStartPromise = (async () => {
    const engine = await systemOne.preloadOnStart();
    frameworkLifecycle = 'ready';

    return {
      ok: true,
      target: nativeTarget,
      systemOne: {
        model: systemModelId,
        runtime: engine.runtime,
        cached: systemOneState.cached,
        savedLocal: systemOneState.savedLocal,
        source: systemOneState.source,
        cacheKey: systemOneState.cacheKey,
        storagePersistent: systemOneState.storagePersistent,
      },
    };
  })();

  try {
    return await frameworkStartPromise;
  } catch (error) {
    frameworkStartPromise = null;
    frameworkLifecycle = 'error';
    updateSystemOneState({
      state: 'error',
      model: systemModelId,
      error: error?.message ?? String(error),
    });
    throw error;
  }
}

async function desktopModelComplete(options) {
  const endpointKey = 'glauco.instagram.model.endpoint.v1';
  const modelKey = 'glauco.instagram.model.name.v1';

  const configuredEndpoint =
    globalThis.localStorage?.getItem(endpointKey)?.trim();

  const configuredModel =
    globalThis.localStorage?.getItem(modelKey)?.trim();

  let endpoint =
    configuredEndpoint ||
    globalThis.RubyConfig?.modelEndpoint ||
    'http://127.0.0.1:1234/v1/chat/completions';

  const model =
    configuredModel ||
    globalThis.RubyConfig?.model ||
    'local';

  endpoint = String(endpoint).trim();

  if (!/\/chat\/completions\/?$/i.test(endpoint)) {
    endpoint =
      endpoint.replace(/\/+$/, '') +
      '/v1/chat/completions';
  }

  return completeViaNative({
    endpoint,
    model,
    messages: options.messages,
    prompt: options.prompt,
    max_tokens: options.max_tokens ?? 512,
    temperature: options.temperature ?? 0.2,
    timeout_ms: options.timeout_ms ?? 30000,
  });
}

async function memoryRequest(path, body = null) {
  const base = globalThis.RubyConfig?.memoryEndpoint;
  if (!base) {
    throw new Error('Ruby memory backend is not configured. Set RubyConfig.memoryEndpoint to the Metis bridge.');
  }
  const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`memory backend returned HTTP ${response.status}`);
  return response.json();
}

export function installRubyPlatform() {
  const platform = {
    target: nativeTarget,

    async onstart() {
      return jsonResult(await frameworkOnStart());
    },

    hasCapability(name) {
      return capabilities.has(String(name));
    },

    window: {
      showLoading() {
        // Loading UI belongs exclusively to pre-main framework startup.
        // A machine command can never reopen it after the application is live.
        if (mainWindowShown || frameworkLifecycle === 'ready') {
          return false;
        }

        setWindowPhase('loading-component');
        const boot = document.querySelector('#ruby-boot-status');
        if (boot) boot.hidden = true;
        postHost('ruby:show-loading');
        return true;
      },
      showMain() {
        mainWindowShown = true;
        setWindowPhase('main');
        postHost('ruby:show-main');
        return true;
      },
      showError() {
        setWindowPhase('error');
        postHost('ruby:show-error');
        return true;
      },
      hide() {
        setWindowPhase('hidden');
        postHost('ruby:hide');
        return true;
      },
    },

    systemOne: {
      async preload() {
        const started = await frameworkOnStart();
        return jsonResult(started.systemOne);
      },
      status() {
        return JSON.stringify(systemOneState);
      },
      async decide(json) {
        try {
          if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
            throw new Error(
              `System One command rejected: framework lifecycle is ${frameworkLifecycle}. ` +
              'The system model is loaded only by onstart before the main window.'
            );
          }

          const result = await systemOne.decide(JSON.parse(String(json)));
          return JSON.stringify(result);
        } catch (error) {
          updateSystemOneState({ state: 'error', error: error?.message ?? String(error) });
          throw error;
        }
      },
    },

    browserJev: {
      async runInstagramLeadAutopilot(id, policyJson = '{}', optionsJson = '{}') {
        await frameworkOnStart();

        let policy = {};
        let options = {};

        try {
          policy = JSON.parse(String(policyJson || '{}'));
        } catch {
          policy = {};
        }

        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.runInstagramLeadAutopilot(
          String(id),
          policy,
          options,
        );

        return JSON.stringify(result);
      },

      status(id) {
        return JSON.stringify(browserJev.status(String(id)));
      },

      async command(id, command, optionsJson = '{}') {
        if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
          throw new Error(
            `Browser JEV command rejected: framework lifecycle is ${frameworkLifecycle}.`
          );
        }

        let options = {};
        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.command(
          String(id),
          String(command),
          options,
        );

        return JSON.stringify(result);
      },
      async fillCredential(id, command, clientId, field, optionsJson = '{}') {
        if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
          throw new Error(
            `Browser JEV credential fill rejected: framework lifecycle is ${frameworkLifecycle}.`
          );
        }

        let options = {};
        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.fillCredential(
          String(id),
          String(command),
          String(clientId),
          String(field),
          options,
        );

        return JSON.stringify(result);
      },
      async advanceGovBr(id, clientId, optionsJson = '{}') {
        if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
          throw new Error(
            `Gov.br semantic advance rejected: framework lifecycle is ${frameworkLifecycle}.`
          );
        }

        let options = {};
        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.advanceGovBr(
          String(id),
          String(clientId),
          options,
        );

        return JSON.stringify(result);
      },
      async replyInstagramDirect(id, message, optionsJson = '{}') {
        if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
          throw new Error(
            `Instagram Direct reply rejected: framework lifecycle is ${frameworkLifecycle}.`
          );
        }

        let options = {};
        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.replyInstagramDirect(
          String(id),
          String(message),
          options,
        );

        return JSON.stringify(result);
      },
      async replyInstagramUnreadDirects(id, message, optionsJson = '{}') {
        if (frameworkLifecycle !== 'ready' || !systemOne.ready) {
          throw new Error(
            `Instagram unread reply rejected: framework lifecycle is ${frameworkLifecycle}.`
          );
        }

        let options = {};
        try {
          options = JSON.parse(String(optionsJson || '{}'));
        } catch {
          options = {};
        }

        const result = await browserJev.replyInstagramUnreadDirects(
          String(id),
          String(message),
          options,
        );

        return JSON.stringify(result);
      },
    },
    clientGov: clientGovService,

    camera: {
      async capture(options = {}) {
        return Camera.getPhoto(options);
      },
    },

    filesystem: {
      async read(options = {}) {
        return Filesystem.readFile(options);
      },
      async write(options = {}) {
        return Filesystem.writeFile(options);
      },
    },

    location: {
      async current(options = {}) {
        return Geolocation.getCurrentPosition(options);
      },
    },

    model: {
      async load(options = {}) {
        if (nativeTarget === 'android') return RubyModel.load(options);
        return { ready: true, transport: 'llama-server' };
      },
      async complete(options = {}) {
        if (nativeTarget === 'android') return RubyModel.complete(options);
        return desktopModelComplete(options);
      },
      async unload() {
        if (nativeTarget === 'android') return RubyModel.unload();
        return { ok: true };
      },
    },

    memory: {
      async remember(options = {}) {
        return jsonResult(await memoryRequest('/v1/memory/commit', options));
      },
      async match(options = {}) {
        return jsonResult(await memoryRequest('/v1/memory/query', options));
      },
      async reset() {
        return jsonResult(await memoryRequest('/v1/memory/reset', {}));
      },
    },
  };

  globalThis.RubyPlatform = platform;
  return platform;
}