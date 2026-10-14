import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyMapSceneCoverLayoutV1 } from "../../components/map/map-scene-cover-layout-v1.mjs";

const style = (initial = {}) => Object.assign({}, initial);

test("cena, mundo, base e canvas preservam layout full-inset", () => {
  const world = { style: style() };
  const host = { style: style() };
  const canvas = { style: style() };
  const scene = {
    style: style({ position: "sticky" }),
    dataset: {},
    querySelector(selector) {
      return ({ ".scene-world": world, ".map-host": host, ".three-overlay": canvas })[selector] || null;
    },
  };

  applyMapSceneCoverLayoutV1(scene);

  assert.equal(scene.style.position, "sticky", "posição pré-existente é preservada");
  assert.equal(scene.style.overflow, "hidden");
  assert.equal(scene.style.minWidth, "0");
  assert.equal(scene.style.minHeight, "0");
  for (const layer of [world, host, canvas]) {
    assert.equal(layer.style.position, "absolute");
    assert.equal(layer.style.inset, "0");
    assert.equal(layer.style.width, "100%");
    assert.equal(layer.style.height, "100%");
    assert.equal(layer.style.maxWidth, "none");
    assert.equal(layer.style.maxHeight, "none");
  }
  assert.equal(canvas.style.objectFit, "cover");
  assert.equal(scene.dataset.mapCoverLayoutV9, "full-inset");
  assert.equal(scene.dataset.mapCoverPolicyV9, "aerial-cover + pan-clamp + resize-lock");
});

test("layout tolera camadas ainda não montadas e define posição padrão da cena", () => {
  const scene = { style: style(), dataset: {}, querySelector: () => null };
  assert.doesNotThrow(() => applyMapSceneCoverLayoutV1(scene));
  assert.equal(scene.style.position, "relative");
  assert.equal(scene.style.overflow, "hidden");
  assert.equal(scene.dataset.mapCoverLayoutV9, "full-inset");
});

test("components.js delega a política de enquadramento ao módulo de mapa", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  assert.match(connection, /import \{ applyMapSceneCoverLayoutV1 \} from "\.\/map-scene-cover-layout-v1\.mjs"/);
  assert.match(connection, /this\.innerHTML = mapMarkup;\s*applyMapSceneCoverLayoutV1\(this\);/);
  assert.doesNotMatch(composition, /this\.dataset\.mapCoverLayoutV9 = "full-inset"/);
});
