/** Install the final commission-directory renderers after legacy page installers. */
export const installCommissionPageRenderersV1 = (ViewLayer, {
  appStore,
  commissionNegotiationsMarkupV1,
} = {}) => {
  ViewLayer.prototype.brokers = function () {
    return commissionNegotiationsMarkupV1(appStore.get());
  };
  ViewLayer.prototype.commissions = function () {
    return commissionNegotiationsMarkupV1(appStore.get());
  };
  return ViewLayer;
};

/** Preserve the settings route's historical broker-control renderer override. */
export const installBrokerSettingsRendererV1 = (ViewLayer, brokersControlV8) => {
  ViewLayer.prototype.settings = function (...args) {
    return brokersControlV8.apply(this, args);
  };
  return ViewLayer;
};
