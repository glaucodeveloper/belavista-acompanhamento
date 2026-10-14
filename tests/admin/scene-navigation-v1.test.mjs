import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertSceneNavigationDependenciesV1,
  installSceneNavigationV1,
} from "../../components/map/scene-navigation-v1.mjs";

const config = {
  ADMIN_FIXED_MAP_ROTATION_DEG: 180,
  DASHBOARD_PAN_BOUNDING_SCREEN_RATIO: 0.5,
  DASHBOARD_PAN_SAFETY: 0.82,
  DEFAULT_SCENE_ZOOM: 1.12,
  DEFAULT_TILT_BOOST: 52,
  MAP_CAMERA_VIEW: "map",
  MAX_SCENE_TILT: 72,
  MAX_SCENE_ZOOM: 20,
  MIN_SCENE_TILT: 0,
  MIN_SCENE_ZOOM: 0.16,
  SCENE_MAP_Z: 0,
  SCENE_PAN_SAFETY: 1.18,
  SCENE_PUBLIC_PAN_SAFETY: 1.02,
  SCENE_SURFACE_SCALE: 2.7,
  SCENE_TILT_ADJUST_LIMIT: 72,
  SCENE_TILT_ZOOM_OUT_FACTOR: 1,
};
const dependencies = () => ({
  config: { ...config },
  appStore: { get: () => ({}), update() {} },
  sceneTiltBoostForView: () => 52,
  viewThemes: { assistant: { tilt: 18 }, map: { tint: "blue", tilt: 22 } },
  browser: {
    performanceNow: () => 0,
    requestAnimationFrame: () => 1,
    setTimeout: () => 1,
    clearTimeout() {},
  },
});

test("scene navigation installs the complete camera and pan API on the existing MapScene", () => {
  class MapScene {}
  installSceneNavigationV1(MapScene, dependencies());
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    sceneSharedOrigin: { x: 10, y: 20 },
    sceneSurfaceDimensions: { width: 400, height: 300 },
    _sceneVisual: { tilt: 30, rotation: 45, scale: 1 },
    querySelector: () => ({ clientWidth: 100, clientHeight: 100 }),
    hasAttribute: (name) => name === "data-admin-shared-public-map",
    camera: {
      up: { set() {} },
      position: { set(x, y, z) { this.value = [x, y, z]; } },
      lookAt(x, y, z) { this.lookAtValue = [x, y, z]; },
      updateProjectionMatrix() { this.updated = true; },
    },
  });

  scene.configurePerspectiveCamera(200, 100);
  assert.equal(scene.dataset.cameraProjection, "orthographic");
  assert.equal(scene.dataset.cameraProjectionMode, "parallel");
  assert.deepEqual(scene.camera.lookAtValue, [10, 20, 0]);
  assert.equal(scene.camera.updated, true);
  assert.equal(scene.getSceneTiltBounds().max, 72);
  assert.equal(scene.clampSceneTilt(90), 72);
});

test("scene navigation rejects missing app/browser ports and camera view configuration", () => {
  class MapScene {}
  const deps = dependencies();
  delete deps.config.MAP_CAMERA_VIEW;
  assert.throws(
    () => assertSceneNavigationDependenciesV1(MapScene, deps),
    /config\.MAP_CAMERA_VIEW/,
  );
  assert.throws(
    () => installSceneNavigationV1(MapScene, { ...dependencies(), appStore: {} }),
    /appStore\.get\(\)/,
  );
});

test("components composition installs extracted navigation before map controls", async () => {
  const registration = await readFile(new URL("../../components/map/map-scene-registration-v1.mjs", import.meta.url), "utf8"),
    source = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(registration, /map-scene-composition-v1\.mjs\?v=map-scene-composition-v1/);
  const navigation = source.indexOf("installSceneNavigationV1(MapScene, {");
  const tilt = source.indexOf("installSceneTiltControllerV1(MapScene, {");
  const controls = source.indexOf("installMapSceneControlsV1(MapScene, {");
  assert.ok(navigation >= 0 && tilt > navigation && controls > tilt);
  assert.match(source.slice(navigation, controls), /MAP_CAMERA_VIEW,[\s\S]*?SCENE_TILT_ZOOM_OUT_FACTOR/);
  assert.match(source.slice(navigation, controls), /appStore,[\s\S]*?sceneTiltBoostForView,[\s\S]*?viewThemes,[\s\S]*?requestAnimationFrame/);
});
