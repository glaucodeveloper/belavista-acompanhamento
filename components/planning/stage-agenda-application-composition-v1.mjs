import { installActivityInstallationSessionV1 } from "./activity-installation-session-v1.mjs?v=activity-installation-session-v1";
import { installStageHomeCalendarV1 } from "./stage-home-calendar-v1.mjs?v=stage-home-calendar-v4-ts-exclusive&ts-stage-record-center-owner-v1";
import * as agendaCalendarComponentsTsV1 from "../../dist/frontend/components.js";

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

  const installAgendaCalendarPageTsV1 = agendaCalendarComponentsTsV1.installAtlasAgendaCalendarPageV8;
  if (typeof installAgendaCalendarPageTsV1 !== "function") {
    throw new TypeError("A rota Agenda requer o instalador TypeScript installAtlasAgendaCalendarPageV8().");
  }
  const agendaCalendarV1 = installAgendaCalendarPageTsV1(ViewLayer, {
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

  const activityInstallationDependenciesV1 = {
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
  };
  let typedActivityInstallationInstalledV1 = false;
  try {
    typedActivityInstallationInstalledV1 =
      typeof agendaCalendarComponentsTsV1.installAtlasActivityInstallationSessionV1 === "function"
        && agendaCalendarComponentsTsV1.installAtlasActivityInstallationSessionV1(ViewLayer, {
          ...activityInstallationDependenciesV1,
          globalRef,
        });
  } catch (error) {
    globalRef.console?.warn?.("[Aliança Park] TypeScript activity-installation owner unavailable; keeping MJS fallback.", error);
  }
  if (!typedActivityInstallationInstalledV1) {
    installActivityInstallationSessionV1(ViewLayer, activityInstallationDependenciesV1);
  }

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
    getStageHomePageMarkupV1: (calendarWeek = "") => dashboardPageMarkup(calendarWeek),
  });

  return Object.freeze({ ...agendaCalendarV1, stageHomeSnapshotV1 });
};
