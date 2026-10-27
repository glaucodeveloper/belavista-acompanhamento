// Compatibility adapter: calendar policy, snapshot projection, and interaction
// lifecycle are owned by the TypeScript program and component monoliths.
import { projectAtlasStageHomeSnapshot as projectAtlasStageHomeSnapshotTsV1 } from "../../dist/frontend/program.js";
import { installAtlasStageHomeCalendar as installAtlasStageHomeCalendarTsV1 } from "../../dist/frontend/components.js";

export function installStageHomeCalendarV1(ViewLayer, ports = {}) {
  const {
    appStore,
    activityCatalog = [],
    agendaCalendarInitialWeekV8,
    agendaCalendarIsoV3,
    agendaCalendarOperationalEventsV3,
    agendaCalendarParseDateV3,
    agendaCalendarReadV3,
    agendaCalendarWeekDaysV8,
    agendaCalendarWeekKeyV8,
    agendaCalendarWeekLabelV8,
    demoData = {},
    executionModel = {},
    ico,
    operationalRaid,
    stageV9LiveFor,
    getStageHomePageMarkupV1,
    globalRef = globalThis,
  } = ports;

  const stageHomeSnapshotV1 = (calendarWeekOverride = "") =>
    projectAtlasStageHomeSnapshotTsV1({
      state: appStore.get(),
      executionStages: executionModel.stages || [],
      activityCatalog,
      operationalRaid: operationalRaid(),
      stageV9LiveFor,
      agendaCalendarRead: agendaCalendarReadV3,
      agendaCalendarOperationalEvents: agendaCalendarOperationalEventsV3,
      agendaCalendarInitialWeek: agendaCalendarInitialWeekV8,
      agendaCalendarIso: agendaCalendarIsoV3,
      agendaCalendarWeekDays: agendaCalendarWeekDaysV8,
      agendaCalendarWeekLabel: agendaCalendarWeekLabelV8,
      calendarWeekOverride,
      icons: {
        shield: ico("shield-alert"),
        sparkles: ico("sparkles"),
        plus: ico("plus"),
      },
    });

  installAtlasStageHomeCalendarTsV1({
    ViewLayer,
    appStore,
    executionStages: executionModel.stages || [],
    demoActivities: demoData.activities || [],
    getStageHomePageMarkup: (calendarWeek = "") => {
      const markup = getStageHomePageMarkupV1(calendarWeek);
      return typeof markup === "function" ? markup(calendarWeek) : String(markup || "");
    },
    parseWeekKey: agendaCalendarParseDateV3,
    weekKeyForDate: agendaCalendarWeekKeyV8,
    document: globalRef.document,
    window: globalRef.window,
    globalRef,
  });

  return Object.freeze({ stageHomeSnapshotV1 });
}
