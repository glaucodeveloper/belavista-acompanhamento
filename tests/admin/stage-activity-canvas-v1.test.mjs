import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageActivityCanvasV1 } from "../../components/planning/stage-activity-canvas-v1.mjs";

test("stage activity canvas installer owns overview and dedicated-canvas methods", () => {
  class ViewLayer { querySelector() { return null; } }
  installStageActivityCanvasV1(ViewLayer, {
    appStore: { get: () => ({ selectedStage: "stage-1" }), set() {} },
    demoData: { activities: [] },
    activityCatalog: [],
    esc: String,
    notify() {},
    document: {},
    window: {},
  });
  const view = new ViewLayer();
  for (const method of ["addActivityNodes", "bindDedicatedActivityClicks", "enhanceDedicatedSurface", "bindDedicatedWorkflow"])
    assert.equal(typeof view[method], "function", `${method} is installed`);
  assert.doesNotThrow(() => view.addActivityNodes());
  assert.doesNotThrow(() => view.bindDedicatedActivityClicks());
  assert.doesNotThrow(() => view.enhanceDedicatedSurface());
  assert.doesNotThrow(() => view.bindDedicatedWorkflow());
});

test("components.js delegates activity canvas implementations and removes inline copies", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stage-surface-registration-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installStageSurfaceRegistrationV1\(\{/);
  assert.match(registration, /import \{ installStageActivityCanvasV1 \} from/);
  assert.match(registration, /activityCanvasInstallerV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.addActivityNodes = function/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.bindDedicatedActivityClicks = function/);
  assert.doesNotMatch(source, /\benhanceDedicatedSurface\(\)\s*\{/);
  assert.doesNotMatch(source, /\bbindDedicatedWorkflow\(\)\s*\{/);
  assert.doesNotMatch(source, /\baddActivityNodes\(\)\s*\{/);
});
