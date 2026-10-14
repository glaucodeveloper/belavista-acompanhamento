import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAdminMapSyncDevtoolsV1 } from "../../components/map/admin-map-sync-devtools-v1.mjs";

test("map sync devtools mutates the live calibration, clamps inputs, and syncs the renderer", () => {
  const calibration = {
    rotation: { x: 0, y: 0, z: 0 },
    shift: { x: 0, y: 0, z: 0 },
    scale: 1,
  };
  const initialCalibration = {
    rotation: { x: 2, y: 0, z: -3 },
    shift: { x: 1, y: 2, z: 3 },
    scale: 1.1,
  };
  const calls = [];
  const map = {
    dataset: { modelReady: "true" },
    syncThree: () => calls.push("syncThree"),
    scene: {},
    camera: {},
    renderer: { render: (scene, camera) => calls.push(["render", scene, camera]) },
  };
  const host = {
    document: { querySelector: (selector) => { calls.push(selector); return map; } },
  };
  const api = installAdminMapSyncDevtoolsV1({ calibration, initialCalibration, host });

  assert.equal(host.__BELAVISTA_MAP_SYNC__, api);
  assert.equal(host.belavistaMapSync, api);
  assert.deepEqual(api.set({
    modelRotate: 240,
    rotationX: -90,
    rotationY: 15,
    shiftX: -800,
    shiftZ: 150,
    modelScale: 2,
  }), {
    mapFound: true,
    modelReady: true,
    calibration: {
      rotation: { x: -45, y: 15, z: 180 },
      shift: { x: -500, y: 0, z: 100 },
      scale: 1.5,
    },
  });
  assert.deepEqual(api.get(), {
    rotation: { x: -45, y: 15, z: 180 },
    shift: { x: -500, y: 0, z: 100 },
    scale: 1.5,
  });
  assert.deepEqual(api.reset(), {
    mapFound: true,
    modelReady: true,
    calibration: initialCalibration,
  });
  assert.equal(calls.filter((call) => call === "syncThree").length, 2);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "render").length, 2);
  assert.equal(api.help.includes("__BELAVISTA_MAP_SYNC__.reset()"), true);
});

test("map sync devtools reuses the global diagnostic API object", () => {
  const existing = { retained: true };
  const calibration = { rotation: { x: 0, y: 0, z: 0 }, shift: { x: 0, y: 0, z: 0 }, scale: 1 };
  const host = { __BELAVISTA_MAP_SYNC__: existing, document: { querySelector: () => null } };
  const api = installAdminMapSyncDevtoolsV1({
    calibration,
    initialCalibration: calibration,
    host,
  });

  assert.equal(api, existing);
  assert.equal(api.retained, true);
  assert.deepEqual(api.sync(), {
    mapFound: false,
    modelReady: false,
    calibration: { rotation: { x: 0, y: 0, z: 0 }, shift: { x: 0, y: 0, z: 0 }, scale: 1 },
  });
});

test("components.js injects live calibration into the extracted map devtools module", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));

  assert.match(source, /import \{ installAdminMapSyncDevtoolsV1 \} from "\.\/components\/map\/admin-map-sync-devtools-v1\.mjs\?v=admin-map-sync-devtools-v1"/);
  assert.match(source, /installAdminMapSyncDevtoolsV1\(\{\s*calibration: ADMIN_MODEL_CALIBRATION_V1,\s*initialCalibration: ADMIN_MODEL_CALIBRATION_INITIAL_V1,/);
  assert.doesNotMatch(source, /const installAdminMapSyncDevtoolsV1 = \(\) =>/);
});
