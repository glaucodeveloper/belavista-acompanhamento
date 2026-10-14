import test from "node:test";
import assert from "node:assert/strict";
import { createMapFilterRail } from "../../components/map/filter-rail.mjs";

test("MapFilterRail mantém render, seleção, limpeza e unsubscribe pelo contrato injetado", () => {
  const original = {
    HTMLElement: globalThis.HTMLElement,
    document: globalThis.document,
    window: globalThis.window,
  };
  const state = {
      dashboardMode: "tracking",
      mapProgressSelection: [],
      mapFilters: [],
      mapFilter: null,
      mapFilterWidget: null,
    },
    listeners = new Set(),
    rootListeners = new Map(),
    mapCalls = [],
    mapWidgetState = new Map(),
    mapWidgets = [
      {
        toggleAttribute: (name, active) => mapWidgetState.set(name, active),
      },
    ];
  let rail;
  const map = {
    applyDashboardModeHighlightV1: (key) => mapCalls.push(["highlight", key]),
    clearDashboardModeHighlightV1: () => mapCalls.push(["clear"]),
  };
  const appStore = {
      get: () => ({ ...state }),
      set: (next) => {
        Object.assign(state, next);
        for (const listener of listeners) listener({ ...state });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };

  globalThis.HTMLElement = class HTMLElementStub {};
  globalThis.document = {
    querySelector: () => map,
    querySelectorAll: (selector) =>
      selector.startsWith("map-scene[")
        ? mapWidgets
        : selector === "map-filter-rail" && rail
          ? [rail]
          : [],
  };
  globalThis.window = { lucide: { createIcons() {} } };

  try {
    const MapFilterRail = createMapFilterRail({
        appStore,
        dashboardModeKeyV1: (mode) => mode,
        dashboardFiltersForModeV1: () => [["execution", "Execução", "activity"]],
        mapFilterSelectionKeyV1: (current) => current.mapFilterWidget,
        dashboardModes: { tracking: { label: "Acompanhamento", description: "Resumo operacional" } },
        esc: (value) => String(value),
        mapFilterSummaryMarkupV1: () => "",
        ico: () => "",
        dashboardFilterForModeV1: (key) =>
          key === "execution" ? ["execution", "Execução", "activity"] : null,
        dashboardFilters: [["execution", "Execução", "activity"]],
      });
    rail = new MapFilterRail();
    rail.dataset = {};
    rail.addEventListener = (type, handler) => rootListeners.set(type, handler);
    rail.removeEventListener = (type, handler) => {
      if (rootListeners.get(type) === handler) rootListeners.delete(type);
    };
    rail.contains = () => true;
    rail.querySelectorAll = () => [];
    rail.querySelector = () => null;

    rail.connectedCallback();
    assert.equal(listeners.size, 1);
    assert.deepEqual([...rootListeners.keys()], ["click"]);
    assert.match(rail.innerHTML, /data-map-filter="execution"/);
    assert.equal(mapWidgetState.get("data-map-widgets-open"), false);

    const selectButton = {
      dataset: { mapFilter: "execution" },
      closest: (selector) =>
        selector === "[data-map-filter]" ? selectButton : null,
    };
    rootListeners.get("click")({ target: selectButton });
    assert.deepEqual(state.mapFilters, ["execution"]);
    assert.equal(state.mapFilterWidget, "execution");
    assert.deepEqual(mapCalls, [["highlight", "execution"]]);
    assert.equal(mapWidgetState.get("data-map-widgets-open"), true);

    rail.clear();
    assert.deepEqual(state.mapFilters, []);
    assert.equal(state.mapFilterWidget, null);
    assert.deepEqual(mapCalls.at(-1), ["clear"]);
    assert.equal(mapWidgetState.get("data-map-widgets-open"), false);

    rail.disconnectedCallback();
    assert.equal(listeners.size, 0);
    assert.equal(rootListeners.size, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
