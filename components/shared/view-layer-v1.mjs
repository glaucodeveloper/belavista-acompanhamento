// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedViewLayerV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.createAtlasLegacyViewLayerV1 !== "function")
    throw new TypeError("Typed ViewLayer owner is unavailable.");
  typedViewLayerV1 = components.createAtlasLegacyViewLayerV1;
} catch {
  typedViewLayerV1 = null;
}
const recoveryViewLayerV1 = await import("./view-layer-legacy-v1.mjs");

export const createViewLayerV1 = (...args) => {
  if (!typedViewLayerV1) return recoveryViewLayerV1.createViewLayerV1(...args);
  try {
    return typedViewLayerV1(...args);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS de ViewLayer indisponível; usando recuperação MJS.", error);
    return recoveryViewLayerV1.createViewLayerV1(...args);
  }
};
