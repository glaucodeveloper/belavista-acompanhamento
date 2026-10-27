// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedSatelliteLotPlanOverlayV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.installAtlasSatelliteLotPlanOverlayV1 !== "function")
    throw new TypeError("Typed satellite lot overlay owner is unavailable.");
  typedSatelliteLotPlanOverlayV1 = components.installAtlasSatelliteLotPlanOverlayV1;
} catch {
  typedSatelliteLotPlanOverlayV1 = null;
}
const recoverySatelliteLotPlanOverlayV1 = await import("./satellite-lot-plan-overlay-legacy-v1.mjs");

export const installSatelliteLotPlanOverlayV1 = (...args) => {
  if (!typedSatelliteLotPlanOverlayV1)
    return recoverySatelliteLotPlanOverlayV1.installSatelliteLotPlanOverlayV1(...args);
  try {
    return typedSatelliteLotPlanOverlayV1(...args);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS do overlay PDF/satélite indisponível; usando recuperação MJS.", error);
    return recoverySatelliteLotPlanOverlayV1.installSatelliteLotPlanOverlayV1(...args);
  }
};
