import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installStagesLandingEventsV5361 } from "../../components/planning/stages-landing-events-v5361.mjs";
import { registerBelavistaStagesLandingV5361 } from "../../components/planning/stages-landing-page-v5361.mjs";

const createHarness = () => {
  const state = {
      view: "stages",
      stagesPageV5361: "landing",
      stageSelected: null,
      activityDedicated: false,
      lastAction: "",
    },
    writes = [],
    notices = [],
    bindings = new Map(),
    delegated = [],
    openStage = {
      dataset: { v5361OpenStage: "earthwork" },
      addEventListener(type, listener) {
        bindings.set(`open:${type}`, listener);
      },
    },
    back = {
      addEventListener(type, listener) {
        bindings.set(`back:${type}`, listener);
      },
    },
    agenda = {
      addEventListener(type, listener) {
        bindings.set(`agenda:${type}`, listener);
      },
    };

  const appStore = {
    get: () => ({ ...state }),
    set(patch) {
      writes.push(patch);
      Object.assign(state, patch);
    },
  };
  class ViewLayer {
    constructor() {
      this.__stagePlanningCaptureV5361 = false;
      this.baseBindCalls = 0;
    }
    bind() {
      this.baseBindCalls += 1;
    }
    querySelectorAll(selector) {
      return selector === "[data-v5361-open-stage]" ? [openStage] : [];
    }
    querySelector(selector) {
      if (selector === "[data-v5361-stage-back]") return back;
      if (selector === "[data-v5361-open-agenda-page]") return agenda;
      return null;
    }
    addEventListener(type, listener, capture) {
      delegated.push({ type, listener, capture });
    }
    contains() {
      return true;
    }
  }
  const windowRef = { lucide: { createIcons() {} } };
  installStagesLandingEventsV5361(ViewLayer, {
    appStore,
    notify: (...args) => notices.push(args),
    window: windowRef,
  });

  return {
    ViewLayer,
    appStore,
    state,
    writes,
    notices,
    bindings,
    delegated,
    view: new ViewLayer(),
  };
};

test("stage landing retains open, back, and full Agenda route actions", () => {
  const fixture = createHarness();
  fixture.view.bind();
  fixture.bindings.get("open:click")();
  assert.equal(fixture.state.stageSelected, "earthwork");
  assert.equal(fixture.state.stagesPageV5361, "detail");
  assert.equal(fixture.state.activityDedicated, true);

  fixture.bindings.get("back:click")();
  assert.equal(fixture.state.stagesPageV5361, "landing");
  assert.equal(fixture.state.activityDedicated, false);

  fixture.bindings.get("agenda:click")();
  assert.equal(fixture.state.view, "agenda");
  assert.equal(fixture.state.lastAction, "Abriu Agenda completa a partir de Etapas");
});

test("planning-owned stage workspace avoids duplicate inferred cards and preserves detail rendering", () => {
  const state = { view: "stages", stagesPageV5361: "landing", stageSelected: "earthwork" },
    writes = [],
    globalRef = {};
  const appStore = {
    get: () => ({ ...state }),
    set(patch) {
      writes.push(patch);
      Object.assign(state, patch);
    },
  };
  class ViewLayer {
    bind() {}
    stages() { return "<main>legacy detail renderer</main>"; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    addEventListener() {}
    contains() { return true; }
  }

  registerBelavistaStagesLandingV5361({
    globalRef,
    ViewLayer,
    appStore,
    demoData: {
      activities: [
        { id: "earthwork", name: "Terraplenagem", week: "Semana 1", owner: "Equipe A", progress: 15 },
        { id: "water", name: "Rede de água", week: "Semana 2", owner: "Equipe B", progress: 100 },
      ],
    },
    esc: (value) => String(value ?? ""),
    ico: (name) => `[${name}]`,
    notify() {},
    windowRef: { lucide: { createIcons() {} } },
    consoleRef: { error() {} },
    DateCtor: class extends Date {
      constructor() { super("2026-10-12T10:30:00.000Z"); }
    },
  });
  globalRef.installBelavistaStagesLandingV5361();

  const view = new ViewLayer();
  const landing = view.stages();
  assert.match(landing, /Agenda e cronograma/);
  assert.match(landing, /data-v5361-open-agenda-page/);
  assert.doesNotMatch(landing, /data-v5361-open-stage/);
  assert.doesNotMatch(landing, /Avanço médio/);
  assert.equal(globalRef.__BELAVISTA_STAGES_LANDING_V5361.detailRendererCaptured, true);
  assert.equal(writes[0].stagesPageV5361, "landing");

  state.stagesPageV5361 = "detail";
  const detail = view.stages();
  assert.match(detail, /stage-detail-shell-v5361/);
  assert.match(detail, /Terraplenagem/);
  assert.match(detail, /legacy detail renderer/);
});

test("planning pane delegation preserves direct, legacy, and utility selectors", () => {
  for (const scenario of [
    {
      selector: "[data-stage-plan]",
      dataKey: "stagePlan",
      tabSelector: "[data-stage-plan]",
      paneSelector: "[data-stage-pane]",
      name: "schedule",
    },
    {
      selector: "[data-stage-pane-tab]",
      dataKey: "stagePaneTab",
      tabSelector: "[data-stage-pane-tab]",
      paneSelector: "[data-stage-pane]",
      name: "materials",
    },
    {
      selector: "[data-utility-tab]",
      dataKey: "utilityTab",
      tabSelector: "[data-utility-tab]",
      paneSelector: "[data-pane]",
      name: "reports",
    },
  ]) {
    const fixture = createHarness(),
      makeTab = (dataset) => ({
        dataset,
        active: false,
        classList: { toggle(name, active) { if (name === "active") this.active = active; } },
      }),
      tabs = [makeTab({ [scenario.dataKey]: scenario.name })],
      panes = [
        {
          dataset: { [scenario.paneSelector === "[data-pane]" ? "pane" : "stagePane"]: scenario.name },
          hidden: true,
          active: false,
          classList: { toggle(name, active) { if (name === "active") this.active = active; } },
        },
      ],
      panel = {
        querySelectorAll(selector) {
          if (selector === scenario.tabSelector) return tabs;
          if (selector === scenario.paneSelector) return panes;
          return [];
        },
      },
      target = {
        dataset: { [scenario.dataKey]: scenario.name },
        textContent: "Materiais",
        closest(selector) {
          if (selector === scenario.selector) return this;
          if (selector === ".stage-planning-panel") return panel;
          return null;
        },
      };
    fixture.view.bind();
    let prevented = false,
      stopped = false;
    fixture.delegated[0].listener({
      target,
      preventDefault() { prevented = true; },
      stopImmediatePropagation() { stopped = true; },
    });
    assert.equal(prevented, true, scenario.name);
    assert.equal(stopped, true, scenario.name);
    assert.equal(tabs[0].classList.active, true, scenario.name);
    assert.equal(panes[0].hidden, false, scenario.name);
    assert.equal(fixture.state.lastAction, "Abriu Materiais na página da etapa");
  }
});

test("relationship and todo actions keep their notices and prevent legacy handlers", () => {
  const fixture = createHarness();
  fixture.view.bind();
  for (const [selector, message, action] of [
    ["[data-stage-relate]", "Relação pronta para ser rotulada entre as etapas.", "Abriu criação de relação entre etapas"],
    ["[data-plan-todo],.utility-add-todo", "Novo afazer preparado para a etapa.", "Preparou novo afazer da etapa"],
  ]) {
    const target = { closest: (candidate) => candidate === selector ? {} : null };
    let prevented = false,
      stopped = false;
    fixture.delegated[0].listener({
      target,
      preventDefault() { prevented = true; },
      stopImmediatePropagation() { stopped = true; },
    });
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    assert.deepEqual(fixture.notices.at(-1), [message, "success"]);
    assert.equal(fixture.state.lastAction, action);
  }
});

test("installer is explicit about missing runtime dependencies", () => {
  assert.throws(
    () => installStagesLandingEventsV5361(null),
    /require ViewLayer and the application store/,
  );
});

test("component entry delegates the complete v5.3.61 stage workspace to planning", async () => {
  const [compatibilityEntry, index, application, registration, module] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/planning-pages-application-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/planning-page-registrations-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/stages-landing-page-v5361.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(compatibilityEntry, /export \* from '\.\/components\/index\.mjs'/);
  assert.match(index, /installPlanningPagesApplicationV1/);
  assert.match(application, /installPlanningPageRegistrationsV1\(\{/);
  assert.match(registration, /import \{ registerBelavistaStagesLandingV5361 \} from/);
  assert.match(registration, /stagesLandingInstallerV1\(\{/);
  assert.match(module, /import \{ installStagesLandingEventsV5361 \} from/);
  assert.match(module, /installStagesLandingEventsV5361\(ViewLayer,/);
  assert.doesNotMatch(compatibilityEntry, /__stagePlanningCaptureV5361/);
  assert.doesNotMatch(compatibilityEntry, /stages-landing-v5361/);
});
