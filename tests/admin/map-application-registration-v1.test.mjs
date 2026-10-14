import assert from "node:assert/strict";
import test from "node:test";
import { installMapApplicationRegistrationV1 } from "../../components/map/map-application-registration-v1.mjs";

test("shared application registration forwards the dashboard mode service to the map", async () => {
  const priorHTMLElement = globalThis.HTMLElement;
  globalThis.HTMLElement = class HTMLElement {};
  const { registerApplicationElementsV1 } = await import("../../components/shared/application-elements-registration-v1.mjs");
  const calls = [], definitions = new Map(), dashboardModeKeyV1 = () => "tracking";
  const registry = {
    get(name) { return definitions.get(name); },
    define(name, value) { definitions.set(name, value); },
  };
  class MapScene {}

  try {
    const result = registerApplicationElementsV1({
      customElementsRef: registry,
      registerPrimitives() { calls.push("primitives"); },
      createNavigation() { calls.push("navigation"); return { AppSidebar: class {}, AppTopbar: class {} }; },
      registerMap(dependencies) {
        calls.push("map");
        assert.equal(dependencies.dashboardModeKeyV1(), "tracking");
        return { MapScene, MapFilterRail: class {} };
      },
      createViewLayer() { calls.push("view-layer"); return class {}; },
    });

    assert.deepEqual(calls, ["primitives", "navigation", "map", "view-layer"]);
    assert.equal(registry.get("map-scene"), MapScene);
    assert.equal(result.MapScene, MapScene);
  } finally {
    if (priorHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = priorHTMLElement;
  }
});

test("map application composes its filter catalog before creating the scene element", () => {
  const calls = [];
  class HTMLElementRef {}
  const MapFilterRail = class {};
  const MapScene = class extends HTMLElementRef {};
  const helpers = {
    prepareAssistantLotStatusPromptV1: () => "lot",
    prepareAssistantMapAreaPromptV1: () => "area",
  };
  const filterCatalog = {
    MapFilterRail,
    dashboardFilters: [["execution", "Execução"]],
    dashboardFilterForModeV1: (filter) => filter,
  };
  const registry = {
    definitions: new Map(),
    get(name) {
      return this.definitions.get(name);
    },
    define(name, value) {
      this.definitions.set(name, value);
    },
  };

  const result = installMapApplicationRegistrationV1({
    appStore: {},
    demoData: {},
    dashboardModeKeyV1: () => "tracking",
    dashboardModes: [],
    esc: String,
    ico: () => "",
    customElementsRef: registry,
    HTMLElementCtor: HTMLElementRef,
    installMapFilterRail(dependencies) {
      calls.push(["filters", dependencies]);
      return filterCatalog;
    },
    createMapSceneElement(dependencies) {
      calls.push(["scene", dependencies]);
      return { MapScene, ...helpers };
    },
  });

  assert.deepEqual(calls.map(([name]) => name), ["filters", "scene"]);
  assert.equal(calls[1][1].dashboardFilterForModeV1, filterCatalog.dashboardFilterForModeV1);
  assert.equal(calls[1][1].dashboardModeKeyV1, calls[0][1].dashboardModeKeyV1);
  assert.equal(result.MapFilterRail, MapFilterRail);
  assert.equal(result.MapScene, MapScene);
  assert.equal(result.prepareAssistantLotStatusPromptV1(), "lot");
  assert.equal(registry.get("map-scene"), undefined);
  assert.equal(Object.isFrozen(result), true);
});

test("components.js registers map-scene only after the map application composition", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    registrationSource = await readFile(new URL("../../components/shared/application-elements-registration-v1.mjs", import.meta.url), "utf8");
  const composition = registrationSource.indexOf("registerMap({");
  const registration = registrationSource.indexOf('customElementsRef.define("map-scene", MapScene);');
  assert.ok(composition >= 0 && registration > composition);
  assert.match(source,/registerApplicationElementsV1\(\{/);
});
