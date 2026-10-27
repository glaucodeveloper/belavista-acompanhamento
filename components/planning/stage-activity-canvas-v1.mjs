// Compatibility edge; keep the MJS controller available until the stage route is validated.
let typedStageActivityCanvasV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.installAtlasStageActivityCanvasV1 !== "function")
    throw new TypeError("Typed stage activity canvas owner is unavailable.");
  typedStageActivityCanvasV1 = components.installAtlasStageActivityCanvasV1;
} catch {
  typedStageActivityCanvasV1 = null;
}
const recoveryStageActivityCanvasV1 = await import("./stage-activity-canvas-legacy-v1.mjs");

export const installStageActivityCanvasV1 = (ViewLayer, dependencies = {}) => {
  if (!typedStageActivityCanvasV1)
    return recoveryStageActivityCanvasV1.installStageActivityCanvasV1(ViewLayer, dependencies);
  const typedDependencies = {
    ...dependencies,
    documentRef: dependencies.documentRef || dependencies.document,
    windowRef: dependencies.windowRef || dependencies.window,
    promptRef: dependencies.promptRef || dependencies.prompt,
    formDataRef: dependencies.formDataRef || dependencies.FormData,
  };
  try {
    return typedStageActivityCanvasV1(ViewLayer, typedDependencies);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS do canvas de etapas indisponível; usando recuperação MJS.", error);
    return recoveryStageActivityCanvasV1.installStageActivityCanvasV1(ViewLayer, dependencies);
  }
};
