import { createOperationalIntelligenceCompositionV1 } from "./operational-intelligence-composition-v1.mjs?v=operational-intelligence-composition-v1";
import { createProgressPageV1 } from "./progress-page-v1.mjs?v=progress-page-v1";
import { installDashboardCardDragV1 } from "./dashboard-card-drag-v1.mjs?v=dashboard-card-drag-v1";
import { installStageExtensionEventsV1 } from "./stage-extension-events-v1.mjs?v=stage-extension-events-v1";
import { installStageBindCompositionV1 } from "./stage-bind-composition-v1.mjs?v=stage-bind-composition-v1";
import {
  createStageContextResolverV1,
  createStageViewTabsMarkupV1,
} from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v7";

/** Install the stage/planning page composition while preserving bootstrap order. */
export const installStageApplicationCompositionV1 = ({
  ViewLayer,
  appStore,
  demoData,
  executionModel,
  activityCatalog,
  esc,
  ico,
  notify,
  runtimeRouteV1,
  apiFetch,
  operationalHeaders,
  windowRef = globalThis.window,
  globalRef = globalThis,
  installLeadsPages,
} = {}) => {
  const stageContextV1 = createStageContextResolverV1({ appStore, executionModel, demoData });
  const stageViewTabs = createStageViewTabsMarkupV1({ stageContextV1, demoData, esc, ico });
  const extensionStage = () => stageContextV1().record || demoData.activities[1];

  const intelligence = createOperationalIntelligenceCompositionV1({
    ViewLayer,
    appStore,
    demoData,
    extensionStage,
    esc,
    ico,
    notify,
    browser: globalRef,
  });
  ViewLayer.prototype.progress = createProgressPageV1({
    appStore,
    demoData,
    extensionStage,
    esc,
    ico,
    DateCtor: globalRef.Date,
  });

  installLeadsPages?.();
  installDashboardCardDragV1(ViewLayer, { notify, windowRef });
  installStageExtensionEventsV1(ViewLayer, {
    appStore,
    notify,
    activityCatalog,
    demoData,
    esc,
    ico,
    extensionStage,
    runtimeRouteV1,
    apiFetch: (...args) => apiFetch(...args),
    operationalHeaders: (...args) => operationalHeaders(...args),
    window: windowRef,
  });
  installStageBindCompositionV1(ViewLayer);

  return Object.freeze({ stageContextV1, stageViewTabs, extensionStage, ...intelligence });
};
