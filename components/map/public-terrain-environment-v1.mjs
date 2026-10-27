// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedTerrainV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.assertAtlasPublicTerrainEnvironmentDependenciesV1 !== "function" ||
      typeof components.installAtlasPublicTerrainEnvironmentV1 !== "function")
    throw new TypeError("Typed public terrain owner is unavailable.");
  typedTerrainV1 = components;
} catch {
  typedTerrainV1 = null;
}
const recoveryTerrainV1 = await import("./public-terrain-environment-legacy-v1.mjs");

export const assertPublicTerrainEnvironmentDependenciesV1 = (...args) =>
  typedTerrainV1
    ? typedTerrainV1.assertAtlasPublicTerrainEnvironmentDependenciesV1(...args)
    : recoveryTerrainV1.assertPublicTerrainEnvironmentDependenciesV1(...args);

export const installPublicTerrainEnvironmentV1 = (...args) => {
  if (!typedTerrainV1) return recoveryTerrainV1.installPublicTerrainEnvironmentV1(...args);
  try {
    return typedTerrainV1.installAtlasPublicTerrainEnvironmentV1(...args);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS de terreno público indisponível; usando recuperação MJS.", error);
    return recoveryTerrainV1.installPublicTerrainEnvironmentV1(...args);
  }
};
