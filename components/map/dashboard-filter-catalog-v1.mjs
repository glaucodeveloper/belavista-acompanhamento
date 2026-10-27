/** Map dashboard filter catalog and the summaries rendered by MapFilterRail. */
import mapFilterCatalogData from "../../frontend/src/data/map-filter-catalog.json" with { type: "json" };

export const createDashboardFilterCatalogV1 = ({
  demoData,
  dashboardModeKeyV1,
  esc,
  ico,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  globalRef = globalThis,
} = {}) => {
  if (typeof dashboardModeKeyV1 !== "function" || typeof esc !== "function" || typeof ico !== "function")
    throw new TypeError("Dashboard filter catalog requires mode, escape and icon services.");
  if (!demoData?.metrics || !Array.isArray(demoData.activities))
    throw new TypeError("Dashboard filter catalog requires application metrics and activities.");

  const dashboardFilters = mapFilterCatalogData.filters;
  const highlightStatus = mapFilterCatalogData.highlights;
  const dashboardModeFiltersV1 = mapFilterCatalogData.modes;
  const dashboardFiltersForModeV1 = (mode) =>
    dashboardModeFiltersV1[dashboardModeKeyV1(mode)] || dashboardModeFiltersV1.tracking;
  const dashboardFilterForModeV1 = (key, mode = dashboardModeKeyV1()) =>
    dashboardFiltersForModeV1(mode).find((item) => item[0] === key) || null;
  const mapFilterSelectionKeyV1 = (state) => {
    const allowed = new Set(dashboardFiltersForModeV1(state?.dashboardMode).map((item) => item[0]));
    const candidates = [
      state?.mapFilterWidget,
      state?.mapFilter,
      ...(Array.isArray(state?.mapFilters) ? state.mapFilters.slice().reverse() : []),
    ];
    return candidates.find((key) => allowed.has(key)) || null;
  };
  const mapFilterSummaryMetricsV1 = (key, state) => {
    const records = Array.isArray(state.records) ? state.records : [];
    const notifications = Array.isArray(state.operationalNotifications) ? state.operationalNotifications : [];
    const leads = Array.isArray(state.publicLeads) ? state.publicLeads : [];
    const demoMetrics = demoData.metrics || {};
    const activities = Array.isArray(demoData.activities) ? demoData.activities : [];
    const sourceValues = {
      "records.count": records.length || 1,
      "demoData.metrics.collaborators": demoMetrics.collaborators || 0,
      "leads.count-or-demo-leads": leads.length || demoMetrics.leads || 0,
      "notifications.count-or-three": notifications.length || 3,
      "demoData.activities.count": activities.length,
    };
    const definitions = mapFilterCatalogData.metrics[key] || mapFilterCatalogData.metrics.execution;
    return definitions.map(([label, rawValue, detail]) => [
      label,
      typeof rawValue === "string" ? rawValue : String(sourceValues[rawValue.source] ?? rawValue.fallback ?? ""),
      detail,
    ]);
  };
  const mapProgressSummaryMarkupV1 = (state) => {
    const areas = Array.isArray(state.mapProgressSelection) ? state.mapProgressSelection : [];
    const selectedStage = String(state.selectedStage ?? "");
    const stages = Array.isArray(demoData.activities) ? demoData.activities : [];
    const areaMarkup = areas.length
      ? `<div class="map-filter-progress-areas">${areas.slice(0, 5).map((area) => `<span>${esc(area.label || area.partId)}</span>`).join("")}${areas.length > 5 ? `<span>+${areas.length - 5} áreas</span>` : ""}</div>`
      : '<p class="map-filter-progress-empty">Nenhuma área poligonal selecionada. Clique em “Selecionar áreas” e marque um ou mais polígonos no mapa.</p>';
    const stageMarkup = stages.map((stage, index) => {
      const progress = Math.max(0, Math.min(100, Number(stage.progress) || 0));
      const active = String(stage.id) === selectedStage;
      const stateLabel = progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada";
      return `<div class="map-filter-progress-stage ${active ? "selected" : ""}"><div><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(stage.name)}</b><em>${stateLabel}</em></div><i><strong style="width:${progress}%"></strong></i><small>${progress}%</small></div>`;
    }).join("");
    return `<section class="map-filter-progress-context" data-map-progress-context><header><span>ÁREAS POLIGONAIS SELECIONADAS</span><b>${areas.length}</b></header>${areaMarkup}<div class="map-filter-progress-list" aria-label="Progresso das etapas">${stageMarkup}</div><div class="map-filter-progress-actions"><button type="button" class="ghost" data-map-progress-start>${ico("scan-search")} ${areas.length ? "Adicionar áreas" : "Selecionar áreas"}</button>${areas.length ? `<button type="button" class="primary" data-map-progress-entry>${ico("clipboard-pen-line")} Registrar avanço</button><button type="button" class="map-filter-progress-clear" data-map-progress-clear>Limpar</button>` : ""}</div></section>`;
  };
  const mapFilterSummaryMarkupV1 = (key, state) => {
    const filter = dashboardFilterForModeV1(key, state.dashboardMode) || dashboardFilters[0];
    const status = highlightStatus[key] || highlightStatus.execution;
    if (!filter) return "";
    const metrics = mapFilterSummaryMetricsV1(key, state);
    return `<aside class="map-filter-summary-widget" id="map-filter-summary-${esc(key)}" data-map-summary-widget data-map-summary-key="${esc(key)}" aria-live="polite"><header><div><span>RESUMO DA CAMADA</span><h3>${ico(filter[2])} ${esc(filter[1])}</h3></div><button type="button" data-map-widget-close aria-label="Fechar resumo de ${esc(filter[1])}">×</button></header><div class="map-filter-summary-metrics">${metrics.map(([label, value, detail]) => `<div><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(detail)}</span></div>`).join("")}</div><p>${esc(status.detail)}</p>${key === "progress" ? mapProgressSummaryMarkupV1(state) : ""}<footer><small>${esc(status.next)}</small><button type="button" data-map-widget-context="${esc(status.view)}">Abrir contexto ${ico("arrow-up-right")}</button></footer></aside>`;
  };
  const installProgressSummaryFallbackV1 = (appStore) => {
    const refresh = () => {
      const state = appStore.get();
      if (state.mapFilterWidget !== "progress") return;
      documentRef
        .querySelectorAll('[data-map-summary-key="progress"]')
        .forEach((widget) => {
          widget.querySelector("[data-map-progress-context]")?.remove();
          const footer = widget.querySelector("footer");
          if (footer) footer.insertAdjacentHTML("beforebegin", mapProgressSummaryMarkupV1(state));
          else widget.insertAdjacentHTML("beforeend", mapProgressSummaryMarkupV1(state));
          windowRef.lucide?.createIcons?.();
        });
    };
    if (!globalRef.__belavistaProgressSummaryFallbackV1) {
      globalRef.__belavistaProgressSummaryFallbackV1 = true;
      appStore.subscribe(refresh);
      documentRef.addEventListener("click", (event) => {
        const button = event.target.closest?.("[data-map-progress-start],[data-map-progress-clear],[data-map-progress-entry]");
        if (!button || button.dataset.mapProgressActionBound === "true") return;
        event.preventDefault();
        event.stopPropagation();
        const map = documentRef.querySelector("map-scene[data-dashboard-operational-map]") || documentRef.querySelector("map-scene:not([compact])");
        if (button.hasAttribute("data-map-progress-start")) {
          map?.setMapSelectionMode("progress");
          appStore.set({ mapFilterWidget: "progress", lastAction: "Ativou seleção de áreas para leitura de progresso" });
        } else if (button.hasAttribute("data-map-progress-clear")) {
          map?.clearProgressAreaSelectionV1?.(true);
        } else {
          const parts = map?.progressSelectionParts?.length ? map.progressSelectionParts : map?.progressAreaPartsFromStoreV1?.();
          if (parts?.length) map.renderProgressSelectionPanel(parts);
          else map?.setMapSelectionMode("progress");
        }
      }, true);
    }
    refresh();
  };

  return Object.freeze({
    dashboardFilters,
    highlightStatus,
    dashboardModeFiltersV1,
    dashboardFiltersForModeV1,
    dashboardFilterForModeV1,
    mapFilterSelectionKeyV1,
    mapFilterSummaryMetricsV1,
    mapProgressSummaryMarkupV1,
    mapFilterSummaryMarkupV1,
    installProgressSummaryFallbackV1,
  });
};
