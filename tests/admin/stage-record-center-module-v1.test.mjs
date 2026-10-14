import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStageRecordServicesV1, installStageRecordCenterModalCaptureV1, installStageRecordCenterV1 } from "../../components/records/stage-record-center-v1.mjs";

test("stage record modal capture keeps delegated OCR-row inspection in the records module", async () => {
  const state = {}, writes = [], listeners = new Map(), inserted = [], shown = [], host = {},
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    dialog = {
      showModal() { shown.push("showModal"); },
      setAttribute(name, value) { shown.push([name, value]); },
    },
    document = {
      body: { insertAdjacentHTML: (...args) => inserted.push(args) },
      addEventListener: (type, handler, capture) => listeners.set(`${type}:${capture}`, handler),
      removeEventListener: (type, handler, capture) => {
        if (listeners.get(`${type}:${capture}`) === handler) listeners.delete(`${type}:${capture}`);
      },
      querySelector: (selector) => selector === "dialog[data-stage-center-item-dialog]" && inserted.length ? dialog : null,
    },
    dispose = installStageRecordCenterModalCaptureV1({
      host,
      document,
      appStore,
      stageRecordStagesV1: () => [{ key: "drain" }],
      stageRecordMaterialRowsV1: (current) => current.materials || [],
      stageRecordServiceRowsV1: (current) => current.services || [],
      stageRecordCenterItemModalMarkupV1: (current, materials, services, stages) =>
        current.controlStageCenterItemModalKey === "material:1" && materials.length === 1 &&
          services.length === 0 && stages.length === 1
          ? '<dialog data-stage-center-item-dialog></dialog>'
          : "",
      setTimeoutFn: (callback) => callback(),
    }),
    clickTarget = {
      dataset: { stageCenterItemOpen: "material:1" },
      closest(selector) { return selector === "[data-stage-center-item-open]" ? this : null; },
    };

  state.materials = [{ id: "material-1" }];
  listeners.get("click:true")({ target: clickTarget });
  assert.equal(state.controlStageCenterItemModalKey, "material:1");
  assert.equal(writes[0].lastAction, "Abriu as propriedades da adição material:1");
  assert.equal(inserted[0][0], "beforeend");
  assert.deepEqual(shown, ["showModal"]);

  dispose();
  assert.equal(listeners.size, 0);
  assert.equal(host.__BELAVISTA_STAGE_RECORD_MODAL_CAPTURE_V1, undefined);

  const components = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/records/record-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(components, /__BELAVISTA_STAGE_RECORD_MODAL_CAPTURE_V1/);
  assert.match(composition, /document: documentRef/);
});

test("stage record services preserve stage matching, attachment normalization, and OCR estimate semantics", () => {
  const stage = {
    key: "drainage",
    name: "Drenagem pluvial",
    production: { unit: "m", rate: 18, quantity: 90 },
  };
  const services = createStageRecordServicesV1({
    executionModel: { stages: [stage] },
    demoData: { activities: [] },
    controlCenterMaterialRowsV1: (state) => state.materialRows,
    stageV9LiveFor: () => ({ progress: 44 }),
  });

  assert.equal(services.stageRecordNormalizeV1("DRENAGEM Pluvial"), "drenagem pluvial");
  assert.equal(services.stageRecordStagesV1()[0], stage);
  assert.equal(services.stageRecordStageForV1({ activityStage: "Drenagem pluvial" }, [stage]), stage);
  assert.equal(services.stageRecordProgressV1(stage, {}), 44);
  assert.deepEqual(services.stageRecordMaterialRowsV1({ materialRows: [{ id: "MAT-1" }] }), [{ id: "MAT-1" }]);
  assert.equal(services.stageRecordEstimateMatchesV1("Tubos PVC 100 mm", "Tubo PVC 100 mm"), true);
  assert.equal(services.stageRecordEstimateKindV1({ name: "Escavadeira hidráulica" }), "equipment");
  assert.equal(services.stageRecordEstimateNumberV1("1.234,5"), 1234.5);
  assert.equal(services.stageRecordEstimateFormatV1(null), "A dimensionar");
  assert.deepEqual(services.stageRecordAttachmentsV1({
    properties: [
      { id: "allocation_attachment_url", value: "/records/proof.pdf" },
      { id: "allocation_attachment", value: "proof.pdf" },
      { id: "allocation_attachment_mime", value: "application/pdf" },
    ],
  }), [{
    label: "proof.pdf",
    url: "/records/proof.pdf",
    meta: "application/pdf",
  }]);
});

test("stage record center installs its existing control and bind extensions through injected dependencies", () => {
  class ViewLayer {
    control() { return "base-control"; }
    bind() { return "base-bind"; }
  }
  const dependencies = {
    REPASSE_PRICE_CATALOG: [],
    appStore: { get: () => ({ view: "stages" }), set() {}, subscribe: () => () => {} },
    defaultStageMaterialRows: () => [],
    demoData: { activities: [] },
    esc: (value) => String(value ?? ""),
    formatBRL: (value) => String(value),
    ico: () => "",
    isAssistantVisualAdditionV1: () => false,
    renderStageHomePageV1: () => "",
    stageContextV1: () => ({}),
    stageHomeSnapshotV1: () => ({}),
    stageRecordAttachmentsV1: () => [],
    stageRecordEstimateFormatV1: String,
    stageRecordEstimateKindV1: () => "material",
    stageRecordEstimateMatchesV1: () => false,
    stageRecordEstimateNumberV1: Number,
    stageRecordMaterialRowsV1: () => [],
    stageRecordNormalizeV1: (value) => String(value ?? "").toLowerCase(),
    stageRecordProgressV1: () => 0,
    stageRecordPropertiesV1: () => [],
    stageRecordStageForV1: () => null,
    stageRecordStagesV1: () => [],
    stageRecordStatusLabelV1: (value) => String(value ?? ""),
    stageViewTabs: () => "",
    notify() {},
  };

  const installed = installStageRecordCenterV1(ViewLayer, dependencies);

  assert.equal(typeof installed.stageMaterialReportDialogV1, "function");
  assert.equal(typeof installed.stageMaterialReportBindV1, "function");
  assert.equal(typeof installed.stageRecordCenterItemModalMarkupV1, "function");
  assert.equal(typeof installed.stageHomeRecordResourcesMarkupV1, "function");
  assert.equal(typeof installed.stageHomePageMarkupV1, "function");
  assert.equal(typeof installed.stageRecordDashboardActionWorkspaceMarkupV1, "function");
  assert.notEqual(ViewLayer.prototype.control.name, "control");
  assert.notEqual(ViewLayer.prototype.bind.name, "bind");
});

test("record application composition installs the center and returns its shared page ports", async () => {
  const [components, composition] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/records/record-application-composition-v1.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(components, /installRecordApplicationCompositionV1\(\{/);
  assert.match(composition, /installStageRecordCenterV1\(ViewLayer, \{/);
  assert.match(composition, /document: documentRef/);
  assert.match(components, /stageRecordServiceRowsV1,[\s\S]*?stageRecordDashboardActionWorkspaceMarkupV1,[\s\S]*?= recordApplicationV1/);
});
