import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSceneConnectionV1 } from "../../components/map/map-scene-connection-v1.mjs";

const dependencies = (calls, attributes = new Set()) => ({
  ADMIN_FIXED_MAP_ROTATION_DEG: 0,
  ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM: 0.73,
  ADMIN_REFERENCE_AERIAL_VIEW_VERSION: 12,
  DASHBOARD_INITIAL_SCENE_ZOOM: 0.28,
  INITIAL_SCENE_ZOOM: 0.55,
  MAP_SCENE_STATE_VERSION: 7,
  MAX_SCENE_ZOOM: 3.2,
  MIN_SCENE_ZOOM: 0.16,
  appStore: {
    get: () => ({ mapView: {}, mapTileMode: "satellite", selectedStage: "stage-1", view: "map" }),
    subscribe: () => calls.push("subscribe"),
  },
  demoData: { activities: [{ id: "stage-1", name: "Projeto executivo" }] },
  esc: (value) => value,
  ico: (name) => `<i>${name}</i>`,
  performanceRef: { now: () => 0 },
  setSharedMapScene: (scene) => calls.push(["shared", scene]),
  stageOverlayKey: (name) => name,
  stageOverlayLabels: { progress: "Progresso" },
});

const fixtureScene = (attributes = []) => {
  const calls = [];
  const scene = {
    attributes: new Set(attributes),
    dataset: {},
    style: { values: new Map(), setProperty(key, value) { this.values.set(key, value); } },
    querySelector(selector) {
      if (selector === ".scene-world" || selector === ".three-overlay" || selector === ".map-host") return { style: {} };
      if (selector === ".map-tint") return { insertAdjacentHTML: (...args) => calls.push(["solar", ...args]) };
      return null;
    },
    querySelectorAll: () => [],
    hasAttribute(name) { return this.attributes.has(name); },
    getAttribute: () => "Etapa teste",
    isAdminPublicMapV1: () => false,
    isPublicCustomerExperience: () => false,
    renderCompact: () => calls.push("compact"),
    mountMap3DLoadingScreenV1: () => calls.push("loading"),
    bindSolarControl: () => calls.push("solar-bind"),
    setMapTileMode: (...args) => calls.push(["tile", ...args]),
    bindSceneControls: () => calls.push("scene-bind"),
    setMapContext: (view) => calls.push(["context", view]),
    isAdminStandalone3DV5370: () => false,
    mountAdminStandalone3DV5370: () => calls.push("admin-start"),
    initWhenReady: () => calls.push("ready"),
    addEventListener: (name) => calls.push(["event", name]),
    syncOperationalRecordMapV5370() {},
    setSolarHour() {},
    setStageOverlay() {},
  };
  return { calls, scene };
};

test("conexão compacta inicializa estado e monta o renderizador apenas uma vez", () => {
  class MapScene {}
  const fixture = fixtureScene(["compact"]);
  Object.assign(MapScene.prototype, fixture.scene);
  const calls = fixture.calls;
  installMapSceneConnectionV1(MapScene, dependencies(calls, fixture.scene.attributes));
  const scene = Object.assign(Object.create(MapScene.prototype), fixture.scene);

  scene.connectedCallback();
  const firstId = scene.dataset.mapInstanceId;
  scene.connectedCallback();

  assert.equal(scene.dataset.mapLifecycle, "persistent-mounted");
  assert.match(firstId, /^map-\d+-[a-z0-9]{5}$/);
  assert.ok(scene.selectedLotIds instanceof Set);
  assert.equal(scene.mapSelectionMode, null);
  assert.deepEqual(scene.progressSelectionParts, []);
  assert.deepEqual(calls, ["compact"]);
});

test("conexão completa compõe shell, enquadramento, ativação e eventos na ordem", () => {
  class MapScene {}
  const fixture = fixtureScene(["data-persistent-map"]);
  Object.assign(MapScene.prototype, fixture.scene);
  const calls = fixture.calls;
  installMapSceneConnectionV1(MapScene, dependencies(calls, fixture.scene.attributes));
  const scene = Object.assign(Object.create(MapScene.prototype), fixture.scene);

  scene.connectedCallback();

  assert.equal(calls[0][0], "shared");
  assert.match(scene.innerHTML, /data-scene-print-map/);
  assert.equal(scene.dataset.mapCoverLayoutV9, "full-inset");
  assert.deepEqual(calls.map((entry) => Array.isArray(entry) ? entry[0] : entry), [
    "shared", "loading", "solar", "solar-bind", "tile", "scene-bind",
    "context", "ready", "subscribe", "event",
  ]);
  assert.equal(calls[2][1], "afterend");
  assert.match(calls[2][2], /data-solar-hour/);
});

test("components.js instala o ciclo completo antes do registro do custom element", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  const installer = composition.indexOf("installMapSceneConnectionV1(MapScene");
  const registration = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installMapSceneConnectionV1 \} from "\.\/map-scene-connection-v1\.mjs\?/);
  assert.ok(installer >= 0 && registration > installer);
  assert.match(connection, /MapScene\.prototype\.connectedCallback = function/);
  assert.doesNotMatch(composition, /connectedCallback\(\)\s*\{/);
});
