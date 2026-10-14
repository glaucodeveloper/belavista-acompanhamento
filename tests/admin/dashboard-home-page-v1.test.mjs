import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDashboardHomePageV1, installDashboardHomeEventsV1 } from "../../components/planning/dashboard-home-page-v1.mjs";

const setup = (overrides = {}) => {
  const state = {
    cashSummary: { balanceCents: 123456 },
    operationalNotifications: [{ title: "Alerta de frente" }],
    records: [{ id: "REG-1" }],
    publicLeads: [{ id: "LEAD-1" }],
    ...overrides.state,
  }, writes = [], listeners = new Map(),
    appStore = { get: () => state, set(patch) { writes.push(patch); Object.assign(state, patch); } },
    demoData = { activities: [
      { id: "activity-1", name: "Drenagem Pluvial", owner: "Equipe de campo", progress: 45, week: "Fase 02" },
    ] },
    executionModel = { stages: [
      { key: "drainage", name: "Drenagem Pluvial", description: "Executar a drenagem", dependsOn: ["terraplanagem"] },
    ] },
    card = {
      dataset: { dashboardStageCard: "drainage" },
      addEventListener(type, handler) { listeners.set(`card:${type}`, handler); },
      querySelector: () => ({ textContent: "Drenagem Pluvial" }),
    },
    worker = {
      dataset: { dashboardWorker: "drainage" },
      addEventListener(type, handler) { listeners.set(`worker:${type}`, handler); },
    },
    tab = {
      dataset: { dashboardStageTab: "agenda" },
      textContent: "Agenda",
      addEventListener(type, handler) { listeners.set(`tab:${type}`, handler); },
    },
    focusClose = { addEventListener(type, handler) { listeners.set(`close:${type}`, handler); } },
    focusView = {
      dataset: { dashboardFocusView: "records" },
      addEventListener(type, handler) { listeners.set(`focusView:${type}`, handler); },
    },
    timeline = {
      dataset: {},
      querySelectorAll(selector) {
        return selector === "[data-dashboard-stage-card]" ? [card]
          : selector === "[data-dashboard-worker]" ? [worker]
            : selector === "[data-dashboard-stage-tab]" ? [tab]
              : selector === "[data-dashboard-focus-view]" ? [focusView] : [];
      },
      querySelector(selector) {
        return selector === "[data-dashboard-focus-close]" ? focusClose
          : selector === "[data-dashboard-stage-card]" ? card : null;
      },
    },
    lucide = { createIcons() { listeners.set("icons:created", true); } },
    routes = [],
    page = createDashboardHomePageV1({
      appStore,
      demoData,
      executionModel,
      formatBRL: (value) => `R$ ${value.toFixed(2)}`,
      esc: (value) => String(value ?? ""),
      ico: (name) => `[${name}]`,
      stageV9DirectiveText: () => "Diretriz de execução",
      stageV9ProfileFor: () => ({}),
      window: { lucide, location: { assign: (url) => routes.push(url) } },
      workbenchActivityRouteV1: (activity, key) => `/worker?activity=${activity}&stage=${key}`,
    }),
    host = { querySelector: (selector) => selector === ".dashboard-stage-timeline" ? timeline : null };
  return { state, writes, listeners, page, host, card, routes, demoData, executionModel, appStore, lucide };
};

test("dashboard page keeps the live KPI, map, timeline, focus tabs, and navigation", () => {
  const ctx = setup(), html = ctx.page.render();
  for (const expected of [
    "DASHBOARD INICIAL · ALIANÇA PARK", "Panorama operacional", "R$ 1234.56",
    "MAPA OPERACIONAL", "<map-scene", "Linha do tempo de execução",
    "data-dashboard-stage-card=\"drainage\"", "data-dashboard-worker=\"drainage\"",
    "data-view=\"reports\"", "data-view=\"records\"", "Atendimento de leads",
  ]) assert.ok(html.includes(expected), `missing dashboard contract: ${expected}`);
});

test("dashboard timeline preserves stage selection, tabs, route handoff, and contextual links", () => {
  const ctx = setup({ state: { dashboardStageFocus: "drainage", dashboardStageFocusTab: "agenda" } });
  const html = ctx.page.render();
  assert.ok(html.includes("data-dashboard-focus-view=\"agenda\""));
  ctx.page.bind(ctx.host);

  ctx.listeners.get("card:click")({ target: { closest: () => null } });
  assert.equal(ctx.state.view, "stages");
  assert.equal(ctx.state.selectedStageV9, "drainage");
  assert.equal(ctx.state.selectedStage, "activity-1");
  assert.equal(ctx.state.activityDedicated, true);

  ctx.listeners.get("tab:click")();
  assert.equal(ctx.state.dashboardStageFocusTab, "agenda");
  ctx.listeners.get("worker:click")({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(ctx.routes, ["/worker?activity=&stage=drainage"]);
  ctx.listeners.get("focusView:click")();
  assert.equal(ctx.state.view, "records");
  assert.equal(ctx.state.selectedStageV9, "drainage");
  ctx.listeners.get("close:click")();
  assert.equal(ctx.state.dashboardStageFocus, "");
  assert.equal(ctx.listeners.get("icons:created"), true);
});

test("dashboard event installer composes into ViewLayer bind without replacing its base behavior", () => {
  const calls = [], ctx = setup(), ViewLayer = function () {};
  ViewLayer.prototype.bind = function () { calls.push("base"); return "base-result"; };
  installDashboardHomeEventsV1(ViewLayer, () => calls.push("dashboard"));
  assert.equal(new ViewLayer().bind(), "base-result");
  assert.deepEqual(calls, ["base", "dashboard"]);
});

test("components.js delegates Dashboard rendering and its focus interactions", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /createDashboardHomePageV1\(\{/);
  assert.match(source, /ViewLayer\.prototype\.assistant = dashboardHomePageV1\.render/);
  assert.match(source, /installDashboardHomeEventsV1\(ViewLayer, dashboardHomePageV1\.bind\)/);
  assert.equal((source.match(/ViewLayer\.prototype\.assistant\s*=/g) || []).length, 1);
  assert.doesNotMatch(source, /dashboard-system-v5356|dashboard-ai-panel|interface-dashboard/);
  assert.doesNotMatch(source, /dashboard-stage-focus-bound|data-dashboard-stage-card=\"\$\{esc\(stage\.key\)\}/);
});
