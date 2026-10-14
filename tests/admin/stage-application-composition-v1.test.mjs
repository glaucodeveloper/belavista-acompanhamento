import test from "node:test";
import assert from "node:assert/strict";
import { installStageApplicationCompositionV1 } from "../../components/planning/stage-application-composition-v1.mjs";

const demoData = {
  activities: [
    { id: "stage-1", key: "stage-1", name: "Terraplanagem", week: "Semana 1", progress: 25, owner: "Equipe" },
    { id: "stage-2", key: "stage-2", name: "Drenagem", week: "Semana 2", progress: 0, owner: "Equipe" },
  ],
  collaborators: [],
};

test("instala a composição de etapas preservando ordem do bootstrap e dependências", () => {
  const appStore = {
    get: () => ({ selectedStage: "stage-2", records: [], aiActions: [], operationalAgenda: [] }),
    set: () => {},
  };
  const ViewLayer = function ViewLayer() {};
  ViewLayer.prototype.bind = function bind() { return "base-bind"; };
  const globalRef = {
    Date,
    window: {},
    structuredClone: (value) => structuredClone(value),
    prompt: () => null,
  };
  let callbackSnapshot;

  const composition = installStageApplicationCompositionV1({
    ViewLayer,
    appStore,
    demoData,
    executionModel: { stages: demoData.activities },
    activityCatalog: {},
    esc: (value) => String(value ?? ""),
    ico: (name) => name,
    notify: () => {},
    runtimeRouteV1: () => "",
    apiFetch: async () => ({}),
    operationalHeaders: () => ({}),
    windowRef: globalRef.window,
    globalRef,
    installLeadsPages: () => {
      callbackSnapshot = {
        actions: typeof ViewLayer.prototype.actions,
        progress: typeof ViewLayer.prototype.progress,
        drag: typeof ViewLayer.prototype.bindDashboardCardDrag,
      };
    },
  });

  assert.deepEqual(callbackSnapshot, { actions: "function", progress: "function", drag: "undefined" });
  assert.equal(composition.stageContextV1().model.name, "Drenagem");
  assert.equal(composition.stageContextV1().record.name, "Drenagem");
  assert.equal(typeof composition.stageViewTabs, "function");
  assert.equal(typeof ViewLayer.prototype.bindDashboardCardDrag, "function");
  assert.equal(typeof ViewLayer.prototype.bindStageExtensions, "function");
  assert.equal(typeof ViewLayer.prototype.bind, "function");
  assert.equal(Object.isFrozen(composition), true);
});
