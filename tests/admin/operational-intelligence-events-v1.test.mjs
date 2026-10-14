import test from "node:test";
import assert from "node:assert/strict";
import { installOperationalIntelligenceEventsV1 } from "../../components/planning/operational-intelligence-events-v1.mjs";

const setup = () => {
  const state = { view: "actions" }, writes = [], notices = [], calls = [], listeners = new Map(),
    button = (dataset = {}) => ({
      dataset,
      textContent: "PERT nó",
      addEventListener(type, listener) { listeners.set(`${dataset.testId || "button"}:${type}`, listener); },
    }),
    node = button({ pertNode: "survey", testId: "node" }),
    complete = button({ pertComplete: "survey", testId: "complete" });
  class ViewLayer {
    bind() { calls.push("base-bind"); }
    querySelector(selector) { return selector === "[data-pert-complete]" ? complete : null; }
    querySelectorAll(selector) { return selector === "[data-pert-node]" ? [node] : []; }
  }
  const pages = Object.fromEntries(["actionsPageV1", "raciPageV1", "raidPageV1"].map((name) => [name, {
    bind: (layer, view) => calls.push([name, layer, view]),
  }]));
  installOperationalIntelligenceEventsV1(ViewLayer, {
    appStore: { get: () => state, set: (patch) => { writes.push(patch); Object.assign(state, patch); } },
    ico: (name) => `[${name}]`,
    notify: (...args) => notices.push(args),
    ...pages,
  });
  return { ViewLayer, state, writes, notices, calls, listeners, node, complete };
};

test("intelligence event installer preserves bind order and routes each page to its original binder", () => {
  const ctx = setup(), layer = new ctx.ViewLayer();
  layer.bind();
  assert.deepEqual(ctx.calls.slice(0, 2), ["base-bind", ["actionsPageV1", layer, "actions"]]);
  ctx.state.view = "raci";
  layer.bind();
  assert.deepEqual(ctx.calls.slice(-2), ["base-bind", ["raciPageV1", layer, "raci"]]);
  ctx.state.view = "raid";
  layer.bind();
  assert.deepEqual(ctx.calls.slice(-2), ["base-bind", ["raidPageV1", layer, "raid"]]);
});

test("PERT selection and completion preserve app-state effects and notifications", () => {
  const ctx = setup(), layer = new ctx.ViewLayer();
  ctx.state.view = "pert";
  layer.bind();
  ctx.listeners.get("node:click")();
  assert.equal(ctx.state.selectedPertNode, "survey");
  assert.equal(ctx.state.lastAction, "Selecionou nó PERT PERT nó");
  ctx.listeners.get("complete:click")({ currentTarget: ctx.complete });
  assert.equal(ctx.state.pertOverrides.survey.progress, 100);
  assert.equal(ctx.state.lastAction, "Concluiu nó PERT survey");
  assert.deepEqual(ctx.notices, [["Atividade concluída. Dependências reavaliadas e próximas ações liberadas.", "success"]]);
});

test("stage Gantt enhancement remains idempotent and preserves zoom/today controls", () => {
  const button = (dataset = {}) => ({
      dataset,
      addEventListener(type, listener) { listeners.set(`${dataset.testId || "button"}:${type}`, listener); },
    }),
    listeners = new Map(),
    ctx = setup(), layer = new ctx.ViewLayer(), styleValues = new Map(), headerMarkup = [], trackMarkup = [],
    zoom = (amount) => button({ ganttZoom: String(amount), testId: `zoom-${amount}` }),
    zoomButtons = [zoom(-1), zoom(1)],
    today = button({ testId: "today" }),
    pane = {
      dataset: {},
      style: {
        setProperty: (name, value) => styleValues.set(name, value),
        getPropertyValue: (name) => styleValues.get(name) || "",
      },
      querySelector: (selector) => selector === "header"
        ? { insertAdjacentHTML: (_where, markup) => headerMarkup.push(markup) }
        : selector === "[data-gantt-today]" ? today : null,
      querySelectorAll: (selector) => selector === ".planning-gantt-track"
        ? [{ insertAdjacentHTML: (_where, markup) => trackMarkup.push(markup) }]
        : selector === "[data-gantt-zoom]" ? zoomButtons : [],
      scrollWidth: 1000,
      scrollTo: (position) => { pane.scrolled = position; },
    };
  ctx.state.view = "stages";
  layer.querySelector = (selector) => selector === '.stage-plan-pane[data-stage-pane="cronograma"]' ? pane : null;
  layer.bind();
  layer.bind();
  assert.equal(headerMarkup.length, 1);
  assert.equal(trackMarkup.length, 3);
  assert.equal(styleValues.get("--gantt-day-width"), "28px");
  listeners.get("zoom-1:click")();
  assert.equal(styleValues.get("--gantt-day-width"), "34px");
  listeners.get("today:click")();
  assert.deepEqual(pane.scrolled, { left: 280, behavior: "smooth" });
  assert.deepEqual(ctx.notices, [["Escala do Gantt: 34px por dia."], ["Cronograma centralizado na janela atual."]]);
});
