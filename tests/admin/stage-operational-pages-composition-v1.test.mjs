import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageOperationalPagesCompositionV1 } from "../../components/planning/stage-operational-pages-composition-v1.mjs";

const createComposition = () => {
  const stage = {
    id: "stage-earth",
    key: "earth",
    name: "Terraplenagem",
    week: "Semana 1",
    owner: "Equipe A",
    progress: 28,
    production: { quantity: 180, unit: "m³", rate: 30, rateUnit: "m³/dia" },
    materials: ["Brita"],
    executionProfile: { typicalDescription: "Compactar a base" },
  };
  const state = {
    selectedStageV9: "earth",
    records: [],
    operationalAgenda: [],
    stageAgendaItems: [],
    operationalNotifications: [],
  };
  const ViewLayer = function ViewLayer() {
    this.dataset = {};
  };
  let baseBindCalls = 0;
  ViewLayer.prototype.bind = function bind() { baseBindCalls += 1; return "base"; };
  ViewLayer.prototype.querySelectorAll = () => [];
  ViewLayer.prototype.querySelector = () => null;
  ViewLayer.prototype.addEventListener = () => {};
  ViewLayer.prototype.contains = () => false;
  const globalRef = {
    Date,
    FormData: class FormData {},
    URL: { createObjectURL() {} },
    document: { createElement: () => ({}) },
    window: { location: { assign() {} } },
  };
  const composition = installStageOperationalPagesCompositionV1({
    ViewLayer,
    appStore: { get: () => state, set: (next) => Object.assign(state, next) },
    demoData: { activities: [{ ...stage }] },
    executionModel: { stages: [stage] },
    activityCatalog: [],
    extensionStage: () => stage,
    stageOverlayKey: (value) => String(value || "").toLocaleLowerCase("pt-BR"),
    stageProfileSettingsFor: () => ({}),
    stageMaterialsFor: () => [{ id: "material-gravel", name: "Brita", stageKey: "earth" }],
    formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
    esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    ico: (name) => `<svg data-icon="${name}"></svg>`,
    globalRef,
    workbenchActivityRouteV1: () => "/?view=activities",
    agendaCalendarIsoV3: () => "2026-10-15",
    agendaCalendarParseDateV3: (value) => value ? new Date(`${value}T00:00:00`) : null,
    agendaCalendarTimeToHoursV3: () => 8,
    agendaCalendarEventEndV3: () => 0,
    agendaCalendarReadV3: () => ({ initialized: true, events: [] }),
    agendaCalendarOperationalEventsV3: () => [],
    agendaCalendarWriteV3: () => true,
    agendaCalendarWeekKeyV8: () => "2026-W42",
    controlCenterMaterialRowsV1: () => [{ id: "material-gravel", name: "Brita", stageKey: "earth" }],
    notify: () => {},
  });
  return { stage, ViewLayer, composition, get baseBindCalls() { return baseBindCalls; } };
};

test("stage operational composition installs its complete renderer and event group", () => {
  const setup = createComposition();
  const { ViewLayer, composition } = setup;
  const view = new ViewLayer();

  assert.equal(Object.isFrozen(composition), true);
  assert.equal(typeof composition.stageV9LiveFor, "function");
  assert.equal(typeof composition.stageV9FlowPackets, "function");
  assert.equal(typeof composition.dashboardHomePageV1.render, "function");
  assert.equal(typeof ViewLayer.prototype.assistant, "function");
  assert.match(view.activityDedicatedPage(), /class="stage-v9-dedicated-page stage-agenda-page/);
  assert.match(view.activityDedicatedPage(), /Agenda de atividades/);
  assert.match(view.activities(), /Atividades da etapa/);
  assert.equal(view.bind(), undefined);
  assert.equal(setup.baseBindCalls, 1);
});

test("components root delegates dashboard, agenda, and activity page setup in architecture module", async () => {
  const root = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const planning = await readFile(new URL("../../components/planning/planning-pages-application-v1.mjs", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-operational-pages-composition-v1.mjs", import.meta.url), "utf8");
  const ordered = [
    "createStageOperationalModelV1({",
    "createDashboardHomePageV1({",
    "installStageDedicatedPageBaseV1(ViewLayer, {",
    "createStageAgendaHelpersV1({",
    "createStageAgendaPageV1({",
    "installStageAgendaPageEventsV1(ViewLayer, {",
    "installStageActivityPageV1(ViewLayer, {",
    "installStageActivityPageEventsV1(ViewLayer, {",
  ].map((needle) => composition.indexOf(needle));

  assert.match(root, /installPlanningPagesApplicationV1\(\{/);
  assert.match(planning, /installStageOperationalPagesCompositionV1\(\{/);
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.doesNotMatch(root, /createDashboardHomePageV1\(|createStageAgendaPageV1\(|installStageActivityPageEventsV1\(/);
});
