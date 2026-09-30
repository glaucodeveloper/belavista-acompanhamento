(() => {
  if (window.__BELAVISTA_HEAVY_V41__) return;
  window.__BELAVISTA_HEAVY_V41__ = true;

  let released = false;

  function release(reason = 'manual') {
    if (released) return;
    released = true;

    document.documentElement.dataset.heavyBoot = 'released';
    window.dispatchEvent(new CustomEvent('belavista:heavy-start', {
      detail: { reason, at: performance.now() }
    }));

    const button = document.querySelector('[data-heavy-start-v41]');
    if (button) {
      button.textContent = 'Mapa 3D carregando…';
      button.disabled = true;
      setTimeout(() => button.remove(), 4000);
    }
  }

  window.belavistaLoadHeavyMap = () => release('api');

  function mountButton() {
    if (released || document.querySelector('[data-heavy-start-v41]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.heavyStartV41 = 'true';
    button.textContent = 'Carregar mapa 3D';
    button.setAttribute('aria-label', 'Carregar mapa e modelo 3D');

    Object.assign(button.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: '2147483000',
      padding: '10px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,.2)',
      background: 'rgba(18,24,32,.92)',
      color: '#fff',
      font: '600 13px system-ui, sans-serif',
      boxShadow: '0 10px 30px rgba(0,0,0,.24)',
      cursor: 'pointer'
    });

    button.addEventListener('click', () => release('button'), { once: true });
    document.body.appendChild(button);
  }

  function waitUi() {
    const start = performance.now();

    const tick = () => {
      if (document.querySelector('belavista-app') && document.querySelector('app-sidebar')) {
        document.documentElement.dataset.heavyBoot = 'waiting-user';
        requestAnimationFrame(() => requestAnimationFrame(mountButton));
        return;
      }

      if (performance.now() - start > 12000) {
        mountButton();
        return;
      }

      requestAnimationFrame(tick);
    };

    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitUi, { once: true });
  } else {
    waitUi();
  }
})();