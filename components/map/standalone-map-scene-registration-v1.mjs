import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import { createMapSceneElementV1 } from './map-scene-registration-v1.mjs?v=ts-map-scene-registration-owner-v1&ts-admin-map-georeference-bindings-direct-composer-v1&ts-map-domain-helper-wiring-direct-v1&ts-admin-map-sync-devtools-ts-owner-v1&ts-map-pdf-artwork-owner-v1&ts-map-scene-state-catalogs-direct-v1&ts-map-pure-admin-map-fallbacks-v1';
import { registerStandaloneMapSceneV1 as registerLegacyStandaloneMapSceneV1 } from './standalone-map-scene-registration-legacy-v1.mjs?v=ts-standalone-map-scene-registration-fallback-v1&ts-admin-map-georeference-bindings-direct-composer-v1';

/** Register only the composed map scene for standalone Worker activity surfaces. */
export async function registerStandaloneMapSceneV1(customElementsRef = globalThis.customElements) {
  const typedOwner = atlasComponentsTsV1.registerAtlasStandaloneMapSceneV1;
  if (typeof typedOwner === "function") {
    return await typedOwner({ customElementsRef, createMapSceneElement: createMapSceneElementV1 });
  }
  return await registerLegacyStandaloneMapSceneV1(customElementsRef);
}
