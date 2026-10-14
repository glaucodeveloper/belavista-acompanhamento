import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCompactMapV1 } from "../../components/map/compact-map-v1.mjs";

const fixture = () => {
  const mirrors = new Set(), events = new Map(), canvasEvents = new Map(), shared = {
    sceneManualZoom: 1,
    sceneTiltAdjust: 12,
    sceneManualRotation: 0,
    sceneManualPan: { x: 0, y: 0 },
    zooms: [],
    commits: [],
    setSceneZoom(value) { this.sceneManualZoom = value; this.zooms.push(value); },
    setSceneZoomAt(value) { this.sceneManualZoom = value; this.zooms.push(value); },
    setSceneTiltAdjust(value) { this.sceneTiltAdjust = value; },
    setSceneRotation(value) { this.sceneManualRotation = value; },
    setScenePan(x, y) { this.sceneManualPan = { x, y }; },
    queueSceneBoundsCommit(reason) { this.commits.push(reason); },
    constrainScenePan(reason) { this.constrained = reason; },
    querySelector() { return { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }) }; },
    screenDragPanDelta() { return { x: 3, y: -2 }; },
  };
  let intersection, resize;
  class IntersectionObserver {
    constructor(callback) { intersection = callback; }
    observe() {}
    disconnect() {}
  }
  class ResizeObserver {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  }
  const canvas = {
    addEventListener(type, callback) { canvasEvents.set(type, callback); },
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 100, height: 50 }),
    setPointerCapture() {},
    hasPointerCapture: () => false,
  };
  class MapScene {
    constructor(interactive = false) {
      this.dataset = {};
      this.attrs = { "data-stage": "Drenagem Pluvial", "data-map-index": "2" };
      if (interactive) this.attrs.interactive = "";
      this.style = {};
      this.classList = { contains: () => false };
    }
    hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
    getAttribute(name) { return this.attrs[name] ?? null; }
    addEventListener(type, callback) { events.set(type, callback); }
    querySelector(selector) { return selector === ".compact-map-canvas" ? canvas : null; }
    renderSharedMap() { this.renderCount = (this.renderCount || 0) + 1; }
  }
  installCompactMapV1(MapScene, {
    compactMapMirrors: mirrors,
    esc: (value) => String(value).replaceAll("&", "&amp;"),
    getSharedMapScene: () => shared,
    IntersectionObserver,
    requestAnimationFrame: (callback) => callback(),
    stageOverlayKey: () => "water",
    stageOverlayLabels: { water: "DRENAGEM" },
    syncCompactMapMirrors: () => {},
    ZOOM_DRAG_SENSITIVITY: 0.012,
    ResizeObserver,
  });
  return { MapScene, mirrors, shared, canvas, events, canvasEvents, triggerIntersection: () => intersection([{ isIntersecting: true }]), triggerResize: () => resize([{ contentRect: { width: 240, height: 120 } }]) };
};

test("compact map keeps one shared scene and lazily renders visible mirrors", () => {
  const { MapScene, mirrors, triggerIntersection, triggerResize } = fixture();
  const map = new MapScene();
  map.renderCompact();
  assert.equal(map.dataset.mapInit, "compact-live");
  assert.equal(map.dataset.mapStage, "Drenagem Pluvial");
  assert.equal(map.dataset.mapIndex, "2");
  assert.match(map.innerHTML, /compact-map-canvas/);
  assert.match(map.innerHTML, /DRENAGEM/);
  assert.equal(mirrors.has(map), true);
  assert.equal(map.renderCount || 0, 0);

  triggerIntersection();
  assert.equal(map.renderCount, 1);
  triggerResize();
  assert.equal(map.renderCount, 2);
});

test("compact-map controls preserve zoom gestures and commit shared scene bounds", () => {
  const { MapScene, shared, events, canvasEvents } = fixture();
  const map = new MapScene(true);
  map.renderCompact();
  events.get("click")({
    target: { closest: () => ({ dataset: { compactMap: "zoom-in" } }) },
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(shared.sceneManualZoom, 1.1);

  canvasEvents.get("wheel")({ deltaY: -1, ctrlKey: true, clientX: 10, clientY: 20, preventDefault() {} });
  assert.equal(shared.sceneManualZoom, 1.125);
  assert.equal(shared.commits.at(-1), "compact-ctrl-wheel");

  canvasEvents.get("pointerdown")({ button: 0, ctrlKey: true, shiftKey: false, pointerId: 4, clientX: 10, clientY: 10 });
  canvasEvents.get("pointermove")({ pointerId: 4, clientX: 10, clientY: 20 });
  assert.equal(shared.sceneManualZoom, 1.005);
  canvasEvents.get("pointerup")({ pointerId: 4 });
  assert.equal(shared.constrained, "compact-release");
});

test("compact map behavior is installed from its module, not duplicated in components.js", async () => {
  const source = await readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installCompactMapV1\(MapScene,/);
  assert.doesNotMatch(source, /^  (?:renderCompact|bindCompactMapControls)\(\) \{/m);
});
