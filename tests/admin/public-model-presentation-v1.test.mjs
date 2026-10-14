import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertPublicModelPresentationDependenciesV1,
  installPublicModelPresentationV1,
} from "../../components/map/public-model-presentation-v1.mjs";

test("public model presentation installs on the shared MapScene and validates its host", () => {
  class MapScene {}
  assert.equal(assertPublicModelPresentationDependenciesV1(MapScene), MapScene);
  assert.throws(() => assertPublicModelPresentationDependenciesV1({}), /MapScene constructor/);
  installPublicModelPresentationV1(MapScene);
  assert.equal(typeof MapScene.prototype.applyPublicPresentationStyle, "function");
});

test("aerial-reference presentation keeps canonical lots selectable and uses the existing aerial for roads", () => {
  class MeshBasicMaterial { constructor(options) { this.options = options; } }
  class LineBasicMaterial { constructor(options) { this.options = options; } }
  class EdgesGeometry { constructor(geometry, threshold) { this.geometry = geometry; this.threshold = threshold; } }
  class LineSegments { constructor(geometry, material) { this.geometry = geometry; this.material = material; this.position = {}; } }
  class MapScene {}
  installPublicModelPresentationV1(MapScene);

  const lot = {
    name: "Lote_001",
    geometry: { id: "lot-geometry" },
    userData: {},
    add(node) { this.outline = node; },
  };
  const street = { name: "Rua_01", visible: false, userData: {} };
  const calls = [];
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    modelParts: { lots: [lot], streets: [street], other: [] },
    modelLandscapeNodes: [],
    modelLeisureNodes: [],
    lotStatusBadges: [],
    masterplanModel: { traverse() {} },
    isPublicMapVisual: () => true,
    isAdminReferenceAerialV1: () => true,
    hasAttribute: () => true,
    canonicalPublicLotParts: () => [lot],
    disablePublicSyntheticRoads: () => calls.push("synthetic-roads-disabled"),
    disablePublicCobbleTexture: () => calls.push("cobble-disabled"),
    setPublicPavingView: (...args) => calls.push(["paving-view", ...args]),
  });
  const THREE = { MeshBasicMaterial, LineBasicMaterial, EdgesGeometry, LineSegments, DoubleSide: 2 };

  scene.applyPublicPresentationStyle(THREE);

  assert.equal(lot.userData.selectableMapArea, true);
  assert.equal(lot.userData.mapSelectionKind, "lot");
  assert.equal(lot.outline.visible, false);
  assert.equal(street.visible, true);
  assert.equal(street.userData.mapSelectionKind, "street");
  assert.equal(street.userData.publicRoadBaseHidden, undefined);
  assert.equal(scene.dataset.publicLotPresentation, "reference-aerial-selection-surfaces · native-outlines-hidden:1");
  assert.deepEqual(calls, ["synthetic-roads-disabled", "cobble-disabled", ["paving-view", "satellite", 0]]);

  const material = lot.material;
  scene.applyPublicPresentationStyle(THREE);
  assert.equal(lot.material, material, "style setup remains idempotent");
});

test("components.js keeps the original call path and delegates presentation to its module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /installPublicModelPresentationV1\(MapScene\)/);
  assert.match(source, /this\.applyPublicPresentationStyle\(THREE\)/);
  assert.doesNotMatch(source, /^  applyPublicPresentationStyle\(THREE\) \{/m);
});
