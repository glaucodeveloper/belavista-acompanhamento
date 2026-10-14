import test from "node:test";
import assert from "node:assert/strict";

import { installMapSceneContextExtensionsV1 } from "../../components/map/context-overlays.mjs";

const createMapSceneStub = () => {
  class MapScene {}
  MapScene.prototype.syncThree = function (...args) {
    return ["sync", ...args];
  };
  MapScene.prototype.renderSharedMap = function (...args) {
    return ["render", ...args];
  };
  MapScene.prototype.setStageOverlay = function (stage, announce) {
    this.legacyOverlayCall = { stage, announce };
    return "legacy-result";
  };
  MapScene.prototype.clearStageOverlay = function (announce) {
    this.legacyClearCall = { announce };
    return "legacy-clear-result";
  };
  return MapScene;
};

test("extensions extraídas instalam wrappers e preservam o contrato legado da MapScene", () => {
  const MapScene = createMapSceneStub();
  let sharedScene = null;
  installMapSceneContextExtensionsV1({
    MapScene,
    appStore: { get: () => ({}) },
    demoData: { activities: [] },
    publishMapPreview() {},
    normalizeStageOverlayKeysV1: (keys) => keys,
    blendStageOverlayColorV1: () => 0,
    dashboardModeKeyV1: () => "tracking",
    dashboardFilterForModeV1: () => null,
    stageOverlayLabelV1: (keys) => keys.join(", "),
    syncCompactMapMirrors() {},
    notify() {},
    getSharedMapScene: () => sharedScene,
  });

  assert.equal(typeof MapScene.prototype.setMapContext, "function");
  assert.equal(typeof MapScene.prototype.applyStageOverlaySetV1, "function");
  assert.equal(typeof MapScene.prototype.setStageOverlays, "function");

  const scene = { dataset: {} };
  assert.equal(
    MapScene.prototype.setStageOverlay.call(scene, "drenagem", true),
    "legacy-result",
  );
  assert.deepEqual(scene._requestedStageOverlayKeysV1, ["drenagem"]);
  assert.deepEqual(scene.legacyOverlayCall, {
    stage: "drenagem",
    announce: true,
  });

  const mirroredCalls = [];
  sharedScene = {
    setStageOverlays(...args) {
      mirroredCalls.push(args);
    },
  };
  const compactScene = {
    dataset: {},
    hasAttribute: (name) => name === "compact",
    renderSharedMap() {},
  };
  MapScene.prototype.setStageOverlays.call(compactScene, ["rede-agua"]);
  assert.deepEqual(mirroredCalls, [
    [["rede-agua"], false, { fromCompact: true }],
  ]);
  assert.equal(compactScene.dataset.overlayKey, "rede-agua");
});
