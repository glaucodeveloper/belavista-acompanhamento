// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedRoadGeometryV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.assertAtlasAdminRoadGeometryDependenciesV1 !== "function" ||
      typeof components.installAtlasAdminRoadGeometryV1 !== "function")
    throw new TypeError("Typed administrative road geometry owner is unavailable.");
  typedRoadGeometryV1 = components;
} catch {
  typedRoadGeometryV1 = null;
}
const recoveryRoadGeometryV1 = await import("./admin-road-geometry-legacy-v1.mjs");

export const assertAdminRoadGeometryDependenciesV1 = (...args) =>
  typedRoadGeometryV1
    ? typedRoadGeometryV1.assertAtlasAdminRoadGeometryDependenciesV1(...args)
    : recoveryRoadGeometryV1.assertAdminRoadGeometryDependenciesV1(...args);

export const installAdminRoadGeometryV1 = (...args) => {
  if (!typedRoadGeometryV1) return recoveryRoadGeometryV1.installAdminRoadGeometryV1(...args);
  try {
    return typedRoadGeometryV1.installAtlasAdminRoadGeometryV1(...args);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS de geometria viária indisponível; usando recuperação MJS.", error);
    return recoveryRoadGeometryV1.installAdminRoadGeometryV1(...args);
  }
};
