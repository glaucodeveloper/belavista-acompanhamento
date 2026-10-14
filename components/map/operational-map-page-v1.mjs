/** Render the active operational-map page from its injected filter state. */
export const createOperationalMapPageV1 = ({ appStore, highlightStatus, esc } = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Operational map page requires appStore.get().");
  if (!highlightStatus || typeof highlightStatus !== "object")
    throw new TypeError("Operational map page requires the highlight status catalog.");
  if (typeof esc !== "function")
    throw new TypeError("Operational map page requires esc().");

  return function renderOperationalMapPageV1() {
    const filter = appStore.get().mapFilter || "execution",
      status = highlightStatus[filter] || highlightStatus.execution,
      progress = Math.max(0, Math.min(100, Number(status.progress) || 0));
    return `<map-scene data-operational-map-page="true" data-base-map data-public-map="true" data-admin-public-map="true" data-public-static-only="true" data-public-static-capture="/assets/public/dwg-satellite-treated-v5411.png" data-stage="Aliança Park" data-overlay="urbanizacao" aria-label="Mapa operacional do loteamento sobre imagem de satélite"></map-scene><section class="admin-public-map-interface-v5352 operational-map-highlights-v5370" data-highlight-family="operational" data-highlight-key="${esc(filter)}" aria-label="Mapa operacional com destaques físicos">
    <aside class="admin-public-map-status-v5352" data-highlight-status="${esc(filter)}" aria-live="polite">
      <span>${esc(status.eyebrow)}</span>
      <header><div><h2>${esc(status.title)}</h2><small>${esc(status.status)}</small></div><b>${progress}%</b></header>
      <i><em style="width:${progress}%"></em></i>
      <p>${esc(status.detail)}</p>
      <div class="operational-map-highlight-meta-v5370"><span>APLICADO NO MAPA</span><b>${esc(status.priority)}</b></div>
      <footer><small>${esc(status.next)}</small><button type="button" data-map-widget-context="${esc(status.view)}">Abrir contexto</button></footer>
    </aside>
    <map-filter-rail></map-filter-rail>
  </section>`;
  };
};

/** Install the final operational-map renderer on the shared view layer. */
export const installOperationalMapPageV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype)
    throw new TypeError("Operational map page requires the shared ViewLayer constructor.");
  const renderOperationalMapPageV1 = createOperationalMapPageV1(dependencies);
  ViewLayer.prototype.map = renderOperationalMapPageV1;
  return renderOperationalMapPageV1;
};
