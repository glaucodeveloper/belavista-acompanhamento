import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageDedicatedWorkspaceV1 } from "../../components/planning/stage-dedicated-workspace-v1.mjs";

test("dedicated stage workspace installer owns rendering and context methods", () => {
  class ViewLayer { querySelector() { return null; } }
  installStageDedicatedWorkspaceV1(ViewLayer, {
    appStore: { get: () => ({}) },
    demoData: { activities: [] },
    extensionStage: () => null,
    stageMaterialsFor: () => [],
    stagePlanningMarkup: () => "",
    esc: String,
    ico: () => "",
    notify() {},
    readIntegrationSettings: () => ({}),
    splitStageConfigList: () => [],
    integrationSettingsKey: "test-setting-key",
    localStorage: {},
    window: {},
  });
  const view = new ViewLayer();
  for (const method of ["addStageUtilities", "openDedicatedStage", "bindDedicatedStageContext"])
    assert.equal(typeof view[method], "function", `${method} is installed`);
  assert.doesNotThrow(() => view.addStageUtilities());
  assert.doesNotThrow(() => view.bindDedicatedStageContext());
});

test("components.js installs the dedicated stage workspace without inline copies", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stage-surface-registration-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installStageSurfaceRegistrationV1\(\{/);
  assert.match(registration, /import \{ installStageDedicatedWorkspaceV1 \} from/);
  assert.match(registration, /dedicatedWorkspaceInstallerV1\(ViewLayer, \{/);
  for (const method of ["addStageUtilities", "openDedicatedStage", "bindDedicatedStageContext"])
    assert.doesNotMatch(source, new RegExp(`\\b${method}\\(\\)\\s*\\{`));
});
