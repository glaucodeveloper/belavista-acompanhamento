import { installPlanningPageRegistrationsV1 } from "./planning-page-registrations-v1.mjs?v=planning-page-registrations-v1";
import { installOperationalMapPageV1 } from "../map/operational-map-page-v1.mjs?v=operational-map-page-v2";
import { installStageOperationalPagesCompositionV1 } from "./stage-operational-pages-composition-v1.mjs?v=stage-operational-pages-composition-v1";
import { installControlCenterApplicationCompositionV1 } from "./control-center-application-composition-v1.mjs?v=control-center-application-composition-v1";
import { installActivityRouteBridgeLifecycleV1 } from "./activity-route-bridge-lifecycle-v1.mjs?v=activity-route-bridge-lifecycle-v1";
import { installPersonnelPageRegistrationV1 } from "./personnel-page-registration-v1.mjs?v=personnel-page-registration-v1";
import { installLeadsDirectoryRegistrationV1 } from "../commercial/leads-directory-registration-v1.mjs?v=leads-directory-registration-v1";
import { installStagePagesApplicationCompositionV1 } from "./stage-pages-application-composition-v1.mjs?v=stage-pages-application-composition-v1";
import { installStageAgendaApplicationCompositionV1 } from "./stage-agenda-application-composition-v1.mjs?v=stage-agenda-application-composition-v1";

const PLANNING_PAGE_INSTALLERS_V1 = Object.freeze({
  installPlanningPageRegistrationsV1,
  installOperationalMapPageV1,
  installStageOperationalPagesCompositionV1,
  installControlCenterApplicationCompositionV1,
  installActivityRouteBridgeLifecycleV1,
  installPersonnelPageRegistrationV1,
  installLeadsDirectoryRegistrationV1,
  installStagePagesApplicationCompositionV1,
  installStageAgendaApplicationCompositionV1,
});

/** Install the complete stage/planning page family in its historical order. */
export const installPlanningPagesApplicationV1 = ({
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
  stageRecordServices,
  controlCenterData,
  cashRecordLauncherMarkupV1,
  subscribeOperationalControlCenter,
  readIntegrationSettings,
  integrationSettingsKey,
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
  installers = PLANNING_PAGE_INSTALLERS_V1,
  globalRef = globalThis,
} = {}) => {
  // Keep the application-specific registration and final map override ahead
  // of the stage-owned renderers, as in the original bootstrap.
  installers.installPlanningPageRegistrationsV1({
    globalRef,
    ViewLayer,
    appStore,
    demoData,
    commissionDeals,
    esc,
    ico,
    notify,
    runtimeRouteV1,
    apiFetch,
    operationalHeaders,
    windowRef: globalRef.window,
    consoleRef: globalRef.console,
    DateCtor: globalRef.Date,
  });

  installers.installOperationalMapPageV1(ViewLayer, { appStore, highlightStatus, esc });

  const calendar = {};
  const stageOperational = installers.installStageOperationalPagesCompositionV1({
    ViewLayer,
    appStore,
    demoData,
    executionModel,
    activityCatalog,
    extensionStage,
    stageOverlayKey,
    stageProfileSettingsFor,
    stageMaterialsFor,
    formatBRL,
    apiFetch,
    esc,
    ico,
    globalRef,
    workbenchActivityRouteV1,
    agendaCalendarIsoV3: (...args) => calendar.agendaCalendarIsoV3(...args),
    agendaCalendarParseDateV3: (...args) => calendar.agendaCalendarParseDateV3(...args),
    agendaCalendarTimeToHoursV3: (...args) => calendar.agendaCalendarTimeToHoursV3(...args),
    agendaCalendarEventEndV3: (...args) => calendar.agendaCalendarEventEndV3(...args),
    agendaCalendarReadV3: (...args) => calendar.agendaCalendarReadV3(...args),
    agendaCalendarOperationalEventsV3: (...args) => calendar.agendaCalendarOperationalEventsV3(...args),
    agendaCalendarWriteV3: (...args) => calendar.agendaCalendarWriteV3(...args),
    agendaCalendarWeekKeyV8: (...args) => calendar.agendaCalendarWeekKeyV8(...args),
    controlCenterMaterialRowsV1: (...args) => controlCenterData.controlCenterMaterialRowsV1(...args),
    notify,
  });

  const controlCenter = installers.installControlCenterApplicationCompositionV1({
    ViewLayer,
    appStore,
    executionModel,
    demoData,
    commissionDeals,
    brokerReasonsV9: controlCenterData.brokerReasonsV9,
    controlCenterData,
    cashRecordLauncherMarkupV1,
    subscribeOperationalControlCenter,
    readIntegrationSettings,
    integrationSettingsKey,
    apiFetch,
    operationalHeaders,
    stageContext: {
      normalizeStageMaterialRows,
      defaultStageMaterialRows,
      stageV9LiveFor: stageOperational.stageV9LiveFor,
      stageV9StatusFor: stageOperational.stageV9StatusFor,
      STAGE_WORKBENCH,
      workbenchStageFromValueV1: stageRecordServices.workbenchStageFromValueV1,
      splitStageConfigList,
    },
    formatBRL,
    esc,
    ico,
    notify,
    stageViewTabs: stageRecordServices.stageViewTabs,
    stageOverlayKey,
    extensionStage,
    requestAnimationFrameFn: globalRef.requestAnimationFrame.bind(globalRef),
  });

  installers.installActivityRouteBridgeLifecycleV1({
    ViewLayer,
    workbenchActivityRouteV1,
    documentRef: globalRef.document,
    queueMicrotaskFn: globalRef.queueMicrotask.bind(globalRef),
  });

  installers.installPersonnelPageRegistrationV1({
    ViewLayer,
    appStore,
    executionModel,
    publishOperationalEvent,
    extensionStage,
    personnelModel,
    stageV9LiveFor: stageOperational.stageV9LiveFor,
    esc,
    ico,
    logger: globalRef.console,
    host: globalRef,
  });

  installers.installLeadsDirectoryRegistrationV1({
    ViewLayer,
    appStore,
    apiFetch,
    runtimeRouteV1,
    demoData,
    esc,
    ico,
    notify,
    host: globalRef,
  });

  const stagePages = installers.installStagePagesApplicationCompositionV1({
    ViewLayer,
    appStore,
    activityCatalog,
    beginCardCanvasLinkV1,
    controlStageProfileV1: controlCenter.controlStageProfileV1,
    currentPertNodes: stageRecordServices.currentPertNodes,
    dashboardFilters,
    dashboardHomePageV1: stageOperational.dashboardHomePageV1,
    demoData,
    documentRef: globalRef.document,
    executionModel,
    extensionStage,
    esc,
    fetcher: (input, init) => apiFetch(input, init),
    ico,
    installLotDevelopmentRenderGuardV1: (viewLayer, options) =>
      installLotDevelopmentRenderGuardV1(viewLayer, options),
    isLimitedOperationalActor,
    notify,
    operationalActions,
    runtimeRouteV1,
    stageContextV1: stageRecordServices.stageContextV1,
    stageHeader3DMarkup: controlCenter.stageHeader3DMarkup,
    stageV9LiveFor: stageOperational.stageV9LiveFor,
    windowRef: globalRef.window,
  });

  const stagePersistentTimelineMarkupV1 = stagePages.stagePersistentTimelineMarkupV1;
  const stageAgenda = installers.installStageAgendaApplicationCompositionV1({
    ViewLayer,
    apiFetch,
    STAGE_WORKBENCH,
    activityCatalog,
    activityInstallationDefaults,
    appStore,
    beginCardCanvasLinkV1,
    dashboardPageMarkup: () => stageRecordServices.stageHomePageMarkupV1,
    demoData,
    esc,
    executionModel,
    extensionStage,
    globalRef,
    ico,
    normalizeActivityRouteTextV1,
    notify,
    operationalRaid: stageRecordServices.operationalRaid,
    renderActivityFormGroupsV1,
    stagePersistentTimelineMarkupV1,
    stageV9LiveFor: stageOperational.stageV9LiveFor,
    stageV9MaterialsFor: stageOperational.stageV9MaterialsFor,
    stageV9ProductionFor: stageOperational.stageV9ProductionFor,
    stageV9StatusFor: stageOperational.stageV9StatusFor,
    workbenchStageFromValueV1: stageRecordServices.workbenchStageFromValueV1,
  });
  Object.assign(calendar, stageAgenda);

  return Object.freeze({
    ...stageOperational,
    ...controlCenter,
    ...stageRecordServices,
    ...stagePages,
    ...stageAgenda,
    stagePersistentTimelineMarkupV1,
  });
};
