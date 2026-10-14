const requireDependencies = (dependencies) => {
  if (!dependencies?.appStore || typeof dependencies.appStore.get !== "function" || typeof dependencies.appStore.set !== "function")
    throw new TypeError("Dashboard home context requires appStore.get() and set().");
  if (!Array.isArray(dependencies.dashboardFilters) || !dependencies.dashboardFilters.length)
    throw new TypeError("Dashboard home context requires dashboardFilters.");
  if (typeof dependencies.documentRef?.querySelector !== "function")
    throw new TypeError("Dashboard home context requires documentRef.querySelector().");
  return dependencies;
};

/** Keep the dashboard timeline first and bind its map-context links. */
export const installDashboardHomeContextV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype !== "object")
    throw new TypeError("Dashboard home context requires ViewLayer.prototype.");
  const { appStore, dashboardFilters, documentRef } = requireDependencies(dependencies);

  const baseRender = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = baseRender?.apply(this, args);
    const home = this.querySelector(".dashboard-carbon-home"),
      head = home?.querySelector(".dashboard-carbon-head"),
      timeline = home?.querySelector(".dashboard-stage-timeline");
    if (home && head && timeline) head.after(timeline);
    return result;
  };

  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind?.apply(this, args);
    this.querySelectorAll("[data-map-widget-context]").forEach((button) => {
      if (button.dataset.mapWidgetContextBound === "true" || button.closest("map-filter-rail"))
        return;
      button.dataset.mapWidgetContextBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const source = button.closest("[data-map-summary-widget],[data-highlight-status]"),
          key = source?.dataset.mapSummaryKey || source?.dataset.highlightStatus || appStore.get().mapFilter || "execution",
          filter = dashboardFilters.find((item) => item[0] === key) || dashboardFilters[0],
          nextView = button.dataset.mapWidgetContext || "map";
        if (key === "progress") {
          const map = documentRef.querySelector("map-scene[data-dashboard-operational-map]") ||
            documentRef.querySelector("map-scene:not([compact])");
          map?.setMapSelectionMode("progress");
        }
        appStore.set({
          view: nextView,
          mapFilterWidget: key,
          lastAction: `Abriu contexto de ${filter[1]} no mapa`,
        });
      });
    });
    return result;
  };
  return ViewLayer;
};
