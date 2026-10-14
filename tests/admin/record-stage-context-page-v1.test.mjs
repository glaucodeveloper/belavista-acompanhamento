import assert from "node:assert/strict";
import test from "node:test";
import { createStageRecordContextPageV1 } from "../../components/records/operational-records-page-v5360.mjs";

test("record page applies the selected stage context over the base renderer", () => {
  const args = [];
  const render = createStageRecordContextPageV1({
    baseRecordsPage(...values) {
      args.push({ receiver: this, values });
      return '<span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p>';
    },
    appStore: {
      get: () => ({ stageRecordsContext: true, selectedStage: "stage-1" }),
    },
    demoData: {
      activities: [{ id: "stage-1", name: "Terraplenagem" }],
    },
    esc: (value) => String(value).replaceAll("<", "&lt;"),
  });
  const receiver = {};

  const html = render.call(receiver, "render-context");

  assert.equal(args[0].receiver, receiver);
  assert.deepEqual(args[0].values, ["render-context"]);
  assert.match(html, /REGISTROS DA ETAPA · stage-1/);
  assert.match(html, /Registros · Terraplenagem/);
  assert.match(html, /vinculados exclusivamente a esta etapa/);
});

test("record page leaves the base renderer unchanged without a selected stage", () => {
  const baseHtml = "base records page";
  const render = createStageRecordContextPageV1({
    baseRecordsPage: () => baseHtml,
    appStore: { get: () => ({ stageRecordsContext: false }) },
    demoData: { activities: [] },
    esc: String,
  });

  assert.equal(render(), baseHtml);
});
