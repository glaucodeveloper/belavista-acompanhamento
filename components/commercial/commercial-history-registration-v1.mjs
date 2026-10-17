import { createBrokerWorkspaceStatsV1, createCommercialDealsForWorkspaceV1 } from "./commercial-scope-v1.mjs?v=commercial-scope-v2";
import { createSalesHistoryPageV1, installCommercialHistoryPageEventsV1 } from "./sales-history-page-v1.mjs?v=sales-history-page-v1";
import { createBrokerDetailPageV1 } from "./broker-detail-page-v1.mjs?v=broker-detail-page-v1";
import { installSettingsCommercialWorkspaceV1 } from "./settings-commercial-workspace-v1.mjs?v=dynamic-access-roles-v1";

/** Register the broker detail, sales history, and commercial settings views. */
export const installCommercialHistoryRegistrationV1 = ({
  ViewLayer,
  appStore,
  commissionDeals,
  commissionNegotiationDealsV1,
  commissionNegotiationProfileV1,
  commissionNegotiationTransactionsV1,
  commissionAttachmentListV1,
  commissionProfiles,
  contractStatusClassV1,
  brokerReasonsV9,
  executionModel,
  apiFetch,
  brlToNumber,
  formatBRL,
  esc,
  ico,
  notify,
  settingsAuditTemplate,
  FormDataCtor = globalThis.FormData,
  windowRef = globalThis.window,
} = {}) => {
  const commercialDealsForWorkspaceV1 = createCommercialDealsForWorkspaceV1({
    commissionNegotiationDealsV1,
    commissionDeals,
  });
  const brokerWorkspaceStatsV1 = createBrokerWorkspaceStatsV1({ brlToNumber });

  ViewLayer.prototype["broker-detail"] = createBrokerDetailPageV1({
    appStore,
    commissionProfiles,
    commercialDealsForWorkspaceV1,
    brlToNumber,
    formatBRL,
    esc,
    ico,
  });
  ViewLayer.prototype["sales-history"] = createSalesHistoryPageV1({
    appStore,
    commercialDealsForWorkspaceV1,
    commissionNegotiationProfileV1,
    commissionNegotiationTransactionsV1,
    commissionAttachmentListV1,
    contractStatusClassV1,
    esc,
    formatBRL,
    brlToNumber,
    ico,
  });
  installCommercialHistoryPageEventsV1(ViewLayer, { appStore, windowRef });
  installSettingsCommercialWorkspaceV1(ViewLayer, {
    appStore,
    executionModel,
    apiFetch,
    esc,
    ico,
    notify,
    settingsAuditTemplate,
    FormDataCtor,
  });

  return Object.freeze({ commercialDealsForWorkspaceV1, brokerWorkspaceStatsV1 });
};
