import { createControlStageContextV1 } from "../records/control-stage-context-v1.mjs?v=control-stage-context-v1";
import { createControlCenterPageV1 } from "./control-center-page-v1.mjs?v=control-center-page-v1";
import {
  installStageHeader3DControlsV1,
  installStageStableViewTabsV1,
} from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v7";

/** Compose the operational Control Center and its stage context/navigation. */
export const installControlCenterApplicationCompositionV1 = ({
  ViewLayer,
  appStore,
  executionModel,
  demoData,
  commissionDeals,
  brokerReasonsV9,
  controlCenterData,
  cashRecordLauncherMarkupV1,
  subscribeOperationalControlCenter,
  readIntegrationSettings,
  integrationSettingsKey,
  apiFetch,
  operationalHeaders,
  stageContext,
  formatBRL,
  esc,
  ico,
  notify,
  stageViewTabs,
  stageOverlayKey,
  extensionStage,
  requestAnimationFrameFn = globalThis.requestAnimationFrame.bind(globalThis),
} = {}) => {
  const controlStageContextV1 = createControlStageContextV1({
    readIntegrationSettings,
    normalizeStageMaterialRows: stageContext.normalizeStageMaterialRows,
    defaultStageMaterialRows: stageContext.defaultStageMaterialRows,
    stageV9LiveFor: stageContext.stageV9LiveFor,
    stageV9StatusFor: stageContext.stageV9StatusFor,
    esc,
    ico,
    STAGE_WORKBENCH: stageContext.STAGE_WORKBENCH,
    workbenchStageFromValueV1: stageContext.workbenchStageFromValueV1,
    splitStageConfigList: stageContext.splitStageConfigList,
  });
  const controlCenterPageV1 = createControlCenterPageV1({
    appStore,
    executionModel,
    demoData,
    commissionDeals,
    brokerReasonsV9,
    ...controlCenterData,
    controlCenterRealtimeLabelV1: controlStageContextV1.controlCenterRealtimeLabelV1,
    controlStageProfileV1: controlStageContextV1.controlStageProfileV1,
    controlStageContextMarkupV1: controlStageContextV1.controlStageContextMarkupV1,
    controlStageUnifiedFormMarkupV1: controlStageContextV1.controlStageUnifiedFormMarkupV1,
    controlStageContextPayloadV1: controlStageContextV1.controlStageContextPayloadV1,
    cashRecordLauncherMarkupV1,
    subscribeOperationalControlCenter,
    readIntegrationSettings,
    INTEGRATION_SETTINGS_KEY: integrationSettingsKey,
    apiFetch,
    operationalHeaders,
    stageV9StatusFor: stageContext.stageV9StatusFor,
    formatBRL,
    esc,
    ico,
    notify,
  });

  controlCenterPageV1.installRenderer(ViewLayer);
  installStageStableViewTabsV1(ViewLayer, { stageViewTabs });
  const stageHeader3DMarkup = installStageHeader3DControlsV1(ViewLayer, {
    esc,
    ico,
    stageOverlayKey,
    demoData,
    extensionStage,
    requestAnimationFrameFn,
  });
  controlCenterPageV1.installEvents(ViewLayer);

  return Object.freeze({
    controlStageContextV1,
    controlCenterPageV1,
    stageHeader3DMarkup,
    ...controlStageContextV1,
  });
};
