const params = new URLSearchParams(location.search);
const enabled = params.get('glauco_shell') === '1';

if (enabled) {
  document.documentElement.dataset.glaucoShell = '1';

  const style = document.createElement('style');
  style.id = 'glauco-shell-v50-style';
  style.textContent = `
    html[data-glauco-shell="1"] app-sidebar {
      display: none !important;
    }
    html[data-glauco-shell="1"] .app-shell,
    html[data-glauco-shell="1"] .app-shell.sidebar-collapsed {
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

  function requestedState() {
    const raw = String(location.hash || '').replace(/^#/, '');
    const hash = new URLSearchParams(raw);

    return {
      view: hash.get('view') || 'map',
      reportFamily: hash.get('reportFamily') || '',
    };
  }

  function applyView() {
    if (applying) return;

    const requested = requestedState();
    const view = requested.view;

    let selector = `[data-view="${CSS.escape(view)}"]`;

    if (view === 'reports' && requested.reportFamily) {
      selector =
        `[data-view="reports"][data-report-family="${CSS.escape(requested.reportFamily)}"]`;
    }

    const target = document.querySelector(selector);

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

  customElements.whenDefined('app-sidebar')
    .then(() => setTimeout(applyView, 0))
    .catch(() => {});

  setTimeout(applyView, 100);
}