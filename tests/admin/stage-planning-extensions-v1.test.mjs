import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStagePlanningExtensionsV1 } from "../../components/planning/stage-planning-extensions-v1.mjs";

test("stage planning extensions preserve prototype chains and use injected planning services", () => {
  const calls = [],
    ViewLayer = class {
      querySelector() { return null; }
      querySelectorAll() { return []; }
    };
  ViewLayer.prototype.addStageUtilities = function () {
    calls.push("base-stage-utilities");
  };
  ViewLayer.prototype.activities = function () {
    return "base-activities";
  };
  ViewLayer.prototype.bind = function () {
    calls.push("base-bind");
  };
  ViewLayer.prototype.addActivityNodes = function () {
    calls.push("base-activity-nodes");
  };

  installStagePlanningExtensionsV1(ViewLayer, {
    demoData: { activities: [] },
    buildStageTimeModels: () => [],
    formatHours: (hours) => `${hours}h`,
    formatPlanningDate: (day) => `dia ${day}`,
    appStore: { get: () => ({ selectedStage: "stage-1" }), set() {} },
    ico: () => "",
    stageOverlayLabels: { execution: "Execução" },
    stageOverlayKey: () => "execution",
    esc: (value) => String(value ?? ""),
    notify() {},
    extensionStage: () => ({ week: "SEMANA 1", name: "Terraplanagem", progress: 42 }),
    activityCatalog: [{
      nature: "Execução",
      name: "Preparar frente",
      initial: [{ name: "Equipe" }],
      execution: [{ name: "Avanço" }],
    }],
    STAGE_WORK_PACKETS: [],
    WORKDAY_HOURS: 8,
    findStageTimeModel: () => null,
  });

  const layer = new ViewLayer();
  layer.addStageUtilities();
  layer.splitStageTabs();
  layer.bind();
  layer.addActivityNodes();

  assert.match(layer.activities(), /Atividades da etapa/);
  assert.match(layer.activities(), /Preparar frente/);
  assert.match(layer.activities(), /SEMANA 1 · Terraplanagem/);
  assert.deepEqual(calls, [
    "base-stage-utilities",
    "base-bind",
    "base-activity-nodes",
  ]);
});

test("components.js delegates stage tab construction to the planning module", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const financeComposition = await readFile(new URL("../../components/finance/finance-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(composition, /installFinanceApplicationCompositionV1\(/);
  assert.match(financeComposition, /installStagePlanningExtensionsV1\(ViewLayer, \{/);
  assert.doesNotMatch(composition, /ViewLayer\.prototype\.splitStageTabs = function/);
  assert.doesNotMatch(composition, /ViewLayer\.prototype\.addStageUtilities = function/);
});

test("planning module owns stage utility cleanup while preserving the existing base method", () => {
  let baseCalls = 0;
  const card = { removed: false, remove() { this.removed = true; } };
  class ViewLayer {
    addStageUtilities() { baseCalls++; }
    querySelector() { return null; }
    querySelectorAll(selector) { return selector === ".stage-activity-card" ? [card] : []; }
  }
  installStagePlanningExtensionsV1(ViewLayer, {
    demoData: { activities: [] },
    buildStageTimeModels: () => [],
    formatHours: String,
    formatPlanningDate: String,
    appStore: { get: () => ({ selectedStage: "" }), set() {} },
    ico: () => "",
    stageOverlayLabels: {},
    stageOverlayKey: () => "",
    esc: String,
    notify() {},
    extensionStage: () => null,
    activityCatalog: [],
    STAGE_WORK_PACKETS: [],
    WORKDAY_HOURS: 8,
    findStageTimeModel: () => null,
  });
  new ViewLayer().addStageUtilities();
  assert.equal(baseCalls, 1);
  assert.equal(card.removed, true);
});
