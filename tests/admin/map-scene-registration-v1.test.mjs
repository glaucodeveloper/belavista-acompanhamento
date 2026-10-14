import assert from "node:assert/strict";
import test from "node:test";
import { createMapSceneElementV1 } from "../../components/map/map-scene-registration-v1.mjs";

test("shared MapScene composes injected map ports before exposing its constructor", () => {
  class HTMLElementRef {}
  const calls = [];
  const filter = (key) => `filter:${key}`;
  const modeKey = () => "tracking";
  const compositionHelpers = {
    prepareAssistantLotStatusPromptV1: () => "lot prompt",
    prepareAssistantMapAreaPromptV1: () => "area prompt",
  };

  const result = createMapSceneElementV1({
    HTMLElementCtor: HTMLElementRef,
    dashboardFilterForModeV1: filter,
    dashboardModeKeyV1: modeKey,
    composeMapSceneV1(MapScene, dependencies) {
      calls.push({ MapScene, dependencies });
      MapScene.prototype.mapReady = () => true;
      return compositionHelpers;
    },
  });

  assert.equal(result.MapScene.prototype instanceof HTMLElementRef, true);
  assert.equal(new result.MapScene().mapReady(), true);
  assert.equal(result.prepareAssistantLotStatusPromptV1(), "lot prompt");
  assert.equal(calls[0].dependencies.dashboardFilterForModeV1("map"), "filter:map");
  assert.equal(calls[0].dependencies.dashboardModeKeyV1, modeKey);
  assert.equal(Object.isFrozen(result), true);
});

test("shared MapScene rejects registration outside a browser runtime", () => {
  assert.throws(
    () => createMapSceneElementV1({ HTMLElementCtor: null }),
    /browser HTMLElement constructor/,
  );
});
