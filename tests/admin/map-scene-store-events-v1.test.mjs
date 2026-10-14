import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSceneStoreEventsV1 } from "../../components/map/map-scene-store-events-v1.mjs";

const setup = (publicPresentation = false) => {
  let subscriber;
  const state = { mapMode: "overview" };
  const published = [];
  const handlers = new Map();
  const calls = [];
  const appStore = {
    get: () => state,
    subscribe(callback) { subscriber = callback; },
    set(value) { published.push(value); Object.assign(state, value); },
  };
  const scene = {
    _lastStoreView: "map",
    _lastRecordsRef: null,
    _lastOverlayStageId: "stage-1",
    _publicRequestedMapTileMode: null,
    _suppressMapToggleUntil: 50,
    solarHour: 9,
    dataset: {},
    setMapContext: (view) => calls.push(["view", view]),
    syncOperationalRecordMapV5370: (records) => calls.push(["records", records]),
    setSolarHour: (...args) => calls.push(["solar", ...args]),
    setMapTileMode: (...args) => calls.push(["tiles", ...args]),
    setStageOverlay: (...args) => calls.push(["stage", ...args]),
    addEventListener(name, callback) { handlers.set(name, callback); },
  };
  installMapSceneStoreEventsV1(scene, {
    appStore,
    demoData: { activities: [{ id: "stage-2", name: "Drenagem" }] },
    performanceRef: { now: () => 100 },
    publicPresentation,
  });
  return { appStore, calls, handlers, published, scene, get subscriber() { return subscriber; } };
};

test("store sincroniza view, registros, hora solar, base cartográfica e etapa", () => {
  const fixture = setup();
  const records = [{ id: "record-1" }];
  fixture.subscriber({
    view: "materials",
    records,
    solarHourMode: "manual",
    solarHour: 10.5,
    mapMode: "focus",
    mapTileMode: "osm",
    selectedStage: "stage-2",
  });

  assert.deepEqual(fixture.calls, [
    ["view", "materials"],
    ["records", records],
    ["solar", 10.5, false, false],
    ["tiles", "osm", false],
    ["stage", "Drenagem", false],
  ]);
  assert.equal(fixture.scene.dataset.mode, "focus");
  assert.equal(fixture.scene._lastStoreView, "materials");
  assert.equal(fixture.scene._lastRecordsRef, records);
  assert.equal(fixture.scene._lastOverlayStageId, "stage-2");
});

test("apresentação pública mantém sincronização e não altera overlay de etapa", () => {
  const fixture = setup(true);
  fixture.subscriber({
    view: "map",
    records: null,
    solarHourMode: "auto",
    mapMode: "overview",
    mapTileMode: "generated",
    selectedStage: "stage-2",
  });

  assert.deepEqual(fixture.calls, [["tiles", "generated", false]]);
  assert.equal(fixture.scene._lastOverlayStageId, "stage-1");
});

test("clique no mapa alterna foco, mas controles e janela de supressão não", () => {
  const fixture = setup();
  const click = fixture.handlers.get("click");
  click({ target: { closest: () => ({}) } });
  assert.equal(fixture.published.length, 0, "clique em controle é ignorado");
  click({ target: { closest: () => null } });
  assert.deepEqual(fixture.published, [{ mapMode: "focus", lastAction: "Alternou foco do mapa" }]);

  fixture.scene._suppressMapToggleUntil = 200;
  click({ target: { closest: () => null } });
  assert.equal(fixture.published.length, 1, "clique suprimido não alterna o foco");
});

test("components.js delega os eventos de estado ao módulo MapScene", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  const activation = await readFile(new URL("../../components/map/map-scene-activation-v1.mjs", import.meta.url), "utf8");
  assert.match(activation, /import \{ installMapSceneStoreEventsV1 \} from "\.\/map-scene-store-events-v1\.mjs"/);
  assert.match(connection, /import \{ activateMapSceneV1 \} from "\.\/map-scene-activation-v1\.mjs"/);
  assert.match(composition, /installMapSceneConnectionV1\(MapScene, \{/);
  assert.doesNotMatch(composition, /appStore\.subscribe\(\(s\) => \{/);
});
