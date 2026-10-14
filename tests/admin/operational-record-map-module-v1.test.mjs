import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installOperationalRecordMapV1 } from "../../components/map/operational-record-map-v1.mjs";

const fixture = () => {
  const pointerHandlers = new Map(), colors = [], base = { key: "base" };
  class MapScene {
    constructor() {
      this.dataset = {};
      this.parts = [
        { name: "Rua-01", userData: { partId: "street-1", streetSourceOrdinal: 1, defaultMaterial: base }, material: base },
        { name: "Lote-02", userData: { partId: "lot-2", defaultMaterial: base }, material: base },
      ];
      this._streetPaverMeshes = [{
        userData: { paverParts: [{ partId: "street-1" }, { partId: "street-2" }], paverDefaultColor: 0xffffff },
        setColorAt(index, color) { colors[index] = color.value; },
        instanceColor: {},
      }];
      this.THREE = { Color: class Color { constructor(value) { this.value = value; } } };
      this.canvas = { classList: { toggle() {} }, addEventListener(type, handler) { pointerHandlers.set(type, handler); }, setPointerCapture() {} };
    }
    isAdminStandaloneInteractiveV5370() { return false; }
    physicalMapParts() { return this.parts; }
    materialForColor(material, color, opacity) { return { material, color, opacity }; }
    restorePartMaterial(item) { item.material = item.userData.defaultMaterial; }
    renderActiveSceneV5370() { this.renderCount = (this.renderCount || 0) + 1; }
    querySelector() { return this.canvas; }
    pointFromClient() { return { x: 12, y: 34 }; }
    physicalMapPartAt() { return this.parts[0]; }
  }
  installOperationalRecordMapV1(MapScene);
  return { MapScene, pointerHandlers, colors, base };
};

test("record statuses paint map parts and restore the base material when cleared", () => {
  const { MapScene, base } = fixture();
  const map = new MapScene(), [street, lot] = map.parts;
  map.syncOperationalRecordMapV5370([
    { status: "Concluído", mapArea: JSON.stringify([{ partId: "street-1" }]) },
    { status: "Em andamento", mapArea: [{ partId: "lot-2" }] },
  ]);

  assert.equal(map.dataset.recordMapStatus, "synced");
  assert.equal(map.dataset.recordMapStatusCount, "2");
  assert.equal(street.userData.recordStatusMaterial.color, 0x42be65);
  assert.equal(lot.userData.recordStatusMaterial.color, 0x0f62fe);
  assert.equal(map.renderCount, 1);

  map.syncOperationalRecordMapV5370([]);
  assert.equal(street.material, base);
  assert.equal(lot.material, base);
  assert.equal("recordStatusMaterial" in street.userData, false);
});

test("street-paver paint, status and activity-location modes remain delegated", () => {
  const { MapScene, pointerHandlers, colors } = fixture();
  const map = new MapScene();
  map.applyStreetPaverInstanceColors(["street-1"], 0x123456);
  assert.deepEqual(colors, [0x123456, 0xffffff]);

  map.applyStreetPaverInstanceStatusMap(new Map([["street-2", { status: { hex: 0xabcdef }, assignment: { status: "active" } }]]));
  assert.equal(colors[1], 0xabcdef);
  assert.equal(map._streetPaverMeshes[0].userData.paverParts[1].activityMapStatus, "active");
  assert.equal(map.setStreetPaverInstanceColor({ _paverOwner: map._streetPaverMeshes[0], _paverInstanceId: 0 }, 0xff00ff), true);
  assert.equal(colors[0], 0xff00ff);

  const painted = [];
  map.physicalMapPartAt = () => map.parts[0];
  map.setActivityLocationPaintMode(true, (entry) => painted.push(entry));
  const event = { clientX: 10, clientY: 20, pointerId: 3, preventDefault() {}, stopImmediatePropagation() {} };
  pointerHandlers.get("pointerdown")(event);
  pointerHandlers.get("pointermove")(event);
  pointerHandlers.get("pointerup")(event);
  assert.equal(painted.length, 1);
  assert.equal(painted[0].id, "street-1");
  map.setActivityLocationPaintMode(false);
  assert.equal([...pointerHandlers.keys()].filter((name) => name === "pointerdown").length, 1);

  map.previewActivityLocationParts(["street-source-1"], 0x654321);
  assert.equal(map.parts[0].material.color, 0x654321);
  map.previewActivityLocationParts([], 0x654321);
  assert.equal(map.parts[0].material, map.parts[0].userData.defaultMaterial);
});

test("operational map-record methods are installed outside components.js", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    moduleSource = await readFile(new URL("../../components/map/operational-record-map-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installOperationalRecordMapV1\(MapScene\)/);
  for (const method of [
    "syncOperationalRecordMapV5370", "applyStreetPaverInstanceColors", "applyStreetPaverInstanceStatusMap",
    "setStreetPaverInstanceColor", "physicalMapPartAt", "setActivityLocationPaintMode", "previewActivityLocationParts",
  ]) {
    assert.match(moduleSource, new RegExp(`^    ${method}\\(`, "m"));
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
  }
});
