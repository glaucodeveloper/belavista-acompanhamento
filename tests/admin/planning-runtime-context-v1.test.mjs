import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlanningRuntimeContextV1 } from "../../components/planning/planning-runtime-context-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "components.js"), "utf8");

const dependencies = () => {
  const settings = { stageProfiles: { earthwork: { typicalDescription: "solo argiloso" } } };
  const documentRef = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    elementFromPoint: () => null,
  };
  return {
    appStore: { get: () => ({ integrationSettings: {} }) },
    demoData: { activities: [], stageMaterials: {} },
    executionModel: { stages: [] },
    STAGE_WORKBENCH: [],
    findWorkbenchActivity: () => null,
    runtimeRouteV1: () => null,
    esc: String,
    ico: () => "",
    stageOverlayKey: (value) => String(value ?? "").toLowerCase(),
    documentRef,
    windowRef: { addEventListener() {}, removeEventListener() {} },
    storageRef: { getItem: () => JSON.stringify(settings) },
  };
};

test("planning runtime context preserves the shared page and gesture services", () => {
  const context = createPlanningRuntimeContextV1(dependencies());
  for (const key of [
    "beginCardCanvasLinkV1",
    "normalizeActivityRouteTextV1",
    "workbenchStageFromValueV1",
    "workbenchActivityForValueV1",
    "workbenchActivityRouteV1",
    "readIntegrationSettings",
    "splitStageConfigList",
    "normalizeStageMaterialRows",
    "defaultStageMaterialRows",
    "stageProfilesFromSettings",
    "stageMaterialsFor",
    "stageMaterialsMarkup",
    "executionStageByName",
    "stageProfileSettingsFor",
    "stagePlanningMarkup",
    "WORKDAY_HOURS",
    "STAGE_WORK_PACKETS",
    "buildStageTimeModels",
    "findStageTimeModel",
    "formatHours",
    "formatPlanningDate",
  ]) assert.ok(key in context, `missing planning context member ${key}`);
  assert.equal(context.WORKDAY_HOURS, 8);
  assert.equal(context.stageProfileSettingsFor("earthwork").typicalDescription, "solo argiloso");
  assert.equal(Object.isFrozen(context), true);
});

test("components entry point delegates planning context setup without dropping its ports", () => {
  assert.match(source, /createPlanningRuntimeContextV1\(\{/);
  for (const port of [
    "appStore",
    "demoData",
    "executionModel",
    "STAGE_WORKBENCH",
    "findWorkbenchActivity",
    "runtimeRouteV1",
    "esc",
    "ico",
    "stageOverlayKey",
    "documentRef: globalThis.document",
    "windowRef: globalThis.window",
    "getStorage: () => globalThis.localStorage",
  ]) assert.match(source, new RegExp(port.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
