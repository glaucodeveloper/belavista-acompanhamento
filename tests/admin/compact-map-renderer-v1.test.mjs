import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCompactMapRendererV1 } from "../../components/map/compact-map-renderer-v1.mjs";

const dependencies = (overrides = {}) => ({
  blendStageOverlayColorV1: () => 0x78a9ff,
  getSharedMapScene: () => null,
  MODEL_VERTICAL_EXAGGERATION: 1,
  normalizeStageOverlayKeysV1: () => [],
  SCENE_MAP_Z: 0,
  stageOverlayKey: () => "",
  stageOverlayLabelV1: () => "",
  ...overrides,
});

test("compact renderer validates injected map scene and overlay services", () => {
  class MapScene {}
  const ports = dependencies();
  assert.equal(installCompactMapRendererV1(MapScene, ports), MapScene);
  assert.equal(typeof MapScene.prototype.renderSharedMap, "function");
  assert.throws(() => installCompactMapRendererV1(MapScene, {}), /requires blendStageOverlayColorV1/);
  assert.throws(
    () => installCompactMapRendererV1(MapScene, dependencies({ SCENE_MAP_Z: NaN })),
    /requires numeric SCENE_MAP_Z/,
  );
});

test("compact renderer waits for the shared map GPU and never creates a second scene", () => {
  let lookups = 0;
  class MapScene {}
  installCompactMapRendererV1(MapScene, dependencies({
    getSharedMapScene: () => { lookups++; return null; },
  }));
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    isConnected: true,
    _compactVisible: true,
    hasAttribute: (name) => name === "compact",
  });
  scene.renderSharedMap();
  assert.equal(lookups, 1);
  assert.equal(scene.dataset.mapMirror, "waiting-main-gpu");
  scene.hasAttribute = () => false;
  scene.renderSharedMap();
  assert.equal(lookups, 1);
});

test("components.js installs shared-map rendering before compact lifecycle and no longer owns its body", async () => {
  const source = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ installCompactMapRendererV1 \} from ["']\.\/compact-map-renderer-v1\.mjs/);
  assert.match(source, /installCompactMapRendererV1\(MapScene, \{[\s\S]*?stageOverlayLabelV1,[\s\S]*?\}\);\s*installCompactMapV1\(MapScene/);
  assert.doesNotMatch(source, /^  renderSharedMap\(\) \{/m);
});
