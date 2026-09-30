import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../components.js", import.meta.url), "utf8");
const server = readFileSync(new URL("../../server.mjs", import.meta.url), "utf8");
const persistence = readFileSync(new URL("../../persistence.mjs", import.meta.url), "utf8");

test("seleção e formulário de relatórios participam da atualização da página", () => {
  const renderKey = source.slice(source.indexOf("const renderKey = (state) =>"), source.indexOf("this.render();", source.indexOf("const renderKey = (state) =>")));
  for (const field of ["reportFamily", "reportType", "reportPeriod", "reportBuilderOpen", "customReports"])
    assert.match(renderKey, new RegExp(`state\\.${field}`));
});

test("relatórios distinguem valores atuais, exemplos e modelos sem dados", () => {
  assert.match(source, /Dados da sessão atual/);
  assert.match(source, /Dados demonstrativos · não atualizados automaticamente/);
  assert.match(source, /Modelo configurado · sem dados vinculados/);
  assert.match(source, /replace\(\/<label>Período<select data-report-period>/);
});

test("contagens comerciais não apresentam comissões como contratos", () => {
  const liveReport = source.slice(source.indexOf("function syncLiveSystemReportV1"), source.indexOf("const controlCenterRecordChangeV1", source.indexOf("function syncLiveSystemReportV1")));
  assert.match(liveReport, /Leads captados.*state\.publicLeads/);
  assert.match(liveReport, /Reservas públicas.*state\.publicReservations/);
  assert.match(liveReport, /Lançamentos comerciais.*state\.commissionEntries/);
  assert.doesNotMatch(liveReport, /Contratos registrados/);
});

test("detalhes são intercalados abaixo da linha com cabeçalho e rodapé próprios", () => {
  assert.match(source, /dataRow\.after\(detail\)/);
  assert.match(source, /aria-controls/);
  assert.match(source, /report-expanded-head/);
  assert.match(source, /report-expanded-fields/);
  assert.match(source, /report-expanded-footer/);
});

test("itens financeiros exibem somente comprovantes e documentos vinculados", () => {
  assert.match(source, /id: "cash-evidence-live"/);
  assert.match(source, /report-expanded-documents/);
  assert.match(source, /document\.properties\?\.cashFlowId === entry\.id/);
  assert.match(source, /state\.reportDocumentLinks\?\.\[entry\.id\]/);
  assert.match(source, /Não há recibo ou documento vinculado diretamente a este item/);
  assert.match(source, /data-report-cash-upload/);
  assert.match(source, /data-report-cash-attachment/);
  assert.match(server, /addCashFlowAttachment\(decodeURIComponent\(attachmentMatch\[1\]\)/);
  assert.match(persistence, /export function addCashFlowAttachment/);
  assert.match(persistence, /return \{\.\.\.row,attachments/);
});
