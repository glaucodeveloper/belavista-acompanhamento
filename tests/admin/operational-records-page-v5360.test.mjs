import assert from "node:assert/strict";
import test from "node:test";
import { createOperationalRecordsPageV5360 } from "../../components/records/operational-records-page-v5360.mjs";
import { createFinalOperationalRecordsPageV5360 } from "../../components/records/final-operational-records-page-v5360.mjs";
import { createFinalStageCalendarPageV5360 } from "../../components/planning/final-stage-calendar-page-v5360.mjs";
import {
  activityPeriodV5360,
  recordStageV5360,
  toneV5360,
} from "../../components/shared/final-workspace-formatters-v5360.mjs";

test("records page renderer preserves the empty-state route contract", () => {
  const render = createOperationalRecordsPageV5360({
    appStore: { get: () => ({ records: [], selectedStage: "" }) },
    demoData: { activities: [] },
    activityCatalog: [],
    esc: (value) => String(value ?? ""),
    ico: () => "",
    stageOf: (record) => record.etapa || "",
  });

  const html = render();

  assert.match(html, /class="records-stage-page-v1"/);
  assert.match(html, /Etapa não selecionada/);
  assert.match(html, /Nenhum registro desta etapa/);
});

test("final records page scopes the diary to the selected stage", () => {
  const render = createFinalOperationalRecordsPageV5360({
    appStore: {
      get: () => ({
        selectedStage: "earth",
        records: [
          { id: "r-earth", etapa: "earth", atividade: "Terraplenagem", status: "Concluído" },
          { id: "r-water", etapa: "water", atividade: "Rede de água", status: "Pendente" },
        ],
      }),
    },
    demoData: { activities: [{ id: "earth", name: "Terraplenagem" }, { id: "water", name: "Rede de água" }] },
    esc: (value) => String(value ?? ""),
    ico: () => "",
    recordStage: recordStageV5360,
    tone: toneV5360,
  });

  const html = render();

  assert.match(html, /Terraplenagem/);
  assert.match(html, /r-earth/);
  assert.doesNotMatch(html, /r-water/);
  assert.match(html, /<small>Registros<\/small><b>1<\/b>/);
});

test("final records page renders a selected record with evidence links", () => {
  const render = createFinalOperationalRecordsPageV5360({
    appStore: {
      get: () => ({
        selectedRecordV5360: "r-1",
        records: [{ id: "r-1", etapa: "earth", atividade: "Medição", evidenceUri: "/evidence/1", mapArea: "Lote 4" }],
      }),
    },
    demoData: { activities: [] },
    esc: (value) => String(value ?? ""),
    ico: () => "back-icon",
    recordStage: recordStageV5360,
    tone: toneV5360,
  });

  const html = render();

  assert.match(html, /class="record-page-v5360"/);
  assert.match(html, /data-v5360-record-back/);
  assert.match(html, /Lote 4/);
  assert.match(html, /href="\/evidence\/1"/);
});

test("final stage calendar preserves period grouping and stage-card hooks", () => {
  const render = createFinalStageCalendarPageV5360({
    demoData: {
      activities: [
        { id: "earth", name: "Terraplenagem", week: "Semana 1", status: "Em andamento", progress: 30 },
        { id: "drainage", name: "Drenagem", week: "Semana 1", status: "Planejada", progress: 0 },
      ],
    },
    esc: (value) => String(value ?? ""),
    tone: toneV5360,
    activityPeriod: activityPeriodV5360,
  });

  const html = render();

  assert.equal((html.match(/class="stage-period-v5360"/g) || []).length, 1);
  assert.match(html, /data-v5360-stage-card="earth"/);
  assert.match(html, /data-v5360-stage-card="drainage"/);
  assert.match(html, /width:30%/);
});
