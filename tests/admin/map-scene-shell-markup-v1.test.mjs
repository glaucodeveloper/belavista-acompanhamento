import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMapSceneShellMarkupV1 } from "../../components/map/map-scene-shell-markup-v1.mjs";

const createMarkup = (persistent) => createMapSceneShellMarkupV1({
  stageOverlayLabels: { progress: "Progresso", lots: "Lotes" },
  ico: (name) => `<i data-icon="${name}"></i>`,
  persistent,
});

test("shell mantém controles, atributos e sequência da cena compartilhada", () => {
  const { solarMarkup, mapMarkup } = createMarkup(false);

  for (const selector of [
    'class="map-host"',
    'class="scene-world"',
    'class="three-overlay"',
    'class="map-tint"',
    'class="map-badge"',
    'data-scene-overlay="progress"',
    'data-scene-overlay="lots"',
    'data-scene-selection="progress"',
    'data-map-tiles="satellite"',
    'data-map-tiles="generated"',
    'data-map-tiles="osm"',
    'data-scene-pan="reset"',
    'data-scene-zoom="-0.08"',
    'data-scene-tilt="4"',
    'data-scene-tilt-range',
    'data-scene-rotate="reset"',
    'data-scene-fit',
    'Ctrl + roda',
    'Alt + clique / arraste',
  ]) assert.ok(mapMarkup.includes(selector), `markup retains ${selector}`);

  assert.ok(solarMarkup.includes('data-solar-hour'));
  assert.ok(solarMarkup.includes('data-solar-sunrise'));
  assert.ok(solarMarkup.includes('data-solar-sunset'));
  assert.ok(solarMarkup.includes('data-solar-location'));
  assert.ok(mapMarkup.indexOf('class="map-host"') < mapMarkup.indexOf('class="scene-world"'));
  assert.ok(mapMarkup.indexOf('class="scene-world"') < mapMarkup.indexOf('class="map-tint"'));
  assert.equal(mapMarkup.includes("data-scene-print-map"), false);
});

test("shell só inclui impressão no modo persistente e conserva ícones originais", () => {
  const { solarMarkup, mapMarkup } = createMarkup(true);
  assert.ok(mapMarkup.includes('data-scene-print-map'));
  assert.ok(solarMarkup.includes('data-icon="sun"'));
  assert.ok(mapMarkup.includes('data-icon="layers-3"'));
  assert.ok(mapMarkup.includes('data-icon="paintbrush"'));
  assert.ok(mapMarkup.includes('data-icon="printer"'));
});

test("components.js delega o shell visual ao módulo da cena", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");
  assert.match(connection, /import \{ createMapSceneShellMarkupV1 \} from "\.\/map-scene-shell-markup-v1\.mjs"/);
  assert.match(connection, /this\.innerHTML = mapMarkup/);
  assert.doesNotMatch(composition, /this\.innerHTML = `<div class="map-host"/);
});
