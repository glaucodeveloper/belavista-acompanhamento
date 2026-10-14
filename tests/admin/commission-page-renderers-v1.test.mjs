import assert from "node:assert/strict";
import test from "node:test";
import {
  installBrokerSettingsRendererV1,
  installCommissionPageRenderersV1,
} from "../../components/commercial/commission-page-renderers-v1.mjs";

test("final commission routes render the live store through the negotiation view", () => {
  class ViewLayer {}
  const state = { commissionEntries: [{ id: "deal-1" }] };
  const rendered = [];
  const markup = (current) => {
    rendered.push(current);
    return `commission:${current.commissionEntries[0].id}`;
  };

  assert.equal(installCommissionPageRenderersV1(ViewLayer, {
    appStore: { get: () => state },
    commissionNegotiationsMarkupV1: markup,
  }), ViewLayer);
  const view = new ViewLayer();
  assert.equal(view.brokers(), "commission:deal-1");
  assert.equal(view.commissions(), "commission:deal-1");
  assert.deepEqual(rendered, [state, state]);
});

test("settings route keeps its historical broker-control method receiver and arguments", () => {
  class ViewLayer {}
  function brokersControlV8(...args) {
    return { receiver: this, args };
  }
  installBrokerSettingsRendererV1(ViewLayer, brokersControlV8);
  const view = new ViewLayer();
  const args = ["route", { actor: "owner" }];
  assert.deepEqual(view.settings(...args), { receiver: view, args });
});
