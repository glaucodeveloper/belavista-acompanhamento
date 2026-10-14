import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDashboardStageControlV1 } from "../../components/planning/dashboard-stage-control-v1.mjs";

const makeFixture = (remoteStages = null) => {
  const state = {
    view: "assistant",
    operationalState: { stages: [{ key: "earth", progress: 34, week: "Semana 2" }] },
    dashboardStageAdminStagesV1: [
      { id: "stage-1", name: "Terraplenagem", owner: "Equipe A", progress: 40 },
      { id: "stage-2", name: "Nova frente", owner: "Equipe B", progress: 5, week: "Semana 4" },
    ],
  };
  const patches = [], routes = [], fetchCalls = [], listeners = {};
  const appStore = { get: () => state, set: (patch) => { patches.push(patch); Object.assign(state, patch); } };
  const control = {
    dataset: {},
    addEventListener: (type, handler) => { listeners[type] = handler; },
  };
  const fetcher = (...args) => {
    fetchCalls.push(args);
    return Promise.resolve({ ok: true, json: async () => ({ stages: remoteStages || state.dashboardStageAdminStagesV1 }) });
  };
  class ViewLayer {
    assistant() { return '<section class="dashboard-stage-timeline">timeline source</section>'; }
    bind() { this.baseBindCount = (this.baseBindCount || 0) + 1; return "base-bind"; }
    querySelector(selector) { return selector === "[data-dashboard-stage-control]" ? control : null; }
  }
  installDashboardStageControlV1(ViewLayer, {
    appStore,
    executionModel: { stages: [{ key: "earth", name: "Terraplenagem", progress: 50 }] },
    stageV9LiveFor: (stage) => ({ progress: stage.key === "earth" ? 68 : 0 }),
    esc: (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
    runtimeRouteV1: (path, query) => `${path}?${query}`,
    windowRef: { location: { assign: (url) => routes.push(url) }, lucide: { createIcons() {} } },
    fetcher,
  });
  return { ViewLayer, appStore, control, fetchCalls, listeners, patches, routes, state };
};

test("dashboard stage control merges modeled/admin stages and preserves progress and timeline insertion", () => {
  const { ViewLayer } = makeFixture();
  const html = new ViewLayer().assistant();
  assert.ok(html.indexOf("data-dashboard-stage-control") < html.indexOf("dashboard-stage-timeline\">timeline source"));
  assert.match(html, /data-dashboard-stage-control-id="stage-1"/);
  assert.match(html, /Terraplenagem/);
  assert.match(html, /34%/);
  assert.match(html, /Nova frente/);
  assert.match(html, /Semana 4/);
  assert.match(html, /Adicionar<br>etapa/);
  assert.equal((html.match(/data-dashboard-stage-control-open=/g) || []).length, 2);
});

test("dashboard stage control binds create/edit/open and keyboard routes with original query semantics", async () => {
  const { ViewLayer, control, fetchCalls, listeners, routes } = makeFixture();
  const view = new ViewLayer();
  assert.equal(view.bind(), "base-bind");
  assert.equal(view.baseBindCount, 1);
  assert.equal(control.dataset.bound, "true");
  assert.equal(fetchCalls.length, 1);

  const event = (target) => ({
    target,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  });
  const openCard = { dataset: { dashboardStageControlOpen: "earth", dashboardStageControlId: "stage-1" } };
  openCard.closest = (selector) => selector === "[data-dashboard-stage-control-open]" ? openCard : null;
  listeners.click(event(openCard));
  assert.equal(routes.at(-1), "/admin/workers/stage?stage=earth&stageId=stage-1&mode=edit");

  const editButton = { dataset: { dashboardStageControlEdit: "earth", dashboardStageControlId: "stage-1" } };
  editButton.closest = (selector) => selector === "[data-dashboard-stage-control-edit]" ? editButton : null;
  const editEvent = event(editButton);
  listeners.click(editEvent);
  assert.equal(editEvent.prevented, true);
  assert.equal(editEvent.stopped, true);
  assert.equal(routes.at(-1), "/admin/workers/stage?stage=earth&stageId=stage-1&mode=edit");

  const addButton = { closest: (selector) => selector === "[data-dashboard-stage-control-new]" ? addButton : null };
  listeners.click(event(addButton));
  assert.equal(routes.at(-1), "/admin/workers/stage?stage=new&mode=new");

  const keyboardEvent = { key: "Enter", target: { matches: (selector) => selector === "[data-dashboard-stage-control-open]", dataset: openCard.dataset }, preventDefault() { this.prevented = true; } };
  listeners.keydown(keyboardEvent);
  assert.equal(keyboardEvent.prevented, true);
  assert.equal(routes.at(-1), "/admin/workers/stage?stage=earth&stageId=stage-1&mode=edit");
  await Promise.resolve();
});

test("dashboard stage catalog fetch is once per view instance and updates only changed server data", async () => {
  const { ViewLayer, appStore, fetchCalls, patches } = makeFixture();
  const view = new ViewLayer();
  view.bind();
  view.bind();
  assert.equal(fetchCalls.length, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(patches, []);

  const remoteStages = [{ id: "server-stage", name: "Etapa do servidor" }];
  const next = makeFixture(remoteStages);
  const nextView = new next.ViewLayer();
  nextView.bind();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(next.patches, [{ dashboardStageAdminStagesV1: remoteStages }]);
  assert.deepEqual(next.appStore.get().dashboardStageAdminStagesV1, remoteStages);
});

test("components root delegates the dashboard stage control to the planning module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-pages-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ installStagePagesApplicationCompositionV1 \} from "\.\/components\/planning\/stage-pages-application-composition-v1\.mjs/);
  assert.match(source, /installStagePagesApplicationCompositionV1\(\{/);
  assert.match(composition, /installDashboardStageControlV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /const dashboardStageControlMarkupV1 =/);
  assert.doesNotMatch(source, /const dashboardStageControlBindV1 =/);
});
