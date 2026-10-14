import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertMapPdfInterfaceDependenciesV1,
  installMapPdfInterfaceV1,
} from "../../components/map/map-pdf-interface-v1.mjs";

const setup = () => {
  const events = new Map(), shellClasses = new Set(), bodyClasses = new Set();
  const actions = { legends: 0, notifications: [], prints: 0, renders: 0, syncs: 0, removed: false };
  const makeClassList = (set) => ({ add: (value) => set.add(value), remove: (value) => set.delete(value), contains: (value) => set.has(value) });
  const controls = new Map();
  const interfaceNode = {
    dataset: {},
    setAttribute() {},
    querySelector(selector) {
      if (selector.endsWith(" small")) return { remove() {} };
      if (selector.includes("first-child")) return { insertAdjacentHTML: () => { actions.legends++; } };
      const control = {
        addEventListener: (type, handler) => controls.set(selector, handler),
        click: (...args) => controls.get(selector)?.(...args),
      };
      return control;
    },
    remove() { actions.removed = true; },
  };
  const shell = { classList: makeClassList(shellClasses) };
  const document = {
    body: { classList: makeClassList(bodyClasses), append(node) { this.node = node; } },
    querySelector: (selector) => selector === ".app-shell" ? shell : null,
    createElement: () => interfaceNode,
  };
  const window = {
    lucide: { createIcons() {} },
    addEventListener: (type, handler) => events.set(type, handler),
    removeEventListener: (type) => events.delete(type),
    print: () => { actions.prints++; },
  };
  const dependencies = {
    appStore: { get: () => ({ view: "map" }) },
    ensureMapPdfLegendStyles: () => { actions.legends++; },
    renderMapPdfLegends: () => "<legend />",
    stageOverlayLabels: {},
    stageOverlayColors: {},
    esc: (value) => String(value),
    ico: (name) => `<i>${name}</i>`,
    notify: (message, tone) => actions.notifications.push([message, tone]),
    browser: { document, window, requestAnimationFrame: (callback) => callback(0) },
  };
  return { dependencies, events, shellClasses, bodyClasses, controls, actions, document, interfaceNode };
};

test("map PDF interface opens, prints, and restores the live map without replacing it", () => {
  class MapScene {}
  const env = setup();
  installMapPdfInterfaceV1(MapScene, env.dependencies);
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    sceneManualZoom: 1.5,
    sceneManualRotation: 180,
    _sceneVisual: { tilt: 22 },
    querySelector: () => ({ getBoundingClientRect: () => ({ width: 900, height: 600 }) }),
    setAttribute() {},
    removeAttribute() {},
    syncThree: () => { env.actions.syncs++; },
    renderer: { render: () => { env.actions.renders++; } },
  });

  scene.openMapCanvasPrintV1();
  assert.equal(scene.dataset.mapPrintState, "ready");
  assert.equal(scene.dataset.mapPrintViewport, "900x600");
  assert.equal(env.document.body.node, env.interfaceNode);
  assert.equal(env.shellClasses.has("map-pdf-interface-mode"), true);
  assert.equal(env.bodyClasses.has("map-pdf-interface-open"), true);
  assert.equal(env.actions.legends, 2);
  assert.equal(env.events.has("keydown"), true);
  assert.equal(env.events.has("afterprint"), true);

  env.controls.get("[data-map-pdf-print]")();
  assert.equal(scene.dataset.mapPrintState, "printing");
  assert.equal(env.actions.prints, 1);
  env.controls.get("[data-map-pdf-close]")();
  assert.equal(scene.dataset.mapPrintState, "idle");
  assert.equal(env.actions.removed, true);
  assert.equal(env.shellClasses.has("map-pdf-interface-mode"), false);
  assert.equal(env.bodyClasses.has("map-pdf-interface-open"), false);
  assert.equal(env.events.size, 0);
  assert.equal(scene._mapPdfInterfaceCleanupV1, null);
  assert.equal(env.actions.syncs, 2);
});

test("map PDF interface validates browser, rendering, state and notification ports", () => {
  class MapScene {}
  const env = setup();
  assert.equal(assertMapPdfInterfaceDependenciesV1(MapScene, env.dependencies), env.dependencies);
  assert.throws(() => installMapPdfInterfaceV1(MapScene, { ...env.dependencies, appStore: {} }), /appStore\.get/);
  assert.throws(() => installMapPdfInterfaceV1(MapScene, { ...env.dependencies, notify: null }), /notify\(\)/);
});

test("components composes the map PDF interface from its existing print and legend services", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /map-pdf-interface-v1\.mjs\?v=map-pdf-interface-v1/);
  assert.match(source, /installMapPdfInterfaceV1\(MapScene, \{[\s\S]*?ensureMapPdfLegendStyles,[\s\S]*?renderMapPdfLegends,[\s\S]*?stageOverlayLabels,[\s\S]*?stageOverlayColors,[\s\S]*?requestAnimationFrame:/);
  assert.doesNotMatch(source, /^\s*openMapCanvasPrintV1\(\) \{/m);
});
