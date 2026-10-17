import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installPlanningPagesApplicationV1 } from "../../components/planning/planning-pages-application-v1.mjs";

test("planning page family preserves install order and forwards its public outputs", async () => {
  const root = (await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/index.mjs", import.meta.url), "utf8"),
  ])).join("\n");
  const application = await readFile(new URL("../../components/planning/planning-pages-application-v1.mjs", import.meta.url), "utf8");
  const installers = [
    "installPlanningPageRegistrationsV1({",
    "installOperationalMapPageV1(ViewLayer,",
    "installStageOperationalPagesCompositionV1({",
    "installControlCenterApplicationCompositionV1({",
    "installActivityRouteBridgeLifecycleV1({",
    "installPersonnelPageRegistrationV1({",
    "installLeadsDirectoryRegistrationV1({",
    "installStagePagesApplicationCompositionV1({",
    "installStageAgendaApplicationCompositionV1({",
  ].map((needle) => application.indexOf(needle));

  assert.match(root, /installPlanningPagesApplicationV1\(\{/);
  assert.ok(installers.every((index) => index >= 0));
  assert.deepEqual(installers, [...installers].sort((a, b) => a - b));
  assert.match(root, /controlCenterData:\s*\{/);
  assert.match(root, /stageRecordServices:\s*\{/);
  assert.match(application, /Object\.assign\(calendar, stageAgenda\)/);
  assert.match(application, /stagePersistentTimelineMarkupV1,/);
  assert.match(root, /stageV9LiveFor,/);
  assert.match(root, /dashboardHomePageV1,/);
  assert.match(root, /controlStageProfileV1,/);
  assert.match(root, /agendaCalendarIsoV3,/);
  assert.match(root, /stageHomeSnapshotV1,/);
  for (const output of ["stageOperational", "controlCenter", "stageRecordServices", "stagePages", "stageAgenda"])
    assert.match(application, new RegExp(`\\.\\.\\.${output}`));
  assert.doesNotMatch(root, /installStageOperationalPagesCompositionV1\(|installControlCenterApplicationCompositionV1\(|installStagePagesApplicationCompositionV1\(|installStageAgendaApplicationCompositionV1\(/);
});

test("planning page family executes the preserved installer sequence and late-bound calendar adapters", () => {
  const calls = [], received = {}, stageAgenda = {
    agendaCalendarIsoV3: (value) => `calendar:${value}`,
    stageHomeSnapshotV1: () => ({ stages: [] }),
  };
  const installers = {
    installPlanningPageRegistrationsV1: (args) => { calls.push("registrations"); received.registrations = args; },
    installOperationalMapPageV1: (...args) => { calls.push("map"); received.map = args; },
    installStageOperationalPagesCompositionV1: (args) => {
      calls.push("stage-operational");
      received.stageOperational = args;
      return { stageV9LiveFor: () => "live", stageV9StatusFor: () => "active", stageV9MaterialsFor: () => [], stageV9ProductionFor: () => "", dashboardHomePageV1: {} };
    },
    installControlCenterApplicationCompositionV1: (args) => { calls.push("control-center"); received.controlCenter = args; return { controlStageProfileV1: "profile", stageHeader3DMarkup: "header" }; },
    installActivityRouteBridgeLifecycleV1: (args) => { calls.push("activity-route"); received.activityRoute = args; },
    installPersonnelPageRegistrationV1: (args) => { calls.push("personnel"); received.personnel = args; },
    installLeadsDirectoryRegistrationV1: (args) => { calls.push("leads"); received.leads = args; },
    installStagePagesApplicationCompositionV1: (args) => { calls.push("stage-pages"); received.stagePages = args; return { stagePersistentTimelineMarkupV1: "timeline" }; },
    installStageAgendaApplicationCompositionV1: (args) => { calls.push("stage-agenda"); received.stageAgenda = args; return stageAgenda; },
  };
  const host = { window: {}, document: {}, console: {}, Date, requestAnimationFrame() {}, queueMicrotask() {} };
  const stageRecordServices = { stageContextV1: {}, stageViewTabs: {}, currentPertNodes: [], operationalRaid: () => [], stageHomePageMarkupV1: () => "home", workbenchStageFromValueV1: () => null };
  const result = installPlanningPagesApplicationV1({
    ViewLayer: class ViewLayer {}, globalRef: host, installers, stageRecordServices,
    controlCenterData: { controlCenterMaterialRowsV1: () => [] },
    apiFetch: () => {},
  });

  assert.deepEqual(calls, ["registrations", "map", "stage-operational", "control-center", "activity-route", "personnel", "leads", "stage-pages", "stage-agenda"]);
  assert.equal(received.stageOperational.agendaCalendarIsoV3("today"), "calendar:today");
  assert.equal(received.stagePages.controlStageProfileV1, "profile");
  assert.equal(received.stageAgenda.stagePersistentTimelineMarkupV1, "timeline");
  assert.equal(received.stageAgenda.dashboardPageMarkup(), stageRecordServices.stageHomePageMarkupV1);
  assert.equal(result.agendaCalendarIsoV3("today"), "calendar:today");
  assert.equal(result.stagePersistentTimelineMarkupV1, "timeline");
  assert.equal(result.stageHomeSnapshotV1().stages.length, 0);
  assert.equal(Object.isFrozen(result), true);
});
