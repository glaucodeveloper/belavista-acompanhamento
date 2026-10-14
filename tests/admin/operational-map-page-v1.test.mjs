import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOperationalMapPageV1, installOperationalMapPageV1 } from "../../components/map/operational-map-page-v1.mjs";

test("operational map page retains selected highlight, progress bounds, and context route", () => {
  const render = createOperationalMapPageV1({
    appStore: { get: () => ({ mapFilter: "materials" }) },
    highlightStatus: {
      execution: { progress: 20 },
      materials: {
        progress: 142,
        eyebrow: "MATERIAIS",
        title: "Compras críticas",
        status: "Em atenção",
        detail: "Há itens pendentes",
        priority: "Reposição",
        next: "Abrir compras",
        view: "inventory",
      },
    },
    esc: (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll('"', "&quot;"),
  });
  const html = render();

  assert.match(html, /data-highlight-key="materials"/);
  assert.match(html, /Compras críticas/);
  assert.match(html, /width:100%/);
  assert.match(html, /data-map-widget-context="inventory"/);
  assert.match(html, /<map-filter-rail><\/map-filter-rail>/);
  assert.match(html, /<map-scene data-operational-map-page="true" data-base-map/);
  assert.match(html, /data-public-static-only="true"/);
  assert.match(html, /data-public-static-capture="\/assets\/public\/dwg-satellite-treated-v5411\.png"/);
  assert.doesNotMatch(html, /APLICADO NO MODELO 3D/);
});

test("operational map page falls back to execution and requires its injected contracts", () => {
  const render = createOperationalMapPageV1({
    appStore: { get: () => ({}) },
    highlightStatus: { execution: { progress: 35, view: "stages" } },
    esc: String,
  });
  assert.match(render(), /data-highlight-key="execution"/);
  assert.throws(() => createOperationalMapPageV1(), /requires appStore\.get/);
});

test("the application wires its final map renderer to the map architecture module", async () => {
  const source = await readFile(new URL('../../components/planning/planning-pages-application-v1.mjs', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../../components/map/operational-map-page-v1.mjs', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../../styles.css', import.meta.url), 'utf8');
  assert.match(source, /installOperationalMapPageV1\(ViewLayer, \{ appStore, highlightStatus, esc \}\)/);
  assert.match(renderer, /ViewLayer\.prototype\.map = renderOperationalMapPageV1/);
  assert.match(renderer, /data-operational-map-page="true" data-base-map/);
  assert.match(styles, /view-layer\[data-view="map"\]>map-scene\[data-operational-map-page="true"\]/);
  assert.doesNotMatch(source, /return `<section class="admin-public-map-interface-v5352 operational-map-highlights-v5370/);
});

test("operational map registration validates and installs the renderer on ViewLayer", () => {
  class ViewLayer {}
  const render = installOperationalMapPageV1(ViewLayer, {
    appStore: { get: () => ({ mapFilter: "execution" }) },
    highlightStatus: { execution: { progress: 50, eyebrow: "Execução", title: "Obra", status: "Ativa", detail: "", priority: "Normal", next: "Abrir", view: "stages" } },
    esc: String,
  });
  assert.equal(ViewLayer.prototype.map, render);
  assert.match(new ViewLayer().map(), /data-highlight-key="execution"/);
  assert.throws(() => installOperationalMapPageV1(null, {}), /shared ViewLayer constructor/);
});
