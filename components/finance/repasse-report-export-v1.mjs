const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;
const money = (value) => (Number(value || 0) / 100).toFixed(2).replace(".", ",");

/** CSV report for persisted receipts and explicitly configured future installments. */
export const buildRepasseReportCsvV1 = (sales = [], reports = [], { generatedAt = new Date() } = {}) => {
  const saleById = new Map(sales.map((sale) => [String(sale.id), sale]));
  const width = 15;
  const line = (...cells) => [...cells, ...Array(Math.max(0, width - cells.length)).fill("")];
  const rows = [
    line("ATLAS · GESTÃO DE OBRAS & VENDAS", "ALIANÇA PARK"),
    line("RELATÓRIO DE REPASSES", "ENTRADAS REALIZADAS E PROJEÇÕES CONFIGURADAS"),
    line("GERADO EM", generatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })),
    line("LEGENDA", "Realizado = entrada persistida · Projetado = parcela prevista · Sem movimento = sem entradas ou plano"),
    line(),
    line("DADOS DO RELATÓRIO"),
    [
    "Tipo", "Venda", "Lote", "Cliente", "Corretor", "Data", "Prioridade",
    "Entrada recebida (R$)", "Principal (R$)", "Juros (R$)", "Parcela (R$)",
    "Comissão (R$)", "Warley (R$)", "Contraparte (R$)", "Situação",
    ],
  ];
  for (const report of reports) {
    const sale = saleById.get(String(report.saleId));
    if (!sale) continue;
    for (const item of report.current || []) rows.push([
      "Realizado", sale.id, sale.lot, sale.client, sale.broker, item.date,
      item.reasonLabel, money(item.amountCents), "", "", "",
      item.commissionCents == null ? "" : money(item.commissionCents),
      item.primaryCents == null ? "" : money(item.primaryCents),
      item.partnerCents == null ? "" : money(item.partnerCents), "Recebido",
    ]);
    for (const item of report.future || []) rows.push([
      "Projetado", sale.id, sale.lot, sale.client, sale.broker, item.date,
      item.reasonLabel, "", money(item.principalCents), money(item.interestCents),
      money(item.amountCents), item.commissionCents == null ? "" : money(item.commissionCents),
      item.primaryCents == null ? "" : money(item.primaryCents),
      item.partnerCents == null ? "" : money(item.partnerCents), report.forecastStatus,
    ]);
    if (!(report.current || []).length && !(report.future || []).length) rows.push([
      "Sem movimento", sale.id, sale.lot, sale.client, sale.broker, "", "", "", "", "", "", "", "", "", report.forecastStatus,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
};
