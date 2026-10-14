import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStageContextMarkupV1 } from "../../components/planning/stage-context-markup-v1.mjs";

const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const normalizeStageMaterialRows = (rows = [], fallback = []) =>
  (rows.length ? rows : fallback).map((row) => ({
    name: row.name || "",
    description: row.description || "",
    quantity: row.quantity ?? "",
    unit: row.unit || "un",
    status: row.status || "Planejado",
  }));

test("stage context markup applies current settings over execution defaults", () => {
  const stage = {
    key: "water",
    name: "Rede de Água",
    executionProfile: {
      typicalDescription: "Padrão da etapa",
      materialsTable: [{ name: "Base", description: "default" }],
    },
  };
  const dependencies = {
    appStore: { get: () => ({ integrationSettings: { stageProfiles: { water: { typicalDescription: "Atualização operacional", requestHints: ["Rede"], notificationTargets: { owner: ["Dono"] } } } } }) },
    defaultStageMaterialRows: () => [{ name: "Tubo", description: "PEAD", quantity: 4, unit: "m" }],
    demoData: { stageMaterials: { "Rede de Água": [{ name: "Tubo", quantity: 4, unit: "m", scope: "Ramal", status: "Planejado", targetLots: 2 }] } },
    esc,
    executionModel: { stages: [stage] },
    ico: (name) => `[${name}]`,
    normalizeStageMaterialRows,
    readIntegrationSettings: () => ({ stageProfiles: { water: { typicalDescription: "Perfil externo" } } }),
    stageOverlayKey: (name) => String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("agua") ? "rede-agua" : "drenagem",
  };
  const service = createStageContextMarkupV1(dependencies);
  const markup = service.stagePlanningMarkup({ name: "Rede de Agua" });

  assert.equal(service.executionStageByName("Rede de Agua"), stage);
  assert.match(markup, /data-stage-context-form="water"/);
  assert.match(markup, /Atualização operacional/);
  assert.doesNotMatch(markup, /Perfil externo/);
  assert.match(markup, /value="Dono"/);
  assert.match(markup, /value="Base"/);
  assert.match(service.stageMaterialsMarkup("Rede de Água"), /2 lotes/);
  assert.equal(service.stageMaterialsMarkup("Etapa sem materiais"), "");
});

test("components shell composes stage context services from the planning module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../../components/planning/planning-runtime-context-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /planning-runtime-context-v1\.mjs\?v=planning-runtime-context-v1/);
  assert.match(runtime, /createStageContextMarkupV1\(\{[\s\S]*?appStore,[\s\S]*?executionModel,[\s\S]*?stageOverlayKey,[\s\S]*?\}\)/);
});
