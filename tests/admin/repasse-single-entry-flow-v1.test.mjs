import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFinanceWorkspaceV8 } from "../../components/finance/finance-workspace-v8.mjs";

test("recebimentos de lotes têm fluxo único em Repasses; caixa geral registra apenas saídas", async () => {
  const state = { currentActor: { role: "owner", label: "Dono" }, cashRecordReturnView: "finance" };
  const workspace = createFinanceWorkspaceV8({
    appStore: { get: () => state, set: (patch) => Object.assign(state, patch) },
    executionModel: { stages: [] },
    esc: (value) => String(value ?? ""),
    ico: () => "",
    formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
    queueMicrotaskFn: () => {},
  });
  const cashPage = workspace.cashRecordPageV1();
  assert.match(cashPage, /type="hidden" name="kind" value="saida"/);
  assert.doesNotMatch(cashPage, /name="lotKey"|value="entrada"|<option value="entrada"/);
  assert.match(workspace.cashRecordLauncherMarkupV1(), /Entradas de lotes e repasses são registradas exclusivamente na página Repasses/);

  const [stageCenter, commercialBinding, cashEvents, fiscalControls] = await Promise.all([
    readFile(new URL("../../components/records/stage-record-center-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/commercial/commercial-views-bind-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/finance/control-page-events-v8.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/finance/cash-record-fiscal-controls-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(stageCenter, /data-dashboard-quick-entry|repasseEntries:\s*\[\.\.\.currentEntries/);
  assert.match(stageCenter, /data-view="repasses"/);
  assert.doesNotMatch(commercialBinding, /name="paymentAmount"|name="paymentDate"|name="paymentStatus"/);
  assert.match(commercialBinding, /data-lot-open-repasses/);
  assert.match(cashEvents, /kind: "saida"/);
  assert.match(fiscalControls, /view: "repasses"/);
  assert.doesNotMatch(fiscalControls, /view: "cash-record"/);
});
