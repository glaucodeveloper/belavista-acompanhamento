import assert from "node:assert/strict";
import test from "node:test";
import {
  bindLeadsOperationalWorkspaceV5356,
  createLeadsOperationalWorkspaceV5356,
} from "../../components/commercial/leads-operational-workspace-v5356.mjs";

test("leads workspace renderer preserves its route and empty-list structure", () => {
  const render = createLeadsOperationalWorkspaceV5356({
    appStore: { get: () => ({ publicReservations: [], publicLeads: [] }) },
    demoData: { leads: [] },
    esc: (value) => String(value ?? ""),
    ico: () => "",
    runtimeRouteV1: (path, query) => `${path}?${query}`,
  });

  const html = render();

  assert.match(html, /class="leads-internal-v5356"/);
  assert.match(html, /src="\/leads\?embedded-admin=v5356"/);
  assert.match(html, /LEADS NO SISTEMA/);
  assert.doesNotMatch(html, /data-v5356-lead-index=/);
});

test("leads workspace event binding preserves lead selection updates", () => {
  const updates = [];
  let clickHandler;
  const button = {
    dataset: { v5356LeadIndex: "2" },
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-v5356-lead-index]" ? [button] : [];
    },
    querySelector() {
      return null;
    },
  };

  bindLeadsOperationalWorkspaceV5356(root, {
    appStore: { set: (value) => updates.push(value) },
    runtimeRouteV1: (path) => path,
    apiFetch: async () => {
      throw new Error("not used by lead selection");
    },
    notify() {},
  });
  clickHandler();

  assert.deepEqual(updates, [
    {
      selectedLead: 2,
      lastAction: "Selecionou lead na janela operacional",
    },
  ]);
});
