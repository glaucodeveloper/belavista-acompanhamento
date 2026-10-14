import assert from "node:assert/strict";
import test from "node:test";
import { installStageHomeCalendarV1 } from "../../components/planning/stage-home-calendar-v1.mjs";

test("stage home calendar preserves snapshot data and defers page markup dependency", () => {
  const priorEnsure = globalThis.ensureStageHomeRaidAiRecordsCalendarV1;
  const priorInstall = globalThis.installStageHomeRaidAiRecordsCalendarV1;
  const state = {
    view: "stages",
    operationalState: {
      stages: [{ key: "earth", owner: "Equipe A", progress: 42, week: "Semana 2" }],
    },
    records: [{ id: 7 }],
  };

  class ViewLayer {
    render() { return "rendered"; }
    stages() { return "legacy stages"; }
    querySelector() { return null; }
  }

  try {
    const { stageHomeSnapshotV1 } = installStageHomeCalendarV1(ViewLayer, {
      appStore: { get: () => state },
      activityCatalog: [{ id: "activity-1", name: "Escavação" }],
      agendaCalendarInitialWeekV8: () => "2026-10-05",
      agendaCalendarIsoV3: (date) => date.toISOString().slice(0, 10),
      agendaCalendarOperationalEventsV3: () => [],
      agendaCalendarParseDateV3: (value) => new Date(value + "T00:00:00.000Z"),
      agendaCalendarReadV3: () => ({
        initialized: true,
        events: [{ id: "event-1", date: "2026-10-05" }],
      }),
      agendaCalendarWeekDaysV8: () => [
        new Date("2026-10-05T00:00:00.000Z"),
        new Date("2026-10-06T00:00:00.000Z"),
      ],
      agendaCalendarWeekKeyV8: (date) => date.toISOString().slice(0, 10),
      agendaCalendarWeekLabelV8: (key) => "Semana " + key,
      demoData: { activities: [] },
      executionModel: {
        stages: [{ key: "earth", name: "Terraplanagem", owner: "Modelo", dependsOn: ["survey"] }],
      },
      ico: (name) => "<i>" + name + "</i>",
      operationalRaid: () => [{ linked: "terraplanagem" }],
      stageV9LiveFor: () => null,
      getStageHomePageMarkupV1: () => "deferred page markup",
    });

    const snapshot = stageHomeSnapshotV1();
    assert.deepEqual(snapshot.stages, [{
      key: "earth",
      name: "Terraplanagem",
      owner: "Equipe A",
      progress: 42,
      period: "Semana 2",
      dependsOn: ["survey"],
    }]);
    assert.equal(snapshot.activities[0].stage, "Terraplanagem");
    assert.equal(snapshot.records[0].id, 7);
    assert.equal(snapshot.calendarEvents.length, 1);
    assert.equal(snapshot.calendarLabel, "Semana 2026-10-05");

    globalThis.installStageHomeRaidAiRecordsCalendarV1();
    assert.equal(new ViewLayer().stages(), "deferred page markup");
    assert.equal(new ViewLayer().render(), "rendered");
  } finally {
    if (priorEnsure === undefined) delete globalThis.ensureStageHomeRaidAiRecordsCalendarV1;
    else globalThis.ensureStageHomeRaidAiRecordsCalendarV1 = priorEnsure;
    if (priorInstall === undefined) delete globalThis.installStageHomeRaidAiRecordsCalendarV1;
    else globalThis.installStageHomeRaidAiRecordsCalendarV1 = priorInstall;
  }
});
