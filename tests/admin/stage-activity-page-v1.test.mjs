import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageActivityPageV1 } from "../../components/planning/stage-activity-page-v1.mjs";

const install = (state) => {
  class ViewLayer {}
  const stage = {
    key: "earth",
    name: "Terraplenagem",
    description: "Preparação do solo",
    dependsOn: ["survey"],
    production: { unit: "m³" },
    cashWeight: 0.2,
  };
  const packet = { key: "grade", label: "Regularizar solo", detail: "Conferir cotas", unit: "m³", trigger: "Cotas aprovadas" };
  const model = { stages: [stage] };
  installStageActivityPageV1(ViewLayer, {
    appStore: { get: () => state },
    executionModel: model,
    activityCatalog: [{ nature: "Campo", name: "Compactação", initial: ["frente"], execution: ["densidade"] }],
    extensionStage: () => ({ ...stage, week: "Semana 4", owner: "Equipe A", progress: 28 }),
    stageV9FlowPackets: () => [packet],
    stageV9ProfileFor: () => ({ typicalDescription: "Usar projeto executivo" }),
    stageV9LiveFor: () => ({ progress: 28, week: "Semana 4", owner: "Equipe A" }),
    stageV9MaterialsFor: () => [{ name: "Brita", quantity: 4, unit: "m³", status: "Planejado" }],
    stageV9BudgetFor: () => 12500,
    stageOf: (record) => record.etapa,
    stageV9ProductionFor: () => "4 m³",
    stageV9DirectiveText: () => "Diretriz da etapa",
    formatBRL: (amount) => `R$ ${amount}`,
    esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
    Date: class FixedDate extends Date { toISOString() { return "2026-10-12T12:00:00.000Z"; } },
  });
  return new ViewLayer();
};

test("stage activity route renders its contextual detail and delegates other activity views", () => {
  const view = install({
    stageActivityDedicatedV9: true,
    selectedActivity: "earth:grade",
    records: [{ etapa: "Terraplenagem", data: "2026-10-11", atividade: "Regularização", responsavel: "Equipe A", detalhes: "Cotas revisadas", status: "Concluído" }],
  });
  const html = view.activities();

  assert.match(html, /stage-v9-activity-detail/);
  assert.match(html, /Regularizar solo/);
  assert.match(html, /Cotas aprovadas/);
  assert.match(html, /R\$ 12500/);
  assert.match(html, /Brita/);
  assert.match(html, /Cotas revisadas/);
  assert.match(html, /data-activity-v9-back/);
  const catalog = install({ stageActivityDedicatedV9: false }).activities();
  assert.match(catalog, /activities-page/);
  assert.match(catalog, /data-activity-category="Campo"/);
  assert.match(catalog, /Compactação/);
});

test("stage activity route includes the new-record form only when its transient modal state is open", () => {
  const closed = install({ stageActivityDedicatedV9: true, selectedActivity: "earth:grade", records: [] }).activities();
  const open = install({ stageActivityDedicatedV9: true, selectedActivity: "earth:grade", activityRecordModalOpenV1: true, records: [] }).activities();

  assert.doesNotMatch(closed, /data-activity-record-modal/);
  assert.match(open, /data-activity-record-modal/);
  assert.match(open, /data-activity-record-attachments/);
  assert.match(open, /value="2026-10-12"/);
});

test("application root delegates stage activity rendering to its planning module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-operational-pages-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ installStageOperationalPagesCompositionV1 \}/);
  assert.match(source, /installStageOperationalPagesCompositionV1\(\{/);
  assert.match(composition, /installStageActivityPageV1\(ViewLayer, \{/);
  assert.match(composition, /activityCatalog,\s*extensionStage,/);
  assert.match(composition, /installStageActivityPageEventsV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /ViewLayer\.prototype\.activities = function/);
  const page = await readFile(new URL("../../components/planning/stage-activity-page-v1.mjs", import.meta.url), "utf8");
  assert.match(page, /const activitiesBeforeStagesV9 = ViewLayer\.prototype\.activities/);
  assert.match(page, /activityCatalog\.slice\(0, 11\)/);
  assert.doesNotMatch(page, /const bindBeforeStagesV9/);
});
