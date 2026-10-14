import { installStageActivityCanvasV1 } from "./stage-activity-canvas-v1.mjs?v=stage-activity-canvas-v1";
import { installStageDedicatedWorkspaceV1 } from "./stage-dedicated-workspace-v1.mjs?v=stage-dedicated-workspace-v1";
import { installWorkflowCanvasConnectionsV1 } from "../map/workflow-canvas-connections-v1.mjs?v=workflow-canvas-connections-v1";

/** Install the shared planning canvases in their original prototype order. */
export const installStageSurfaceRegistrationV1 = ({
  ViewLayer,
  appStore,
  demoData,
  activityCatalog,
  extensionStage,
  stageMaterialsFor,
  stagePlanningMarkup,
  splitStageConfigList,
  esc,
  ico,
  notify,
  readIntegrationSettings,
  integrationSettingsKey,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  storageRef = globalThis.localStorage,
  activityCanvasInstallerV1 = installStageActivityCanvasV1,
  dedicatedWorkspaceInstallerV1 = installStageDedicatedWorkspaceV1,
  workflowConnectionsInstallerV1 = installWorkflowCanvasConnectionsV1,
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
  dedicatedWorkspaceInstallerV1(ViewLayer, {
    appStore,
    demoData,
    extensionStage: (...args) => extensionStage(...args),
    stageMaterialsFor,
    stagePlanningMarkup,
    esc,
    ico,
    notify,
    readIntegrationSettings,
    splitStageConfigList,
    integrationSettingsKey,
    localStorage: storageRef,
    window: windowRef,
  });
  workflowConnectionsInstallerV1(ViewLayer, {
    activityCatalog,
    appStore,
    esc,
    notify,
    document: documentRef,
    window: windowRef,
  });
};
