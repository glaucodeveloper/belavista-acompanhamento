import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { installCommercialWorkspaceEventsV7 } from "../../components/commercial/workspace-events-v7.mjs";

const createButton = (key, value, textContent = "Período") => {
  const listeners = new Map();
  return {
    dataset: value === undefined ? {} : { [key]: value },
    textContent,
    addEventListener(type, listener) { listeners.set(type, listener); },
    click(type = "click", event = {}) { listeners.get(type)?.(event); },
    listenerCount: () => listeners.size,
  };
};

const createFixture = (type = "brokers") => {
  const state = { reportType: "cash", lastAction: "" },
    downloads = [],
    syncs = [],
    icons = [],
    calls = new Map(),
    rows = [
      { dataset: { search: "ana silva" }, hidden: false },
      { dataset: { search: "bruno costa" }, hidden: false },
    ],
    buttons = {
      openBroker: createButton("v7OpenBroker", "broker-2"),
      report: createButton("v7FinReport", "cash"),
      period: createButton("v7Period", "quarterly", "Trimestre"),
      brokerExport: createButton(),
      financeExport: createButton(),
      print: createButton(),
      search: createButton(),
    };
  buttons.financeExport.insertAdjacentHTML = (position, html) => calls.set("printMarkup", [position, html]);
  const root = {
    dataset: {},
    matches: (selector) => selector === ".v7-finance-page" && type === "finance",
    querySelector(selector) {
      const map = {
        "[data-v7-finance-export]": buttons.financeExport,
        "[data-v7-finance-print]": buttons.print,
        "[data-v7-broker-search]": buttons.search,
        "[data-v7-brokers-export]": buttons.brokerExport,
      };
      return map[selector] || null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-v7-broker-row]") return rows;
      if (selector === "[data-v7-open-broker]") return [buttons.openBroker];
      if (selector === "[data-v7-fin-report]") return [buttons.report];
      if (selector === "[data-v7-period]") return [buttons.period];
      return [];
    },
  };
  if (type === "finance") root.querySelector = ((original) => (selector) =>
    selector === "[data-v7-finance-print]" ? buttons.print : original(selector)
  )(root.querySelector.bind(root));
  class ViewLayer {
    querySelector(selector) {
      return selector === ".v7-brokers-page,.v7-finance-page" ? root : null;
    }
  }
  const appStore = {
    get: () => ({ ...state }),
    set(patch) { Object.assign(state, patch); },
  };
  installCommercialWorkspaceEventsV7(ViewLayer, {
    appStore,
    downloadCsv: (...args) => downloads.push(args),
    commissionProfiles: [{ name: "Ana", creci: "C-1", sales: 2, commission: "R$ 3", conversion: "20%", lots: ["A1"] }],
    reportCatalog: [{ id: "cash", family: "Financeiro", columns: ["Conta"], rows: [["Saldo"]] }],
    syncLiveSystemReportV1: (snapshot) => syncs.push(snapshot),
    window: { print: () => calls.set("print", true), lucide: { createIcons: () => icons.push(true) } },
  });
  return { root, view: new ViewLayer(), state, downloads, syncs, icons, calls, rows, buttons, appStore };
};

test("broker workspace keeps filtering, profile navigation, period selection, and CSV export", () => {
  const fixture = createFixture("brokers");
  fixture.view.bindCommercialPagesV7();
  fixture.buttons.search.click("input", { target: { value: "ANA" } });
  assert.equal(fixture.rows[0].hidden, false);
  assert.equal(fixture.rows[1].hidden, true);
  fixture.buttons.openBroker.click();
  assert.equal(fixture.state.view, "commissions");
  assert.equal(fixture.state.selectedCommissionProfile, "broker-2");
  assert.equal(fixture.state.selectedCommissionContract, null);
  fixture.buttons.report.click();
  assert.equal(fixture.state.reportType, "cash");
  fixture.buttons.period.click();
  assert.equal(fixture.state.reportPeriod, "quarterly");
  fixture.buttons.brokerExport.click();
  assert.equal(fixture.downloads[0][0], "corretores.csv");
  assert.deepEqual(fixture.downloads[0][2], [["Ana", "C-1", 2, "R$ 3", "20%", "A1"]]);
  assert.deepEqual(fixture.icons, [true]);
  const listenerCount = fixture.buttons.search.listenerCount();
  fixture.view.bindCommercialPagesV7();
  assert.equal(fixture.buttons.search.listenerCount(), listenerCount);
});

test("finance workspace keeps print and live report export behavior", () => {
  const fixture = createFixture("finance");
  fixture.view.bindCommercialPagesV7();
  assert.equal(fixture.calls.get("printMarkup")[0], "afterend");
  assert.match(fixture.calls.get("printMarkup")[1], /data-v7-finance-print/);
  fixture.buttons.print.click();
  assert.equal(fixture.calls.get("print"), true);
  fixture.buttons.financeExport.click();
  assert.equal(fixture.syncs.length, 1);
  assert.equal(fixture.downloads[0][0], "cash.csv");
  assert.deepEqual(fixture.downloads[0][1], ["Conta"]);
  assert.deepEqual(fixture.downloads[0][2], [["Saldo"]]);
});

test("installer requires explicit runtime services", () => {
  assert.throws(() => installCommercialWorkspaceEventsV7(null), /require ViewLayer and the application store/);
});

test("components.js delegates the v7 commercial workspace binder", async () => {
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    composition = await readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(source, /installApplicationEventCompositionV1\(\{/);
  assert.match(composition, /import \{ installCommercialWorkspaceEventsV7 \} from/);
  assert.match(composition, /installCommercialWorkspaceEventsV7\(ViewLayer, \{/);
  const start = composition.indexOf("installCommercialWorkspaceEventsV7(ViewLayer, {");
  const end = composition.indexOf("const settingsAuditTemplate", start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(composition.slice(start, end), /data-v7-broker-search/);
});
