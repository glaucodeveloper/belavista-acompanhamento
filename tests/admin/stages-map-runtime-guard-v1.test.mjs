import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStagesMapRuntimeGuardV1 } from "../../components/planning/stages-map-runtime-guard-v1.mjs";

const style = () => {
  const removed = [], set = [];
  return {
    removed,
    set,
    removeProperty(name) { removed.push(name); },
    setProperty(...args) { set.push(args); },
  };
};

test("stage render keeps panorama controls interactive and clears stale inline layout", () => {
  const control = { style: style() },
    map = {
      attributes: {},
      style: style(),
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelectorAll() { return [control]; },
    },
    hostMap = { style: style() },
    documentRef = { querySelectorAll: () => [hostMap] },
    state = { view: "stages" };
  class ViewLayer {
    style = style();
    render() { return "rendered"; }
    querySelector() { return map; }
  }

  installStagesMapRuntimeGuardV1(ViewLayer, {
    appStore: { get: () => state },
    documentRef,
  });
  const view = new ViewLayer();
  assert.equal(view.render(), "rendered");
  assert.deepEqual(map.attributes, {
    "data-map-context": "stages-panorama-progress",
    "data-stages-panorama-map": "true",
  });
  assert.deepEqual(map.style.set, [["pointer-events", "none", "important"]]);
  assert.deepEqual(control.style.set, [["pointer-events", "auto", "important"]]);
  assert.deepEqual(view.style.removed, ["position", "inset", "z-index", "height", "overflow"]);
  assert.deepEqual(hostMap.style.removed, ["display", "visibility"]);

  state.view = "map";
  view.render();
  assert.equal(map.attributes["data-stages-panorama-map"], "true");
  assert.equal(map.style.set.length, 1);
});

test("components.js delegates the stage map compatibility guard to planning", async () => {
  const source = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  assert.match(source, /installStagesMapRuntimeGuardV1\(ViewLayer, \{ appStore, documentRef: globalThis\.document \}\)/);
  assert.doesNotMatch(source, /STAGES_GLOBAL_MAP_RUNTIME_GUARD_V1/);
});
