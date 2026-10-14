import test from "node:test";
import assert from "node:assert/strict";
import { installCommercialHistoryRegistrationV1 } from "../../components/commercial/commercial-history-registration-v1.mjs";

test("commercial history registration wires route renderers, events, and settings in the root order", () => {
  const state = { view: "sales-history", commissionDealAttachments: {} };
  const appStore = {
    get: () => state,
    set: (patch) => Object.assign(state, patch),
  };
  class ViewLayer {
    bind() { return "base-bind"; }
  }
  ViewLayer.prototype.settings = () => "operational settings";

  const result = installCommercialHistoryRegistrationV1({
    ViewLayer,
    appStore,
    commissionDeals: [],
    commissionNegotiationDealsV1: () => [],
    commissionNegotiationProfileV1: () => ({ name: "Corretor" }),
    commissionNegotiationTransactionsV1: () => [],
    commissionAttachmentListV1: () => "",
    commissionProfiles: [],
    contractStatusClassV1: () => "status",
    brokerReasonsV9: () => [],
    executionModel: { stages: [] },
    brlToNumber: (value) => Number(value) || 0,
    formatBRL: (value) => String(value),
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify: () => {},
    settingsAuditTemplate: () => "operational settings",
    FormDataCtor: class FormData {},
    windowRef: { print() {} },
  });

  assert.equal(typeof ViewLayer.prototype["broker-detail"], "function");
  assert.equal(typeof ViewLayer.prototype["sales-history"], "function");
  assert.equal(typeof ViewLayer.prototype.settings, "function");
  assert.equal(result.commercialDealsForWorkspaceV1(state).length, 0);
  assert.deepEqual(result.brokerWorkspaceStatsV1({ id: "broker" }, []), {
    rows: [], sales: 0, commission: 0, pending: 0,
  });
  assert.match(ViewLayer.prototype["sales-history"](), /sales-history-page/);
  assert.match(ViewLayer.prototype.settings(), /settings-commercial-workspace/);

  const view = Object.assign(Object.create(ViewLayer.prototype), {
    dataset: { view: "map" },
  });
  assert.equal(view.bind(), "base-bind");
});
