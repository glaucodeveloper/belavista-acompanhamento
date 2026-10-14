import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageExtensionEventsV1 } from "../../components/planning/stage-extension-events-v1.mjs";

const makeElement = (dataset = {}, textContent = "") => {
  const listeners = new Map(), classes = new Set();
  return {
    dataset,
    textContent,
    hidden: false,
    listeners,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const next = force ?? !classes.has(name);
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    setAttribute() {},
    click(event = {}) { listeners.get("click")?.({ target: this, ...event }); },
  };
};

const install = (view, selectors) => {
  const state = { view }, notifications = [];
  class ViewLayer {
    querySelectorAll(selector) { return selectors[selector] || []; }
    querySelector(selector) { return selectors[selector]?.[0] || null; }
  }
  installStageExtensionEventsV1(ViewLayer, {
    appStore: { get: () => state, set: (patch) => Object.assign(state, patch) },
    notify: (...args) => notifications.push(args),
    activityCatalog: [],
    demoData: { activities: [] },
    esc: (value) => String(value ?? ""),
    ico: () => "",
    extensionStage: () => ({ id: "stage-1", name: "Etapa" }),
    runtimeRouteV1: (path, query) => `${path}?${query}`,
    apiFetch: async () => { throw new Error("This test must not write records"); },
    operationalHeaders: (headers) => headers,
    window: { location: { assign() {} } },
  });
  return { notifications, state, view: new ViewLayer() };
};

test("agenda controls keep day selection and action state in the planning module", () => {
  const first = makeElement({}, "Hoje"), second = makeElement({}, "Amanhã"),
    { state, view } = install("agenda", { "[data-agenda-day]": [first, second] });
  view.bindStageExtensions();
  second.click();
  assert.equal(first.classList.contains("active"), false);
  assert.equal(second.classList.contains("active"), true);
  assert.equal(state.lastAction, "Filtrou agenda por Amanhã");
});

test("activity nature filters stay connected to the rendered activity cards", () => {
  const all = makeElement({ activityCategoryFilter: "all" }),
    concrete = makeElement({ activityCategoryFilter: "Infraestrutura" }),
    infrastructure = makeElement({ activityCategory: "Infraestrutura" }),
    electrical = makeElement({ activityCategory: "Elétrica" }),
    { state, view } = install("activities", {
      "[data-activity-category-filter]": [all, concrete],
      "[data-activity-card]": [infrastructure, electrical],
    });
  view.bindStageExtensions();
  concrete.click();
  assert.equal(infrastructure.hidden, false);
  assert.equal(electrical.hidden, true);
  assert.equal(concrete.classList.contains("active"), true);
  assert.equal(state.lastAction, "Filtrou atividades por Infraestrutura");
});

test("components.js delegates stage extension event binding and imports its owner", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /import \{ installStageExtensionEventsV1 \} from "\.\/components\/planning\/stage-extension-events-v1\.mjs\?v=stage-extension-events-v1"/);
  assert.match(source, /installStageExtensionEventsV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.bindStageExtensions = function/);
  assert.doesNotMatch(source, /if \(view === "activities"\) \{/);
  assert.match(source, /apiFetch: \(\.\.\.args\) => apiFetch\(\.\.\.args\)/);
});
