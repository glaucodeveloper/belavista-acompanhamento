import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSceneControlsV1 } from "../../components/map/map-scene-controls-v1.mjs";

test("map scene controls preserve delegated click actions and avoid duplicate listeners", () => {
  class MapScene {}
  installMapSceneControlsV1(MapScene, {
    ADMIN_STANDALONE_BASE_TILT_DEG_V1: 36,
    MAP_CAMERA_VIEW: "map",
    sceneTiltBoostForView: () => 4,
    viewThemes: { map: { tilt: 18 } },
  });
  const listeners = [], actions = [], scene = Object.assign(new MapScene(), {
    dataset: {},
    addEventListener: (...args) => listeners.push(args),
    contains: () => true,
    hasAttribute: () => false,
    sceneManualZoom: 2,
    setSceneZoom: (...args) => actions.push(["zoom", ...args]),
    syncSceneTiltControlV1: () => actions.push(["sync-tilt"]),
  });
  scene.bindSceneControls();
  scene.bindSceneControls();

  const zoomButton = {
    dataset: { sceneZoom: "1.5" },
    closest: () => zoomButton,
    hasAttribute: (name) => name === "data-scene-zoom",
  };
  let prevented = 0, stopped = 0;
  listeners.find(([type]) => type === "click")[1]({
    target: zoomButton,
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
  });

  assert.equal(listeners.length, 2);
  assert.deepEqual(actions, [["sync-tilt"], ["zoom", 3.5, true]]);
  assert.equal(scene.dataset.mapControls, "connected");
  assert.equal(scene.dataset.mapControlAction, "zoom:1.5");
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
});

test("absolute tilt control preserves standalone, shared-public and regular map bases", () => {
  class MapScene {}
  installMapSceneControlsV1(MapScene, {
    ADMIN_STANDALONE_BASE_TILT_DEG_V1: 36,
    MAP_CAMERA_VIEW: "map",
    sceneTiltBoostForView: () => 4,
    viewThemes: { map: { tilt: 18 } },
  });
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    addEventListener(type, handler) { this.handlers ||= {}; this.handlers[type] = handler; },
    contains: () => true,
    hasAttribute: (name) => name === "data-admin-shared-public-map",
    isAdminStandaloneInteractiveV5370: () => false,
    setSceneTiltAdjust: (value, animate) => { scene.tilt = [value, animate]; },
  });
  scene.bindSceneControls();
  const control = { value: "32", closest: () => control };
  scene.handlers.input({ target: control });

  assert.deepEqual(scene.tilt, [10, false]);
  assert.equal(scene.dataset.mapControlAction, "tilt:absolute:32");

  scene.hasAttribute = () => false;
  scene.handlers.input({ target: control });
  assert.deepEqual(scene.tilt, [10, false]);

  scene.isAdminStandaloneInteractiveV5370 = () => true;
  scene.handlers.input({ target: control });
  assert.deepEqual(scene.tilt, [-4, false]);
});

test("components composition installs map controls with the existing tilt dependencies", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /map-scene-controls-v1\.mjs\?v=map-scene-controls-v1/);
  assert.match(source, /installMapSceneControlsV1\(MapScene, \{\s*ADMIN_STANDALONE_BASE_TILT_DEG_V1,\s*MAP_CAMERA_VIEW,\s*sceneTiltBoostForView,\s*viewThemes,\s*\}\)/);
});
