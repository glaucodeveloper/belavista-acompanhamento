import {
  createAtlasStageRecordServicesV1,
  installAtlasRecordApplicationCompositionV1,
} from "../../dist/frontend/program.js";
import * as atlasRecordComponentsV1 from "../../dist/frontend/components.js";
import { createAtlasStageMaterialReportViewV1 } from "../../dist/frontend/components.js";
import {
  createStageRecordServicesV1,
  installStageRecordCenterV1,
} from "./stage-record-center-v1.mjs?v=stage-record-center-v6-ts-service-projection-adapter";
import { installLotDetailEventsV1 } from "../lots/lot-detail-events-v1.mjs?v=lot-detail-events-v1";
import { installRecordOcrDynamicBridgeV21 } from "./record-ocr-dynamic-bridge-v21.mjs?v=stage-comprehension-settings-v1";

/** Keep record UI and OCR as leaf ports; TypeScript owns their setup order and typed projections. */
export const installRecordApplicationCompositionV1 = (input = {}) =>
  installAtlasRecordApplicationCompositionV1({
    ...input,
    installRecordOcrFormsV1: atlasRecordComponentsV1.installAtlasRecordOcrFormsV1,
    owners: {
      stageRecordServices: {
        typed: createAtlasStageRecordServicesV1,
        legacy: createStageRecordServicesV1,
      },
      stageMaterialReportView: createAtlasStageMaterialReportViewV1,
      stageRecordCenter: atlasRecordComponentsV1.installAtlasStageRecordCenterV1 || installStageRecordCenterV1,
      lotDetailEventsLegacy: installLotDetailEventsV1,
      recordOcrBridge: installRecordOcrDynamicBridgeV21,
    },
  });
