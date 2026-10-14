import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapThreeInitializationV1 } from "../../components/map/map-three-initialization-v1.mjs";

const source = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("Three.js initialization installer injects its browser and application ports", () => {
  class MapScene {}
  const document = { createElement() {} }, window = {}, appStore = { get() {} };
  installMapThreeInitializationV1(MapScene, {
    MAP_CAMERA_VIEW: "map",
    MAP_GEOREFERENCE_FALLBACK: {},
    SCENE_MAP_Z: 0,
    SCENE_MODEL_BASE_Z: 0,
    TILT_DRAG_SENSITIVITY: 1,
    ZOOM_DRAG_SENSITIVITY: 1,
    appStore,
    solarStateForHour() {},
    document,
    window,
  });

  assert.equal(typeof MapScene.prototype.initThree, "function");
  assert.equal(Object.hasOwn(MapScene.prototype, "initThree"), true);
  assert.equal(MapScene.prototype.initThree.constructor.name, "AsyncFunction");
});

test("MapScene lifecycle keeps calling the extracted renderer initialization", async () => {
  const components = await source("../../components.js"),
    module = await source("../../components/map/map-three-initialization-v1.mjs");

  assert.match(components, /import \{ installMapThreeInitializationV1 \} from "\.\/components\/map\/map-three-initialization-v1\.mjs\?/);
  assert.match(components, /installMapThreeInitializationV1\(MapScene, \{/);
  assert.ok(components.indexOf("installMapThreeInitializationV1(MapScene") < components.indexOf('customElements.define("map-scene", MapScene)'));
  assert.match(components, /this\.initThree\(\)/);
  assert.doesNotMatch(components, /^  async initThree\(/m);
  assert.match(module, /new THREE\.WebGLRenderer\(/);
  assert.match(module, /await import\("three\/addons\/loaders\/GLTFLoader\.js"\)/);
  assert.match(module, /this\.sceneStage = new THREE\.Group\(\)/);
});
