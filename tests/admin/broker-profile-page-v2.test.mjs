import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installBrokerProfilePageV2 } from "../../components/commercial/brokers-page.mjs";
import { installBrokerProfileRegistrationV1 } from "../../components/commercial/broker-profile-registration-v1.mjs";

const commissionDeals = [
  { id: "C-1", profile: "broker-1", value: "1000", commission: "100", reason: "Sinal", payment: "À vista", lot: "QD1-L1", client: "Cliente janeiro", rate: "10%", status: "Assinado", date: "03/01/2025" },
  { id: "C-2", profile: "broker-1", value: "2000", commission: "200", reason: "Mensal", payment: "Parcela mensal", lot: "QD1-L2", client: "Cliente março", rate: "10%", status: "Em acompanhamento", date: "2025-03-14" },
  { id: "C-3", profile: "other-broker", value: "9999", commission: "999", reason: "Mensal", payment: "Parcela mensal", lot: "QD9-L9", client: "Outro corretor", rate: "10%", status: "Assinado", date: "2025-03-15" },
];
const profile = {
  id: "broker-1", avatar: "#123", initials: "AC", creci: "12345",
  name: "Ana Corretora", role: "Corretora", sales: 2, commission: "R$ 300",
  conversion: "10%", phone: "5511999999999", emails: ["ana@example.test"],
};
const rules = [
  { id: "signal", label: "Sinal", payment: "À vista / sinal", warley: 50, partner: 50, sharePercent: 40 },
  { id: "intermediate", label: "Parcela intermediária", payment: "Parcela intermediária", warley: 50, partner: 50, sharePercent: 30 },
  { id: "monthly", label: "Mensal", payment: "Parcelas mensais", warley: 70, partner: 30, sharePercent: 30 },
];
const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
};
const dependencies = (overrides = {}) => ({
  appStore: { get: () => ({ commissionEntries: [], brokerPrintMode: "monthly", brokerPrintMonth: "2025-03" }), set() {} },
  commissionDeals,
  brokerReasonsV9: () => rules,
  brlToNumber: (value) => Number(value) || 0,
  formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
  esc: (value) => String(value ?? ""),
  ico: (name) => `<i>${name}</i>`,
  notify() {},
  storage: createStorage(),
  fileToDataUrl: async (file) => `data:${file.name}`,
  windowRef: { print() {} },
  ...overrides,
});

test("broker profile preserves monthly and annual reporting, lot ledger, and attached-file listing", () => {
  class ViewLayer {}
  const deps = dependencies({
    storage: createStorage({
      "belavista.broker-profile-attachments.v2": JSON.stringify({
        "broker-1": [{ name: "contrato.pdf", type: "application/pdf", size: 12, dataUrl: "data:pdf" }],
      }),
    }),
  });
  installBrokerProfilePageV2(ViewLayer, deps);
  const markup = new ViewLayer().commissionProfile(profile);

  assert.match(markup, /broker-profile-v2/);
  assert.match(markup, /value="monthly" checked/);
  assert.match(markup, /value="2025-03"/);
  assert.match(markup, /Cliente março/);
  const printedLedger = markup.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  assert.doesNotMatch(printedLedger, /Cliente janeiro/);
  assert.match(markup, /<h2>Negociações do corretor<\/h2>[\s\S]*Cliente janeiro/);
  assert.doesNotMatch(markup, /Outro corretor/);
  assert.match(markup, /contrato\.pdf/);
  assert.match(markup, /R\$ 2000\.00/);
  assert.match(markup, /data-broker-print-v2/);
});

test("broker profile binds filters, print, attachment add/remove, validation and persistence", async () => {
  class ViewLayer { bind() { this.baseBindCalled = true; return "base-result"; } }
  const statePatches = [], notifications = [], printed = [], renders = [];
  const storage = createStorage();
  const handlers = new Map();
  const inputs = ["monthly", "annual"].map((value) => ({
    value,
    addEventListener(type, handler) { handlers.set(`mode:${value}`, { type, handler }); },
  }));
  const removeButton = {
    dataset: { brokerAttachmentRemove: "0" },
    addEventListener(type, handler) { handlers.set("[data-broker-attachment-remove]", { type, handler }); },
  };
  const page = {
    dataset: { brokerId: "broker-1" },
    querySelectorAll(selector) {
      if (selector === '[name="brokerPrintMode"]') return inputs;
      if (selector === "[data-broker-attachment-remove]") return [removeButton];
      return [];
    },
    querySelector(selector) {
      return {
        addEventListener(type, handler) { handlers.set(selector, { type, handler }); },
      };
    },
  };
  const deps = dependencies({
    appStore: { get: () => ({ commissionEntries: [] }), set: (patch) => statePatches.push(patch) },
    storage,
    fileToDataUrl: async (file) => `data:${file.name}`,
    notify: (...args) => notifications.push(args),
    windowRef: { print: () => printed.push(true) },
  });
  installBrokerProfilePageV2(ViewLayer, deps);
  const view = Object.assign(new ViewLayer(), { querySelector: () => page, render: () => renders.push(true) });
  assert.equal(view.bind(), "base-result");
  assert.equal(view.baseBindCalled, true);

  handlers.get("[data-broker-apply-rules]").handler();
  handlers.get("mode:annual").handler({ target: { value: "annual" } });
  handlers.get("[data-broker-print-month]").handler({ target: { value: "2025-03" } });
  handlers.get("[data-broker-print-year]").handler({ target: { value: "2025" } });
  handlers.get("[data-broker-print-v2]").handler();
  assert.deepEqual(statePatches, [
    {
      commissionRulesAppliedAt: statePatches[0].commissionRulesAppliedAt,
      lastAction: "Aplicou regras de repasse na carteira dedicada",
    },
    { brokerPrintMode: "annual" },
    { brokerPrintMonth: "2025-03" },
    { brokerPrintYear: "2025" },
  ]);
  assert.deepEqual(printed, [true]);
  assert.deepEqual(renders, [true, true, true]);
  assert.match(statePatches[0].commissionRulesAppliedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(notifications[0], ["Regras atuais aplicadas à tabela da carteira.", "success"]);

  const fileHandler = handlers.get("[data-broker-attachment]").handler;
  const invalidEvent = { target: { files: [{ size: 9, type: "text/plain" }], value: "selected" } };
  await fileHandler(invalidEvent);
  assert.equal(invalidEvent.target.value, "");
  assert.equal(notifications[1][1], "warning");

  await fileHandler({ target: { files: [{ name: "contrato.pdf", size: 1024, type: "application/pdf" }] } });
  const saved = JSON.parse(storage.getItem("belavista.broker-profile-attachments.v2"));
  assert.deepEqual(saved["broker-1"], [{ name: "contrato.pdf", type: "application/pdf", size: 1024, dataUrl: "data:contrato.pdf" }]);
  const removeHandler = handlers.get("[data-broker-attachment-remove]").handler;
  removeHandler(removeButton);
  assert.deepEqual(JSON.parse(storage.getItem("belavista.broker-profile-attachments.v2"))["broker-1"], []);
});

test("broker profile validates injected dependencies and is installed in the original lifecycle position", async () => {
  class ViewLayer { bind() {} }
  assert.throws(() => installBrokerProfilePageV2(ViewLayer, {}), /appStore\.get\(\)/);
  const installed = installBrokerProfileRegistrationV1({
    ViewLayer,
    appStore: dependencies().appStore,
    commissionDeals,
    brokerReasonsV9: () => rules,
    brlToNumber: (value) => Number(value) || 0,
    formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    notify() {},
    storage: createStorage(),
    fileToDataUrl: async (file) => `data:${file.name}`,
    windowRef: { print() {} },
  });
  assert.equal(installed, ViewLayer);
  assert.equal(typeof ViewLayer.prototype.commissionProfile, "function");
  assert.match(new ViewLayer().commissionProfile(profile), /broker-profile-v2/);
  const source = await readFile(new URL("../../components/index.mjs", import.meta.url), "utf8");
  const call = source.indexOf("installBrokerProfileRegistrationV1({");
  const lotCall = source.indexOf("installLotProjectWorkspacesRegistrationV1({", call);
  const nextInstaller = source.indexOf("installDataTableControlsV1(ViewLayer);", lotCall);
  const registration = await readFile(new URL("../../components/commercial/broker-profile-registration-v1.mjs", import.meta.url), "utf8");
  assert.ok(call >= 0 && call < lotCall && lotCall < nextInstaller);
  assert.match(source.slice(call, lotCall), /fileToDataUrl:\s*commissionFileToDataUrlV1/);
  assert.match(registration, /installBrokerProfilePageV2\(ViewLayer/);
  assert.doesNotMatch(registration, /installLotDevelopmentPageV1|installProjectDocumentsPageV1/);
  const lotWorkspaces = await readFile(new URL("../../components/lots/lot-project-workspaces-registration-v1.mjs", import.meta.url), "utf8");
  assert.ok(lotWorkspaces.indexOf("installLotDevelopmentPageV1(ViewLayer") < lotWorkspaces.indexOf("installProjectDocumentsPageV1(ViewLayer"));
  assert.doesNotMatch(source, /installBrokerProfilePageV9/);
});
