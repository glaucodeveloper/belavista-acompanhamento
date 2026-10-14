import { installStageContextChromeV1, STAGE_CONTEXT_VIEWS_V1 } from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v7";

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
} = {}) => {
  contextChromeInstallerV1(ViewLayer, {
    STAGE_CONTEXT_VIEWS_V1: stageContextViews,
    appStore,
    executionModel,
    runtimeRouteV1,
    stageContextV1,
    stagePersistentTimelineMarkupV1,
    stageViewTabs,
    isLimitedOperationalActor,
  });
  if (typeof ViewLayer.prototype.atlasActivitiesListV1 === "function")
    ViewLayer.prototype.activities = ViewLayer.prototype.atlasActivitiesListV1;
};
