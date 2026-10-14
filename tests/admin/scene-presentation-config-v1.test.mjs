import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createScenePresentationConfigV1 } from "../../components/map/scene-presentation-config-v1.mjs";

test("scene presentation config keeps the map camera and tilt defaults", () => {
  const config = createScenePresentationConfigV1({ search: "" });

  assert.equal(config.DEFAULT_SCENE_ZOOM, 1.12);
  assert.equal(config.INITIAL_SCENE_ZOOM, 1.68);
  assert.equal(config.MIN_SCENE_ZOOM, 0.16);
  assert.equal(config.MAX_SCENE_ZOOM, 20);
  assert.equal(config.MIN_SCENE_TILT, 0);
  assert.equal(config.MAX_SCENE_TILT, 72);
  assert.equal(config.sceneTiltBoostForView("assistant"), 22);
  assert.equal(config.sceneTiltBoostForView("map"), 52);
});

test("scene presentation config reads and clamps URL calibration parameters", () => {
  const config = createScenePresentationConfigV1({
    search:
      "?modelRotate=270&modelRotateX=-90&modelRotateY=10&modelShiftX=700&modelShiftY=-8&modelShiftZ=150&modelScale=2",
  });

  assert.deepEqual(config.ADMIN_MODEL_CALIBRATION_V1, {
    rotation: { x: -45, y: 10, z: 180 },
    shift: { x: 500, y: -8, z: 100 },
    scale: 1.5,
  });
  assert.deepEqual(config.ADMIN_MODEL_CALIBRATION_INITIAL_V1, {
    rotation: { x: -45, y: 10, z: 180 },
    shift: { x: 500, y: -8, z: 100 },
    scale: 1.5,
  });

  const invalid = config.readAdminModelCalibrationV1({ search: "?modelRotate=nope" });
  assert.equal(invalid.rotation.z, 0);
});

test("scene config is frozen while its live calibration object remains mutable", () => {
  const config = createScenePresentationConfigV1({ search: "?modelRotate=4" });

  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.ADMIN_MODEL_CALIBRATION_V1), false);
  config.ADMIN_MODEL_CALIBRATION_V1.rotation.z = 7;
  assert.equal(config.ADMIN_MODEL_CALIBRATION_V1.rotation.z, 7);
});

test("components.js delegates scene presentation defaults to the extracted module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");

  assert.match(source, /createScenePresentationConfigV1/);
  assert.match(source, /const scenePresentationConfigV1 = createScenePresentationConfigV1\(\)/);
  assert.match(source, /const \{[\s\S]*?\} = scenePresentationConfigV1;/);
  assert.doesNotMatch(source, /const DEFAULT_SCENE_ZOOM = 1\.12/);
  assert.doesNotMatch(source, /const ADMIN_MODEL_CALIBRATION_DEFAULTS_V1 = \{/);
});
