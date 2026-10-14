import test from "node:test";
import assert from "node:assert/strict";
import { installControlCenterApplicationCompositionV1 } from "../../components/planning/control-center-application-composition-v1.mjs";

test("control center composition installs renderer, stage tabs, map chrome, and events in source order", () => {
  const ViewLayer = function ViewLayer() {};
  ViewLayer.prototype.bind = function bind() {};
  ViewLayer.prototype.activities = function activities() { return "activities"; };
  ViewLayer.prototype.progress = function progress() { return "progress"; };
  const appStore = {
    get: () => ({ selectedStage: "stage-1", integrationSettings: {} }),
    set: () => {},
    update: () => {},
  };
  const stage = { key: "stage-1", id: "stage-1", name: "Terraplanagem", priority: "Alta", dependsOn: [], production: {} };
  const composition = installControlCenterApplicationCompositionV1({
    ViewLayer,
    appStore,
    executionModel: { stages: [stage] },
    demoData: { activities: [stage] },
    commissionDeals: [],
    brokerReasonsV9: () => [],
    controlCenterData: {
      controlCenterMaterialRowsV1: () => [],
      controlCenterFinanceRowsV1: () => [],
      controlCenterMoneyV1: () => "R$ 0,00",
      controlCenterRecordChangeV1: () => {},
      controlCenterPublishV1: () => {},
    },
    cashRecordLauncherMarkupV1: () => "",
    subscribeOperationalControlCenter: () => () => {},
    readIntegrationSettings: () => ({}),
    integrationSettingsKey: "integration-settings",
    apiFetch: async () => ({}),
    operationalHeaders: () => ({}),
    stageContext: {
      normalizeStageMaterialRows: () => [],
      defaultStageMaterialRows: () => [],
      stageV9LiveFor: () => ({ progress: 0 }),
      stageV9StatusFor: () => "Planejada",
      STAGE_WORKBENCH: [],
      workbenchStageFromValueV1: () => null,
      splitStageConfigList: () => [],
    },
    formatBRL: (value) => String(value),
    esc: (value) => String(value ?? ""),
    ico: (name) => name,
    notify: () => {},
    stageViewTabs: () => "<nav></nav>",
    stageOverlayKey: () => "",
    extensionStage: () => stage,
    requestAnimationFrameFn: () => 0,
  });

  assert.equal(typeof ViewLayer.prototype.control, "function");
  assert.notEqual(ViewLayer.prototype.bind.toString(), "function bind() {}");
  assert.equal(typeof ViewLayer.prototype.activities, "function");
  assert.equal(typeof ViewLayer.prototype.progress, "function");
  assert.equal(typeof composition.controlStageContextMarkupV1, "function");
  assert.equal(typeof composition.controlStageUnifiedFormMarkupV1, "function");
  assert.equal(typeof composition.controlCenterPageV1.installEvents, "function");
  assert.equal(Object.isFrozen(composition), true);
});
