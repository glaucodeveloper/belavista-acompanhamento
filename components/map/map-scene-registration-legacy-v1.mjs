import { installMapSceneCompositionV1 } from "./map-scene-composition-v1.mjs?v=pdf-detail-zoom-v1&shared-admin-artwork-v1&vector-map-label-v1&ts-lot-widget-v1&ts-projection-v2-homography&ts-asset-loader-v1&ts-assistant-context-v1&ts-route-policy-v1&ts-sidebar-command-v1&ts-public-overlay-fit-v1&ts-public-overlay-svg-v1&ts-public-marker-v1&ts-public-marker-status-v1&ts-public-marker-interactions-v1&ts-public-widget-actions-v1&ts-public-background-v1&ts-masterplan-frame-sync-v1&ts-masterplan-frame-binding-v1&ts-admin-map-pointer-owner-v1&ts-scene-presentation-config-v1&ts-map-projection-math-v1&ts-admin-map-georeference-config-v1&ts-admin-dwg-georeference-loader-v1&ts-static-satellite-gestures-v1&ts-map-startup-loading-v1&ts-map-loading-screen-v1&ts-map-loading-image-injection-v1&ts-map-context-extension-adapter-v1&ts-map-pdf-semantic-layer-asset-v1&ts-map-solar-lighting-v1&ts-map-camera-state-v1&ts-map-surface-status-v1&ts-map-scene-context-tilt-v1&ts-map-camera-framing-v1&ts-admin-masterplan-overlay-ts-owner-v1&ts-lot-svg-overlay-interactions-v1&ts-map-lot-marker-widget-interactions-v1&ts-map-marker-batch-renderer-v1&ts-map-marker-status-subscription-v1&ts-map-scene-connection-v1&ts-map-three-foundation-v1&ts-map-three-gestures-v1&ts-map-three-init-owner-v1&ts-map-dwg-georeference-owner-v1&ts-map-masterplan-glb-loader-v1&ts-map-masterplan-gpu-enrichment-v1&ts-map-model-client-cache-v1&ts-map-pdf-geometry-projection-v1&ts-admin-pdf-texture-binding-v1&ts-admin-pdf-layer-builder-v1&ts-admin-pdf-underlay-v1&ts-admin-pdf-anchor-projection-v1&ts-map-scene-navigation-owner-v1&ts-map-stage-overlay-owner-v1&ts-map-dashboard-mode-highlight-owner-v1&ts-map-interaction-composition-v1&ts-map-asset-composition-v1&ts-map-foundation-composition-v1&ts-map-pdf-three-admin-owners-v1&ts-public-map-presentation-owners-v1&ts-admin-road-geometry-owner-v1&ts-admin-standalone-map-owners-v1&ts-ai-chat-owner-v1&ts-stage-record-center-owner-v1&ts-map-scene-sync-owner-v1&ts-map-raster-context-owner-v1&ts-map-camera-lifecycle-owner-v1&ts-compact-map-owners-v1&ts-reference-aerial-scene-owner-v1&ts-operational-record-map-owner-v1&ts-admin-model-calibration-owner-v1&ts-map-gpu-enrichment-owner-v1&ts-public-map-selection-input-owner-v1&ts-static-base-timer-bridge-v1&ts-worker-context-chat-inference-v1&ts-repasse-catalog-map-owner-v1&ts-map-runtime-composition-owner-v1&ts-map-tile-source-catalog-owner-v1&ts-map-assistant-context-actions-owner-v1&ts-map-interaction-owners-only-v2&ts-map-lot-plan-owner-v1&ts-map-foundation-ts-only-v1&ts-map-camera-lifecycle-ts-only-v1&ts-map-interaction-owners-ts-only-v2&ts-map-asset-installers-ts-only-v2&ts-map-coordinate-policy-v1&ts-map-scene-composition-component-owner-v2&ts-admin-georeference-bindings-owner-v1&ts-map-pdf-legends-components-owner-v1&ts-map-asset-road-math-ts-owner-v1&ts-map-asset-profile-ts-owner-v1&ts-admin-map-georeference-bindings-direct-composer-v1&ts-map-domain-helper-wiring-direct-v1&ts-admin-map-sync-devtools-ts-owner-v1&ts-map-pdf-artwork-owner-v1&ts-map-scene-state-catalogs-direct-v1&ts-map-pure-admin-map-fallbacks-v1&ts-map-scene-port-composition-owner-v1&ts-map-scene-async-recovery-v1";
export { installMapSceneCompositionV1 };

/** Create the shared map custom element only after all map methods are composed. */
export const createMapSceneElementV1 = async ({
  HTMLElementCtor = globalThis.HTMLElement,
  dashboardFilterForModeV1,
  dashboardModeKeyV1,
  REPASSE_PRICE_CATALOG = [],
  composeMapSceneV1 = installMapSceneCompositionV1,
} = {}) => {
  if (typeof HTMLElementCtor !== "function")
    throw new TypeError("MapScene registration requires the browser HTMLElement constructor.");
  class MapScene extends HTMLElementCtor {
    // Map behavior is installed by the map modules before custom-element registration.
  }
  const mapSceneHelpers = await composeMapSceneV1(MapScene, {
    dashboardFilterForModeV1: (...args) => dashboardFilterForModeV1(...args),
    dashboardModeKeyV1,
    REPASSE_PRICE_CATALOG,
  });
  return Object.freeze({ MapScene, ...mapSceneHelpers });
};
