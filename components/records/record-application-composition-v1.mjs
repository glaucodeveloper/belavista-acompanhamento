import {
  createStageRecordServicesV1,
  installStageRecordCenterV1,
} from "./stage-record-center-v1.mjs?v=stage-record-center-v3";
import { installLotDetailEventsV1 } from "../lots/lot-detail-events-v1.mjs?v=lot-detail-events-v1";
import { installRecordOcrDynamicBridgeV21 } from "./record-ocr-dynamic-bridge-v21.mjs?v=record-ocr-dynamic-bridge-v21";

/** Compose stage records, lot detail interactions, and the OCR bridge in bootstrap order. */
export const installRecordApplicationCompositionV1 = ({
  ViewLayer,
  REPASSE_PRICE_CATALOG,
  apiFetch,
  appStore,
  commissionProfiles,
  controlCenterMaterialRowsV1,
  defaultStageMaterialRows,
  demoData,
  downloadBrandedLotExcelV1,
  esc,
  executionModel,
  formatBRL,
  ico,
  isAssistantVisualAdditionV1,
  lotExportRowV1,
  notify,
  operationalHeaders,
  prepareAssistantLotStatusPromptV1,
  renderStageHomePageV1,
  stageContextV1,
  stageHomeSnapshotV1,
  stageProfileSettingsFor,
  stageViewTabs,
  stageV9LiveFor,
  host = globalThis,
  documentRef = globalThis.document,
} = {}) => {
  const stageRecordServicesV1 = createStageRecordServicesV1({
    executionModel,
    demoData,
    controlCenterMaterialRowsV1,
    stageV9LiveFor,
  });

  const stageRecordCenterModulesV1 = installStageRecordCenterV1(ViewLayer, {
    REPASSE_PRICE_CATALOG,
    appStore,
    defaultStageMaterialRows,
    demoData,
    esc,
    formatBRL,
    ico,
    isAssistantVisualAdditionV1,
    renderStageHomePageV1,
    stageContextV1,
    stageHomeSnapshotV1,
    ...stageRecordServicesV1,
    stageViewTabs,
    document: documentRef,
  });

  installLotDetailEventsV1(ViewLayer, {
    REPASSE_PRICE_CATALOG,
    apiFetch,
    appStore,
    commissionProfiles,
    downloadBrandedLotExcelV1,
    formatBRL,
    lotExportRowV1,
    notify,
    operationalHeaders,
    prepareAssistantLotStatusPromptV1,
  });

  const recordOcrBridgeV1 = installRecordOcrDynamicBridgeV21({
    host,
    apiFetch,
    operationalHeaders,
    appStore,
    executionModel,
    stageProfileSettingsFor,
  });

  return Object.freeze({
    ...stageRecordServicesV1,
    ...stageRecordCenterModulesV1,
    recordOcrBridgeV1,
  });
};
