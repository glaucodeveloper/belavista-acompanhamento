import { installBrokerProfilePageV2 } from "./brokers-page.mjs";

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
} = {}) => installBrokerProfilePageV2(ViewLayer, {
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
