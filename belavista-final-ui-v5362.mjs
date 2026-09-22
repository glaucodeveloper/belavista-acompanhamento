// BELAVISTA_FINAL_UI_RUNTIME_V5362
(() => {
  if (globalThis.__BELAVISTA_FINAL_UI_RUNTIME_V5362) return;
  globalThis.__BELAVISTA_FINAL_UI_RUNTIME_V5362 = true;

  let busy = false;
  let entryLoopIssued = false;

  const stripManualAi = (root = document) => {
    root.querySelectorAll?.(
      '[data-v5360-inference-test],[data-stage-ai-toggle],[data-ai-suggestions],[data-stage-suggestions]'
    ).forEach(el => el.remove());

    root.querySelectorAll?.('button').forEach(button => {
      const t = String(button.textContent || '').replace(/\s+/g, ' ').trim();
      if (/Testar inferência/i.test(t) || /^(?:IA:\s*)?Sugestões$/i.test(t)) button.remove();
    });
  };

  const organizeLeads = () => {
    const view = document.querySelector('view-layer[data-view="leads"]');
    const board = view?.querySelector('.leads-crm-board');
    if (!board) return;
    const main = board.closest('.leads-reference-page') || board.closest('main') || board.parentElement;
    if (!main) return;

    // CRM precisa começar em top:0 do container útil, antes da cena.
    if (main.firstElementChild !== board) main.prepend(board);
    board.dataset.v5362Top = 'true';
  };

  const publicPhases = `
    <section class="public-institutional-phases-v5363" data-public-phases-v5363>
      <header><span>ALIANÇA PARK · JORNADA COMERCIAL</span><h2>Fases de preenchimento</h2>
      <p>Da escolha do lote à formalização da reserva.</p></header>
      <div>
        <article><b>01</b><span><strong>Escolha</strong><small>Lote e posição de interesse</small></span></article>
        <article><b>02</b><span><strong>Qualificação</strong><small>Objetivo, faixa e prioridade</small></span></article>
        <article><b>03</b><span><strong>Identificação</strong><small>Contato e dados cadastrais</small></span></article>
        <article><b>04</b><span><strong>Reserva</strong><small>Condição, lote e sinal</small></span></article>
        <article><b>05</b><span><strong>Documentação</strong><small>Conferência e comprovações</small></span></article>
        <article><b>06</b><span><strong>Fechamento</strong><small>Encaminhamento e formalização</small></span></article>
      </div>
    </section>`;

  const installPublicPhases = () => {
    if (document.querySelector('[data-public-phases-v5363]')) return;
    const heading = [...document.querySelectorAll('h1,h2,h3')]
      .find(node => /Selos do loteamento/i.test(String(node.textContent || '')));
    const section = heading?.closest('section');
    if (!section) return;
    section.insertAdjacentHTML('afterend', publicPhases);
  };

  const force = (viewName, marker, method) => {
    const view = document.querySelector(`view-layer[data-view="${viewName}"]`);
    if (!view || view.querySelector(`.${marker}`) || typeof view[method] !== 'function') return;
    try {
      view.innerHTML = view[method]();
      view.bind?.();
    } catch (error) {
      console.warn(`[v5.3.62] force ${viewName}`, error);
    }
  };

  const removeLegacyStageUi = () => {
    const view = document.querySelector('view-layer[data-view="stages"]');
    view?.querySelectorAll(
      '.stage-view-tabs,.stage-plan-tabs,[data-stage-pane],.planning-gantt,.gantt-operational-tools,' +
      '.stage-focus-canvas,.stage-plan-utilities'
    ).forEach(el => {
      if (!el.closest('.stage-calendar-page-v5362')) el.remove();
    });
  };

  const enableMap = () => {
    const view = document.querySelector('view-layer[data-view="map"]');
    const map = document.querySelector(
      '.scene>map-scene[data-persistent-map],.scene>map-scene[data-admin-shared-public-map]'
    );
    if (!view || !map) return;
    view.dataset.v5362MapOverlay = 'transparent';
    map.dataset.v5362Controls = 'enabled';
    const canvas = map.querySelector('.three-overlay');
    if (canvas) {
      canvas.style.pointerEvents = 'auto';
      canvas.style.touchAction = 'none';
    }
  };

  const ensureLiveInference = () => {
    if (entryLoopIssued) return;
    const view = document.querySelector('view-layer');
    if (!view || typeof view.runOperationalLoop !== 'function') return;
    entryLoopIssued = true;
    Promise.resolve(view.runOperationalLoop('client.entry-v5362', { quiet: true }))
      .catch(error => console.info('[v5.3.62] operational entry', error));
    view.startOperationalLoopTicker?.();
  };

  const enforce = () => {
    if (busy) return;
    busy = true;
    try {
      stripManualAi();
      organizeLeads();
      installPublicPhases();
      force('stages', 'stage-calendar-page-v5362', 'stages');
      force('records', 'records-table-page-v5362', 'records');
      force('map', 'dashboard-map-v5362', 'map');
      removeLegacyStageUi();
      enableMap();
      ensureLiveInference();
    } finally {
      busy = false;
    }
  };

  const run = () => queueMicrotask(enforce);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  [500, 1800, 4200].forEach(delay => setTimeout(() => {
    globalThis.installBelavistaFinalUiV5362?.();
    enforce();
  }, delay));
  // v5.3.66: whole-document MutationObserver removido.
})();
