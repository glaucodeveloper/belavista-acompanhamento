import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapModelGpuEnrichmentV5367 } from "../../components/map/model-gpu-enrichment-v5367.mjs";

test("GPU staging and semantic enrichment install as a coupled MapScene pipeline", () => {
  class MapScene {}
  installMapModelGpuEnrichmentV5367(MapScene, {
    PUBLIC_SOCIAL_GREEN_LIFT_V1: 0,
    appStore: { get() { return {}; } },
    publishMapPreview() {},
    syncCompactMapMirrors() {},
    browser: {
      requestAnimationFrame() {},
      setTimeout() {},
      performance: { now() { return 0; } },
    },
  });
  assert.equal(typeof MapScene.prototype.stageMasterplanGpuV5367, "function");
  assert.equal(typeof MapScene.prototype.enrichMasterplanProgressively, "function");
  assert.equal(MapScene.prototype.stageMasterplanGpuV5367.constructor.name, "AsyncFunction");
  assert.equal(MapScene.prototype.enrichMasterplanProgressively.constructor.name, "AsyncFunction");
});

test("model loading still reaches the extracted GPU and enrichment pipeline", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    module = await readFile(new URL("../../components/map/model-gpu-enrichment-v5367.mjs", import.meta.url), "utf8"),
    loader = await readFile(new URL("../../components/map/admin-pdf-masterplan-pipeline-v1.mjs", import.meta.url), "utf8"),
    installAt = composition.indexOf("installMapModelGpuEnrichmentV5367(MapScene"),
    defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.doesNotMatch(composition, /^  async stageMasterplanGpuV5367\(/m);
  assert.doesNotMatch(composition, /^  async enrichMasterplanProgressively\(/m);
  assert.match(module, /return this\.enrichMasterplanProgressively\(THREE, model, meshes, perf\)/);
  assert.match(module, /this\.buildPdfMasterplan3DLayerV1\(/);
  assert.match(module, /this\.ensureOperationalStreetGeometry\(\)/);
  assert.match(module, /this\.paintProgressAreaSelectionV1\(/);
  assert.match(loader, /this\.stageMasterplanGpuV5367\(THREE, model, meshes, perf, mark\)/);
});
