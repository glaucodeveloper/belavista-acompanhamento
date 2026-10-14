import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertAdminRoadGeometryDependenciesV1,
  installAdminRoadGeometryV1,
} from "../../components/map/admin-road-geometry-v1.mjs";

const dependencies = () => ({
  ADMIN_REFERENCE_AERIAL_ASSET_V1: "/assets/reference.jpg",
  ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1: "/assets/roads.json",
  ROAD_HALF_LOT_SLICE_WORLD_V1: 5,
  appendAdminReferenceAerialCurbPathV1() {},
  createAdminReferenceAerialBezierCurbGuidesV1() {},
  createAdminReferenceAerialNativeRoadGeometryV1() {},
  createAdminReferenceAerialRoadPlaneGeometryV1() {},
  roadPlanarAngleV1() {},
  browser: { fetch() {}, document: { createElement() {} } },
});

test("admin road geometry validates browser and domain ports before installation", () => {
  const supplied = dependencies();
  assert.equal(assertAdminRoadGeometryDependenciesV1(supplied), supplied);
  assert.throws(
    () => assertAdminRoadGeometryDependenciesV1({ ...supplied, roadPlanarAngleV1: null }),
    /requires roadPlanarAngleV1\(\)/,
  );
  assert.throws(
    () => assertAdminRoadGeometryDependenciesV1({ ...supplied, browser: {} }),
    /requires fetch and document ports/,
  );
});

test("road geometry installs the complete method set on the existing MapScene class", () => {
  class MapScene {}
  installAdminRoadGeometryV1(MapScene, dependencies());
  for (const method of [
    "ensureOperationalStreetGeometry",
    "ensureAdminStandaloneRoadSurfaceV1",
    "buildAdminStandaloneRoadSurfaceV1",
    "addLotStatusBadges",
    "createNativeRoadPaverMesh",
    "segmentStreetMeshes",
    "syncPublicRoadOverlayTransforms",
  ])
    assert.equal(typeof MapScene.prototype[method], "function", `${method} is installed`);
});

test("components.js composes injected road geometry into the shared MapScene", async () => {
  const componentSource = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  const moduleSource = await readFile(new URL("../../components/map/admin-road-geometry-v1.mjs", import.meta.url), "utf8");
  assert.match(componentSource, /installAdminRoadGeometryV1\(MapScene, \{/);
  assert.match(componentSource, /import \{ ROAD_HALF_LOT_SLICE_WORLD_V1, roadPlanarAngleV1 \} from "\.\/road-geometry-math-v1\.mjs/);
  assert.doesNotMatch(componentSource, /const roadPlanarAngleV1 =/);
  assert.doesNotMatch(componentSource, /ensureOperationalStreetGeometry\(\)\s*\{/);
  assert.match(moduleSource, /const AdminRoadGeometryMethodsV1 = class/);
  assert.match(moduleSource, /fetch: fetchRoadTrace/);
  assert.match(moduleSource, /document: browserDocument/);
});
