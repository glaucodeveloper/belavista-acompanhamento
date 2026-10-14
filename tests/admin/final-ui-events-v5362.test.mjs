import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installBelavistaFinalUiV5362 } from "../../components/planning/final-ui-events-v5362.mjs";

const createHarness = () => {
  const state = { dashboardCommissionOpenV5362: false },
    listeners = new Map(),
    baseCalls = [],
    icons = [],
    globalRef = {},
    makeButton = (key, value) => ({
      dataset: { [key]: value },
      addEventListener(type, listener) {
        listeners.set(`${key}:${type}`, listener);
      },
    }),
    collections = {
      "[data-v5362-record]": [makeButton("v5362Record", "record-44")],
      "[data-v5362-activity]": [makeButton("v5362Activity", "activity-9")],
      "[data-v5362-broker]": [makeButton("v5362Broker", "broker-3")],
      "[data-v5362-commission]": [makeButton("v5362Commission", "broker-5")],
      "[data-v5362-correction]": [makeButton("v5362Correction", "broker-7")],
    },
    singles = {
      "[data-v5362-record-back]": makeButton("recordBack", null),
      "[data-v5362-commission-toggle]": makeButton("commissionToggle", null),
      "[data-v5362-commission-close]": makeButton("commissionClose", null),
      "[data-v5362-broker-back]": makeButton("brokerBack", null),
    };
  const appStore = {
    get: () => ({ ...state }),
    set(patch) { Object.assign(state, patch); },
  };
  class ViewLayer {
    bind() { baseCalls.push(this); }
    querySelectorAll(selector) { return collections[selector] || []; }
    querySelector(selector) { return singles[selector] || null; }
  }
  const originalBind = ViewLayer.prototype.bind;
  const windowRef = { lucide: { createIcons: () => icons.push(true) } };
  const installation = installBelavistaFinalUiV5362({
    globalRef,
    ViewLayer,
    appStore,
    window: windowRef,
  });
  const view = new ViewLayer();
  view.bind();
  return { appStore, state, listeners, baseCalls, icons, globalRef, ViewLayer, originalBind, installation, view };
};

test("final UI keeps record, activity, commission, broker, and correction actions", () => {
  const fixture = createHarness();
  assert.equal(fixture.baseCalls.length, 1);
  assert.deepEqual(fixture.icons, [true]);

  fixture.listeners.get("v5362Record:click")();
  assert.equal(fixture.state.selectedRecordV5362, "record-44");
  fixture.listeners.get("recordBack:click")();
  assert.equal(fixture.state.selectedRecordV5362, null);

  fixture.listeners.get("v5362Activity:click")();
  assert.equal(fixture.state.view, "activities");
  assert.equal(fixture.state.selectedActivity, "activity-9");
  assert.equal(fixture.state.activityDedicated, true);

  fixture.listeners.get("commissionToggle:click")();
  assert.equal(fixture.state.dashboardCommissionOpenV5362, true);
  fixture.listeners.get("commissionToggle:click")();
  assert.equal(fixture.state.dashboardCommissionOpenV5362, false);
  fixture.listeners.get("commissionToggle:click")();
  fixture.listeners.get("commissionClose:click")();
  assert.equal(fixture.state.dashboardCommissionOpenV5362, false);
  assert.equal(fixture.state.dashboardCommissionBrokerV5362, null);

  fixture.listeners.get("v5362Broker:click")();
  assert.equal(fixture.state.dashboardCommissionOpenV5362, true);
  assert.equal(fixture.state.dashboardCommissionBrokerV5362, "broker-3");
  fixture.listeners.get("brokerBack:click")();
  assert.equal(fixture.state.dashboardCommissionBrokerV5362, null);

  fixture.listeners.get("v5362Commission:click")();
  assert.equal(fixture.state.view, "commissions");
  assert.equal(fixture.state.selectedCommissionProfile, "broker-5");
  fixture.listeners.get("v5362Correction:click")();
  assert.equal(fixture.state.commissionEditorOpen, true);
  assert.deepEqual(fixture.state.commissionFilters, {
    query: "",
    status: "all",
    profile: "broker-7",
  });
  assert.equal(fixture.state.lastAction, "Abriu correção");
});

test("final UI preserves base bind, global reinstall hook, and metadata", () => {
  const fixture = createHarness(),
    first = fixture.installation.installedAt;
  assert.equal(fixture.globalRef.__BELAVISTA_V5362_BASE_BIND, fixture.originalBind);
  assert.equal(fixture.globalRef.__BELAVISTA_FINAL_UI_V5362.version, "5.3.62");
  assert.equal(typeof fixture.globalRef.installBelavistaFinalUiV5362, "function");
  const reinstalled = fixture.globalRef.installBelavistaFinalUiV5362();
  assert.equal(reinstalled.version, "5.3.62");
  assert.ok(reinstalled.installedAt >= first);
});

test("components.js delegates final UI events to the planning module", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../../components.js", import.meta.url), "utf8"),
    readFile(new URL("../../components/planning/planning-page-registrations-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(source, /installPlanningPageRegistrationsV1\(\{/);
  assert.match(registration, /import \{ installBelavistaFinalUiV5362 \} from/);
  assert.match(registration, /finalUiInstallerV1\(\{[\s\S]*?window: windowRef/);
  assert.doesNotMatch(source, /data-v5362-record-back.*addEventListener/s);
});

test("installer rejects missing application services instead of silently skipping binding", () => {
  assert.throws(
    () => installBelavistaFinalUiV5362({}),
    /require global, ViewLayer, and the application store/,
  );
});
