import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertAdminModelCalibrationDependenciesV1,
  installAdminModelCalibrationV1,
} from "../../components/map/admin-model-calibration-v1.mjs";

test("admin model calibration requires the shared MapScene and injected calibration source", () => {
  class MapScene {}
  const dependencies = { getCalibration: () => ({ rotation: {}, shift: {}, scale: 1 }) };
  assert.equal(assertAdminModelCalibrationDependenciesV1(MapScene, dependencies), dependencies);
  assert.throws(() => assertAdminModelCalibrationDependenciesV1(MapScene, {}), /getCalibration/);
  installAdminModelCalibrationV1(MapScene, dependencies);
  assert.equal(typeof MapScene.prototype.applyAdminModelCalibrationV1, "function");
});

test("baseline calibration preserves the original source matrix and reports unchanged controls", () => {
  class MapScene {}
  const calibration = { rotation: { x: 0, y: 0, z: 0 }, shift: { x: 0, y: 0, z: 0 }, scale: 1 };
  installAdminModelCalibrationV1(MapScene, { getCalibration: () => calibration });
  const scene = Object.assign(new MapScene(), { dataset: {} });
  const sourceMatrix = { source: "DWG affine frame" };

  assert.equal(scene.applyAdminModelCalibrationV1({}, {}, sourceMatrix), sourceMatrix);
  assert.equal(scene.dataset.adminModelCalibration, "baseline · parâmetros 0/0/0 · escala 1");
  assert.equal(scene.dataset.adminModelCalibrationUrl, "modelRotate,modelRotateX/Y/Z,modelShiftX/Y/Z,modelScale");
  assert.equal(scene.applyAdminModelCalibrationV1(null, {}, sourceMatrix), sourceMatrix);
});

test("components.js composes calibration from the current mutable admin model settings", async () => {
  const source = [
    await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    await readFile(new URL("../../components/map/map-scene-sync-v1.mjs", import.meta.url), "utf8"),
  ].join("\n");
  assert.match(source, /installAdminModelCalibrationV1\(MapScene,\s*\{\s*getCalibration:\s*\(\)\s*=>\s*ADMIN_MODEL_CALIBRATION_V1/);
  assert.match(source, /this\.applyAdminModelCalibrationV1\(/);
  assert.doesNotMatch(source, /^  applyAdminModelCalibrationV1\(THREE, model, sourceMatrix\) \{/m);
});
