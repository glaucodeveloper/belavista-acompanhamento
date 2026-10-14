/** Presentation and read-model helpers for commission negotiation routes. */
export const createCommissionNegotiationViewsV1 = ({
  appStore,
  commissionDeals,
  commissionProfiles,
  esc,
  ico,
  formatBRL,
  brlToNumber,
  contractStatusClassV1,
  FileReader: BrowserFileReader,
  Date: BrowserDate = Date,
  FormData: BrowserFormData,
  apiFetch,
  operationalHeaders,
  notify,
  windowRef,
  logger = globalThis.console,
} = {}) => {
  for (const method of ["get", "set"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`Commission views require appStore.${method}().`);
  if (!Array.isArray(commissionDeals) || !Array.isArray(commissionProfiles))
    throw new TypeError("Commission views require the commercial catalog.");
  for (const [name, value] of Object.entries({ esc, ico, formatBRL, brlToNumber, contractStatusClassV1 }))
    if (typeof value !== "function")
      throw new TypeError(`Commission views require ${name}().`);
  if (typeof BrowserFileReader !== "function")
    throw new TypeError("Commission views require the browser FileReader service.");
  if (typeof BrowserFormData !== "function" || typeof apiFetch !== "function" ||
      typeof operationalHeaders !== "function" || typeof notify !== "function" ||
      typeof windowRef?.print !== "function" || typeof logger?.info !== "function")
    throw new TypeError("Commission views require form, persistence, notification, print, and logging services.");

  const commissionNegotiationDealsV1 = (state = appStore.get()) => {
    const hidden = new Set(state.commissionHiddenIds || []),
      merged = new Map(commissionDeals.map((item) => [item.id, { ...item }]));
    (state.commissionEntries || []).forEach((item) => {
      if (item?.id)
        merged.set(item.id, { ...(merged.get(item.id) || {}), ...item });
    });
    return [...merged.values()]
      .filter((item) => !hidden.has(item.id))
      .sort((a, b) => {
        const parse = (value) => {
          const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return match ? Date.parse(`${match[3]}-${match[2]}-${match[1]}`) : 0;
        };
        return parse(b.date) - parse(a.date);
      });
  };

  const commissionNegotiationProfileV1 = (id) =>
    commissionProfiles.find((item) => item.id === id) || commissionProfiles[0];

  const commissionNegotiationTransactionsV1 = (deal, profile) => {
    const supplied = Array.isArray(deal.transactions)
      ? deal.transactions
      : Array.isArray(deal.latestTransactions)
        ? deal.latestTransactions
        : [];
    if (supplied.length) return supplied.slice(0, 3);
    return [
      {
        label: "Registro da negociação",
        detail: deal.stage || deal.status || "Em acompanhamento",
        value: deal.value || "—",
        at: deal.date || "Data não informada",
        status: deal.status || "Em acompanhamento",
      },
      {
        label: "Comissão prevista",
        detail: `${deal.rate || "Taxa cadastrada"} · ${profile?.name || "Corretor"}`,
        value: deal.commission || "—",
        at: deal.date || "Data não informada",
        status: "Provisionada",
      },
    ];
  };

  const commissionNegotiationDateV1 = (value) => {
    const text = String(value || "");
    return text || "Data não informada";
  };

  const commissionNegotiationsMarkupV1 = (state) => {
    const deals = commissionNegotiationDealsV1(state),
      filters = {
        query: "",
        status: "all",
        profile: "all",
        ...(state.commissionNegotiationFilters || {}),
      },
      shown = deals.filter((deal) => {
        const query = String(filters.query || "").toLocaleLowerCase("pt-BR"),
          haystack = JSON.stringify(deal).toLocaleLowerCase("pt-BR");
        return (
          (!query || haystack.includes(query)) &&
          (filters.status === "all" || deal.status === filters.status) &&
          (filters.profile === "all" || deal.profile === filters.profile)
        );
      }),
      statusOptions = [
        "Reserva",
        "Em análise",
        "Proposta",
        "Assinado",
        "Compra confirmada",
      ],
      list = shown
        .map((deal) => {
          const profile = commissionNegotiationProfileV1(deal.profile),
            transactions = commissionNegotiationTransactionsV1(deal, profile);
          return `<article class="commission-negotiation-row" data-commission-record="${esc(deal.id)}"><header class="commission-negotiation-row-head"><div class="commission-negotiation-broker"><span class="commission-avatar" style="background:${esc(profile.avatar)}">${esc(profile.initials)}</span><span><b>${esc(profile.name)}</b><small>${esc(profile.role)} · ${esc(profile.creci)}</small></span></div><div class="commission-negotiation-identity"><span>${esc(deal.id || "NEGOCIAÇÃO")}</span><h2>${esc(deal.client || "Cliente não informado")}</h2><small>${esc(deal.lot || "Lote a definir")} · ${esc(deal.quadra || "Quadra não informada")}</small></div><span class="deal-status ${contractStatusClassV1(deal.status || deal.stage)}">${esc(deal.status || deal.stage || "Em acompanhamento")}</span></header><div class="commission-negotiation-facts"><div><small>VALOR DO LOTE</small><b>${esc(deal.value || "—")}</b><span>${esc(deal.payment || "Condição a definir")}</span></div><div><small>COMISSÃO</small><b>${esc(deal.commission || "—")}</b><span>${esc(deal.rate || "Taxa cadastrada")}</span></div><div><small>ETAPA</small><b>${esc(deal.stage || "Em acompanhamento")}</b><span>${commissionNegotiationDateV1(deal.date)}</span></div><div><small>FINALIDADE</small><b>${esc(deal.purpose || "Não informada")}</b><span>${esc(deal.cpf || "Documento não informado")}</span></div></div><section class="commission-negotiation-transactions"><div class="commission-negotiation-transactions-head"><span>ÚLTIMAS TRANSAÇÕES DA NEGOCIAÇÃO</span><small>${transactions.length} registros sumarizados</small></div><ol>${transactions.map((transaction) => `<li><span><b>${esc(transaction.label || transaction.type || "Transação")}</b><small>${esc(transaction.detail || transaction.description || "")}</small></span><span><b>${esc(transaction.value || transaction.amount || "—")}</b><small>${esc(transaction.at || transaction.date || deal.date || "")}</small></span><em>${esc(transaction.status || "Registrada")}</em></li>`).join("")}</ol></section><footer class="commission-negotiation-row-footer"><span>Última atualização: ${commissionNegotiationDateV1(deal.date)} · vínculo lote → cliente → corretor</span><button type="button" class="toolbar-primary" data-commission-record-open="${esc(deal.id)}">Abrir negociação ${ico("arrow-up-right")}</button></footer></article>`;
        })
        .join("");
    return `<section class="commission-negotiations-page"><header class="commission-negotiations-head"><div><span class="activity-kind">OPERAÇÃO COMERCIAL · COMISSÕES</span><h1>Negociações e comissões</h1><p>Uma linha por negociação, com o corretor, o lote, o cliente, os valores e as últimas transações registradas.</p></div><div class="commission-negotiations-head-actions"><button type="button" class="toolbar-action" data-view="brokers-board">${ico("users-round")} Corretores</button><button type="button" class="toolbar-primary" data-commission-new>${ico("plus")} Nova negociação</button></div></header><section class="commission-negotiation-kpis"><article><small>NEGOCIAÇÕES</small><b>${shown.length}</b><span>${deals.length} no histórico</span></article><article><small>VALOR EM NEGOCIAÇÃO</small><b>${formatBRL(shown.reduce((sum, item) => sum + brlToNumber(item.value), 0))}</b><span>lotes e reservas acompanhados</span></article><article><small>COMISSÃO PREVISTA</small><b>${formatBRL(shown.reduce((sum, item) => sum + brlToNumber(item.commission), 0))}</b><span>conforme a carteira visível</span></article><article><small>EM ANDAMENTO</small><b>${shown.filter((item) => item.status !== "Assinado" && item.status !== "Compra confirmada").length}</b><span>precisam de próxima ação</span></article></section><div class="commission-negotiation-toolbar"><label>Buscar negociação<input type="search" data-commission-negotiation-filter="query" value="${esc(filters.query)}" placeholder="Cliente, lote ou contrato"></label><label>Status<select data-commission-negotiation-filter="status"><option value="all">Todos os status</option>${statusOptions.map((status) => `<option value="${esc(status)}" ${filters.status === status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select></label><label>Corretor<select data-commission-negotiation-filter="profile"><option value="all">Todos os corretores</option>${commissionProfiles.map((profile) => `<option value="${esc(profile.id)}" ${filters.profile === profile.id ? "selected" : ""}>${esc(profile.name)}</option>`).join("")}</select></label><button type="button" class="toolbar-action" data-commission-negotiation-clear>${ico("filter-x")} Limpar</button></div><section class="commission-negotiation-list" aria-label="Negociações comerciais"><header><div><span class="activity-kind">01 · REGISTROS DE NEGOCIAÇÃO</span><h2>Comissões por negociação</h2><p>Selecione uma linha para abrir o formulário completo, o contrato e os anexos do cliente.</p></div><span>${shown.length} registros</span></header>${list || '<p class="empty-data">Nenhuma negociação corresponde aos filtros atuais.</p>'}</section></section>`;
  };

  const commissionAttachmentListV1 = (attachments = {}) => {
    const groups = [
      ["Contrato", attachments.contract || []],
      ["Cliente", attachments.client || []],
    ];
    return groups
      .flatMap(([label, items]) => items.map((item) => ({ ...item, label })))
      .map(
        (item) =>
          `<li><span>${ico("paperclip")}<b>${esc(item.name)}</b><small>${esc(item.label)} · ${esc(item.type || "arquivo")} · ${Math.max(1, Math.round(Number(item.size || 0) / 1024))} KB</small></span><time>${item.at ? new BrowserDate(item.at).toLocaleString("pt-BR") : "agora"}</time></li>`,
      )
      .join("");
  };

  const commissionDealMarkupV1 = function () {
    const state = appStore.get(),
      deal = commissionNegotiationDealsV1(state).find(
        (item) => item.id === state.selectedCommissionNegotiation,
      );
    if (!deal)
      return `<section class="commission-deal-page commission-deal-empty"><h1>Negociação não encontrada</h1><button type="button" data-view="brokers">Voltar para comissões</button></section>`;
    const profile = commissionNegotiationProfileV1(deal.profile),
      attachments = state.commissionDealAttachments?.[deal.id] || {};
    return `<section class="commission-deal-page"><header class="commission-deal-head"><div><button type="button" class="commission-back" data-commission-deal-back>${ico("arrow-left")} Voltar para comissões</button><span class="activity-kind">NEGOCIAÇÃO · ${esc(deal.id)}</span><h1>${esc(deal.client || "Cliente")}</h1><p>${esc(deal.lot || "Lote a definir")} · ${esc(deal.quadra || "Quadra não informada")} · corretor ${esc(profile.name)}</p></div><div><span class="deal-status ${contractStatusClassV1(deal.status)}">${esc(deal.status || "Em acompanhamento")}</span><button type="button" class="toolbar-action" data-commission-deal-print>${ico("printer")} Imprimir / PDF</button></div></header><form class="commission-deal-form" data-commission-deal-form><section class="commission-deal-form-section"><header><span>01</span><div><h2>Dados da negociação</h2><p>Edite os dados que alimentam a comissão, o contrato e o acompanhamento do cliente.</p></div></header><div class="commission-deal-fields"><label>Corretor<select name="profile">${commissionProfiles.map((item) => `<option value="${esc(item.id)}" ${item.id === deal.profile ? "selected" : ""}>${esc(item.name)} · ${esc(item.creci)}</option>`).join("")}</select></label><label>Cliente<input name="client" required value="${esc(deal.client || "")}"></label><label>CPF / CNPJ<input name="cpf" value="${esc(deal.cpf || "")}"></label><label>Lote<input name="lot" required value="${esc(deal.lot || "")}"></label><label>Quadra / identificação<input name="quadra" value="${esc(deal.quadra || "")}"></label><label>Valor do lote<input name="value" required value="${esc(deal.value || "")}"></label><label>Taxa de comissão<input name="rate" value="${esc(deal.rate || "")}"></label><label>Status<select name="status">${["Reserva", "Em análise", "Proposta", "Assinado", "Compra confirmada"].map((status) => `<option ${status === deal.status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select></label><label>Etapa<input name="stage" value="${esc(deal.stage || "")}"></label><label>Finalidade<input name="purpose" value="${esc(deal.purpose || "")}"></label><label class="wide">Condição de pagamento<textarea name="payment" rows="3">${esc(deal.payment || "")}</textarea></label><label class="wide">Observações do cliente<textarea name="notes" rows="4">${esc(deal.notes || "")}</textarea></label></div></section><section class="commission-deal-form-section commission-deal-attachments"><header><span>02</span><div><h2>Documentos e anexos</h2><p>Separe o contrato da documentação enviada pelo cliente. Os nomes e o vínculo ficam registrados na negociação.</p></div></header><div class="commission-deal-upload-grid"><label class="commission-deal-upload"><span>${ico("file-signature")}<b>Contrato da negociação</b><small>PDF ou imagem · um arquivo principal</small></span><input type="file" name="contractAttachment" data-commission-contract-attachment accept="application/pdf,image/*"></label><label class="commission-deal-upload"><span>${ico("files")}<b>Anexos do cliente</b><small>Documento, comprovante ou identificação · vários arquivos</small></span><input type="file" name="clientAttachments" data-commission-client-attachments multiple accept="application/pdf,image/*"></label></div><ul class="commission-deal-attachment-list" data-commission-attachment-list>${commissionAttachmentListV1(attachments) || '<li class="empty-data">Nenhum anexo registrado ainda.</li>'}</ul><p class="commission-deal-attachment-note">A seleção atual será vinculada ao contrato ${esc(deal.id)} ao salvar.</p></section><aside class="commission-deal-transaction-summary"><header><div><span class="activity-kind">03 · HISTÓRICO RESUMIDO</span><h2>Últimas transações</h2></div><span>${commissionNegotiationTransactionsV1(deal, profile).length} registros</span></header><ol>${commissionNegotiationTransactionsV1(
      deal,
      profile,
    )
      .map(
        (item) =>
          `<li><span><b>${esc(item.label || "Transação")}</b><small>${esc(item.detail || "")}</small></span><strong>${esc(item.value || "—")}</strong><time>${esc(item.at || item.date || deal.date || "")}</time></li>`,
      )
      .join(
        "",
      )}</ol></aside><footer class="commission-deal-form-footer"><span data-commission-deal-status>Os anexos permanecem associados à negociação após salvar.</span><button type="submit" class="toolbar-primary">${ico("save")} Salvar negociação</button></footer></form></section>`;
  };

  const commissionFileToDataUrlV1 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new BrowserFileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () =>
        reject(reader.error || new Error("Falha ao ler anexo."));
      reader.readAsDataURL(file);
    });

  const bindCommissionNegotiationEventsV1 = (root) => {
    const state = appStore.get(),
      negotiationPage = root.querySelector(".commission-negotiations-page"),
      dealPage = root.querySelector(".commission-deal-page");
    negotiationPage
      ?.querySelectorAll("[data-commission-negotiation-filter]")
      .forEach((control) => {
        const update = () =>
          appStore.set({
            commissionNegotiationFilters: {
              ...(appStore.get().commissionNegotiationFilters || {}),
              [control.dataset.commissionNegotiationFilter]: control.value,
            },
            lastAction: `Filtrou negociações por ${control.dataset.commissionNegotiationFilter}`,
          });
        control.addEventListener(
          control.matches('input[type="search"]') ? "change" : "change",
          update,
        );
        if (control.matches('input[type="search"]'))
          control.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              update();
            }
          });
      });
    negotiationPage
      ?.querySelector("[data-commission-negotiation-clear]")
      ?.addEventListener("click", () =>
        appStore.set({
          commissionNegotiationFilters: {
            query: "",
            status: "all",
            profile: "all",
          },
          lastAction: "Limpou filtros de negociações",
        }),
      );
    negotiationPage
      ?.querySelector('[data-view="brokers-board"]')
      ?.addEventListener("click", () =>
        appStore.set({
          view: "brokers-board",
          selectedCommissionProfile: null,
          selectedCommissionNegotiation: null,
          lastAction: "Abriu o quadro de corretores",
        }),
      );
    negotiationPage
      ?.querySelectorAll("[data-commission-record-open]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          appStore.set({
            view: "commission-deal",
            selectedCommissionNegotiation: button.dataset.commissionRecordOpen,
            selectedCommissionProfile: null,
            selectedCommissionContract: null,
            lastAction: `Abriu a negociação ${button.dataset.commissionRecordOpen}`,
          }),
        ),
      );
    negotiationPage
      ?.querySelector("[data-commission-new]")
      ?.addEventListener("click", () => {
        const current = appStore.get(),
          id = `NEG-${new BrowserDate().getFullYear()}-${String(BrowserDate.now()).slice(-5)}`,
          draft = {
            id,
            profile: commissionProfiles[0].id,
            client: "",
            lot: "",
            quadra: "",
            value: "",
            commission: "",
            rate: "6,00%",
            status: "Reserva",
            stage: "Novo registro",
            date: new BrowserDate().toLocaleDateString("pt-BR"),
            payment: "",
            purpose: "",
            notes: "",
          };
        appStore.set({
          commissionEntries: [...(current.commissionEntries || []), draft],
          view: "commission-deal",
          selectedCommissionNegotiation: id,
          selectedCommissionProfile: null,
          selectedCommissionContract: null,
          lastAction: "Abriu nova negociação",
        });
      });
    dealPage
      ?.querySelector("[data-commission-deal-back]")
      ?.addEventListener("click", () =>
        appStore.set({
          view: "brokers",
          selectedCommissionNegotiation: null,
          lastAction: "Voltou para comissões",
        }),
      );
    dealPage
      ?.querySelector("[data-commission-deal-print]")
      ?.addEventListener("click", () => windowRef.print());

    const form = dealPage?.querySelector("[data-commission-deal-form]");
    if (form && form.dataset.commissionDealBound !== "true") {
      form.dataset.commissionDealBound = "true";
      const pending = { contract: [], client: [] },
        pendingFiles = { contract: [], client: [] },
        list = form.querySelector("[data-commission-attachment-list]"),
        renderPending = () => {
          const existing =
            appStore.get().commissionDealAttachments?.[
              state.selectedCommissionNegotiation
            ] || {};
          const html = commissionAttachmentListV1({
            contract: [...(existing.contract || []), ...pending.contract],
            client: [...(existing.client || []), ...pending.client],
          });
          if (list)
            list.innerHTML =
              html ||
              '<li class="empty-data">Nenhum anexo registrado ainda.</li>';
        };
      const readFiles = (files, group) => {
        pendingFiles[group] = [...files];
        pending[group] = [...files].map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type || "arquivo",
          at: new BrowserDate().toISOString(),
        }));
        renderPending();
      };
      form
        .querySelector("[data-commission-contract-attachment]")
        ?.addEventListener("change", (event) =>
          readFiles(event.target.files || [], "contract"),
        );
      form
        .querySelector("[data-commission-client-attachments]")
        ?.addEventListener("change", (event) =>
          readFiles(event.target.files || [], "client"),
        );
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const current = appStore.get(),
          id = current.selectedCommissionNegotiation,
          deal = commissionNegotiationDealsV1(current).find(
            (item) => item.id === id,
          );
        if (!deal) return;
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        const data = Object.fromEntries(new BrowserFormData(form).entries());
        delete data.contractAttachment;
        delete data.clientAttachments;
        const nextDeal = {
            ...deal,
            ...data,
            id,
            commission: formatBRL((brlToNumber(data.value) * brlToNumber(data.rate)) / 100),
            date: deal.date || new BrowserDate().toLocaleDateString("pt-BR"),
          },
          previousAttachments = current.commissionDealAttachments?.[id] || {};
        let persisted = false;
        try {
          const files = [];
          for (const [kind, selected] of Object.entries(pendingFiles))
            for (const file of selected)
              files.push({
                kind,
                fileName: file.name,
                dataUrl: await commissionFileToDataUrlV1(file),
              });
          const existingResponse = await apiFetch("/api/commercial-sales"),
            existingPayload = existingResponse.ok
              ? await existingResponse.json()
              : { sales: [] },
            existing = Array.isArray(existingPayload.sales)
              ? existingPayload.sales.some((item) => item.id === id)
              : false;
          const response = await apiFetch(
            existing
              ? `/api/commercial-sales/${encodeURIComponent(id)}`
              : "/api/commercial-sales",
            {
              method: existing ? "PUT" : "POST",
              headers: operationalHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                id,
                lot: data.lot,
                client: data.client,
                broker: commissionNegotiationProfileV1(data.profile)?.name || "",
                status: data.status,
                valueCents:
                  Math.round((
                    Number(
                      String(data.value || "")
                        .replace(/[^\d,]/g, "")
                        .replace(/\./g, "")
                        .replace(",", "."),
                    ) || 0
                  ) * 100),
                notes: data.notes || "",
                files,
              }),
            },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          persisted = true;
        } catch (error) {
          logger.info(
            "Anexos comerciais mantidos localmente; serviço de arquivos indisponível.",
            error,
          );
        }
        appStore.set({
          commissionEntries: [
            ...(current.commissionEntries || []).filter((item) => item.id !== id),
            nextDeal,
          ],
          commissionDealAttachments: {
            ...(current.commissionDealAttachments || {}),
            [id]: {
              contract: [
                ...(previousAttachments.contract || []),
                ...pending.contract,
              ],
              client: [...(previousAttachments.client || []), ...pending.client],
            },
          },
          view: "brokers",
          selectedCommissionNegotiation: null,
          lastAction: `Salvou a negociação ${id} com anexos vinculados`,
        });
        if (submit) submit.disabled = false;
        notify(
          `Negociação ${id} salva${persisted ? " e anexos enviados ao serviço comercial" : " localmente com anexos vinculados"}.`,
          persisted ? "success" : "warning",
        );
      });
    }
  };

  return Object.freeze({
    commissionNegotiationDealsV1,
    commissionNegotiationProfileV1,
    commissionNegotiationTransactionsV1,
    commissionNegotiationDateV1,
    commissionNegotiationsMarkupV1,
    commissionAttachmentListV1,
    commissionDealMarkupV1,
    commissionFileToDataUrlV1,
    bindCommissionNegotiationEventsV1,
  });
};
