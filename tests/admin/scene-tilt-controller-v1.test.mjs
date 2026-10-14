import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertSceneTiltControllerDependenciesV1,
  installSceneTiltControllerV1,
} from "../../components/map/scene-tilt-controller-v1.mjs";

const config = {
  ADMIN_STANDALONE_BASE_TILT_DEG_V1: 37,
  DEFAULT_SCENE_ZOOM: 1.12,
  MAP_CAMERA_VIEW: "map",
  MAX_SCENE_TILT: 72,
  MIN_SCENE_TILT: 0,
  SCENE_TILT_ADJUST_LIMIT: 72,
};
const dependencies = (overrides = {}) => ({
  config: { ...config },
  sceneTiltBoostForView: () => 10,
  viewThemes: { assistant: { tilt: 18 }, map: { tilt: 22 } },
  browser: { performanceNow: () => 100, requestAnimationFrame: () => 1 },
  ...overrides,
});

test("standalone map tilt keeps its dedicated camera and persists the adjusted value", () => {
  class MapScene {}
  installSceneTiltControllerV1(MapScene, dependencies());
  const calls = [];
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    sceneTiltAdjust: 2,
    _adminStandaloneTiltV5370: 40,
    isAdminStandaloneInteractiveV5370: () => true,
    markAdminCameraInteracted: () => calls.push("interacted"),
    setAdminStandaloneTiltV5370: (...args) => calls.push(["standalone", ...args]),
    rememberMapView: () => calls.push("remember"),
  });

  scene.setSceneTiltAdjust(5, false);

  assert.equal(scene.sceneTiltAdjust, 6);
  assert.equal(scene.dataset.sceneTilt, "43deg");
  assert.equal(scene.dataset.sceneTiltControl, "range + buttons · standalone");
  assert.deepEqual(calls, ["interacted", ["standalone", 43, false], "remember"]);
});

test("public presentation stays at its fixed 22-degree camera angle", () => {
  class MapScene {}
  installSceneTiltControllerV1(MapScene, dependencies());
  const visuals = [];
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    _sceneVisual: { tilt: 44, rotation: 12, scale: 0.8 },
    isAdminStandaloneInteractiveV5370: () => false,
    isPublicCameraPreset: () => true,
    hasAttribute: (name) => name === "data-admin-shared-public-map",
    getSceneTiltBounds: () => ({ min: 0, max: 72 }),
    setSceneVisual: (...args) => visuals.push(args),
    rememberMapView() {},
  });

  scene.setSceneTiltAdjust(16, false);

  assert.equal(scene.sceneTiltAdjust, 0);
  assert.equal(scene.dataset.sceneTilt, "22deg");
  assert.deepEqual(visuals, [[22, 12, 0.8]]);
});

test("ordinary scene tilt preserves the eased animation and injected frame scheduling", () => {
  class MapScene {}
  let frame;
  installSceneTiltControllerV1(MapScene, dependencies({
    browser: {
      performanceNow: () => 100,
      requestAnimationFrame: (callback) => { frame = callback; },
    },
  }));
  const visuals = [], calls = [];
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    sceneTiltAdjust: 2,
    _sceneVisual: { tilt: 30, rotation: 8, scale: 1.2 },
    isAdminStandaloneInteractiveV5370: () => false,
    isPublicCameraPreset: () => false,
    hasAttribute: () => false,
    getSceneTiltBounds: () => ({ min: 0, max: 72 }),
    markAdminCameraInteracted() {},
    rememberMapView() {},
    setSceneVisual: (...args) => visuals.push(args),
    constrainScenePan: (reason) => calls.push(reason),
  });

  scene.setSceneTiltAdjust(5);
  assert.equal(typeof frame, "function");
  frame(420);

  assert.deepEqual(visuals, [[33, 8, 1.2]]);
  assert.deepEqual(calls, ["tilt-finish"]);
});

test("controller validates its camera and browser service dependencies", () => {
  class MapScene {}
  const deps = dependencies();
  delete deps.browser.requestAnimationFrame;
  assert.throws(() => assertSceneTiltControllerDependenciesV1(MapScene, deps), /browser animation services/);
});

test("composition installs the dedicated controller after navigation methods", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /scene-tilt-controller-v1\.mjs\?v=scene-tilt-controller-v1/);
  const navigation = source.indexOf("installSceneNavigationV1(MapScene, {");
  const tilt = source.indexOf("installSceneTiltControllerV1(MapScene, {");
  const framing = source.indexOf("installCameraFramingV1(MapScene, {");
  assert.ok(navigation >= 0 && tilt > navigation && framing > tilt);
  assert.doesNotMatch(source, /MapScene\.prototype\.setSceneTiltAdjust\s*=/);
});
