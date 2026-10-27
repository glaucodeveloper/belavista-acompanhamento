import * as atlasComponentsTsV1 from "../../dist/frontend/components.js";
import {
  createOperationalMapPageV1 as createLegacyOperationalMapPageV1,
  installOperationalMapPageV1 as installLegacyOperationalMapPageV1,
} from "./operational-map-page-legacy-v1.mjs?v=operational-map-page-recovery-v1";

const validate = ({ appStore, highlightStatus, esc } = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Operational map page requires appStore.get().");
  if (!highlightStatus || typeof highlightStatus !== "object")
    throw new TypeError("Operational map page requires the highlight status catalog.");
  if (typeof esc !== "function")
    throw new TypeError("Operational map page requires esc().");
};

/** Render the active operational map using the TypeScript component owner. */
export const createOperationalMapPageV1 = (input = {}) => {
  validate(input);
  const createTyped = atlasComponentsTsV1.createAtlasOperationalMapPageV1;
  if (typeof createTyped === "function") return createTyped(input);
  return createLegacyOperationalMapPageV1(input);
};

/** Install the typed renderer on the shared view layer, preserving recovery. */
export const installOperationalMapPageV1 = (ViewLayer, dependencies = {}) => {
  validate(dependencies);
  const installTyped = atlasComponentsTsV1.installAtlasOperationalMapPageV1;
  if (typeof installTyped === "function") return installTyped(ViewLayer, dependencies);
  return installLegacyOperationalMapPageV1(ViewLayer, dependencies);
};
