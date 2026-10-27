import * as atlasProgramTsV1 from "../../dist/frontend/program.js";
import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import {
  brokerReasonsV9 as legacyBrokerReasonsV9,
  createBrokerControlPageV1 as legacyCreateBrokerControlPageV1,
} from "./broker-control-page-legacy-v1.mjs?v=broker-control-page-recovery-v1";

/** Use the program's typed reason projection while retaining the old model as recovery. */
export const brokerReasonsV9 = (state = {}) => {
  const project = atlasProgramTsV1.projectAtlasBrokerCommissionReasonsV1;
  return typeof project === "function" ? project(state) : legacyBrokerReasonsV9(state);
};

/** Use the typed component renderer when present; otherwise render the recovery page. */
export const createBrokerControlPageV1 = (dependencies = {}) => {
  const render = atlasComponentsTsV1.createAtlasBrokerControlPageV1;
  const input = { ...dependencies, brokerReasonsV9 };
  return typeof render === "function" ? render(input) : legacyCreateBrokerControlPageV1(input);
};
