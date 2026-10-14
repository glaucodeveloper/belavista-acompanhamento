import test from "node:test";
import assert from "node:assert/strict";
import { installLeadsDirectoryRegistrationV1 } from "../../components/commercial/leads-directory-registration-v1.mjs";

const harness = (state) => {
  const writes = [];
  const appStore = {
    get: () => state,
    set: (patch) => { writes.push(patch); state = { ...state, ...patch }; },
  };
  class ViewLayer {
    leads() { return "pre-existing leads view"; }
    bind() { return "pre-existing bind"; }
  }
  installLeadsDirectoryRegistrationV1({
    ViewLayer,
    appStore,
    apiFetch: async () => ({ ok: true, json: async () => ({}) }),
    runtimeRouteV1: (path) => path,
    demoData: { leads: [] },
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    notify() {},
    host: {
      localStorage: { setItem() {} },
      window: { open() {} },
      belavistaWorkerAssistant: null,
    },
  });
  return { ViewLayer, writes };
};

test("administrative leads renderer uses captured public leads and preserves the profile drill-in", () => {
  const lead = {
    id: "lead-42",
    name: "Contato real",
    lot: "Lote 42",
    status: "Novo",
    objective: "Moradia",
    budget: "A confirmar",
    conversationSummary: "Perguntou sobre visita.",
  };
  const { ViewLayer } = harness({ publicLeads: [lead], selectedLead: 0 });
  const view = new ViewLayer();

  const directory = view.leads();
  assert.match(directory, /Contato real/);
  assert.match(directory, /data-lead-content-tab="leads"/);
  assert.match(directory, /admin-leads-admin-map-panel-v1/);

  const { ViewLayer: ProfileView } = harness({
    publicLeads: [lead], selectedLead: 0, adminLeadProfile: true,
  });
  const profile = new ProfileView().leads();
  assert.match(profile, /CRM · PERFIL DO CONTATO/);
  assert.match(profile, /Perguntou sobre visita\./);
  assert.match(profile, /data-admin-leads-back/);
});

test("administrative leads renderer keeps the source empty state when no real leads exist", () => {
  const { ViewLayer } = harness({ publicLeads: [], publicReservations: [] });
  assert.match(new ViewLayer().leads(), /Nenhum lead corresponde à busca/);
});
