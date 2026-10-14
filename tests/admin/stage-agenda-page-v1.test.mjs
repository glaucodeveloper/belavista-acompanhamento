import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStageAgendaHelpersV1, createStageAgendaPageV1, installStageAgendaPageEventsV1 } from "../../components/planning/stage-agenda-page-v1.mjs";

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

const dependencies = () => {
  const stage = { key: "earth", name: "Terraplenagem", dependsOn: ["prep"] };
  const previous = { key: "prep", name: "Preparação" };
  const model = { stages: [previous, stage] };
  return {
    stage,
    executionModel: model,
    appStore: { get: () => ({ selectedStage: "earth", records: [], operationalAgenda: [], stageAgendaItems: [] }) },
    stageV9ByState: () => stage,
    stageV9FlowPackets: () => [{ key: "grade", label: "Regularizar solo", detail: "Conferir cotas", unit: "m³" }],
    agendaCalendarReadV3: () => ({ initialized: true, events: [
      { stageKey: "earth", activityName: "Regularizar solo", date: "2026-10-15", start: "08:30", status: "Confirmada" },
      { stageKey: "earth", id: "custom-1", title: "Inspeção", notes: "Revisar trecho", date: "2026-10-16", start: "10:00", durationHours: 2, status: "Planejado", stageAgendaCustomV1: true, materialIds: ["mat-1"] },
    ] }),
    agendaCalendarOperationalEventsV3: () => [],
    controlCenterMaterialRowsV1: () => [{ id: "mat-1", name: "Brita", stageKey: "earth" }],
    stageAgendaNextSlotV1: () => ({ date: "2026-10-19", start: "09:00" }),
    stageV9LiveFor: (candidate) => candidate.key === "earth" ? { progress: 24, owner: "Equipe A" } : { progress: 40 },
    stageAgendaMaterialSidebarV1: () => '<aside data-stage-agenda-material-sidebar>Materiais</aside>',
    stageV9DedicatedAgendaBase: function () {
      assert.equal(this.id, "view-layer");
      return '<section class="stage-v9-dedicated-page"><h1>Terraplenagem</h1><section class="stage-v9-flow-section">Fluxo original</section></section>';
    },
    esc: escapeHtml,
  };
};

test("stage agenda page composes original flow context, calendar rows, material sidebar, and create form", () => {
  const deps = dependencies();
  const render = createStageAgendaPageV1(deps);
  const html = render.call({ id: "view-layer" }, "original-arg");

  assert.match(html, /stage-agenda-page/);
  assert.match(html, /Agenda de atividades/);
  assert.match(html, /Regularizar solo/);
  assert.match(html, /2026-10-15 · 08:30/);
  assert.match(html, /Confirmada/);
  assert.match(html, /data-stage-agenda-event-open="custom-1"/);
  assert.match(html, /Materiais relacionados/);
  assert.match(html, /Brita/);
  assert.match(html, /data-stage-agenda-create-form data-stage-key="earth"/);
  assert.match(html, /2026-10-19/);
  assert.match(html, /Dependências a confirmar: prep/);
  assert.doesNotMatch(html, /Fluxo original/);
});

test("stage agenda page requires the complete architecture ports", () => {
  assert.throws(() => createStageAgendaPageV1(), /requires appStore.get/);
  assert.throws(() => createStageAgendaPageV1({ ...dependencies(), stageAgendaNextSlotV1: null }), /requires stageAgendaNextSlotV1/);
  assert.throws(() => createStageAgendaPageV1({ ...dependencies(), executionModel: {} }), /requires executionModel.stages/);
});

test("stage agenda helpers preserve the first conflict-free work slot and material evidence links", () => {
  const helpers = createStageAgendaHelpersV1({
    agendaCalendarIsoV3: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    agendaCalendarParseDateV3: (value) => value ? new Date(`${value}T00:00:00`) : null,
    agendaCalendarTimeToHoursV3: (value) => {
      const [hours, minutes] = String(value).split(":").map(Number);
      return hours + minutes / 60;
    },
    agendaCalendarEventEndV3: (event) => {
      const day = new Date(`${event.date}T00:00:00`);
      const [hours, minutes] = event.start.split(":").map(Number);
      return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes).getTime() + event.durationHours * 3600000;
    },
    controlCenterMaterialRowsV1: () => [{ id: "material-1", name: "Brita", stageKey: "earth", activityName: "Compactação", quantity: 4, unit: "m³" }],
    stageOf: (record) => record.etapa,
    esc: escapeHtml,
  });
  const slot = helpers.stageAgendaNextSlotV1([
    { date: "2026-10-12", start: "08:00", durationHours: 1.5 },
  ], 1.5, new Date(2026, 9, 12, 7));
  assert.deepEqual(slot, { date: "2026-10-12", start: "09:30" });

  const html = helpers.stageAgendaMaterialSidebarV1(
    { key: "earth", name: "Terraplenagem" },
    { records: [{ id: "record-1", etapa: "Terraplenagem", materialId: "material-1", evidenceUri: "/uploads/proof.pdf" }] },
  );
  assert.match(html, /data-stage-agenda-material-sidebar/);
  assert.match(html, /Brita/);
  assert.match(html, /proof\.pdf/);
});

test("stage agenda event routes install against injected calendar and browser-form ports", () => {
  class ViewLayer {}
  ViewLayer.prototype.bind = function () { return "base bind"; };
  ViewLayer.prototype.querySelector = () => null;
  const noop = () => {};
  const installed = installStageAgendaPageEventsV1(ViewLayer, {
    appStore: { get: () => ({}), set: noop },
    executionModel: { stages: [] },
    stageV9FlowPackets: () => [],
    agendaCalendarReadV3: () => ({ initialized: true, events: [] }),
    agendaCalendarOperationalEventsV3: () => [],
    agendaCalendarParseDateV3: () => null,
    agendaCalendarTimeToHoursV3: () => 0,
    agendaCalendarEventEndV3: () => 0,
    agendaCalendarWriteV3: noop,
    agendaCalendarWeekKeyV8: () => "",
    stageAgendaNextSlotV1: () => null,
    FormData: class FormData {},
  });

  assert.equal(installed, ViewLayer);
  assert.equal(new ViewLayer().bind(), "base bind");
  assert.throws(() => installStageAgendaPageEventsV1(class {}, {}), /require ViewLayer.prototype.bind/);
});

test("application root delegates the dedicated agenda renderer to its planning module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-operational-pages-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ installStageOperationalPagesCompositionV1 \} from "\.\/components\/planning\/stage-operational-pages-composition-v1\.mjs\?v=stage-operational-pages-composition-v1"/);
  assert.match(composition, /import \{ createStageAgendaHelpersV1, createStageAgendaPageV1, installStageAgendaPageEventsV1 \} from "\.\/stage-agenda-page-v1\.mjs\?v=stage-agenda-page-v2"/);
  assert.match(composition, /agendaCalendarIsoV3:\s*\(\.\.\.args\)\s*=>\s*agendaCalendarIsoV3\(\.\.\.args\)/);
  assert.doesNotMatch(source, /const stageAgendaNextSlotV1 =/);
  assert.doesNotMatch(source, /const stageAgendaMaterialSidebarV1 =/);
  assert.match(composition, /ViewLayer\.prototype\.activityDedicatedPage = createStageAgendaPageV1\(\{/);
  assert.match(composition, /installStageAgendaPageEventsV1\(ViewLayer, \{/);
});
