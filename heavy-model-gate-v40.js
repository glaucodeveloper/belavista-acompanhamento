(() => {
  if (window.__BELAVISTA_HEAVY_GATE_V40__) return;
  window.__BELAVISTA_HEAVY_GATE_V40__ = true;

  const HEAVY_RE = /(?:\.glb(?:[?#]|$)|\.gltf(?:[?#]|$)|\/assets\/model\/|\/models\/)/i;

  let releaseHeavy;
  const heavyReady = new Promise(resolve => { releaseHeavy = resolve; });
  window.__BELAVISTA_HEAVY_READY__ = heavyReady;

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

  const waitIdle = (timeout = 1500) => new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout });
    } else {
      setTimeout(resolve, 350);
    }
  });

  async function waitUi(timeoutMs = 10000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (document.querySelector('belavista-app') && document.querySelector('app-sidebar')) return true;
      await nextFrame();
    }
    return false;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';

    if (HEAVY_RE.test(url)) {
      document.documentElement.dataset.modelDeferredBoot = 'queued';
      await heavyReady;
      document.documentElement.dataset.modelDeferredBoot = 'loading';
    }

    return nativeFetch(input, init);
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__belavistaHeavyV40 = HEAVY_RE.test(String(url || ''));
    return nativeOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (!this.__belavistaHeavyV40) return nativeSend.call(this, body);

    document.documentElement.dataset.modelDeferredBoot = 'queued';

    heavyReady.then(() => {
      document.documentElement.dataset.modelDeferredBoot = 'loading';
      nativeSend.call(this, body);
    });

    return undefined;
  };

  async function releaseSequence() {
    await waitUi();

    await nextFrame();
    await nextFrame();
    await waitIdle(1200);

    let mapResolved = false;

    await Promise.race([
      new Promise(resolve => {
        window.addEventListener('belavista:map-assets-ready', () => {
          mapResolved = true;
          resolve();
        }, { once: true });
      }),
      new Promise(resolve => setTimeout(resolve, 1400))
    ]);

    await waitIdle(1000);
    await new Promise(resolve => setTimeout(resolve, mapResolved ? 250 : 500));

    document.documentElement.dataset.modelDeferredBoot = 'released';
    releaseHeavy();
    window.dispatchEvent(new CustomEvent('belavista:heavy-model-ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void releaseSequence(), { once: true });
  } else {
    void releaseSequence();
  }
})();