import { createDashboardHomePageV1 } from "./dashboard-home-page-v1.mjs?v=dashboard-home-page-v1";
import { createStageAgendaHelpersV1, createStageAgendaPageV1, installStageAgendaPageEventsV1 } from "./stage-agenda-page-v1.mjs?v=stage-agenda-page-v2";
import { installStageActivityPageV1 } from "./stage-activity-page-v1.mjs?v=stage-activity-page-v2";
import { installStageActivityPageEventsV1 } from "./stage-activity-page-events-v1.mjs?v=stage-activity-page-events-v1";
import { installStageDedicatedPageBaseV1 } from "./stage-dedicated-page-base-v1.mjs?v=stage-dedicated-page-base-v1";
import { createStageOperationalModelV1 } from "./stage-operational-model-v1.mjs?v=stage-operational-model-v1";

/**
 * Owns the operational stage model and its dashboard, agenda, and activity
 * page bindings while preserving the original component bootstrap sequence.
 */
export const installStageOperationalPagesCompositionV1 = ({
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
  globalRef = globalThis,
  workbenchActivityRouteV1,
  agendaCalendarIsoV3,
  agendaCalendarParseDateV3,
  agendaCalendarTimeToHoursV3,
  agendaCalendarEventEndV3,
  agendaCalendarReadV3,
  agendaCalendarOperationalEventsV3,
  agendaCalendarWriteV3,
  agendaCalendarWeekKeyV8,
  controlCenterMaterialRowsV1,
  notify,
} = {}) => {
  const stageOperationalModelV1 = createStageOperationalModelV1({
    appStore,
    demoData,
    executionModel,
    stageOverlayKey,
    stageProfileSettingsFor,
    stageMaterialsFor,
    esc,
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
  } = stageOperationalModelV1;

  const dashboardHomePageV1 = createDashboardHomePageV1({
    appStore,
    demoData,
    executionModel,
    formatBRL,
    esc,
    ico,
    stageV9DirectiveText,
    stageV9ProfileFor,
    window: globalRef.window,
    workbenchActivityRouteV1,
  });
  ViewLayer.prototype.assistant = dashboardHomePageV1.render;

  installStageDedicatedPageBaseV1(ViewLayer, {
    appStore,
    executionModel,
    stageV9ByState,
    stageV9LiveFor,
    stageV9ProfileFor,
    stageV9MaterialsFor,
    stageV9FlowPackets,
    stageV9BudgetFor,
    stageOf,
    stageV9StatusFor,
    stageV9ProductionFor,
    stageV9DirectiveText,
    stageV9EscList,
    formatBRL,
    esc,
    ico,
  });

  const stageV9DedicatedAgendaBase = ViewLayer.prototype.activityDedicatedPage;
  const { stageAgendaNextSlotV1, stageAgendaMaterialSidebarV1 } = createStageAgendaHelpersV1({
    agendaCalendarIsoV3: (...args) => agendaCalendarIsoV3(...args),
    agendaCalendarParseDateV3: (...args) => agendaCalendarParseDateV3(...args),
    agendaCalendarTimeToHoursV3: (...args) => agendaCalendarTimeToHoursV3(...args),
    agendaCalendarEventEndV3: (...args) => agendaCalendarEventEndV3(...args),
    controlCenterMaterialRowsV1: (...args) => controlCenterMaterialRowsV1(...args),
    stageOf,
    esc,
    DateCtor: globalRef.Date,
  });
  ViewLayer.prototype.activityDedicatedPage = createStageAgendaPageV1({
    appStore,
    executionModel,
    stageV9ByState,
    stageV9FlowPackets,
    agendaCalendarReadV3: (...args) => agendaCalendarReadV3(...args),
    agendaCalendarOperationalEventsV3: (...args) => agendaCalendarOperationalEventsV3(...args),
    controlCenterMaterialRowsV1: (...args) => controlCenterMaterialRowsV1(...args),
    stageAgendaNextSlotV1,
    stageV9LiveFor,
    stageAgendaMaterialSidebarV1,
    stageV9DedicatedAgendaBase,
    esc,
  });
  installStageAgendaPageEventsV1(ViewLayer, {
    appStore,
    executionModel,
    stageV9FlowPackets,
    agendaCalendarReadV3: (...args) => agendaCalendarReadV3(...args),
    agendaCalendarOperationalEventsV3: (...args) => agendaCalendarOperationalEventsV3(...args),
    agendaCalendarParseDateV3: (...args) => agendaCalendarParseDateV3(...args),
    agendaCalendarTimeToHoursV3: (...args) => agendaCalendarTimeToHoursV3(...args),
    agendaCalendarEventEndV3: (...args) => agendaCalendarEventEndV3(...args),
    agendaCalendarWriteV3: (...args) => agendaCalendarWriteV3(...args),
    agendaCalendarWeekKeyV8: (...args) => agendaCalendarWeekKeyV8(...args),
    stageAgendaNextSlotV1,
    FormData: globalRef.FormData,
  });

  installStageActivityPageV1(ViewLayer, {
    appStore,
    executionModel,
    activityCatalog,
    extensionStage,
    stageV9FlowPackets,
    stageV9ProfileFor,
    stageV9LiveFor,
    stageV9MaterialsFor,
    stageV9BudgetFor,
    stageOf,
    stageV9ProductionFor,
    stageV9DirectiveText,
    formatBRL,
    apiFetch,
    esc,
    ico,
    Date: globalRef.Date,
  });
  installStageActivityPageEventsV1(ViewLayer, {
    appStore,
    executionModel,
    stageV9FlowPackets,
    stageV9ByState,
    stageOf,
    extensionStage,
    activityCatalog,
    workbenchActivityRouteV1,
    esc,
    ico,
    notify,
    document: globalRef.document,
    window: globalRef.window,
    URL: globalRef.URL,
  });

  return Object.freeze({
    ...stageOperationalModelV1,
    dashboardHomePageV1,
  });
};
