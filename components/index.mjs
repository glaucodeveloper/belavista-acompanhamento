// BELAVISTA_ORIGINAL_ADMIN_NAV_TRIM_V5350
import { esc, ico, notify } from "./shared/dom.mjs";
import { statusClass } from "./shared/status-class-v1.mjs?v=status-class-v1";
import { installControlCenterPriorityChatV1 } from "./planning/control-center-priority-chat-v1.mjs?v=control-center-priority-chat-v2";
import "./shared/brand-normalizer.mjs?v=brand-normalizer-v1";
import { runtimeRouteV1 } from "./shared/routing.mjs";
import { installFloatingWidgetLayoutV1 } from "./shared/floating-widget-layout-v1.mjs?v=floating-widget-layout-v1";
import { installCashRecordFiscalControlsV1 } from "./finance/cash-record-fiscal-controls-v1.mjs?v=cash-record-fiscal-controls-v1";
import { installRepassePageV1 } from "./finance/repasse-page-v1.mjs?v=repasse-page-v2";
import { installAgendaDashboardDetailV1 } from "./planning/agenda-dashboard-detail-v1.mjs?v=agenda-dashboard-detail-v1";
import { installStageSurfaceRegistrationV1 } from "./planning/stage-surface-registration-v1.mjs?v=stage-surface-registration-v1";
import { installStageApplicationCompositionV1 } from "./planning/stage-application-composition-v1.mjs?v=stage-application-composition-v1";
import { installPlanningPagesApplicationV1 } from "./planning/planning-pages-application-v1.mjs?v=planning-pages-application-v2";
import { installStageHomeRecordResourcesApplicationV1 } from "./planning/stage-home-record-resources-application-v1.mjs?v=stage-home-record-resources-application-v2";
import { stageOverlayKey, stageOverlayLabels } from "./map/stage-overlays.mjs?v=stage-overlays-v1";
import { createPlanningRuntimeContextV1 } from "./planning/planning-runtime-context-v1.mjs?v=planning-runtime-context-v1";
import {
  CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
} from "./chat/policies.mjs";
import { registerApplicationElementsV1 } from "./shared/application-elements-registration-v1.mjs?v=application-elements-registration-v4&pdf-marker-anchors-v1&pdf-yellow-circles-v2";
import { installApplicationEventCompositionV1 } from "./shared/application-event-composition-v1.mjs?v=application-event-composition-v1";
import { INTEGRATION_SETTINGS_KEY } from "./shared/integration-settings-reader-v1.mjs?v=integration-settings-reader-v1";
import { createCsvDownloaderV1 } from "./shared/csv-download-v1.mjs?v=csv-download-v1";
import { registerBelavistaAdminAiChatV1 } from "./chat/admin-ai-chat-registration-v1.mjs?v=admin-ai-chat-registration-v1";
import { contractStatusClassV1 } from "./commercial/contracts-page-v1.mjs?v=contracts-page-v1";
import { installCommercialDocumentRenderersV1 } from "./commercial/commercial-document-renderers-v1.mjs?v=commercial-document-renderers-v1";
import { bindCommissionWorkspaceEventsV1 } from "./commercial/commission-workspace-events-v1.mjs?v=commission-workspace-events-v1";
import { bindLeadsToolbarEventsV1 } from "./commercial/leads-toolbar-events-v1.mjs?v=leads-toolbar-events-v1";
import { bindLeadsMapConversationV1 } from "./commercial/leads-map-conversation-v1.mjs?v=leads-map-conversation-v1";
import { installBrokerProfileRegistrationV1 } from "./commercial/broker-profile-registration-v1.mjs?v=broker-profile-registration-v1";
import { installBrokerSettingsRendererV1, installCommissionPageRenderersV1 } from "./commercial/commission-page-renderers-v1.mjs?v=commission-page-renderers-v1";
import { brokerReasonsV9 } from "./commercial/broker-control-page-v1.mjs?v=broker-control-page-v1";
import { commissionProfiles, commissionDeals } from "./commercial/commission-catalog-v1.mjs?v=commission-catalog-v1";
import { installCommercialHistoryRegistrationV1 } from "./commercial/commercial-history-registration-v1.mjs?v=commercial-history-registration-v1";
import { installCommercialDirectoryContractsRegistrationV1 } from "./commercial/commercial-directory-contracts-registration-v1.mjs?v=commercial-directory-contracts-registration-v1";
import { installAiAgendaSettingsV1 } from "./shared/ai-agenda-settings-v1.mjs?v=2";
import { installCommercialApplicationCompositionV1 } from "./commercial/commercial-application-composition-v1.mjs?v=commercial-application-composition-v1";
import { installLeadsPageCompositionV1 } from "./commercial/leads-page-composition-v1.mjs?v=leads-operational-crm-v1";
import { installFinanceApplicationCompositionV1 } from "./finance/finance-application-composition-v1.mjs?v=finance-application-composition-v1";
import { installRecordApplicationCompositionV1 } from "./records/record-application-composition-v1.mjs?v=record-application-composition-v1";
import { installStageNavigationSurfacesRegistrationV1 } from "./planning/stage-navigation-surfaces-registration-v1.mjs?v=stage-navigation-surfaces-registration-v1";
import { installRecordsWorkspaceRegistrationV1 } from "./records/records-workspace-registration-v1.mjs?v=records-workspace-registration-v1";
import { installRecordComposerV1 } from "./records/record-composer-v1.mjs?v=record-composer-v1";
import { installDataTableControlsV1 } from "./shared/data-table-controls-v1.mjs?v=data-table-controls-v1";
import { installLotDevelopmentRenderGuardV1 } from "./lots/lot-development-page-v1.mjs?v=lot-development-page-v2";
import { installLotProjectWorkspacesRegistrationV1 } from "./lots/lot-project-workspaces-registration-v1.mjs?v=lot-project-workspaces-registration-v1";
import { appStore, demoData, dashboardModes, spreadsheetSchema, activityCatalog, reportCatalog, executionModel, personnelModel, activityInstallationDefaults } from "../state.js?v=system-metrics-v1-20260919";
const downloadCsv = createCsvDownloaderV1({
  documentRef: globalThis.document,
  URLRef: globalThis.URL,
  BlobCtor: globalThis.Blob,
  schedule: globalThis.setTimeout.bind(globalThis),
});
import {
  STAGE_WORKBENCH,
  findWorkbenchActivity,
} from "../stage-workbench-data.mjs";
import { renderActivityFormGroupsV1 } from "../activity-form-groups-v1.mjs?v=activity-form-groups-v1";
import { REPASSE_PRICE_CATALOG } from "../repasse-price-catalog.mjs";
import { renderStageHomePageV1, renderOperationalAiPrioritiesV1 } from "../stage-home-page-v1.mjs?v=stage-home-page-v5";
import { installUsageSettings } from "../usage-settings-v1.mjs?v=2-labels";
import {
  FOREMAN_EXTENSION_VIEWS,
  actorCanOpenView,
  isForemanUser,
  isLimitedOperationalActor,
  navigationItemsForActor,
  normalizeOperationalRole,
} from "../admin-role-policy.mjs?v=admin-role-policy-v3";
import {
  PROPOSAL_VISION_PROMPT,
  parseProposalVisionPayload,
  readProposalImageAsDataUrl,
} from "../proposal-vision.mjs?v=proposal-vision-v1";
// BELAVISTA_MAP_DRAG_INVERTED_V49
import { apiFetch, apiUrl } from "../api-client.mjs?v=instagram-api-live-v1";
import {
  subscribePublicLeads,
  registerOperationalDevice,
  subscribeOperationalNotifications,
  publishOperationalRealtime,
  publishOperationalEvent,
  subscribeOperationalControlCenter,
  saveOperationalProposal,
} from "../firebase.mjs?v=public-runtime-v49";
import "../public-lead-form.mjs?v=public-usability-v1";
import "../reservation-flow.mjs?v=reservation-validation-v1";

// O modelo 3D tem cerca de 22 MB. Não faça download durante a inicialização
// do administrativo; o map-scene dispara o carregamento sob demanda quando a
// superfície do mapa é aberta, mantendo a primeira tela responsiva.
// Toda atividade do administrativo precisa terminar no mesmo editor físico.
// As interfaces antigas ainda usam IDs de etapa, nomes de catálogo e cards de
// agenda diferentes; este adaptador os normaliza sem alterar os dados legados.
const {
  beginCardCanvasLinkV1,
  normalizeActivityRouteTextV1,
  workbenchStageFromValueV1,
  workbenchActivityForValueV1,
  workbenchActivityRouteV1,
  readIntegrationSettings,
  splitStageConfigList,
  normalizeStageMaterialRows,
  defaultStageMaterialRows,
  stageProfilesFromSettings,
  stageMaterialsFor,
  stageMaterialsMarkup,
  executionStageByName,
  stageProfileSettingsFor,
  stagePlanningMarkup,
  WORKDAY_HOURS,
  STAGE_WORK_PACKETS,
  buildStageTimeModels,
  findStageTimeModel,
  formatHours,
  formatPlanningDate,
} = createPlanningRuntimeContextV1({
  appStore,
  demoData,
  executionModel,
  STAGE_WORKBENCH,
  findWorkbenchActivity,
  runtimeRouteV1,
  esc,
  ico,
  stageOverlayKey,
  documentRef: globalThis.document,
  windowRef: globalThis.window,
  getStorage: () => globalThis.localStorage,
});


import {COMPONENT_APPLICATION_CONFIGURATION_V1,ComponentApplicationProgramV1,driveComponentApplicationProgramV1} from './application-program-v1.mjs';

const composeComponentApplicationV1=()=>{
const applicationElementsV1 = registerApplicationElementsV1({
  customElementsRef: customElements,
  navigationDependencies: {
    appStore,
    normalizeOperationalRole,
    isForemanUser,
    isLimitedOperationalActor,
    actorCanOpenView,
    navigationItemsForActor,
    FOREMAN_EXTENSION_VIEWS,
    reportCatalog,
    spreadsheetSchema,
    ico,
    esc,
    notify,
  },
  mapDependencies: {
    demoData,
    appStore,
    dashboardModes,
    esc,
    ico,
    documentRef: document,
    windowRef: window,
    globalRef: globalThis,
    HTMLElementCtor: globalThis.HTMLElement,
  },
  viewLayerDependencies: {
    appStore,
    ico,
    document,
    notify,
    demoData,
    activityCatalog,
    esc,
    stageMaterialsMarkup,
    apiFetch,
    subscribePublicLeads,
    readIntegrationSettings,
    operationalHeaders: (...args) => operationalHeaders(...args),
    stageProfilesFromSettings,
    publishOperationalRealtime,
    subscribeOperationalNotifications,
    normalizeOperationalRole,
    actorCanOpenView,
    isForemanUser,
    isLimitedOperationalActor,
    renderStageHomePageV1,
    stageHomeSnapshotV1: (...args) => stageHomeSnapshotV1(...args),
    stageHomePageMarkupV1: (...args) => stageHomePageMarkupV1(...args),
    reportCatalog,
    syncLiveSystemReportV1: (...args) => syncLiveSystemReportV1(...args),
    stageOverlayKey,
    stageOverlayLabels,
    statusClass,
  },
});
const { AppSidebar, AppTopbar, ViewLayer } = applicationElementsV1;
const {
  MapFilterRail,
  MapScene,
  prepareAssistantLotStatusPromptV1,
  prepareAssistantMapAreaPromptV1,
  dashboardFilters,
  highlightStatus,
} = applicationElementsV1;




installRepassePageV1(ViewLayer, { appStore, esc, ico, REPASSE_PRICE_CATALOG });

installFloatingWidgetLayoutV1(ViewLayer, { appStore });

installStageSurfaceRegistrationV1({
  ViewLayer,
  extensionStage: (...args) => extensionStage(...args),
  stageMaterialsFor,
  stagePlanningMarkup,
  splitStageConfigList,
  readIntegrationSettings,
  integrationSettingsKey: INTEGRATION_SETTINGS_KEY,
  documentRef: globalThis.document,
  windowRef: globalThis.window,
  storageRef: globalThis.localStorage,
  appStore,
  demoData,
  activityCatalog,
  esc,
  notify,
  ico,
});
const stageApplicationCompositionV1 = installStageApplicationCompositionV1({
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
  operationalHeaders: (...args) => operationalHeaders(...args),
  windowRef: globalThis.window,
  globalRef: globalThis,
  installLeadsPages: () => installLeadsPageCompositionV1(ViewLayer, { appStore, demoData, esc, ico }),
});
const { stageContextV1, stageViewTabs, extensionStage, operationalActions, currentPertNodes, actionsPageV1, raciPageV1, raidPageV1, operationalRaid } = stageApplicationCompositionV1;

installCommercialDocumentRenderersV1(ViewLayer, { commissionProfiles, esc, ico });
const financeApplicationCompositionV1 = installFinanceApplicationCompositionV1({
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
  stagePlanning: {
    buildStageTimeModels,
    formatHours,
    formatPlanningDate,
    activityCatalog,
    STAGE_WORK_PACKETS,
    WORKDAY_HOURS,
    findStageTimeModel,
  },
  stageRecordReaders: {
    stageRecordStagesV1: (...args) => stageRecordStagesV1(...args),
    stageRecordStageForV1: (...args) => stageRecordStageForV1(...args),
    stageRecordServiceRowsV1: (...args) => stageRecordServiceRowsV1(...args),
    isAssistantVisualAdditionV1: (...args) => isAssistantVisualAdditionV1(...args),
    controlCenterMaterialRowsV1: (...args) => controlCenterMaterialRowsV1(...args),
  },
  reportCatalog,
  globalRef: globalThis,
  documentRef: document,
  windowRef: window,
  confirmRef: confirm,
  EventCtor: Event,
  FormDataCtor: FormData,
});
const {
  brlToNumber,
  formatBRL,
  commercialScopeV1,
  isAssistantVisualAdditionV1,
  controlCenterMaterialRowsV1,
  controlCenterFinanceRowsV1,
  controlCenterMoneyV1,
  controlCenterRecordChangeV1,
  controlCenterPublishV1,
  controlCenterMaterialsAccordionMarkupV1,
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
} = financeApplicationCompositionV1;
const { operationalSettingsWorkspaceV1 } = installApplicationEventCompositionV1({
  ViewLayer,
  appStore,
  actionsPageV1,
  bindControlPageEventsV8,
  bindLeadsMapConversationV1,
  brokersControlV8,
  commissionProfiles,
  demoData,
  downloadCsv,
  esc,
  financeWorkspaceV8,
  ico,
  notify,
  raciPageV1,
  raidPageV1,
  readIntegrationSettings,
  integrationSettingsKey: INTEGRATION_SETTINGS_KEY,
  apiFetch,
  operationalHeaders,
  registerOperationalDevice,
  reportCatalog,
  syncLiveSystemReportV1,
  windowRef: globalThis.window,
  documentRef: globalThis.document,
  storage: globalThis.localStorage,
  CustomEventCtor: globalThis.CustomEvent,
  FormDataCtor: globalThis.FormData,
  confirmFn: globalThis.confirm?.bind(globalThis),
  DateCtor: globalThis.Date,
  consoleRef: globalThis.console,
  customElementsRef: globalThis.customElements,
});



const commercialApplicationCompositionV1 = installCommercialApplicationCompositionV1({
  ViewLayer,
  appStore,
  commissionDeals,
  commissionProfiles,
  repassePriceCatalog: REPASSE_PRICE_CATALOG,
  esc,
  ico,
  formatBRL,
  brlToNumber,
  contractStatusClassV1,
  apiFetch,
  operationalHeaders,
  notify,
  prepareAssistantLotStatusPromptV1,
  globalRef: globalThis,
});
const {
  commissionNegotiationDealsV1,
  commissionNegotiationProfileV1,
  commissionNegotiationTransactionsV1,
  commissionNegotiationDateV1,
  commissionNegotiationsMarkupV1,
  commissionAttachmentListV1,
  commissionFileToDataUrlV1,
  bindCommissionNegotiationEventsV1,
  lotDetailPageV1,
} = commercialApplicationCompositionV1;
const { downloadBrandedLotExcelV1, lotExportRowV1 } = lotDetailPageV1;

// Install the planning page family as one category while preserving every
// renderer and event override in the historical registration sequence.
const planningPagesApplicationV1 = installPlanningPagesApplicationV1({
  ViewLayer,
  appStore,
  demoData,
  commissionDeals,
  executionModel,
  activityCatalog,
  extensionStage,
  stageOverlayKey,
  stageProfileSettingsFor,
  stageMaterialsFor,
  formatBRL,
  esc,
  ico,
  notify,
  runtimeRouteV1,
  apiFetch,
  operationalHeaders,
  highlightStatus,
  workbenchActivityRouteV1,
  controlCenterData: {
    brokerReasonsV9,
    controlCenterMaterialRowsV1,
    controlCenterFinanceRowsV1,
    controlCenterMoneyV1,
    controlCenterRecordChangeV1,
    controlCenterPublishV1,
  },
  stageRecordServices: {
    stageContextV1,
    stageViewTabs,
    currentPertNodes,
    operationalRaid,
    stageHomePageMarkupV1: (...args) => stageHomePageMarkupV1(...args),
    workbenchStageFromValueV1,
  },
  cashRecordLauncherMarkupV1,
  subscribeOperationalControlCenter,
  readIntegrationSettings,
  integrationSettingsKey: INTEGRATION_SETTINGS_KEY,
  normalizeStageMaterialRows,
  defaultStageMaterialRows,
  STAGE_WORKBENCH,
  splitStageConfigList,
  beginCardCanvasLinkV1,
  dashboardFilters,
  installLotDevelopmentRenderGuardV1,
  isLimitedOperationalActor,
  operationalActions,
  publishOperationalEvent,
  personnelModel,
  activityInstallationDefaults,
  normalizeActivityRouteTextV1,
  renderActivityFormGroupsV1,
  globalRef: globalThis,
});
const {
  stageOf,
  stageV9LiveFor,
  stageV9ByState,
  stageV9OperationalFor,
  stageV9ProfileFor,
  stageV9ProductionFor,
  stageV9MaterialsFor,
  stageV9BudgetFor,
  stageV9StatusFor,
  stageV9DirectiveText,
  stageV9FlowPackets,
  stageV9EscList,
  stageV9TreeNode,
  dashboardHomePageV1,
  controlStageContextV1,
  controlCenterPageV1,
  stageHeader3DMarkup,
  controlCenterRealtimeLabelV1,
  controlStageProfileV1,
  controlStageMaterialRowsV1,
  controlStageContextMarkupV1,
  controlStagePropertyGridMarkupV1,
  controlStageUnifiedFormMarkupV1,
  controlStageContextPayloadV1,
  stagePersistentTimelineMarkupV1,
  AGENDA_CALENDAR_STORAGE_KEY_V3,
  AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
  AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6,
  AGENDA_CALENDAR_DAY_BODY_HEIGHT_V6,
  agendaCalendarPadV3,
  agendaCalendarIsoV3,
  agendaCalendarMonthKeyV3,
  agendaCalendarParseDateV3,
  agendaCalendarAddDaysV3,
  agendaCalendarTimeToHoursV3,
  agendaCalendarHoursToTimeV3,
  agendaCalendarMonthLabelV3,
  agendaCalendarShiftMonthV3,
  agendaCalendarMonthDaysV3,
  agendaCalendarWeekStartV8,
  agendaCalendarWeekKeyV8,
  agendaCalendarWeekDaysV8,
  agendaCalendarShiftWeekV8,
  agendaCalendarWeekLabelV8,
  agendaCalendarInitialWeekV8,
  agendaCalendarLastAvailableSlotV8,
  agendaCalendarReadV3,
  agendaCalendarWriteV3,
  agendaCalendarFindStageV3,
  agendaCalendarActivitiesForStageV3,
  agendaCalendarDemoEventsV3,
  agendaCalendarOperationalEventsV3,
  agendaCalendarStateV3,
  agendaCalendarInitialMonthV3,
  agendaCalendarEventEndV3,
  agendaCalendarLastAvailableSlotV3,
  agendaCalendarStatusToneV3,
  agendaCalendarEventMarkupV3,
  agendaCalendarFormMarkupV3,
  agendaCalendarMarkupV3,
  stageHomeSnapshotV1,
} = planningPagesApplicationV1;


// FINAL_COMMISSION_RENDERER_V1: reaplicado após os renderizadores legados.
installCommissionPageRenderersV1(ViewLayer, {appStore,commissionNegotiationsMarkupV1});

const { mountRecordDropinV1 } = installRecordComposerV1(ViewLayer, { ico });

installCashRecordFiscalControlsV1(ViewLayer, {
  appStore,
  mountRecordDropinV1,
});

// Ativa a carteira após os renderizadores legados declarados acima.
installBrokerProfileRegistrationV1({ViewLayer,appStore,commissionDeals,brokerReasonsV9,brlToNumber,formatBRL,esc,ico,notify,storage:localStorage,fileToDataUrl:commissionFileToDataUrlV1,windowRef:window});
installLotProjectWorkspacesRegistrationV1({
  ViewLayer,
  appStore,
  REPASSE_PRICE_CATALOG,
  esc,
  EventCtor: globalThis.Event,
  FormDataCtor: globalThis.FormData,
  formatBRL,
  host: globalThis,
  ico,
  notify,
  runtimeRouteV1,
});

installDataTableControlsV1(ViewLayer);

installStageNavigationSurfacesRegistrationV1({
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
});

installUsageSettings({ViewLayer, appStore, readIntegrationSettings, integrationKey: INTEGRATION_SETTINGS_KEY});
// O módulo de preferências é mantido para o bootstrap, mas a superfície da
// rota Configurações é a grade histórica de corretores solicitada pelo produto.
installBrokerSettingsRendererV1(ViewLayer, brokersControlV8);

installControlCenterPriorityChatV1(ViewLayer, {
  appStore,
  operationalActions,
  renderOperationalAiPrioritiesV1,
  CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
  notify,
});

installRecordsWorkspaceRegistrationV1({ViewLayer,appStore,controlCenterMaterialRowsV1,controlCenterPublishV1,controlCenterRecordChangeV1,esc,executionModel,ico,normalizeActivityRouteTextV1,notify,stageProfileSettingsFor,stageV9FlowPackets,apiFetch,operationalHeaders,documentRef:globalThis.document,DateCtor:globalThis.Date});
// STAGE_RECORD_CENTER_V1
// A Central operacional deixa de ser uma consolidação de contratos/comissões:
// ela passa a ser a leitura operacional das etapas, seus registros e anexos.
const recordApplicationV1 = installRecordApplicationCompositionV1({
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
  host: globalThis,
  documentRef: globalThis.document,
});
const {
  stageRecordNormalizeV1,
  stageRecordStagesV1,
  stageRecordStageForV1,
  stageRecordAttachmentsV1,
  stageRecordPropertiesV1,
  stageRecordStatusLabelV1,
  stageRecordProgressV1,
  stageRecordMaterialRowsV1,
  stageRecordEstimateNameKeyV1,
  stageRecordEstimateMatchesV1,
  stageRecordEstimateKindV1,
  stageRecordEstimateNumberV1,
  stageRecordEstimateFormatV1,
  stageRecordServiceRowsV1,
  stageMaterialReportDialogV1,
  stageMaterialReportBindV1,
  stageRecordCenterItemModalMarkupV1,
  stageHomeRecordResourcesMarkupV1,
  stageHomePageMarkupV1,
  stageRecordDashboardActionWorkspaceMarkupV1,
} = recordApplicationV1;


// BELAVISTA_DIRECTORY_HISTORY_SETTINGS_AGENDA_V1
const commercialHistoryRegistrationV1 = installCommercialHistoryRegistrationV1({
  ViewLayer,
  appStore,
  commissionDeals,
  commissionNegotiationDealsV1,
  commissionNegotiationProfileV1,
  commissionNegotiationTransactionsV1,
  commissionAttachmentListV1,
  commissionProfiles,
  contractStatusClassV1,
  brokerReasonsV9,
  executionModel,
  brlToNumber,
  formatBRL,
  esc,
  ico,
  notify,
  settingsAuditTemplate: operationalSettingsWorkspaceV1.render,
  FormDataCtor: globalThis.FormData,
  windowRef: globalThis.window,
});
const { commercialDealsForWorkspaceV1, brokerWorkspaceStatsV1 } = commercialHistoryRegistrationV1;
installAgendaDashboardDetailV1(ViewLayer, {
  appStore, agendaCalendarReadV3, agendaCalendarOperationalEventsV3, agendaCalendarIsoV3, agendaCalendarWriteV3, agendaCalendarParseDateV3, agendaCalendarStatusToneV3, agendaCalendarAddDaysV3, executionModel, stageV9LiveFor, esc, ico, notify, stageRecordStagesV1, stageRecordDashboardActionWorkspaceMarkupV1, stageMaterialReportDialogV1, stageRecordMaterialRowsV1, capacitor: globalThis.Capacitor, NotificationCtor: globalThis.Notification, FormDataCtor: globalThis.FormData, queueMicrotaskFn: globalThis.queueMicrotask.bind(globalThis),
});
installStageHomeRecordResourcesApplicationV1({
  ViewLayer,
  appStore,
  demoData,
  installLotDevelopmentRenderGuardV1,
  stageRecordServices: {
    stageRecordStagesV1,
    stageRecordMaterialRowsV1,
    stageRecordServiceRowsV1,
    stageMaterialReportBindV1,
    stageRecordNormalizeV1,
    stageRecordCenterItemModalMarkupV1,
    stageHomeRecordResourcesMarkupV1,
  },
  globalRef: globalThis,
});
installCommercialDirectoryContractsRegistrationV1({
  ViewLayer,
  appStore,
  commissionProfiles,
  commissionDeals,
  commercialDealsForWorkspaceV1,
  brokerWorkspaceStatsV1,
  normalizeOperationalRole,
  commercialScopeV1,
  brlToNumber,
  formatBRL,
  esc,
  ico,
  notify,
  readProposalImageAsDataUrl,
  PROPOSAL_VISION_PROMPT,
  parseProposalVisionPayload,
  saveOperationalProposal,
  host: globalThis,
});
installAiAgendaSettingsV1(ViewLayer, { appStore, esc, notify });
const AiChat = registerBelavistaAdminAiChatV1({
  host: globalThis,
  appStore,
  demoData,
  executionModel,
  apiFetch,
  operationalHeaders,
  agendaCalendar: {
    lastAvailableSlot: agendaCalendarLastAvailableSlotV8,
    parseDate: agendaCalendarParseDateV3,
    read: agendaCalendarReadV3,
    weekKey: agendaCalendarWeekKeyV8,
    write: agendaCalendarWriteV3,
    normalizeActivityRouteText: normalizeActivityRouteTextV1,
  },
  stageRecords: {
    attachments: stageRecordAttachmentsV1,
    normalize: stageRecordNormalizeV1,
  },
  ui: { esc, ico, notify },
});


  return {AppSidebar,AppTopbar,ViewLayer,MapFilterRail,MapScene,prepareAssistantLotStatusPromptV1,prepareAssistantMapAreaPromptV1,ico,esc,AiChat};
};

const componentExportsV1=await driveComponentApplicationProgramV1(
  ComponentApplicationProgramV1.program({compose:composeComponentApplicationV1}),
  {
    'resolve-component-runtime':({host})=>{
      if(!host?.document)throw new Error('Component application requires a browser document.');
      return host;
    },
    'validate-component-configuration':({configuration})=>{
      if(!configuration?.root||!Array.isArray(configuration.groups)||new Set(configuration.groups).size!==configuration.groups.length)
        throw new Error('Invalid component application configuration.');
      return configuration;
    },
    'compose-component-application':({compose})=>{
      if(typeof compose!=='function')throw new Error('Component application composer is unavailable.');
      return compose();
    },
    'publish-component-application':({runtime,components})=>{
      runtime.BELAVISTA_COMPONENTS_V1=components;
    }
  }
);

export const {AppSidebar,AppTopbar,ViewLayer,MapFilterRail,MapScene,prepareAssistantLotStatusPromptV1,prepareAssistantMapAreaPromptV1,AiChat}=componentExportsV1;
export {ico,esc};
export {COMPONENT_APPLICATION_CONFIGURATION_V1,ComponentApplicationProgramV1,driveComponentApplicationProgramV1};
