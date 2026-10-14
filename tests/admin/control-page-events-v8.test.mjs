import test from "node:test";
import assert from "node:assert/strict";
import { createControlPageEventsV8 } from "../../components/finance/control-page-events-v8.mjs";

const eventButton = (dataset = {}) => {
  const listeners = new Map();
  return {
    dataset,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get("click")?.({ currentTarget: this, target: this });
    },
  };
};

test("control page preserves cash-record open and return navigation", () => {
  const writes = [],
    open = eventButton({ returnView: "reports" }),
    back = eventButton({ returnView: "finance" }),
    controlRoot = { dataset: {}, querySelector: () => null },
    host = {
      querySelectorAll(selector) {
        if (selector === "[data-cash-record-open]") return [open];
        if (selector === "[data-cash-record-back]") return [back];
        return [];
      },
      querySelector(selector) {
        return selector === ".control-page" ? controlRoot : null;
      },
    },
    bind = createControlPageEventsV8({
      appStore: { set: (patch) => writes.push(patch) },
      apiFetch: async () => { throw new Error("unexpected request"); },
      operationalHeaders: () => ({}),
      apiUrl: (url) => url,
      ico: () => "",
      esc: String,
      notify() {},
    });

  bind.call(host);
  open.click();
  back.click();

  assert.deepEqual(writes, [
    {
      view: "cash-record",
      cashRecordReturnView: "reports",
      activityDedicated: false,
      selectedActivity: null,
      lastAction: "Abriu novo registro de caixa",
    },
    {
      view: "finance",
      cashRecordReturnView: null,
      activityDedicated: false,
      selectedActivity: null,
      lastAction: "Voltou para o caixa",
    },
  ]);
  assert.equal(open.dataset.cashRecordBound, "1");
  assert.equal(back.dataset.cashRecordBackBound, "1");
});

test("control page keeps broker-ledger and finance searches scoped to their own rows", () => {
  const rows = (entries) => entries.map((search) => ({
      dataset: { search },
      hidden: false,
    })),
    brokerRows = rows(["ana corretora", "joão gerente"]),
    financeRows = rows(["cimento", "locação de máquinas"]),
    searchInput = () => ({ value: "", addEventListener(type, listener) {
      this.listener = listener;
    } }),
    brokerSearch = searchInput(),
    financeSearch = searchInput(),
    controlRoot = {
      dataset: {},
      querySelector(selector) {
        if (selector === "[data-v8-broker-ledger-search]") return brokerSearch;
        if (selector === "[data-v8-finance-search]") return financeSearch;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === "[data-v8-broker-ledger-row]") return brokerRows;
        if (selector === "[data-v8-finance-row]") return financeRows;
        return [];
      },
    },
    host = {
      querySelectorAll: () => [],
      querySelector: (selector) => selector === ".control-page" ? controlRoot : null,
    },
    bind = createControlPageEventsV8({
      appStore: { set() {}, get: () => ({}) },
      apiFetch: async () => ({ json: async () => ({ files: [] }) }),
      operationalHeaders: () => ({}),
      apiUrl: (url) => url,
      ico: () => "",
      esc: String,
      notify() {},
    });

  bind.call(host);
  brokerSearch.value = "ana";
  brokerSearch.listener({ target: brokerSearch });
  financeSearch.value = "máquinas";
  financeSearch.listener({ target: financeSearch });

  assert.deepEqual(brokerRows.map(({ hidden }) => hidden), [false, true]);
  assert.deepEqual(financeRows.map(({ hidden }) => hidden), [true, false]);
});
