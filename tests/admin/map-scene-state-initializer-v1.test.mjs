import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeMapSceneStateV1 } from "../../components/map/map-scene-state-initializer-v1.mjs";

const config = {
  ADMIN_FIXED_MAP_ROTATION_DEG: 0,
  ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM: 0.73,
  ADMIN_REFERENCE_AERIAL_VIEW_VERSION: 12,
  DASHBOARD_INITIAL_SCENE_ZOOM: 0.28,
  INITIAL_SCENE_ZOOM: 0.55,
  MAP_SCENE_STATE_VERSION: 7,
  MAX_SCENE_ZOOM: 3.2,
  MIN_SCENE_ZOOM: 0.16,
  appStore: {
    get: () => ({
      mapView: {
        sceneVersion: 7,
        referenceAerialVersion: 12,
        zoom: 1.45,
        rotation: 16,
        pan: { x: -38.4, y: 21.6 },
        tiltAdjust: 4,
      },
      mapTileMode: "satellite",
      selectedStage: "stage-2",
    }),
  },
  demoData: { activities: [{ id: "stage-2", name: "Drenagem" }] },
  stageOverlayKey: (name) => `overlay:${name}`,
};

const sceneFixture = (attributes = []) => ({
  attributes: new Set(attributes),
  dataset: {},
  style: { values: new Map(), setProperty(key, value) { this.values.set(key, value); } },
  hasAttribute(name) { return this.attributes.has(name); },
  isAdminPublicMapV1() { return false; },
  isPublicCustomerExperience() { return false; },
});

test("restaura navegação válida e publica limites e metadados no MapScene", () => {
  const scene = sceneFixture(["data-dashboard-progress-map"]);
  const result = initializeMapSceneStateV1(scene, config);

  assert.deepEqual(result, {
    isAdminPublicMap: false,
    isAdminReferenceAerial: false,
    isCurrentSceneState: true,
    initialSceneZoom: 0.28,
  });
  assert.equal(scene.mapTileMode, "satellite");
  assert.equal(scene.sceneManualZoom, 1.45);
  assert.equal(scene.sceneManualRotation, 16);
  assert.deepEqual(scene.sceneManualPan, { x: -38.4, y: 21.6 });
  assert.equal(scene.sceneTiltAdjust, 4);
  assert.equal(scene.sceneUserInteracted, true);
  assert.equal(scene.initialSceneFocusApplied, true);
  assert.equal(scene.stageOverlayKey, "overlay:Drenagem");
  assert.equal(scene.dataset.sceneZoom, "145%");
  assert.equal(scene.dataset.sceneZoomMin, "16%");
  assert.equal(scene.dataset.sceneZoomMax, "320%");
  assert.equal(scene.dataset.scenePan, "-38,22");
  assert.equal(scene.dataset.sceneStateVersion, "7");
  assert.equal(scene.dataset.adminReferenceAerialViewVersion, "");
  assert.equal(scene.style.values.get("--scene-anchor-x"), "50%");
  assert.equal(scene.style.values.get("--scene-anchor-y"), "50%");
});

test("mapa administrativo público aplica rotação bloqueada e versão aérea", () => {
  const scene = sceneFixture(["data-dashboard-operational-map", "data-admin-shared-public-map"]);
  const result = initializeMapSceneStateV1(scene, {
    ...config,
    ADMIN_FIXED_MAP_ROTATION_DEG: -90,
  });

  assert.equal(result.isAdminReferenceAerial, true);
  assert.equal(result.initialSceneZoom, 0.73);
  assert.equal(scene.sceneManualRotation, -90);
  assert.equal(scene.sceneManualZoom, 1.45);
  assert.equal(scene.dataset.sceneRotationLock, "-90deg · fixo");
  assert.equal(scene.dataset.adminReferenceAerialViewVersion, "12");
});

test("versão de navegação incompatível recomeça no enquadramento da rota", () => {
  const scene = sceneFixture(["data-dashboard-progress-map"]);
  const result = initializeMapSceneStateV1(scene, {
    ...config,
    appStore: {
      get: () => ({
        mapView: { sceneVersion: 6, zoom: 2.7, rotation: 88, pan: { x: 40, y: 50 } },
        mapTileMode: "osm",
        selectedStage: "stage-2",
      }),
    },
  });

  assert.equal(result.isCurrentSceneState, false);
  assert.equal(scene.sceneManualZoom, 0.28);
  assert.equal(scene.sceneManualRotation, 0);
  assert.deepEqual(scene.sceneManualPan, { x: 0, y: 0 });
  assert.equal(scene.sceneTiltAdjust, 0);
  assert.equal(scene.sceneUserInteracted, false);
  assert.equal(scene.mapTileMode, "osm");
});

test("components.js delega a restauração do mapa ao módulo state initializer", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  assert.match(connection, /import \{ initializeMapSceneStateV1 \} from "\.\/map-scene-state-initializer-v1\.mjs"/);
  assert.match(connection, /initializeMapSceneStateV1\(this, \{/);
  assert.doesNotMatch(composition, /this\.sceneManualZoom\s*=\s*isCurrentSceneState/);
});
