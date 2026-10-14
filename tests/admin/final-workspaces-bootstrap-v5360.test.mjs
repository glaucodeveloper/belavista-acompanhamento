import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installBelavistaFinalWorkspacesBootstrapV5360 } from "../../components/planning/final-workspaces-bootstrap-v5360.mjs";

test("final workspace bootstrap preserves deferred installation, page owners, and idempotence", async () => {
  const updates = [];
  let baseBindCalls = 0;
  let iconRefreshes = 0;
  let correctionHandler;
  const state = {};
  const appStore = {
    get: () => ({ ...state }),
    set: (next) => {
      Object.assign(state, next);
      updates.push(next);
    },
  };
  const correctionButton = {
    dataset: { v5360CommissionCorrection: "broker-a" },
    addEventListener: (type, handler) => {
      if (type === "click") correctionHandler = handler;
    },
  };
  class ViewLayer {
    bind() {
      baseBindCalls += 1;
    }
    querySelectorAll(selector) {
      return selector === "[data-v5360-commission-correction]"
        ? [correctionButton]
        : [];
    }
    querySelector() {
      return null;
    }
  }
  class FixedDate extends Date {
    toISOString() {
      return "2026-10-13T12:00:00.000Z";
    }
  }
  const globalRef = { window: { lucide: { createIcons: () => iconRefreshes++ } }, Date: FixedDate };
  const install = installBelavistaFinalWorkspacesBootstrapV5360({
    globalRef,
    ViewLayer,
    appStore,
    demoData: {
      activities: [
        { id: "stage-1", name: "Terraplenagem", week: "Semana 1", status: "Em andamento", progress: 40 },
      ],
    },
    commissionDeals: [
      { id: "older", profile: "broker-a", date: "10/01/2026", status: "Reserva" },
      { id: "newer", profile: "broker-a", date: "11/01/2026", status: "Proposta" },
      { id: "other", profile: "broker-b", date: "13/01/2026", status: "Assinado" },
    ],
    esc: (value) => String(value ?? ""),
    ico: () => "icon",
    apiFetch: async () => { throw new Error("not used by this interaction"); },
    operationalHeaders: () => ({}),
    notify() {},
  });

  assert.equal(typeof install, "function");
  assert.equal(ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed, undefined);
  assert.equal(updates.length, 0);
  install();

  assert.equal(ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed, true);
  assert.equal(globalRef.__BELAVISTA_FINAL_WORKSPACES_V5360.installedAt, "2026-10-13T12:00:00.000Z");
  assert.equal(ViewLayer.prototype.stages().includes('data-v5360-stage-card="stage-1"'), true);
  assert.equal(ViewLayer.prototype.records().includes("Nenhum registro"), true);
  assert.deepEqual(updates, [{ lastAction: "Workspaces finais v5.3.60 aplicados" }]);

  const instance = new ViewLayer();
  instance.bind();
  correctionHandler();
  assert.equal(baseBindCalls, 1);
  assert.equal(iconRefreshes, 1);
  assert.equal(state.commissionEditing.id, "newer");
  assert.equal(state.commissionFilters.profile, "broker-a");

  const stageRenderer = ViewLayer.prototype.stages;
  install();
  assert.equal(ViewLayer.prototype.stages, stageRenderer);
  assert.equal(updates.length, 2);
});

test("components.js delegates final workspace installation to its planning bootstrap", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/planning-page-registrations-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installPlanningPageRegistrationsV1\(\{/);
  assert.match(registration, /finalWorkspacesInstallerV1\(\{/);
  assert.doesNotMatch(source, /globalThis\.installBelavistaFinalWorkspacesV5360\s*=\s*\(\)\s*=>\s*\{/);
});
