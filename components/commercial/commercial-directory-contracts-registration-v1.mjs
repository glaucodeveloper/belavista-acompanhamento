import { installBrokersPageV1 } from "./brokers-page.mjs?v=brokers-page-v4";
import { installContractsPageV1 } from "./contracts-page-v1.mjs?v=contracts-page-v1";

/** Install the broker directory and contract/proposal routes in source order. */
export const installCommercialDirectoryContractsRegistrationV1 = ({
  ViewLayer,
  appStore,
  commissionProfiles,
  commissionDeals,
  commercialDealsForWorkspaceV1,
  brokerWorkspaceStatsV1,
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
  installBrokersPageV1(ViewLayer, {
    appStore,
    commissionProfiles,
    commercialDealsForWorkspaceV1,
    brokerWorkspaceStatsV1,
    brlToNumber,
    formatBRL,
    esc,
    ico,
  });

  installContractsPageV1(ViewLayer, {
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
  });
};
