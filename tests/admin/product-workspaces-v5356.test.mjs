import assert from "node:assert/strict";
import test from "node:test";
import { installProductWorkspacesV5356 } from "../../components/planning/product-workspaces-v5356.mjs";
import { registerProductWorkspacesV5356 } from "../../components/planning/product-workspaces-registration-v5356.mjs";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const createRuntime = () => {
  const state = {
    selectedStage: "stage-a",
    records: [
      { id: "record-a", stage: "stage-a", atividade: "Medição", status: "Pendente", detalhes: "4m" },
      { id: "record-b", stage: "stage-b", atividade: "Entrega", status: "Concluído" },
    ],
  };
  const activities = [
    { id: "stage-a", name: "Terraplanagem", date: "2026-10-12", status: "Em andamento", progress: 135 },
    { id: "stage-b", name: "Drenagem", date: "2026-10-12", status: "Planejada", progress: -5 },
    { id: "stage-c", name: "Rede de água", date: "2026-10-13", status: "Concluída", progress: 100 },
  ];
  const appStore = {
    get: () => state,
    set: (next) => Object.assign(state, next),
  };
  let oldBindCalls = 0, iconCalls = 0;
  const recordButton = {
    dataset: { v5356Record: "record-a" },
    addEventListener(type, callback) { this[type] = callback; },
  };
  const activityButton = {
    dataset: { v5356StageActivity: "stage-b" },
    addEventListener(type, callback) { this[type] = callback; },
  };
  class ViewLayer {
    bind() { oldBindCalls += 1; }
    querySelectorAll(selector) {
      if (selector === "[data-v5356-record]") return [recordButton];
      if (selector === "[data-v5356-stage-activity]") return [activityButton];
      return [];
    }
    querySelector() { return null; }
  }
  const globalRef = {};
  installProductWorkspacesV5356({
    globalRef,
    ViewLayer,
    appStore,
    demoData: { activities },
    esc: escapeHtml,
    ico: (name) => `<i>${name}</i>`,
    runtimeRouteV1: () => {},
    apiFetch: () => {},
    notify: () => {},
    windowRef: { lucide: { createIcons: () => { iconCalls += 1; } } },
  });
  return { state, activities, appStore, ViewLayer, globalRef, recordButton, activityButton, get oldBindCalls() { return oldBindCalls; }, get iconCalls() { return iconCalls; } };
};

test("records workspace keeps stage filtering, summary, escaping and dedicated detail", () => {
  const { ViewLayer, state } = createRuntime();
  const view = new ViewLayer();
  const html = view.records();
  assert.match(html, /record-a/);
  assert.doesNotMatch(html, /record-b/);
  assert.match(html, /Registros<\/span><b>1<\/b>/);
  assert.match(html, /Pendentes<\/span><b>1<\/b>/);

  state.recordDedicatedV5356 = "record-a";
  const detail = view.records();
  assert.match(detail, /record-dedicated-v5356/);
  assert.match(detail, /Medição/);
});

test("stage workspace groups cards by date and clamps displayed progress", () => {
  const { ViewLayer } = createRuntime();
  const html = new ViewLayer().stages();
  assert.equal((html.match(/stage-calendar-column-v5356/g) || []).length, 2);
  assert.match(html, /Terraplanagem/);
  assert.match(html, /width:100%/);
  assert.match(html, /width:0%/);
});

test("installer preserves the base binder and record/activity navigation events", () => {
  const runtime = createRuntime(), view = new runtime.ViewLayer();
  view.bind();
  runtime.recordButton.click();
  assert.equal(runtime.state.recordDedicatedV5356, "record-a");
  runtime.activityButton.click();
  assert.equal(runtime.state.view, "activities");
  assert.equal(runtime.state.selectedActivity, "stage-b");
  assert.equal(runtime.state.activityDedicated, true);
  assert.equal(runtime.oldBindCalls, 1);
  assert.equal(runtime.iconCalls, 1);
  assert.equal(runtime.globalRef.__BELAVISTA_ADMIN_WORKSPACES_V5356.version, "5.3.56");
});

test("application registration preserves the lazy extension entrypoint and its injected runtime", () => {
  const runtime = createRuntime();
  const globalRef = {};
  class DeferredViewLayer { bind() {} }
  const registered = registerProductWorkspacesV5356({
    globalRef,
    ViewLayer: DeferredViewLayer,
    appStore: runtime.appStore,
    demoData: { activities: runtime.activities },
    esc: escapeHtml,
    ico: (name) => `<i>${name}</i>`,
    runtimeRouteV1() {},
    apiFetch() {},
    notify() {},
    windowRef: { lucide: { createIcons() {} } },
  });
  assert.equal(registered, globalRef.installBelavistaProductWorkspacesV5356);
  assert.equal(DeferredViewLayer.prototype.records, undefined);
  registered();
  assert.equal(typeof DeferredViewLayer.prototype.records, "function");
  assert.equal(globalRef.__BELAVISTA_ADMIN_WORKSPACES_V5356.version, "5.3.56");
});
