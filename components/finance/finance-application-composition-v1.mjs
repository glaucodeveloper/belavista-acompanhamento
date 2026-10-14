import { createOperationalHeadersV1 } from "../shared/operational-headers-v1.mjs?v=operational-headers-v1";
import { installReportsWorkspaceV1 } from "./reports-workspace-v1.mjs?v=reports-workspace-v1";
import { createFinanceWorkspaceV8 } from "./finance-workspace-v8.mjs?v=finance-workspace-v8";
import { createLiveReportBuildersV1 } from "./live-report-builders-v1.mjs?v=live-report-builders-v1";
import { createControlCenterDataV1 } from "../planning/control-center-data-v1.mjs?v=control-center-data-v1";
import { installStagesMapRuntimeGuardV1 } from "../planning/stages-map-runtime-guard-v1.mjs?v=stages-map-runtime-guard-v1";
import { installOperationalViewBindV8 } from "../shared/operational-view-bind-v8.mjs?v=operational-view-bind-v8";
import { installCommissionHistoryControlsV1 } from "../commercial/commission-history-controls-v1.mjs?v=commission-history-controls-v1";
import { createBrokerControlPageV1 } from "../commercial/broker-control-page-v1.mjs?v=broker-control-page-v1";
import { installCommissionProfileBindingV1 } from "../commercial/commission-profile-binding-v1.mjs?v=commission-profile-binding-v1";
import { createControlPageEventsV8 } from "./control-page-events-v8.mjs?v=control-page-events-v8";
import { installStagePlanningExtensionsV1 } from "../planning/stage-planning-extensions-v1.mjs?v=stage-planning-extensions-v1";
import { createCommercialScopeV1 } from "../commercial/commercial-scope-v1.mjs?v=commercial-scope-v2";

/** Installs finance, commission, reporting and stage-facing page composition. */
export const installFinanceApplicationCompositionV1 = ({
  ViewLayer,
  appStore,
  demoData,
  executionModel,
  commissionProfiles,
  commissionDeals,
  publishOperationalEvent,
  esc,
  ico,
  notify,
  apiFetch,
  apiUrl,
  downloadCsv,
  bindLeadsToolbarEventsV1,
  bindCommissionWorkspaceEventsV1,
  stageOverlayLabels,
  stageOverlayKey,
  stagePlanning,
  stageRecordReaders,
  reportCatalog,
  globalRef = globalThis,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  confirmRef = globalThis.confirm,
  EventCtor = globalThis.Event,
  FormDataCtor = globalThis.FormData,
} = {}) => {
  const brlToNumber = (value) =>
    Number(String(value || "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  const formatBRL = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      Number(value) || 0,
    );
  const commercialScopeV1 = createCommercialScopeV1({ appStore, commissionProfiles, commissionDeals });
  const controlCenter = createControlCenterDataV1({
    appStore,
    formatBRL,
    publishOperationalEvent,
    esc,
    ico,
    Date: globalRef.Date,
  });

  installStagesMapRuntimeGuardV1(ViewLayer, { appStore, documentRef });

  const operationalHeaders = createOperationalHeadersV1({ appStore });
  const viewLayerBindWithCommissions = ViewLayer.prototype.bind;
  installCommissionProfileBindingV1(ViewLayer, {
    viewLayerBindWithCommissions,
    appStore,
    commissionDeals,
    commissionProfiles,
    notify,
    documentRef,
    windowRef,
  });

  const brokersControlV8 = createBrokerControlPageV1({
    appStore,
    commissionDeals,
    commissionProfiles,
    brlToNumber,
    formatBRL,
    esc,
    ico,
    queueMicrotaskFn: globalRef.queueMicrotask.bind(globalRef),
  });
  const financeWorkspaceV8 = createFinanceWorkspaceV8({
    appStore,
    executionModel,
    esc,
    ico,
    formatBRL,
    queueMicrotaskFn: globalRef.queueMicrotask.bind(globalRef),
    DateCtor: globalRef.Date,
  });
  const { cashRecordLauncherMarkupV1 } = financeWorkspaceV8;

  const bindControlPageEventsV8 = createControlPageEventsV8({
    appStore,
    apiFetch,
    operationalHeaders,
    apiUrl,
    ico,
    esc,
    notify,
  });

  installOperationalViewBindV8(ViewLayer, {
    appStore,
    demoData,
    downloadCsv,
    bindLeadsToolbarEventsV1,
    bindCommissionWorkspaceEventsV1,
    brlToNumber,
    commissionDeals,
    commissionProfiles,
    confirmRef,
    DateCtor: globalRef.Date,
    documentRef,
    EventCtor,
    FormDataCtor,
    formatBRL,
    ico,
    notify,
  });

  installStagePlanningExtensionsV1(ViewLayer, {
    demoData,
    ...stagePlanning,
    appStore,
    ico,
    stageOverlayLabels,
    stageOverlayKey,
    esc,
    notify,
  });

  installCommissionHistoryControlsV1(ViewLayer, {
    appStore,
    brlToNumber,
    commissionDeals,
    commissionProfiles,
    esc,
    formatBRL,
    ico,
    notify,
  });

  const liveReportBuildersV1 = createLiveReportBuildersV1({
    reportCatalog,
    formatBRL,
    ...stageRecordReaders,
  });
  const {
    syncCashEvidenceReportV1,
    syncConstructionFinanceReportsV1,
    syncServiceCompletionReportV1,
    syncLiveSystemReportV1,
  } = liveReportBuildersV1;
  installReportsWorkspaceV1(ViewLayer, {
    appStore,
    syncCashEvidenceReportV1,
    syncConstructionFinanceReportsV1,
    syncServiceCompletionReportV1,
    reportCatalog,
    esc,
    ico,
    notify,
    documentRef,
    FileReaderCtor: globalRef.FileReader,
    apiFetch,
    operationalHeaders,
    CSSRef: globalRef.CSS,
    URLRef: globalRef.URL,
    schedule: globalRef.setTimeout.bind(globalRef),
    FormDataCtor,
  });

  return Object.freeze({
    brlToNumber,
    formatBRL,
    commercialScopeV1,
    ...controlCenter,
    operationalHeaders,
    brokersControlV8,
    financeWorkspaceV8,
    cashRecordLauncherMarkupV1,
    bindControlPageEventsV8,
    liveReportBuildersV1,
    syncCashEvidenceReportV1,
    syncConstructionFinanceReportsV1,
    syncServiceCompletionReportV1,
    syncLiveSystemReportV1,
  });
};
