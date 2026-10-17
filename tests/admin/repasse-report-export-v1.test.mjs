import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRepasseReportCsvV1 } from '../../components/finance/repasse-report-export-v1.mjs';

test('CSV de repasses inclui realizado, divisão e estado sem previsão quando falta plano', () => {
  const csv = buildRepasseReportCsvV1([
    { id: 'sale-1', lot: 'QA-023', client: 'Cliente', broker: 'Corretor' },
  ], [
    {
      saleId: 'sale-1', forecastStatus: 'payment-plan-required',
      current: [{ date: '2026-10-17', reasonLabel: 'Sinal', amountCents: 10000, commissionCents: 240, primaryCents: 120, partnerCents: 120 }],
      future: [],
    },
  ], { generatedAt: new Date("2026-10-17T12:00:00-03:00") });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"ATLAS · GESTÃO DE OBRAS & VENDAS";"ALIANÇA PARK"/);
  assert.match(csv, /"RELATÓRIO DE REPASSES";"ENTRADAS REALIZADAS E PROJEÇÕES CONFIGURADAS"/);
  assert.match(csv, /"GERADO EM";"17\/10\/2026, 12:00"/);
  assert.match(csv, /"Realizado";"sale-1";"QA-023"/);
  assert.match(csv, /"100,00"/);
  assert.match(csv, /"2,40";"1,20";"1,20";"Recebido"/);
  assert.doesNotMatch(csv, /"Projetado"/);
});

test('CSV escapa delimitadores, aspas e quebras de linha em campos comerciais', () => {
  const csv = buildRepasseReportCsvV1([
    { id: 'sale-1', lot: 'QA;023', client: 'Cliente "A"\nB', broker: 'Corretor' },
  ], [{ saleId: 'sale-1', forecastStatus: 'payment-plan-required', current: [], future: [] }]);
  assert.match(csv, /"QA;023";"Cliente ""A"" B"/);
  assert.match(csv, /"DADOS DO RELATÓRIO"/);
  assert.match(csv, /"Sem movimento"/);
});
