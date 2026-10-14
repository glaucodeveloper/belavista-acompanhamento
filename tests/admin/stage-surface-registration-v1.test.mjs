import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installStageSurfaceRegistrationV1 } from "../../components/planning/stage-surface-registration-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("stage surface installers retain order, dependencies, and lazy route adapter", () => {
  const calls = [],
    route = (...args) => `stage:${args.join(":")}`,
    ports = {
      ViewLayer: class ViewLayerRef {},
      appStore: {},
      demoData: {},
      activityCatalog: [],
      extensionStage: route,
      stageMaterialsFor: () => [],
      stagePlanningMarkup: () => "markup",
      splitStageConfigList: () => [],
      esc: String,
      ico: () => "",
      notify() {},
      readIntegrationSettings: () => ({}),
      integrationSettingsKey: "settings-key",
      documentRef: {},
      windowRef: {},
      storageRef: {},
    };

  installStageSurfaceRegistrationV1({
    ...ports,
    activityCanvasInstallerV1(ViewLayer, dependencies) {
      calls.push(["activity", ViewLayer, dependencies]);
    },
    dedicatedWorkspaceInstallerV1(ViewLayer, dependencies) {
      calls.push(["dedicated", ViewLayer, dependencies]);
    },
    workflowConnectionsInstallerV1(ViewLayer, dependencies) {
      calls.push(["workflow", ViewLayer, dependencies]);
    },
  });

  assert.deepEqual(calls.map(([name]) => name), ["activity", "dedicated", "workflow"]);
  assert.ok(calls.every(([, ViewLayer]) => ViewLayer === ports.ViewLayer));
  assert.equal(calls[0][2].document, ports.documentRef);
  assert.equal(calls[0][2].window, ports.windowRef);
  assert.equal(calls[1][2].extensionStage("a", "b"), "stage:a:b");
  assert.equal(calls[1][2].stageMaterialsFor, ports.stageMaterialsFor);
  assert.equal(calls[1][2].stagePlanningMarkup, ports.stagePlanningMarkup);
  assert.equal(calls[1][2].splitStageConfigList, ports.splitStageConfigList);
  assert.equal(calls[1][2].localStorage, ports.storageRef);
  assert.equal(calls[2][2].activityCatalog, ports.activityCatalog);
  assert.equal(calls[2][2].appStore, ports.appStore);
});

test("components entry point delegates stage surfaces as one planning registration", () => {
  const source = fs.readFileSync(path.join(root, "components.js"), "utf8");
  assert.match(source, /installStageSurfaceRegistrationV1\(\{/);
  for (const installer of [
    "installStageActivityCanvasV1",
    "installStageDedicatedWorkspaceV1",
    "installWorkflowCanvasConnectionsV1",
  ]) assert.doesNotMatch(source, new RegExp(installer));
});
