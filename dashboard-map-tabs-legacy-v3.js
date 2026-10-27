(() => {
  const STORAGE_KEY = 'belavista.map-dashboard-tab.v3';
  const MODES = new Set(['visualization', 'progress']);
  let currentMode = localStorage.getItem(STORAGE_KEY) || 'visualization';
  if (!MODES.has(currentMode)) currentMode = 'visualization';

  const getMapView = () => document.querySelector('view-layer[data-view="map"]');
  const getMapScene = () => document.querySelector('map-scene[data-persistent-map="true"]');

  function setHeader(view, mode) {
    const header = view?.querySelector(':scope > .activity-header');
    if (!header) return;
    const title = header.querySelector('div > span');
    const subtitle = header.querySelector('div > small');
    if (!header.dataset.originalTitle && title) {
      header.dataset.originalTitle = title.textContent || '';
      header.dataset.originalSubtitle = subtitle?.textContent || '';
    }
    if (mode === 'progress') {
      if (title) title.textContent = 'Andamento e etapas';
      if (subtitle) subtitle.textContent = 'Execução, caixa, prioridades e etapa em foco';
      header.removeAttribute('hidden');
    } else {
      header.setAttribute('hidden', '');
    }
  }

  function applyMode(mode, persist = true) {
    if (!MODES.has(mode)) return;
    currentMode = mode;
    if (persist) localStorage.setItem(STORAGE_KEY, mode);
    const view = getMapView();
    if (!view) return;
    const dock = view.querySelector(':scope > .map-interface-dock.previous-widget-interface');
    view.dataset.mapTab = mode;
    if (dock) dock.dataset.mapDashboardMode = mode;
    setHeader(view, mode);
    const category = getMapScene()?.querySelector('.map-category-switcher');
    if (category) category.hidden = mode !== 'visualization';
    dock?.querySelectorAll('[data-map-dashboard-tab]').forEach(button => {
      const active = button.dataset.mapDashboardTab === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function install() {
    const view = getMapView();
    if (!view) return;
    const dock = view.querySelector(':scope > .map-interface-dock.previous-widget-interface');
    if (!dock) return;

    if (!dock.querySelector(':scope > .map-dashboard-tabs-v3')) {
      const tabs = document.createElement('nav');
      tabs.className = 'map-dashboard-tabs-v3';
      tabs.setAttribute('aria-label', 'Modos de visualização do dashboard');
      tabs.innerHTML = `
        <button type="button" data-map-dashboard-tab="visualization">⌖ <span>Visualização</span></button>
        <button type="button" data-map-dashboard-tab="progress">≋ <span>Andamento e etapas</span></button>`;
      tabs.addEventListener('click', event => {
        const button = event.target.closest('[data-map-dashboard-tab]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        applyMode(button.dataset.mapDashboardTab);
      });
      tabs.addEventListener('pointerdown', event => event.stopPropagation());
      dock.prepend(tabs);
    }

    dock.querySelector(':scope > .dashboard-action-bar')?.classList.add('map-progress-only');
    dock.querySelector(':scope > stage-cash-dashboard')?.classList.add('map-progress-only');
    dock.querySelector(':scope > .highlight-status-widget')?.classList.add('map-progress-only');
    dock.querySelector(':scope > map-filter-rail')?.classList.add('map-visualization-only');
    applyMode(currentMode, false);
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; install(); });
  };

  new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['data-view']});
  globalThis.BelavistaMapDashboardTabs = {setMode: applyMode, getMode: () => currentMode, sync: schedule};
  schedule();
})();
