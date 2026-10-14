import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installPublicLotStatusControllerV1 } from "../../components/map/public-lot-status-controller-v1.mjs";

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const setup = () => {
  class MapScene {
    constructor() {
      this.modelParts = { lots: [
        { name: "Lote_001", userData: { partId: "a", defaultMaterial: "base-a" }, material: "base-a" },
        { name: "Lote_002", userData: { partId: "duplicate", defaultMaterial: "aux" }, material: "aux" },
        { name: "Lote_002", userData: { partId: "b", defaultMaterial: "base-b" }, material: "base-b" },
        { name: "Rua_01", userData: { partId: "street" }, material: "street" },
      ] };
      this.dataset = {};
      this.scene = {};
      this.camera = {};
      this.events = [];
      this.renders = 0;
      this.dispatchEvent = (event) => this.events.push(event);
      this.renderer = { render: () => this.renders++ };
    }
    restorePartMaterial(lot) {
      lot.material = lot.userData.defaultMaterial;
    }
    materialForColor(base, color, opacity) {
      return { base, color, opacity };
    }
  }
  installPublicLotStatusControllerV1(MapScene, { CustomEventImpl: CustomEventStub });
  return new MapScene();
};

test("canonical lot status controller preserves status counts, material filters, events and clear behavior", () => {
  const scene = setup();
  const lots = scene.canonicalPublicLotParts();
  assert.deepEqual(lots.map((lot) => lot.name), ["Lote_001", "Lote_002"]);

  const entries = [
    { partId: "a", status: "reserved" },
    { partId: "b", status: "SOLD" },
  ];
  scene.setPublicLotStatuses(entries);
  assert.deepEqual(scene.publicLotStatusCounts, {
    available: 0, reserved: 1, negotiation: 0, sold: 1,
  });
  assert.equal(scene.dataset.publicLotStatuses, "connected");
  assert.equal(scene.dataset.publicLotStatusCount, "2");
  assert.equal(scene.events[0].type, "public-commercial-marker-statuses");
  assert.equal(scene.events[0].detail.entries, entries);

  scene.setPublicLotFilter("sold");
  assert.deepEqual(lots[1].material, { base: "base-b", color: 0xfa4d56, opacity: 0.98 });
  assert.equal(lots[0].material, "base-a");
  assert.equal(scene.dataset.publicLotMatches, "1");
  assert.equal(scene.renders, 1);

  scene.setPublicLotFilter("not-a-status");
  assert.equal(scene.publicLotFilter, "");
  assert.equal(scene.dataset.publicLotFilter, undefined);
  assert.equal(lots[1].material, "base-b");
  assert.equal(scene.renders, 2);
});

test("components.js installs the extracted controller before registering map-scene", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /installPublicLotStatusControllerV1\(MapScene\)/);
  assert.match(source, /import \{ installPublicLotStatusControllerV1 \} from "\.\/components\/map\/public-lot-status-controller-v1\.mjs/);
  assert.doesNotMatch(source, /canonicalPublicLotParts\(\)\s*\{/);
  assert.doesNotMatch(source, /setPublicLotStatuses\(entries = \[\]\)\s*\{/);
});
