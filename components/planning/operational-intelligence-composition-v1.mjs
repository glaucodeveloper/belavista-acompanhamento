import { createActionsPageV1 } from "./actions-page-v1.mjs?v=actions-page-v2";
import { createRaciPageV1 } from "./raci-page-v1.mjs?v=raci-page-v3-json-ts-workspace";
import { createRaidPageV1 } from "./raid-page-v1.mjs?v=raid-page-v2";
import { createPertNodeServiceV1, createPertPageRendererV1 } from "./pert-workspace-v1.mjs?v=pert-workspace-v3&ts-pert-workspace-v1&ts-operational-actions-v1";
import { projectAtlasOperationalActions } from "../../dist/frontend/program.js";
import PERT_GRAPH_DATA from "../../frontend/src/data/pert-graph.json" with { type: "json" };
import OPERATIONAL_ACTIONS_DATA from "../../frontend/src/data/operational-actions.json" with { type: "json" };

/** Compose the shared PERT, actions, RACI, and RAID projections over app state. */
export const createOperationalIntelligenceCompositionV1 = ({
  ViewLayer,
  appStore,
  demoData,
  extensionStage,
  esc,
  ico,
  notify,
  browser = globalThis,
} = {}) => {
  const OPERATIONAL_PHASES = OPERATIONAL_ACTIONS_DATA.phases;
  const ACTION_TRACK_STEPS = OPERATIONAL_ACTIONS_DATA.trackSteps;
  const PERT_GRAPH = PERT_GRAPH_DATA;
  const operationalActions = () => projectAtlasOperationalActions(appStore.get());

  const currentPertNodes = createPertNodeServiceV1({ appStore, graph: PERT_GRAPH });
  ViewLayer.prototype.pert = createPertPageRendererV1({
    graph: PERT_GRAPH,
    appStore,
    extensionStage,
    currentPertNodes,
    esc,
    ico,
  });

  const actionsPageV1 = createActionsPageV1({
    appStore,
    extensionStage,
    operationalActions,
    ACTION_TRACK_STEPS,
    OPERATIONAL_PHASES,
    esc,
    ico,
    notify,
    window: browser.window,
    getWorkerAssistant: () => browser.belavistaWorkerAssistant,
    Date: browser.Date,
  });

  const raciPageV1 = createRaciPageV1({
    appStore,
    extensionStage,
    esc,
    ico,
    notify,
    clone: (value) => browser.structuredClone(value),
  });
  ViewLayer.prototype.raci = raciPageV1.render;
  const raidPageV1 = createRaidPageV1({
    appStore,
    extensionStage,
    esc,
    ico,
    notify,
    prompt: (...args) => browser.prompt(...args),
    Date: browser.Date,
  });
  const operationalRaid = raidPageV1.operationalRaid;
  ViewLayer.prototype.raid = raidPageV1.render;

  return Object.freeze({
    operationalActions,
    currentPertNodes,
    actionsPageV1,
    raciPageV1,
    raidPageV1,
    operationalRaid,
  });
};
