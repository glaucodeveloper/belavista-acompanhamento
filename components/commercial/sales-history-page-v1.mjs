/** Full sales-history route renderer with its commercial read-model injected. */
export const createSalesHistoryPageV1 = ({
  appStore,
  commercialDealsForWorkspaceV1,
  commissionNegotiationProfileV1,
  commissionNegotiationTransactionsV1,
  commissionAttachmentListV1,
  contractStatusClassV1,
  esc,
  formatBRL,
  brlToNumber,
  ico,
} = {}) => {
  if (typeof appStore?.get !== "function") throw new TypeError("Sales history requires appStore.get().");
  for (const [name, implementation] of Object.entries({
    commercialDealsForWorkspaceV1, commissionNegotiationProfileV1,
    commissionNegotiationTransactionsV1, commissionAttachmentListV1,
    contractStatusClassV1, esc, formatBRL, brlToNumber, ico,
  })) if (typeof implementation !== "function") throw new TypeError("Sales history requires " + name + "().");

  const renderSalesHistory = function () {
    const state = appStore.get(),
      deals = commercialDealsForWorkspaceV1(state),
      selectedId = state.selectedSalesHistoryId,
      deal = selectedId ? deals.find((item) => String(item.id) === String(selectedId)) : null;
    if (selectedId && deal) {
      const profile = commissionNegotiationProfileV1(deal.profile),
        transactions = commissionNegotiationTransactionsV1(deal, profile),
        linked = state.commissionDealAttachments?.[deal.id] || {},
        attachments = commissionAttachmentListV1(linked);
      return `<section class="sales-history-page"><div class="sales-history-toolbar"><button type="button" class="toolbar-action" data-history-back>${ico("arrow-left")} Histórico de vendas</button><button type="button" class="toolbar-action" data-history-print>${ico("printer")} Imprimir / PDF</button></div><header class="sales-history-detail-head"><div><span class="activity-kind">RELATÓRIO DE VENDA · ${esc(deal.id || "REGISTRO")}</span><h1>${esc(deal.client || "Cliente não informado")}</h1><p>${esc(deal.lot || "Lote a definir")} · ${esc(deal.quadra || "Quadra não informada")} · corretor ${esc(profile.name)}</p></div><span class="deal-status ${contractStatusClassV1(deal.status || deal.stage)}">${esc(deal.status || deal.stage || "Em acompanhamento")}</span></header><section class="sales-history-facts"><article><small>VALOR DO LOTE</small><b>${formatBRL(brlToNumber(deal.value))}</b><span>${esc(deal.payment || "Condição de pagamento não informada")}</span></article><article><small>COMISSÃO</small><b>${formatBRL(brlToNumber(deal.commission))}</b><span>${esc(deal.rate || "Taxa não informada")}</span></article><article><small>DATA / ETAPA</small><b>${esc(deal.date || "Sem data")}</b><span>${esc(deal.stage || "Etapa não informada")}</span></article><article><small>CADASTRO</small><b>${esc(profile.name)}</b><span>${esc(deal.cpf || "Documento não informado")} · ${esc(deal.purpose || "Finalidade não informada")}</span></article></section><section class="sales-history-report-grid"><article><header><div><span class="activity-kind">LINHA DO TEMPO</span><h2>Transações e atualizações</h2></div><span>${transactions.length} registro(s)</span></header><ol>${transactions.map((item) => `<li><span><b>${esc(item.label || item.type || "Transação")}</b><small>${esc(item.detail || item.description || "")}</small></span><span><b>${esc(item.value || item.amount || "—")}</b><small>${esc(item.at || item.date || deal.date || "")}</small></span><em>${esc(item.status || "Registrada")}</em></li>`).join("") || '<li class="empty-data">Sem transações registradas.</li>'}</ol><div class="sales-history-notes"><h3>Observações</h3><p>${esc(deal.notes || "Nenhuma observação registrada.")}</p></div></article><article class="sales-history-attachments"><header><div><span class="activity-kind">ARQUIVOS ASSOCIADOS</span><h2>Contrato e documentos do cliente</h2></div></header><ul>${attachments || '<li class="empty-data">Nenhum anexo vinculado a esta venda.</li>'}</ul><button type="button" class="toolbar-action" data-history-edit-deal="${esc(deal.id)}">Abrir cadastro completo ${ico("arrow-up-right")}</button></article></section></section>`;
    }
    const ordered = [...deals].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return `<section class="sales-history-page"><header class="sales-history-head"><div><span class="activity-kind">GESTÃO COMERCIAL · ARQUIVO</span><h1>Histórico de vendas</h1><p>Relatórios por venda com pagamentos, atualizações, corretor e arquivos anexados.</p></div><label>Buscar venda<input type="search" data-history-search placeholder="Cliente, lote, corretor ou contrato"></label></header><section class="sales-history-summary"><article><small>VENDAS REGISTRADAS</small><b>${ordered.length}</b><span>histórico comercial completo</span></article><article><small>VALOR TOTAL</small><b>${formatBRL(ordered.reduce((sum, item) => sum + brlToNumber(item.value), 0))}</b><span>valor vinculado às vendas</span></article><article><small>ANEXOS</small><b>${Object.values(state.commissionDealAttachments || {}).reduce((sum, item) => sum + (item.contract || []).length + (item.client || []).length, 0)}</b><span>contratos e documentos</span></article></section><div class="sales-history-list">${ordered.map((item) => {
      const profile = commissionNegotiationProfileV1(item.profile),
        fileCount = (state.commissionDealAttachments?.[item.id]?.contract || []).length + (state.commissionDealAttachments?.[item.id]?.client || []).length,
        search = `${item.id} ${item.client} ${item.lot} ${profile.name}`.toLocaleLowerCase("pt-BR");
      return `<article class="sales-history-card" data-history-row data-search="${esc(search)}"><header class="sales-history-card-head"><div><small>${esc(item.id || "MOVIMENTAÇÃO")} · ${esc(item.date || "Sem data")}</small><h2>${esc(item.client || "Cliente não informado")}</h2><p>${esc(item.lot || "Lote a definir")} · ${esc(item.quadra || "Quadra não informada")}</p></div><span class="deal-status ${contractStatusClassV1(item.status || item.stage)}">${esc(item.status || item.stage || "Em acompanhamento")}</span></header><section class="sales-history-card-summary" aria-label="Resumo financeiro"><div><small>VALOR DA MOVIMENTAÇÃO</small><b>${formatBRL(brlToNumber(item.value))}</b><span>${esc(item.payment || "Condição de pagamento não informada")}</span></div><div><small>COMISSÃO PREVISTA</small><b>${formatBRL(brlToNumber(item.commission))}</b><span>${esc(item.rate || "Taxa não informada")}</span></div></section><dl class="sales-history-card-details"><div><dt>Corretor responsável</dt><dd>${esc(profile.name || "Não informado")}${profile.creci ? ` · ${esc(profile.creci)}` : ""}</dd></div><div><dt>Etapa comercial</dt><dd>${esc(item.stage || item.purpose || "Em acompanhamento")}</dd></div><div><dt>Arquivos associados</dt><dd>${ico("paperclip")} ${fileCount} anexo(s)</dd></div><div><dt>Finalidade</dt><dd>${esc(item.purpose || "Não informada")}</dd></div></dl><footer><button type="button" class="toolbar-action" data-history-open="${esc(item.id)}">Abrir relatório ${ico("arrow-up-right")}</button></footer></article>`;
    }).join("") || '<p class="empty-data">Nenhuma venda registrada.</p>'}</div></section>`;
  };

  return function (...args) {
    let html = renderSalesHistory.apply(this, args).replaceAll(
      "Histórico de vendas",
      "Histórico de movimentações",
    );
    const pageHead = html.match(/<header class="sales-history-head">[\s\S]*?<\/header>/)?.[0];
    if (!pageHead) return html;
    const search = pageHead.match(/<label>Buscar venda[\s\S]*?<\/label>/)?.[0] || "";
    return html.replace(
      pageHead,
      search ? '<div class="sales-history-search-toolbar">' + search + '</div>' : "",
    );
  };
};

/** Keep broker-detail and sales-history interactions beside their route markup. */
export const installCommercialHistoryPageEventsV1 = (ViewLayer, {
  appStore,
  windowRef,
} = {}) => {
  if (typeof ViewLayer?.prototype?.bind !== "function")
    throw new TypeError("Commercial history events require ViewLayer.bind().");
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Commercial history events require appStore.get/set().");
  if (typeof windowRef?.print !== "function")
    throw new TypeError("Commercial history events require window.print().");

  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind.apply(this, args),
      root = this,
      route = this.dataset.view || appStore.get().view;
    if (route === "broker-detail") {
      root.querySelector("[data-broker-detail-print]")?.addEventListener("click", () => windowRef.print());
      root.querySelector("[data-broker-history-all]")?.addEventListener("click", () => appStore.set({ view: "sales-history", selectedSalesHistoryId: null, lastAction: "Abriu histórico completo de vendas" }));
      root.querySelectorAll("[data-history-open]").forEach((button) => button.addEventListener("click", () => appStore.set({ view: "sales-history", selectedSalesHistoryId: button.dataset.historyOpen, lastAction: "Abriu relatório completo da venda" })));
    }
    if (route === "sales-history") {
      root.querySelector("[data-history-search]")?.addEventListener("input", (event) => {
        const query = event.target.value.toLocaleLowerCase("pt-BR");
        root.querySelectorAll("[data-history-row]").forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
      });
      root.querySelectorAll("[data-history-open]").forEach((button) => button.addEventListener("click", () => { appStore.set({ selectedSalesHistoryId: button.dataset.historyOpen, lastAction: "Abriu relatório de venda" }); this.render(); }));
      root.querySelector("[data-history-back]")?.addEventListener("click", () => { appStore.set({ selectedSalesHistoryId: null, lastAction: "Voltou ao histórico de vendas" }); this.render(); });
      root.querySelector("[data-history-print]")?.addEventListener("click", () => windowRef.print());
      root.querySelector("[data-history-edit-deal]")?.addEventListener("click", (event) => appStore.set({ view: "commission-deal", selectedCommissionNegotiation: event.currentTarget.dataset.historyEditDeal, lastAction: "Abriu o cadastro completo da venda" }));
    }
    return result;
  };
  return ViewLayer.prototype.bind;
};
