import test from "node:test";
import assert from "node:assert/strict";
import { installAdminStandaloneStartupV5370 } from "../../components/map/admin-standalone-startup-v5370.mjs";

const makeElement = () => ({
  dataset: {},
  style: { setProperty() {} },
  attributes: new Map(),
  setAttribute(name, value) {
    this.attributes.set(name, value);
  },
  removeAttribute(name) {
    this.attributes.delete(name);
  },
});

const makeScene = (start) => {
  const host = makeElement();
  const canvas = makeElement();
  const loading = makeElement();
  const title = { textContent: "Ativar 3D" };
  const details = { textContent: "Renderer isolado · sem Leaflet · sem loops" };
  const button = {
    ...makeElement(),
    hidden: false,
    disabled: false,
    listeners: new Map(),
    querySelector(selector) {
      return selector === "b" ? title : details;
    },
    addEventListener(name, callback, capture) {
      this.listeners.set(name, { callback, capture });
    },
    remove() {
      this.removed = true;
    },
  };
  const badge = {
    insertAdjacentHTML(position, html) {
      this.inserted = { position, html };
    },
  };
  const selectors = new Map([
    [".map-host", host],
    [".three-overlay", canvas],
    ["[data-map-3d-loading]", loading],
    [".map-badge", badge],
    ["[data-admin-3d-activate-v5370]", button],
  ]);
  const scene = {
    dataset: {},
    style: { setProperty() {} },
    modelReady: false,
    querySelector: (selector) => selectors.get(selector) || null,
    installAdminMasterplanOverlayV1() {
      this.masterplanInstalled = true;
    },
    installSatelliteLotPlanOverlayV1(options) {
      this.satelliteOverlayOptions = options;
    },
    startAdminStandalone3DV5370: start,
    updateMap3DLoadingScreenV1(state) {
      this.loadingState = state;
    },
  };
  class MapScene {}
  Object.setPrototypeOf(scene, MapScene.prototype);
  return { MapScene, scene, host, canvas, loading, badge, button, title, details };
};

const makeDependencies = (MapScene) => {
  const frames = [];
  const storage = new Map();
  const errors = [];
  let timeout;
  let timeoutDelay;
  installAdminStandaloneStartupV5370(MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1: "/assets/reference.webp",
    requestAnimationFrameRef(callback) {
      frames.push(callback);
    },
    windowRef: {
      setTimeout(callback, delay) {
        timeout = callback;
        timeoutDelay = delay;
      },
    },
    localStorageRef: {
      setItem(key, value) {
        storage.set(key, value);
      },
    },
    DateRef: class extends Date {
      constructor() {
        super("2026-10-12T12:00:00.000Z");
      }
    },
    consoleRef: { error: (...args) => errors.push(args) },
  });
  return {
    frames,
    storage,
    errors,
    runScheduledStart() {
      assert.equal(frames.length, 1);
      frames.shift()();
      assert.equal(frames.length, 1);
      frames.shift()();
      assert.equal(timeoutDelay, 350);
      timeout();
    },
  };
};

test("mount preserva o primeiro paint, overlays e boot 3D após dois frames", async () => {
  let startCount = 0;
  const fixture = makeScene(() => {
    startCount++;
    return Promise.resolve(true);
  });
  const dependencies = makeDependencies(fixture.MapScene);

  fixture.scene.mountAdminStandalone3DV5370();

  assert.equal(fixture.scene.dataset.mapInit, "admin-static-first-v5370");
  assert.equal(fixture.scene.dataset.admin3dAutostart, "after-static-first-paint");
  assert.equal(fixture.scene.dataset.adminSatelliteSource, "/assets/reference.webp · scene texture only");
  assert.equal(fixture.host.dataset.backgroundRole, "disabled-three-scene-only");
  assert.equal(fixture.loading.attributes.get("hidden"), "");
  assert.equal(fixture.canvas.style.opacity, "0");
  assert.equal(fixture.scene.masterplanInstalled, true);
  assert.deepEqual(fixture.scene.satelliteOverlayOptions, { markers: true, outlines: false });
  assert.match(fixture.badge.inserted.html, /data-admin-3d-activate-v5370/);
  assert.equal(fixture.button.hidden, true);
  assert.equal(fixture.button.attributes.get("aria-hidden"), "true");
  assert.equal(dependencies.frames.length, 1);
  assert.ok(dependencies.storage.has("belavista.3d.boot.last.v5370"));

  dependencies.runScheduledStart();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(startCount, 1);
  assert.equal(fixture.button.removed, true);
  fixture.scene.mountAdminStandalone3DV5370();
  assert.equal(startCount, 1);
});

test("persistência de fase atualiza a tela, o estado global e o storage", () => {
  const fixture = makeScene(() => Promise.resolve(true));
  const dependencies = makeDependencies(fixture.MapScene);
  const previous = globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370;
  const updateCalls = [];
  fixture.scene.updateMap3DLoadingScreenV1 = (...args) => updateCalls.push(args);

  try {
    const result = fixture.scene.persistAdminStandalonePhaseV5370("download", {
      percent: 42,
    });

    assert.deepEqual(result, {
      version: "5.3.70",
      phase: "download",
      at: "2026-10-12T12:00:00.000Z",
      percent: 42,
    });
    assert.equal(fixture.scene.dataset.adminStandalonePhase, "download");
    assert.equal(globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370, result);
    assert.deepEqual(updateCalls, [["download", { percent: 42 }]]);
    assert.deepEqual(
      JSON.parse(dependencies.storage.get("belavista.3d.boot.last.v5370")),
      result,
    );
  } finally {
    if (previous === undefined) {
      delete globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370;
    } else {
      globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370 = previous;
    }
  }
});

test("falha ao persistir a fase no storage não interrompe o boot", () => {
  class MapScene {}
  installAdminStandaloneStartupV5370(MapScene, {
    DateRef: class extends Date {
      constructor() {
        super("2026-10-12T12:00:00.000Z");
      }
    },
    localStorageRef: {
      setItem() {
        throw new Error("storage indisponível");
      },
    },
  });
  const scene = Object.assign(Object.create(MapScene.prototype), {
    dataset: {},
    updateMap3DLoadingScreenV1() {},
  });

  assert.doesNotThrow(() => scene.persistAdminStandalonePhaseV5370("renderer"));
  assert.equal(scene.dataset.adminStandalonePhase, "renderer");
});

test("falha revela a recuperação e o clique tenta iniciar novamente", async () => {
  let starts = 0;
  const fixture = makeScene(() => {
    starts++;
    return starts === 1 ? Promise.reject(new Error("WebGL unavailable")) : Promise.resolve(true);
  });
  const frames = [];
  const errors = [];
  installAdminStandaloneStartupV5370(fixture.MapScene, {
    ADMIN_REFERENCE_AERIAL_ASSET_V1: "/assets/reference.webp",
    requestAnimationFrameRef: (callback) => frames.push(callback),
    windowRef: { setTimeout: (callback) => { fixture.timeout = callback; } },
    localStorageRef: { setItem() {} },
    consoleRef: { error: (...args) => errors.push(args) },
  });

  fixture.scene.mountAdminStandalone3DV5370();
  frames.shift()();
  frames.shift()();
  fixture.timeout();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fixture.scene.loadingState, "three-init-error");
  assert.equal(fixture.button.hidden, false);
  assert.equal(fixture.button.attributes.has("aria-hidden"), false);
  assert.equal(fixture.button.disabled, false);
  assert.equal(fixture.title.textContent, "Tentar 3D novamente");
  assert.match(fixture.details.textContent, /WebGL unavailable/);
  assert.equal(errors.length, 1);

  let prevented = 0;
  let stopped = 0;
  fixture.button.listeners.get("click").callback({
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
    stopImmediatePropagation: () => stopped++,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(starts, 2);
  assert.equal(prevented, 1);
  assert.equal(stopped, 2);
  assert.equal(fixture.button.removed, true);
});
