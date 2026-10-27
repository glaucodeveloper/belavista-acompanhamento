import { installContractsPageV1 } from "./contracts-page-v1.mjs?v=contracts-page-ts-first-v1";
import { installAtlasContractsPageV1 } from "../../dist/frontend/components.js";

/** Install the contract/proposal route; the broker directory is owned by the TS sidebar program. */
export const installCommercialDirectoryContractsRegistrationV1 = ({
  ViewLayer,
  appStore,
  commissionProfiles,
  commissionDeals,
  normalizeOperationalRole,
  esc,
  ico,
  notify,
  commercialScopeV1,
  brlToNumber,
  formatBRL,
  readProposalImageAsDataUrl,
  PROPOSAL_VISION_PROMPT,
  parseProposalVisionPayload,
  saveOperationalProposal,
  host = globalThis,
} = {}) => {
  const contractPageDependencies = {
    appStore,
    normalizeOperationalRole,
    commissionProfiles,
    commissionDeals,
    esc,
    ico,
    notify,
    commercialScopeV1,
    brlToNumber,
    formatBRL,
    readProposalImageAsDataUrl,
    PROPOSAL_VISION_PROMPT,
    parseProposalVisionPayload,
    saveOperationalProposal,
    fetch: host.fetch.bind(host),
    document: host.document,
    HTMLSelectElement: host.HTMLSelectElement,
    Option: host.Option,
    Event: host.Event,
    FormData: host.FormData,
    Blob: host.Blob,
    URL: host.URL,
    setTimeout: host.setTimeout.bind(host),
  };
  if (typeof installAtlasContractsPageV1 === "function")
    installAtlasContractsPageV1(ViewLayer, contractPageDependencies);
  else installContractsPageV1(ViewLayer, contractPageDependencies);
};
