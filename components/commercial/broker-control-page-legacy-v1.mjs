const BROKER_REASON_DEFAULTS_V9 = Object.freeze({
  signal: Object.freeze({
    label: "Sinal",
    sharePercent: 40,
    warley: 50,
    partner: 50,
    payment: "À vista / sinal",
  }),
  intermediate: Object.freeze({
    label: "Parcela intermediária",
    sharePercent: 30,
    warley: 50,
    partner: 50,
    payment: "Parcela intermediária",
  }),
  monthly: Object.freeze({
    label: "Mensal",
    sharePercent: 30,
    warley: 70,
    partner: 30,
    payment: "Parcelas mensais",
  }),
});

export const brokerReasonsV9 = (state = {}) => {
  const configured = Array.isArray(state.commissionReasons)
    ? state.commissionReasons
    : [];
  return Object.entries(BROKER_REASON_DEFAULTS_V9).map(([id, defaults]) => ({
    ...defaults,
    ...(configured.find((item) => item.id === id) || {}),
    id,
  }));
};

const brokerReasonEditorV9 = (reasons, { esc, ico }) =>
  `<section class="broker-rule-editor" aria-label="Editor de regras de repasse"><header><div><span class="activity-kind">REGRAS EDITÁVEIS · ADMINISTRADOR</span><h2>Razões de comissão e divisão</h2><p>Edite a participação da razão. A divisão declarada permanece: mensais 70% Warley / 30% contraparte; sinal e intermediária 50% / 50%.</p></div><span class="broker-rule-audit">Aplicação controlada</span></header><div class="broker-rule-grid">${reasons.map((reason) => `<form data-v8-reason-form="${esc(reason.id)}"><div class="broker-rule-form-head"><b>${esc(reason.label)}</b><span>${esc(reason.payment)}</span></div><label>Nome da razão<input name="label" value="${esc(reason.label)}"></label><label>Participação na composição (%)<input name="sharePercent" type="number" min="0" max="100" step="0.1" value="${Number(reason.sharePercent ?? (reason.id === "signal" ? 40 : 30))}"></label><label>Warley (%)<input value="${reason.warley}" readonly></label><label>Contraparte (%)<input value="${reason.partner}" readonly></label><label class="wide">Descrição<input name="description" value="${esc(reason.description || "")}" placeholder="Quando esta razão libera o repasse"></label><button type="submit">${ico("save")} Salvar razão</button></form>`).join("")}</div></section>`;

/** Renders the existing broker control surface from application state and catalogs. */
export const createBrokerControlPageV1 = ({
  appStore,
  commissionDeals,
  commissionProfiles,
  brlToNumber,
  formatBRL,
  esc,
  ico,
  queueMicrotaskFn = globalThis.queueMicrotask?.bind(globalThis),
} = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Broker control page requires appStore.get().");
  if (!Array.isArray(commissionDeals) || !Array.isArray(commissionProfiles))
    throw new TypeError("Broker control page requires commission deals and profiles.");
  for (const [name, value] of Object.entries({ brlToNumber, formatBRL, esc, ico }))
    if (typeof value !== "function")
      throw new TypeError(`Broker control page requires ${name}().`);
  if (typeof queueMicrotaskFn !== "function")
    throw new TypeError("Broker control page requires queueMicrotask().");

  return function brokersControlV8() {
    const state = appStore.get(),
      deals = [...commissionDeals, ...(state.commissionEntries || [])],
      periodLabels = {
        monthly: "Mensal",
        annual: "Anual",
        cumulative: "Acumulado",
      },
      requestedPeriod = state.reportPeriod || "monthly",
      period = periodLabels[requestedPeriod] ? requestedPeriod : "monthly";
    const profileStats = (person) => {
      const rows = deals.filter((item) => item.profile === person.id),
        sales = rows.reduce((sum, item) => sum + brlToNumber(item.value), 0),
        commission = rows.reduce(
          (sum, item) => sum + brlToNumber(item.commission),
          0,
        ),
        pending = rows.filter((item) => item.status !== "Assinado").length;
      return { rows, sales, commission, pending };
    };
    const reasonLabel = {
      signal: "Sinal",
      intermediate: "Parcela intermediária",
      monthly: "Mensal",
    };
    const reasons = brokerReasonsV9(state).filter(
        (item) => item.active !== false,
      ),
      ruleEditor = brokerReasonEditorV9(reasons, { esc, ico });
    queueMicrotaskFn(() => this.bindCommercialPagesV7?.());
    return `<section class="control-page broker-control-page"><header class="control-page-head"><div><span class="activity-kind">CENTRAL COMERCIAL · CONTROLE TOTAL</span><h1>Corretores e repasses</h1><p>Carteiras, contratos, razões de comissão, competências e arquivos gerados.</p></div><div class="control-head-actions"><button type="button" data-view="commissions">${ico("settings-2")} Regras de repasse</button><button type="button" class="toolbar-primary" data-v8-broker-reports>${ico("file-down")} PDF / Excel</button></div></header><nav class="control-period-tabs" aria-label="Período dos repasses">${Object.entries(
      periodLabels,
    )
      .map(
        ([id, label]) =>
          `<button type="button" class="${period === id ? "active" : ""}" data-v7-period="${id}">${label}</button>`,
      )
      .join(
        "",
      )}</nav><section class="control-rule-strip"><div><small>RAZÕES ATIVAS</small><b>${reasons.length}</b></div>${reasons.map((item) => `<span><b>${esc(reasonLabel[item.id] || item.label)}</b><small>${Number(item.sharePercent || 0).toLocaleString("pt-BR")}% da composição · ${item.warley}/${item.partner}</small></span>`).join("")}<button type="button" data-broker-rule-focus>Editar regras</button></section>${ruleEditor}<div class="broker-control-grid">${commissionProfiles
      .map((person) => {
        const stats = profileStats(person);
        return `<article class="broker-control-card"><header><span class="commission-avatar">${person.initials}</span><span><em>${stats.pending ? "EM ACOMPANHAMENTO" : "REGULAR"}</em><h2>${esc(person.name)}</h2><small>${esc(person.creci)} · ${esc(person.role)}</small></span></header><div class="broker-card-metrics"><span><small>Carteira</small><b>${stats.rows.length}</b></span><span><small>Vendas</small><b>${formatBRL(stats.sales)}</b></span><span><small>Comissão</small><b>${formatBRL(stats.commission)}</b></span><span><small>Pendências</small><b>${stats.pending}</b></span></div><div class="broker-card-lots">${person.lots.map((lot) => `<i>${esc(lot)}</i>`).join("")}</div><footer><a href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${ico("message-circle")} Contato</a><button type="button" data-v7-open-broker="${person.id}">Abrir página dedicada ${ico("arrow-right")}</button></footer></article>`;
      })
      .join(
        "",
      )}</div><section class="control-ledger"><header><div><span class="activity-kind">TABELAÇÃO COMPLETA · ${periodLabels[period].toUpperCase()}</span><h2>Negócios, comissão e situação de repasse</h2></div><label>Buscar operação<input data-v8-broker-ledger-search placeholder="Contrato, corretor, cliente ou lote"></label></header><div class="control-table-wrap"><table><thead><tr><th>Contrato</th><th>Corretor</th><th>Cliente / lote</th><th>Venda</th><th>Comissão</th><th>Razão</th><th>Situação</th><th></th></tr></thead><tbody>${deals
      .map((deal, index) => {
        const person = commissionProfiles.find(
            (item) => item.id === deal.profile,
          ),
          reason = reasons[index % Math.max(1, reasons.length)];
        return `<tr data-v8-broker-ledger-row data-search="${esc(JSON.stringify(deal).toLowerCase() + " " + String(person?.name || "").toLowerCase())}"><td><b>${esc(deal.id)}</b><small>${esc(deal.date || "Sem competência")}</small></td><td>${esc(person?.name || "A definir")}</td><td><b>${esc(deal.client)}</b><small>${esc(deal.lot)} · ${esc(deal.quadra || "")}</small></td><td>${esc(deal.value)}</td><td><b>${esc(deal.commission)}</b><small>${esc(deal.rate)}</small></td><td>${esc(reason?.label || "Sinal")}</td><td><span class="control-status">${esc(deal.stage || deal.status)}</span></td><td><button type="button" data-commission-open="${esc(deal.id)}">Abrir</button></td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div></section><section class="broker-report-files" data-v8-broker-files><span>ARQUIVOS GERADOS</span><p>Carregando relatórios mensais e acumulados…</p></section></section>`;
  };
};
