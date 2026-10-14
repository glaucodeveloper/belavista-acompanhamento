import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFinanceWorkspaceV8, installFinancePageV8 } from "../../components/finance/finance-workspace-v8.mjs";

const setup = () => {
  let state = {
    currentActor: { role: "owner", label: "Dono" },
    cashSummary: { balanceCents: 1250000, entriesCents: 1500000, exitsCents: 250000 },
    operationalState: {
      cash: { balanceCents: 1250000, reserveCents: 300000, allocatableCents: 950000 },
      stages: [{ name: "Drenagem Pluvial", needCents: 600000, allocatedCents: 400000, coverage: 66, blockedBy: [] }],
    },
    cashFlowLocal: [{ id: "cash-1", date: "2026-10-12", kind: "entrada", category: "Venda", stage: "Geral", description: "Sinal de lote", amountCents: 1250000 }],
    operationalNotifications: [], operationalAgenda: [],
    cashRecordReturnView: "finance",
  };
  const appStore = { get: () => state, set(patch) { state = { ...state, ...patch }; } },
    ViewLayer = class {};
  const workspace = createFinanceWorkspaceV8({
    appStore,
    executionModel: { stages: [{ name: "Drenagem Pluvial" }] },
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
    queueMicrotaskFn: () => {},
    DateCtor: Date,
  });
  installFinancePageV8(ViewLayer, workspace, appStore);
  return { ViewLayer, workspace, appStore, state: () => state };
};

test("finance page preserves live cash, allocation, launcher and agent-awareness sections", () => {
  const { ViewLayer } = setup();
  const html = ViewLayer.prototype.finance.call({});
  assert.match(html, /Caixa e distribuição da obra/);
  assert.match(html, /R\$ 12500\.00/);
  assert.match(html, /Drenagem Pluvial/);
  assert.match(html, /data-cash-record-open/);
  assert.match(html, /data-agent-awareness/);
  assert.match(html, /data-v7-finance-print/);
});

test("cash-record page preserves stage selection and enforces the existing owner boundary", () => {
  const { ViewLayer, appStore } = setup();
  const ownerHtml = ViewLayer.prototype["cash-record"].call({});
  assert.match(ownerHtml, /data-cash-record-form/);
  assert.match(ownerHtml, /Drenagem Pluvial/);
  assert.match(ownerHtml, /data-cash-record-back/);

  appStore.set({ currentActor: { role: "foreman", label: "Encarregado" } });
  const foremanHtml = ViewLayer.prototype["cash-record"].call({});
  assert.doesNotMatch(foremanHtml, /data-cash-record-form/);
  assert.match(foremanHtml, /pode consultar o caixa, mas não criar lançamentos/);
});

test("components.js injects and installs the extracted finance workspace", async () => {
  const application = await readFile(new URL("../../components.js", import.meta.url), "utf8"),
    composition = await readFile(new URL("../../components/finance/finance-application-composition-v1.mjs", import.meta.url), "utf8"),
    events = await readFile(new URL("../../components/shared/application-event-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(application, /installFinanceApplicationCompositionV1\(/);
  assert.match(composition, /createFinanceWorkspaceV8\(/);
  assert.match(application, /installApplicationEventCompositionV1\(\{/);
  assert.match(events, /installFinancePageV8\(ViewLayer, financeWorkspaceV8, appStore\)/);
  assert.doesNotMatch(application, /ViewLayer\.prototype\.finance = function/);
  assert.match(composition, /const \{ cashRecordLauncherMarkupV1 \} = financeWorkspaceV8/);
});
