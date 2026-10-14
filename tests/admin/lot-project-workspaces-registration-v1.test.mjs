import test from "node:test";
import assert from "node:assert/strict";
import { installLotProjectWorkspacesRegistrationV1 } from "../../components/lots/lot-project-workspaces-registration-v1.mjs";

test("lot profile and project documents are installed together with the original route ports", () => {
  const state = {};
  const appStore = { get: () => state, set: (patch) => Object.assign(state, patch) };
  class ViewLayer {
    bind() { return "base-bind"; }
    render() { return "base-render"; }
    querySelector() { return null; }
  }
  const host = {
    document: {},
    window: {},
    FormData: class FormData {},
    requestAnimationFrame() {},
    confirm() { return true; },
    URL: class URL {},
    setTimeout() {},
    Option: class Option {},
    CSS: {},
  };

  const profiles = installLotProjectWorkspacesRegistrationV1({
    ViewLayer,
    appStore,
    REPASSE_PRICE_CATALOG: [{ lot: 1, label: "A-1", quadra: "A", price: 120, area: 200 }],
    esc: (value) => String(value ?? ""),
    EventCtor: class Event {},
    FormDataCtor: host.FormData,
    formatBRL: (value) => String(value),
    host,
    ico: () => "",
    notify() {},
    runtimeRouteV1: (path) => path,
  });

  assert.equal(typeof profiles.lotDevelopmentProfilesV1, "function");
  assert.equal(typeof profiles.normalizeLotDevelopmentTextV1, "function");
  assert.equal(typeof profiles.upsertLotDevelopmentProfileV1, "function");
  assert.equal(typeof ViewLayer.prototype.lotDevelopment, "function");
  assert.equal(typeof ViewLayer.prototype.lotProfile, "function");
  assert.equal(typeof ViewLayer.prototype.documents, "function");
  assert.equal(host.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1, profiles.lotDevelopmentProfilesV1);
  assert.equal(host.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1, profiles.upsertLotDevelopmentProfileV1);
  assert.match(ViewLayer.prototype.lotDevelopment(), /Lote A-1/);
  assert.equal(ViewLayer.prototype.bind.call(Object.create(ViewLayer.prototype)), "base-bind");
});
