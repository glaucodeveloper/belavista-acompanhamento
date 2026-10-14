import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapLoadingScreenV1 } from "../../components/map/map-loading-screen-v1.mjs";

const install = (browser = {}) => {
  class MapScene {}
  installMapLoadingScreenV1(MapScene, {
    GENERATED_AERIAL_ASSET: "/assets/public/site.png",
    browser: {
      Image: class {},
      document: { baseURI: "http://localhost:8080/" },
      window: { setTimeout: () => 12 },
      ...browser,
    },
  });
  return MapScene;
};

test("map loading module installs its lifecycle methods and rejects incomplete ports", () => {
  const MapScene = install();
  for (const method of [
    "mountMap3DLoadingScreenV1",
    "preparePublicStaticBaseV1",
    "waitForPublicStaticBaseV1",
    "updateMap3DLoadingScreenV1",
    "persist3dBootPhaseV5367",
  ]) assert.equal(typeof MapScene.prototype[method], "function", `missing ${method}`);
  assert.throws(() => installMapLoadingScreenV1(class {}, {}), /requires GENERATED_AERIAL_ASSET/);
  assert.throws(() => installMapLoadingScreenV1(null, {}), /existing MapScene constructor/);
});

test("loading screen mounts once and advances its initial state", () => {
  const MapScene = install(), calls = [], map = new MapScene();
  let inserted = false;
  map.hasAttribute = (name) => name === "compact" ? false : false;
  map.querySelector = () => inserted ? {} : null;
  map.insertAdjacentHTML = (...args) => { calls.push(["insert", ...args]); inserted = true; };
  map.updateMap3DLoadingScreenV1 = (...args) => calls.push(["update", ...args]);
  map.mountMap3DLoadingScreenV1();
  map.mountMap3DLoadingScreenV1();
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1], "afterbegin");
  assert.match(calls[0][2], /data-map-3d-loading-backdrop="pdf-page"/);
  assert.deepEqual(calls[1], ["update", "waiting", { progress: 4 }]);
});

test("persistência da fase 3D atualiza estado compartilhado, tela e armazenamento", () => {
  const stateHost = {}, writes = [], updates = [];
  const MapScene = install({
    globalRef: stateHost,
    performance: { now: () => 1234 },
    localStorage: { setItem: (...entry) => writes.push(entry) },
    Date: class extends Date {
      constructor() { super("2026-10-12T12:00:00.000Z"); }
    },
  });
  const map = Object.assign(new MapScene(), {
    dataset: {},
    updateMap3DLoadingScreenV1: (...args) => updates.push(args),
  });

  const state = map.persist3dBootPhaseV5367("gpu-ready", { meshCount: 298 });

  assert.deepEqual(state, {
    version: "5.3.67",
    startedAt: 1234,
    phase: "gpu-ready",
    meshCount: 298,
  });
  assert.equal(stateHost.__BELAVISTA_ADMIN_MODEL_STATE__, state);
  assert.equal(map.dataset.modelBootPhase, "gpu-ready");
  assert.equal(map.dataset.modelBootVersion, "5.3.67");
  assert.deepEqual(updates, [["gpu-ready", { meshCount: 298 }]]);
  assert.equal(writes[0][0], "belavista.3d.boot.last.v5367");
  assert.deepEqual(JSON.parse(writes[0][1]), {
    version: "5.3.67",
    phase: "gpu-ready",
    wallClock: "2026-10-12T12:00:00.000Z",
    meshCount: 298,
  });
});

test("public static base marks the capture ready and hides the optional 3D loading card", () => {
  const MapScene = install(), updates = new MapScene();
  Object.assign(updates, {
    dataset: {},
    hasAttribute: () => false,
    isPublicCustomerExperience: () => true,
    isAdminPublicMapV1: () => false,
    getAttribute: () => "/assets/public/custom.png",
    setAttribute(name, value) { this.dataset[name] = value ?? ""; },
    removeAttribute(name) { delete this.dataset[name]; },
    querySelector(selector) {
      return selector === "[data-map-3d-loading]"
        ? { setAttribute: (name, value) => calls.push(["loading-hidden", name, value]) }
        : null;
    },
    closest: () => ({ querySelector: () => staticBackground }),
  });
  const calls = [], staticBackground = {
    dataset: {},
    removeAttribute(name) { calls.push(["remove-background-attribute", name]); },
  };
  assert.equal(updates.preparePublicStaticBaseV1(), true);
  assert.equal(updates.dataset.renderMode, "3d-static-satellite");
  assert.equal(updates.dataset.publicMapProvider, "local-capture");
  assert.equal(updates.dataset.publicStaticBaseReady, "true");
  assert.equal(staticBackground.hidden, false);
  assert.equal(staticBackground.dataset.publicFallback, "local-capture");
  assert.ok(calls.some((call) => call[0] === "loading-hidden" && call[1] === "hidden" && call[2] === ""));
});

test("static-base image loading resolves via image completion and performs the state transition", async () => {
  const transitions = [], imageInstances = [], MapScene = install({
    Image: class {
      constructor() { imageInstances.push(this); this.complete = false; this.naturalWidth = 0; }
      set src(value) { this.url = value; this.complete = true; this.naturalWidth = 1024; }
    },
    window: { setTimeout: () => 12 },
  });
  const map = new MapScene();
  map.isPublicCustomerExperience = () => true;
  map.getAttribute = () => null;
  map.preparePublicStaticBaseV1 = (state) => transitions.push(state);
  assert.equal(await map.waitForPublicStaticBaseV1(), true);
  assert.equal(imageInstances.length, 1);
  assert.match(imageInstances[0].url, /site\.png/);
  assert.deepEqual(transitions, ["static-base-loaded"]);
  assert.equal(await map.waitForPublicStaticBaseV1(), true);
  assert.equal(imageInstances.length, 1);
});

test("components.js installs the loading lifecycle before defining map-scene", async () => {
  const [composition, components, elements, module] = await Promise.all([
    readFile(new URL("../../components/map/map-scene-composition-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/shared/application-elements-registration-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/map/map-loading-screen-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(composition, /installMapLoadingScreenV1\(MapScene, \{ GENERATED_AERIAL_ASSET, browser: globalThis \}\)/);
  assert.ok(elements.indexOf("registerMap({") < elements.indexOf('customElementsRef.define("map-scene"'));
  assert.match(components,/registerApplicationElementsV1\(\{/);
  assert.match(await readFile(new URL("../../components/map/map-scene-registration-v1.mjs", import.meta.url), "utf8"), /composeMapSceneV1\(MapScene/);
  assert.doesNotMatch(components, /mountMap3DLoadingScreenV1\(\)\s*\{/);
  assert.doesNotMatch(components, /persist3dBootPhaseV5367\(phase/);
  assert.match(module, /mountMap3DLoadingScreenV1\(\)/);
  assert.match(module, /persist3dBootPhaseV5367\(phase/);
});
