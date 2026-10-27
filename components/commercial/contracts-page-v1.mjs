/** TS-first compatibility adapter for the contracts and proposals page. */
import {
  installAtlasContractsPageV1,
  projectAtlasContractStatusClassV1,
} from "../../dist/frontend/components.js";
import {
  contractStatusClassV1 as contractStatusClassLegacyV1,
  installContractsPageV1 as installContractsPageLegacyV1,
} from "./contracts-page-legacy-v1.mjs?v=ts-contracts-page-adapter-v1";

export const contractStatusClassV1 = (status) =>
  typeof projectAtlasContractStatusClassV1 === "function"
    ? projectAtlasContractStatusClassV1(status)
    : contractStatusClassLegacyV1(status);

export const installContractsPageV1 = (ViewLayer, dependencies = {}) => {
  if (typeof installAtlasContractsPageV1 === "function")
    return installAtlasContractsPageV1(ViewLayer, dependencies);
  return installContractsPageLegacyV1(ViewLayer, dependencies);
};
