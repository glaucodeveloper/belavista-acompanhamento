import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installOperationalViewBindV8 } from "../../components/shared/operational-view-bind-v8.mjs";

test("operational view bind composes base, finance, stage, leads, and commission behaviors in order", async () => {
  const stateUpdates = [];
  const calls = [];
  const base = { remove() { calls.push("remove-calibration"); } };
  const settingsButton = {
    textContent: "Abrir calibração",
    dataset: {},
    removeAttribute(name) { calls.push(`remove-attribute:${name}`); },
  };
  const financeButton = { textContent: "Abrir financeiro", innerHTML: "" };
  const focusButton = { addEventListener(type, handler, options) { calls.push(["focus-handler", type, handler, options]); } };
  const andamentoButton = { addEventListener(type, handler, options) { calls.push(["andamento-handler", type, handler, options]); } };
  const diarioTab = {};
  const stageTabs = {
    querySelector: (selector) => selector.includes('"requisitos"') ? null : selector.includes('"diario"') ? diarioTab : null,
    querySelectorAll: () => [{ classList: { toggle: (...args) => calls.push(["tab-toggle", ...args]) } }],
    insertBefore: (node, before) => calls.push(["insert-tab", node, before]),
  };
  let requirementsClick;
  const ledger = { classList: { add: (...names) => calls.push(["ledger-classes", ...names]) }, dataset: {} };
  const cashInput = { focus: () => calls.push("cash-focus") };
  const cash = {
    scrollIntoView: (options) => calls.push(["cash-scroll", options]),
    querySelector: () => cashInput,
  };
  const detail = { scrollIntoView: (options) => calls.push(["detail-scroll", options]) };
  const appStore = { set: (next) => stateUpdates.push(next) };
  class ViewLayer {
    bind() { calls.push("base-bind"); }
    querySelectorAll(selector) {
      return ({
        ".calibration-settings": [base],
        '[data-view="settings"]': [settingsButton],
        "[data-focus-cash-entry]": [focusButton],
        '[data-view="finance"]': [financeButton],
        '[data-stage-detail-tab="andamento"]': [andamentoButton],
      })[selector] || [];
    }
    querySelector(selector) {
      if (selector === ".control-center-page .control-center-section") return ledger;
      if (selector === "[data-stage-detail-tabs]") return stageTabs;
      if (selector === "[data-v8-cash-entry]") return cash;
      if (selector === ".stage-v9-detail-grid") return detail;
      return null;
    }
  }

  installOperationalViewBindV8(ViewLayer, {
    appStore,
    demoData: {},
    downloadCsv: () => {},
    bindLeadsToolbarEventsV1: (view) => calls.push(["leads", view]),
    bindCommissionWorkspaceEventsV1: (view, options) => calls.push(["commissions", view, options]),
    brlToNumber: () => 0,
    commissionDeals: [],
    commissionProfiles: [],
    confirmRef: () => true,
    DateCtor: Date,
    documentRef: { createElement: () => ({
      dataset: {},
      addEventListener(type, handler) { if (type === "click") requirementsClick = handler; },
      classList: { toggle: (...args) => calls.push(["requirement-active", ...args]) },
    }) },
    EventCtor: Event,
    FormDataCtor: FormData,
    formatBRL: () => "R$ 0,00",
    ico: () => "",
    notify() {},
  });

  new ViewLayer().bind();
  const focusHandler = calls.find((entry) => Array.isArray(entry) && entry[0] === "focus-handler")[2];
  const andamentoHandler = calls.find((entry) => Array.isArray(entry) && entry[0] === "andamento-handler")[2];
  focusHandler();
  andamentoHandler();
  requirementsClick();

  assert.ok(calls.indexOf("base-bind") < calls.indexOf("remove-calibration"));
  assert.equal(settingsButton.dataset.focusCashEntry, "");
  assert.equal(settingsButton.textContent, "Abrir registro de caixa");
  assert.equal(financeButton.innerHTML, "Abrir registro de caixa");
  assert.deepEqual(ledger.classList.add && ledger.dataset.controlLedger, "operational-cash");
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "insert-tab" && entry[2] === diarioTab));
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "cash-scroll"));
  assert.ok(calls.includes("cash-focus"));
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "leads"));
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "commissions"));
  assert.deepEqual(stateUpdates, [
    { lastAction: "Abriu o registro de caixa" },
    { view: "records", activityDedicated: false, lastAction: "Abriu Andamento nos registros completos" },
    { selectedStageDetailTab: "requisitos", lastAction: "Abriu a aba Requisitos da etapa" },
  ]);
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "detail-scroll"));
});

test("components.js delegates the operational ViewLayer bind composition", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/finance/finance-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installFinanceApplicationCompositionV1\(/);
  assert.match(composition, /installOperationalViewBindV8\(ViewLayer, \{/);
  assert.doesNotMatch(source, /const viewLayerBindWithDataToolbars = ViewLayer\.prototype\.bind/);
});
