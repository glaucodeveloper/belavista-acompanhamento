import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapTileModeControllerV1 } from "../../components/map/map-tile-mode-controller-v1.mjs";

const makeScene = ({ publicExperience = false, modelReady = true } = {}) => {
  const store = { set(value) { this.last = value; } };
  const notices = [];
  const buttons = ["satellite", "osm", "generated"].map((mode) => ({
    dataset: { mapTiles: mode },
    classList: {
      values: new Set(),
      toggle(name, active) {
        if (active) this.values.add(name);
        else this.values.delete(name);
      },
    },
  }));
  class MapScene {}
  installMapTileModeControllerV1(MapScene, {
    appStore: store,
    notify(message, kind) { notices.push({ message, kind }); },
  });
  const scene = Object.assign(new MapScene(), {
    dataset: {},
    mapTileMode: "satellite",
    modelReady,
    _mapSurfaceKey: "surface",
    _osmRasterKey: "raster",
    _lastRasterSignature: "signature",
    isPublicCustomerExperience: () => publicExperience,
    querySelectorAll: () => buttons,
    syncThree() { this.syncCount = (this.syncCount || 0) + 1; },
  });
  return { scene, buttons, store, notices };
};

test("troca de camada normaliza valor, invalida cache e sincroniza o modelo", () => {
  const { scene, buttons, store, notices } = makeScene();

  scene.setMapTileMode("osm", true);

  assert.equal(scene.mapTileMode, "osm");
  assert.equal(scene.dataset.mapTileMode, "osm");
  assert.equal(buttons[0].classList.values.has("active"), false);
  assert.equal(buttons[1].classList.values.has("active"), true);
  assert.equal(buttons[2].classList.values.has("active"), false);
  assert.equal(scene.dataset.mapTileSource, undefined);
  assert.equal(scene._mapSurfaceKey, "");
  assert.equal(scene._osmRasterKey, "");
  assert.equal(scene._lastRasterSignature, "");
  assert.equal(scene.syncCount, 1);
  assert.deepEqual(notices, [{
    message: "Mapa OSM ativado na cena compartilhada.",
    kind: "success",
  }]);
  assert.deepEqual(store.last, {
    mapTileMode: "osm",
    lastAction: "Alterou base cartográfica para Mapa OSM",
  });
});

test("modo público força camada DWG e camada inválida volta ao satélite", () => {
  const publicScene = makeScene({ publicExperience: true });
  publicScene.scene.setMapTileMode("osm");
  assert.equal(publicScene.scene.mapTileMode, "generated");
  assert.equal(publicScene.buttons[2].classList.values.has("active"), true);

  const adminScene = makeScene({ modelReady: false });
  adminScene.scene.setMapTileMode("not-a-map-mode");
  assert.equal(adminScene.scene.mapTileMode, "satellite");
  assert.equal(adminScene.scene.dataset.mapTileMode, "satellite");
  assert.equal(adminScene.scene.syncCount, undefined);
});

test("seleção repetida mantém os botões coerentes sem invalidar estado novamente", () => {
  const { scene, store } = makeScene();
  scene.mapTileMode = "generated";
  scene._mapSurfaceKey = "keep";
  scene._osmRasterKey = "keep-raster";
  scene._lastRasterSignature = "keep-signature";
  scene.setMapTileMode("generated", true);

  assert.equal(scene.dataset.mapTileMode, "generated");
  assert.equal(scene._mapSurfaceKey, "keep");
  assert.equal(scene._osmRasterKey, "keep-raster");
  assert.equal(scene._lastRasterSignature, "keep-signature");
  assert.equal(scene.syncCount, undefined);
  assert.equal(store.last, undefined);
});

test("components.js instala o controller antes de registrar map-scene", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const installAt = composition.indexOf("installMapTileModeControllerV1(MapScene");
  const defineAt = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installMapTileModeControllerV1 \} from "\.\/components\/map\/map-tile-mode-controller-v1\.mjs\?/);
  assert.ok(installAt >= 0 && defineAt > installAt);
  assert.match(composition, /installMapTileModeControllerV1\(MapScene, \{ appStore, notify \}\)/);
  assert.doesNotMatch(composition, /^  setMapTileMode\(/m);
});
