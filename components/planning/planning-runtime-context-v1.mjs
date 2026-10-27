import {
  createAtlasWorkbenchActivityRouteResolverV1 as createWorkbenchActivityRouteResolverTsV1,
  createAtlasStageMaterialProfileHelpersV1 as createStageMaterialProfileHelpersTsV1,
  createAtlasStageTimeModelsV1 as createStageTimeModelsTsV1,
} from "../../dist/frontend/program.js";
import { createWorkbenchActivityRouteResolverV1 as createWorkbenchActivityRouteResolverLegacyV1 } from "./activity-route-resolver.mjs?v=activity-route-resolver-v1&ts-planning-runtime-owners-v1";
import { createStageMaterialProfileHelpersV1 as createStageMaterialProfileHelpersLegacyV1 } from "./stage-material-profiles.mjs?v=stage-material-profiles-v1&ts-planning-runtime-owners-v1";
import { createStageTimeModelsV1 as createStageTimeModelsLegacyV1 } from "./stage-time-models-v1.mjs?v=stage-time-models-v1&ts-planning-runtime-owners-v1";
import { createStageContextMarkupV1 as createStageContextMarkupLegacyV1 } from "./stage-context-markup-v1.mjs?v=stage-context-markup-v2&ts-planning-context-markup-owner-v1";
import { createCardCanvasLinkV1 as createCardCanvasLinkLegacyV1 } from "./card-canvas-link-v1.mjs?v=card-canvas-link-v2&ts-planning-card-canvas-link-owner-v1";
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
  stageContextMarkupFactoryV1 = createStageContextMarkupLegacyV1,
  cardCanvasLinkFactoryV1 = createCardCanvasLinkLegacyV1,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  storageRef = globalThis.localStorage,
  getStorage = () => storageRef,
} = {}) => {
  const beginCardCanvasLinkV1 = cardCanvasLinkFactoryV1({
      documentRef,
      windowRef,
    }),
    activityRoutes = (createWorkbenchActivityRouteResolverTsV1 || createWorkbenchActivityRouteResolverLegacyV1)({
      appStore,
      demoData,
      executionModel,
      STAGE_WORKBENCH,
      findWorkbenchActivity,
      runtimeRouteV1,
    }),
    readIntegrationSettings = createIntegrationSettingsReaderV1({ getStorage }),
    stageMaterialProfiles = (createStageMaterialProfileHelpersTsV1 || createStageMaterialProfileHelpersLegacyV1)({ demoData }),
    stageContext = stageContextMarkupFactoryV1({
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
    stageTimeModels = (createStageTimeModelsTsV1 || createStageTimeModelsLegacyV1)({ demoData, stageOverlayKey });

  return Object.freeze({
    beginCardCanvasLinkV1,
    ...activityRoutes,
    readIntegrationSettings,
    ...stageMaterialProfiles,
    ...stageContext,
    ...stageTimeModels,
  });
};
