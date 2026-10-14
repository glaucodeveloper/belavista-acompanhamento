import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertMapSceneSyncDependenciesV1,
  installMapSceneSyncV1,
} from "../../components/map/map-scene-sync-v1.mjs";

const config = () => Object.fromEntries([
  "ADMIN_FIXED_MAP_ROTATION_DEG", "ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP",
  "ADMIN_PDF_DISPLAY_Y_ROTATION_DEG", "ADMIN_PDF_DISPLAY_Y_ROTATION_RAD",
  "ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1", "DWG_PLAN_HEADING_DEG",
  "DWG_PLAN_HEADING_RAD", "DWG_SATELLITE_MOSAIC_ZOOM", "MAP_CAMERA_VIEW",
  "MAP_RASTER_MAX", "MAP_TILE_OVERSCAN", "MODEL_EXTRA_Y_ROTATION_DEG",
  "MODEL_EXTRA_Y_ROTATION_RAD", "MODEL_FIT_RATIO", "MODEL_PUBLIC_FIT_RATIO",
  "MODEL_VERTICAL_EXAGGERATION", "PUBLIC_MODEL_HORIZONTAL_FLIP",
  "PUBLIC_MODEL_NORTH_ROTATION_RAD", "PUBLIC_SATELLITE_VERTICAL_COVERAGE",
  "SCENE_MAP_Z", "SCENE_MODEL_BASE_Z", "SCENE_SURFACE_SCALE",
].map((key) => [key, key === "MAP_CAMERA_VIEW" ? "assistant" : 1]));
const dependencies = (overrides = {}) => ({
  config: config(),
  mapGeoreferenceFallback: { lat: -13, lng: -39 },
  viewThemes: { assistant: { center: [-13, -39], zoom: 18 } },
  leaflet: { latLng: (...args) => args },
  syncCompactMapMirrors() {},
  logger: { warn() {} },
  ...overrides,
});

test("map scene sync validates all injected orchestration services", () => {
  const ports = dependencies();
  assert.equal(assertMapSceneSyncDependenciesV1(ports), ports);
  assert.throws(
    () => assertMapSceneSyncDependenciesV1({ ...ports, leaflet: {} }),
    /leaflet\.latLng\(\)/,
  );
  assert.throws(
    () => assertMapSceneSyncDependenciesV1({ ...ports, syncCompactMapMirrors: null }),
    /syncCompactMapMirrors\(\)/,
  );
  const incomplete = config();
  delete incomplete.SCENE_SURFACE_SCALE;
  assert.throws(
    () => assertMapSceneSyncDependenciesV1({ ...ports, config: incomplete }),
    /config\.SCENE_SURFACE_SCALE/,
  );
});

test("syncThree installs on MapScene and safely exits when renderer or map is not ready", () => {
  class MapScene {}
  installMapSceneSyncV1(MapScene, dependencies());
  assert.equal(typeof MapScene.prototype.syncThree, "function");

  const notRendered = Object.assign(Object.create(MapScene.prototype), {
    renderer: null,
    isPublicCustomerExperience: () => true,
    querySelector() { throw new Error("must not inspect an unmounted map"); },
  });
  assert.equal(notRendered.syncThree(), undefined);

  const mapStillLoading = Object.assign(Object.create(MapScene.prototype), {
    renderer: {},
    map: { _loaded: false },
    isPublicCustomerExperience: () => false,
    querySelector() { throw new Error("must not inspect a map before Leaflet loads"); },
  });
  assert.equal(mapStillLoading.syncThree(), undefined);
});

test("public capture keeps its map-independent viewport readiness guard", () => {
  class MapScene {}
  installMapSceneSyncV1(MapScene, dependencies());
  const scene = Object.assign(Object.create(MapScene.prototype), {
    renderer: {},
    isPublicCustomerExperience: () => true,
    querySelector: () => ({ clientWidth: 1, clientHeight: 1 }),
  });
  assert.equal(scene.syncThree(), undefined);
});

test("components.js composes map sync ports and keeps runtime callers on MapScene", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const module = await readFile(new URL("../../components/map/map-scene-sync-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installMapSceneSyncV1\(MapScene,\s*\{\s*config:\s*\{[\s\S]*?mapGeoreferenceFallback:\s*MAP_GEOREFERENCE_FALLBACK,[\s\S]*?leaflet:\s*L,[\s\S]*?syncCompactMapMirrors,/);
  assert.doesNotMatch(source, /^  syncThree\(\) \{/m);
  assert.match(source, /import \{ installMapSceneSyncV1 \} from "\.\/map-scene-sync-v1\.mjs\?/);
  assert.match(module, /syncThree\(\) \{/);
  assert.match(module, /leaflet\.latLng\(/);
  assert.doesNotMatch(module, /\bL\.latLng\(|console\.warn\(/);
});
