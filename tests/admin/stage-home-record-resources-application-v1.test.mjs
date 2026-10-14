import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageHomeRecordResourcesApplicationV1 } from "../../components/planning/stage-home-record-resources-application-v1.mjs";

test("stage home resources retain installer order and consume record services from the root", async () => {
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const application = await readFile(new URL("../../components/planning/stage-home-record-resources-application-v1.mjs", import.meta.url), "utf8");
  const ordered = [
    "installActivityHeaderConsolidationV1(ViewLayer,",
    "installStageHomeRecordResourcesEventsV1(ViewLayer,",
    "installLotDevelopmentRenderGuardV1(ViewLayer,",
    "installStageHomeRecordResourcesPageV1(ViewLayer,",
    "installStageRecordsNavigationV1(ViewLayer,",
  ].map((needle) => application.indexOf(needle));

  assert.match(root, /installStageHomeRecordResourcesApplicationV1\(\{/);
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  for (const dependency of [
    "stageRecordStagesV1",
    "stageRecordMaterialRowsV1",
    "stageRecordServiceRowsV1",
    "stageMaterialReportBindV1",
    "stageRecordNormalizeV1",
    "stageRecordCenterItemModalMarkupV1",
    "stageHomeRecordResourcesMarkupV1",
  ]) {
    assert.match(root, new RegExp(`${dependency},`));
    assert.match(application, new RegExp(`stageRecordServices\\.${dependency}`));
  }
  assert.doesNotMatch(root, /installActivityHeaderConsolidationV1\(|installStageHomeRecordResourcesEventsV1\(|installStageHomeRecordResourcesPageV1\(|installStageRecordsNavigationV1\(/);
});

test("stage home resource application runs the original setup order with the same live service references", () => {
  const calls = [], received = {}, stageRecordServices = {
    stageRecordStagesV1: () => [],
    stageRecordMaterialRowsV1: () => [],
    stageRecordServiceRowsV1: () => [],
    stageMaterialReportBindV1() {},
    stageRecordNormalizeV1: (record) => record,
    stageRecordCenterItemModalMarkupV1: () => "dialog",
    stageHomeRecordResourcesMarkupV1: () => "resources",
  };
  const installers = {
    installActivityHeaderConsolidationV1: (viewLayer, args) => { calls.push("header"); received.header = [viewLayer, args]; },
    installStageHomeRecordResourcesEventsV1: (viewLayer, args) => { calls.push("events"); received.events = [viewLayer, args]; },
    installStageHomeRecordResourcesPageV1: (viewLayer, args) => { calls.push("page"); received.page = [viewLayer, args]; },
    installStageRecordsNavigationV1: (viewLayer, args) => { calls.push("navigation"); received.navigation = [viewLayer, args]; },
  };
  const ViewLayer = class ViewLayer {};
  const appStore = {}, demoData = {}, globalRef = { document: {}, Node: {}, window: {}, queueMicrotask() {} };
  const installLotDevelopmentRenderGuardV1 = (viewLayer, args) => { calls.push("lot-guard"); received.guard = [viewLayer, args]; };

  const result = installStageHomeRecordResourcesApplicationV1({
    ViewLayer, appStore, demoData, globalRef, stageRecordServices,
    installLotDevelopmentRenderGuardV1, installers,
  });

  assert.deepEqual(calls, ["header", "events", "lot-guard", "page", "navigation"]);
  assert.equal(received.events[1].stageRecordStagesV1, stageRecordServices.stageRecordStagesV1);
  assert.equal(received.events[1].stageRecordMaterialRowsV1, stageRecordServices.stageRecordMaterialRowsV1);
  assert.equal(received.events[1].stageRecordServiceRowsV1, stageRecordServices.stageRecordServiceRowsV1);
  assert.equal(received.events[1].stageRecordNormalizeV1, stageRecordServices.stageRecordNormalizeV1);
  assert.equal(received.page[1].stageHomeRecordResourcesMarkupV1, stageRecordServices.stageHomeRecordResourcesMarkupV1);
  assert.equal(received.guard[1].appStore, appStore);
  assert.equal(Object.isFrozen(result), true);
});
