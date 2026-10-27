import { installStageContextChromeV1, STAGE_CONTEXT_VIEWS_V1 } from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v9&ts-stage-context-chrome-adapter-v1&ts-stage-context-resolver-owner-v1";
import * as stageNavigationComponentsTsV1 from "../../dist/frontend/components.js";

/** Register stage chrome while keeping the database-backed Atlas activity list. */
export const installStageNavigationSurfacesRegistrationV1 = ({
  ViewLayer,
  appStore,
  executionModel,
  runtimeRouteV1,
  stageContextV1,
  stagePersistentTimelineMarkupV1,
  stageViewTabs,
  isLimitedOperationalActor,
  esc,
  extensionStage,
  ico,
  stageV9FlowPackets,
  stageV9LiveFor,
  stageContextViews = STAGE_CONTEXT_VIEWS_V1,
  contextChromeInstallerV1 = installStageContextChromeV1,
  useTypeScriptOwnerV1 = true,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
} = {}) => {
  const dependencies = {
    STAGE_CONTEXT_VIEWS_V1: stageContextViews,
    appStore,
    executionModel,
    runtimeRouteV1,
    stageContextV1,
    stagePersistentTimelineMarkupV1,
    stageViewTabs,
    isLimitedOperationalActor,
    documentRef,
    windowRef,
  };
  const typedChrome = stageNavigationComponentsTsV1.installAtlasStageContextChromeV1;
  if (useTypeScriptOwnerV1 && typeof typedChrome === "function") typedChrome(ViewLayer, dependencies);
  else contextChromeInstallerV1(ViewLayer, dependencies);
  if (typeof ViewLayer.prototype.atlasActivitiesListV1 === "function")
    ViewLayer.prototype.activities = ViewLayer.prototype.atlasActivitiesListV1;
};
