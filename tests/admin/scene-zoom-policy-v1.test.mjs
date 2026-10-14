import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installSceneZoomPolicyV1 } from "../../components/map/scene-zoom-policy-v1.mjs";

test("full dashboard map enforces the minimum zoom without changing other map views", () => {
  class MapScene {
    setSceneZoom(value, animate) {
      this.lastZoom = [value, animate];
      return "zoom-result";
    }
  }
  const store = { state: { view: "assistant" }, get() { return this.state; } };
  installSceneZoomPolicyV1(MapScene, { appStore: store, minSceneZoom: 0.16 });
  const full = Object.assign(new MapScene(), {
    matches: (selector) => selector.includes("data-dashboard-operational-map"),
  });
  assert.equal(full.setSceneZoom(-4, false), "zoom-result");
  assert.deepEqual(full.lastZoom, [0.16, false]);

  store.state = { view: "map" };
  assert.deepEqual(full.setSceneZoom(-4, true), "zoom-result");
  assert.deepEqual(full.lastZoom, [-4, true]);

  const regular = Object.assign(new MapScene(), { matches: () => false });
  assert.deepEqual(regular.setSceneZoom(-7, false), "zoom-result");
  assert.deepEqual(regular.lastZoom, [-7, false]);
});

test("scene zoom policy validates required app state and minimum zoom", () => {
  class MapScene { setSceneZoom() {} }
  assert.throws(
    () => installSceneZoomPolicyV1(MapScene, { appStore: {}, minSceneZoom: 0.16 }),
    /appStore\.get\(\)/,
  );
  assert.throws(
    () => installSceneZoomPolicyV1(MapScene, { appStore: { get() {} }, minSceneZoom: NaN }),
    /numeric minimum zoom/,
  );
});

test("composition installs zoom policy after navigation and removes the inline override", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /scene-zoom-policy-v1\.mjs\?v=scene-zoom-policy-v1/);
  const navigation = source.indexOf("installSceneNavigationV1(MapScene, {");
  const zoomPolicy = source.indexOf("installSceneZoomPolicyV1(MapScene, {");
  const framing = source.indexOf("installCameraFramingV1(MapScene, {");
  assert.ok(navigation >= 0 && zoomPolicy > navigation && framing > zoomPolicy);
  assert.doesNotMatch(source, /const mapSceneZoomBaseV1 = MapScene\.prototype\.setSceneZoom/);
});
