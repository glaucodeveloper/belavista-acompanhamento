import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activateMapSceneV1 } from "../../components/map/map-scene-activation-v1.mjs";

const createScene = ({ publicPresentation = false, standalone = false } = {}) => {
  const calls = [];
  const removed = [];
  const handlers = new Map();
  const state = { selectedStage: "stage-1", view: "map", mapMode: "overview" };
  const appStore = {
    get: () => state,
    subscribe: (callback) => { calls.push(["subscribe", typeof callback]); },
    set: (value) => calls.push(["set", value]),
  };
  const solarHost = {
    insertAdjacentHTML: (...args) => calls.push(["solar-markup", ...args]),
  };
  const controls = [{ remove: () => removed.push(0) }, { remove: () => removed.push(1) }];
  const scene = {
    dataset: {},
    mapTileMode: "satellite",
    _suppressMapToggleUntil: 0,
    solarHour: 9,
    mountMap3DLoadingScreenV1: () => calls.push(["loading-screen"]),
    querySelector: (selector) => selector === ".map-tint" ? solarHost : null,
    querySelectorAll: (selector) => {
      calls.push(["remove-controls", selector]);
      return controls;
    },
    isPublicCustomerExperience: () => publicPresentation,
    isAdminPublicMapV1: () => false,
    bindSolarControl: () => calls.push(["solar-bind"]),
    setMapTileMode: (...args) => calls.push(["tile-mode", ...args]),
    bindSceneControls: () => calls.push(["scene-bind"]),
    setMapContext: (view) => calls.push(["context", view]),
    isAdminStandalone3DV5370: () => standalone,
    mountAdminStandalone3DV5370: () => calls.push(["standalone-start"]),
    initWhenReady: () => calls.push(["init-ready"]),
    addEventListener: (name, callback) => handlers.set(name, callback),
    syncOperationalRecordMapV5370() {},
    setSolarHour() {},
    setStageOverlay() {},
  };
  return { appStore, calls, controls, handlers, removed, scene };
};

test("ativação administrativa preserva ordem de bindings, contexto e renderer standalone", () => {
  const fixture = createScene({ standalone: true });
  const publicPresentation = activateMapSceneV1(fixture.scene, {
    appStore: fixture.appStore,
    demoData: { activities: [] },
    performanceRef: { now: () => 0 },
    solarMarkup: "<solar-control>",
  });

  assert.equal(publicPresentation, false);
  assert.equal(fixture.scene.dataset.mapControls, "admin-enabled");
  assert.deepEqual(fixture.calls.map(([name]) => name), [
    "loading-screen", "solar-markup", "solar-bind", "tile-mode", "scene-bind",
    "context", "standalone-start", "subscribe",
  ]);
  assert.equal(fixture.calls[1][1], "afterend");
  assert.equal(fixture.calls[1][2], "<solar-control>");
  assert.deepEqual(fixture.calls[3], ["tile-mode", "satellite", false]);
  assert.equal(fixture.scene._lastOverlayStageId, "stage-1");
  assert.equal(fixture.scene._lastStoreView, "map");
  assert.equal(fixture.handlers.has("click"), true);
  assert.deepEqual(fixture.removed, []);
});

test("apresentação pública oculta controles e inicia pelo fluxo público", () => {
  const fixture = createScene({ publicPresentation: true });
  const result = activateMapSceneV1(fixture.scene, {
    appStore: fixture.appStore,
    demoData: { activities: [] },
    performanceRef: { now: () => 0 },
    solarMarkup: "solar",
  });

  assert.equal(result, true);
  assert.equal(fixture.scene.dataset.mapControls, "public-disabled");
  assert.deepEqual(fixture.removed, [0, 1]);
  assert.deepEqual(fixture.calls.map(([name]) => name), [
    "loading-screen", "solar-markup", "remove-controls", "solar-bind",
    "tile-mode", "context", "init-ready", "subscribe",
  ]);
});

test("components.js delega a ativação operacional do mapa ao módulo de composição", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  assert.match(connection, /import \{ activateMapSceneV1 \} from "\.\/map-scene-activation-v1\.mjs"/);
  assert.match(connection, /activateMapSceneV1\(this, \{/);
  assert.doesNotMatch(composition, /this\.mountMap3DLoadingScreenV1\(\)/);
  assert.doesNotMatch(composition, /appStore\.subscribe\(\(s\) =>/);
});
