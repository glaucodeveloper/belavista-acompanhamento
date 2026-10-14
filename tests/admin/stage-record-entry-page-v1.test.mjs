import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installStageRecordEntryPageV1 } from "../../components/records/stage-record-entry-page-v1.mjs";

const createHarness = (stateOverrides = {}) => {
  const patches = [];
  const state = {
    view: "records",
    selectedStage: "earth",
    stageRecordsContext: true,
    records: [
      { id: "REC-1", etapa: "Terraplenagem", atividade: "Corte", data: "2026-10-10", responsavel: "Equipe A", status: "Concluído" },
      { id: "REC-2", etapa: "Drenagem", atividade: "Tubulação", responsavel: "Equipe B" },
    ],
    ...stateOverrides,
  };
  const appStore = {
    get: () => state,
    set: (patch) => { patches.push(patch); Object.assign(state, patch); },
  };
  const stageButtons = [{ dataset: { recordStage: "water" }, addEventListener: (_, handler) => { stageButtons[0].click = handler; } }];
  const activityButtons = [{ dataset: { recordActivity: "Assentar tubulação" }, addEventListener: (_, handler) => { activityButtons[0].click = handler; } }];
  const newButton = { addEventListener: (_, handler) => { newButton.click = handler; } };
  class ViewLayer {
    bind() { this.baseBindCalled = true; }
    querySelectorAll(selector) {
      if (selector === "[data-record-stage]") return stageButtons;
      if (selector === "[data-record-activity]") return activityButtons;
      return [];
    }
    querySelector(selector) { return selector === "[data-records-entry-new]" ? newButton : null; }
  }
  const demoData = {
    activities: [
      { id: "earth", name: "Terraplenagem", progress: 68, owner: "Equipe A" },
      { id: "water", name: "Drenagem", progress: 42, owner: "Equipe B" },
    ],
  };
  const activityCatalog = [
    { name: "Terraplenagem · Corte e aterro", nature: "Movimentação de solo" },
    { name: "Assentar tubulação", nature: "Rede pluvial" },
  ];
  installStageRecordEntryPageV1(ViewLayer, {
    appStore,
    demoData,
    activityCatalog,
    esc: (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
  });
  return { ViewLayer, appStore, patches, stageButtons, activityButtons, newButton };
};

test("stage record entry renders selected stage, matching history, activity choices, and original form", () => {
  const { ViewLayer } = createHarness();
  const html = new ViewLayer().records();

  assert.match(html, /records-stage-page-v1/);
  assert.match(html, /REGISTROS · ETAPA EM FOCO/);
  assert.match(html, /Terraplenagem/);
  assert.match(html, /68%/);
  assert.match(html, /data-record-stage="water"/);
  assert.match(html, /Terraplenagem · Corte e aterro/);
  assert.match(html, /REC-1/);
  assert.doesNotMatch(html, /REC-2/);
  assert.match(html, /name="responsavel"/);
  assert.match(html, /name="evidenceUri"/);
  assert.match(html, /data-record-paint="new"/);
  assert.match(html, /name="status"/);
});

test("stage record entry binds stage, activity, and new-record actions to the original state transitions", () => {
  const { ViewLayer, appStore, patches, stageButtons, activityButtons, newButton } = createHarness();
  const view = new ViewLayer();
  view.bind();

  assert.equal(view.baseBindCalled, true);
  stageButtons[0].click();
  assert.deepEqual(patches.at(-1), {
    view: "records",
    selectedStage: "water",
    selectedStageV9: null,
    stageRecordsContext: true,
    editingRecord: null,
    recordContext: null,
    lastAction: "Selecionou a etapa Drenagem",
  });
  activityButtons[0].click();
  assert.deepEqual(patches.at(-1), {
    editingRecord: "new",
    recordContext: { atividade: "Assentar tubulação", stage: "Drenagem" },
    lastAction: "Preparou registro de Assentar tubulação",
  });
  newButton.click();
  assert.deepEqual(patches.at(-1), {
    editingRecord: "new",
    recordContext: null,
    lastAction: "Abriu formulário de novo registro",
  });
  assert.equal(appStore.get().view, "records");
});

test("application root delegates the final stage records page and its UI events to the module", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-pages-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installStagePagesApplicationCompositionV1\(\{/);
  assert.match(composition, /import \{ installStageRecordEntryPageV1 \} from "\.\.\/records\/stage-record-entry-page-v1\.mjs/);
  assert.match(composition, /installStageRecordEntryPageV1\(ViewLayer, \{ appStore, demoData, activityCatalog, esc, ico \}\)/);
  assert.doesNotMatch(source, /recordsStageEntryBaseV1|recordsStageEntryBindBaseV1|createOperationalRecordsPageV5360/);
  assert.doesNotMatch(source, /this\.querySelectorAll\("\[data-record-stage\]"\)/);
  assert.doesNotMatch(composition, /ViewLayer\.prototype\.records = function/);
});
