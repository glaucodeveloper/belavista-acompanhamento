import { renderLotCashEntriesV1, lotCashEntriesV1 } from "./lot-cash-entry-v1.mjs";

const detailState = (state, lotKey) => ({
  lotStatus: state.lotStatuses?.[lotKey] || {},
  plans: Array.isArray(state.lotPaymentPlans?.[lotKey]) ? state.lotPaymentPlans[lotKey] : [],
  documents: Array.isArray(state.lotDocuments?.[lotKey]) ? state.lotDocuments[lotKey] : [],
  history: Array.isArray(state.lotHistory?.[lotKey]) ? state.lotHistory[lotKey] : [],
});

const detailHistory = (state, lotKey, lotStatus, history, formatBRL) => {
  const entries = lotCashEntriesV1(state, lotKey)
    .map((entry) => ({
      id: entry.id,
      at: entry.createdAt || entry.date || "",
      type: "Entrada no caixa",
      detail: `${formatBRL(Number(entry.amountCents || 0) / 100)} · ${entry.category || entry.description || "Sem descrição"}`,
    }));
  const statusEvent = lotStatus.updatedAt
    ? [{
        id: `status-${lotStatus.updatedAt}`,
        at: lotStatus.updatedAt,
        type: "Controle comercial atualizado",
        detail: `${lotStatus.status || "Disponível"} · ${lotStatus.payment?.status || "Pendente"}`,
      }]
    : [];
  return [...history, ...entries, ...statusEvent]
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
};

const detailDate = (value, DateCtor) => {
  if (!value) return "Sem data";
  const date = new DateCtor(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const exportEsc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const exportMoney = (value) => Number(value || 0).toLocaleString("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const createLotDetailPageV1 = ({
  REPASSE_PRICE_CATALOG = [],
  appStore,
  commissionProfiles = [],
  esc,
  formatBRL,
  ico,
  host = globalThis,
} = {}) => {
  if (!appStore?.get || !Array.isArray(REPASSE_PRICE_CATALOG) ||
      typeof esc !== "function" || typeof formatBRL !== "function" || typeof ico !== "function")
    throw new TypeError("Lot detail page requires its catalog, store, and rendering helpers.");

  const lotExportRowV1 = (lot, state = appStore.get()) => {
    const details = state.lotStatuses?.[lot.label] || {};
    return {
      ...lot,
      status: details.status || "Disponível",
      paymentStatus: details.payment?.status || "Pendente",
      sellerName: details.sellerName || "",
      client: details.client || "",
      note: details.note || "",
    };
  };

  const downloadBrandedLotExcelV1 = ({
    lots,
    title = "Tabela de lotes",
    subtitle = "Valores, status e pagamentos",
    filename = "alianca-park-lotes",
  } = {}) => {
    const rows = Array.isArray(lots) ? lots : [],
      gross = rows.reduce((total, item) => total + Number(item.price || 0), 0),
      occupied = rows.filter((item) => !["", "Disponível"].includes(String(item.status || "Disponível"))).length,
      now = new host.Date().toLocaleString("pt-BR");
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><meta name="ProgId" content="Excel.Sheet"><style>table{border-collapse:collapse;font-family:Arial,sans-serif}td{border:1px solid #C6CFD8;padding:7px;color:#17212B;font-size:10pt}.brand{background:#09233B;color:#FFF;font-size:18pt;font-weight:bold;height:34px}.kicker{background:#09233B;color:#9FC8FF;font-size:9pt;font-weight:bold}.title{background:#EEF5FB;color:#09233B;font-size:16pt;font-weight:bold}.subtitle{background:#EEF5FB;color:#516170;font-size:10pt}.label{background:#DCEAF5;color:#315D87;font-size:8pt;font-weight:bold}.metric{background:#F7FAFC;color:#09233B;font-size:13pt;font-weight:bold}.head{background:#09233B;color:#FFF;font-size:9pt;font-weight:bold;text-align:center}.money{mso-number-format:'\\\"R$\\\" #,##0.00';text-align:right}.number{text-align:right}.status{background:#E8F5EC;color:#176B3A;font-weight:bold}.footer{background:#F2F4F8;color:#5A6875;font-size:8pt}</style></head><body><table><colgroup><col width="16"><col width="13"><col width="13"><col width="15"><col width="18"><col width="18"><col width="24"><col width="30"></colgroup><tr><td class="brand" colspan="8">ALIANÇA PARK · LOTEAMENTO</td></tr><tr><td class="kicker" colspan="8">RELATÓRIO COMERCIAL · EXPORTAÇÃO EXCEL</td></tr><tr><td class="title" colspan="8">${exportEsc(title)}</td></tr><tr><td class="subtitle" colspan="8">${exportEsc(subtitle)} · Emitido em ${exportEsc(now)}</td></tr><tr><td class="label" colspan="2">LOTES LISTADOS</td><td class="label" colspan="2">VALOR DE TABELA</td><td class="label" colspan="2">COM CONTROLE</td><td class="label" colspan="2">EMITIDO POR</td></tr><tr><td class="metric" colspan="2">${rows.length}</td><td class="metric money" colspan="2">${exportMoney(gross)}</td><td class="metric" colspan="2">${occupied}</td><td class="metric" colspan="2">Aliança Park</td></tr><tr><td class="head">LOTE</td><td class="head">QUADRA</td><td class="head">ÁREA (m²)</td><td class="head">VALOR À VISTA</td><td class="head">STATUS</td><td class="head">PAGAMENTO</td><td class="head">VENDEDOR</td><td class="head">CLIENTE / OBSERVAÇÃO</td></tr>${rows.map((item) => `<tr><td>${exportEsc(item.label || item.lot)}</td><td>${exportEsc(item.quadra)}</td><td class="number">${exportEsc(item.area)}</td><td class="money">${exportMoney(item.price)}</td><td class="status">${exportEsc(item.status || "Disponível")}</td><td>${exportEsc(item.paymentStatus || "Pendente")}</td><td>${exportEsc(item.sellerName || "—")}</td><td>${exportEsc(item.client || item.note || "—")}</td></tr>`).join("")}<tr><td class="footer" colspan="8">Documento timbrado para apoio comercial e conferência de valores · Aliança Park Loteamento</td></tr></table></body></html>`;
    const blob = new host.Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }),
      url = host.URL.createObjectURL(blob),
      link = host.document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new host.Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    host.setTimeout(() => host.URL.revokeObjectURL(url), 1000);
  };

  const render = function () {
    const state = appStore.get(),
      fallbackLot = REPASSE_PRICE_CATALOG[0],
      lotKey = String(state.selectedLotDetailKey || fallbackLot?.label || ""),
      lot = REPASSE_PRICE_CATALOG.find((item) => String(item.label) === lotKey) || fallbackLot;
    if (!lot) return `<section class="lot-detail-page"><p class="empty-data">Nenhum lote disponível na tabela de preços.</p></section>`;
    const { lotStatus, plans, documents, history } = detailState(state, lotKey),
      partners = state.repassePartners || commissionProfiles.map((person) => ({ id: person.id, name: person.name })),
      sellerId = lotStatus.sellerId || "",
      payment = lotStatus.payment || {},
      paymentTotal = plans.reduce((total, plan) => total + Math.max(0, Number(plan.amount) || 0), 0),
      derivedHistory = detailHistory(state, lotKey, lotStatus, history, formatBRL),
      cashEntries = renderLotCashEntriesV1({ state, lotKey, esc, formatBRL, ico }),
      statusOptions = ["Disponível", "Reservado", "Em negociação", "Vendido", "Repasse programado", "Quitado", "Bloqueado"],
      paymentOptions = ["Pendente", "Parcial", "Pago", "Cancelado"],
      selected = (value, current) => String(value) === String(current) ? " selected" : "";
    return `<section class="lot-detail-page" data-lot-detail-page data-lot-key="${esc(lotKey)}">
    <header class="lot-detail-head">
      <div><button type="button" class="lot-detail-back" data-view="brokers-board">${ico("arrow-left")} Voltar à tabela</button><span class="activity-kind">FICHA COMERCIAL · ${esc(lot.quadra)}</span><h1>Lote ${esc(lot.lot)}</h1><p>${esc(lotKey)} · ${esc(lot.area)} m² · valor de tabela <b>${formatBRL(lot.price)}</b></p></div>
      <div class="lot-detail-head-state"><span class="lot-status-pill">${esc(lotStatus.status || "Disponível")}</span><span class="lot-payment-pill">${esc(payment.status || "Pendente")}</span><button type="button" class="toolbar-action" data-lot-detail-print>${ico("printer")} PDF</button><button type="button" class="toolbar-action" data-lot-detail-excel>${ico("download")} Excel</button></div>
    </header>
    <details class="lot-detail-map-drawer" open><summary><span>${ico("map")} Mapa e localização do lote</span><small>Recolha para priorizar a ficha · o marcador do lote fica destacado</small></summary><div class="lot-detail-map-window"><map-scene compact interactive data-public-static-only data-admin-public-map data-lot-detail-map data-lot-detail-number="${esc(lot.lot)}" data-stage="Lote ${esc(lotKey)}" data-overlay="urbanizacao" aria-label="Mapa do lote ${esc(lotKey)}"></map-scene></div></details>
    <div class="lot-detail-layout">
      <form class="lot-detail-form" data-lot-detail-form>
        <input type="hidden" name="lotKey" value="${esc(lotKey)}">
        <section class="lot-detail-section"><header><span>01</span><div><h2>Dados e controle comercial</h2><p>Edite a situação do lote, o responsável e o recebimento principal.</p></div></header><div class="lot-detail-fields">
          <label>Lote<input value="${esc(lotKey)}" disabled></label><label>Quadra<input value="${esc(lot.quadra)}" disabled></label><label>Área (m²)<input value="${esc(lot.area)}" disabled></label><label>Valor de tabela<input value="${formatBRL(lot.price)}" disabled></label>
          <label>Status<select name="status">${statusOptions.map((value) => `<option${selected(value, lotStatus.status || "Disponível")}>${esc(value)}</option>`).join("")}</select></label>
          <label>Vendedor<select name="sellerId"><option value="">Não definido</option>${commissionProfiles.map((person) => `<option value="${esc(person.id)}"${selected(person.id, sellerId)}>${esc(person.name)}</option>`).join("")}</select></label>
          <label>Sócio do repasse<select name="repassePartnerId"><option value="">Não definido</option>${partners.map((person) => `<option value="${esc(person.id)}"${selected(person.id, lotStatus.repasse?.partnerId || "")}>${esc(person.name)}</option>`).join("")}</select></label>
          <label>Cliente / interessado<input name="client" value="${esc(lotStatus.client || "")}" placeholder="Nome do cliente"></label>
          <label>Status do pagamento<select name="paymentStatus">${paymentOptions.map((value) => `<option${selected(value, payment.status || "Pendente")}>${esc(value)}</option>`).join("")}</select></label>
          <label>Entrada recebida (R$)<input name="paymentAmount" type="number" min="0" step="0.01" value="${esc(payment.amount ?? "")}" placeholder="0,00"></label>
          <label>Data do recebimento<input name="paymentDate" type="date" value="${esc(payment.date || "")}"></label>
          <label class="wide">Observações<textarea name="note" rows="4" placeholder="Condições, contato, pendências e observações">${esc(lotStatus.note || "")}</textarea></label>
        </div><footer><span data-lot-detail-form-feedback>Alterações são gravadas no controle comercial deste lote.</span><button type="submit" class="toolbar-primary">${ico("save")} Salvar detalhes</button></footer></section>
      </form>
      <aside class="lot-detail-side">
        <section class="lot-detail-section" data-lot-payment-plans><header><span>02</span><div><h2>Plano de pagamento</h2><p>${plans.length} parcela(s) · ${formatBRL(paymentTotal)} programado(s)</p></div></header><ol class="lot-detail-plan-list">${plans.map((plan) => `<li data-lot-plan-id="${esc(plan.id)}"><div><b>${esc(plan.description || "Parcela")}</b><small>${esc(plan.dueDate || "Sem vencimento")} · ${esc(plan.status || "Pendente")}</small></div><strong>${formatBRL(plan.amount || 0)}</strong><span><button type="button" data-lot-plan-edit="${esc(plan.id)}">Editar</button><button type="button" data-lot-plan-delete="${esc(plan.id)}">Excluir</button></span></li>`).join("") || `<li class="empty-data">Nenhuma parcela programada.</li>`}</ol><form class="lot-detail-inline-form" data-lot-plan-form><input type="hidden" name="id"><label>Descrição<input name="description" required placeholder="Ex.: Parcela 01"></label><label>Vencimento<input name="dueDate" type="date"></label><label>Valor (R$)<input name="amount" required type="number" min="0.01" step="0.01"></label><label>Status<select name="status">${paymentOptions.map((value) => `<option>${esc(value)}</option>`).join("")}</select></label><footer><button type="reset" data-lot-plan-cancel hidden>Cancelar edição</button><button type="submit">Adicionar parcela</button></footer></form></section>
        <section class="lot-detail-section lot-detail-cash" data-lot-cash-entries><header><span>03</span><div><h2>Entradas de caixa</h2><p>Recebimentos efetivamente lançados no caixa e vinculados a este lote.</p></div></header>${cashEntries}</section>
        <section class="lot-detail-section" data-lot-documents><header><span>04</span><div><h2>Documentos associados</h2><p>Arquivos são enviados ao repositório GitHub e vinculados ao lote.</p></div></header><ul class="lot-detail-document-list">${documents.map((document) => `<li data-lot-document-id="${esc(document.id)}"><span>${ico("file-text")}</span><div><b>${esc(document.title || "Documento sem título")}</b><small>${esc(document.kind || "Documento")} · ${esc(document.note || "Sem observação")}</small>${document.fileName ? `<small>Arquivo: ${esc(document.fileName)}</small>` : ""}${document.url ? `<a href="${esc(document.url)}" target="_blank" rel="noreferrer">Abrir no GitHub</a>` : ""}</div><span><button type="button" data-lot-document-edit="${esc(document.id)}">Editar</button><button type="button" data-lot-document-delete="${esc(document.id)}">Excluir</button></span></li>`).join("") || `<li class="empty-data">Nenhum documento associado.</li>`}</ul><form class="lot-detail-inline-form" data-lot-document-form><input type="hidden" name="id"><label>Título<input name="title" required placeholder="Ex.: Contrato assinado"></label><label>Categoria<input name="kind" placeholder="Contrato, recibo, planta…"></label><label class="wide">Arquivo<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><label class="wide">Observação<input name="note" placeholder="Descrição do documento"></label><footer><span class="lot-detail-upload-status" data-lot-document-upload-status>PDF ou imagem de até 6 MB.</span><button type="reset" data-lot-document-cancel hidden>Cancelar edição</button><button type="submit">Enviar e associar</button></footer></form></section>
      </aside>
      <section class="lot-detail-section lot-detail-history" data-lot-history><header><span>05</span><div><h2>Histórico do lote</h2><p>Alterações do controle, entradas e registros associados.</p></div></header><ol>${derivedHistory.map((item) => `<li><time>${esc(detailDate(item.at, host.Date))}</time><div><b>${esc(item.type)}</b><small>${esc(item.detail || "Sem detalhes")}</small></div></li>`).join("") || `<li class="empty-data">Nenhum evento registrado para este lote.</li>`}</ol></section>
    </div>
  </section>`;
  };

  return Object.freeze({ render, downloadBrandedLotExcelV1, lotExportRowV1 });
};

