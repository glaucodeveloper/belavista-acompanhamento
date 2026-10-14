/** Broker's full commercial report page, backed by the active workspace read model. */
export const createBrokerDetailPageV1 = ({
  appStore,
  commissionProfiles,
  commercialDealsForWorkspaceV1,
  brlToNumber,
  formatBRL,
  esc,
  ico,
} = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Broker detail requires appStore.get().");
  if (!Array.isArray(commissionProfiles))
    throw new TypeError("Broker detail requires commission profiles.");
  for (const [name, implementation] of Object.entries({
    commercialDealsForWorkspaceV1, brlToNumber, formatBRL, esc, ico,
  })) if (typeof implementation !== "function")
    throw new TypeError("Broker detail requires " + name + "().");

  return function () {
    const state = appStore.get(),
      person = commissionProfiles.find((item) => String(item.id) === String(state.selectedBrokerDirectoryId));
    if (!person) return `<section class="broker-detail-page"><h1>Corretor não encontrado</h1><button type="button" data-view="brokers">Voltar à listagem</button></section>`;
    const deals = commercialDealsForWorkspaceV1(state).filter((deal) => String(deal.profile || "") === String(person.id)),
      sales = deals.reduce((sum, deal) => sum + brlToNumber(deal.value), 0),
      commission = deals.reduce((sum, deal) => sum + brlToNumber(deal.commission), 0),
      attachments = state.commissionDealAttachments || {};
    return `<section class="broker-detail-page"><div class="broker-detail-toolbar"><button type="button" class="toolbar-action" data-view="brokers">${ico("arrow-left")} Corretores</button><button type="button" class="toolbar-action" data-broker-detail-print>${ico("printer")} Imprimir / PDF</button></div><header class="broker-detail-head"><i class="commission-avatar commission-avatar-large" style="background:${esc(person.avatar)}">${esc(person.initials)}</i><div><span class="activity-kind">PERFIL DEDICADO · ${esc(person.creci)}</span><h1>${esc(person.name)}</h1><p>${esc(person.role)} · carteira e atividade comercial</p></div><a class="toolbar-primary" href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${ico("message-circle")} Contatar ${esc(person.phone)}</a></header><section class="broker-detail-kpis"><article><small>NEGÓCIOS</small><b>${deals.length}</b><span>registros associados</span></article><article><small>VALOR DE VENDAS</small><b>${formatBRL(sales)}</b><span>carteira comercial</span></article><article><small>COMISSÃO REGISTRADA</small><b>${formatBRL(commission)}</b><span>conforme negócios</span></article><article><small>LOTES DA CARTEIRA</small><b>${person.lots.length}</b><span>${person.lots.map(esc).join(" · ")}</span></article></section><section class="broker-detail-contact"><div><small>E-MAIL</small><b>${esc((person.emails || []).join(" · ") || "Não cadastrado")}</b></div><div><small>CONVERSÃO</small><b>${esc(person.conversion || "Não informada")}</b></div><div><small>DOCUMENTOS VINCULADOS</small><b>${deals.reduce((sum, deal) => sum + (attachments[deal.id]?.contract || []).length + (attachments[deal.id]?.client || []).length, 0)}</b></div></section><section class="broker-detail-deals"><header><div><span class="activity-kind">CARTEIRA · RELATÓRIO</span><h2>Negócios e documentos</h2></div><button type="button" class="toolbar-action" data-broker-history-all>${ico("history")} Histórico completo</button></header><div class="broker-detail-deal-list">${deals.map((deal) => {
      const files = [...(attachments[deal.id]?.contract || []), ...(attachments[deal.id]?.client || [])];
      return `<article><div><small>${esc(deal.id || "NEGÓCIO")} · ${esc(deal.date || "Data não informada")}</small><h3>${esc(deal.client || "Cliente não informado")}</h3><p>${esc(deal.lot || "Lote a definir")} · ${esc(deal.quadra || "Quadra não informada")}</p></div><span><b>${formatBRL(brlToNumber(deal.value))}</b><small>${esc(deal.status || deal.stage || "Em acompanhamento")}</small></span><span class="broker-detail-files">${ico("paperclip")} ${files.length} anexo(s)</span><button type="button" class="toolbar-action" data-history-open="${esc(deal.id)}">Relatório ${ico("arrow-up-right")}</button></article>`;
    }).join("") || '<p class="empty-data">Nenhum negócio associado a este corretor.</p>'}</div></section></section>`;
  };
};
