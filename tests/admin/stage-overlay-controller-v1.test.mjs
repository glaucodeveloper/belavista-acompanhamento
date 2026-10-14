import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageOverlayControllerV1 } from "../../components/map/stage-overlay-controller-v1.mjs";

const setup = () => {
  const notices = [], updates = [], overlayButton = {
    dataset: { sceneOverlay: "water" },
    classList: { toggle(name, value) { this.active = value; }, remove() { this.active = false; } },
  };
  class Color {
    constructor(value) { this.value = value; }
    clone() { return new Color(this.value); }
    copy(other) { this.value = other.value; return this; }
    lerp(other, amount) { this.value += (other.value - this.value) * amount; return this; }
    setHex(value) { this.value = value; return this; }
  }
  const material = (color, emissive, opacity, depthWrite) => ({
    color: new Color(color),
    emissive: new Color(emissive),
    opacity,
    depthWrite,
    clone() { return material(this.color.value, this.emissive.value, this.opacity, this.depthWrite); },
  });
  const baseMaterial = material(1, 0, 1, true);
  const item = { material: { ...baseMaterial, color: baseMaterial.color.clone(), emissive: baseMaterial.emissive.clone() }, userData: { defaultMaterial: baseMaterial } };
  const span = { textContent: "" };
  class MapScene {
    constructor() {
      this.dataset = {};
      this.modelParts = { lots: [item], streets: [], other: [] };
      this.stageOverlayTargets = { water: [item] };
      this.modelReady = true;
      this.renderer = { render: () => { this.renderCount = (this.renderCount || 0) + 1; } };
      this.scene = {};
      this.camera = {};
      this.selectionHalo = { visible: true };
    }
    cloneStageMaterial(material) { return { ...material, color: material.color?.clone?.(), emissive: material.emissive?.clone?.() }; }
    stageOverlayMaterial() { throw new Error("The injected module should install this method."); }
    stageBaseMaterial(value) { return value.userData.defaultMaterial; }
    querySelectorAll() { return [overlayButton]; }
    querySelector(selector) { return selector === ".map-badge span" ? span : null; }
    updatePublicCommercialMarkers() { this.markersUpdated = true; }
  }
  installStageOverlayControllerV1(MapScene, {
    appStore: { set: (state) => updates.push(state) },
    notify: (...args) => notices.push(args),
    performanceNow: () => 0,
    requestAnimationFrame: (callback) => callback(500),
    setTimeout: () => 0,
    stageOverlayColors: { water: 0x22aaff },
    stageOverlayKey: (stage) => stage,
    stageOverlayLabels: { water: "DRENAGEM" },
    STAGE_FILTER_TRANSITION_MS: 500,
  });
  return { MapScene, item, overlayButton, span, notices, updates };
};

test("stage-overlay controller applies the matching overlay and announces app state", () => {
  const { MapScene, item, overlayButton, span, notices, updates } = setup();
  const map = new MapScene();
  map.setStageOverlay("water", true);

  assert.equal(map.stageOverlayKey, "water");
  assert.equal(map.dataset.highlightActive, "true");
  assert.equal(map.dataset.overlayTransition, "settled");
  assert.equal(map.dataset.overlayTransitionProgress, "100");
  assert.equal(map.dataset.overlayTargets, "1");
  assert.equal(item.material, map.modelParts.lots[0].userData.overlayMaterial);
  assert.equal(overlayButton.classList.active, true);
  assert.equal(span.textContent, "Highlight · DRENAGEM");
  assert.equal(notices.length, 1);
  assert.deepEqual(updates[0], { mapFilter: "water", lastAction: "Aplicou highlight de DRENAGEM" });
});

test("selecting an active overlay toggles it off and clears overlay metadata", () => {
  const { MapScene, item, overlayButton, notices, updates } = setup();
  const map = new MapScene();
  map.setStageOverlay("water", true);
  map.setStageOverlay("water", true);

  assert.equal(map.stageOverlayKey, null);
  assert.equal(map.dataset.highlightActive, "false");
  assert.equal(map.dataset.overlayLabel, "Nenhum highlight");
  assert.equal("overlayKey" in map.dataset, false);
  assert.equal("overlayTargets" in map.dataset, false);
  assert.equal("overlayMaterial" in item.userData, false);
  assert.equal(overlayButton.classList.active, false);
  assert.equal(map.selectionHalo.visible, false);
  assert.equal(map.markersUpdated, true);
  assert.equal(notices.length, 2);
  assert.equal(updates.at(-1).mapFilter, null);
});

test("stage-overlay behavior is installed as a map module and not kept in MapScene", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /installStageOverlayControllerV1\(MapScene,/);
  for (const method of [
    "buildStageOverlayTargets",
    "buildAdminStandaloneStageOverlayTargetsV5370",
    "applyAdminStandaloneStageOverlayV5370",
    "stageBaseMaterial",
    "stageOverlayMaterial",
    "cloneStageMaterial",
    "transitionStageOverlay",
    "setStageOverlay",
    "clearStageOverlay",
  ])
    assert.doesNotMatch(source, new RegExp(`^  ${method}\\(`, "m"));
});

test("stage-overlay module builds semantic target zones for the shared scene", () => {
  const { MapScene } = setup();
  const map = new MapScene();
  map.stageOverlayTargets = null;
  class Vector3 { constructor() { this.x = 0; this.y = 0; } }
  map.THREE = { Vector3 };
  map.modelGroup = {};
  map.modelParts = {
    lots: Array.from({ length: 8 }, (_, index) => ({
      geometry: {
        getAttribute: () => ({}),
        boundingBox: { getCenter: (center) => { center.x = index; center.y = index; return center; } },
      },
      localToWorld: (center) => center,
    })),
    streets: [],
  };
  map.modelLandscapeNodes = [{ name: "landscape" }];
  map.modelLeisureNodes = [];
  map.buildStageOverlayTargets();
  assert.equal(map.dataset.overlayManifest, "ready-lightweight-v5365");
  assert.equal(map.dataset.overlayTargetTotal, "8");
  assert.equal(map.stageOverlayTargets.urbanizacao.includes(map.modelLandscapeNodes[0]), true);
  assert.deepEqual(Object.keys(map.stageOverlayTargets), [
    "terraplanagem", "drenagem", "rede-agua", "rede-eletrica", "pavimentacao", "urbanizacao",
  ]);
});

test("standalone map overlay rebuilds its targets and preserves common-area visibility", () => {
  const { MapScene } = setup();
  const map = new MapScene();
  map.stageOverlayTargets = null;
  class Vector3 { constructor() { this.x = 0; this.y = 0; } }
  class Box3 {
    setFromObject(node) { this.node = node; return this; }
    isEmpty() { return false; }
    getCenter(center) { center.x = this.node.x; center.y = this.node.y; return center; }
  }
  map.THREE = { Vector3, Box3 };
  map._adminStandaloneStageV5370 = { updateMatrixWorld() {} };
  map.activityMapStandaloneParts = Array.from({ length: 12 }, (_, index) => ({
    x: index,
    y: index,
    visible: true,
    material: { ...map.modelParts.lots[0].material },
    userData: {
      partKind: index === 0 ? "other" : "lot",
      commonAreaFilterOnly: index === 1,
      defaultMaterial: map.modelParts.lots[0].userData.defaultMaterial,
    },
  }));
  let renderCount = 0;
  map._adminStandaloneRendererV5370 = { render() { renderCount++; } };
  map._adminStandaloneSceneV5370 = {};
  map._adminStandaloneCameraV5370 = {};

  map.setStageOverlay("urbanizacao");
  assert.equal(map.dataset.overlayManifest, "ready-standalone-v5370");
  assert.equal(map.dataset.overlayTargetTotal, "12");
  assert.equal(map.activityMapStandaloneParts[1].visible, true);
  assert.ok(map.activityMapStandaloneParts[0].userData.overlayMaterial);
  assert.equal(map.dataset.overlayTransition, "settled");
  assert.equal(renderCount, 1);

  map.clearStageOverlay();
  assert.equal(map.activityMapStandaloneParts[1].visible, false);
  assert.equal(map.dataset.overlayTransition, "settled");
  assert.equal(renderCount, 2);
});
