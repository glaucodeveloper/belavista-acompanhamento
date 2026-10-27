import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import { installMapSceneCompositionV1, createMapSceneElementV1 as createLegacyMapSceneElementV1 } from "./map-scene-registration-legacy-v1.mjs?v=ts-map-scene-registration-fallback-v2&ts-admin-map-georeference-bindings-direct-composer-v1&ts-admin-map-sync-devtools-ts-owner-v1&ts-map-pdf-artwork-owner-v1&ts-map-scene-state-catalogs-direct-v1&ts-map-pure-admin-map-fallbacks-v1&ts-map-scene-port-composition-owner-v1&ts-map-scene-async-recovery-v1";

/** Create the shared map custom element only after all map methods are composed. */
export const createMapSceneElementV1 = (options = {}) => {
  const typedOwner = atlasComponentsTsV1.createAtlasMapSceneElementV1;
  if (typeof typedOwner === "function") {
    return typedOwner({
      ...options,
      composeMapSceneV1: options.composeMapSceneV1 || installMapSceneCompositionV1,
    });
  }
  return createLegacyMapSceneElementV1(options);
};
