import test from "node:test";
import assert from "node:assert/strict";
import { createLiveReportBuildersV1 } from "../../components/finance/live-report-builders-v1.mjs";

const createBuilders = (reportCatalog = []) => createLiveReportBuildersV1({
  reportCatalog,
  formatBRL: (value) => `R$ ${Number(value).toFixed(2)}`,
  stageRecordStagesV1: () => [{ key: "stage-1", name: "Terraplanagem" }],
  stageRecordStageForV1: (entry, stages) => stages.find((stage) => stage.key === entry.stageKey),
  stageRecordServiceRowsV1: (state) => state.services || [],
  isAssistantVisualAdditionV1: (record) => record.source === "chat-visual",
  controlCenterMaterialRowsV1: (state) => state.materials || [],
});

test("live cash reports replace their catalog entries and retain linked records", () => {
  const existing = { id: "cash-evidence-live", label: "stale" },
    catalog = [existing],
    builders = createBuilders(catalog),
    entry = {
      id: "cash-1", date: "2026-10-12", category: "Concreto", stage: "Terraplanagem",
      amountCents: 12500, fiscalStatus: "conferido", attachments: [{ name: "nota.pdf" }],
    };

  builders.syncCashEvidenceReportV1({ cashFlowLocal: [entry] });

  assert.equal(catalog.length, 1);
  assert.notEqual(catalog[0], existing);
  assert.equal(catalog[0].rows[0][3], "R$ 125.00");
  assert.deepEqual(catalog[0].entries, [entry]);
});

test("construction finance reports aggregate only outgoing cash records by stage", () => {
  const catalog = [], builders = createBuilders(catalog);
  builders.syncConstructionFinanceReportsV1({ cashFlowLocal: [
    { id: "out-1", kind: "saída", amountCents: 10000, category: "Tubos", stageKey: "stage-1", date: "2026-10-10" },
    { id: "out-2", kind: "despesa", amountCents: 2500, category: "Tubos", stageKey: "stage-1", date: "2026-10-11" },
    { id: "in-1", kind: "entrada", amountCents: 50000, category: "Aporte", stageKey: "stage-1" },
  ] });

  const grouped = catalog.find((report) => report.id === "project-expenses-live"),
    ledger = catalog.find((report) => report.id === "project-expense-ledger-live");
  assert.equal(grouped.metrics[0][1], "R$ 125.00");
  assert.deepEqual(grouped.rows, [["Terraplanagem", "Tubos", "2", "R$ 125.00", "2026-10-11"]]);
  assert.deepEqual(ledger.entries.map((entry) => entry.id), ["out-1", "out-2"]);
});

test("service completion honors final status when OCR progress defaults to zero", () => {
  const catalog = [], builders = createBuilders(catalog);
  builders.syncServiceCompletionReportV1({
    services: [{ recordId: "record-1", stageKey: "stage-1", status: "Concluído" }],
    records: [{ id: "record-1", source: "chat-visual", allocationTarget: "serviço", progresso: 0 }],
  });

  const report = catalog.find((item) => item.id === "service-completeness-live");
  assert.equal(report.metrics[0][1], "100%");
  assert.deepEqual(report.rows[0], ["Terraplanagem", "1", "1", "100%", "Com evidência"]);
});

test("system report reads current state and updates only its own catalog record", () => {
  const catalog = [{ id: "other-report" }, { id: "system-live", label: "stale" }],
    builders = createBuilders(catalog);
  builders.syncLiveSystemReportV1({
    cashSummary: { balanceCents: 12345, entriesCents: 20000, exitsCents: 7655 },
    cashFlowLocal: [{ id: "cash-1" }],
    records: [{ id: "record-1" }],
    operationalState: { stages: [{ key: "stage-1" }] },
    materials: [{ id: "material-1" }, { id: "material-2" }],
    publicLeads: [{ id: "lead-1" }],
    publicReservations: [{ id: "reservation-1" }],
    commissionEntries: [{ id: "commission-1" }],
    operationalNotifications: [{ id: "notification-1" }],
  });

  assert.equal(catalog.length, 2);
  const report = catalog.find((item) => item.id === "system-live");
  assert.equal(report.rows[0][1], "R$ 123.45");
  assert.deepEqual(report.rows.slice(3).map((row) => row[1]), ["1", "1", "1", "2", "1", "1", "1", "1"]);
});
