import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installReportsWorkspaceV1 } from "../../components/finance/reports-workspace-v1.mjs";

const setup = () => {
  const calls = [], state = { reportType: "system-live", reportFamily: "Operacional", reportDocumentLinks: {}, documentCatalog: [] },
    reportCatalog = [{ id: "system-live", family: "Operacional", label: "Resumo", source: "Sessão", columns: [], rows: [] }],
    appStore = { get: () => state, set() {} },
    documentRef = {
      createElement(tag) {
        assert.equal(tag, "template");
        let markup = "";
        return {
          content: { querySelectorAll: () => [], querySelector: () => null },
          set innerHTML(value) { markup = value; },
          get innerHTML() { return markup; },
        };
      },
    },
    ViewLayer = class {
      reports() { return '<label>Período<select data-report-period><option>Hoje</option></select></label><span class="chip violet">Hoje · Atualizado agora</span><small>Planilha disponível: hoje.csv</small><p>Relacionado às tabelas do projeto e ao período selecionado.</p><section class="report-table"><tbody></tbody></section>'; }
      bind() { calls.push("original-bind"); }
    };
  installReportsWorkspaceV1(ViewLayer, {
    appStore,
    syncCashEvidenceReportV1: () => calls.push("cash"),
    syncConstructionFinanceReportsV1: () => calls.push("expenses"),
    syncServiceCompletionReportV1: () => calls.push("completion"),
    reportCatalog,
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    notify: (...args) => calls.push(args),
    documentRef,
    FileReaderCtor: class FileReader {},
    apiFetch: async () => ({ ok: true, json: async () => ({}) }),
    operationalHeaders: () => ({}),
    CSSRef: { escape: (value) => value },
    URLRef: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    schedule: () => 1,
    FormDataCtor: class {},
  });
  return { ViewLayer, calls };
};

test("reports workspace preserves live source annotation and syncs current report catalogs", () => {
  const { ViewLayer, calls } = setup();
  const markup = ViewLayer.prototype.reports.call({});
  assert.match(markup, /Dados da sessão atual/);
  assert.match(markup, /confirme na fonte operacional/);
  assert.deepEqual(calls, ["cash", "expenses", "completion"]);
});

test("reports workspace composes prior bind and its module is installed in components.js", async () => {
  const { ViewLayer, calls } = setup();
  ViewLayer.prototype.bind.call({ querySelector: () => null });
  assert.deepEqual(calls, ["original-bind"]);
  const application = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const composition = await readFile(new URL("../../components/finance/finance-application-composition-v1.mjs", import.meta.url), "utf8");
  assert.match(application, /installFinanceApplicationCompositionV1\(/);
  assert.match(composition, /installReportsWorkspaceV1\(ViewLayer, \{/);
  for (const dependency of ["reportCatalog", "apiFetch", "operationalHeaders", "documentRef,", "FormDataCtor,"])
    assert.ok(composition.includes(dependency), `Missing report injection: ${dependency}`);
});
