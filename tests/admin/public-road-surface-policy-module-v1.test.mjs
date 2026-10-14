import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertPublicRoadSurfacePolicyDependenciesV1,
  installPublicRoadSurfacePolicyV1,
} from "../../components/map/public-road-surface-policy-v1.mjs";

const dependencies = () => ({
  runtimeRouteV1: (url) => url,
  logger: { warn() {} },
});

test("public road surface policy requires the route and warning ports", () => {
  const supplied = dependencies();
  assert.equal(assertPublicRoadSurfacePolicyDependenciesV1(supplied), supplied);
  assert.throws(
    () => assertPublicRoadSurfacePolicyDependenciesV1({ logger: supplied.logger }),
    /requires runtimeRouteV1\(\)/,
  );
  assert.throws(
    () => assertPublicRoadSurfacePolicyDependenciesV1({ runtimeRouteV1: supplied.runtimeRouteV1 }),
    /requires logger\.warn\(\)/,
  );
});

test("the policy installs all public road methods on the existing MapScene", () => {
  class MapScene {}
  installPublicRoadSurfacePolicyV1(MapScene, dependencies());
  for (const method of [
    "reassertPublicPresentationStyle",
    "disablePublicSyntheticRoads",
    "ensurePublicTextureUv",
    "disablePublicCobbleTexture",
    "getPublicCobbleMaterial",
    "loadPublicCobbleTexture",
    "setPublicPavingView",
    "reassertPublicRoadMaterial",
    "enforcePublicTechnicalVisibility",
  ])
    assert.equal(typeof MapScene.prototype[method], "function", `${method} is installed`);
});

test("public satellite policy hides native roads and generated overlays without losing state", () => {
  class MapScene {}
  installPublicRoadSurfacePolicyV1(MapScene, dependencies());
  const road = {
    visible: true,
    userData: { partKind: "streets", streetSegment: true },
  };
  const paver = { visible: true, userData: { streetPaver: true } };
  let rendered = false;
  const scene = Object.assign(Object.create(MapScene.prototype), {
    isPublicMapVisual: () => true,
    hasAttribute: () => false,
    dataset: {},
    _streetSourceCandidates: [road],
    modelParts: { streets: [road] },
    masterplanModel: { traverse: (visit) => visit(road) },
    sceneStage: { traverse: (visit) => visit(paver) },
    _streetPaverMeshes: [paver],
    renderer: { render: () => { rendered = true; } },
    scene: {},
    camera: {},
  });

  const hidden = scene.disablePublicSyntheticRoads();

  assert.equal(hidden, 2);
  assert.equal(road.visible, false);
  assert.equal(paver.visible, false);
  assert.equal(typeof road.raycast, "function");
  assert.equal(typeof paver.raycast, "function");
  assert.deepEqual(scene._streetPaverMeshes, []);
  assert.equal(scene.dataset.publicRoadPolicy, "satellite-only");
  assert.equal(scene.dataset.publicRoadOcclusionPolicy, "satellite-road-base-only");
  assert.equal(scene.dataset.publicRoadTextureRequired, "false");
  assert.equal(rendered, true);
});

test("components.js injects and installs the policy before registering map-scene", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const policy = await readFile(new URL("../../components/map/public-road-surface-policy-v1.mjs", import.meta.url), "utf8");
  assert.match(composition, /installPublicRoadSurfacePolicyV1\(MapScene,\s*\{\s*runtimeRouteV1,\s*logger:\s*window\.console/);
  assert.match(composition, /installPublicRoadSurfacePolicyV1\(MapScene,[\s\S]*?installMapSceneContextExtensionsV1\(/);
  assert.doesNotMatch(composition, /reassertPublicPresentationStyle\(\)\s*\{/);
  assert.match(policy, /logger\.warn\(/);
  assert.doesNotMatch(policy, /console\.warn\(/);
});
