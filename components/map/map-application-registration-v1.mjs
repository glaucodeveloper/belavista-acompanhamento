import { installMapFilterRailCompositionV1 } from "./map-filter-rail-composition-v1.mjs?v=map-filter-rail-composition-v2-ts";
import { createMapSceneElementV1 } from "./map-scene-registration-v1.mjs?v=map-scene-registration-v5-ts-asset-loader&ts-worker-context-chat-inference-v1&pdf-marker-anchors-v1&pdf-yellow-circles-v4&detail-raster-v2&vector-map-label-v1&ts-public-overlay-fit-v1&ts-public-overlay-svg-v1&ts-public-marker-v1&ts-public-marker-status-v1&ts-public-marker-interactions-v1&ts-public-widget-actions-v1&ts-public-background-v1&ts-masterplan-frame-sync-v1&ts-masterplan-frame-binding-v1&ts-admin-map-pointer-owner-v1&ts-scene-presentation-config-v1&ts-map-projection-math-v1&ts-admin-map-georeference-config-v1&ts-admin-dwg-georeference-loader-v1&ts-static-satellite-gestures-v1&ts-map-startup-loading-v1&ts-map-loading-screen-v1&ts-map-solar-lighting-v1&ts-map-camera-state-v1&ts-map-surface-status-v1&ts-map-scene-context-tilt-v1&ts-map-camera-framing-v1&ts-admin-masterplan-overlay-ts-owner-v1&ts-map-scene-connection-v1&ts-map-three-foundation-v1&ts-map-three-gestures-v1&ts-map-three-init-owner-v1&ts-map-dwg-georeference-owner-v1&ts-map-masterplan-glb-loader-v1&ts-map-masterplan-gpu-enrichment-v1&ts-map-model-client-cache-v1&ts-map-pdf-geometry-projection-v1&ts-admin-pdf-texture-binding-v1&ts-admin-pdf-layer-builder-v1&ts-admin-pdf-underlay-v1&ts-admin-pdf-anchor-projection-v1&ts-map-scene-navigation-owner-v1&ts-map-stage-overlay-owner-v1&ts-map-dashboard-mode-highlight-owner-v1&ts-map-interaction-composition-v1&ts-map-asset-composition-v1&ts-map-foundation-composition-v1&ts-public-map-presentation-owners-v1&ts-admin-road-geometry-owner-v1&ts-admin-standalone-map-owners-v1&ts-ai-chat-owner-v1&ts-stage-record-center-owner-v1&ts-map-scene-sync-owner-v1&ts-map-raster-context-owner-v1&ts-map-camera-lifecycle-owner-v1&ts-compact-map-owners-v1&ts-reference-aerial-scene-owner-v1&ts-operational-record-map-owner-v1&ts-admin-model-calibration-owner-v1&ts-map-gpu-enrichment-owner-v1&ts-public-map-selection-input-owner-v1&ts-static-base-timer-bridge-v1&ts-repasse-catalog-map-owner-v1&ts-map-interaction-owners-only-v2&ts-map-foundation-ts-only-v1&ts-map-camera-lifecycle-ts-only-v1&ts-map-coordinate-policy-v1&ts-map-element-registration-owner-v1&ts-admin-map-georeference-bindings-direct-composer-v1&ts-map-domain-helper-wiring-direct-v1&ts-admin-map-sync-devtools-ts-owner-v1&ts-map-pdf-artwork-owner-v1&ts-map-scene-state-catalogs-direct-v1&ts-map-pure-admin-map-fallbacks-v1&ts-map-scene-async-recovery-v1";
import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";

/** Register the map page's filters and physical scene as one map-owned surface. */
export const installMapApplicationRegistrationV1 = async (input = {}) => {
  const {
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
  } = input;
  const typedOwner = atlasComponentsTsV1.installAtlasMapApplicationRegistrationV1;
  if (typeof typedOwner === "function")
    return await typedOwner({
      appStore,
      REPASSE_PRICE_CATALOG: input.REPASSE_PRICE_CATALOG,
      demoData,
      dashboardModeKeyV1,
      dashboardModes,
      esc,
      ico,
      documentRef,
      windowRef,
      customElementsRef,
      HTMLElementCtor,
      installMapFilterRail,
      createMapSceneElement,
    });

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
  const mapScene = await createMapSceneElement({
    HTMLElementCtor,
    dashboardFilterForModeV1: filterCatalog.dashboardFilterForModeV1,
    dashboardModeKeyV1,
    REPASSE_PRICE_CATALOG: input.REPASSE_PRICE_CATALOG,
  });

  return Object.freeze({ ...filterCatalog, ...mapScene });
};
