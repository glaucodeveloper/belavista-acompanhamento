import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStaticSatelliteGesturesV1 } from "../../components/map/static-satellite-gestures-v1.mjs";

const createScene = (frame = { left: 0.25, top: 0.2, width: 0.5, height: 0.5, rotation: 0 }) => {
  class MapScene {}
  installStaticSatelliteGesturesV1(MapScene, {
    ADMIN_MASTERPLAN_SATELLITE_FRAME_V1: frame,
  });
  const listeners = new Map(),
    classes = new Set(),
    style = new Map(),
    marker = { setAttribute(name, value) { this[name] = value; } };
  const scene = Object.assign(new MapScene(), {
    _staticSatelliteGesturesBoundV1: false,
    dataset: {},
    style: { setProperty: (name, value) => style.set(name, value) },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      contains: (name) => classes.has(name),
    },
    addEventListener(type, handler, options) {
      listeners.set(type, { handler, options });
    },
    hasAttribute: (name) => name === "data-public-static-only",
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400 }),
    querySelectorAll: () => [marker],
    contains: () => true,
    setPointerCapture: (id) => { scene.capturedPointer = id; },
    hasPointerCapture: (id) => scene.capturedPointer === id,
    releasePointerCapture: (id) => { if (scene.capturedPointer === id) scene.capturedPointer = null; },
  });
  return { scene, listeners, classes, style, marker };
};

test("static satellite map preserves centered initial fit, wheel zoom and marker accessibility", () => {
  const { scene, listeners, style, marker } = createScene();
  scene.bindStaticSatelliteMapGesturesV1();

  assert.equal(scene.dataset.staticMapGestures, "drag-pan + wheel + shift-drag-zoom");
  assert.equal(scene.fitStaticSatelliteMasterplanV1(), true);
  assert.equal(scene.dataset.staticMapInitialFit, "masterplan-centered-with-margin");
  assert.equal(scene.dataset.staticMapFitMargin, "12%");
  assert.equal(marker.tabIndex, -1);
  assert.equal(marker["aria-hidden"], "true");
  assert.equal(scene.fitStaticSatelliteMasterplanV1(), false);
  const fittedZoom = Number(scene.dataset.staticMapZoom.replace("%", ""));

  let prevented = 0, stopped = 0;
  listeners.get("wheel").handler({
    defaultPrevented: false,
    clientX: 420,
    clientY: 160,
    deltaY: -100,
    ctrlKey: true,
    target: { closest: () => null },
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
  });

  assert.ok(Number(scene.dataset.staticMapZoom.replace("%", "")) > fittedZoom);
  assert.equal(scene.dataset.mapGesture, "ctrl-wheel-zoom");
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(typeof style.get("--static-map-pan-x"), "string");
  assert.deepEqual(listeners.get("wheel").options, { capture: true, passive: false });
});

test("static satellite map keeps pointer pan, modified-drag zoom and gesture cleanup", () => {
  const { scene, listeners, classes } = createScene();
  scene.bindStaticSatelliteMapGesturesV1();
  scene.fitStaticSatelliteMasterplanV1();

  const dispatch = (type, values) => listeners.get(type).handler({
    button: 0,
    pointerId: 9,
    target: { closest: () => null },
    preventDefault() {},
    ...values,
  });
  const priorPan = scene.dataset.staticMapPan;
  dispatch("pointerdown", { clientX: 150, clientY: 100, shiftKey: false, ctrlKey: false });
  assert.equal(scene.dataset.mapGesture, "pan");
  assert.ok(classes.has("is-static-map-panning"));
  dispatch("pointermove", { clientX: 180, clientY: 120 });
  assert.notEqual(scene.dataset.staticMapPan, priorPan);
  dispatch("pointerup", { clientX: 180, clientY: 120 });
  assert.equal(scene.dataset.mapGesture, undefined);
  assert.equal(classes.has("is-static-map-panning"), false);
  assert.equal(scene.capturedPointer, null);

  const priorZoom = Number(scene.dataset.staticMapZoom.replace("%", ""));
  dispatch("pointerdown", { clientX: 150, clientY: 150, shiftKey: true, ctrlKey: false });
  assert.equal(scene.dataset.mapGesture, "shift-drag-zoom");
  dispatch("pointermove", { clientX: 150, clientY: 130 });
  assert.ok(Number(scene.dataset.staticMapZoom.replace("%", "")) > priorZoom);
  dispatch("pointercancel", { clientX: 150, clientY: 130 });
  assert.equal(scene.dataset.mapGesture, undefined);
});

test("static satellite gesture module is installed by the application composition root", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /static-satellite-gestures-v1\.mjs\?v=static-satellite-gestures-v1/);
  assert.match(source, /installStaticSatelliteGesturesV1\(MapScene, \{\s*ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,\s*\}\)/);
});
