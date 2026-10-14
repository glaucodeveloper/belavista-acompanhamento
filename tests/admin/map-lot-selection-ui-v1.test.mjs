import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertLotSelectionUiDependenciesV1,
  installMapLotSelectionUiV1,
} from "../../components/map/lot-selection-ui-v1.mjs";
import { installMapModelPickingV1 } from "../../components/map/model-picking-v1.mjs";

const dependencies = (overrides = {}) => ({
  appStore: { set() {} },
  document: { createElement() {} },
  FormData: class FormData {},
  window: { lucide: { createIcons() {} } },
  esc: (value) => String(value),
  ico: (name) => name,
  notify() {},
  ...overrides,
});

test("map lot selection validates and receives explicit UI and state ports", () => {
  const ports = dependencies();
  assert.equal(assertLotSelectionUiDependenciesV1(ports), ports);
  assert.throws(
    () => assertLotSelectionUiDependenciesV1({ ...ports, appStore: {} }),
    /appStore\.set\(\)/,
  );
  assert.throws(
    () => assertLotSelectionUiDependenciesV1({ ...ports, notify: null }),
    /notify\(\)/,
  );
});

test("lot-selection methods install on the existing MapScene prototype", () => {
  class MapScene {}
  installMapLotSelectionUiV1(MapScene, dependencies());
  for (const method of [
    "modelPartSource", "materialForColor", "restorePartMaterial",
    "toggleLotSelection", "removeMapSelectionPanel", "renderLotReservationPanel",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);
});

test("lot selection paints every matching part and restores original material on toggle-off", () => {
  class MapScene {}
  installMapModelPickingV1(MapScene, {
    appStore: { get: () => ({ view: "map" }), set() {} },
  });
  const updates = [];
  installMapLotSelectionUiV1(MapScene, dependencies({
    appStore: { set: (patch) => updates.push(patch) },
  }));

  const originalMaterial = {
    color: { setHex(value) { this.value = value; } },
    emissive: { setHex(value) { this.value = value; } },
    clone() {
      return {
        color: { setHex(value) { this.value = value; } },
        emissive: { setHex(value) { this.value = value; } },
      };
    },
  };
  const part = {
    name: "lot-187",
    material: originalMaterial,
    userData: { partId: "lot-187", partLabel: "Lote 187", partKind: "lots", defaultMaterial: originalMaterial },
  };
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    set(x, y, z) { Object.assign(this, { x, y, z }); }
    setScalar(value) { this.scalar = value; }
  }
  class Box3 {
    setFromObject() { return this; }
    getCenter() { return new Vector3(12, 8, 0); }
    getSize() { return new Vector3(24, 16, 0); }
  }
  const scene = Object.assign(Object.create(MapScene.prototype), {
    THREE: { Box3, Vector3 },
    modelParts: { lots: [part], streets: [], other: [] },
    selectedLotIds: new Set(),
    dataset: {},
    selectionHalo: {
      position: new Vector3(),
      scale: new Vector3(),
      material: { color: { setHex(value) { this.value = value; } } },
    },
    sceneStage: { position: { x: 0, y: 0 }, updateMatrixWorld() {} },
    renderer: { render() {} },
    scene: {},
    camera: {},
    isAdminStandaloneInteractiveV5370: () => false,
    renderLotReservationPanel() {},
    removeMapSelectionPanel() {},
  });

  assert.equal(scene.toggleLotSelection(part), true);
  assert.equal(scene.selectedLotIds.has("lot-187"), true);
  assert.notEqual(part.material, originalMaterial);
  assert.equal(scene.dataset.selectedLots, "lot-187");
  assert.deepEqual(updates.at(-1), { lastAction: "Selecionou 1 lote(s) para reserva" });

  assert.equal(scene.toggleLotSelection(part), true);
  assert.equal(scene.selectedLotIds.size, 0);
  assert.equal(part.material, originalMaterial);
  assert.equal(scene.dataset.selectedLots, "");
  assert.deepEqual(updates.at(-1), { lastAction: "Limpou seleção de lotes" });
});

test("components.js installs the injected lot-selection UI before dependent selection services", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /installMapLotSelectionUiV1\(MapScene,\s*\{\s*appStore,\s*document,\s*esc,\s*FormData,\s*ico,\s*notify,\s*window,\s*\}\);\s*installMapSelectionV1\(MapScene/);
  for (const method of ["modelPartSource", "materialForColor", "toggleLotSelection", "renderLotReservationPanel"])
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
  assert.match(await readFile(new URL("../../components/map/model-picking-v1.mjs", import.meta.url), "utf8"), /this\.toggleLotSelection\(/);
});
