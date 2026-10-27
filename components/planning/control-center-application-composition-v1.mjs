import { createControlStageContextV1 as createLegacyControlStageContextV1 } from "../records/control-stage-context-v1.mjs?v=control-stage-context-v1-ts-primary-fallback";
import * as atlasControlCenterProgramV1 from "../../dist/frontend/program.js";
import { createControlCenterPageV1 } from "./control-center-page-v1.mjs?v=control-center-page-v1";
import * as atlasControlCenterComponentsV1 from "../../dist/frontend/components.js";
import {
  installStageHeader3DControlsV1,
  installStageStableViewTabsV1,
} from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v9&ts-stage-context-chrome-adapter-v1&ts-stage-context-resolver-owner-v1";

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
  const controlStageContextInputV1 = {
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
  };
  const createTypedControlStageContextV1 = atlasControlCenterProgramV1.createAtlasControlStageContextV1;
  let controlStageContextV1;
  try {
    controlStageContextV1 = typeof createTypedControlStageContextV1 === "function"
      ? createTypedControlStageContextV1(controlStageContextInputV1)
      : createLegacyControlStageContextV1(controlStageContextInputV1);
  } catch (error) {
    if (typeof createTypedControlStageContextV1 !== "function") throw error;
    globalThis.console?.info?.("Contexto TS da etapa indisponível; usando o adapter legado.", error);
    controlStageContextV1 = createLegacyControlStageContextV1(controlStageContextInputV1);
  }
  const createControlCenterPage = atlasControlCenterComponentsV1.createAtlasControlCenterPageV1 || createControlCenterPageV1;
  const controlCenterPageV1 = createControlCenterPage({
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
    stageV9LiveFor: stageContext.stageV9LiveFor,
    formatBRL,
    esc,
    ico,
    notify,
  });

  controlCenterPageV1.installRenderer(ViewLayer);
  const installStableTabs = atlasControlCenterComponentsV1.installAtlasStageStableViewTabsV1 || installStageStableViewTabsV1;
  installStableTabs(ViewLayer, { stageViewTabs });
  const installHeader3D = atlasControlCenterComponentsV1.installAtlasStageHeader3DControlsV1 || installStageHeader3DControlsV1;
  const stageHeader3DMarkup = installHeader3D(ViewLayer, {
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
