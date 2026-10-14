import { installMaterialsWorkspaceV1 } from "./materials-workspace-v1.mjs?v=materials-workspace-v1";
import { installMaterialsDatabasePageV1 } from "./materials-database-page-v1.mjs?v=materials-database-v4";
import { installControlRecordDrawerV2 } from "./control-record-drawer-v2.mjs?v=control-record-accordion-v1";
import { installMaterialTransitionV1 } from "./material-transition-v1.mjs?v=material-transition-v1";

/** Register the records/materials workspace in its established override order. */
export const installRecordsWorkspaceRegistrationV1 = ({
  ViewLayer,
  appStore,
  controlCenterMaterialRowsV1,
  controlCenterPublishV1,
  controlCenterRecordChangeV1,
  esc,
  executionModel,
  ico,
  normalizeActivityRouteTextV1,
  notify,
  stageProfileSettingsFor,
  stageV9FlowPackets,
  apiFetch,
  operationalHeaders,
  documentRef = globalThis.document,
  DateCtor = globalThis.Date,
  materialsWorkspaceInstallerV1 = installMaterialsWorkspaceV1,
  materialsDatabaseInstallerV1 = installMaterialsDatabasePageV1,
  controlRecordDrawerInstallerV1 = installControlRecordDrawerV2,
  materialTransitionInstallerV1 = installMaterialTransitionV1,
} = {}) => {
  materialsWorkspaceInstallerV1(ViewLayer, {
    appStore,
    controlCenterMaterialRowsV1,
    controlCenterPublishV1,
    controlCenterRecordChangeV1,
    esc,
    executionModel,
    ico,
    normalizeActivityRouteTextV1,
    notify,
    stageProfileSettingsFor,
    stageV9FlowPackets,
  });
  materialsDatabaseInstallerV1(ViewLayer);
  controlRecordDrawerInstallerV1(ViewLayer, {
    appStore,
    ico,
    documentRef,
    DateCtor,
  });
  materialTransitionInstallerV1(ViewLayer, {
    apiFetch,
    appStore,
    controlCenterMaterialRowsV1,
    controlCenterPublishV1,
    controlCenterRecordChangeV1,
    esc,
    notify,
    operationalHeaders,
  });
  return ViewLayer;
};
