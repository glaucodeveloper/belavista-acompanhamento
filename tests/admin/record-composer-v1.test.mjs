import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installRecordComposerV1 } from "../../components/records/record-composer-v1.mjs";

test("record composer preserves view-layer bind/render chaining and arguments", () => {
  const calls = [], bindResult = { bound: true }, renderResult = { rendered: true };
  class ViewLayer {
    bind(...args) { calls.push(["bind", this, args]); return bindResult; }
    render(...args) { calls.push(["render", this, args]); return renderResult; }
    querySelector() { return null; }
  }
  installRecordComposerV1(ViewLayer, { ico: () => "" });
  const layer = new ViewLayer(), bindArgs = ["bind-argument"], renderArgs = ["render-argument"];
  assert.equal(layer.bind(...bindArgs), bindResult);
  assert.equal(layer.render(...renderArgs), renderResult);
  assert.deepEqual(calls.map(([kind, receiver, args]) => [kind, receiver === layer, args]), [
    ["bind", true, bindArgs],
    ["render", true, renderArgs],
  ]);
});

test("record composer retains the original attachment contract and is removed from components.js", async () => {
  const components = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    module = await readFile(new URL("../../components/records/record-composer-v1.mjs", import.meta.url), "utf8");

  assert.match(components, /installRecordComposerV1\(ViewLayer, \{ ico \}\)/);
  assert.doesNotMatch(components, /const mountRecordDropinV1\s*=/);
  assert.match(module, /dropin\.querySelector\("\.record-dropin-target-v1"\)\.append\(input\)/);
  assert.match(module, /\["image\/jpeg", "image\/png", "image\/webp", "application\/pdf"\]/);
  assert.match(module, /file\.size > 6 \* 1024 \* 1024/);
  assert.match(module, /input\.addEventListener\("change", showFile\)/);
  assert.match(module, /dropin\.addEventListener\("drop"/);
  assert.match(module, /host\.dataset\.recordComposerMounted/);
});
