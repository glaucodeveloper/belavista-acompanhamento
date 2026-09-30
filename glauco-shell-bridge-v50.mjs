const params = new URLSearchParams(location.search);
const enabled = params.get('glauco_shell') === '1';

if (enabled) {
  document.documentElement.dataset.glaucoShell = '1';

  const style = document.createElement('style');
  style.id = 'glauco-shell-v50-style';
  style.textContent = `
    html[data-glauco-shell="1"] body.admin-shell-page .app-shell > app-sidebar,
    html[data-glauco-shell="1"] body.admin-shell-page .app-shell > app-sidebar .sidebar {
      display: none !important;
    }
    html[data-glauco-shell="1"] body.admin-shell-page .app-shell,
    html[data-glauco-shell="1"] body.admin-shell-page .app-shell.sidebar-collapsed {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    html[data-glauco-shell="1"] .app-main {
      grid-column: 1 !important;
      width: 100% !important;
      min-width: 0 !important;
    }
    html[data-glauco-shell="1"] .mobile-menu-trigger {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  let applying = false;
  let attempts = 0;

  function requestedView() {
    const raw = String(location.hash || '').replace(/^#/, '');
    const hash = new URLSearchParams(raw);
    return hash.get('view') || 'map';
  }

  function applyView() {
    if (applying) return;
    const app = document.querySelector('belavista-app');
    if (!app || app.hidden) return;

    const view = requestedView();
    const selector = `[data-view="${CSS.escape(view)}"]`;
    const target = document.querySelector(selector);

    const store = globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.appStore;
    if (!target && store && typeof store.set === 'function') {
      store.set({view}); document.querySelector('view-layer')?.render(); return;
    }
    if (!target) {
      attempts += 1;
      if (attempts < 80) setTimeout(applyView, 100);
      return;
    }

    attempts = 0;
    applying = true;

    try {
      target.click();
      globalThis.dispatchEvent(
        new CustomEvent('glauco:legacy-view', {
          detail: { view },
        }),
      );
    } finally {
      queueMicrotask(() => {
        applying = false;
      });
    }
  }

  addEventListener('hashchange', applyView);
  addEventListener('DOMContentLoaded', applyView);
  customElements.whenDefined('belavista-app').then(() => {
    const app = document.querySelector('belavista-app');
    if (app) new MutationObserver(applyView).observe(app, {attributes: true, attributeFilter: ['hidden']});
    applyView();
  });

  customElements.whenDefined('app-sidebar')
    .then(() => setTimeout(applyView, 0))
    .catch(() => {});

  setTimeout(applyView, 100);
}
