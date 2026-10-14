import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createStageContextResolverV1,
  createStageViewTabsMarkupV1,
  createStagePersistentTimelineMarkupV1,
  installStageHeader3DControlsV1,
  installPersistentStageTimelineEventsV1,
  installStagePersistentTimelinePagesV1,
  installStageStableViewTabsV1,
  installStageSubpageMapShellV1,
  installStageViewTabsEventsV1,
  STAGE_CONTEXT_VIEWS_V1,
} from "../../components/planning/stage-context-chrome-v1.mjs";

const stage = { id: "earth-id", key: "earth", name: "Terraplenagem" };
const dependencies = {
  esc: (value) => String(value ?? "").replaceAll("<", "&lt;"),
  ico: (name) => `<i>${name}</i>`,
  stageOverlayKey: (name) => String(name).toLowerCase(),
  demoData: { activities: [stage] },
  extensionStage: () => stage,
  stageHeader3DMarkup: (current) => `<section data-stage-header-3d>${current.name}</section>`,
  requestAnimationFrameFn: (callback) => callback(),
};

test("stage context and view tabs resolve from injected live stage and operational records", () => {
  const model = [
      { id: "project-model", key: "project", name: "Projeto executivo" },
      { id: "earth-model", key: "earth", name: "Terraplenagem" },
    ],
    activities = [
      { id: "project-record", name: "Projeto executivo", week: "Semana 1", progress: 72, owner: "Engenharia" },
      { id: "earth-record", name: "Terraplenagem", week: "Semana 2", progress: 68, owner: "Equipe" },
    ],
    appStore = { get: () => ({ selectedStageV9: "earth" }) },
    stageContextV1 = createStageContextResolverV1({
      appStore,
      executionModel: { stages: model },
      demoData: { activities },
    }),
    context = stageContextV1(),
    renderTabs = createStageViewTabsMarkupV1({
      stageContextV1,
      demoData: { activities },
      esc: (value) => String(value ?? ""),
      ico: (name) => `<i>${name}</i>`,
    });

  assert.equal(context.model, model[1]);
  assert.equal(context.record, activities[1]);
  assert.match(renderTabs("stages"), /data-stage-context-key="earth"/);
  assert.match(renderTabs("stages"), /Terraplenagem/);
  assert.match(renderTabs("stages"), /Semana 2 · 68% · Equipe/);
  assert.doesNotMatch(renderTabs("actions"), /data-stage-view="actions"/);
});

test("stage map header wraps activities/progress and keeps reset plus initial framing behavior", () => {
  const calls = [];
  const button = { addEventListener: (_type, handler) => calls.push({ kind: "button", handler }) };
  const map = { fitSceneView: (reset) => calls.push({ kind: "fit", reset }) };
  const content = { insertAdjacentHTML: (_position, html) => calls.push({ kind: "insert", html }) };
  const page = { querySelector: (selector) => selector === "[data-stage-header-3d]" ? null : content };
  class ViewLayer {
    activities() { return '<section class="activities-page"><div class="extension-head">Atividades</div></section>'; }
    progress() { return '<section class="progress-page"><div class="extension-head">Andamento</div></section>'; }
    bind() { calls.push({ kind: "base-bind" }); }
    querySelector(selector) { return selector === ".activities-page,.progress-page" ? page : selector === "[data-stage-header-map]" ? map : null; }
    querySelectorAll(selector) { return selector === "[data-stage-header-fit]" ? [button] : selector === "[data-stage-header-map]" ? [map] : []; }
  }
  const headerMarkup = installStageHeader3DControlsV1(ViewLayer, dependencies);
  assert.match(new ViewLayer().activities(), /data-overlay="terraplenagem"/);
  assert.match(new ViewLayer().progress(), /Local físico da etapa/);
  new ViewLayer().bind();
  assert.equal(calls.filter((call) => call.kind === "base-bind").length, 1);
  assert.equal(calls.filter((call) => call.kind === "insert").length, 1);
  calls.find((call) => call.kind === "button").handler();
  assert.deepEqual(calls.filter((call) => call.kind === "fit").map((call) => call.reset), [false, true]);
  assert.match(headerMarkup(stage), /data-map-index="0"/);
});

test("stage subpage shell injects the shared map once before the extension header", () => {
  class ViewLayer { agenda() { return '<section><div class="extension-head">Agenda</div></section>'; } }
  installStageSubpageMapShellV1(ViewLayer, dependencies);
  const view = new ViewLayer();
  const once = view.agenda();
  assert.ok(once.indexOf('data-stage-header-3d') < once.indexOf('class="extension-head"'));
  assert.equal((view.agenda().match(/data-stage-header-3d/g) || []).length, 1);
});

test("stable tabs render in the first activity/progress output without duplicating existing tabs", () => {
  class ViewLayer {
    activities() { return '<section class="activities-dynamic-summary">Atividades</section>'; }
    progress() { return '<div class="progress-toolbar">Andamento</div>'; }
  }
  installStageStableViewTabsV1(ViewLayer, { stageViewTabs: (active) => `<nav class="stage-view-tabs">${active}</nav>` });
  const view = new ViewLayer();
  assert.match(view.activities(), /<nav class="stage-view-tabs">activities<\/nav><section class="activities-dynamic-summary">/);
  assert.match(view.progress(), /<nav class="stage-view-tabs">progress<\/nav><div class="progress-toolbar">/);
  view.activities = () => '<nav class="stage-view-tabs">existing</nav><section class="activities-dynamic-summary">';
  assert.equal((view.activities().match(/class="stage-view-tabs"/g) || []).length, 1);
});

test("stage view tab events preserve the bound state and record-filter transition", () => {
  const calls = [];
  const button = {
    dataset: { stageView: "records" },
    textContent: "Registros",
    addEventListener: (_type, handler) => calls.push(handler),
  };
  const nav = {
    dataset: {},
    querySelectorAll: () => [button],
  };
  const state = { selectedStage: "old", recordFilters: { query: "EPI" } };
  class ViewLayer {
    bind() { return "base-bind"; }
    querySelectorAll() { return [nav]; }
  }
  installStageViewTabsEventsV1(ViewLayer, {
    appStore: { get: () => state, set: (next) => calls.push(next) },
    stageContextV1: () => ({ model: { key: "earth" }, record: { id: "stage-earth", name: "Terraplenagem" } }),
  });
  assert.equal(new ViewLayer().bind(), "base-bind");
  calls[0]({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(calls[1], {
    view: "records",
    selectedStage: "stage-earth",
    selectedStageV9: "earth",
    activityDedicated: false,
    stageActivityDedicatedV9: false,
    selectedActivity: null,
    activityRecordModalOpenV1: false,
    editingRecord: null,
    recordContext: null,
    stageRecordsContext: true,
    recordFilters: { query: "EPI", stage: "Terraplenagem", entity: "records" },
    lastAction: "Abriu Registros da etapa Terraplenagem",
  });
});

test("persistent timeline renders stage progress, active state, selector, and actions from injected data", () => {
  const secondStage = { key: "water", id: "water-id", name: "Rede de Água" };
  const markup = createStagePersistentTimelineMarkupV1({
    appStore: { get: () => ({ selectedStageV9: "water", operationalState: { stages: [{ key: "earth", progress: 25 }] } }) },
    extensionStage: () => secondStage,
    executionModel: { stages: [stage, secondStage] },
    stageV9LiveFor: (item) => item.key === "earth" ? { progress: 12, week: "Semana 2" } : { progress: 74, week: "Semana 8" },
    demoData: { activities: [stage, secondStage] },
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
  })();
  assert.match(markup, /data-stage-persistent-timeline/);
  assert.match(markup, /Rede de Água/);
  assert.match(markup, /data-persistent-stage-key="water"/);
  assert.match(markup, /data-persistent-stage-select/);
  assert.match(markup, /value="water" selected/);
  assert.match(markup, /data-persistent-stage-add/);
  assert.match(markup, /data-stage-system-action/);
  assert.deepEqual([...STAGE_CONTEXT_VIEWS_V1], ["stages", "actions", "agenda", "activities", "records", "progress", "foremen"]);
});

test("persistent timeline pages insert the timeline only when the source page lacks it", () => {
  class ViewLayer {
    agenda() { return "<section>Agenda</section>"; }
    foremen() { return "<section data-stage-persistent-timeline>already present</section>"; }
  }
  installStagePersistentTimelinePagesV1(ViewLayer, { stagePersistentTimelineMarkupV1: () => "<timeline data-stage-persistent-timeline></timeline>" });
  const view = new ViewLayer();
  assert.equal(view.agenda(), "<timeline data-stage-persistent-timeline></timeline><section>Agenda</section>");
  assert.equal(view.foremen(), "<section data-stage-persistent-timeline>already present</section>");
});

test("timeline card events preserve stage navigation and the original capture behavior", () => {
  const calls = [];
  const button = { dataset: { persistentStageKey: "earth" } };
  class ViewLayer {
    bind() { calls.push("base"); return 17; }
    addEventListener(type, handler, capture) { calls.push({ type, handler, capture }); }
    contains(element) { return element === button; }
  }
  installPersistentStageTimelineEventsV1(ViewLayer, {
    appStore: { get() {}, set: (next) => calls.push(next) },
    executionModel: { stages: [stage] },
    demoData: { activities: [{ id: "earth-record", name: stage.name }] },
  });
  const view = new ViewLayer();
  assert.equal(view.bind(), 17);
  const listener = calls.find((item) => typeof item === "object" && item.type === "click");
  assert.equal(listener.capture, true);
  listener.handler({ target: { closest: () => button }, preventDefault() {}, stopImmediatePropagation() {} });
  assert.deepEqual(calls.at(-1), {
    view: "stages",
    selectedStage: "earth-record",
    selectedStageV9: "earth",
    activityDedicated: true,
    stageActivityDedicatedV9: false,
    dashboardStageFocus: "",
    lastAction: "Abriu a etapa Terraplenagem pela linha do tempo",
  });
});

test("components root delegates stage map chrome to planning modules", async () => {
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const pages = await readFile(new URL("../../components/planning/stage-pages-application-composition-v1.mjs", import.meta.url), "utf8");
  const chrome = await readFile(new URL("../../components/planning/stage-context-chrome-v1.mjs", import.meta.url), "utf8");
  const controlCenter = await readFile(new URL("../../components/planning/control-center-application-composition-v1.mjs", import.meta.url), "utf8");
  const source = pages + chrome + controlCenter;
  assert.match(root, /installStagePagesApplicationCompositionV1\(\{/);
  assert.match(source, /installStageHeader3DControlsV1\(ViewLayer, \{/);
  assert.match(source, /installStageSubpageMapShellV1\(ViewLayer, \{/);
  assert.match(source, /installStageViewTabsEventsV1\(ViewLayer, \{/);
  assert.match(source, /createStagePersistentTimelineMarkupV1\(\{/);
  assert.match(source, /installStagePersistentTimelinePagesV1\(ViewLayer, \{/);
  assert.match(source, /installPersistentStageTimelineEventsV1\(ViewLayer, \{/);
  assert.match(controlCenter, /installStageHeader3DControlsV1\(ViewLayer, \{/);
  assert.match(controlCenter, /installStageStableViewTabsV1\(ViewLayer, \{/);
  assert.doesNotMatch(root, /installStageHeader3DControlsV1\(ViewLayer, \{/);
  assert.doesNotMatch(root, /const stagePersistentTimelineMarkupV1 = \(\) =>/);
  assert.doesNotMatch(root, /const bindPersistentStageTimelineV1 =/);
  assert.doesNotMatch(root, /const addStageHeader3D =/);
  assert.doesNotMatch(root, /const stageSubpageMapShellV1 =/);
  assert.doesNotMatch(root, /const bindStageViewTabsEventsV1 =/);
  assert.doesNotMatch(root, /const injectStageViewTabsStableV1 =/);
});
