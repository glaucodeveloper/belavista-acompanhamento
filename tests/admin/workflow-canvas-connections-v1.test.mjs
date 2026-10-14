import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installWorkflowCanvasConnectionsV1 } from "../../components/map/workflow-canvas-connections-v1.mjs";

test("workflow canvas installer binds the existing pointer and click interaction once", () => {
  const listeners = [], svg = { querySelector: () => null }, canvas = {
    dataset: {},
    addEventListener: (...args) => listeners.push(args),
    querySelector: (selector) => selector === ".surface-edges" ? svg : null,
  };
  class ViewLayer { querySelector(selector) { return selector === ".dedicated-canvas" ? canvas : null; } }
  installWorkflowCanvasConnectionsV1(ViewLayer, {
    activityCatalog: [],
    appStore: { set() {} },
    esc: String,
    notify() {},
    document: { elementFromPoint: () => null, createElement() {}, createElementNS() {} },
    window: { addEventListener() {}, removeEventListener() {} },
  });

  const view = new ViewLayer();
  view.bindGhostConnections();
  view.bindGhostConnections();
  assert.equal(canvas.dataset.pointerConnections, "true");
  assert.deepEqual(listeners.map(([type]) => type), ["click", "pointerdown"]);
  for (const method of [
    "bindWorkflowFieldTrees",
    "bindCatalogButtons",
    "addCatalogPalette",
    "watchSurfaceRelations",
    "drawSurfaceRelations",
    "insertConnectedActivityCard",
    "addFineDurationControls",
    "makeSurfaceDrag",
  ]) assert.equal(typeof view[method], "function", `${method} is installed`);
});

test("application root delegates workflow relation gestures to the map module", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stage-surface-registration-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installStageSurfaceRegistrationV1\(\{/);
  assert.match(registration, /import \{ installWorkflowCanvasConnectionsV1 \} from/);
  assert.match(registration, /workflowConnectionsInstallerV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.bindGhostConnections = function/);
  assert.doesNotMatch(source, /\bbindGhostConnections\(\)\s*\{/);
  for (const method of [
    "bindWorkflowFieldTrees",
    "bindCatalogButtons",
    "addCatalogPalette",
    "watchSurfaceRelations",
    "drawSurfaceRelations",
    "insertConnectedActivityCard",
    "addFineDurationControls",
    "makeSurfaceDrag",
  ]) assert.doesNotMatch(source, new RegExp(`\\b${method}\\([^)]*\\)\\s*\\{`));
});
