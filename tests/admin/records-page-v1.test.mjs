import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installRecordsPageV1 } from "../../components/records/records-page-v1.mjs";

const createHarness = () => {
  const state = {
    records: [
      {
        id: "REC-1",
        atividade: "Assentar tubulação",
        etapa: "Drenagem",
        responsavel: "Equipe A",
        status: "Pendente",
        evidenceUri: "r2://records/private/evidence.jpg",
      },
    ],
    recordFilters: { entity: "records" },
    selectedRecord: "REC-1",
  };
  const appStore = { get: () => state, set: (patch) => Object.assign(state, patch) };
  class ViewLayer {
    querySelector() { return null; }
  }
  installRecordsPageV1(ViewLayer, {
    appStore,
    demoData: {
      activities: [{ name: "Drenagem" }],
      collaborators: [["Equipe A"]],
      purchases: [],
    },
    activityCatalog: [
      {
        name: "Assentar tubulação",
        nature: "Rede pluvial",
        initial: ["Trecho"],
        execution: ["Medição"],
      },
    ],
    esc: (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
    notify: () => {},
    apiFetch: () => Promise.reject(new Error("not used by renderer")),
  });
  return { ViewLayer };
};

test("operational records page retains filtering, drill-in, protected evidence, and map actions", () => {
  const { ViewLayer } = createHarness();
  const html = new ViewLayer().records();

  assert.match(html, /data-record-filter="entity"/);
  assert.match(html, /data-record-open="REC-1"/);
  assert.match(html, /data-record-evidence-key="private\/evidence\.jpg"/);
  assert.match(html, /data-record-paint="new"/);
  assert.match(html, /class="record-form"/);
});

test("application composes the final stage records page instead of mounting the superseded base renderer", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const module = await readFile(new URL("../../components/records/records-page-v1.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(source, /installRecordsPageV1|createStageRecordContextPageV1|recordsStageContextFinalBaseV1/);
  assert.match(source, /installStageRecordEntryPageV1\(ViewLayer, \{ appStore, demoData, activityCatalog, esc, ico \}\)/);
  assert.match(module, /ViewLayer\.prototype\.records = function/);
  assert.match(module, /ViewLayer\.prototype\.bindRecords = function/);
  assert.match(module, /data-record-camera-input/);
  assert.match(module, /data-record-context-fields/);
  assert.match(module, /apiFetch\(`\/api\/media\/attachment\?key=/);
});
