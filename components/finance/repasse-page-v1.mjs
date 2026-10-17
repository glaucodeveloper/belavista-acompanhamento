import { apiFetch } from "../../api-client.mjs?v=github-pat-gateway-v1";
import { calculateRepasseReportV1 } from "./repasse-calculation-v1.mjs";
import { buildRepasseReportCsvV1 } from "./repasse-report-export-v1.mjs";

export const installRepassePageV1 = (ViewLayer, { appStore, esc, ico, REPASSE_PRICE_CATALOG = [] } = {}) => {
  const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
  const date = (value) => {
    if (!value) return "—";
    const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.valueOf()) ? esc(value) : parsed.toLocaleDateString("pt-BR");
  };
  const load = async (page, force = false) => {
    if (page._repasseRequest || (!force && page._repasseLoaded)) return;
    page._repasseRequest = true;
    appStore.set({ repasseLedgerV1: { status: "loading", sales: [], entries: [], reasons: [], brokerRules: [], errors: {} } });
    try {
      const response = await apiFetch("/api/repasses", { cache: "no-store" });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || `HTTP ${response.status}`);
      }
      const payload = await response.json();
      const reports = calculateRepasseReportV1(payload.sales || [], payload.reasons || []);
      appStore.set({ repasseLedgerV1: { ...payload, reports, status: "ready", checkedAt: new Date().toISOString(), errors: {} } });
      page._repasseLoaded = true;
    } catch (error) {
      appStore.set({ repasseLedgerV1: { status: "error", sales: [], entries: [], reasons: [], brokerRules: [], reports: [], errors: { geral: String(error?.message || error) } } });
    } finally { page._repasseRequest = false; }
  };
  const activeReasons = (reasons) => reasons.filter((reason) => reason.active).sort((a, b) =>
    ({ signal: 0, intermediate: 1, monthly: 2 }[a.id] ?? 9) - ({ signal: 0, intermediate: 1, monthly: 2 }[b.id] ?? 9),
  );
  const htmlOptions = (rows, selected, label) => rows.map((row) => `<option value="${esc(row.id)}" ${String(row.id) === String(selected) ? "selected" : ""}>${esc(label(row))}</option>`).join("");
  const planAmount = (sale) => Number(sale.plan?.contractPriceCents) > 0 ? Number(sale.plan.contractPriceCents) : Math.round(Number(sale.tablePrice?.price || 0) * 100) || Number(sale.valueCents) || 0;
  const scheduleRows = (report) => (report?.future || []).map((row) => `<tr><td>${date(row.date)}</td><td>${esc(row.reasonLabel)}</td><td>${money(row.principalCents)}</td><td>${money(row.interestCents)}</td><td><b>${money(row.amountCents)}</b></td><td>${row.commissionCents === null ? "—" : money(row.commissionCents)}</td><td>${row.primaryCents === null ? "—" : `${money(row.primaryCents)} / ${money(row.partnerCents)}`}</td></tr>`).join("");
  const receiptRows = (report, sale, reasons) => (report?.current || []).map((row) => `<tr><td>${date(row.date)}</td><td>${esc(row.lotKey || "—")}</td><td>${esc(row.reasonLabel)}</td><td>${money(row.amountCents)}</td><td>${row.commissionCents === null ? "—" : money(row.commissionCents)}</td><td>${row.primaryCents === null ? "—" : `${money(row.primaryCents)} / ${money(row.partnerCents)}`}</td><td><button class="atlas-outline-button" type="button" data-repasse-edit-toggle="${esc(row.id)}">Editar</button> <button class="atlas-outline-button" type="button" data-repasse-delete="${esc(row.id)}">Excluir</button></td></tr><tr hidden data-repasse-edit-row="${esc(row.id)}"><td colspan="7"><form data-repasse-edit-form data-entry-id="${esc(row.id)}"><input type="hidden" name="saleId" value="${esc(sale.id)}"><label>Data<input name="date" type="date" value="${esc(row.date)}" required></label><label>Razão<select name="repasseReasonId" required>${htmlOptions(reasons, row.repasseReasonId, (reason) => reason.label)}</select></label><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" value="${(Number(row.amountCents) / 100).toFixed(2)}" required></label><label>Descrição<input name="description" value="${esc(row.description || "")}"></label><footer><button class="atlas-outline-button" type="button" data-repasse-edit-cancel="${esc(row.id)}">Cancelar</button><button class="atlas-dark-button" type="submit">Salvar entrada</button></footer></form></td></tr>`).join("");
  ViewLayer.prototype.repasses = function () {
    const data = appStore.get().repasseLedgerV1 || { status: "idle", sales: [], entries: [], reasons: [], reports: [], errors: {} };
    if (data.status === "idle" || data.status === "loading" && !this._repasseRequest) queueMicrotask(() => load(this).then(() => { if (appStore.get().view === "repasses") this.render(); }));
    const sales = data.sales || [], reasons = activeReasons(data.reasons || []), reports = new Map((data.reports || []).map((report) => [report.saleId, report]));
    const loading = data.status === "idle" || data.status === "loading";
    const currentRows = (data.reports || []).flatMap((report) => report.current || []), futureRows = (data.reports || []).flatMap((report) => report.future || []);
    const actualCommission = currentRows.reduce((sum, row) => sum + (Number(row.commissionCents) || 0), 0);
    const futureCommission = futureRows.reduce((sum, row) => sum + (Number(row.commissionCents) || 0), 0);
    const unconfiguredCurrent = currentRows.filter((row) => row.commissionCents === null).length;
    const unconfiguredFuture = (data.reports || []).filter((report) => !["ready", "settled"].includes(report.forecastStatus) && report.remainingCents > 0).length;
    const unpricedSales = sales.filter((sale) => !sale.tablePrice).length;
    const forecast = (data.reports || []).reduce((sum, report) => sum + (Number(report.remainingCents) || 0), 0);
    const status = loading ? "Carregando vendas, entradas e regras persistidas…" : data.errors?.geral ? `Serviço de repasses indisponível: ${data.errors.geral}` : `${sales.length} venda(s) vinculada(s) às entradas, configurações e projeções.`;
    const state = appStore.get();
    const lotSale = sales.find((sale) => String(sale.lot || "").toLocaleLowerCase("pt-BR") === String(state.repasseSelectedLotKey || "").toLocaleLowerCase("pt-BR"));
    const registerableSales = sales.filter((sale) => sale.tablePrice && sale.broker);
    const initialSaleId = String(state.repasseSelectedSaleId || lotSale?.id || sales[0]?.id || "");
    const selectedSale = registerableSales.find((sale) => sale.id === initialSaleId) || registerableSales.find((sale) => String(sale.lot || "").toLocaleLowerCase("pt-BR") === String(state.repasseSelectedLotKey || "").toLocaleLowerCase("pt-BR")) || registerableSales[0];
    return `<section class="atlas-repasse-page atlas-repasse-workspace">
      <header class="atlas-page-heading"><div><span class="atlas-eyebrow">COMERCIAL · CAIXA · COMISSÕES</span><h1>Repasses</h1><p>Entradas vinculadas à venda, regras por corretor e lote, plano de pagamento e projeção de comissões.</p></div><div class="atlas-page-actions"><button type="button" class="atlas-outline-button" data-repasse-export${loading ? " disabled" : ""}>Exportar CSV</button><button type="button" class="atlas-outline-button" data-atlas-repasses-refresh>${ico("refresh-cw")} Atualizar</button></div></header>
      <p class="atlas-data-status" role="status" aria-live="polite" data-repasse-feedback>${esc(status)}</p>
      <section class="atlas-repasse-metrics"><article><small>Comissão sobre entradas recebidas</small><strong>${loading || unconfiguredCurrent ? "—" : money(actualCommission)}</strong><span>${unconfiguredCurrent ? `Configure comissão em ${unconfiguredCurrent} entrada(s)` : "Calculada com regras atuais por venda"}</span></article><article><small>Comissão projetada</small><strong>${loading || unconfiguredFuture ? "—" : money(futureCommission)}</strong><span>${unconfiguredFuture ? `Configure plano e comissão em ${unconfiguredFuture} venda(s)` : "Parcelas mensais e semestrais configuradas"}</span></article><article><small>Saldo contratual projetado</small><strong>${loading || unpricedSales ? "—" : money(forecast)}</strong><span>${unpricedSales ? `${unpricedSales} lote(s) fora do quadro de preços` : "Preço-base menos entradas persistidas"}</span></article></section>
      <section class="atlas-data-card atlas-repasse-entry"><header><div><span class="atlas-eyebrow">LANÇAMENTO ÚNICO · ENTRADA + REPASSE</span><h2>Registrar entrada</h2><p>O registro é vinculado à venda, ao lote e ao corretor; a comissão respeita a ordem Sinal → Intermediária → Mensal.</p></div></header>
        ${loading ? `<p class="atlas-inline-loading">Consultando vendas reais…</p>` : selectedSale ? `<form data-repasse-entry-form><label>Venda<select name="saleId" required>${htmlOptions(registerableSales, selectedSale.id, (sale) => `${sale.lot || "Lote não informado"} · ${sale.client || "Cliente não informado"} · ${sale.broker}`)}</select></label><label>Lote<input value="${esc(selectedSale.lot || "")}" readonly></label><label>Corretor<input value="${esc(selectedSale.broker || "")}" readonly></label><label>Razão do recebimento<select name="repasseReasonId" required>${htmlOptions(reasons, "signal", (reason) => `${reason.label} · ${Number(reason.sharePercent) || 0}%`)}</select></label><label>Valor recebido (R$)<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label>Data de recebimento<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label class="atlas-repasse-wide">Descrição<input name="description" maxlength="500" placeholder="Referência do recebimento"></label><footer><button class="atlas-dark-button" type="submit">${ico("plus")} Registrar entrada e repasse</button></footer></form>` : `<div class="atlas-empty-state"><h3>${sales.length ? "Nenhuma venda vinculável ao quadro de preços" : "Nenhuma venda persistida para vincular"}</h3><p>${sales.length ? "As vendas sem correspondência na tabela oficial ou sem corretor não recebem entrada/projeção até o cadastro comercial ser corrigido." : "Registre uma venda comercial antes de lançar entrada de caixa ou configurar repasse."}</p></div>`}
      </section>
      ${loading ? `<section class="atlas-data-card"><p class="atlas-inline-loading">Carregando perfis financeiros…</p></section>` : sales.map((sale) => {
        const report = reports.get(sale.id), brokerRule = sale.brokerRule, plan = sale.plan;
        const price = sale.tablePrice ? Math.round(Number(sale.tablePrice.price) * 100) : 0;
        const base = planAmount(sale);
        const statusLabel = !sale.tablePrice ? "Lote fora do quadro de preços" : !sale.broker ? "Venda sem corretor cadastrado" : report?.forecastStatus === "ready" ? "Projeção ativa" : report?.forecastStatus === "commission-rule-required" ? "Configure comissão do corretor/lote" : report?.forecastStatus === "payment-plan-required" ? "Configure o plano de pagamento" : report?.forecastStatus === "settled" ? "Contrato liquidado" : "Plano incompleto";
        return `<section class="atlas-data-card atlas-repasse-sale" data-repasse-sale="${esc(sale.id)}"><header><div><span class="atlas-eyebrow">VENDA · ${esc(sale.id)}</span><h2>${esc(sale.lot || "Lote não informado")} · ${esc(sale.client || "Cliente não informado")}</h2><p>Corretor: ${esc(sale.broker || "Não informado")} · ${esc(sale.status || "Sem status")} · ${esc(statusLabel)}</p></div></header>
          <div class="atlas-repasse-sale-summary"><span>Preço do quadro: <b>${sale.tablePrice ? money(price) : "sem correspondência"}</b><small>${sale.tablePrice ? `${esc(sale.tablePrice.area)} m² · Quadra ${esc(sale.tablePrice.quadra)}` : "A tabela não será substituída por preço fictício."}</small></span><span>Valor de venda: <b>${money(sale.valueCents)}</b><small>Base contratual do cadastro comercial</small></span><span>Recebido: <b>${money(report?.receivedCents || 0)}</b><small>Entradas persistidas e vinculadas a esta venda</small></span><span>Saldo: <b>${money(report?.remainingCents || 0)}</b><small>Base do plano menos entradas</small></span></div>
          ${sale.tablePrice && sale.broker ? `<div class="atlas-repasse-config-grid"><form data-repasse-broker-form><input type="hidden" name="brokerName" value="${esc(sale.broker)}"><input type="hidden" name="lotKey" value="${esc(sale.lot)}"><h3>Comissão · corretor + lote</h3><label>Percentual de comissão (%)<input name="commissionPercent" type="number" min="0" max="100" step="0.01" value="${brokerRule ? esc(brokerRule.commissionPercent) : ""}" placeholder="Configurar" required></label><p>A regra só vale para este vínculo persistido entre corretor e lote.</p><button class="atlas-outline-button" type="submit">Salvar comissão</button>${brokerRule ? `<button class="atlas-outline-button" type="button" data-repasse-rule-delete data-broker="${esc(brokerRule.brokerName)}" data-lot="${esc(brokerRule.lotKey)}">Remover regra</button>` : ""}</form>
            <form data-repasse-plan-form><input type="hidden" name="saleId" value="${esc(sale.id)}"><h3>Plano restante · juros e parcelas</h3><label>Preço contratual (R$)<input name="contractPrice" type="number" min="0.01" step="0.01" value="${base ? (base / 100).toFixed(2) : ""}" required></label><label>Juros anuais (%)<input name="annualInterestPercent" type="number" min="0" max="100" step="0.01" value="${plan?.annualInterestPercent ?? ""}" placeholder="Informar taxa" required></label><label>Parcelas mensais<input name="monthlyInstallments" type="number" min="0" max="600" step="1" value="${plan?.monthlyInstallments ?? 0}" required></label><label>Primeiro vencimento mensal<input name="monthlyFirstDueDate" type="date" value="${esc(plan?.monthlyFirstDueDate || "")}" ${Number(plan?.monthlyInstallments) ? "required" : ""}></label><label>Parcelas semestrais<input name="semiannualInstallments" type="number" min="0" max="100" step="1" value="${plan?.semiannualInstallments ?? 0}" required></label><label>Primeiro vencimento semestral<input name="semiannualFirstDueDate" type="date" value="${esc(plan?.semiannualFirstDueDate || "")}" ${Number(plan?.semiannualInstallments) ? "required" : ""}></label><label>Principal destinado às semestrais (%)<input name="semiannualPrincipalPercent" type="number" min="0" max="100" step="0.01" value="${plan?.semiannualPrincipalPercent ?? (Number(plan?.monthlyInstallments) ? 0 : "")}" placeholder="Informar divisão" required></label><p>A taxa é efetiva anual, convertida em taxa mensal equivalente. Os juros são demonstrados por vencimento sobre o saldo anterior.</p><button class="atlas-dark-button" type="submit">Salvar plano e recalcular</button>${plan ? `<button class="atlas-outline-button" type="button" data-repasse-plan-delete="${esc(sale.id)}">Remover plano</button>` : ""}</form></div>` : `<p class="atlas-source-error">Configuração bloqueada: venda sem correspondência no quadro de preços ou sem corretor identificado.</p>`}
          <section class="atlas-repasse-report"><h3>Entradas e repasses atuais · divisão Warley / contraparte</h3><div class="atlas-table-scroll"><table><thead><tr><th>Data</th><th>Lote</th><th>Prioridade</th><th>Entrada</th><th>Comissão</th><th>Divisão Warley / contraparte</th><th>Ações</th></tr></thead><tbody>${receiptRows(report, sale, reasons) || `<tr><td colspan="7">Nenhuma entrada vinculada a esta venda.</td></tr>`}</tbody></table></div></section>
          <section class="atlas-repasse-report"><h3>Parcelas e repasses futuros · divisão Warley / contraparte</h3><div class="atlas-table-scroll"><table><thead><tr><th>Vencimento</th><th>Prioridade</th><th>Principal</th><th>Juros</th><th>Parcela</th><th>Comissão</th><th>Divisão Warley / contraparte</th></tr></thead><tbody>${scheduleRows(report) || `<tr><td colspan="7">${esc(statusLabel)}. Nenhuma projeção é exibida sem as configurações persistidas.</td></tr>`}</tbody></table></div></section>
        </section>`;
      }).join("")}
      <footer class="atlas-source-note">A tabela de lotes, vendas, entradas, regras e planos são fontes persistidas/configuradas. Valores futuros são projeções, não lançamentos de caixa.</footer>
    </section>`;
  };
  const save = async (form, url, method = "POST", transform = (value) => value) => {
    const button = form.querySelector('button[type="submit"]'), feedback = document.querySelector("[data-repasse-feedback]");
    if (button) button.disabled = true;
    try {
      const value = Object.fromEntries(new FormData(form).entries());
      const response = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(transform(value)) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      const page = document.querySelector("view-layer");
      if (feedback) feedback.textContent = "Salvo no banco de dados. Atualizando valores atuais e projeções…";
      if (page) { page._repasseLoaded = false; await load(page, true); page.render(); }
      return true;
    } catch (error) {
      if (feedback) feedback.textContent = `Falha ao salvar: ${String(error?.message || error)}`;
      return false;
    } finally { if (button) button.disabled = false; }
  };
  const onChange = (event) => {
    const select = event.target.closest?.('[data-repasse-entry-form] select[name="saleId"]');
    if (!select) return;
    const sale = (appStore.get().repasseLedgerV1?.sales || []).find((item) => item.id === select.value);
    appStore.set({ repasseSelectedSaleId: select.value, repasseSelectedLotKey: sale?.lot || "" });
    const page = select.closest("view-layer");
    if (page) page.render();
  };
  const onSubmit = async (event) => {
    const form = event.target;
    if (form.matches?.("[data-repasse-edit-form]")) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const sale = (appStore.get().repasseLedgerV1?.sales || []).find((item) => item.id === values.saleId);
      if (!sale) return;
      await save(form, `/api/repasses/entries/${encodeURIComponent(form.dataset.entryId)}`, "PUT", (data) => ({ saleId: data.saleId, lotKey: sale.lot, brokerName: sale.broker, repasseReasonId: data.repasseReasonId, amountCents: Math.round(Number(data.amount) * 100), date: data.date, description: data.description }));
    } else if (form.matches?.("[data-repasse-entry-form]")) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const sale = (appStore.get().repasseLedgerV1?.sales || []).find((item) => item.id === values.saleId);
      if (!sale) return;
      await save(form, "/api/repasses/entries", "POST", (data) => ({ saleId: data.saleId, lotKey: sale.lot, brokerName: sale.broker, repasseReasonId: data.repasseReasonId, amountCents: Math.round(Number(data.amount) * 100), date: data.date, description: data.description, fiscalStatus: "pendente" }));
    } else if (form.matches?.("[data-repasse-broker-form]")) {
      event.preventDefault();
      await save(form, "/api/repasses/broker-rule", "PUT", (data) => ({ ...data, commissionPercent: Number(data.commissionPercent) }));
    } else if (form.matches?.("[data-repasse-plan-form]")) {
      event.preventDefault();
      await save(form, `/api/repasses/sales/${encodeURIComponent(form.elements.saleId.value)}/plan`, "PUT", (data) => ({ contractPriceCents: Math.round(Number(data.contractPrice) * 100), annualInterestPercent: Number(data.annualInterestPercent), monthlyInstallments: Number(data.monthlyInstallments), monthlyFirstDueDate: data.monthlyFirstDueDate, semiannualInstallments: Number(data.semiannualInstallments), semiannualFirstDueDate: data.semiannualFirstDueDate, semiannualPrincipalPercent: Number(data.semiannualPrincipalPercent) }));
    }
  };
  const remove = async (url, prompt) => {
    if (!globalThis.confirm?.(`${prompt}\n\nEsta remoção será aplicada ao banco de dados.`)) return;
    const feedback = document.querySelector("[data-repasse-feedback]");
    try {
      const response = await apiFetch(url, { method: "DELETE" }), result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      const page = document.querySelector("view-layer");
      if (page) { page._repasseLoaded = false; await load(page, true); page.render(); }
    } catch (error) { if (feedback) feedback.textContent = `Falha ao remover: ${String(error?.message || error)}`; }
  };
  const onClick = (event) => {
    const exportButton = event.target.closest?.("[data-repasse-export]");
    if (exportButton) {
      const data = appStore.get().repasseLedgerV1 || {}, feedback = document.querySelector("[data-repasse-feedback]");
      if (data.status !== "ready") { if (feedback) feedback.textContent = "Aguarde os dados persistidos antes de exportar."; return; }
      const csv = buildRepasseReportCsvV1(data.sales || [], data.reports || []),
        blob = new Blob([csv], { type: "text/csv;charset=utf-8" }),
        url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-repasses-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (feedback) feedback.textContent = `Relatório CSV exportado com ${(data.reports || []).length} venda(s) e entradas/projeções disponíveis.`;
      return;
    }
    const edit = event.target.closest?.("[data-repasse-edit-toggle]");
    if (edit) { const row = document.querySelector(`[data-repasse-edit-row="${CSS.escape(edit.dataset.repasseEditToggle)}"]`); if (row) row.hidden = !row.hidden; return; }
    const cancel = event.target.closest?.("[data-repasse-edit-cancel]");
    if (cancel) { const row = document.querySelector(`[data-repasse-edit-row="${CSS.escape(cancel.dataset.repasseEditCancel)}"]`); if (row) row.hidden = true; return; }
    const entryDelete = event.target.closest?.("[data-repasse-delete]");
    if (entryDelete) { void remove(`/api/repasses/entries/${encodeURIComponent(entryDelete.dataset.repasseDelete)}`, "Excluir esta entrada vinculada ao repasse?"); return; }
    const ruleDelete = event.target.closest?.("[data-repasse-rule-delete]");
    if (ruleDelete) { void remove(`/api/repasses/broker-rule?brokerName=${encodeURIComponent(ruleDelete.dataset.broker)}&lotKey=${encodeURIComponent(ruleDelete.dataset.lot)}`, "Remover esta regra de comissão do corretor e lote?"); return; }
    const planDelete = event.target.closest?.("[data-repasse-plan-delete]");
    if (planDelete) { void remove(`/api/repasses/sales/${encodeURIComponent(planDelete.dataset.repassePlanDelete)}/plan`, "Remover o plano e interromper a projeção futura?"); return; }
    if (!event.target.closest?.("[data-atlas-repasses-refresh]")) return;
    const page = event.target.closest("view-layer");
    if (!page) return;
    page._repasseLoaded = false;
    load(page, true).then(() => { if (appStore.get().view === "repasses") page.render(); });
  };
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("submit", onSubmit);
};
