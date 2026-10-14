import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installRecordApplicationCompositionV1 } from "../../components/records/record-application-composition-v1.mjs";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("record category installers move together without changing bootstrap order", async () => {
  const [components, composition] = await Promise.all([
    read("components.js"),
    read("components/records/record-application-composition-v1.mjs"),
  ]);
  const orderedCalls = [
    "createStageRecordServicesV1({",
    "installStageRecordCenterV1(ViewLayer, {",
    "installLotDetailEventsV1(ViewLayer, {",
    "installRecordOcrDynamicBridgeV21({",
  ];
  const positions = orderedCalls.map((call) => composition.indexOf(call));

  assert.match(components, /installRecordApplicationCompositionV1\(\{/);
  assert.match(components, /\} = recordApplicationV1/);
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  for (const call of orderedCalls) assert.equal(components.includes(call), false, `${call} remains in components.js`);
});

test("record composition retains live stores, models, services, and the OCR bridge contract", async () => {
  const [components, composition] = await Promise.all([
    read("components.js"),
    read("components/records/record-application-composition-v1.mjs"),
  ]);

  for (const dependency of [
    "appStore", "executionModel", "demoData", "apiFetch", "operationalHeaders",
    "stageProfileSettingsFor", "host: globalThis", "documentRef: globalThis.document",
  ]) assert.ok(components.includes(dependency), `components.js omits ${dependency}`);
  for (const dependency of [
    "controlCenterMaterialRowsV1", "stageV9LiveFor", "commissionProfiles",
    "prepareAssistantLotStatusPromptV1", "document: documentRef", "stageRecordServicesV1",
    "stageRecordCenterModulesV1", "recordOcrBridgeV1",
  ]) assert.ok(composition.includes(dependency), `record composition omits ${dependency}`);
});

test("record composition runs the real installers and publishes the same OCR stage context", () => {
  const originalDocument = globalThis.document,
    originalSubmitFallback = globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__,
    listeners = new Map(),
    documentRef = {
      addEventListener: (type, handler, capture) => listeners.set(`${type}:${capture}`, handler),
      removeEventListener: (type, handler, capture) => {
        if (listeners.get(`${type}:${capture}`) === handler) listeners.delete(`${type}:${capture}`);
      },
      body: { classList: { add() {}, remove() {} } },
    },
    host = {},
    stage = { key: "drain", name: "Drenagem", activities: [{ id: "pipe", name: "Instalar tubos" }] };
  globalThis.document = documentRef;
  delete globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__;

  class ViewLayer {
    control() { return "control"; }
    bind() { return "bind"; }
  }
  const appStore = { get: () => ({}), set() {}, subscribe: () => () => {} };
  try {
    const result = installRecordApplicationCompositionV1({
      ViewLayer,
      REPASSE_PRICE_CATALOG: [],
      apiFetch: async () => ({ ok: true }),
      appStore,
      commissionProfiles: [],
      controlCenterMaterialRowsV1: () => [],
      defaultStageMaterialRows: () => [],
      demoData: { activities: [] },
      downloadBrandedLotExcelV1() {},
      esc: (value) => String(value ?? ""),
      executionModel: { stages: [stage] },
      formatBRL: String,
      ico: () => "",
      isAssistantVisualAdditionV1: () => false,
      lotExportRowV1: (lot) => lot,
      notify() {},
      operationalHeaders: () => ({}),
      prepareAssistantLotStatusPromptV1() {},
      renderStageHomePageV1: () => "",
      stageContextV1: () => ({}),
      stageHomeSnapshotV1: () => ({}),
      stageProfileSettingsFor: () => ({}),
      stageViewTabs: () => "",
      stageV9LiveFor: () => ({}),
      host,
      documentRef,
    });

    assert.equal(typeof result.stageRecordStagesV1, "function");
    assert.equal(typeof result.stageRecordServiceRowsV1, "function");
    assert.equal(typeof result.stageRecordCenterItemModalMarkupV1, "function");
    assert.deepEqual(host.__BELAVISTA_RECORD_OCR_BRIDGE_V21.stages[0].activities, [
      { id: "pipe", name: "Instalar tubos", description: "" },
    ]);
    assert.equal(typeof ViewLayer.prototype.control, "function");
    assert.equal(typeof ViewLayer.prototype.bind, "function");
    assert.ok(listeners.has("submit:undefined"));
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalSubmitFallback === undefined) delete globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__;
    else globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__ = originalSubmitFallback;
  }
});
