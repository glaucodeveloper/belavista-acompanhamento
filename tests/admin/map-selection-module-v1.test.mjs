import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSelectionV1 } from "../../components/map/map-selection-v1.mjs";

const createFixture = () => {
  const notices = [], rail = { renders: 0, render() { this.renders++; } },
    icons = { renders: 0, createIcons() { this.renders++; } },
    state = { mapProgressSelection: [], mapFilters: [], view: "records", selectedStage: "water", records: [] },
    store = {
      get: () => state,
      set(patch) { Object.assign(state, patch); },
      update(updater) { Object.assign(state, updater(state)); },
    };
  const listeners = new Map(), panel = {
    dataset: {}, style: {}, classList: { toggle() {}, add() {}, remove() {} },
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === "[data-map-progress-form]" ? form : button; },
    addEventListener(type, handler) { listeners.set(type, handler); },
  };
  const form = { addEventListener(type, handler) { listeners.set("form:" + type, handler); } },
    button = { addEventListener(type, handler) { listeners.set("button:" + type, handler); } };
  const documentRef = {
    createElement() { return panel; },
    querySelectorAll() { return [rail]; },
  };
  class FormDataPort {
    constructor() { this.values = { natureza: "Drenagem", atividade: "Drenagem pluvial", percentual: "40", data: "2026-10-11", responsavel: "Carlos Mendes", detalhes: "Trecho concluído", evidencia: "foto-1.jpg" }; }
    get(key) { return this.values[key]; }
  }
  class MapScene {
    constructor() {
      this.dataset = {};
      this.view = "records";
      this.selectionHalo = { visible: true };
      this.canvas = { classList: { toggle() {} } };
      this.items = [{ name: "Rua-01", userData: { partId: "street-1", partLabel: "Rua 01", partKind: "streets", defaultMaterial: { id: "base" } }, material: { id: "base" } }];
    }
    physicalMapParts() { return this.items; }
    modelPartSource(item) { return item; }
    restorePartMaterial(item) { item.material = item.userData.defaultMaterial; }
    materialForColor(material, color, opacity) { return { material, color, opacity }; }
    setStreetPaverInstanceColor() { return false; }
    renderActiveSceneV5370() { this.renderCount = (this.renderCount || 0) + 1; }
    appendChild(child) { this.child = child; }
    getBoundingClientRect() { return { left: 10, top: 20 }; }
    querySelector(selector) { return selector === ".three-overlay" ? this.canvas : null; }
    querySelectorAll() { return []; }
    removeMapSelectionPanel() { this.panelRemoved = true; }
    removeMapAreaSelection() { this._mapAreaSelectionStart = null; }
    clearStageOverlay() { this.overlayCleared = true; }
    selectModelPart(item) { this.selectedPart = item; }
    ensureOperationalStreetGeometry() { this.streetGeometryEnsured = true; }
    isAdminStandaloneInteractiveV5370() { return false; }
  }
  installMapSelectionV1(MapScene, {
    activityCatalog: [
      { name: "Drenagem pluvial", nature: "Drenagem", initial: ["planned"], execution: ["active"] },
      { name: "Terraplanagem", nature: "Terraplanagem", initial: [], execution: [] },
    ],
    appStore: store,
    demoData: { activities: [{ id: "water", name: "Drenagem" }], collaborators: [["Carlos Mendes"], ["João Pereira"]] },
    document: documentRef,
    esc: (value) => String(value).replaceAll("<", "&lt;"),
    FormData: FormDataPort,
    ico: (name) => `<i data-icon="${name}"></i>`,
    notify: (...args) => notices.push(args),
    progressNatureOptions: ["Execução operacional", "Drenagem"],
    stageOverlayColors: { drenagem: 0x42be65 },
    stageOverlayKey: (value) => String(value).toLowerCase(),
    window: { lucide: icons },
  });
  return { MapScene, notices, state, rail, icons, listeners, panel, form, button };
};

test("map progress selection updates shared state, paint and filter rail", () => {
  const { MapScene, state, rail, notices } = createFixture();
  const map = new MapScene(), [part] = map.items;
  const selected = map.setProgressAreaSelectionV1([part], { append: false, announce: true });
  assert.deepEqual(selected, [{ partId: "street-1", label: "Rua 01", kind: "streets" }]);
  assert.equal(state.mapProgressSelection.length, 1);
  assert.equal(part.userData.progressSelectionMaterial.color, 0x78a9ff);
  assert.equal(map.dataset.progressSelectionCount, "1");
  assert.equal(rail.renders, 1);
  assert.equal(notices.at(-1)[0], "1 área(s) disponível(is) na lista de progresso.");

  assert.equal(map.toggleProgressAreaSelectionV1(part), true);
  assert.deepEqual(state.mapProgressSelection, []);
  assert.equal(part.material, part.userData.defaultMaterial);
});

test("progress form creates the same map-bound record and applies its visual state", () => {
  const { MapScene, state, notices, listeners, panel, icons } = createFixture();
  const map = new MapScene(), [part] = map.items;
  map.renderProgressSelectionPanel([part]);
  assert.match(panel.innerHTML, /REGISTRO DE PROGRESSO/);
  assert.match(panel.innerHTML, /Comprovante \/ foto/);
  listeners.get("form:submit")({ currentTarget: {}, preventDefault() {} });

  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].atividade, "Drenagem pluvial");
  assert.equal(state.records[0].progresso, 40);
  assert.equal(JSON.parse(state.records[0].mapArea)[0].partId, "street-1");
  assert.equal(map.dataset.progressNature, "Drenagem");
  assert.match(panel.innerHTML, /Progresso registrado/);
  assert.equal(notices.at(-1)[0], "Progresso de Drenagem registrado no mapa.");
  assert.ok(icons.renders > 0);
});

test("record-area selection maps mesh metadata and enables the original paint flow", () => {
  const { MapScene, notices } = createFixture();
  const map = new MapScene(), [part] = map.items;
  map._recordPaintCallback = (area) => { map.callbackArea = area; };
  assert.equal(map.selectRecordMapPart(part), true);
  assert.equal(map.overlayCleared, true);
  assert.equal(map.selectedPart, part);
  assert.equal(map.callbackArea.partId, "street-1");
  assert.equal(map.callbackArea.overlayKey, "pavimentacao");
  assert.equal(map.recordPaintMode, false);
  assert.equal(notices.at(-1)[0], "Rua 01 pintado e vinculado ao registro.");
});

test("all map-selection methods are composed from the extracted map module", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    moduleSource = await readFile(new URL("../../components/map/map-selection-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installMapSelectionV1\(MapScene,/);
  const methods = [
    "clearLotSelection", "pointFromClient", "beginMapAreaSelection", "updateMapAreaSelection",
    "removeMapAreaSelection", "collectModelPartsInRect", "finishMapAreaSelection", "setMapSelectionMode",
    "progressMapPartsV1", "progressAreaRecordV1", "progressAreaPartV1", "progressAreaPartsFromStoreV1",
    "paintProgressAreaSelectionV1", "setProgressAreaSelectionV1", "toggleProgressAreaSelectionV1",
    "clearProgressAreaSelectionV1", "renderMapStatusPanel", "clearMapStatusSelection",
    "clearCurrentMapSelectionV1", "renderProgressSelectionPanel", "paintProgressParts",
    "setRecordPaintMode", "selectRecordMapPart", "selectRecordMapParts",
  ];
  for (const method of methods) {
    assert.match(moduleSource, new RegExp(`^    ${method}\\(`, "m"));
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
  }
});
