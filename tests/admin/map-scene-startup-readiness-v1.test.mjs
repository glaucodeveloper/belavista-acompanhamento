import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { installMapSceneStartupReadinessV1 } from "../../components/map/map-scene-startup-readiness-v1.mjs";

test("a instalação do bootstrap antecede o registro do elemento map-scene", () => {
  const source = (fs.readFileSync(path.resolve('components/map/map-scene-composition-v1.mjs'), 'utf8') + fs.readFileSync(path.resolve("components.js"), 'utf8')),
    installAt = source.indexOf("installMapSceneStartupReadinessV1(MapScene);"),
    defineAt = source.indexOf('customElements.define("map-scene", MapScene);');
  assert.notEqual(installAt, -1);
  assert.notEqual(defineAt, -1);
  assert.ok(installAt < defineAt);
});

const withGlobal = async (name, value, run) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
  try {
    await run();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
};

test("viewport gate só inicia o mapa depois de o shell e seu host estarem visíveis", async () => {
  await withGlobal("requestAnimationFrame", (callback) => callback(), async () => {
    await withGlobal("window", { L: {} }, async () => {
      await withGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }), async () => {
      class MapScene {
        dataset = {};
        isConnected = true;
        renderer = {};
        hasAttribute(name) { return name === "data-admin-shared-public-map"; }
        isPublicCustomerExperience() { return false; }
        closest() { return { hidden: false }; }
        querySelector() { return { getBoundingClientRect: () => ({ width: 640, height: 480 }) }; }
        initLeaflet() { this.leafletStarted = true; }
      }
      installMapSceneStartupReadinessV1(MapScene);
      const scene = new MapScene();
      scene.waitForAdminShellViewportV5376();
      assert.equal(scene._adminShellViewportReadyV5376, true);
      assert.equal(scene.dataset.adminModelLifecycle, "shell-visible-viewport-ready");
      assert.equal(scene.dataset.renderMode, "3d-public-shared");
      assert.equal(scene.leafletStarted, true);
      });
    });
  });
});

test("mapa público estático não inicializa WebGL e conserva o fluxo da base", async () => {
  class MapScene {
    dataset = {};
    isConnected = true;
    mapTileMode = "satellite";
    hasAttribute(name) { return name === "data-public-static-only"; }
    isPublicCustomerExperience() { return false; }
    bindStaticSatelliteMapGesturesV1() { this.gesturesBound = true; }
    preparePublicStaticBaseV1(phase) { this.basePhase = phase; }
    isAdminPublicMapV1() { return false; }
    waitForPublicStaticBaseV1() { return Promise.resolve(true); }
  }
  installMapSceneStartupReadinessV1(MapScene);
  const scene = new MapScene();
  scene.initWhenReady();
  assert.equal(scene.mapTileMode, "generated");
  assert.equal(scene.dataset.renderMode, "static-satellite-markers");
  assert.equal(scene.dataset.mapInit, "static-only");
  assert.equal(scene.gesturesBound, true);
  assert.equal(scene.basePhase, "static-base-loading");
  await Promise.resolve();
  assert.equal(scene.dataset.publicStaticImage, "loaded");
  assert.equal(scene.scheduleThree(), false);
  assert.equal(scene.dataset.modelBootPhase, "static-only-no-webgl");
});

test("mapa administrativo compartilhado espera o shell e inicia Leaflet/Three sem serializá-los", async () => {
  await withGlobal("window", { L: {} }, async () => {
    class MapScene {
      dataset = {};
      _adminShellViewportReadyV5376 = true;
      renderer = {};
      hasAttribute(name) { return name === "data-admin-shared-public-map"; }
      isPublicCustomerExperience() { return false; }
      initLeaflet() { this.leafletStarted = true; }
    }
    installMapSceneStartupReadinessV1(MapScene);
    const scene = new MapScene();
    scene.initWhenReady();
    assert.equal(scene.dataset.renderMode, "3d-public-shared");
    assert.equal(scene.dataset.mapInit, "leaflet-found");
    assert.equal(scene.leafletStarted, true);
    assert.equal(scene._threeScheduled, undefined);
  });
});

test("renderer administrativo standalone permanece bloqueado antes da ativação", () => {
  class MapScene {
    dataset = {};
    hasAttribute() { return false; }
    isAdminStandalone3DV5370() { return true; }
  }
  installMapSceneStartupReadinessV1(MapScene);
  const scene = new MapScene();
  scene.scheduleThree();
  assert.equal(scene.dataset.three, "blocked-static-first");
  assert.equal(scene.dataset.modelBootPhase, "blocked-until-explicit-activation");
  assert.equal(scene._threeScheduled, undefined);
});
