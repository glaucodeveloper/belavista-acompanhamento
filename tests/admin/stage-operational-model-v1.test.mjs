import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStageOperationalModelV1 } from "../../components/planning/stage-operational-model-v1.mjs";

const stage = {
  id: "stage-earth",
  key: "earth",
  name: "Terraplenagem",
  cashWeight: 0.2,
  production: { quantity: 180, unit: "m³", rate: 30, rateUnit: "m³/dia" },
  materials: ["Brita", "Geotêxtil"],
  executionProfile: { requirements: ["Projeto executivo"] },
};

const model = () => createStageOperationalModelV1({
  appStore: { get: () => ({ operationalState: { stages: [{ key: "earth", needCents: 125000 }] } }) },
  demoData: { activities: [{ id: "stage-earth", progress: 28, owner: "Equipe A" }] },
  executionModel: { stages: [stage] },
  stageOverlayKey: (name) => String(name || "").toLowerCase(),
  stageProfileSettingsFor: () => ({ typicalDescription: "Compactar e aferir" }),
  stageMaterialsFor: () => [],
  esc: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
});

test("stage model resolves current state, overlays, profiles, materials, and operational budget", () => {
  const services = model();
  assert.equal(services.stageOf({ etapa: "Terraplenagem" }), "Terraplenagem");
  assert.equal(services.stageV9LiveFor(stage).progress, 28);
  assert.equal(services.stageV9ByState({ selectedStageV9: "earth" }), stage);
  assert.deepEqual(services.stageV9OperationalFor(stage), { key: "earth", needCents: 125000 });
  assert.deepEqual(services.stageV9ProfileFor(stage), {
    requirements: ["Projeto executivo"],
    typicalDescription: "Compactar e aferir",
  });
  assert.deepEqual(services.stageV9MaterialsFor(stage), [
    { name: "Brita", scope: "Requisito operacional", quantity: null, unit: "—", status: "Principal" },
    { name: "Geotêxtil", scope: "Requisito operacional", quantity: null, unit: "—", status: "Planejado" },
  ]);
  assert.equal(services.stageV9BudgetFor(stage), 1250);
  assert.equal(services.stageV9ProductionFor(stage), "180 m³ · 30 m³/dia");
  assert.equal(services.stageV9StatusFor({ progress: 28 }), "Em andamento");
  assert.match(services.stageV9DirectiveText(stage, {}), /terraplenagem/);
});

test("stage model preserves flow packet and escaping contracts", () => {
  const services = model();
  assert.deepEqual(services.stageV9FlowPackets(stage).map(({ key }) => key), ["front", "execute", "measure", "release"]);
  assert.equal(services.stageV9FlowPackets(stage)[1].unit, "m³/dia");
  assert.equal(services.stageV9EscList(["<evidência>"]), "<li>&lt;evidência&gt;</li>");
  assert.equal(services.stageV9EscList([], "Sem requisitos"), "<li>Sem requisitos</li>");
  assert.match(services.stageV9TreeNode("<kind>", "Título", "Detalhe"), /&lt;kind&gt;/);
});

test("stage operational model requires its application model and query ports", () => {
  assert.throws(() => createStageOperationalModelV1({}), /requires appStore\.get\(\)/);
  assert.throws(() => createStageOperationalModelV1({ appStore: { get() {} } }), /requires executionModel\.stages/);
});

test("application root delegates stage operational services to planning", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /installStageOperationalPagesCompositionV1\(\{/);
  assert.doesNotMatch(source, /import \{ createStageOperationalModelV1 \}/);
  assert.doesNotMatch(source, /const stageV9LiveFor =/);
  assert.doesNotMatch(source, /const stageV9FlowPackets =/);
});
