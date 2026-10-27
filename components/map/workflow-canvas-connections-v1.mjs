// Compatibility edge; keep the workflow canvas controller available until the stage route is validated.
let typedWorkflowCanvasV1;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.installAtlasWorkflowCanvasConnectionsV1 !== "function")
    throw new TypeError("Typed workflow canvas owner is unavailable.");
  typedWorkflowCanvasV1 = components.installAtlasWorkflowCanvasConnectionsV1;
} catch {
  typedWorkflowCanvasV1 = null;
}
const recoveryWorkflowCanvasV1 = await import("./workflow-canvas-connections-legacy-v1.mjs");

export const installWorkflowCanvasConnectionsV1 = (ViewLayer, dependencies = {}) => {
  if (!typedWorkflowCanvasV1)
    return recoveryWorkflowCanvasV1.installWorkflowCanvasConnectionsV1(ViewLayer, dependencies);
  const typedDependencies = {
    ...dependencies,
    documentRef: dependencies.documentRef || dependencies.document,
    windowRef: dependencies.windowRef || dependencies.window,
  };
  try {
    return typedWorkflowCanvasV1(ViewLayer, typedDependencies);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS do canvas de fluxo indisponível; usando recuperação MJS.", error);
    return recoveryWorkflowCanvasV1.installWorkflowCanvasConnectionsV1(ViewLayer, dependencies);
  }
};
