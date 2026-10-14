import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageAgendaApplicationCompositionV1 } from "../../components/planning/stage-agenda-application-composition-v1.mjs";

test("agenda application composition retains calendar APIs, guided installation, and stage snapshot", () => {
  const previousEnsure = globalThis.ensureStageHomeRaidAiRecordsCalendarV1;
  const previousInstall = globalThis.installStageHomeRaidAiRecordsCalendarV1;
  const state = { records: [], operationalState: { stages: [] } };
  class ViewLayer {
    bind() { return "base"; }
    render() { return "rendered"; }
    stages() { return "stages"; }
    querySelector() { return null; }
  }
  const host = {
    localStorage: null,
    document: {},
    window: {},
    FormData: class FormData {},
    Element: class Element {},
    CSS: { escape: String },
    requestAnimationFrame: () => 0,
  };

  try {
    const composition = installStageAgendaApplicationCompositionV1({
      ViewLayer,
      STAGE_WORKBENCH: [],
      activityCatalog: [{ id: "activity-earth", name: "Escavação" }],
      activityInstallationDefaults: { draft: {}, rationalization: {} },
      appStore: {
        get: () => state,
        set: (next) => Object.assign(state, next),
        update: (updater) => Object.assign(state, updater(state)),
      },
      beginCardCanvasLinkV1() {},
      dashboardPageMarkup: () => "stage home page",
      demoData: { activities: [] },
      esc: (value) => String(value ?? ""),
      executionModel: { stages: [] },
      extensionStage: () => null,
      globalRef: host,
      ico: () => "",
      normalizeActivityRouteTextV1: (value) => String(value ?? "").toLowerCase(),
      notify() {},
      operationalRaid: () => [],
      renderActivityFormGroupsV1: () => "",
      stagePersistentTimelineMarkupV1: () => "timeline",
      stageV9LiveFor: () => ({}),
      stageV9MaterialsFor: () => [],
      stageV9ProductionFor: () => "",
      stageV9StatusFor: () => "Planejada",
      workbenchStageFromValueV1: () => null,
    });

    assert.equal(Object.isFrozen(composition), true);
    assert.equal(composition.agendaCalendarIsoV3(new Date(2026, 9, 12)), "2026-10-12");
    assert.equal(composition.agendaCalendarParseDateV3("2026-10-12").getDate(), 12);
    assert.equal(typeof ViewLayer.prototype.agenda, "function");
    assert.equal(typeof ViewLayer.prototype.render, "function");
    assert.equal(composition.stageHomeSnapshotV1().activities[0].name, "Escavação");
    assert.equal(ViewLayer.prototype.bind.call({ querySelector: () => null, querySelectorAll: () => [] }), "base");
  } finally {
    if (previousEnsure === undefined) delete globalThis.ensureStageHomeRaidAiRecordsCalendarV1;
    else globalThis.ensureStageHomeRaidAiRecordsCalendarV1 = previousEnsure;
    if (previousInstall === undefined) delete globalThis.installStageHomeRaidAiRecordsCalendarV1;
    else globalThis.installStageHomeRaidAiRecordsCalendarV1 = previousInstall;
  }
});

test("components root delegates agenda installers in their original order", async () => {
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const planning = await readFile(new URL("../../components/planning/planning-pages-application-v1.mjs", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-agenda-application-composition-v1.mjs", import.meta.url), "utf8");
  const ordered = [
    "bindBeforeActivityInstallationV1",
    "installAgendaCalendarPageV8(ViewLayer, {",
    "installActivityInstallationSessionV1(ViewLayer, {",
    "installStageHomeCalendarV1(ViewLayer, {",
  ].map((needle) => composition.indexOf(needle));

  assert.match(root, /installPlanningPagesApplicationV1\(\{/);
  assert.match(planning, /installStageAgendaApplicationCompositionV1\(\{/);
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.doesNotMatch(root, /installAgendaCalendarPageV8\(|installActivityInstallationSessionV1\(|installStageHomeCalendarV1\(/);
});
