import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  installStageHomeRecordResourcesEventsV1,
  installStageHomeRecordResourcesPageV1,
  installStageRecordsNavigationV1,
} from "../../components/records/stage-home-record-resources-events-v1.mjs";

const createNode = (dataset = {}) => ({
  dataset,
  listeners: {},
  hidden: false,
  addEventListener(type, handler) { this.listeners[type] = handler; },
  querySelectorAll() { return []; },
  textContent: "Materiais",
  value: "earth",
});

const createHarness = () => {
  const state = { view: "stages" }, patches = [], tasks = [], reportCalls = [], icons = [];
  const appStore = { get: () => state, set: (patch) => { patches.push(patch); Object.assign(state, patch); } };
  const stageSelect = createNode();
  const materialSearch = createNode();
  const materialStage = createNode();
  const materialStatus = createNode();
  materialStage.value = "";
  materialStatus.value = "";
  const materialClear = createNode();
  const serviceSearch = createNode();
  const serviceStage = createNode();
  const serviceStatus = createNode();
  serviceStage.value = "";
  serviceStatus.value = "";
  const serviceClear = createNode();
  const materialRow = createNode({ stageCenterMaterialText: "Cimento CP II", stageCenterMaterialStage: "earth", stageCenterMaterialStatus: "Recebido" });
  const otherMaterialRow = createNode({ stageCenterMaterialText: "Brita", stageCenterMaterialStage: "earth", stageCenterMaterialStatus: "Pendente" });
  const serviceRow = createNode({ stageCenterServiceText: "Ensaio", stageCenterServiceStage: "earth", stageCenterServiceStatus: "Pendente" });
  const tab = createNode({ stageRecordCenterTab: "services" });
  const mode = createNode({ stageCenterViewMode: "materials", stageCenterMode: "proofs" });
  const itemRow = createNode({ stageCenterItemOpen: "material:1" });
  const serviceButton = createNode({ stageCenterServiceRecord: "service-4" });
  const closeButton = createNode();
  const dialog = {
    open: false,
    listeners: {},
    showModal() { this.open = true; },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    querySelectorAll(selector) { return selector === "[data-stage-center-item-close]" ? [closeButton] : []; },
    setAttribute(name) { if (name === "open") this.open = true; },
  };
  const selectors = new Map([
    ["[data-stage-home-resource-stage]", stageSelect],
    ["[data-stage-center-material-search]", materialSearch],
    ["[data-stage-center-material-stage-filter]", materialStage],
    ["[data-stage-center-material-status-filter]", materialStatus],
    ["[data-stage-center-material-clear]", materialClear],
    ["[data-stage-center-service-search]", serviceSearch],
    ["[data-stage-center-service-stage-filter]", serviceStage],
    ["[data-stage-center-service-status-filter]", serviceStatus],
    ["[data-stage-center-service-clear]", serviceClear],
    ["[data-stage-center-item-dialog]", null],
  ]);
  const lists = new Map([
    ["[data-stage-record-center-tab]", [tab]],
    ["[data-stage-center-view-mode]", [mode]],
    ["[data-stage-center-material-row]", [materialRow, otherMaterialRow]],
    ["[data-stage-center-service-row]", [serviceRow]],
    ["[data-stage-center-item-open]", [itemRow]],
    ["button[data-stage-center-service-record]", [serviceButton]],
  ]);
  const root = {
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) => lists.get(selector) || [],
    insertAdjacentHTML(_, html) { this.inserted = html; selectors.set("[data-stage-center-item-dialog]", dialog); },
  };
  const demoData = { activities: [{ id: "record-earth", name: "Terraplenagem" }] };
  class ViewLayer {
    bind() { this.baseBindCalled = true; return "base"; }
    querySelector(selector) { return selector === "[data-stage-home-record-resources]" ? root : null; }
  }
  installStageHomeRecordResourcesEventsV1(ViewLayer, {
    appStore,
    demoData,
    stageRecordStagesV1: () => [{ key: "earth", name: "Terraplenagem" }],
    stageRecordMaterialRowsV1: () => [{ id: "m1", stageKey: "earth", name: "Cimento" }, { id: "m2", stageKey: "water", name: "Areia" }],
    stageRecordServiceRowsV1: () => [{ id: "s1", stageKey: "earth", name: "Ensaio" }],
    stageMaterialReportBindV1: (...args) => reportCalls.push(args),
    stageRecordNormalizeV1: (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    stageRecordCenterItemModalMarkupV1: (...args) => { root.modalArgs = args; return '<dialog data-stage-center-item-dialog></dialog>'; },
    documentRef: { querySelector: (selector) => selector === "[data-stage-home-record-resources]" ? root : null },
    queueMicrotaskFn: (callback) => tasks.push(callback),
    windowRef: { lucide: { createIcons: () => icons.push("create") } },
  });
  return { ViewLayer, appStore, closeButton, dialog, icons, itemRow, materialClear, materialRow, materialSearch, materialStage, materialStatus, mode, otherMaterialRow, patches, reportCalls, root, serviceButton, serviceClear, serviceRow, serviceSearch, serviceStage, serviceStatus, stageSelect, tab, tasks };
};

test("stage home resource binding scopes rows, selects the stage, changes tabs/modes, and filters records", () => {
  const fixture = createHarness();
  const view = new fixture.ViewLayer();
  assert.equal(view.bind(), "base");
  assert.equal(view.baseBindCalled, true);
  assert.equal(fixture.reportCalls.length, 1);
  assert.deepEqual(fixture.reportCalls[0][1], [{ id: "m1", stageKey: "earth", name: "Cimento" }]);

  fixture.stageSelect.value = "earth";
  fixture.stageSelect.listeners.change({ currentTarget: fixture.stageSelect });
  assert.deepEqual(fixture.patches.at(-1), {
    selectedStageV9: "earth", selectedStage: "record-earth", stageSelected: true,
    lastAction: "Abriu a etapa Terraplenagem na lista de materiais e serviços",
  });
  fixture.tab.listeners.click();
  assert.deepEqual(fixture.patches.at(-1), {
    controlStageCenterTab: "services", controlStageRecordModalId: null,
    controlStageCenterItemModalKey: null, lastAction: "Abriu a aba Materiais da etapa",
  });
  fixture.mode.listeners.click();
  assert.equal(fixture.patches.at(-1).controlStageCenterMaterialMode, "proofs");

  fixture.materialSearch.value = "cimento";
  fixture.materialSearch.listeners.input();
  assert.equal(fixture.materialRow.hidden, false);
  assert.equal(fixture.otherMaterialRow.hidden, true);
  fixture.materialClear.listeners.click();
  assert.equal(fixture.materialSearch.value, "");
  assert.equal(fixture.otherMaterialRow.hidden, false);
  assert.equal(fixture.serviceRow.hidden, false);
  assert.deepEqual(fixture.icons, ["create"]);
});

test("stage resource rows open the lazy dialog, service properties, and close it through native dialog controls", () => {
  const fixture = createHarness();
  const view = new fixture.ViewLayer();
  view.bind();
  fixture.itemRow.listeners.click({ target: { closest: () => null } });
  assert.equal(fixture.patches.at(-1).controlStageCenterItemModalKey, "material:1");
  assert.equal(fixture.tasks.length, 1);
  fixture.tasks[0]();
  assert.match(fixture.root.inserted, /data-stage-center-item-dialog/);
  assert.equal(fixture.dialog.open, true);
  assert.equal(fixture.root.modalArgs[1][0].id, "m1");
  view.bind();
  fixture.serviceButton.listeners.click({ stopPropagation() {} });
  assert.equal(fixture.patches.at(-1).controlStageCenterItemModalKey, "service:service-4");
  fixture.closeButton.listeners.click();
  assert.equal(fixture.patches.at(-1).controlStageCenterItemModalKey, null);
});

test("record resources require injected services and application root delegates the binding", async () => {
  assert.throws(() => installStageHomeRecordResourcesEventsV1(class ViewLayer {}, {}), /require appStore\.get/);
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const application = await readFile(new URL("../../components/planning/stage-home-record-resources-application-v1.mjs", import.meta.url), "utf8");
  assert.match(application, /installStageHomeRecordResourcesEventsV1/);
  assert.match(root, /installStageHomeRecordResourcesApplicationV1\(\{/);
  assert.match(application, /installStageHomeRecordResourcesEventsV1\(ViewLayer, \{/);
  assert.doesNotMatch(root, /const stageHomeRecordResourcesBindBaseV1 =|const renderStageRecordResourcesFinalV1 =|const bindStageRecordsNavigationFinalV1 =/);
});

test("stage landing appends the real resource workspace once and skips dedicated activity routes", () => {
  const state = { view: "stages", stageActivityDedicatedV9: false }, appended = [], calls = [];
  class ViewLayer {
    render() { return "base-render"; }
    querySelector() { return null; }
    append(node) { appended.push(node); }
    bind() { calls.push("bind"); }
  }
  installStageHomeRecordResourcesPageV1(ViewLayer, {
    appStore: { get: () => state },
    documentRef: { createElement: (tag) => ({ tag, dataset: {} }) },
    stageHomeRecordResourcesMarkupV1: (snapshot) => `<div data-persisted-state="${snapshot.view}"></div>`,
  });
  const view = new ViewLayer();
  assert.equal(view.render(), "base-render");
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, "stage-home-section stage-home-records");
  assert.equal(appended[0].dataset.stageHomeSection, "records");
  assert.match(appended[0].innerHTML, /data-persisted-state="stages"/);
  assert.deepEqual(calls, ["bind"]);
  state.stageActivityDedicatedV9 = true;
  view.render();
  assert.equal(appended.length, 1);
});

test("stage records navigation preserves the selected stage and capture-phase click behavior", () => {
  const state = { view: "map", selectedStageV9: "water", selectedStage: "record-water" }, patches = [];
  const button = createNode();
  const appStore = { get: () => state, set: (patch) => { patches.push(patch); Object.assign(state, patch); } };
  class ViewLayer {
    bind() { return "base-bind"; }
    querySelector(selector) { return selector === '[data-view="stages"]' ? button : null; }
  }
  installStageRecordsNavigationV1(ViewLayer, { appStore });
  const view = new ViewLayer();
  assert.equal(view.bind(), "base-bind");
  const event = { preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
  button.listeners.click(event);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.deepEqual(patches, [{
    view: "stages", activityDedicated: false, stageActivityDedicatedV9: false,
    selectedStageV9: "water", stageSelected: true,
    lastAction: "Abriu Etapas com os materiais e serviços registrados",
  }]);
  view.bind();
  assert.equal(typeof button.listeners.click, "function");
});
