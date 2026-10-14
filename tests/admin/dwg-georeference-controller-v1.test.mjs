import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { installDwgGeoreferenceControllerV1 } from "../../components/map/dwg-georeference-controller-v1.mjs";

const dependencies = (overrides = {}) => ({
  url: "/assets/data/dwg-georeference.json",
  fallback: { lat: -13, lng: -39 },
  appStore: { get: () => ({ solarHourMode: "manual", solarHour: 12.5 }) },
  localClockHourForGeo: () => 15.25,
  validGeoPoint: (point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)),
  fetchFn: async () => ({ ok: true, json: async () => ({}) }),
  logger: { warn() {} },
  ...overrides,
});

test("o controlador DWG é instalado antes do registro de map-scene", () => {
  const source = fs.readFileSync(path.resolve("components.js"), "utf8"),
    installAt = source.indexOf("installDwgGeoreferenceControllerV1(MapScene,"),
    defineAt = source.indexOf('customElements.define("map-scene", MapScene);');
  assert.notEqual(installAt, -1);
  assert.notEqual(defineAt, -1);
  assert.ok(installAt < defineAt);
  for (const method of ["setGpsMarkers", "applyDwgLotMetadata", "loadDwgGeoreference"])
    assert.doesNotMatch(source, new RegExp(`^\\s{2}(?:async\\s+)?${method}\\(`, "m"));
});

test("DWG carrega CRS, tabela de lotes, horário solar, marcadores e metadados do modelo", async () => {
  const normalized = [],
    attached = { userData: { glbObject: "Lote_001" } },
    markerGroup = {
      children: [],
      clear() { this.children = []; },
      add(marker) { this.children.push(marker); },
    },
    calls = [],
    manifest = {
      crs: { epsg: 31984 },
      controlPoints: [
        { id: "site-center", lat: -13.1, lng: -39.6, utmEast: 440000, utmNorth: 8560000 },
        { id: "checkpoint", lat: -13.11, lng: -39.61 },
      ],
      lots: [["Lote_001", -13.1, -39.6, 250, 0.16]],
      lotFields: ["glbObject", "lat", "lng", "areaM2", "alignmentErrorM"],
      alignment: { medianErrorM: 0.16, p90ErrorM: 0.34 },
    },
    appStore = { get: () => ({ solarHourMode: "manual", solarHour: 12.5 }) };
  class MapScene {
    dataset = {};
    markerGroup;
    gpsMarkerColors = ["#2fe6ae"];
    lotStatusBadges = [attached];
    masterplanModel = { userData: {} };
    modelParts = { lots: [{}, {}] };
    _modelGpuReady = true;
    setSolarHour(...args) { calls.push(["solar", ...args]); }
    syncThree() { calls.push(["sync"]); }
  }
  const scene = new MapScene();
  scene.markerGroup = markerGroup;
  installDwgGeoreferenceControllerV1(MapScene, dependencies({
    appStore,
    fetchFn: async (url, options) => {
      assert.equal(url, "/assets/data/dwg-georeference.json");
      assert.deepEqual(options, { cache: "no-store" });
      return { ok: true, json: async () => manifest };
    },
  }));
  class CircleGeometry { constructor(radius, segments) { this.radius = radius; this.segments = segments; } }
  class MeshBasicMaterial { constructor(options) { this.options = options; } }
  class Mesh {
    constructor(geometry, material) { this.geometry = geometry; this.material = material; this.userData = {}; this.scale = { setScalar: (value) => { this.scaleValue = value; } }; }
  }
  const THREE = { CircleGeometry, MeshBasicMaterial, Mesh };
  await scene.loadDwgGeoreference(THREE);

  assert.equal(scene.dataset.dwgGeoreference, "ready");
  assert.equal(scene.dataset.dwgCrs, "EPSG:31984");
  assert.equal(scene.dataset.dwgLotCount, "1");
  assert.equal(scene.dataset.solarInitialMode, "manual");
  assert.equal(scene.dataset.solarClockHour, "15.25");
  assert.deepEqual(calls[0], ["solar", 12.5, false, false]);
  assert.equal(markerGroup.children.length, 2);
  assert.equal(markerGroup.children[0].userData.gpsId, "site-center");
  assert.equal(markerGroup.children[0].scaleValue, 1.22);
  assert.equal(attached.userData.gps.areaM2, 250);
  assert.equal(scene.dataset.dwgLotGpsAttached, "1");
  assert.equal(scene.masterplanModel.userData.dwgGeoreferenced, true);
  assert.equal(scene.masterplanModel.userData.dwgCrs, 31984);
  assert.equal(scene.dataset.dwgSyncState, "model:1|parts:2|gpu:1");
  assert.equal(calls.filter(([kind]) => kind === "sync").length, 2);
});

test("falha real do manifesto expõe o estado de fallback sem parecer carregamento bem-sucedido", async () => {
  const warnings = [];
  class MapScene { dataset = {}; }
  installDwgGeoreferenceControllerV1(MapScene, dependencies({
    fetchFn: async () => ({ ok: false, status: 503 }),
    logger: { warn: (...args) => warnings.push(args) },
  }));
  const scene = new MapScene();
  await scene.loadDwgGeoreference({});
  assert.equal(scene.dataset.dwgGeoreference, "fallback");
  assert.equal(scene.dataset.dwgGeoreferenceError, "DWG georeference HTTP 503");
  assert.equal(warnings.length, 1);
});
