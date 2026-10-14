import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installSceneContextLifecycleV1 } from "../../components/map/scene-context-lifecycle-v1.mjs";

test("theme changes preserve the existing MapScene and center page contexts after layout settles", () => {
  class MapScene {
    setTheme(view) {
      this._themeView = view;
      this.calls.push(["theme", view]);
      return "theme-result";
    }
  }
  const frames = [];
  installSceneContextLifecycleV1(MapScene, {
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  const scene = Object.assign(new MapScene(), {
    calls: [],
    setMapContext: (view) => scene.calls.push(["context", view]),
    centerSceneInContext: () => scene.calls.push(["center"]),
  });

  assert.equal(scene.setTheme("agenda"), "theme-result");
  assert.deepEqual(scene.calls, [["context", "agenda"], ["theme", "agenda"]]);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(scene.calls.at(-1), ["center"]);

  const callsBeforeDuplicate = scene.calls.length;
  assert.equal(scene.setTheme("agenda"), undefined);
  assert.equal(scene.calls.length, callsBeforeDuplicate);
});

test("non-page theme changes do not schedule context recentering", () => {
  class MapScene { setTheme(view) { this._themeView = view; } }
  const frames = [];
  installSceneContextLifecycleV1(MapScene, {
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  const scene = Object.assign(new MapScene(), {
    setMapContext() {},
    centerSceneInContext() {},
  });

  scene.setTheme("map");
  assert.deepEqual(frames, []);
});

test("composition installs lifecycle behavior after navigation can replace setTheme", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /scene-context-lifecycle-v1\.mjs\?v=scene-context-lifecycle-v1/);
  const navigation = source.indexOf("installSceneNavigationV1(MapScene, {");
  const tilt = source.indexOf("installSceneTiltControllerV1(MapScene, {");
  const lifecycle = source.indexOf("installSceneContextLifecycleV1(MapScene, {");
  const framing = source.indexOf("installCameraFramingV1(MapScene, {");
  assert.ok(navigation >= 0 && tilt > navigation && lifecycle > tilt && framing > lifecycle);
  assert.doesNotMatch(source, /const mapSceneSetTheme = MapScene\.prototype\.setTheme/);
});
