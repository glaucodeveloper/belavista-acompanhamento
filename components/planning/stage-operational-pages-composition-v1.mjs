import { createDashboardHomePageV1 } from "./dashboard-home-page-v1.mjs?v=dashboard-home-page-v1";
import { createStageAgendaHelpersV1, createStageAgendaPageV1, installStageAgendaPageEventsV1 } from "./stage-agenda-page-v1.mjs?v=stage-agenda-page-v2";
import { installStageActivityPageV1 } from "./stage-activity-page-v1.mjs?v=stage-activity-page-v2";
import { installStageActivityPageEventsV1 } from "./stage-activity-page-events-v1.mjs?v=stage-activity-page-events-v1";
import * as stageActivityComponentsTsV1 from "../../dist/frontend/components.js";
import { createAtlasStageOperationalModelV1, createAtlasStageAgendaEventWriterV1, createAtlasStageActivityAdminLoaderV1, installAtlasActivityAdminMutationCommandsV1, applyAtlasStageActivityPageActionV1, applyAtlasStageActivityNavigationV1, projectAtlasStageAgendaNextSlotV1, projectAtlasStageAgendaMaterialsV1, validateAtlasStageAgendaSlotV1 } from "../../dist/frontend/program.js";
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
  ensureAgendaCalendarLoadedV8,
  controlCenterMaterialRowsV1,
  notify,
} = {}) => {
  const stageOperationalModelInputV1 = {
    appStore,
    demoData,
    executionModel,
    stageOverlayKey,
    stageProfileSettingsFor,
    stageMaterialsFor,
    esc,
  };
  const stageOperationalModelV1 = typeof createAtlasStageOperationalModelV1 === "function"
    ? createAtlasStageOperationalModelV1(stageOperationalModelInputV1)
    : createStageOperationalModelV1(stageOperationalModelInputV1);
  const stageV9EscList = typeof stageActivityComponentsTsV1.renderAtlasStageEscListV1 === "function"
    ? (items, empty = "Não configurado") => stageActivityComponentsTsV1.renderAtlasStageEscListV1(items, esc, empty)
    : stageOperationalModelV1.stageV9EscList;
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
  } = stageOperationalModelV1;

  const dashboardHomeInputV1 = {
    appStore,
    demoData,
    executionModel,
    formatBRL,
    esc,
    ico,
    stageV9DirectiveText,
    stageV9ProfileFor,
    apiFetch,
    document: globalRef.document,
    URL: globalRef.URL,
    Blob: globalRef.Blob,
    notify,
    window: globalRef.window,
    workbenchActivityRouteV1,
  };
  const dashboardHomePageV1 = typeof stageActivityComponentsTsV1.createAtlasDashboardHomePageV1 === "function"
    ? stageActivityComponentsTsV1.createAtlasDashboardHomePageV1({
        ...dashboardHomeInputV1,
        documentRef: globalRef.document,
        URLCtor: globalRef.URL,
        BlobCtor: globalRef.Blob,
        windowRef: globalRef.window,
      })
    : createDashboardHomePageV1(dashboardHomeInputV1);
  ViewLayer.prototype.assistant = dashboardHomePageV1.render;

  const stageDedicatedPageDependenciesV1 = {
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
  };
  if (typeof stageActivityComponentsTsV1.installAtlasStageDedicatedPageBaseV1 === "function") {
    stageActivityComponentsTsV1.installAtlasStageDedicatedPageBaseV1(ViewLayer, stageDedicatedPageDependenciesV1);
  } else {
    installStageDedicatedPageBaseV1(ViewLayer, { ...stageDedicatedPageDependenciesV1, stageV9EscList });
  }

  const stageV9DedicatedAgendaBase = ViewLayer.prototype.activityDedicatedPage;
  const legacyStageAgendaHelpersV1 = createStageAgendaHelpersV1({
    agendaCalendarIsoV3: (...args) => agendaCalendarIsoV3(...args),
    agendaCalendarParseDateV3: (...args) => agendaCalendarParseDateV3(...args),
    agendaCalendarTimeToHoursV3: (...args) => agendaCalendarTimeToHoursV3(...args),
    agendaCalendarEventEndV3: (...args) => agendaCalendarEventEndV3(...args),
    controlCenterMaterialRowsV1: (...args) => controlCenterMaterialRowsV1(...args),
    stageOf,
    esc,
    DateCtor: globalRef.Date,
  });
  const calendarPortsV1 = {
    isoDate: (...args) => agendaCalendarIsoV3(...args),
    parseDate: (...args) => agendaCalendarParseDateV3(...args),
    timeToHours: (...args) => agendaCalendarTimeToHoursV3(...args),
    eventEnd: (...args) => agendaCalendarEventEndV3(...args),
  };
  const typedStageAgendaNextSlotV1 = (events, durationHours = 1.5) => projectAtlasStageAgendaNextSlotV1(
    events || [], durationHours, new globalRef.Date(), calendarPortsV1,
  );
  const createStageAgendaEventV1 = createAtlasStageAgendaEventWriterV1({
    appStore,
    executionStages: executionModel.stages || [],
    stageV9FlowPackets,
    readCalendar: () => agendaCalendarReadV3(),
    writeCalendar: data => agendaCalendarWriteV3(data),
    weekKey: date => agendaCalendarWeekKeyV8(date),
    calendarPorts: calendarPortsV1,
    nowMs: () => globalRef.Date.now(),
    random: () => globalRef.Math.random(),
  });
  let typedStageAgendaInstalledV1 = false;
  try {
    typedStageAgendaInstalledV1 = typeof stageActivityComponentsTsV1.installAtlasStageAgendaPageV1 === "function"
      && typeof projectAtlasStageAgendaMaterialsV1 === "function"
      && typeof validateAtlasStageAgendaSlotV1 === "function"
      && stageActivityComponentsTsV1.installAtlasStageAgendaPageV1(ViewLayer, {
        readState: () => appStore.get(),
        onAction: action => {
          if (action.kind === "open-agenda-event") {
            appStore.set({ view: "agenda", selectedAgendaEventV3: action.eventId, lastAction: "Abriu atividade na agenda" });
          }
        },
        executionModel,
        stageV9ByState,
        stageV9LiveFor,
        stageV9FlowPackets,
        stageOf,
        agendaCalendarReadV3: (...args) => agendaCalendarReadV3(...args),
        agendaCalendarOperationalEventsV3: (...args) => agendaCalendarOperationalEventsV3(...args),
        agendaCalendarParseDateV3: (...args) => agendaCalendarParseDateV3(...args),
        agendaCalendarTimeToHoursV3: (...args) => agendaCalendarTimeToHoursV3(...args),
        agendaCalendarEventEndV3: (...args) => agendaCalendarEventEndV3(...args),
        agendaCalendarWriteV3: (...args) => agendaCalendarWriteV3(...args),
        agendaCalendarWeekKeyV8: (...args) => agendaCalendarWeekKeyV8(...args),
        controlCenterMaterialRowsV1: (...args) => controlCenterMaterialRowsV1(...args),
        stageAgendaNextSlotV1: typedStageAgendaNextSlotV1,
        projectStageAgendaMaterialsV1: (...args) => projectAtlasStageAgendaMaterialsV1(...args),
        createStageAgendaEventV1,
        validateStageAgendaSlotV1: (...args) => validateAtlasStageAgendaSlotV1(...args, calendarPortsV1),
        stageV9DedicatedAgendaBase,
        ensureAgendaCalendarLoadedV8: (...args) => ensureAgendaCalendarLoadedV8?.(...args),
        esc,
        FormData: globalRef.FormData,
        DateCtor: globalRef.Date,
      });
  } catch (error) {
    globalRef.console?.warn?.("[Aliança Park] TypeScript stage agenda owner unavailable; keeping MJS fallback.", error);
  }
  if (!typedStageAgendaInstalledV1) {
    const { stageAgendaNextSlotV1, stageAgendaMaterialSidebarV1 } = legacyStageAgendaHelpersV1;
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
  }

  let typedStageActivityPageInstalledV1 = false;
  const loadStageActivitiesV1 = createAtlasStageActivityAdminLoaderV1({ appStore, apiFetch });
  try {
    typedStageActivityPageInstalledV1 =
      typeof stageActivityComponentsTsV1.installAtlasStageActivityPageV1 === "function"
      && stageActivityComponentsTsV1.installAtlasStageActivityPageV1(ViewLayer, {
        readState: () => appStore.get(),
        onAction: action => applyAtlasStageActivityPageActionV1({ action, appStore, loadActivities: loadStageActivitiesV1 }),
        installActivityAdminMutations: (page, reload) => installAtlasActivityAdminMutationCommandsV1({
          page,
          appStore,
          apiFetch,
          reload,
          confirm: message => Boolean(globalRef.confirm?.(message)),
        }),
        dispatchNavigation: command => applyAtlasStageActivityNavigationV1({
          appStore,
          executionModel,
          extensionStage,
          stageV9FlowPackets,
          command,
        }),
        apiFetch,
        executionModel,
        activityCatalog,
        extensionStage,
        stageV9FlowPackets,
        stageV9ByState,
        stageV9ProfileFor,
        stageV9LiveFor,
        stageV9MaterialsFor,
        stageV9BudgetFor,
        stageOf,
        stageV9ProductionFor,
        stageV9DirectiveText,
        formatBRL,
        esc,
        ico,
        notify,
        workbenchActivityRouteV1,
        globalRef,
      });
  } catch (error) {
    globalRef.console?.warn?.("[Aliança Park] TypeScript stage activity owner unavailable; keeping MJS fallback.", error);
  }
  if (!typedStageActivityPageInstalledV1) {
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
  }

  return Object.freeze({
    ...stageOperationalModelV1,
    stageV9EscList,
    dashboardHomePageV1,
  });
};
