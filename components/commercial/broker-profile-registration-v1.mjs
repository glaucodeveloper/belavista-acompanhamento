import { installBrokerProfilePageV2 } from "./brokers-page.mjs?v=broker-profile-page-legacy-v1";

/** Bind the broker-profile page to its application runtime at the original boot point. */
export const installBrokerProfileRegistrationV1 = ({
  ViewLayer,
  appStore,
  commissionDeals,
  brokerReasonsV9,
  brlToNumber,
  formatBRL,
  esc,
  ico,
  notify,
  storage,
  fileToDataUrl,
  windowRef,
} = {}) => {
  const registry = windowRef?.customElements || globalThis.customElements;
  const typedOwnerAvailable = ViewLayer?.prototype?.__atlasBrokersRouteTsOwnerV2 === true;
  if (typedOwnerAvailable && typeof registry?.get?.("atlas-brokers") === "function")
    return Object.freeze({ owner: "typescript", recoveryInstalled: false });
  return installBrokerProfilePageV2(ViewLayer, {
    appStore,
    commissionDeals,
    brokerReasonsV9,
    brlToNumber,
    formatBRL,
    esc,
    ico,
    notify,
    storage,
    fileToDataUrl,
    windowRef,
  });
};
