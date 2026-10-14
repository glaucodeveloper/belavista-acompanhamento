import test from "node:test";
import assert from "node:assert/strict";
import { installCommercialHistoryPageEventsV1 } from "../../components/commercial/sales-history-page-v1.mjs";

const control = (dataset = {}) => {
  const listeners = new Map();
  return {
    dataset,
    hidden: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    fire(type, event = {}) { listeners.get(type)?.({ target: this, currentTarget: this, ...event }); },
  };
};

test("commercial history page handlers preserve broker and report navigation", () => {
  const patches = [], printed = [],
    nodes = new Map([
      ["[data-broker-detail-print]", control()],
      ["[data-broker-history-all]", control()],
      ["[data-history-print]", control()],
      ["[data-history-back]", control()],
      ["[data-history-edit-deal]", control({ historyEditDeal: "SALE-2" })],
      ["[data-history-search]", control()],
    ]),
    brokerReport = control({ historyOpen: "SALE-1" }),
    historyReport = control({ historyOpen: "SALE-3" }),
    rows = [{ dataset: { search: "ana venda" } }, { dataset: { search: "bruno venda" } }];
  let state = { view: "broker-detail" }, renderCount = 0;
  const appStore = {
    get: () => state,
    set(patch) { patches.push(patch); state = { ...state, ...patch }; },
  };
  class ViewLayer {
    constructor() { this.dataset = { view: "broker-detail" }; }
    bind() { return "base-bind"; }
    render() { renderCount += 1; }
    querySelector(selector) { return nodes.get(selector) || null; }
    querySelectorAll(selector) {
      if (selector === "[data-history-open]") return [this.dataset.view === "broker-detail" ? brokerReport : historyReport];
      if (selector === "[data-history-row]") return rows;
      return [];
    }
  }
  installCommercialHistoryPageEventsV1(ViewLayer, { appStore, windowRef: { print: () => printed.push(true) } });
  const page = new ViewLayer();

  assert.equal(page.bind(), "base-bind");
  nodes.get("[data-broker-detail-print]").fire("click");
  nodes.get("[data-broker-history-all]").fire("click");
  brokerReport.fire("click");
  assert.equal(printed.length, 1);
  assert.deepEqual(patches.slice(0, 2), [
    { view: "sales-history", selectedSalesHistoryId: null, lastAction: "Abriu histórico completo de vendas" },
    { view: "sales-history", selectedSalesHistoryId: "SALE-1", lastAction: "Abriu relatório completo da venda" },
  ]);

  page.dataset.view = "sales-history";
  page.bind();
  nodes.get("[data-history-search]").fire("input", { target: { value: "ana" } });
  assert.deepEqual(rows.map((row) => row.hidden), [false, true]);
  historyReport.fire("click");
  assert.equal(renderCount, 1);
  nodes.get("[data-history-back]").fire("click");
  assert.equal(renderCount, 2);
  nodes.get("[data-history-print]").fire("click");
  nodes.get("[data-history-edit-deal]").fire("click");
  assert.equal(printed.length, 2);
  assert.deepEqual(patches.slice(-3), [
    { selectedSalesHistoryId: "SALE-3", lastAction: "Abriu relatório de venda" },
    { selectedSalesHistoryId: null, lastAction: "Voltou ao histórico de vendas" },
    { view: "commission-deal", selectedCommissionNegotiation: "SALE-2", lastAction: "Abriu o cadastro completo da venda" },
  ]);
});
