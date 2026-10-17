import test from "node:test";
import assert from "node:assert/strict";
import { listRepasseOperationsV1 } from "../../persistence.mjs";
import { REPASSE_PRICE_CATALOG } from "../../repasse-price-catalog.mjs";
import { calculateRepasseReportV1 } from "../../components/finance/repasse-calculation-v1.mjs";
import { installRepassePageV1 } from "../../components/finance/repasse-page-v1.mjs";
import { openLotCashEntryV1 } from "../../components/lots/lot-cash-entry-v1.mjs";

test("Repasse usa o banco SQLite atual, o catálogo oficial e separa registro real de projeção", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { addEventListener() {} };
  try {
    const operations = listRepasseOperationsV1();
    const reports = calculateRepasseReportV1(operations.sales, operations.reasons);
    assert.equal(reports.length, operations.sales.length, "O relatório deve ter exatamente uma linha por venda persistida.");
    const reasonsById = new Map(operations.reasons.map((reason) => [String(reason.id), reason]));
    for (const sale of operations.sales) {
      const report = reports.find((item) => item.saleId === sale.id);
      assert.ok(report, `Relatório ausente para a venda ${sale.id}.`);
      const receipts = sale.receipts || [];
      const receivedCents = receipts.reduce((sum, receipt) => sum + Math.round(Number(receipt.amountCents) || 0), 0);
      const basePriceCents = Math.round(Number(sale.plan?.contractPriceCents || Number(sale.tablePrice?.price) * 100 || sale.valueCents) || 0);
      assert.equal(report.current.length, receipts.length, `Entradas divergentes no relatório de ${sale.id}.`);
      assert.equal(report.receivedCents, receivedCents, `Total recebido divergente no relatório de ${sale.id}.`);
      assert.equal(report.remainingCents, Math.max(0, basePriceCents - receivedCents), `Saldo divergente no relatório de ${sale.id}.`);
      for (const receipt of report.current) {
        const reason = reasonsById.get(String(receipt.repasseReasonId));
        if (!sale.brokerRule?.active || !reason) {
          assert.equal(receipt.commissionCents, null, `Comissão não configurada deve permanecer indefinida: ${sale.id}.`);
          continue;
        }
        const expectedCommission = Math.round(Number(receipt.amountCents) * Number(sale.brokerRule.commissionPercent) / 100 * Number(reason.sharePercent || 0) / 100);
        const primaryShare = receipt.repasseReasonId === "monthly" ? 70 : 50;
        assert.equal(receipt.commissionCents, expectedCommission, `Comissão divergente em ${sale.id}.`);
        assert.equal(receipt.primaryCents, Math.round(expectedCommission * primaryShare / 100), `Divisão do repasse divergente em ${sale.id}.`);
        assert.equal(receipt.partnerCents, expectedCommission - Math.round(expectedCommission * primaryShare / 100), `Parte do parceiro divergente em ${sale.id}.`);
      }
      if (report.forecastStatus === "ready") {
        assert.equal(report.future.reduce((sum, row) => sum + row.principalCents, 0), report.remainingCents, `Parcelas futuras não reconciliam com o saldo de ${sale.id}.`);
        assert.ok(report.future.every((row) => row.amountCents === row.principalCents + row.interestCents), `Juros futuros não foram demonstrados por vencimento em ${sale.id}.`);
      }
    }
    const state = {
      view: "repasses",
      repasseLedgerV1: {
        ...operations,
        reports,
        status: "ready",
      },
    };
    const appStore = { get: () => state, set: (patch) => Object.assign(state, patch) };
    const ViewLayer = function () {};
    installRepassePageV1(ViewLayer, {
      appStore,
      esc: (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])),
      ico: () => "",
      REPASSE_PRICE_CATALOG,
    });

    const markup = ViewLayer.prototype.repasses.call({});
    assert.match(markup, /LANÇAMENTO ÚNICO · ENTRADA \+ REPASSE/);
    assert.match(markup, /Sinal → Intermediária → Mensal/);
    assert.match(markup, /Entradas e repasses atuais/);
    assert.match(markup, /Parcelas e repasses futuros/);
    assert.doesNotMatch(markup, /Perfis de lote relacionados|Registrar saída no caixa/);
    assert.equal(operations.sales.every((sale) => !sale.tablePrice || REPASSE_PRICE_CATALOG.includes(REPASSE_PRICE_CATALOG.find((lot) => lot.label === sale.tablePrice.label))), true);
    assert.equal((markup.match(/data-repasse-sale=/g) || []).length, operations.sales.length);
    assert.equal(markup.includes("data-repasse-entry-form"), operations.sales.some((sale) => sale.tablePrice && sale.broker));

    const registerableSale = operations.sales.find((sale) => sale.tablePrice && sale.broker);
    if (registerableSale) {
      openLotCashEntryV1(appStore, registerableSale.lot, "lot-profile");
      assert.equal(state.view, "repasses");
      assert.equal(state.repasseSelectedLotKey, registerableSale.lot);
      const lotEntryMarkup = ViewLayer.prototype.repasses.call({});
      assert.match(lotEntryMarkup, new RegExp(`<option value="${registerableSale.id}" selected>`));
      assert.match(lotEntryMarkup, /data-repasse-entry-form/);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
