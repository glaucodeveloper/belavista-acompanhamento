import { createWorkbenchActivityRouteResolverV1 } from "./activity-route-resolver.mjs?v=activity-route-resolver-v1";
import { createStageMaterialProfileHelpersV1 } from "./stage-material-profiles.mjs?v=stage-material-profiles-v1";
import { createStageTimeModelsV1 } from "./stage-time-models-v1.mjs?v=stage-time-models-v1";
import { createStageContextMarkupV1 } from "./stage-context-markup-v1.mjs?v=stage-context-markup-v1";
import { createCardCanvasLinkV1 } from "./card-canvas-link-v1.mjs?v=card-canvas-link-v1";
import { createIntegrationSettingsReaderV1 } from "../shared/integration-settings-reader-v1.mjs?v=integration-settings-reader-v1";

/** Assemble the shared runtime context consumed by planning and record pages. */
export const createPlanningRuntimeContextV1 = ({
  appStore,
  demoData,
  executionModel,
  STAGE_WORKBENCH,
  findWorkbenchActivity,
  runtimeRouteV1,
  esc,
  ico,
  stageOverlayKey,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  storageRef = globalThis.localStorage,
  getStorage = () => storageRef,
} = {}) => {
  const beginCardCanvasLinkV1 = createCardCanvasLinkV1({
      documentRef,
      windowRef,
    }),
    activityRoutes = createWorkbenchActivityRouteResolverV1({
      appStore,
      demoData,
      executionModel,
      STAGE_WORKBENCH,
      findWorkbenchActivity,
      runtimeRouteV1,
    }),
    readIntegrationSettings = createIntegrationSettingsReaderV1({ getStorage }),
    stageMaterialProfiles = createStageMaterialProfileHelpersV1({ demoData }),
    stageContext = createStageContextMarkupV1({
      appStore,
      defaultStageMaterialRows: stageMaterialProfiles.defaultStageMaterialRows,
      demoData,
      esc,
      executionModel,
      ico,
      normalizeStageMaterialRows: stageMaterialProfiles.normalizeStageMaterialRows,
      readIntegrationSettings,
      stageOverlayKey,
    }),
    stageTimeModels = createStageTimeModelsV1({ demoData, stageOverlayKey });

  return Object.freeze({
    beginCardCanvasLinkV1,
    ...activityRoutes,
    readIntegrationSettings,
    ...stageMaterialProfiles,
    ...stageContext,
    ...stageTimeModels,
  });
};
