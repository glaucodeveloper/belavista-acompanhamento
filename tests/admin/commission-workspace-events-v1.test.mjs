import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindCommissionWorkspaceEventsV1 } from "../../components/commercial/commission-workspace-events-v1.mjs";

const control = (dataset = {}) => ({
  dataset,
  listeners: new Map(),
  attributes: {},
  innerHTML: "",
  textContent: "",
  addEventListener(name, handler) { this.listeners.set(name, handler); },
  setAttribute(name, value) { this.attributes[name] = value; },
});

const fixture = () => {
  const state = {
    commissionFilters: { query: "old", status: "pending" },
    commissionEntries: [],
    commissionHiddenIds: [],
  };
  const calls = [];
  const messages = [];
  const filter = control({ commissionFilter: "query" });
  filter.value = "Q12";
  const clear = control();
  const exportButton = control();
  const newButton = control();
  const cancel = control();
  const edit = control({ commissionEdit: "C-1" });
  const remove = control({ commissionDelete: "C-1" });
  const openDeal = control({ commissionOpen: "C-1" });
  const openLocal = control({ commissionOpen: "LOCAL" });
  const save = control();
  const form = {
    listeners: new Map(),
    dispatched: [],
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    querySelector: (selector) => selector === 'button[type="submit"]' ? save : null,
    dispatchEvent(event) { this.dispatched.push(event); },
  };
  const selectors = new Map([
    ["[data-commission-clear]", clear],
    ["[data-commission-export]", exportButton],
    ["[data-commission-new]", newButton],
    ["[data-commission-cancel]", cancel],
    ["[data-commission-entry-form]", form],
  ]);
  const lists = new Map([
    ["[data-commission-filter]", [filter]],
    ["[data-commission-new]", [newButton]],
    ["[data-commission-edit]", [edit]],
    ["[data-commission-delete]", [remove]],
    ["[data-commission-open]", [openDeal, openLocal]],
  ]);
  const view = {
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) => lists.get(selector) || [],
  };
  const profiles = [{ id: "p1", name: "Ana" }];
  const deals = [{ id: "C-1", profile: "p1", lot: "Q12-L5", client: "João", value: "R$ 100.000,00", commission: "R$ 6.000,00", status: "Proposta" }];
  const appStore = {
    get: () => state,
    set(update) { calls.push(update); Object.assign(state, update); },
  };
  class DateRef extends Date {
    constructor() { super("2026-10-12T12:00:00.000Z"); }
    static now() { return 123456789; }
  }
  class FormDataRef {
    constructor(element) { this.element = element; }
    entries() { return this.element.formEntries; }
  }
  class EventRef { constructor(type, options) { this.type = type; this.options = options; } }
  bindCommissionWorkspaceEventsV1(view, {
    appStore,
    brlToNumber(value) { return Number(String(value).replace(/[^\d.]/g, "")); },
    commissionDeals: deals,
    commissionProfiles: profiles,
    confirmRef: (message) => { messages.push(message); return true; },
    DateCtor: DateRef,
    downloadCsv: (...args) => messages.push(args),
    EventCtor: EventRef,
    FormDataCtor: FormDataRef,
    formatBRL: (value) => `R$ ${Number(String(value).replace(/[^\d.]/g, "")).toFixed(2)}`,
    ico: (name) => `<i>${name}</i>`,
    notify: (...args) => messages.push(args),
  });
  return { appStore, calls, cancel, clear, deals, edit, exportButton, filter, form, messages, newButton, openDeal, openLocal, remove, save, state };
};

test("filters, clear, and CSV export act on the actual commission collection", () => {
  const f = fixture();
  f.filter.listeners.get("input")({ currentTarget: f.filter });
  assert.deepEqual(f.state.commissionFilters, { query: "Q12", status: "pending" });
  assert.equal(f.calls.at(-1).lastAction, "Filtrou lançamentos de comissão");
  f.clear.listeners.get("click")();
  assert.deepEqual(f.state.commissionFilters, { query: "", status: "all", profile: "all" });

  f.exportButton.listeners.get("click")();
  const csvCall = f.messages.find((item) => Array.isArray(item) && item[0] === "comissoes-lotes.csv");
  assert.ok(csvCall);
  assert.deepEqual(csvCall[2], [["C-1", "Q12-L5", "João", "Ana", "Proposta", "R$ 100.000,00", "R$ 6.000,00"]]);
  assert.equal(f.calls.at(-1).lastAction, "Exportou carteira de comissões");
});

test("actions open proposal, edit, hide, and open commission records", () => {
  const f = fixture();
  f.newButton.listeners.get("click")();
  assert.equal(f.state.view, "contracts");
  assert.equal(f.state.proposalFormOpen, true);
  assert.match(f.newButton.innerHTML, /Nova venda/);
  assert.equal(f.newButton.attributes["aria-label"], "Nova venda de lote");

  f.edit.listeners.get("click")();
  assert.equal(f.state.commissionEditing.id, "C-1");
  f.remove.listeners.get("click")();
  assert.deepEqual(f.state.commissionHiddenIds, ["C-1"]);
  assert.deepEqual(f.messages.at(-1), ["Lançamento removido da carteira exibida.", "success"]);
  f.openDeal.listeners.get("click")();
  assert.equal(f.state.selectedCommissionContract, "C-1");
  f.openLocal.listeners.get("click")();
  assert.deepEqual(f.messages.at(-1), ["Lançamento local aberto para edição."]);

  f.cancel.listeners.get("click")();
  assert.equal(f.state.commissionEditorOpen, false);
  assert.equal(f.state.commissionEditing, null);
});

test("formulário salva ou atualiza entrada e submit explícito preserva fallback de teclado", () => {
  const f = fixture();
  let prevented = 0;
  f.save.listeners.get("click")({ preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(f.form.dispatched[0].type, "submit");
  assert.deepEqual(f.form.dispatched[0].options, { bubbles: true, cancelable: true });

  const values = [
    ["profile", "p1"], ["lot", "q-13"], ["client", "Maria"],
    ["value", "100000"], ["rate", "6"], ["status", "Reserva"],
  ];
  f.form.listeners.get("submit")({
    currentTarget: { formEntries: values },
    preventDefault() {},
  });
  const entry = f.state.commissionEntries[0];
  assert.equal(entry.id, "CT-LOCAL-456789");
  assert.equal(entry.lot, "Q-13");
  assert.equal(entry.commission, "R$ 6000.00");
  assert.equal(entry.stage, "Cadastro comercial local");
  assert.equal(f.state.commissionEditorOpen, false);
  assert.deepEqual(f.messages.at(-1), ["Lançamento comercial salvo na carteira local.", "success"]);
});

test("carteira de comissões é conectada pelo binder compartilhado e módulo comercial", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    viewBinder = await readFile(new URL("../../components/shared/operational-view-bind-v8.mjs", import.meta.url), "utf8");
  assert.match(composition, /import \{ bindCommissionWorkspaceEventsV1 \} from "\.\/components\/commercial\/commission-workspace-events-v1\.mjs\?/);
  assert.match(composition, /bindCommissionWorkspaceEventsV1,/);
  assert.match(viewBinder, /bindCommissionWorkspaceEventsV1\(this, \{/);
  assert.doesNotMatch(composition, /this\.querySelectorAll\("\[data-commission-filter\]"\)/);
});
