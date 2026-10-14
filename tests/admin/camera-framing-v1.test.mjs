import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCameraFramingV1 } from "../../components/map/camera-framing-v1.mjs";

const dependencies = () => ({
  config: {
    ADMIN_FIXED_MAP_ROTATION_DEG: 180,
    DEFAULT_SCENE_ZOOM: 1.12,
    MAP_CAMERA_VIEW: "map",
  },
  browser: {
    document: { querySelector: () => null, body: { dataset: {} } },
    window: { innerWidth: 1280, innerHeight: 800 },
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    setTimeout: () => 1,
  },
});

test("camera framing installs public-fit and reset methods on MapScene", () => {
  class MapScene {}
  installCameraFramingV1(MapScene, dependencies());
  const style = new Map(), applied = [];
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    style: { setProperty: (key, value) => style.set(key, value) },
    hasAttribute: (name) => name === "data-admin-shared-public-map",
    markAdminCameraInteracted() {},
    isAdminStandaloneInteractiveV5370: () => false,
    rememberMapView() {},
    applySceneView: (...args) => applied.push(args),
  });

  scene.fitSceneView(false);
  assert.equal(scene.sceneManualRotation, 180);
  assert.equal(scene.sceneManualZoom, 1.12);
  assert.deepEqual(scene.sceneManualPan, { x: 0, y: 0 });
  assert.equal(scene.dataset.scenePan, "0,0");
  assert.equal(style.get("--scene-pan-x"), "0px");
  assert.deepEqual(applied, [["map", false]]);
});

test("public focus frame derives its bounds from the projected model footprint", () => {
  class Vector3 {
    constructor(x, y, z) { Object.assign(this, { x, y, z }); }
    project() { return { x: this.x / 100, y: this.y / 100 }; }
  }
  class Box3 {
    setFromObject() {
      this.min = { x: -20, y: -10, z: 0 };
      this.max = { x: 20, y: 10, z: 0 };
      return this;
    }
    isEmpty() { return false; }
  }
  class MapScene {}
  installCameraFramingV1(MapScene, dependencies());
  const styles = new Map(), scene = Object.assign(new MapScene(), {
    dataset: {},
    style: { setProperty: (key, value) => styles.set(key, value) },
    THREE: { Box3, Vector3 },
    camera: { updateMatrixWorld() {} },
    sceneStage: { updateMatrixWorld() {} },
    masterplanModel: { updateWorldMatrix() {} },
    querySelector: () => ({ clientWidth: 1000, clientHeight: 800 }),
    isPublicCustomerExperience: () => true,
  });

  assert.equal(scene.updatePublicFocusFrame(), true);
  assert.equal(scene.dataset.publicFocusFrameSource, "projected loteamento footprint");
  assert.ok(styles.has("--public-focus-x"));
  assert.ok(styles.has("--public-focus-y"));
  assert.ok(styles.has("--public-focus-w"));
  assert.ok(styles.has("--public-focus-h"));
});

test("camera framing receives browser/config dependencies at the MapScene composition root", async () => {
  const source = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /camera-framing-v1\.mjs\?v=camera-framing-v1/);
  assert.match(source, /installCameraFramingV1\(MapScene, \{[\s\S]*?ADMIN_FIXED_MAP_ROTATION_DEG,[\s\S]*?DEFAULT_SCENE_ZOOM,[\s\S]*?MAP_CAMERA_VIEW,[\s\S]*?getComputedStyle,[\s\S]*?setTimeout:/);
});
