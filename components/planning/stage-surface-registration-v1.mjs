import { installStageActivityCanvasV1 } from "./stage-activity-canvas-v1.mjs?v=stage-activity-canvas-v2-typed-owner";

/** Install the shared planning canvases in their original prototype order. */
export const installStageSurfaceRegistrationV1 = ({
  ViewLayer,
  appStore,
  demoData,
  activityCatalog,
  esc,
  ico,
  notify,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  activityCanvasInstallerV1 = installStageActivityCanvasV1,
} = {}) => {
  activityCanvasInstallerV1(ViewLayer, {
    appStore,
    demoData,
    activityCatalog,
    esc,
    notify,
    document: documentRef,
    window: windowRef,
  });
};
