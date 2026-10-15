import { installActivityInstallationSessionV1 } from "./activity-installation-session-v1.mjs?v=activity-installation-session-v1";
import { installStageHomeCalendarV1 } from "./stage-home-calendar-v1.mjs?v=stage-home-calendar-v1";
import { installAgendaCalendarPageV8 } from "./agenda-calendar-v8.mjs?v=agenda-calendar-route-fix-v1";

/** Install the agenda calendar, activity-installation route, and stage-home snapshot in source order. */
export const installStageAgendaApplicationCompositionV1 = ({
  ViewLayer,
  STAGE_WORKBENCH,
  activityCatalog,
  activityInstallationDefaults,
  appStore,
  apiFetch,
  beginCardCanvasLinkV1,
  dashboardPageMarkup,
  demoData,
  esc,
  executionModel,
  extensionStage,
  globalRef = globalThis,
  ico,
  normalizeActivityRouteTextV1,
  notify,
  operationalRaid,
  renderActivityFormGroupsV1,
  stagePersistentTimelineMarkupV1,
  stageV9LiveFor,
  stageV9MaterialsFor,
  stageV9ProductionFor,
  stageV9StatusFor,
  workbenchStageFromValueV1,
} = {}) => {
  const bindBeforeActivityInstallationV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeActivityInstallationV1?.apply(this, args);
    const state = appStore.get();
    this.querySelectorAll("[data-installation-open]").forEach((button) => {
      if (button.dataset.installationOpenBound === "true") return;
      button.dataset.installationOpenBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        appStore.set({
          view: "activity-installation",
          lastAction: "Abriu a sessão de instalação de atividades",
        });
      });
    });
    return result;
  };

  const agendaCalendarV1 = installAgendaCalendarPageV8(ViewLayer, {
    STAGE_WORKBENCH,
    appStore,
    apiFetch,
    beginCardCanvasLinkV1,
    demoData,
    esc,
    executionModel,
    extensionStage,
    host: globalRef,
    ico,
    normalizeActivityRouteTextV1,
    notify,
    stagePersistentTimelineMarkupV1,
    stageV9LiveFor,
    stageV9MaterialsFor,
    workbenchStageFromValueV1,
  });

  installActivityInstallationSessionV1(ViewLayer, {
    activityCatalog,
    activityInstallationDefaults,
    appStore,
    demoData,
    esc,
    executionModel,
    ico,
    notify,
    operationalRaid,
    renderActivityFormGroupsV1,
    stageV9LiveFor,
    stageV9MaterialsFor,
    stageV9ProductionFor,
    stageV9StatusFor,
  });

  const { stageHomeSnapshotV1 } = installStageHomeCalendarV1(ViewLayer, {
    appStore,
    activityCatalog,
    agendaCalendarInitialWeekV8: agendaCalendarV1.agendaCalendarInitialWeekV8,
    agendaCalendarIsoV3: agendaCalendarV1.agendaCalendarIsoV3,
    agendaCalendarOperationalEventsV3: agendaCalendarV1.agendaCalendarOperationalEventsV3,
    agendaCalendarParseDateV3: agendaCalendarV1.agendaCalendarParseDateV3,
    agendaCalendarReadV3: agendaCalendarV1.agendaCalendarReadV3,
    agendaCalendarWeekDaysV8: agendaCalendarV1.agendaCalendarWeekDaysV8,
    agendaCalendarWeekKeyV8: agendaCalendarV1.agendaCalendarWeekKeyV8,
    agendaCalendarWeekLabelV8: agendaCalendarV1.agendaCalendarWeekLabelV8,
    demoData,
    executionModel,
    ico,
    operationalRaid,
    stageV9LiveFor,
    getStageHomePageMarkupV1: () => dashboardPageMarkup(),
  });

  return Object.freeze({ ...agendaCalendarV1, stageHomeSnapshotV1 });
};
