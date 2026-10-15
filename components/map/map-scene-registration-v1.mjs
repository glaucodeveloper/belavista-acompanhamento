import { installMapSceneCompositionV1 } from "./map-scene-composition-v1.mjs?v=map-scene-composition-v2&pdf-marker-anchors-v1&pdf-yellow-circles-v3";

/** Create the shared map custom element only after all map methods are composed. */
export const createMapSceneElementV1 = ({
  HTMLElementCtor = globalThis.HTMLElement,
  dashboardFilterForModeV1,
  dashboardModeKeyV1,
  composeMapSceneV1 = installMapSceneCompositionV1,
} = {}) => {
  if (typeof HTMLElementCtor !== "function")
    throw new TypeError("MapScene registration requires the browser HTMLElement constructor.");
  class MapScene extends HTMLElementCtor {
    // Map behavior is installed by the map modules before custom-element registration.
  }
  const mapSceneHelpers = composeMapSceneV1(MapScene, {
    dashboardFilterForModeV1: (...args) => dashboardFilterForModeV1(...args),
    dashboardModeKeyV1,
  });
  return Object.freeze({ MapScene, ...mapSceneHelpers });
};
