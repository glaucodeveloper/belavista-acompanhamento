import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { installLeafletMapSceneV1 } from "../../components/map/leaflet-map-scene-v1.mjs";

const withGlobal = async (name, value, run) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  try { await run(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
};

test("initLeaflet is installed before map-scene is registered", () => {
  const source = (fs.readFileSync(path.resolve('components/map/map-scene-composition-v1.mjs'), 'utf8') + fs.readFileSync(path.resolve("components.js"), 'utf8')),
    composition = fs.readFileSync(path.resolve("components/map/map-scene-composition-v1.mjs"), "utf8"),
    installAt = composition.indexOf("installLeafletMapSceneV1(MapScene,"),
    defineAt = source.indexOf('customElements.define("map-scene", MapScene);');
  assert.notEqual(installAt, -1);
  assert.notEqual(defineAt, -1);
  assert.ok(installAt < defineAt);
  assert.doesNotMatch(source, /^\s{2}initLeaflet\(\)\s*\{/m);
});

test("Leaflet mantém centro inicial, handlers geográficos, redimensionamento e estado pronto", async () => {
  const eventHandlers = new Map(),
    setViews = [],
    invalidations = [];
  let resizeHandler;
  const map = {
    setView(center, zoom, options) { setViews.push({ center, zoom, options }); return this; },
    on(events, handler) { eventHandlers.set(events, handler); },
    whenReady(handler) { handler(); },
    invalidateSize(options) { invalidations.push(options); },
  };
  const leaflet = {
    latLng(lat, lng) { return { lat, lng }; },
    map(host, options) { assert.equal(host.id, "map-host"); assert.equal(options.maxZoom, 22); return map; },
    control: { zoom({ position }) { assert.equal(position, "bottomright"); return { addTo(target) { assert.equal(target, map); } }; } },
  };
  const state = { view: "map" },
    appStore = { set(value) { Object.assign(state, value); }, get() { return state; } },
    themes = {
      assistant: { center: [-13.01, -39.62], zoom: 15 },
      dashboard: { center: [-13.02, -39.63], zoom: 16 },
    },
    hostSize = { width: 640, height: 480 },
    host = { id: "map-host", getBoundingClientRect: () => ({ left: 100, top: 200, ...hostSize }) },
    canvas = { getBoundingClientRect: () => ({ left: 10, top: 20 }) };
  class TestResizeObserver {
    constructor(callback) { resizeHandler = callback; }
    observe(target) { assert.equal(target, host); }
  }
  class MapScene {
    dataset = {};
    querySelector(selector) { return selector === ".map-host" ? host : selector === ".three-overlay" ? canvas : null; }
    isPublicCustomerExperience() { return false; }
    syncThree() { this.synced = (this.synced || 0) + 1; }
    setTheme(value) { this.theme = value; }
    setMapContext(value) { this.context = value; }
    pickModelAt(point) { this.pickedPoint = point; return true; }
    clearCurrentMapSelectionV1() { this.cleared = true; }
  }
  await withGlobal("L", leaflet, async () =>
    await withGlobal("window", { ResizeObserver: TestResizeObserver }, async () =>
      await withGlobal("ResizeObserver", TestResizeObserver, async () =>
        await withGlobal("requestAnimationFrame", (callback) => { callback(); return 1; }, async () => {
          installLeafletMapSceneV1(MapScene, {
            viewThemes: themes,
            mapCameraView: "dashboard",
            validGeoPoint: (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
            appStore,
          });
          const scene = new MapScene();
          scene.initLeaflet();
          assert.equal(scene.dataset.leaflet, "ready");
          assert.equal(scene._mapReady, true);
          assert.deepEqual(setViews.map(({ center, zoom }) => [center.lat, center.lng, zoom]), [
            [-13.01, -39.62, 15],
            [-13.02, -39.63, 16],
          ]);
          assert.deepEqual(state, { view: "map", mapReady: true });
          assert.equal(scene.theme, "dashboard");
          assert.equal(scene.context, "map");
          assert.ok(eventHandlers.has("moveend zoomend"));
          assert.ok(eventHandlers.has("click"));
          eventHandlers.get("click")({ containerPoint: { x: 5, y: 7 } });
          assert.deepEqual(scene.pickedPoint, { x: 95, y: 187 });
          hostSize.width = 800;
          hostSize.height = 600;
          resizeHandler([{ contentRect: { width: 800, height: 600 } }]);
          assert.equal(invalidations.length, 2);
          assert.equal(scene.synced, 2);
        }),
      ),
    ),
  );
});

test("experiência pública conserva a captura estática e não instancia Leaflet", () => {
  class MapScene {
    dataset = {};
    isPublicCustomerExperience() { return true; }
    querySelector() { throw new Error("não deve procurar host para a captura pública"); }
  }
  installLeafletMapSceneV1(MapScene, {
    viewThemes: { assistant: { center: [0, 0], zoom: 1 } },
    mapCameraView: "assistant",
    validGeoPoint: () => true,
    appStore: { set() {} },
  });
  const scene = new MapScene();
  scene.initLeaflet();
  assert.equal(scene.dataset.leaflet, "disabled-static-capture");
  assert.equal(scene.dataset.publicMapProvider, "local-capture");
  assert.equal(scene.dataset.publicMapRequests, "0");
  assert.equal(scene.map, undefined);
});
