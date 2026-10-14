import test from "node:test";
import assert from "node:assert/strict";
import { installCommercialApplicationCompositionV1 } from "../../components/commercial/commercial-application-composition-v1.mjs";

test("commercial composition installs negotiation, broker-board, lot-detail and event bindings", () => {
  const appStore = { get: () => ({}), set: () => {} };
  const ViewLayer = function ViewLayer() {};
  ViewLayer.prototype.bind = function bind() {};
  const globalRef = {
    FileReader: function FileReader() {},
    Date,
    FormData: class FormData {},
    window: { print: () => {} },
    console: { info: () => {} },
    document: {},
    requestAnimationFrame: (callback) => callback(),
    Event: class Event {},
    confirm: () => true,
    setTimeout,
  };
  const composition = installCommercialApplicationCompositionV1({
    ViewLayer,
    appStore,
    commissionDeals: [],
    commissionProfiles: [],
    repassePriceCatalog: [],
    esc: (value) => String(value ?? ""),
    ico: (name) => name,
    formatBRL: (value) => String(value),
    brlToNumber: Number,
    contractStatusClassV1: () => "",
    apiFetch: async () => ({}),
    operationalHeaders: () => ({}),
    notify: () => {},
    prepareAssistantLotStatusPromptV1: () => "",
    globalRef,
  });

  assert.equal(typeof ViewLayer.prototype["commission-deal"], "function");
  assert.equal(typeof ViewLayer.prototype["brokers-board"], "function");
  assert.equal(typeof ViewLayer.prototype["lot-detail"], "function");
  assert.equal(typeof composition.commissionNegotiationDealsV1, "function");
  assert.equal(typeof composition.commissionFileToDataUrlV1, "function");
  assert.equal(typeof composition.bindCommissionNegotiationEventsV1, "function");
  assert.equal(typeof composition.lotDetailPageV1.downloadBrandedLotExcelV1, "function");
  assert.equal(typeof composition.lotDetailPageV1.lotExportRowV1, "function");
  assert.notEqual(ViewLayer.prototype.bind.toString(), "function bind() {}");
  assert.equal(Object.isFrozen(composition), true);
});
