import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageActivityPageEventsV1 } from "../../components/planning/stage-activity-page-events-v1.mjs";

const dependencies = (overrides = {}) => ({
  appStore: { get: () => ({}), set: (next) => calls.push(next) },
  executionModel: { stages: [] },
  stageV9FlowPackets: () => [],
  stageV9ByState: () => null,
  stageOf: () => "",
  extensionStage: () => null,
  activityCatalog: [],
  workbenchActivityRouteV1: () => "/activities",
  esc: (value) => String(value ?? ""),
  ico: () => "",
  notify: () => {},
  document: { createElement: () => ({}) },
  window: { location: { assign: () => {} } },
  URL: { createObjectURL: () => "blob:attachment", revokeObjectURL: () => {} },
  ...overrides,
});
let calls = [];

test("stage activity event installer validates required injected services", () => {
  class ViewLayer { bind() {} }
  assert.throws(() => installStageActivityPageEventsV1(ViewLayer, {}), /require appStore\.get\(\) and set\(\)/);
  assert.throws(() => installStageActivityPageEventsV1(ViewLayer, dependencies({ executionModel: {} })), /require executionModel\.stages/);
});

test("stage activity binder preserves base binding and routes stage selection through app state", () => {
  calls = [];
  let baseBindCount = 0;
  const listeners = new Map();
  const stageButton = {
    dataset: { stageV9: "earth" },
    textContent: "Terraplenagem",
    addEventListener: (name, handler) => listeners.set(name, handler),
  };
  class ViewLayer {
    constructor() { this.dataset = {}; }
    bind() { baseBindCount += 1; }
    querySelectorAll(selector) { return selector === "[data-stage-v9]" ? [stageButton] : []; }
    querySelector() { return null; }
    addEventListener() {}
    contains() { return false; }
  }
  installStageActivityPageEventsV1(ViewLayer, dependencies());
  new ViewLayer().bind();
  assert.equal(baseBindCount, 1);
  listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(calls, [{
    view: "stages",
    selectedStageV9: "earth",
    selectedStage: "earth",
    stageSelected: true,
    activityDedicated: true,
    stageActivityDedicatedV9: false,
    lastAction: "Abriu a etapa Terraplenagem",
  }]);
});

test("application root delegates the full stage-activity event binding to planning", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const moduleSource = await readFile(new URL("../../components/planning/stage-activity-page-events-v1.mjs", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-operational-pages-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installStageOperationalPagesCompositionV1\(\{/);
  assert.match(composition, /installStageActivityPageEventsV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /const bindBeforeStagesV9/);
  for (const selector of ["data-stage-v9", "data-activity-v9", "data-activity-open", "data-activity-detail-tabs", "data-activity-record-attachments", "data-activity-timeline-packet"])
    assert.ok(moduleSource.includes(selector), `event module retains ${selector}`);
});
