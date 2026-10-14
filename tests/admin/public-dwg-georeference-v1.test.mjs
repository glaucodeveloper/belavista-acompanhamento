import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertPublicDwgGeoreferenceDependenciesV1,
  installPublicDwgGeoreferenceV1,
} from "../../components/map/public-dwg-georeference-v1.mjs";

const config = () => ({
  ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP: -1,
  ADMIN_PDF_DISPLAY_Y_ROTATION_DEG: 0,
  ADMIN_PDF_DISPLAY_Y_ROTATION_RAD: 0,
  MODEL_EXTRA_Y_ROTATION_DEG: 0,
  MODEL_EXTRA_Y_ROTATION_RAD: 0,
  MODEL_VERTICAL_EXAGGERATION: 1,
  PUBLIC_MODEL_HORIZONTAL_FLIP: -1,
  PUBLIC_MODEL_NORTH_ROTATION_DEG: -90,
  PUBLIC_MODEL_NORTH_ROTATION_RAD: -Math.PI / 2,
  SCENE_MODEL_BASE_Z: 0,
});

test("public DWG georeference validates all injected model frame constants", () => {
  const dependencies = { config: config() };
  assert.equal(assertPublicDwgGeoreferenceDependenciesV1(dependencies), dependencies);
  const incomplete = config();
  delete incomplete.PUBLIC_MODEL_NORTH_ROTATION_RAD;
  assert.throws(
    () => assertPublicDwgGeoreferenceDependenciesV1({ config: incomplete }),
    /config\.PUBLIC_MODEL_NORTH_ROTATION_RAD/,
  );
});

test("geographic frame uses the DWG GPS envelope and preserves viewport metadata", () => {
  class MapScene {}
  installPublicDwgGeoreferenceV1(MapScene, { config: config() });
  const scene = Object.assign(Object.create(MapScene.prototype), {
    isPublicMapVisual: () => true,
    dataset: {},
    dwgGeo: {
      drawingBounds: {
        gps: { south: -13.01, west: -39.02, north: -13.0, east: -39.0 },
        center: { lat: -13.005, lng: -39.01 },
      },
      controlPoints: [
        { id: "site-center", lat: -13.005, lng: -39.01 },
        { id: "north-west", lat: -13.0, lng: -39.02 },
      ],
    },
  });

  const frame = scene.publicDwgGeoFrame({ zoom: 18 }, 1280, 720);

  assert.equal(frame.source, "DWG drawingBounds.gps + control points");
  assert.deepEqual(frame.center, [-13.005, -39.01]);
  assert.deepEqual(frame.viewport, [1280, 720]);
  assert.ok(frame.widthPx > 0 && frame.heightPx > 0);
  assert.equal(scene.dataset.publicGeoFrameSource, frame.source);
  assert.equal(scene.dataset.publicGeoFitStatus, "DWG envelope measured before visual treatment");
  assert.equal(scene.publicDwgGeoFrame({}, 0, 0).zoom, 18);
});

test("the extracted methods remain installed on the original MapScene composition", async () => {
  class MapScene {}
  installPublicDwgGeoreferenceV1(MapScene, { config: config() });
  assert.equal(typeof MapScene.prototype.publicDwgGeoFrame, "function");
  assert.equal(typeof MapScene.prototype.publicDwgModelAffine, "function");

  const composition = [
    await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    await readFile(new URL("../../components/map/map-scene-sync-v1.mjs", import.meta.url), "utf8"),
  ].join("\n");
  const moduleSource = await readFile(new URL("../../components/map/public-dwg-georeference-v1.mjs", import.meta.url), "utf8");
  assert.match(composition, /installPublicDwgGeoreferenceV1\(MapScene,\s*\{\s*config:\s*\{/);
  assert.match(composition, /installPublicDwgGeoreferenceV1\(MapScene,[\s\S]*?installMapSceneContextExtensionsV1\(/);
  assert.doesNotMatch(composition, /publicDwgGeoFrame\(theme = \{\}, w = 0, h = 0\)\s*\{/);
  assert.doesNotMatch(composition, /^\s*publicDwgModelAffine\(/m);
  assert.match(composition, /this\.publicDwgGeoFrame\(/);
  assert.match(composition, /this\.publicDwgModelAffine\(/);
  assert.match(moduleSource, /PUBLIC_MODEL_NORTH_ROTATION_RAD/);
});
