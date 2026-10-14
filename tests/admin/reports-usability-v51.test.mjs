import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../components.js", import.meta.url), "utf8");
const liveReports = readFileSync(new URL("../../components/finance/live-report-builders-v1.mjs", import.meta.url), "utf8");
const reports = readFileSync(new URL("../../components/finance/reports-workspace-v1.mjs", import.meta.url), "utf8");
const server = readFileSync(new URL("../../server.mjs", import.meta.url), "utf8");
const persistence = readFileSync(new URL("../../persistence.mjs", import.meta.url), "utf8");

test("seleção e formulário de relatórios participam da atualização da página", () => {
  const renderKey = source.slice(source.indexOf("const renderKey = (state) =>"), source.indexOf("this.render();", source.indexOf("const renderKey = (state) =>")));
  for (const field of ["reportFamily", "reportType", "reportPeriod", "reportBuilderOpen", "customReports"])
    assert.match(renderKey, new RegExp(`state\\.${field}`));
});

test("relatórios distinguem valores atuais, exemplos e modelos sem dados", () => {
  assert.match(reports, /Dados da sessão atual/);
  assert.match(reports, /Dados demonstrativos · não atualizados automaticamente/);
  assert.match(reports, /Modelo configurado · sem dados vinculados/);
  assert.match(reports, /replace\(\/<label>Período<select data-report-period>/);
});

test("contagens comerciais não apresentam comissões como contratos", () => {
  const liveReport = liveReports.slice(liveReports.indexOf("const syncLiveSystemReportV1"));
  assert.match(liveReport, /Leads captados.*state\.publicLeads/);
  assert.match(liveReport, /Reservas públicas.*state\.publicReservations/);
  assert.match(liveReport, /Lançamentos comerciais.*state\.commissionEntries/);
  assert.doesNotMatch(liveReport, /Contratos registrados/);
});

test("detalhes são intercalados abaixo da linha com cabeçalho e rodapé próprios", () => {
  assert.match(reports, /dataRow\.after\(detail\)/);
  assert.match(reports, /aria-controls/);
  assert.match(reports, /report-expanded-head/);
  assert.match(reports, /report-expanded-fields/);
  assert.match(reports, /report-expanded-footer/);
});

test("itens financeiros exibem somente comprovantes e documentos vinculados", () => {
  assert.match(liveReports, /id: "cash-evidence-live"/);
  assert.match(reports, /report-expanded-documents/);
  assert.match(reports, /document\.properties\?\.cashFlowId === entry\.id/);
  assert.match(reports, /state\.reportDocumentLinks\?\.\[entry\.id\]/);
  assert.match(reports, /Não há recibo ou documento vinculado diretamente a este item/);
  assert.match(reports, /data-report-cash-upload/);
  assert.match(reports, /data-report-cash-attachment/);
  assert.match(server, /addCashFlowAttachment\(decodeURIComponent\(attachmentMatch\[1\]\)/);
  assert.match(persistence, /export function addCashFlowAttachment/);
  assert.match(persistence, /return \{\.\.\.row,attachments/);
});
