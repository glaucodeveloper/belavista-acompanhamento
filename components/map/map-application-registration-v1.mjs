import { installMapFilterRailCompositionV1 } from "./map-filter-rail-composition-v1.mjs?v=map-filter-rail-composition-v1";
import { createMapSceneElementV1 } from "./map-scene-registration-v1.mjs?v=map-scene-registration-v2&pdf-marker-anchors-v1&pdf-yellow-circles-v3";

/** Register the map page's filters and physical scene as one map-owned surface. */
export const installMapApplicationRegistrationV1 = ({
  appStore,
  demoData,
  dashboardModeKeyV1,
  dashboardModes,
  esc,
  ico,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  globalRef = globalThis,
  customElementsRef = globalThis.customElements,
  HTMLElementCtor = globalThis.HTMLElement,
  installMapFilterRail = installMapFilterRailCompositionV1,
  createMapSceneElement = createMapSceneElementV1,
} = {}) => {
  const filterCatalog = installMapFilterRail({
    appStore,
    dashboardModeKeyV1,
    dashboardModes,
    demoData,
    esc,
    ico,
    documentRef,
    windowRef,
    globalRef,
    customElementsRef,
  });
  const mapScene = createMapSceneElement({
    HTMLElementCtor,
    dashboardFilterForModeV1: filterCatalog.dashboardFilterForModeV1,
    dashboardModeKeyV1,
  });

  return Object.freeze({ ...filterCatalog, ...mapScene });
};
