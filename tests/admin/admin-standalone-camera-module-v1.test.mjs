import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertAdminStandaloneCameraDependenciesV1,
  installAdminStandaloneCameraV1,
} from "../../components/map/admin-standalone-camera-v1.mjs";

const cameraDependencies = () => ({
  ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2: 1.3,
  ADMIN_AERIAL_TILE_SWAP_RATIO_V2: 1.5,
  ADMIN_AERIAL_ZOOM_TILE_GRID_V1: { cols: 5, rows: 3 },
  ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1: { width: 19200, height: 10805 },
  ADMIN_AERIAL_ZOOM_TILE_ROOT_V1: "/assets/tiles",
  ADMIN_STANDALONE_BASE_TILT_DEG_V1: 37,
  ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11: 180,
  ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11: 320,
  ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10: 8,
  ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10: 0.2,
  ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12: 0.85,
  ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12: 0.15,
  ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11: 160,
  DASHBOARD_PAN_BOUNDING_SCREEN_RATIO: 0.1,
  MAP_CAMERA_VIEW: "map",
  MAX_SCENE_TILT: 80,
  MAX_SCENE_ZOOM: 20,
  MIN_SCENE_TILT: 1,
  MIN_SCENE_ZOOM: 0.5,
  SCENE_MAP_Z: 0,
  appStore: { get: () => ({ view: "map" }) },
  runtimeRouteV1: (path) => path,
  sceneTiltBoostForView: () => 4,
  viewThemes: { map: { tilt: 18 } },
  browser: {
    Image: class Image {},
    performanceNow: () => 0,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
  },
});

test("standalone camera validates its injected config, app and browser ports at composition", () => {
  const dependencies = cameraDependencies();
  assert.equal(assertAdminStandaloneCameraDependenciesV1(dependencies), dependencies);
  delete dependencies.browser.requestAnimationFrame;
  assert.throws(
    () => assertAdminStandaloneCameraDependenciesV1(dependencies),
    /requires browser image and animation\/timer ports/,
  );
});

test("standalone camera installer adds the complete camera, pan, tilt and aerial tile behavior", async () => {
  class MapScene {}
  installAdminStandaloneCameraV1(MapScene, cameraDependencies());
  for (const method of [
    "isAdminStandaloneInteractiveV5370",
    "adminStandaloneGroundPointV5370",
    "getAdminStandalonePanBoundsV5370",
    "adminStandaloneAerialScreenBoundsV9",
    "updateAdminAerialZoomTilesV1",
    "ensureAdminStandaloneAerialCoverV9",
    "setAdminStandalonePanV5370",
    "setAdminStandaloneRotationV5370",
    "setAdminStandaloneTiltV5370",
    "setAdminStandaloneZoomV5370",
    "syncSceneTiltControlV1",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);

  const source = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\n  isAdminStandaloneInteractiveV5370\(\) \{/);
  assert.match(source, /installAdminStandaloneCameraV1\(MapScene, \{/);
});

test("tilt control uses injected view model services and the selected scene state", () => {
  class MapScene {}
  installAdminStandaloneCameraV1(MapScene, cameraDependencies());
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    sceneTiltAdjust: 0,
    hasAttribute: () => false,
    querySelectorAll(selector) {
      return selector === "[data-scene-tilt-range]" ? [this.range] : [this.output];
    },
    range: { value: "", setAttribute(name, value) { this[name] = value; } },
    output: { textContent: "" },
  });

  scene.syncSceneTiltControlV1();

  assert.equal(scene.range.value, "22");
  assert.equal(scene.range["aria-valuenow"], "22");
  assert.equal(scene.output.textContent, "22°");
  assert.equal(scene.dataset.sceneTiltControl, "range + buttons");
});
