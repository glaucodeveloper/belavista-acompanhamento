import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDataTableControlsV1 } from "../../components/shared/data-table-controls-v1.mjs";

test("data-table installer preserves render chaining and injects shared styles once", () => {
  const calls = [], styles = new Map(), appended = [], renderResult = { rendered: true };
  class ViewLayer {
    render(...args) { calls.push([this, args]); return renderResult; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
  }
  const document = {
    head: { append: (node) => { appended.push(node); styles.set(node.id, node); } },
    getElementById: (id) => styles.get(id) || null,
    createElement: (tagName) => ({ tagName, dataset: {} }),
  };
  installDataTableControlsV1(ViewLayer, { document });
  const layer = new ViewLayer(), args = ["route", 1];
  assert.equal(layer.render(...args), renderResult);
  assert.equal(layer.render("again"), renderResult);
  assert.deepEqual(calls.map(([receiver, received]) => [receiver === layer, received]), [[true, args], [true, ["again"]]]);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].id, "data-table-controls-v1-style");
});

test("data-table extraction retains supported table areas and their search, paging, and export events", async () => {
  const components = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    module = await readFile(new URL("../../components/shared/data-table-controls-v1.mjs", import.meta.url), "utf8");
  assert.match(components, /installDataTableControlsV1\(ViewLayer\)/);
  assert.doesNotMatch(components, /const renderBeforeDataTablesV1\s*=/);
  assert.match(module, /\.contracts-page-v2/);
  assert.match(module, /\[data-control-material-row\]/);
  assert.match(module, /\.records-stage-history-v1 \.records-history-row-v1/);
  assert.match(module, /data-table-search/);
  assert.match(module, /data-table-category/);
  assert.match(module, /data-table-size/);
  assert.match(module, /data-table-prev/);
  assert.match(module, /data-table-next/);
  assert.match(module, /data-table-csv/);
  assert.match(module, /URLCtor\.createObjectURL/);
});
