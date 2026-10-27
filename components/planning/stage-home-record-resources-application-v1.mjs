import { installActivityHeaderConsolidationV1 } from "../shared/activity-header-consolidation-v1.mjs?v=activity-header-consolidation-v1";
import {
  installStageHomeRecordResourcesEventsV1,
  installStageHomeRecordResourcesPageV1,
  installStageRecordsNavigationV1,
} from "../records/stage-home-record-resources-events-v1.mjs?v=stage-home-record-resources-events-v2";

const STAGE_HOME_RECORD_INSTALLERS_V1 = Object.freeze({
  installActivityHeaderConsolidationV1,
  installStageHomeRecordResourcesEventsV1,
  installStageHomeRecordResourcesPageV1,
  installStageRecordsNavigationV1,
});

/** Installs the stage home record/resource surface in its bootstrap order. */
export const installStageHomeRecordResourcesApplicationV1 = ({
  ViewLayer,
  appStore,
  demoData,
  stageRecordServices = {},
  installLotDevelopmentRenderGuardV1,
  useTypescriptRouteV1 = false,
  installers = STAGE_HOME_RECORD_INSTALLERS_V1,
  globalRef = globalThis,
} = {}) => {
  installers.installActivityHeaderConsolidationV1(ViewLayer, {
    document: globalRef.document,
    Node: globalRef.Node,
  });

  if (!useTypescriptRouteV1) installers.installStageHomeRecordResourcesEventsV1(ViewLayer, {
    appStore,
    demoData,
    stageRecordStagesV1: stageRecordServices.stageRecordStagesV1,
    stageRecordMaterialRowsV1: stageRecordServices.stageRecordMaterialRowsV1,
    stageRecordServiceRowsV1: stageRecordServices.stageRecordServiceRowsV1,
    stageMaterialReportBindV1: stageRecordServices.stageMaterialReportBindV1,
    stageRecordNormalizeV1: stageRecordServices.stageRecordNormalizeV1,
    stageRecordCenterItemModalMarkupV1: stageRecordServices.stageRecordCenterItemModalMarkupV1,
    documentRef: globalRef.document,
    queueMicrotaskFn: globalRef.queueMicrotask.bind(globalRef),
    windowRef: globalRef.window,
  });

  // Reapply last so legacy render extensions cannot swallow the lot routes.
  installLotDevelopmentRenderGuardV1(ViewLayer, {
    appStore,
    windowRef: globalRef.window,
  });

  if (!useTypescriptRouteV1) {
    installers.installStageHomeRecordResourcesPageV1(ViewLayer, {
      appStore,
      documentRef: globalRef.document,
      stageHomeRecordResourcesMarkupV1: stageRecordServices.stageHomeRecordResourcesMarkupV1,
    });
    installers.installStageRecordsNavigationV1(ViewLayer, { appStore });
  }

  return Object.freeze({});
};
