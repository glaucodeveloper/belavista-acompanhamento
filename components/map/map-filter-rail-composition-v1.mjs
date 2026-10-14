import { createMapFilterRail } from "./filter-rail.mjs?v=focused-event-generators-v2";
import { createDashboardFilterCatalogV1 } from "./dashboard-filter-catalog-v1.mjs?v=dashboard-filter-catalog-v1";

/** Compose the map filter catalog and its custom element at the map boundary. */
export const installMapFilterRailCompositionV1 = ({
  appStore,
  dashboardModeKeyV1,
  dashboardModes,
  demoData,
  esc,
  ico,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  globalRef = globalThis,
  customElementsRef = globalThis.customElements,
} = {}) => {
  const catalog = createDashboardFilterCatalogV1({
    demoData,
    dashboardModeKeyV1,
    esc,
    ico,
    documentRef,
    windowRef,
    globalRef,
  });
  const MapFilterRail = createMapFilterRail({
    appStore,
    dashboardModeKeyV1,
    dashboardFiltersForModeV1: catalog.dashboardFiltersForModeV1,
    mapFilterSelectionKeyV1: catalog.mapFilterSelectionKeyV1,
    dashboardModes,
    esc,
    mapFilterSummaryMarkupV1: catalog.mapFilterSummaryMarkupV1,
    ico,
    dashboardFilterForModeV1: catalog.dashboardFilterForModeV1,
    dashboardFilters: catalog.dashboardFilters,
  });
  if (!customElementsRef.get("map-filter-rail"))
    customElementsRef.define("map-filter-rail", MapFilterRail);

  catalog.installProgressSummaryFallbackV1(appStore);
  return Object.freeze({ ...catalog, MapFilterRail });
};
