import { apiFetch } from "../../api-client.mjs?v=repasse-read-services-v2";

/** Read-only repasse ledger assembled from the application's persisted services. */
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
    appStore.set({ repasseLedgerV1: { status: "loading", entries: [], sales: [], reasons: [], errors: {} } });
    try {
      const paths = ["/api/cash-flow", "/api/commercial-sales", "/api/commission-reasons"];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let results;
      try {
        results = await Promise.all(paths.map(async (url) => {
          try {
            const response = await apiFetch(url, { cache: "no-store", signal: controller.signal });
            if (!response.ok) return { error: `HTTP ${response.status}` };
            return { data: await response.json() };
          } catch (error) {
            return { error: String(error?.message || error) };
          }
        }));
      } finally { clearTimeout(timeout); }
      const [cashResult, commercialResult, commissionResult] = results;
      const errors = Object.fromEntries([
        ["caixa", cashResult.error],
        ["vendas", commercialResult.error],
        ["regras", commissionResult.error],
      ].filter(([, error]) => error));
      const cash = cashResult.data || {}, commercial = commercialResult.data || {}, commission = commissionResult.data || {};
      const allEntries = Array.isArray(cash.entries) ? cash.entries : [];
      const entries = allEntries.filter((entry) => /repasse|comiss[aã]o/i.test(`${entry.category || ""} ${entry.description || ""}`));
      appStore.set({ repasseLedgerV1: {
        status: Object.keys(errors).length === paths.length ? "error" : Object.keys(errors).length ? "partial" : "ready",
        entries,
        sales: Array.isArray(commercial.sales) ? commercial.sales : [],
        reasons: Array.isArray(commission.reasons) ? commission.reasons : Array.isArray(commission) ? commission : [],
        cashSummary: cash.summary || {}, checkedAt: new Date().toISOString(), error: "",
        errors,
      } });
      page._repasseLoaded = true;
    } catch (error) {
      appStore.set({ repasseLedgerV1: { status: "error", entries: [], sales: [], reasons: [], errors: { geral: String(error?.message || error) } } });
    } finally { page._repasseRequest = false; }
  };
  ViewLayer.prototype.repasses = function () {
    const data = appStore.get().repasseLedgerV1 || { status: "idle", entries: [], sales: [], reasons: [], error: "" };
    if (data.status === "idle" || data.status === "loading" && !this._repasseRequest) queueMicrotask(() => load(this).then(() => { if (appStore.get().view === "repasses") this.render(); }));
    const entries = data.entries || [], sales = data.sales || [], reasons = data.reasons || [];
    const lotForSale = (sale) => REPASSE_PRICE_CATALOG.find((lot) =>
      String(lot.label || "").trim().toLocaleLowerCase("pt-BR") === String(sale.lot || "").trim().toLocaleLowerCase("pt-BR"),
    );
    const salesByLot = new Map();
    for (const sale of sales) {
      const lotLabel = String(sale.lot || "").trim();
      if (!lotLabel) continue;
      const key = lotLabel.toLocaleLowerCase("pt-BR");
      if (!salesByLot.has(key)) salesByLot.set(key, { lotLabel, sales: [] });
      salesByLot.get(key).sales.push(sale);
    }
    const paid = entries.filter((entry) => entry.kind === "saida").reduce((sum, entry) => sum + (Number(entry.amountCents) || 0), 0);
    const loading = data.status === "idle" || data.status === "loading",
      errors = data.errors || {},
      status = loading ? "Consultando serviços operacionais…" : Object.keys(errors).length ? `Serviços indisponíveis: ${Object.entries(errors).map(([source, message]) => `${source} (${message})`).join(" · ")}. As demais fontes continuam sendo exibidas.` : `${entries.length} lançamento(s) de repasse/comissão encontrados no livro-caixa.`;
    return `<section class="atlas-repasse-page">
      <header class="atlas-page-heading"><div><span class="atlas-eyebrow">COMERCIAL · FINANCEIRO</span><h1>Repasses</h1><p>Leitura dos lançamentos reais do caixa e dos registros comerciais vinculados à aplicação.</p></div><div class="atlas-page-actions"><button type="button" class="atlas-outline-button" data-atlas-repasses-refresh>${ico("refresh-cw")} Atualizar</button><button type="button" class="atlas-dark-button" data-view="cash-record">${ico("plus")} Registrar saída no caixa</button></div></header>
      <p class="atlas-data-status" role="status" aria-live="polite">${esc(status)}</p>
      <section class="atlas-repasse-metrics"><article><small>Repasses/comissões lançados</small><strong>${loading || errors.caixa ? "—" : entries.length}</strong><span>${errors.caixa ? "livro-caixa indisponível" : "correspondência no livro-caixa"}</span></article><article><small>Saídas registradas</small><strong>${loading || errors.caixa ? "—" : money(paid)}</strong><span>${errors.caixa ? "livro-caixa indisponível" : "somente lançamentos classificados como saída"}</span></article><article><small>Registros comerciais</small><strong>${loading || errors.vendas ? "—" : sales.length}</strong><span>${errors.vendas ? "serviço comercial indisponível" : "vendas retornadas pelo serviço comercial"}</span></article><article><small>Regras de comissão</small><strong>${loading || errors.regras ? "—" : reasons.length}</strong><span>${errors.regras ? "parâmetros indisponíveis" : "parâmetros cadastrados, sem estimar pagamentos"}</span></article></section>
      <section class="atlas-data-card"><header><div><h2>Livro de repasses</h2><p>Entradas exibidas apenas quando a categoria ou descrição registrada menciona repasse ou comissão.</p></div></header>${loading ? `<p class="atlas-inline-loading">Carregando livro-caixa…</p>` : errors.caixa ? `<p class="atlas-source-error">Livro-caixa indisponível: ${esc(errors.caixa)}.</p>` : entries.length ? `<div class="atlas-table-scroll"><table><thead><tr><th>Data</th><th>Categoria</th><th>Etapa</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${entries.map((entry) => `<tr><td>${date(entry.date)}</td><td>${esc(entry.category || "—")}</td><td>${esc(entry.stage || "—")}</td><td>${esc(entry.description || "—")}</td><td>${esc(entry.kind || "—")}</td><td>${money(entry.amountCents)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="atlas-empty-state">${ico("database")}<h3>Nenhum repasse registrado no livro-caixa</h3><p>Não há lançamentos persistidos com categoria ou descrição identificada como repasse/comissão. Outros lançamentos não são reclassificados automaticamente.</p></div>`}</section>
      <section class="atlas-repasse-lower"><article class="atlas-data-card atlas-repasse-lot-profiles"><header><div><span class="atlas-eyebrow">VÍNCULO COMERCIAL · PERFIL DO LOTE</span><h2>Perfis de lote relacionados</h2><p>Vendas persistidas são agrupadas pelo identificador do lote. Abra a ficha para consultar os dados e controles mantidos no perfil correspondente.</p></div></header>${loading ? `<p class="atlas-inline-loading">Consultando vendas por lote…</p>` : errors.vendas ? `<p class="atlas-source-error">Perfis de lote indisponíveis: serviço de vendas respondeu ${esc(errors.vendas)}.</p>` : salesByLot.size ? `<div class="atlas-table-scroll"><table><thead><tr><th>Lote</th><th>Clientes</th><th>Corretores</th><th>Status</th><th>Valor registrado</th><th>Perfil</th></tr></thead><tbody>${[...salesByLot.values()].map((group) => { const lot = lotForSale({ lot: group.lotLabel }), clients = [...new Set(group.sales.map((sale) => sale.client).filter(Boolean))], brokers = [...new Set(group.sales.map((sale) => sale.broker).filter(Boolean))], statuses = [...new Set(group.sales.map((sale) => sale.status).filter(Boolean))], totalCents = group.sales.reduce((sum, sale) => sum + (Number(sale.valueCents) || 0), 0); return `<tr><td><b>${esc(group.lotLabel)}</b><small>${group.sales.length} venda(s) registrada(s)</small></td><td>${esc(clients.join(" · ") || "—")}</td><td>${esc(brokers.join(" · ") || "—")}</td><td>${esc(statuses.join(" · ") || "—")}</td><td>${money(totalCents)}</td><td>${lot ? `<button type="button" class="atlas-outline-button" data-repasse-lot-profile="${esc(lot.label)}">Abrir perfil</button>` : `<span class="atlas-unmatched-lot">Sem correspondência no catálogo</span>`}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="atlas-empty-state"><h3>Sem perfis de lote vinculados</h3><p>O serviço comercial não retornou vendas com lote associado.</p></div>`}</article>
      <article class="atlas-data-card"><header><div><h2>Regras de comissão</h2><p>Parâmetros existentes no serviço; eles não comprovam pagamento.</p></div></header>${loading ? `<p class="atlas-inline-loading">Carregando regras…</p>` : errors.regras ? `<p class="atlas-source-error">Parâmetros de comissão indisponíveis: ${esc(errors.regras)}.</p>` : reasons.length ? `<ul class="atlas-reason-list">${reasons.map((reason) => `<li><span><b>${esc(reason.label || reason.id)}</b><small>${esc(reason.description || "Sem descrição cadastrada")}</small></span><strong>${Number(reason.sharePercent) || 0}%</strong><em>${reason.active ? "Ativa" : "Inativa"}</em></li>`).join("")}</ul>` : `<div class="atlas-empty-state"><p>O serviço não retornou regras de comissão.</p></div>`}</article></section>
      <footer class="atlas-source-note">Fonte: APIs locais de caixa, vendas e parâmetros de comissão. Nenhum valor de repasse é calculado a partir de percentuais.</footer>
    </section>`;
  };
  const onClick = (event) => {
    const profileButton = event.target.closest?.("[data-repasse-lot-profile]");
    if (profileButton) {
      appStore.set({ view: "lot-detail", selectedLotDetailKey: profileButton.dataset.repasseLotProfile, lastAction: `Abriu o perfil de lote ${profileButton.dataset.repasseLotProfile} pelos repasses` });
      return;
    }
    if (!event.target.closest?.("[data-atlas-repasses-refresh]")) return;
    const page = event.target.closest("view-layer");
    if (!page) return;
    page._repasseLoaded = false;
    load(page, true).then(() => { if (appStore.get().view === "repasses") page.render(); });
  };
  document.addEventListener("click", onClick);
};
