import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindLeadsToolbarEventsV1 } from "../../components/commercial/leads-toolbar-events-v1.mjs";

const control = (dataset = {}) => ({
  dataset,
  listeners: new Map(),
  addEventListener(name, handler) { this.listeners.set(name, handler); },
});

const fixture = () => {
  const state = {
    leadFilters: { query: "ana", objective: "all", status: "all" },
    publicLeads: [{ name: "Ana", lot: "Q1", objective: "Moradia", status: "Novo" }],
  };
  const writes = [], exports = [], notifications = [];
  const filter = control({ leadToolbarFilter: "query" });
  filter.value = "Bruno";
  const row = {
    hidden: false,
    textContent: "Bruno Q2",
    querySelector(selector) { return selector === "small" ? { textContent: "Investimento" } : { textContent: "Contato" }; },
  };
  const nameInput = { focused: false, focus() { this.focused = true; } };
  const form = {
    scrolled: null,
    scrollIntoView(options) { this.scrolled = options; },
    querySelector() { return nameInput; },
  };
  const controls = new Map([
    ["[data-lead-filter-clear]", control()],
    ["[data-lead-export]", control()],
    ["[data-lead-new]", control()],
    ["public-lead-form", form],
  ]);
  const view = {
    querySelector(selector) { return controls.get(selector) || null; },
    querySelectorAll(selector) { return selector === ".lead-client-row" ? [row] : selector === "[data-lead-toolbar-filter]" ? [filter] : []; },
    renderCalls: 0,
    render() { this.renderCalls++; },
  };
  const appStore = {
    get: () => state,
    set(patch) { writes.push(patch); Object.assign(state, patch); },
  };
  bindLeadsToolbarEventsV1(view, {
    appStore,
    demoData: { leads: [{ name: "Demo", lot: "Q9" }] },
    downloadCsv: (...args) => exports.push(args),
    notify: (...args) => notifications.push(args),
  });
  return { appStore, exports, filter, form, nameInput, notifications, row, state, view, writes };
};

test("lead filters apply on bind and input, and clearing restores defaults via render", () => {
  const f = fixture();
  assert.equal(f.row.hidden, true);
  f.filter.listeners.get("input")({ currentTarget: f.filter });
  assert.deepEqual(f.state.leadFilters, { query: "Bruno", objective: "all", status: "all" });
  assert.equal(f.row.hidden, false);
  assert.equal(f.writes.at(-1).lastAction, "Filtrou a lista comercial");
  f.view.querySelector("[data-lead-filter-clear]").listeners.get("click")();
  assert.deepEqual(f.state.leadFilters, { query: "", objective: "all", status: "all" });
  assert.equal(f.view.renderCalls, 1);
});

test("lead export preserves the source CSV schema and new action focuses public form", () => {
  const f = fixture();
  f.view.querySelector("[data-lead-export]").listeners.get("click")();
  assert.deepEqual(f.exports[0], [
    "leads-lotes.csv",
    ["Cliente", "Lote", "Objetivo", "Status", "WhatsApp", "E-mail"],
    [["Ana", "Q1", "Moradia", "Novo", "", ""], ["Demo", "Q9", undefined, undefined, "", ""]],
  ]);
  assert.deepEqual(f.notifications[0], ["Lista de leads exportada em CSV.", "success"]);
  assert.equal(f.writes.at(-1).lastAction, "Exportou lista de leads");

  f.view.querySelector("[data-lead-new]").listeners.get("click")();
  assert.deepEqual(f.form.scrolled, { behavior: "smooth", block: "center" });
  assert.equal(f.nameInput.focused, true);
  assert.deepEqual(f.notifications.at(-1), ["Preencha o formulário público para criar um novo lead."]);
});

test("components.js delegates lead toolbar events to the commercial module", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(composition, /import \{ bindLeadsToolbarEventsV1 \} from "\.\/components\/commercial\/leads-toolbar-events-v1\.mjs\?/);
  assert.match(composition, /bindLeadsToolbarEventsV1\(this, \{ appStore, demoData, downloadCsv, notify \}\)/);
  assert.doesNotMatch(composition, /this\.querySelectorAll\("\[data-lead-toolbar-filter\]"\)/);
});
