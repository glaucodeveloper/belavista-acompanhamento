import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createControlStageContextV1 } from "../../components/records/control-stage-context-v1.mjs";

const createContext = (integrationSettings = {}) =>
  createControlStageContextV1({
    readIntegrationSettings: () => integrationSettings,
    normalizeStageMaterialRows: (rows, defaults) => rows || defaults,
    defaultStageMaterialRows: (stage) => stage.materials || [],
    stageV9LiveFor: (stage) => ({
      owner: stage.owner,
      progress: stage.progress || 0,
    }),
    stageV9StatusFor: (live) =>
      live.progress >= 100 ? "Concluída" : "Em andamento",
    esc: (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
    STAGE_WORKBENCH: [
      { key: "stage-1", activities: [{ title: "Compactação" }] },
    ],
    workbenchStageFromValueV1: () => null,
    splitStageConfigList: (value) =>
      String(value || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
  });

test("stage context markup preserves selected stage, operational profile and material controls", () => {
  const context = createContext({
      stageProfiles: {
        "stage-1": { typicalDescription: "Camadas compactadas" },
      },
    }),
    stage = {
      key: "stage-1",
      name: "Terraplanagem",
      priority: "Alta",
      progress: 35,
      executionProfile: {
        requirements: ["Compactar subleito"],
        materialsTable: [
          { name: "Brita", quantity: 2, unit: "m³", status: "Planejado" },
        ],
      },
    },
    markup = context.controlStageContextMarkupV1(
      { selectedPlanningStage: "stage-1" },
      [stage],
    );

  assert.match(markup, /data-control-stage-context-form="stage-1"/);
  assert.match(markup, /Compactar subleito/);
  assert.match(markup, /name="materialName" value="Brita"/);
  assert.match(markup, /name="typicalDescription"[^>]*>Camadas compactadas/);
  assert.match(
    context.controlStageUnifiedFormMarkupV1(
      { selectedPlanningStage: "stage-1" },
      [stage],
    ),
    /data-inline-record-activity>.*Compactação/,
  );
});

test("stage context payload retains operational fields and row-based material definitions", () => {
  const context = createContext(),
    values = {
      requirements: "Compactar\nConferir nível",
      conditions: "Laudo aprovado",
      typicalDescription: "Executar por camadas",
      organizationRequest: "Priorize pendências",
      organizationContext: "Sem bloquear drenagem",
      requestHints: "Solicitar brita",
      evidenceFocus: "Foto georreferenciada",
      procurementFocus: "Verificar estoque",
      productionQuantity: "250",
      productionUnit: "m³",
      productionRate: "20",
      productionRateUnit: "m³/dia",
      notifyOwner: "owner-a, owner-b",
      notifyAdmin: "admin-a",
      notifyForeman: "foreman-a",
    },
    materialRow = {
      querySelector: (selector) => {
        const name = selector.match(/name="([^"]+)/)?.[1];
        return {
          value:
            {
              materialName: "Brita",
              materialDescription: "Base",
              materialQuantity: "3",
              materialUnit: "m³",
              materialStatus: "Planejado",
            }[name] || "",
        };
      },
    },
    form = {
      querySelector: (selector) => {
        const name = selector.match(/name="([^"]+)/)?.[1];
        return { value: values[name] || "" };
      },
      querySelectorAll: () => [materialRow],
    },
    payload = context.controlStageContextPayloadV1(form);

  assert.deepEqual(payload.requirements, ["Compactar", "Conferir nível"]);
  assert.equal(payload.production.quantity, 250);
  assert.deepEqual(payload.materialsTable, [
    {
      name: "Brita",
      description: "Base",
      quantity: "3",
      unit: "m³",
      status: "Planejado",
    },
  ]);
  assert.deepEqual(payload.notificationTargets, {
    owner: ["owner-a, owner-b"],
    admin: ["admin-a"],
    foreman: ["foreman-a"],
  });
});

test("control center bootstrap injects the existing stage and material services", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/control-center-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installControlCenterApplicationCompositionV1\(/);
  assert.match(composition, /createControlStageContextV1\(\{/);
  assert.match(composition, /normalizeStageMaterialRows: stageContext\.normalizeStageMaterialRows/);
  assert.match(composition, /stageV9LiveFor: stageContext\.stageV9LiveFor/);
  assert.match(composition, /controlStageUnifiedFormMarkupV1/);
  assert.match(composition, /controlStageContextPayloadV1/);
});
