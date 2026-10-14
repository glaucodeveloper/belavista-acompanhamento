import test from "node:test";
import assert from "node:assert/strict";
import { installAdminMasterplanOverlayV1 } from "../../components/map/admin-masterplan-overlay-v1.mjs";

const makeStyle = () => ({
  setProperty(name, value) { this[name] = value; },
});

const makeLayer = () => {
  const image = { style: {} };
  const transform = { querySelector: () => image };
  const fit = { style: makeStyle() };
  return {
    className: "",
    dataset: {},
    attributes: {},
    image,
    transform,
    fit,
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) {
      if (selector === ".admin-masterplan-fit") return fit;
      if (selector === "[data-admin-masterplan-transform]") return transform;
      return null;
    },
  };
};

test("MapScene masterplan overlay preserves calibrated original artwork and resize lifecycle", () => {
  const defaultFrame = { left: 0.1, top: 0.2, width: 0.7, height: 0.6, rotation: 0 },
    savedFrame = { left: 0.25, rotation: 4 },
    storage = { getItem: (key) => key === "belavista.map.masterplan-frame.v1" ? JSON.stringify(savedFrame) : null },
    layer = makeLayer(),
    observed = [],
    createdObservers = [],
    imageRects = [],
    devToolsCalls = [],
    document = { createElement: (tag) => { assert.equal(tag, "div"); return layer; } },
    ResizeObserver = class {
      constructor(callback) { this.callback = callback; createdObservers.push(this); }
      observe(target) { observed.push(target); }
    };

  class MapScene {
    constructor() {
      this.dataset = {};
      this.overlay = null;
      this.appended = [];
      this.dimensions = { width: 640, height: 360 };
    }
    isAdminStandalone3DV5370() { return true; }
    isAdminPublicMapV1() { return false; }
    querySelector(selector) { return selector === "[data-admin-masterplan-overlay]" ? this.overlay : null; }
    append(node) { this.overlay = node; this.appended.push(node); }
    getBoundingClientRect() { return this.dimensions; }
    installAdminMasterplanDevToolsV1(options) { devToolsCalls.push(options); }
    fitStaticSatelliteMasterplanV1() { this.fitCalls = (this.fitCalls || 0) + 1; }
  }

  installAdminMasterplanOverlayV1(MapScene, {
    artwork: { url: "/assets/masterplan-original.webp" },
    defaultFrame,
    masterplanPdfImageRect: (width, height) => {
      imageRects.push([width, height]);
      return { left: -2, top: 3, width, height };
    },
    document,
    localStorage: storage,
    ResizeObserver,
  });

  const scene = new MapScene();
  assert.equal(scene.installAdminMasterplanOverlayV1(), true);
  assert.equal(scene.appended.length, 1);
  assert.match(layer.innerHTML, /\/assets\/masterplan-original\.webp/);
  assert.match(layer.innerHTML, /data-masterplan-original-pdf/);
  assert.deepEqual(JSON.parse(scene.dataset.adminMasterplanFrame), { ...defaultFrame, ...savedFrame });
  assert.equal(layer.fit.style.width, "640px");
  assert.equal(layer.fit.style.height, "640px");
  assert.equal(layer.fit.style.left, "0px");
  assert.equal(layer.fit.style.top, "-140px");
  assert.equal(layer.fit.style["--masterplan-left"], "25%");
  assert.equal(layer.fit.style["--masterplan-rotation"], "4deg");
  assert.deepEqual(layer.image.style, { inset: "auto", objectFit: "fill", left: "-2px", top: "3px", width: "448px", height: "384px" });
  assert.deepEqual(imageRects[0], [448, 384]);
  assert.equal(scene.dataset.adminMasterplanOverlay, "true");
  assert.match(scene.dataset.adminMasterplanAsset, /original PDF pixels/);
  assert.equal(observed[0], scene);
  assert.equal(createdObservers.length, 1);
  assert.equal(devToolsCalls[0].frameStorageKey, "belavista.map.masterplan-frame.v1");
  assert.equal(scene.fitCalls, 1);

  scene.dimensions = { width: 300, height: 500 };
  createdObservers[0].callback();
  assert.equal(layer.fit.style.width, "500px");
  assert.equal(layer.fit.style.left, "-100px");
  assert.equal(scene.installAdminMasterplanOverlayV1(), true);
  assert.equal(scene.appended.length, 1);
});

test("MapScene skips the masterplan overlay outside its two supported map modes", () => {
  class MapScene {
    isAdminStandalone3DV5370() { return false; }
    isAdminPublicMapV1() { return false; }
  }
  installAdminMasterplanOverlayV1(MapScene, {
    artwork: { url: "/masterplan.webp" },
    defaultFrame: { left: 0, top: 0, width: 1, height: 1, rotation: 0 },
    masterplanPdfImageRect: () => ({}),
    document: { createElement() { throw new Error("must not construct an overlay"); } },
    localStorage: { getItem: () => null },
    ResizeObserver: class {},
  });
  assert.equal(new MapScene().installAdminMasterplanOverlayV1(), false);
});

test("MapScene masterplan overlay installer validates required composition ports", () => {
  assert.throws(() => installAdminMasterplanOverlayV1(), /MapScene\.prototype/);
  assert.throws(() => installAdminMasterplanOverlayV1(class {}, {}), /original artwork URL/);
});
