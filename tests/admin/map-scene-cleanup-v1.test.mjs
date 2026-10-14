import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installMapSceneCleanupV1 } from "../../components/map/map-scene-cleanup-v1.mjs";

test("cleanup descarta todos os recursos de um MapScene compacto", () => {
  class MapScene {
    constructor() {
      this.attributes = new Set(["compact"]);
      this._compactResizeObserver = { disconnected: false, disconnect() { this.disconnected = true; } };
      this._compactVisibilityObserver = { disconnected: false, disconnect() { this.disconnected = true; } };
      this._compactStageMaterials = new Set([
        { disposed: false, dispose() { this.disposed = true; } },
      ]);
      this.material = [...this._compactStageMaterials][0];
      this._compactRenderer = { disposed: false, dispose() { this.disposed = true; } };
      this.renderer = this._compactRenderer;
      this._compactCamera = {};
      this._compactVisible = true;
      this._persistentMapMounted = true;
    }

    hasAttribute(name) { return this.attributes.has(name); }
    clearAdminAerialZoomTilesV1() { this.aerialTilesCleared = true; }
  }

  const mirrors = new Set();
  installMapSceneCleanupV1(MapScene, { compactMapMirrors: mirrors });
  const scene = new MapScene();
  mirrors.add(scene);

  scene.disconnectedCallback();

  assert.equal(scene.aerialTilesCleared, true);
  assert.equal(mirrors.has(scene), false);
  assert.equal(scene._compactResizeObserver, null);
  assert.equal(scene._compactVisibilityObserver, null);
  assert.equal(scene._compactVisible, false);
  assert.equal(scene.material.disposed, true);
  assert.equal(scene._compactStageMaterials, null);
  assert.equal(scene.renderer.disposed, true);
  assert.equal(scene._compactRenderer, null);
  assert.equal(scene._compactCamera, null);
  assert.equal(scene._persistentMapMounted, false);
});

test("cleanup de uma cena não compacta só limpa os tiles aéreos", () => {
  class MapScene {
    hasAttribute() { return false; }
    clearAdminAerialZoomTilesV1() { this.aerialTilesCleared = true; }
  }
  const mirrors = new Set();
  installMapSceneCleanupV1(MapScene, { compactMapMirrors: mirrors });
  const scene = new MapScene();
  scene.disconnectedCallback();
  assert.equal(scene.aerialTilesCleared, true);
  assert.equal(mirrors.size, 0);
});

test("components.js instala o cleanup antes de registrar map-scene", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const installer = composition.indexOf("installMapSceneCleanupV1(MapScene");
  const registration = composition.indexOf('customElements.define("map-scene", MapScene)');

  assert.match(composition, /import \{ installMapSceneCleanupV1 \} from "\.\/components\/map\/map-scene-cleanup-v1\.mjs\?/);
  assert.ok(installer >= 0 && registration > installer);
  assert.doesNotMatch(composition, /disconnectedCallback\(\)\s*\{\s*this\.clearAdminAerialZoomTilesV1/);
});
