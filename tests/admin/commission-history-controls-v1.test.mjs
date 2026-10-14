import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installCommissionHistoryControlsV1 } from "../../components/commercial/commission-history-controls-v1.mjs";

const createFixture = () => {
  const calls = [];
  const notifications = [];
  const state = {
    commissionContractReturn: "p2",
    selectedCommissionProfile: "p1",
    commissionEntries: [],
  };
  const profiles = [
    { id: "p1", name: "Ana Lima" },
    { id: "p2", name: "Bia Costa" },
  ];
  const deals = [{ id: "C-2", profile: "p2" }];
  const listeners = new Map();
  const controls = new Map();
  for (const selector of [
    "[data-commission-print]",
    "[data-commission-print-map]",
    "[data-commission-export-excel]",
    "[data-commission-import]",
    "[data-commission-export]",
  ]) controls.set(selector, {
    listeners: new Map(),
    clicks: 0,
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    click() { this.clicks++; },
  });
  const profileSection = {};
  const transactionSection = {
    before: (node) => calls.push(["before", node]),
    insertAdjacentHTML: (...args) => calls.push(["footer", ...args]),
  };
  const page = {
    querySelector(selector) {
      if (selector === ".commission-profile-section") return profileSection;
      if (selector === ".commission-transaction-section") return transactionSection;
      return null;
    },
  };
  const appStore = {
    get: () => state,
    set(update) { calls.push(["store", update]); Object.assign(state, update); },
  };
  class ViewLayer {
    constructor() { this.dataset = {}; }
    commissionContract() { return '<button data-commission-profile="p1">Voltar para Ana Lima</button>'; }
    bind() { calls.push(["base-bind"]); }
    querySelector(selector) {
      if (selector === ".commissions-page") return page;
      return controls.get(selector) || null;
    }
    addEventListener(name, handler, capture) { listeners.set(name, { handler, capture }); }
  }
  const shell = {
    classes: new Set(),
    classList: {
      add(name) { shell.classes.add(name); },
      remove(name) { shell.classes.delete(name); },
    },
  };
  const scheduled = [];
  const printed = [];
  installCommissionHistoryControlsV1(ViewLayer, {
    appStore,
    brlToNumber(value) { return Number(String(value).replace(/[R$\s.]/g, "").replace(",", ".")) || 0; },
    commissionDeals: deals,
    commissionProfiles: profiles,
    documentRef: { querySelector: (selector) => selector === ".app-shell" ? shell : null },
    esc: (value) => String(value).replaceAll('"', "&quot;"),
    formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
    ico: (name) => `<i>${name}</i>`,
    notify: (...args) => notifications.push(args),
    setTimeoutRef: (callback, delay) => scheduled.push({ callback, delay }),
    windowRef: { print: () => printed.push(true) },
  });
  return { ViewLayer, appStore, calls, controls, listeners, notifications, printed, profiles, scheduled, shell, state, transactionSection };
};

test("contrato preserva a origem da navegação e rotula retorno à carteira correta", () => {
  const fixture = createFixture();
  const view = new fixture.ViewLayer();
  const html = view.commissionContract({ id: "C-1", profile: "p1" });
  assert.match(html, /data-contract-return data-commission-return="p2"/);
  assert.match(html, /Voltar para Bia Costa/);
});

test("bind mantém ordem da carteira, adiciona rodapé e vincula impressão", () => {
  const fixture = createFixture();
  const view = new fixture.ViewLayer();
  view.bind();

  assert.equal(fixture.calls.filter(([name]) => name === "base-bind").length, 1);
  assert.deepEqual(fixture.calls.find(([name]) => name === "before"), ["before", {}]);
  assert.match(fixture.calls.find(([name]) => name === "footer")[2], /data-commission-import/);
  assert.equal(view.dataset.commissionHistoryBound, "true");
  assert.equal(fixture.listeners.get("click").capture, true);

  fixture.controls.get("[data-commission-print]").listeners.get("click")();
  fixture.controls.get("[data-commission-print-map]").listeners.get("click")();
  fixture.controls.get("[data-commission-export-excel]").listeners.get("click")();
  assert.deepEqual(fixture.printed, [true, true]);
  assert.equal(fixture.shell.classes.has("print-with-map"), true);
  assert.equal(fixture.scheduled[0].delay, 300);
  fixture.scheduled[0].callback();
  assert.equal(fixture.shell.classes.has("print-with-map"), false);
  assert.equal(fixture.controls.get("[data-commission-export]").clicks, 1);
});

test("eventos do contrato atualizam store para abrir e retornar à carteira", () => {
  const fixture = createFixture();
  const view = new fixture.ViewLayer();
  view.bind();
  const handler = fixture.listeners.get("click").handler;
  const invoke = (dataset, hasReturn = false) => {
    let stopped = 0;
    handler({
      target: {
        closest: () => ({
          dataset,
          hasAttribute: (name) => name === "data-contract-return" && hasReturn,
        }),
      },
      stopImmediatePropagation() { stopped++; },
    });
    return stopped;
  };

  assert.equal(invoke({ commissionContract: "C-1" }), 1);
  assert.equal(fixture.state.selectedCommissionContract, "C-1");
  assert.equal(fixture.state.commissionContractReturn, "p1");
  assert.equal(invoke({ commissionOpen: "C-2" }), 1);
  assert.equal(fixture.state.selectedCommissionContract, "C-2");
  assert.equal(fixture.state.commissionContractReturn, null);
  assert.equal(invoke({ commissionReturn: "p2" }, true), 1);
  assert.equal(fixture.state.selectedCommissionProfile, "p2");
  assert.equal(fixture.state.selectedCommissionContract, null);
});

test("importação CSV converte registros e avisa sobre formatos fora do suporte", async () => {
  const fixture = createFixture();
  const view = new fixture.ViewLayer();
  view.bind();
  const onChange = fixture.controls.get("[data-commission-import]").listeners.get("change");
  await onChange({ currentTarget: { files: [{ name: "carteira.xlsx", text: async () => "" }] } });
  assert.deepEqual(fixture.notifications.at(-1), [
    "Planilha carteira.xlsx adicionada à fila de importação. Para importar linhas automaticamente, exporte-a como CSV UTF-8.",
    "warning",
  ]);

  await onChange({ currentTarget: { files: [{
    name: "carteira.csv",
    text: async () => "Responsável;Lote;Quadra;Cliente;Valor;Taxa;Status\nAna Lima;Q-12;Q-12;João;100000;6;Reserva",
  }] } });
  assert.equal(fixture.state.commissionEntries.length, 1);
  assert.equal(fixture.state.commissionEntries[0].profile, "p1");
  assert.equal(fixture.state.commissionEntries[0].lot, "Q-12");
  assert.equal(fixture.state.commissionEntries[0].commission, "R$ 6000.00");
  assert.equal(fixture.state.commissionEntries[0].stage, "Importação CSV");
  assert.deepEqual(fixture.notifications.at(-1), ["1 lançamentos importados para a carteira.", "success"]);
});

test("components.js instala os controles do histórico comercial por módulo", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(composition, /import \{ installCommissionHistoryControlsV1 \} from "\.\/components\/commercial\/commission-history-controls-v1\.mjs\?/);
  assert.match(composition, /installCommissionHistoryControlsV1\(ViewLayer, \{/);
  assert.doesNotMatch(composition, /const viewLayerBindCommissionControls = ViewLayer\.prototype\.bind/);
});
