import { createCommissionNegotiationViewsV1 } from "./commission-negotiation-views-v1.mjs?v=commission-negotiation-views-v1";
import { installLegacyBrokersBoardV1 } from "./legacy-brokers-board-v1.mjs?v=legacy-brokers-board-v1";
import { createLotDetailPageV1 } from "../lots/lot-detail-page-v1.mjs?v=lot-detail-page-v1";
import { installCommercialViewsBindV1 } from "./commercial-views-bind-v1.mjs?v=commercial-views-bind-v1";

/** Compose commission negotiations, broker cards, lot detail and shared events. */
export const installCommercialApplicationCompositionV1 = ({
  ViewLayer,
  appStore,
  commissionDeals,
  commissionProfiles,
  repassePriceCatalog,
  esc,
  ico,
  formatBRL,
  brlToNumber,
  contractStatusClassV1,
  apiFetch,
  operationalHeaders,
  notify,
  prepareAssistantLotStatusPromptV1,
  globalRef = globalThis,
} = {}) => {
  const negotiation = createCommissionNegotiationViewsV1({
    appStore,
    apiFetch,
    commissionDeals,
    commissionProfiles,
    esc,
    ico,
    formatBRL,
    brlToNumber,
    contractStatusClassV1,
    FileReader: globalRef.FileReader,
    Date: globalRef.Date,
    FormData: globalRef.FormData,
    operationalHeaders,
    notify,
    windowRef: globalRef.window,
    logger: globalRef.console,
  });
  ViewLayer.prototype["commission-deal"] = negotiation.commissionDealMarkupV1;

  installLegacyBrokersBoardV1(ViewLayer, {
    appStore,
    commissionProfiles,
    esc,
    formatBRL,
    ico,
  });

  const lotDetailPageV1 = createLotDetailPageV1({
    REPASSE_PRICE_CATALOG: repassePriceCatalog,
    appStore,
    commissionProfiles,
    esc,
    formatBRL,
    ico,
    host: globalRef,
  });
  ViewLayer.prototype["lot-detail"] = lotDetailPageV1.render;

  installCommercialViewsBindV1(ViewLayer, {
    appStore,
    apiFetch,
    bindCommissionNegotiationEventsV1: negotiation.bindCommissionNegotiationEventsV1,
    REPASSE_PRICE_CATALOG: repassePriceCatalog,
    commissionProfiles,
    esc,
    ico,
    formatBRL,
    lotExportRowV1: lotDetailPageV1.lotExportRowV1,
    downloadBrandedLotExcelV1: lotDetailPageV1.downloadBrandedLotExcelV1,
    notify,
    prepareAssistantLotStatusPromptV1,
    documentRef: globalRef.document,
    windowRef: globalRef.window,
    requestAnimationFrameRef: globalRef.requestAnimationFrame?.bind(globalRef),
    EventRef: globalRef.Event,
    FormDataRef: globalRef.FormData,
    confirmRef: globalRef.confirm?.bind(globalRef),
    setTimeoutRef: globalRef.setTimeout?.bind(globalRef),
    DateRef: globalRef.Date,
  });

  return Object.freeze({ ...negotiation, lotDetailPageV1 });
};
