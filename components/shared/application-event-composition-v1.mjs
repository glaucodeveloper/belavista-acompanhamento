import { installOperationalIntelligenceEventsV1 } from "../planning/operational-intelligence-events-v1.mjs?v=operational-intelligence-events-v1";
import { installCommercialWorkspaceEventsV7 } from "../commercial/workspace-events-v7.mjs?v=workspace-events-v7";
import { installOperationalSettingsWorkspaceV1 } from "../commercial/operational-settings-workspace-v1.mjs?v=dynamic-access-roles-v1";
import { installLeadsOperationalCrmV1 } from "../commercial/leads-page-composition-v1.mjs?v=leads-operational-crm-v1";
import { installFinancePageV8 } from "../finance/finance-workspace-v8.mjs?v=finance-workspace-v8";

/** Install root-level route events and page bindings in their original bootstrap order. */
export const installApplicationEventCompositionV1 = ({
  ViewLayer,
  appStore,
  actionsPageV1,
  bindControlPageEventsV8,
  bindLeadsMapConversationV1,
  brokersControlV8,
  commissionProfiles,
  demoData,
  downloadCsv,
  esc,
  financeWorkspaceV8,
  ico,
  notify,
  raciPageV1,
  raidPageV1,
  readIntegrationSettings,
  integrationSettingsKey,
  apiFetch,
  operationalHeaders,
  registerOperationalDevice,
  reportCatalog,
  syncLiveSystemReportV1,
  windowRef = globalThis.window,
  documentRef = globalThis.document,
  storage = globalThis.localStorage,
  CustomEventCtor = globalThis.CustomEvent,
  FormDataCtor = globalThis.FormData,
  confirmFn = globalThis.confirm?.bind(globalThis),
  DateCtor = globalThis.Date,
  consoleRef = globalThis.console,
  customElementsRef = globalThis.customElements,
} = {}) => {
  const bindLeadWidgetsBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    bindLeadWidgetsBaseV1.call(this);
    bindLeadsMapConversationV1(this, {
      appStore,
      documentRef,
      esc,
      FormDataCtor,
      DateCtor,
      localStorageRef: storage,
      notify,
    });
  };

  installOperationalIntelligenceEventsV1(ViewLayer, {
    appStore,
    ico,
    notify,
    actionsPageV1,
    raciPageV1,
    raidPageV1,
  });

  if (!customElementsRef.get("view-layer")) customElementsRef.define("view-layer", ViewLayer);

  installCommercialWorkspaceEventsV7(ViewLayer, {
    appStore,
    downloadCsv,
    commissionProfiles,
    reportCatalog,
    syncLiveSystemReportV1,
    window: windowRef,
  });

  const settingsAuditTemplate = ViewLayer.prototype.settings;
  const operationalSettingsWorkspaceV1 = installOperationalSettingsWorkspaceV1(ViewLayer, {
    appStore,
    readIntegrationSettings,
    integrationSettingsKey,
    apiFetch,
    operationalHeaders,
    registerOperationalDevice,
    esc,
    ico,
    notify,
    settingsAuditTemplate,
    storage,
    document: documentRef,
    CustomEventCtor,
    FormDataCtor,
  });

  installLeadsOperationalCrmV1(ViewLayer, {
    appStore,
    demoData,
    esc,
    ico,
    apiFetch,
    operationalHeaders,
    notify,
    documentRef,
    confirmFn,
    DateCtor,
    consoleRef,
  });

  // Keep these final overrides after the older commercial event installers.
  const bindCommercialPagesBaseV8 = ViewLayer.prototype.bindCommercialPagesV7;
  ViewLayer.prototype.bindCommercialPagesV7 = function () {
    bindCommercialPagesBaseV8?.call(this);
    bindControlPageEventsV8.call(this);
    this.querySelector("[data-v7-finance-print]")?.addEventListener("click", () => windowRef.print());
  };
  ViewLayer.prototype.brokers = brokersControlV8;
  ViewLayer.prototype.settings = function (...args) {
    return brokersControlV8.apply(this, args);
  };
  installFinancePageV8(ViewLayer, financeWorkspaceV8, appStore);

  return Object.freeze({ operationalSettingsWorkspaceV1 });
};
