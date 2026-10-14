import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDashboardHomeContextV1 } from "../../components/map/dashboard-home-context-v1.mjs";

const createHarness = () => {
  const patches = [], mapModes = [], order = [], listeners = [];
  const appState = { mapFilter: "execution" };
  const appStore = { get: () => appState, set: (patch) => { patches.push(patch); Object.assign(appState, patch); } };
  const filters = [["execution", "Execução"], ["progress", "Progresso"]];
  const map = { setMapSelectionMode: (mode) => mapModes.push(mode) };
  const documentRef = {
    querySelector: (selector) => selector === "map-scene[data-dashboard-operational-map]" ? map : null,
  };
  const button = {
    dataset: { mapWidgetContext: "map" },
    closest: (selector) => selector === "[data-map-summary-widget],[data-highlight-status]"
      ? { dataset: { mapSummaryKey: "progress" } }
      : null,
    addEventListener: (type, handler) => listeners.push({ type, handler }),
  };
  const head = { after: (node) => order.push(["after", node]) };
  const timeline = { kind: "timeline" };
  const home = { querySelector: (selector) => selector === ".dashboard-carbon-head" ? head : selector === ".dashboard-stage-timeline" ? timeline : null };
  class ViewLayer {
    render() { order.push("base-render"); return "render-result"; }
    bind() { order.push("base-bind"); return "bind-result"; }
    querySelector(selector) { return selector === ".dashboard-carbon-home" ? home : null; }
    querySelectorAll(selector) { return selector === "[data-map-widget-context]" ? [button] : []; }
  }
  installDashboardHomeContextV1(ViewLayer, { appStore, dashboardFilters: filters, documentRef });
  return { ViewLayer, appStore, patches, mapModes, order, listeners, button, head, timeline };
};

test("dashboard home keeps the original timeline-first DOM placement and base render result", () => {
  const { ViewLayer, order, head, timeline } = createHarness();
  const view = new ViewLayer();
  assert.equal(view.render(), "render-result");
  assert.deepEqual(order, ["base-render", ["after", timeline]]);
  assert.equal(order[1][0], "after");
  assert.equal(head.after instanceof Function, true);
});

test("map context CTA preserves filtering, selection mode, state, and event propagation semantics", () => {
  const { ViewLayer, patches, mapModes, order, listeners, button } = createHarness();
  const view = new ViewLayer();
  assert.equal(view.bind(), "bind-result");
  assert.deepEqual(order, ["base-bind"]);
  assert.equal(button.dataset.mapWidgetContextBound, "true");
  assert.equal(listeners.length, 1);
  const stopped = [];
  listeners[0].handler({ preventDefault: () => stopped.push("prevent"), stopImmediatePropagation: () => stopped.push("stop") });

  assert.deepEqual(stopped, ["prevent", "stop"]);
  assert.deepEqual(mapModes, ["progress"]);
  assert.deepEqual(patches, [{ view: "map", mapFilterWidget: "progress", lastAction: "Abriu contexto de Progresso no mapa" }]);
});

test("map rail CTAs and already-bound controls are left to their owners", () => {
  const { ViewLayer, listeners, button } = createHarness();
  button.closest = (selector) => selector === "map-filter-rail" ? {} : null;
  const view = new ViewLayer();
  view.bind();
  assert.equal(listeners.length, 0);

  button.dataset.mapWidgetContextBound = "true";
  button.closest = () => null;
  view.bind();
  assert.equal(listeners.length, 0);
});

test("application root delegates dashboard home context hooks to the map module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /import \{ installDashboardHomeContextV1 \} from "\.\/components\/map\/dashboard-home-context-v1\.mjs/);
  assert.match(source, /installDashboardHomeContextV1\(ViewLayer, \{\s*appStore,\s*dashboardFilters,\s*documentRef: globalThis\.document,/);
  assert.doesNotMatch(source, /const renderTimelineFirstV1 =/);
  assert.doesNotMatch(source, /const bindMapContextCtaV2 =/);
});
