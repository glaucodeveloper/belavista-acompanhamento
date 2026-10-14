import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapModelPickingV1 } from "../../components/map/model-picking-v1.mjs";

const installPicking = (MapScene, store = { get: () => ({ view: "map" }), set() {} }) =>
  installMapModelPickingV1(MapScene, { appStore: store });

test("model picking installs the complete original MapScene method set", () => {
  class MapScene {}
  installPicking(MapScene);
  for (const method of [
    "physicalMapParts",
    "streetPaverPartAt",
    "renderActiveSceneV5370",
    "adminStandaloneModelPartsV5370",
    "adminStandalonePhysicalMapPartAtV5370",
    "adminStandaloneCollectModelPartsInRectV5370",
    "pickModelAt",
    "isDashboardStatusContext",
    "toggleCategoryFromPart",
    "selectModelPart",
  ]) assert.equal(typeof MapScene.prototype[method], "function", method);
});

test("physical map parts preserve deduplication, fallback, and hidden street behavior", () => {
  class MapScene {}
  installPicking(MapScene);
  const lot = { name: "lot-1", userData: { partId: "lot-1", partKind: "lots" } };
  const duplicate = { name: "alias", userData: { partId: "lot-1", partKind: "lots" } };
  const hiddenStreet = { name: "street-1", visible: false, userData: { partKind: "streets" } };
  const hiddenLot = { name: "lot-hidden", visible: false, userData: { partKind: "lots" } };
  const scene = Object.assign(Object.create(MapScene.prototype), {
    modelParts: { lots: [lot, duplicate, hiddenLot], streets: [hiddenStreet], other: [] },
    _streetSourceCandidates: [],
    activityMapStandaloneParts: [{ name: "fallback" }],
  });
  assert.deepEqual(scene.physicalMapParts(), [lot, hiddenStreet]);

  const fallbackScene = Object.assign(Object.create(MapScene.prototype), {
    modelParts: { lots: [], streets: [], other: [] },
    _streetSourceCandidates: [],
    activityMapStandaloneParts: [lot],
  });
  assert.deepEqual(fallbackScene.physicalMapParts(), [lot]);
});

test("street paver picking returns an instance-specific selectable part", () => {
  class MapScene {}
  installPicking(MapScene);
  const material = { color: "original" };
  const mesh = {
    material,
    userData: {
      paverParts: [{ partId: "road-half-1", partKind: "streets", status: "planned" }],
    },
  };
  const scene = Object.assign(Object.create(MapScene.prototype), {});
  const part = scene.streetPaverPartAt(mesh, 0);
  assert.equal(part.name, "road-half-1");
  assert.equal(part._paverOwner, mesh);
  assert.equal(part._paverInstanceId, 0);
  assert.equal(part.material, material);
  assert.equal(part.userData.partKind, "streets");
  assert.equal(part.userData.defaultMaterial, material);
  assert.equal(scene.streetPaverPartAt(mesh, 4), mesh);
});

test("admin standalone picking never substitutes a nearby part when raycasting misses", () => {
  class MapScene {}
  installPicking(MapScene);
  let fallbackCalled = false;
  const scene = Object.assign(Object.create(MapScene.prototype), {
    modelReady: true,
    recordPaintMode: false,
    mapSelectionMode: null,
    isAdminStandaloneInteractiveV5370: () => true,
    adminStandalonePhysicalMapPartAtV5370: () => null,
    toggleLotSelection() { fallbackCalled = true; },
    toggleCategoryFromPart() { fallbackCalled = true; },
  });
  assert.equal(scene.pickModelAt({ x: 12, y: 18 }), false);
  assert.equal(fallbackCalled, false);
});

test("components.js installs model picking before dependent map selection and retains call sites", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8'))),
    moduleSource = await readFile(new URL("../../components/map/model-picking-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installMapModelPickingV1\(MapScene, \{ appStore \}\);\s*installMapLotSelectionUiV1\(MapScene,[\s\S]*?\);\s*installMapSelectionV1\(MapScene/);
  for (const method of ["physicalMapParts", "streetPaverPartAt", "pickModelAt", "toggleCategoryFromPart", "selectModelPart"])
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
  assert.match(moduleSource, /this\.physicalMapParts\(/);
  assert.match(moduleSource, /this\.toggleCategoryFromPart\(/);
});

test("surface policy and semantic selection retain original route, category and selection state", () => {
  const writes = [],
    store = { current: { view: "map" }, get() { return this.current; }, set(patch) { writes.push(patch); } };
  class MapScene {}
  installPicking(MapScene, store);
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    stageOverlayKey: "",
    setStreetPaverInstanceColor: () => true,
    renderActiveSceneV5370() { this.rendered = true; },
    setStageOverlay(category, active) { this.overlay = { category, active }; },
    clearStageOverlay() { this.cleared = true; },
    selectModelPart(node) { this.selected = node; },
    querySelector: () => null,
  });
  assert.equal(scene.isDashboardStatusContext(), true);
  store.current = { view: "actions" };
  assert.equal(scene.isDashboardStatusContext(), false);

  const street = { name: "rua-01", userData: { partKind: "streets", partId: "rua-01" } };
  assert.equal(scene.toggleCategoryFromPart({ userData: {}, parent: street }), true);
  assert.deepEqual(scene.overlay, { category: "pavimentacao", active: true });
  assert.equal(scene.selected, street);

  delete scene.selectModelPart;
  scene.selectModelPart(street);
  assert.equal(scene.dataset.selectedPart, "rua-01");
  assert.equal(scene.dataset.selectedKind, "streets");
  assert.equal(scene.rendered, true);
  assert.deepEqual(writes.at(-1), { lastAction: "Selecionou rua-01" });
});
