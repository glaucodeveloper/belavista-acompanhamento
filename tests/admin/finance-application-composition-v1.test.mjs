import test from "node:test";
import assert from "node:assert/strict";
import { installFinanceApplicationCompositionV1 } from "../../components/finance/finance-application-composition-v1.mjs";

test("finance application composition preserves runtime services, returns shared projections, and installs binders", () => {
  const state = { operationalAgenda: [], aiActions: [], records: [], view: "control" };
  const appStore = {
    get: () => state,
    set: (patch) => Object.assign(state, patch),
    update: (updater) => Object.assign(state, updater(state)),
  };
  const ViewLayer = function ViewLayer() {};
  ViewLayer.prototype.bind = function bind() {};
  ViewLayer.prototype.render = function render() { return "rendered"; };
  ViewLayer.prototype.addStageUtilities = function addStageUtilities() {};
  const documentRef = { createElement: () => ({}) };
  const globalRef = {
    Date,
    FileReader: function FileReader() {},
    CSS: { escape: (value) => value },
    URL: { createObjectURL: () => "blob:report", revokeObjectURL: () => {} },
    queueMicrotask,
    setTimeout,
  };
  const activity = { id: "stage-1", key: "stage-1", name: "Terraplanagem", week: "Semana 1", progress: 25, owner: "Equipe" };

  const composition = installFinanceApplicationCompositionV1({
    ViewLayer,
    appStore,
    demoData: { activities: [activity], collaborators: [] },
    executionModel: { stages: [activity] },
    commissionProfiles: [],
    commissionDeals: [],
    publishOperationalEvent: () => {},
    esc: (value) => String(value ?? ""),
    ico: (name) => name,
    notify: () => {},
    apiFetch: async () => ({}),
    apiUrl: (path) => path,
    downloadCsv: () => {},
    bindLeadsToolbarEventsV1: () => {},
    bindCommissionWorkspaceEventsV1: () => {},
    stageOverlayLabels: {},
    stageOverlayKey: () => "",
    stagePlanning: {
      buildStageTimeModels: () => [],
      formatHours: String,
      formatPlanningDate: String,
      activityCatalog: {},
      STAGE_WORK_PACKETS: [],
      WORKDAY_HOURS: 8,
      findStageTimeModel: () => null,
    },
    stageRecordReaders: {
      stageRecordStagesV1: () => [],
      stageRecordStageForV1: () => null,
      stageRecordServiceRowsV1: () => [],
      isAssistantVisualAdditionV1: () => false,
      controlCenterMaterialRowsV1: () => [],
    },
    reportCatalog: [],
    globalRef,
    documentRef,
    windowRef: {},
    confirmRef: () => true,
    EventCtor: class Event {},
    FormDataCtor: class FormData {},
  });

  assert.equal(composition.brlToNumber("R$ 1.234,56"), 1234.56);
  assert.equal(composition.formatBRL(120), "R$ 120,00");
  assert.equal(typeof composition.operationalHeaders, "function");
  assert.equal(typeof composition.brokersControlV8, "function");
  assert.equal(typeof composition.financeWorkspaceV8, "object");
  assert.equal(typeof composition.cashRecordLauncherMarkupV1, "function");
  assert.equal(typeof composition.bindControlPageEventsV8, "function");
  assert.equal(typeof composition.syncLiveSystemReportV1, "function");
  assert.equal(Object.isFrozen(composition), true);
  assert.notEqual(ViewLayer.prototype.bind, undefined);
});
