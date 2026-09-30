import { env } from '@huggingface/transformers';
import { OpenJev, choice } from 'open-jev';

const CACHE_VERSION = 'v1';

function systemOneTrace(message, detail = null) {
  const suffix = detail == null
    ? ''
    : ` ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  const line = `[SystemOne] ${message}${suffix}`;

  console.log(line);

  try {
    globalThis.ipc?.postMessage?.(`ruby:log:system-one:${line}`);
  } catch {
    // Browser/Capacitor mode may not expose Wry IPC.
  }
}

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

async function requestPersistentStorage() {
  try {
    if (!navigator?.storage) return false;
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (typeof navigator.storage.persist === 'function') {
      return Boolean(await navigator.storage.persist());
    }
  } catch {
    // Persistence is an optimization. Cache API still works without it.
  }
  return false;
}

function configureLocalModelCache(modelId) {
  // Browser/Wry/Capacitor: Transformers.js stores downloaded model artifacts
  // in Cache Storage. The desktop host supplies a stable origin and a stable
  // WebView data directory, so this survives application restarts.
  env.useBrowserCache = true;
  env.useWasmCache = true;
  env.cacheKey = `glauco-system-model-${CACHE_VERSION}`;

  // First installation may use Hugging Face. Subsequent starts resolve the
  // same artifacts from the persistent browser cache.
  env.allowRemoteModels = true;

  return {
    cacheKey: env.cacheKey,
    model: modelId,
  };
}

// Browser System-One runtime.
//
// Lifecycle contract:
//   framework onstart -> preloadOnStart() -> load from local cache or install once
//   machine command   -> decide()        -> MUST use the already-loaded engine
//
// Commands never verify/download/reload the model.
export class SemIfSystemOne {
  constructor({ model = 'kev-0.6b', onProgress = null, onState = null } = {}) {
    this.modelId = model;
    this.onProgress = onProgress;
    this.onState = onState;
    this.engine = null;
    this.startupLoading = null;
    this.cache = configureLocalModelCache(model);
  }

  get ready() {
    return this.engine !== null;
  }

  async info() {
    return OpenJev.info({
      model: this.modelId,
      device: 'auto',
      dtype: 'auto',
    });
  }

  async preloadOnStart() {
    if (this.engine) return this.engine;
    if (this.startupLoading) return this.startupLoading;

    this.startupLoading = this.#loadForStartup();

    try {
      return await this.startupLoading;
    } catch (error) {
      this.startupLoading = null;
      throw error;
    }
  }

  // Compatibility alias for framework startup only.
  async ensureLoaded() {
    return this.preloadOnStart();
  }

  requireReadyEngine() {
    if (!this.engine) {
      throw new Error(
        `System One ${this.modelId} is not ready. ` +
        'The model must be loaded by framework onstart before the application window is mounted.'
      );
    }
    return this.engine;
  }

  async #loadForStartup() {
    const storagePersistent = await requestPersistentStorage();

    this.onState?.({
      state: 'checking-local',
      phase: 'startup',
      model: this.modelId,
      progress: 0,
      cacheKey: this.cache.cacheKey,
      storagePersistent,
      cached: null,
      source: 'checking',
      savedLocal: false,
    });

    let before = null;
    try {
      before = await this.info();
    } catch {
      // If metadata lookup cannot complete, OpenJev.load() still gets a chance
      // to resolve already cached artifacts or perform first installation.
    }

    const cachedBefore = Boolean(before?.isCached);

    this.onState?.({
      state: 'loading',
      phase: 'startup',
      model: this.modelId,
      progress: cachedBefore ? 1 : 0,
      cacheKey: this.cache.cacheKey,
      storagePersistent,
      cached: cachedBefore,
      source: cachedBefore ? 'local' : 'install',
      savedLocal: cachedBefore,
      downloadSize: before?.downloadSize ?? null,
    });

    const engine = await OpenJev.load({
      model: this.modelId,
      device: 'auto',
      dtype: 'auto',
      onProgress: ({ progress, loaded, total }) => {
        const detail = {
          state: 'loading',
          phase: 'startup',
          model: this.modelId,
          progress: Number(progress || 0),
          loaded: Number(loaded || 0),
          total: Number(total || 0),
          cacheKey: this.cache.cacheKey,
          storagePersistent,
          cached: cachedBefore,
          source: cachedBefore ? 'local' : 'install',
          savedLocal: cachedBefore,
        };
        this.onProgress?.(detail);
        this.onState?.(detail);
      },
    });

    this.engine = engine;

    let cachedAfter = true;
    let after = null;
    try {
      after = await this.info();
      cachedAfter = Boolean(after?.isCached);
    } catch {
      // The browser cache is enabled and OpenJev successfully loaded. If
      // metadata verification is unavailable, keep the runtime usable.
    }

    this.onState?.({
      state: 'ready',
      phase: 'runtime',
      model: this.modelId,
      progress: 1,
      runtime: engine.runtime,
      cacheKey: this.cache.cacheKey,
      storagePersistent,
      cached: cachedAfter,
      source: 'local',
      savedLocal: cachedAfter,
      downloadSize: after?.downloadSize ?? before?.downloadSize ?? null,
    });

    return engine;
  }

  async decide(payload) {
    // A command may consume the model but may never initiate model loading.
    const engine = this.requireReadyEngine();

    const criteriaEntries = Object.entries(payload.criteria ?? {});
    if (criteriaEntries.length < 1 || criteriaEntries.length > 255) {
      throw new Error('System One requires between 1 and 255 criteria');
    }

    const stateText = typeof payload.state === 'string'
      ? payload.state
      : JSON.stringify(payload.state);

    const optionNames = criteriaEntries.map(([key]) => String(key));
    const descriptions = Object.fromEntries(
      criteriaEntries.map(([key, description]) => [
        String(key),
        String(description),
      ]),
    );

    this.onState?.({
      state: 'deciding',
      phase: 'runtime',
      model: this.modelId,
      progress: 1,
      cacheKey: this.cache.cacheKey,
      cached: true,
      source: 'local',
      savedLocal: true,
    });

    let stateTokens = null;
    try {
      stateTokens = engine.countTokens(stateText);
    } catch {
      // countTokens is diagnostic only.
    }

    const startedAt = nowMs();
    systemOneTrace('decide:start', {
      model: this.modelId,
      device: engine.runtime?.device,
      dtype: engine.runtime?.dtype,
      stateChars: stateText.length,
      stateTokens,
      options: optionNames.length,
    });

    let stalledTicks = 0;
    const stallTimer = globalThis.setInterval(() => {
      stalledTicks += 1;
      systemOneTrace('decide:still-running', {
        elapsedMs: Math.round(nowMs() - startedAt),
        tick: stalledTicks,
        options: optionNames.length,
        stateTokens,
      });
    }, 5000);

    let answers;
    try {
      answers = await engine.decide(stateText, {
        transition: choice(
          String(
            payload.question ||
            'Select exactly one registered Ruby machine method whose described effect best satisfies COMMAND given CURRENT_STATE. Choose only among the supplied methods.'
          ),
          optionNames,
          descriptions,
        ),
      });

      systemOneTrace('decide:resolved', {
        elapsedMs: Math.round(nowMs() - startedAt),
        choice: answers?.transition?.choice,
      });
    } catch (error) {
      systemOneTrace('decide:error', {
        elapsedMs: Math.round(nowMs() - startedAt),
        error: error?.stack ?? error?.message ?? String(error),
      });
      throw error;
    } finally {
      globalThis.clearInterval(stallTimer);
    }

    const answer = answers.transition;
    const result = {
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
      model: this.modelId,
      runtime: engine.runtime,
    };

    this.onState?.({
      state: 'ready',
      phase: 'runtime',
      model: this.modelId,
      progress: 1,
      runtime: engine.runtime,
      cacheKey: this.cache.cacheKey,
      cached: true,
      source: 'local',
      savedLocal: true,
      lastDecision: result,
    });

    return result;
  }
}