import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installSceneStatePersistenceV1 } from "../../components/map/scene-state-persistence-v1.mjs";

const dependencies = (overrides = {}) => ({
  appStore: { update: (updater) => updater({ saved: true }) },
  config: {
    MAP_SCENE_STATE_VERSION: 10,
    ADMIN_REFERENCE_AERIAL_VIEW_VERSION: 4,
    ADMIN_FIXED_MAP_ROTATION_DEG: 180,
    INITIAL_SCENE_ZOOM: 1.68,
  },
  browser: { setTimeout: () => 1, clearTimeout() {} },
  ...overrides,
});

test("map view persistence debounces writes and stores the full active camera state", () => {
  class MapScene {}
  const timers = [], cleared = [], writes = [];
  installSceneStatePersistenceV1(MapScene, dependencies({
    appStore: { update: (updater) => writes.push(updater({ saved: true })) },
    browser: {
      setTimeout(callback, delay) { timers.push([callback, delay]); return timers.length; },
      clearTimeout(id) { cleared.push(id); },
    },
  }));
  const scene = Object.assign(new MapScene(), {
    sceneManualRotation: 14,
    sceneManualZoom: 2.25,
    sceneManualPan: { x: 8, y: -3 },
    sceneTiltAdjust: 6,
    hasAttribute: () => false,
  });

  scene.rememberMapView();
  scene.rememberMapView();
  assert.deepEqual(cleared, [undefined, 1]);
  assert.equal(timers[0][1], 120);
  assert.equal(timers[1][1], 120);
  timers[1][0]();

  assert.deepEqual(writes, [{
    saved: true,
    mapView: {
      sceneVersion: 10,
      referenceAerialVersion: undefined,
      rotation: 14,
      zoom: 2.25,
      pan: { x: 8, y: -3 },
      tiltAdjust: 6,
    },
  }]);
});

test("shared public map persists its fixed rotation and reference version", () => {
  class MapScene {}
  let write;
  installSceneStatePersistenceV1(MapScene, dependencies({
    appStore: { update: (updater) => { write = updater({}); } },
    browser: { setTimeout: (callback) => { callback(); return 1; }, clearTimeout() {} },
  }));
  const scene = Object.assign(new MapScene(), {
    sceneManualRotation: 25,
    sceneManualZoom: 0,
    sceneManualPan: null,
    sceneTiltAdjust: 0,
    hasAttribute: (name) => name === "data-admin-shared-public-map",
  });

  scene.rememberMapView();

  assert.deepEqual(write.mapView, {
    sceneVersion: 10,
    referenceAerialVersion: 4,
    rotation: 180,
    zoom: 1.68,
    pan: { x: 0, y: 0 },
    tiltAdjust: 0,
  });
});

test("composition extracts map persistence with explicit state and timer dependencies", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /scene-state-persistence-v1\.mjs\?v=scene-state-persistence-v1/);
  const navigation = source.indexOf("installSceneNavigationV1(MapScene, {");
  const persistence = source.indexOf("installSceneStatePersistenceV1(MapScene, {");
  const framing = source.indexOf("installCameraFramingV1(MapScene, {");
  assert.ok(navigation >= 0 && persistence > navigation && framing > persistence);
  assert.doesNotMatch(source, /rememberMapView\(\)\s*\{/);
});
