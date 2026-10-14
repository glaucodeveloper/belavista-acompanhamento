import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOperationalIntelligenceCompositionV1 } from "../../components/planning/operational-intelligence-composition-v1.mjs";

const createComposition = (state) => {
  class ViewLayer {}
  const composition = createOperationalIntelligenceCompositionV1({
    ViewLayer,
    appStore: { get: () => state },
    extensionStage: () => ({ key: "stage-1", name: "Drenagem", progress: 42 }),
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify() {},
    browser: {
      Date,
      window: {},
      prompt: () => null,
      structuredClone: globalThis.structuredClone,
    },
  });
  return { ViewLayer, composition };
};

test("operational intelligence composes all planning pages over the shared state", () => {
  const agendaItem = {
    id: "agenda-1",
    title: "Liberar drenagem",
    status: "aguardando material",
    stageProgress: 40,
    kind: "execution",
    decisionBand: "material-block",
    logicalRequirements: ["validar tubo", null],
    materialShortfalls: [{ name: "Tubo PEAD" }],
    owner: "Equipe de campo",
    plannedStart: "2026-10-13",
    stageName: "Drenagem pluvial",
  };
  const { ViewLayer, composition } = createComposition({ operationalAgenda: [agendaItem] });

  assert.deepEqual(composition.operationalActions(), [{
    id: "agenda-1",
    label: "Liberar drenagem",
    impact: 92,
    readiness: 35,
    phase: 2,
    track: "Suprimento",
    owner: "Equipe de campo",
    eta: "2026-10-13",
    blocker: "validar tubo · Tubo PEAD",
    relation: "Drenagem pluvial",
    referenceDescription: "",
    requirements: [],
    materialRequirements: [],
  }]);
  assert.deepEqual(composition.currentPertNodes().filter(({ state }) => state === "done").map(({ id }) => id), ["scope", "survey"]);
  assert.equal(typeof composition.operationalRaid, "function");
  assert.equal(ViewLayer.prototype.pert instanceof Function, true);
  assert.equal(ViewLayer.prototype.actions, composition.actionsPageV1.render);
  assert.equal(ViewLayer.prototype.raci, composition.raciPageV1.render);
  assert.equal(ViewLayer.prototype.raid, composition.raidPageV1.render);
  assert.equal(Object.isFrozen(composition), true);
});

test("operational intelligence preserves saved-action and source-default fallbacks", () => {
  const savedAction = { id: "saved-1", label: "Ação persistida" };
  const saved = createComposition({ aiActions: [savedAction] }).composition.operationalActions();
  assert.deepEqual(saved, [savedAction]);
  assert.notEqual(saved[0], savedAction);

  const actions = createComposition({}).composition.operationalActions();
  const defaults = createComposition({}).composition.operationalActions();
  assert.equal(defaults.length, 5);
  assert.equal(defaults[0].id, "AI-A01");
  assert.notEqual(actions[0], defaults[0]);
});

test("components.js delegates the complete PERT/actions/RACI/RAID composition", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/planning/stage-application-composition-v1.mjs", import.meta.url), "utf8");

  assert.match(source, /installStageApplicationCompositionV1\(/);
  assert.match(composition, /createOperationalIntelligenceCompositionV1\(/);
  assert.match(source, /const \{ stageContextV1, stageViewTabs, extensionStage, operationalActions, currentPertNodes, actionsPageV1, raciPageV1, raidPageV1, operationalRaid \} = stageApplicationCompositionV1/);
  assert.match(composition, /return Object\.freeze\(\{ stageContextV1, stageViewTabs, extensionStage, \.\.\.intelligence \}\)/);
  assert.doesNotMatch(source, /const OPERATIONAL_ACTIONS = \[/);
  assert.doesNotMatch(source, /const PERT_GRAPH = \{/);
});
