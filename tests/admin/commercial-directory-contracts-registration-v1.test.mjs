import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCommercialDirectoryContractsRegistrationV1 } from "../../components/commercial/commercial-directory-contracts-registration-v1.mjs";

test("commercial directory and contracts registration preserves route installation order and ports", async () => {
  const state = { view: "brokers", currentActor: { role: "owner" }, commissionEntries: [] };
  const appStore = { get: () => state, set: (patch) => Object.assign(state, patch) };
  class ViewLayer {
    bind() { return "base-bind"; }
    render() { return "base-render"; }
  }
  const host = {
    fetch() {}, document: {}, HTMLSelectElement: class HTMLSelectElement {},
    Option: class Option {}, Event: class Event {}, FormData: class FormData {},
    Blob: class Blob {}, URL: class URL {}, setTimeout() {},
  };

  installCommercialDirectoryContractsRegistrationV1({
    ViewLayer,
    appStore,
    commissionProfiles: [],
    commissionDeals: [],
    commercialDealsForWorkspaceV1: () => [],
    brokerWorkspaceStatsV1: () => ({ rows: [], sales: 0, commission: 0, pending: 0 }),
    normalizeOperationalRole: (role) => role,
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify() {},
    commercialScopeV1: () => ({ profiles: [], deals: [] }),
    brlToNumber: (value) => Number(value) || 0,
    formatBRL: (value) => String(value),
    readProposalImageAsDataUrl: async () => "data:",
    PROPOSAL_VISION_PROMPT: "proposal context",
    parseProposalVisionPayload: () => ({}),
    saveOperationalProposal: async () => {},
    host,
  });

  assert.equal(typeof ViewLayer.prototype.brokers, "function");
  assert.equal(typeof ViewLayer.prototype.contracts, "function");
  assert.equal(typeof ViewLayer.prototype.proposals, "function");
  assert.match(ViewLayer.prototype.brokers(), /broker-directory-page/);

  const registration = await readFile(new URL("../../components/commercial/commercial-directory-contracts-registration-v1.mjs", import.meta.url), "utf8");
  assert.ok(registration.indexOf("installBrokersPageV1(ViewLayer") < registration.indexOf("installContractsPageV1(ViewLayer"));
});
