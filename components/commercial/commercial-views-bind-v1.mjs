export function installCommercialViewsBindV1(ViewLayer, options) {
  const {
    appStore,
    apiFetch,
    bindCommissionNegotiationEventsV1,
    REPASSE_PRICE_CATALOG,
    commissionProfiles,
    esc,
    ico,
    formatBRL,
    lotExportRowV1,
    downloadBrandedLotExcelV1,
    notify,
    prepareAssistantLotStatusPromptV1,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    requestAnimationFrameRef = globalThis.requestAnimationFrame?.bind(globalThis),
    EventRef = globalThis.Event,
    FormDataRef = globalThis.FormData,
    confirmRef = globalThis.confirm?.bind(globalThis),
    setTimeoutRef = globalThis.setTimeout?.bind(globalThis),
    DateRef = globalThis.Date,
  } = options;
  const baseBindV1 = options.baseBind || ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = baseBindV1.apply(this, args);
  bindCommissionNegotiationEventsV1(this);
  const boardPage = this.querySelector(".brokers-board-page");
  const repassePage = this.querySelector(".repasse-page");
  repassePage?.querySelector('.repasse-page-head [data-view="brokers"]')?.remove();
  const entryHandoffCopy = repassePage?.querySelector(".lot-entry-handoff-note span");
  if (entryHandoffCopy) entryHandoffCopy.textContent = "As entradas já registradas permanecem consolidadas na tabela de repasses.";
  // A rota de lotes não exibe mais os cards legados de repasse. Entradas,
  // sócios e a tabela de repasses continuam acessíveis pelos fluxos próprios
  // (modal do lote e Central Operacional), sem ocupar a lista de lotes.
  repassePage?.querySelectorAll(".repasse-card").forEach((card) => card.remove());
  repassePage?.querySelector(".repasse-layout")?.remove();
  if (!repassePage) {
    documentRef.querySelectorAll(".lot-status-modal[data-lot-floating-control]").forEach((modal) => modal.remove());
    documentRef.body.classList.remove("lot-control-open");
  }
  if (repassePage && !repassePage.querySelector("[data-lot-price-catalog]")) {
    const head = repassePage.querySelector(".repasse-page-head");
    if (head) {
      const title = head.querySelector("h1"), label = head.querySelector(".activity-kind"), copy = head.querySelector("p");
      if (title) title.textContent = "Lotes";
      if (label) label.textContent = "LOTEAMENTO · VISUALIZAÇÃO E CONTROLE";
      if (copy) copy.textContent = "Consulte os valores de cada lote e controle entradas, abatimentos, comissões e repasses aos sócios.";
    }
    const catalog = documentRef.createElement("section");
    catalog.className = "lot-price-catalog-card";
    catalog.dataset.lotPriceCatalog = "true";
    catalog.innerHTML = `<header><div><span class="activity-kind">01 · TABELA DE LOTES</span><h2>Valores por lote</h2><p>Valores de referência importados da planilha de preços do empreendimento.</p></div><small>${REPASSE_PRICE_CATALOG.length} lotes</small></header><div class="lot-catalog-toolbar"><label class="lot-catalog-filter">Localizar lote ou quadra<input type="search" data-lot-catalog-filter placeholder="Ex.: QA 12"></label><label>Quadra<select data-lot-catalog-quadra><option value="">Todas</option>${[...new Set(REPASSE_PRICE_CATALOG.map(item => item.quadra))].sort().map(quadra => `<option value="${esc(quadra)}">${esc(quadra)}</option>`).join("")}</select></label><label>Status<select data-lot-catalog-status><option value="">Todos</option><option>Disponível</option><option>Reservado</option><option>Em negociação</option><option>Vendido</option><option>Repasse programado</option><option>Quitado</option><option>Bloqueado</option></select></label><label>Pagamento<select data-lot-catalog-payment><option value="">Todos</option><option>Pendente</option><option>Parcial</option><option>Pago</option><option>Cancelado</option></select></label><label>Vendedor<select data-lot-catalog-seller><option value="">Todos</option>${commissionProfiles.map(person => `<option value="${esc(person.name)}">${esc(person.name)}</option>`).join("")}</select></label></div><div class="repasse-table-wrap"><table><thead><tr><th>Lote</th><th>Quadra</th><th>Área</th><th>Valor à vista</th><th>Status</th><th>Pagamento</th><th>Iteração</th></tr></thead><tbody>${REPASSE_PRICE_CATALOG.map(item => { const lotKey = String(item.label || `${item.quadra}-${item.lot}`), lotState = appStore.get().lotStatuses?.[lotKey] || {}, status = lotState.status || "Disponível", paymentStatus = lotState.payment?.status || "Pendente", sellerName = lotState.sellerName || ""; return `<tr data-lot-catalog-row data-lot-key="${esc(lotKey)}" data-lot-quadra="${esc(item.quadra)}" data-lot-status="${esc(status)}" data-lot-payment="${esc(paymentStatus)}" data-lot-seller="${esc(sellerName)}" data-lot-search="${esc(`${item.label} ${item.lot} ${item.quadra}`.toLocaleLowerCase())}"><td><b>${esc(item.lot)}</b></td><td>${esc(item.quadra)}</td><td>${esc(item.area)} m²</td><td><b>${formatBRL(item.price)}</b></td><td><span class="lot-status-pill" data-lot-status-cell>${esc(status)}</span></td><td><span class="lot-payment-pill" data-lot-payment-cell>${esc(paymentStatus)}</span></td><td><button type="button" class="lot-catalog-action" data-lot-select data-lot-label="${esc(item.label)}" data-lot-price="${esc(item.price)}">Usar no repasse</button></td></tr>`; }).join("")}</tbody></table></div><footer class="lot-catalog-feedback" data-lot-catalog-feedback>Selecione um lote para preencher a entrada automaticamente ou clique em uma linha para alterar status, vendedor, repasse e pagamento.</footer>`;
    const mapDrawer = documentRef.createElement("details");
    mapDrawer.className = "lot-catalog-map-drawer";
    mapDrawer.innerHTML = `<summary><span>${ico("map")} Mapa de lotes</span><small>Abra e clique em um marcador para iniciar o controle</small></summary><div class="lot-catalog-map-window"><map-scene compact interactive data-public-static-only="true" data-admin-public-map data-lot-catalog-map data-stage="Controle comercial" data-overlay="urbanizacao" aria-label="Mapa retrátil dos lotes para controle comercial"></map-scene></div>`;
    catalog.querySelector("header")?.after(mapDrawer);
    mapDrawer.addEventListener("toggle", () => {
      if (!mapDrawer.open) return;
      requestAnimationFrameRef(async () => {
        const map = mapDrawer.querySelector("[data-lot-catalog-map]");
        map?.bindStaticSatelliteMapGesturesV1?.();
        map?.installAdminMasterplanOverlayV1?.();
        await map?.installSatelliteLotPlanOverlayV1?.({ markers: true, outlines: false });
        requestAnimationFrameRef(() => requestAnimationFrameRef(() => {
          map?.fitStaticSatelliteMasterplanV1?.();
        }));
      });
    });
    const printHeader = documentRef.createElement("div");
    printHeader.className = "lot-catalog-print-header";
    printHeader.innerHTML = `<div class="lot-catalog-print-brand"><img src="./assets/public/alianca-park-logo-full-letter-cutouts-v555.png" alt="Aliança Park Loteamento"></div><div class="lot-catalog-print-heading"><span>RELATÓRIO OPERACIONAL · LOTES</span><h1>Repasse e valores por lote</h1><p>Tabela de referência para acompanhamento de entradas, pagamentos e repasses.</p></div><div class="lot-catalog-print-meta"><b>Aliança Park</b><span>${REPASSE_PRICE_CATALOG.length} lotes listados</span><span>Emitido em ${new DateRef().toLocaleString("pt-BR")}</span></div>`;
    catalog.prepend(printHeader);
    const printFooter = documentRef.createElement("footer");
    printFooter.className = "lot-catalog-print-footer";
    printFooter.innerHTML = `<span>Aliança Park · Loteamento</span><span>Documento de apoio operacional · tabela de repasse</span>`;
    catalog.append(printFooter);
    const catalogHeader = catalog.querySelector("header");
    if (catalogHeader) {
      const catalogCount = catalogHeader.querySelector(":scope > small");
      const catalogHeadActions = documentRef.createElement("div");
      catalogHeadActions.className = "lot-catalog-head-actions";
      if (catalogCount) catalogHeadActions.append(catalogCount);
      const printButton = documentRef.createElement("button");
      printButton.type = "button";
      printButton.className = "toolbar-action lot-catalog-print";
      printButton.dataset.lotCatalogPrint = "true";
      printButton.innerHTML = `${ico("printer")} Imprimir tabela`;
      catalogHeadActions.append(printButton);
      const excelButton = documentRef.createElement("button");
      excelButton.type = "button";
      excelButton.className = "toolbar-action lot-catalog-excel";
      excelButton.dataset.lotCatalogExcel = "true";
      excelButton.innerHTML = `${ico("download")} Exportar Excel`;
      catalogHeadActions.append(excelButton);
      catalogHeader.append(catalogHeadActions);
    }
    (repassePage.querySelector(".repasse-kpis") || repassePage.querySelector(".repasse-page-head"))?.after(catalog);
  }
  // O lançamento de entrada não fica mais exposto na página: ele é montado
  // dentro do modal de controle do lote logo abaixo.
  const standaloneRepasseForm = repassePage?.querySelector("[data-repasse-entry-form]");
  standaloneRepasseForm?.closest(".repasse-card")?.remove();
  const repasseEntryForm = null;
  const repassePartnerForm = repassePage?.querySelector("[data-repasse-partner-form]");
  const repasseState = () => appStore.get();
  const lotInput = repasseEntryForm?.elements.namedItem("lot");
  if (lotInput && !lotInput.dataset.repasseCatalogBound) {
    lotInput.dataset.repasseCatalogBound = "true";
    const listId = "repasse-price-lots";
    lotInput.setAttribute("list", listId);
    lotInput.insertAdjacentHTML("afterend", `<datalist id="${listId}">${REPASSE_PRICE_CATALOG.map((item) => `<option value="${esc(item.label)}">${esc(item.quadra)} · lote ${esc(item.lot)} · ${formatBRL(item.price)}</option>`).join("")}</datalist>`);
    lotInput.addEventListener("change", () => { const selected = REPASSE_PRICE_CATALOG.find((item) => item.label.toLocaleLowerCase() === String(lotInput.value || "").trim().toLocaleLowerCase()); const gross = repasseEntryForm.elements.namedItem("gross"); if (selected && gross && !Number(gross.value)) { gross.value = selected.price; gross.dispatchEvent(new EventRef("input")); } });
  }
  const lotCatalog = repassePage?.querySelector("[data-lot-price-catalog]");
  lotCatalog?.querySelector("[data-lot-catalog-print]")?.addEventListener("click", () => {
    const cleanupPrintMode = () => documentRef.body.classList.remove("lot-catalog-print-mode");
    documentRef.body.classList.add("lot-catalog-print-mode");
    windowRef.addEventListener("afterprint", cleanupPrintMode, { once: true });
    windowRef.print();
  });
  lotCatalog?.querySelector("[data-lot-catalog-excel]")?.addEventListener("click", () => {
    const state = appStore.get();
    const visibleKeys = [...lotCatalog.querySelectorAll("[data-lot-catalog-row]")]
      .filter((row) => !row.hidden)
      .map((row) => String(row.dataset.lotKey));
    const lots = REPASSE_PRICE_CATALOG
      .filter((item) => visibleKeys.includes(String(item.label)))
      .map((item) => lotExportRowV1(item, state));
    downloadBrandedLotExcelV1({ lots, title: "Tabela de lotes", subtitle: "Valores, status, pagamentos e responsável comercial", filename: "alianca-park-tabela-lotes" });
    notify?.(`${lots.length} lote(s) exportados em planilha timbrada.`, "success");
  });
  const catalogToolbar = lotCatalog?.querySelector(".lot-catalog-toolbar");
  if (catalogToolbar) catalogToolbar.innerHTML = `<div class="lot-catalog-toolbar-main"><label class="lot-catalog-filter">Buscar lote ou quadra<input type="search" data-lot-catalog-filter placeholder="Ex.: QA 12"></label><div class="lot-catalog-crud" role="group" aria-label="Controle dos lotes"><button type="button" data-lot-control-new>Novo controle</button><button type="button" data-lot-control-edit disabled>Editar selecionado</button><button type="button" data-lot-control-delete disabled>Excluir controle</button></div></div><div class="lot-catalog-toolbar-filters"><label>Quadra<select data-lot-catalog-quadra><option value="">Todas</option>${[...new Set(REPASSE_PRICE_CATALOG.map(item => item.quadra))].sort().map(quadra => `<option value="${esc(quadra)}">${esc(quadra)}</option>`).join("")}</select></label><label>Status<select data-lot-catalog-status><option value="">Todos</option><option>Disponível</option><option>Reservado</option><option>Em negociação</option><option>Vendido</option><option>Repasse programado</option><option>Quitado</option><option>Bloqueado</option></select></label><label>Pagamento<select data-lot-catalog-payment><option value="">Todos</option><option>Pendente</option><option>Parcial</option><option>Pago</option><option>Cancelado</option></select></label><label>Vendedor<select data-lot-catalog-seller><option value="">Todos</option>${commissionProfiles.map(person => `<option value="${esc(person.name)}">${esc(person.name)}</option>`).join("")}</select></label><button type="button" data-lot-filter-clear>Limpar filtros</button></div>`;
  if (lotCatalog) {
    const controlHeading = lotCatalog.querySelector("thead th:last-child");
    if (controlHeading) controlHeading.textContent = "Controle";
    const feedback = lotCatalog.querySelector("[data-lot-catalog-feedback]");
    if (feedback) feedback.textContent = "Clique em uma linha para abrir a ficha completa do lote. Use “Abrir controle” para manter o fluxo rápido no modal.";
  }
  const lotCatalogFilter = lotCatalog?.querySelector("[data-lot-catalog-filter]");
  const lotCatalogFilterQuadra = lotCatalog?.querySelector("[data-lot-catalog-quadra]"), lotCatalogFilterStatus = lotCatalog?.querySelector("[data-lot-catalog-status]"), lotCatalogFilterPayment = lotCatalog?.querySelector("[data-lot-catalog-payment]"), lotCatalogFilterSeller = lotCatalog?.querySelector("[data-lot-catalog-seller]");
  const applyLotCatalogFilters = () => {
    const query = String(lotCatalogFilter?.value || "").trim().toLocaleLowerCase(), quadra = String(lotCatalogFilterQuadra?.value || ""), status = String(lotCatalogFilterStatus?.value || ""), payment = String(lotCatalogFilterPayment?.value || ""), seller = String(lotCatalogFilterSeller?.value || "");
    lotCatalog?.querySelectorAll("[data-lot-catalog-row]").forEach((row) => {
      row.hidden = Boolean((query && !String(row.dataset.lotSearch || "").includes(query)) || (quadra && row.dataset.lotQuadra !== quadra) || (status && row.dataset.lotStatus !== status) || (payment && row.dataset.lotPayment !== payment) || (seller && row.dataset.lotSeller !== seller));
    });
    const visible = [...(lotCatalog?.querySelectorAll("[data-lot-catalog-row]") || [])].filter(row => !row.hidden).length;
    const feedback = lotCatalog?.querySelector("[data-lot-catalog-feedback]"); if (feedback) feedback.textContent = `${visible} lote(s) encontrados. Clique na linha para abrir a ficha ou em “Abrir controle” para usar o modal.`;
  };
  [lotCatalogFilter, lotCatalogFilterQuadra, lotCatalogFilterStatus, lotCatalogFilterPayment, lotCatalogFilterSeller].forEach((control) => control?.addEventListener(control === lotCatalogFilter ? "input" : "change", applyLotCatalogFilters));
  lotCatalog?.querySelectorAll("[data-lot-select]").forEach((button) => {
    button.textContent = "Abrir controle";
  });
  if (lotCatalog) {
    const lotStatusModal = documentRef.createElement("div");
    lotStatusModal.className = "lot-status-modal";
    lotStatusModal.hidden = true;
    lotStatusModal.innerHTML = `<div class="lot-status-modal-backdrop" data-lot-status-close></div><section class="lot-status-dialog" data-lot-flow-page="0" role="dialog" aria-modal="true" aria-labelledby="lot-status-title"><header><div><span class="activity-kind">CONTROLE DO LOTE</span><h2 id="lot-status-title">Controle comercial</h2><p data-lot-status-summary></p></div><button type="button" class="lot-status-close" data-lot-status-close aria-label="Fechar">×</button></header><form data-lot-status-form><input type="hidden" name="lotKey"><section class="lot-status-form-section" data-lot-flow-panel="1"><span class="activity-kind">02 · COMERCIAL</span><label>Status do lote<select name="status"><option>Disponível</option><option>Reservado</option><option>Em negociação</option><option>Vendido</option><option>Repasse programado</option><option>Quitado</option><option>Bloqueado</option></select></label><label>Vendedor<select name="sellerId"><option value="">Selecionar vendedor</option>${commissionProfiles.map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join("")}</select></label><label class="wide">Observação<textarea name="note" rows="3" placeholder="Observação sobre o controle comercial do lote"></textarea></label></section><section class="lot-status-form-section" data-lot-flow-panel="2"><span class="activity-kind">03 · ENTRADAS E REPASSES</span><p>Valores recebidos, plano de pagamento, juros e comissões são mantidos em um único fluxo.</p><button type="button" class="toolbar-primary" data-lot-open-repasses>${ico("wallet-cards")} Abrir Repasses para este lote</button></section><footer><button type="button" class="toolbar-action" data-lot-flow-back>Voltar</button><button type="button" class="toolbar-action" data-lot-flow-next>Avançar</button><button type="submit" class="toolbar-primary">Salvar controle comercial</button></footer></form></section>`;
    // Keep the floating layer outside scrollable/transformed page containers.
    documentRef.querySelectorAll(".lot-status-modal[data-lot-floating-control]").forEach((oldModal) => oldModal.remove());
    documentRef.body.classList.remove("lot-control-open");
    lotStatusModal.dataset.lotFloatingControl = "true";
    documentRef.body.append(lotStatusModal);
    const statusForm = lotStatusModal.querySelector("[data-lot-status-form]"), summary = lotStatusModal.querySelector("[data-lot-status-summary]");
    const lotPicker = documentRef.createElement("section");
    lotPicker.className = "lot-status-picker";
    lotPicker.dataset.lotFlowPanel = "0";
    lotPicker.innerHTML = `<header class="lot-picker-head"><div><span class="activity-kind">01 · SELECIONAR LOTE</span><strong>Fluxo de controle</strong></div><small data-lot-picker-current>Nenhum lote selecionado</small></header><nav class="lot-control-flow" aria-label="Etapas do controle"><button type="button" data-lot-flow-step="0">1. Lote</button><button type="button" data-lot-flow-step="1">2. Comercial</button><button type="button" data-lot-flow-step="2">3. Entrada</button></nav><div class="lot-picker-toolbar"><label>Quadra<select data-lot-picker-quadra><option value="">Todas</option>${[...new Set(REPASSE_PRICE_CATALOG.map((item) => item.quadra))].sort().map((quadra) => `<option value="${esc(quadra)}">${esc(quadra)}</option>`).join("")}</select></label><button type="button" class="toolbar-action" data-lot-picker-clear>Limpar filtro</button></div><div class="lot-picker-results" data-lot-picker-list role="listbox" aria-label="Lotes da página"></div><footer class="lot-picker-pagination"><button type="button" data-lot-picker-prev>← Anterior</button><span data-lot-picker-count></span><button type="button" data-lot-picker-next>Próxima →</button></footer>`;
    statusForm.querySelector('[name="lotKey"]')?.after(lotPicker);
    const lotPickerQuadra = lotPicker.querySelector("[data-lot-picker-quadra]"), lotPickerList = lotPicker.querySelector("[data-lot-picker-list]"), lotPickerCurrent = lotPicker.querySelector("[data-lot-picker-current]"), lotPickerCount = lotPicker.querySelector("[data-lot-picker-count]"), lotPickerPrev = lotPicker.querySelector("[data-lot-picker-prev]"), lotPickerNext = lotPicker.querySelector("[data-lot-picker-next]"), lotStatusDialog = lotStatusModal.querySelector(".lot-status-dialog");
    const lotPickerPageSize = 12;
    let lotPickerPage = 0;
    const setLotFlowPage = (page) => {
      const next = Math.max(0, Math.min(2, Number(page) || 0));
      lotStatusDialog?.setAttribute("data-lot-flow-page", String(next));
      lotPicker.querySelectorAll("[data-lot-flow-step]").forEach((button) => {
        const active = Number(button.dataset.lotFlowStep) === next;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "step" : "false");
      });
      const selected = Boolean(statusForm.elements.lotKey.value);
      lotPicker.querySelectorAll("[data-lot-flow-step]").forEach((button) => {
        if (Number(button.dataset.lotFlowStep) > 0) button.disabled = !selected;
      });
      const previous = statusForm.querySelector("[data-lot-flow-back]"), nextButton = statusForm.querySelector("[data-lot-flow-next]"), submit = statusForm.querySelector('[type="submit"]');
      if (previous) previous.hidden = next === 0;
      if (nextButton) { nextButton.hidden = next >= 2; nextButton.disabled = !selected; }
      if (submit) submit.hidden = next !== 2;
    };
    const renderLotPicker = () => {
      const quadra = String(lotPickerQuadra?.value || ""), currentLotKey = String(statusForm.elements.lotKey.value || ""), markerLot = Number(lotPicker.dataset.markerLot || 0);
      const matches = REPASSE_PRICE_CATALOG.filter((item) => {
        return (!quadra || item.quadra === quadra) && (!markerLot || Number(item.lot) === markerLot);
      });
      const pages = Math.max(1, Math.ceil(matches.length / lotPickerPageSize));
      lotPickerPage = Math.max(0, Math.min(lotPickerPage, pages - 1));
      const visibleItems = matches.slice(lotPickerPage * lotPickerPageSize, (lotPickerPage + 1) * lotPickerPageSize);
      if (lotPickerCurrent) lotPickerCurrent.textContent = currentLotKey ? `Selecionado: ${currentLotKey}` : "Nenhum lote selecionado";
      if (lotPickerCount) lotPickerCount.textContent = `${matches.length} lote(s) · página ${lotPickerPage + 1} de ${pages}`;
      if (lotPickerPrev) lotPickerPrev.disabled = lotPickerPage === 0;
      if (lotPickerNext) lotPickerNext.disabled = lotPickerPage >= pages - 1;
      if (lotPickerList) {
        lotPickerList.innerHTML = visibleItems.length ? visibleItems.map((item) => `<button type="button" role="option" aria-selected="${String(item.label) === currentLotKey}" class="lot-picker-option${String(item.label) === currentLotKey ? " is-selected" : ""}" data-lot-picker-option data-lot-key="${esc(item.label)}"><span><b>${esc(item.label)}</b><small>${esc(item.quadra)} · ${esc(item.area)} m² · ${formatBRL(item.price)}</small></span><strong>Selecionar</strong></button>`).join("") : `<p class="lot-picker-empty">Nenhum lote corresponde ao filtro atual.</p>`;
        lotPickerList.querySelectorAll("[data-lot-picker-option]").forEach((button) => button.addEventListener("click", () => { openLotStatus(button.dataset.lotKey); setLotFlowPage(1); }));
      }
    };
    lotPickerQuadra?.addEventListener("change", () => { lotPickerPage = 0; renderLotPicker(); });
    lotPickerPrev?.addEventListener("click", () => { lotPickerPage--; renderLotPicker(); });
    lotPickerNext?.addEventListener("click", () => { lotPickerPage++; renderLotPicker(); });
    lotPicker.querySelector("[data-lot-picker-clear]")?.addEventListener("click", () => { if (lotPickerQuadra) lotPickerQuadra.value = ""; delete lotPicker.dataset.markerLot; lotPickerPage = 0; renderLotPicker(); lotPickerQuadra?.focus(); });
    lotPicker.querySelectorAll("[data-lot-flow-step]").forEach((button) => button.addEventListener("click", () => { if (statusForm.elements.lotKey.value) setLotFlowPage(button.dataset.lotFlowStep); }));
    const selectedRow = () => lotCatalog.querySelector("[data-lot-catalog-row].is-selected");
    const updateCrudButtons = () => {
      const selected = selectedRow();
      ["edit", "repasse"].forEach((action) => { const button = catalogToolbar?.querySelector(`[data-lot-control-${action}]`); if (button) button.disabled = !selected; });
      const deleteButton = catalogToolbar?.querySelector("[data-lot-control-delete]");
      if (deleteButton) deleteButton.disabled = !selected || !repasseState().lotStatuses?.[selected.dataset.lotKey];
    };
    let focusBeforeModal = null;
    const closeLotStatus = () => { lotStatusModal.hidden = true; documentRef.body.classList.remove("lot-control-open"); focusBeforeModal?.focus?.(); };
    lotStatusModal.querySelectorAll("[data-lot-status-close]").forEach((button) => button.addEventListener("click", closeLotStatus));
    lotStatusModal.querySelector("[data-lot-open-repasses]")?.addEventListener("click", () => {
      const lotKey = String(statusForm.elements.lotKey.value || "");
      closeLotStatus();
      appStore.set({ view: "repasses", repasseSelectedLotKey: lotKey, repasseSelectedSaleId: "", lastAction: `Abriu Repasses para o lote ${lotKey}` });
    });
    lotStatusModal.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); closeLotStatus(); } });
    const openLotStatus = (lotKey, focusPicker = false, flowPage = focusPicker ? 0 : 1) => {
      const item = REPASSE_PRICE_CATALOG.find((candidate) => String(candidate.label) === String(lotKey));
      if (!item) return;
      const stored = repasseState().lotStatuses?.[lotKey] || {}, formValues = statusForm.elements;
      formValues.lotKey.value = lotKey; formValues.status.value = stored.status || "Disponível"; formValues.sellerId.value = stored.sellerId || ""; formValues.note.value = stored.note || "";
      delete lotPicker.dataset.markerLot;
      lotPickerPage = 0;
      if (summary) summary.textContent = `${item?.label || lotKey} · ${item ? formatBRL(item.price) : "valor de referência"}`;
      renderLotPicker();
      lotCatalog.querySelectorAll("[data-lot-catalog-row]").forEach((row) => row.classList.toggle("is-selected", row.dataset.lotKey === lotKey));
      updateCrudButtons();
      if (lotStatusModal.hidden) focusBeforeModal = documentRef.activeElement;
      lotStatusModal.hidden = false;
      documentRef.body.classList.add("lot-control-open");
      setLotFlowPage(flowPage);
      (focusPicker ? lotPickerQuadra : formValues.status).focus();
    };
    lotCatalog.querySelectorAll("[data-lot-select]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      openLotStatus(button.dataset.lotLabel);
    }));
    const openLotPickerFromMarker = (rawLotId) => {
      const matched = String(rawLotId || "").match(/\d+/g);
      const lotNumber = Number(matched?.at(-1) || 0);
      if (!lotNumber) return;
      const matches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === lotNumber);
      if (matches.length === 1) { openLotStatus(matches[0].label, true, 1); return; }
      statusForm.reset();
      statusForm.elements.lotKey.value = "";
      lotPicker.dataset.markerLot = String(lotNumber);
      lotPickerPage = 0;
      if (lotPickerQuadra) lotPickerQuadra.value = "";
      if (summary) summary.textContent = `Marcador Lote ${String(lotNumber).padStart(3, "0")} · selecione a quadra`;
      renderLotPicker();
      if (lotStatusModal.hidden) focusBeforeModal = documentRef.activeElement;
      lotStatusModal.hidden = false;
      documentRef.body.classList.add("lot-control-open");
      setLotFlowPage(0);
      lotPickerQuadra?.focus();
    };
    statusForm.querySelector("[data-lot-flow-back]")?.addEventListener("click", () => {
      setLotFlowPage(Number(lotStatusDialog?.dataset.lotFlowPage || 0) - 1);
    });
    statusForm.querySelector("[data-lot-flow-next]")?.addEventListener("click", () => {
      if (!statusForm.elements.lotKey.value) return;
      setLotFlowPage(Number(lotStatusDialog?.dataset.lotFlowPage || 0) + 1);
    });
    lotCatalog.querySelector("[data-lot-catalog-map]")?.addEventListener("belavista:lot-marker-selected", (event) => {
      event.stopPropagation();
      openLotPickerFromMarker(event.detail?.lotId);
      prepareAssistantLotStatusPromptV1(event.detail?.label || event.detail?.lotId);
    });
    renderLotPicker();
    lotCatalog.querySelectorAll("[data-lot-catalog-row]").forEach((row) => {
      row.tabIndex = 0;
      row.setAttribute("aria-label", `Abrir ficha do lote ${row.dataset.lotKey}`);
      const openLotDetail = () => appStore.set({ view: "lot-detail", selectedLotDetailKey: row.dataset.lotKey, lastAction: `Abriu a ficha do lote ${row.dataset.lotKey}` });
      row.addEventListener("click", openLotDetail);
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openLotDetail(); } });
    });
    repassePage?.querySelectorAll("[data-repasse-edit]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entry = (repasseState().repasseEntries || []).find((candidate) => candidate.id === button.dataset.repasseEdit);
      if (entry?.lot) openLotStatus(entry.lot, true);
    }));
    catalogToolbar?.querySelector("[data-lot-control-new]")?.addEventListener("click", () => openLotStatus(selectedRow()?.dataset.lotKey || lotCatalog.querySelector("[data-lot-catalog-row]:not([hidden])")?.dataset.lotKey, true));
    catalogToolbar?.querySelector("[data-lot-control-edit]")?.addEventListener("click", () => openLotStatus(selectedRow()?.dataset.lotKey));
    catalogToolbar?.querySelector("[data-lot-control-delete]")?.addEventListener("click", () => {
      const lotKey = selectedRow()?.dataset.lotKey;
      if (!lotKey || !confirmRef(`Excluir o controle de ${lotKey}? O lote e seu preço permanecerão na tabela.`)) return;
      const next = { ...(repasseState().lotStatuses || {}) };
      delete next[lotKey];
      appStore.set({ lotStatuses: next, lastAction: `Excluiu controle do lote ${lotKey}` });
      const row = selectedRow();
      if (row) { row.dataset.lotStatus = "Disponível"; row.dataset.lotPayment = "Pendente"; row.dataset.lotSeller = ""; row.querySelector("[data-lot-status-cell]").textContent = "Disponível"; row.querySelector("[data-lot-payment-cell]").textContent = "Pendente"; }
      updateCrudButtons(); applyLotCatalogFilters();
    });
    catalogToolbar?.querySelector("[data-lot-filter-clear]")?.addEventListener("click", () => { [lotCatalogFilter, lotCatalogFilterQuadra, lotCatalogFilterStatus, lotCatalogFilterPayment, lotCatalogFilterSeller].forEach((control) => { if (control) control.value = ""; }); applyLotCatalogFilters(); });
    statusForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormDataRef(statusForm)), current = repasseState().lotStatuses || {}, seller = commissionProfiles.find((person) => person.id === values.sellerId), lotState = { status: values.status, sellerId: values.sellerId, sellerName: seller?.name || "", note: values.note, updatedAt: new DateRef().toISOString() };
      appStore.set({ lotStatuses: { ...current, [values.lotKey]: lotState }, lastAction: `Atualizou controle do lote ${values.lotKey}` });
      const row = [...lotCatalog.querySelectorAll("[data-lot-catalog-row]")].find((candidate) => candidate.dataset.lotKey === values.lotKey), cell = row?.querySelector("[data-lot-status-cell]");
      if (cell) cell.textContent = values.status;
      if (row) { row.dataset.lotStatus = values.status; row.dataset.lotSeller = seller?.name || ""; }
      const feedback = lotCatalog.querySelector("[data-lot-catalog-feedback]"); if (feedback) feedback.textContent = `${values.lotKey} atualizado para “${values.status}”.`;
      updateCrudButtons(); applyLotCatalogFilters(); closeLotStatus();
    });
  }
  const settingsPage = this.querySelector("[data-stage-comprehension-settings]");
  if (settingsPage && !settingsPage.querySelector("[data-repasse-config]")) {
    const configCard = documentRef.createElement("section");
    configCard.className = "repasse-config settings-repasse-config";
    configCard.dataset.repasseConfig = "true";
    configCard.innerHTML = `<header><div><span class="activity-kind">COMERCIAL · PARÂMETROS DE REPASSE</span><h2>Regras ajustáveis</h2><p>Alterações ficam disponíveis somente após confirmação.</p></div><button type="button" class="toolbar-primary" data-repasse-config-edit disabled>Carregando regras…</button></header><div class="settings-repasse-config-fields" data-repasse-config-fields aria-readonly="true"><label>Abatimento / imposto (%)<input data-repasse-config-field="taxPercent" type="number" min="0" max="100" step="0.1" disabled></label><label>Comissão (%)<input data-repasse-config-field="commissionPercent" type="number" min="0" max="100" step="0.1" disabled></label><label>Divisão sócio A (%)<input data-repasse-config-field="splitA" type="number" min="0" max="100" step="1" disabled></label><label>Divisão sócio B (%)<input data-repasse-config-field="splitB" type="number" min="0" max="100" step="1" disabled></label><label>Arredondar para múltiplo de (R$)<input data-repasse-config-field="roundTo" type="number" min="0" step="10" disabled></label></div><span data-repasse-config-status>Carregando configuração persistida…</span><dialog class="atlas-confirm-dialog" data-repasse-config-confirm><form method="dialog"><span class="activity-kind">CONFIRMAÇÃO DE ALTERAÇÃO</span><h3>Deseja alterar as regras de repasse?</h3><p>Confirme para liberar os campos e gravar a nova configuração no repositório.</p><footer><button type="submit" value="cancel" class="atlas-outline-button">Cancelar</button><button type="submit" value="confirm" class="atlas-dark-button">Sim, alterar regras</button></footer></form></dialog></section>`;
    settingsPage.querySelector(".stage-comprehension-settings-head")?.after(configCard);
  }
  const configCard = settingsPage?.querySelector("[data-repasse-config]");
  const configFields = configCard?.querySelector("[data-repasse-config-fields]");
  const configDialog = configCard?.querySelector("[data-repasse-config-confirm]");
  const configStatus = configCard?.querySelector("[data-repasse-config-status]");
  let commercialConfig = null;
  if (configCard && typeof apiFetch === "function") {
    apiFetch("/api/admin/config/commercial", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      commercialConfig = payload;
      const legacyLocalValues = repasseState().repasseConfig || null;
      const values = payload.data?.repasseConfig || legacyLocalValues || {};
      for (const input of configCard.querySelectorAll("[data-repasse-config-field]")) {
        const value = values[input.dataset.repasseConfigField];
        if (value !== undefined && value !== null) input.value = String(value);
      }
      const editButton = configCard.querySelector("[data-repasse-config-edit]");
      if (editButton) { editButton.disabled = false; editButton.textContent = "Alterar regras"; }
      if (configStatus) configStatus.textContent = payload.source === "github" ? "Regras carregadas do repositório." : legacyLocalValues ? "Regras anteriores deste dispositivo carregadas; salvará a configuração canônica no repositório." : "Nenhuma regra persistida encontrada; configure os valores e salve no repositório.";
    }).catch((error) => { const editButton = configCard.querySelector("[data-repasse-config-edit]"); if (editButton) { editButton.disabled = true; editButton.textContent = "Regras indisponíveis"; } if (configStatus) configStatus.textContent = `Falha ao carregar configuração do repositório: ${error.message}`; });
  }
  configDialog?.addEventListener("close", () => {
    if (configDialog.returnValue !== "confirm") return;
    configFields?.querySelectorAll("input").forEach((input) => { input.disabled = false; });
    configFields?.setAttribute("aria-readonly", "false");
    const editButton = configCard.querySelector("[data-repasse-config-edit]");
    if (editButton) { editButton.dataset.editing = "true"; editButton.textContent = "Concluir edição"; }
    if (configStatus) configStatus.textContent = "Edite os valores e saia do campo para salvar.";
  });
  configCard?.querySelector("[data-repasse-config-edit]")?.addEventListener("click", (event) => {
    const editButton = event.currentTarget;
    if (editButton.dataset.editing === "true") {
      const values = Object.fromEntries([...configCard.querySelectorAll("[data-repasse-config-field]")].map((input) => [input.dataset.repasseConfigField, Number(input.value)]));
      if (Object.entries(values).some(([key, value]) => !Number.isFinite(value) || value < 0 || (["taxPercent", "commissionPercent", "splitA", "splitB"].includes(key) && value > 100)) || values.splitA + values.splitB !== 100) {
        if (configStatus) configStatus.textContent = "Percentuais devem estar entre 0–100 e a divisão dos sócios deve totalizar 100%.";
        return;
      }
      editButton.disabled = true;
      if (configStatus) configStatus.textContent = "Salvando configuração no repositório…";
      const baseConfig = commercialConfig?.source === "github" ? commercialConfig.data : { sales: [], commissions: [], brokers: [], commissionRules: [] };
      apiFetch("/api/admin/config/commercial", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: commercialConfig?.sha || "", data: { ...baseConfig, repasseConfig: values } }) })
        .then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`); commercialConfig = payload; configFields?.querySelectorAll("input").forEach((input) => { input.disabled = true; }); configFields?.setAttribute("aria-readonly", "true"); editButton.dataset.editing = "false"; editButton.textContent = "Alterar regras"; if (configStatus) configStatus.textContent = "Regras salvas no repositório."; notify("Regras de repasse salvas no repositório.", "success"); })
        .catch((error) => { if (configStatus) configStatus.textContent = `Falha ao salvar no repositório: ${error.message}`; notify(`Falha ao salvar regras: ${error.message}`, "error"); })
        .finally(() => { editButton.disabled = false; });
      return;
    }
    configDialog?.showModal?.();
  });
  const repasseConfig = () => ({ taxPercent: 6, commissionPercent: 10, splitA: 40, splitB: 60, roundTo: 100, ...(commercialConfig?.data?.repasseConfig || {}) });
  const calculateRepasse = (gross) => { const config = repasseConfig(); const tax = gross * config.taxPercent / 100; const afterTax = gross - tax; const commission = afterTax * config.commissionPercent / 100; const base = afterTax - commission; const rounded = config.roundTo > 0 ? Math.floor(base / config.roundTo) * config.roundTo : base; return { ...config, gross, tax, afterTax, commission, net: Math.max(0, rounded), rounding: base - rounded }; };
  const refreshRepasse = (lastAction) => appStore.set({ lastAction });
  repasseEntryForm?.querySelector('[name="gross"]')?.addEventListener("input", (event) => {
    const gross = Math.max(0, Number(event.target.value) || 0);
    const calc = calculateRepasse(gross);
    const preview = repasseEntryForm.querySelector("[data-repasse-preview]");
    if (preview) preview.textContent = `Imposto: ${formatBRL(calc.tax)} · Comissão: ${formatBRL(calc.commission)} · Valor final: ${formatBRL(calc.net)} · Arredondamento: ${formatBRL(calc.rounding)}`;
  });
  repasseEntryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormDataRef(event.currentTarget).entries());
    const gross = Math.max(0, Number(values.gross) || 0);
    const id = values.id || `RP-${DateRef.now().toString().slice(-8)}`;
    const calc = calculateRepasse(gross);
    const activePartners = (repasseState().repassePartners || []).filter((item) => item.active !== false);
    const splitA = calc.splitA / Math.max(1, calc.splitA + calc.splitB), splitB = 1 - splitA;
    const distributions = activePartners.slice(0, 2).map((item, index) => ({ partnerId: item.id, partnerName: item.name, sharePercent: index === 0 ? calc.splitA : calc.splitB, amount: Math.round(calc.net * (index === 0 ? splitA : splitB) * 100) / 100 }));
    const entry = { id, lot: String(values.lot || "").trim().toUpperCase(), client: String(values.client || "").trim(), partnerId: "all", partnerName: distributions.map((item) => `${item.partnerName} (${item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`).join(" · ") || "Sócios a cadastrar", distributions, description: String(values.description || "").trim(), gross, discount: Math.round(calc.tax * 100) / 100, tax: Math.round(calc.tax * 100) / 100, commission: Math.round(calc.commission * 100) / 100, rounding: Math.round(calc.rounding * 100) / 100, net: calc.net, updatedAt: new DateRef().toISOString() };
    const current = repasseState().repasseEntries || [];
    refreshRepasse(`Salvou repasse ${id}`);
    appStore.set({ repasseEntries: [...current.filter((item) => item.id !== id), entry], lastAction: `Salvou repasse ${id}` });
    notify(`Entrada salva. ${formatBRL(calc.net)} programados aos sócios após imposto, comissão e arredondamento.`, "success");
  });
  repasseEntryForm?.addEventListener("reset", () => { setTimeoutRef(() => { const preview = repasseEntryForm.querySelector("[data-repasse-preview]"); if (preview) preview.textContent = "Valor final: R$ 0,00"; }, 0); });
  repassePartnerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormDataRef(event.currentTarget).entries());
    const id = values.id || `SOC-${DateRef.now().toString().slice(-8)}`;
    const partner = { id, name: String(values.name || "").trim(), document: String(values.document || "").trim(), contact: String(values.contact || "").trim(), active: true };
    const current = repasseState().repassePartners || [];
    appStore.set({ repassePartners: [...current.filter((item) => item.id !== id), partner], lastAction: `Salvou sócio ${id}` });
    notify("Sócio salvo.", "success");
  });
  repassePage?.querySelectorAll("[data-repasse-edit]").forEach((button) => button.addEventListener("click", () => {
    const item = (repasseState().repasseEntries || []).find((entry) => entry.id === button.dataset.repasseEdit);
    if (!item || !repasseEntryForm) return;
    Object.entries(item).forEach(([key, value]) => { const input = repasseEntryForm.elements.namedItem(key); if (input && key !== "discount" && key !== "net") input.value = value ?? ""; });
    repasseEntryForm.querySelector('[name="gross"]')?.dispatchEvent(new EventRef("input"));
  }));
  repassePage?.querySelectorAll("[data-repasse-delete]").forEach((button) => button.addEventListener("click", () => { if (!confirmRef("Excluir este repasse?")) return; appStore.set({ repasseEntries: (repasseState().repasseEntries || []).filter((entry) => entry.id !== button.dataset.repasseDelete), lastAction: "Excluiu repasse" }); notify("Repasse excluído.", "success"); }));
  repassePage?.querySelectorAll("[data-repasse-partner-edit]").forEach((button) => button.addEventListener("click", () => { const item = (repasseState().repassePartners || []).find((entry) => entry.id === button.dataset.repassePartnerEdit); if (!item || !repassePartnerForm) return; Object.entries(item).forEach(([key, value]) => { const input = repassePartnerForm.elements.namedItem(key); if (input) input.value = value ?? ""; }); }));
  repassePage?.querySelectorAll("[data-repasse-partner-delete]").forEach((button) => button.addEventListener("click", () => { if (!confirmRef("Excluir este sócio?")) return; appStore.set({ repassePartners: (repasseState().repassePartners || []).filter((entry) => entry.id !== button.dataset.repassePartnerDelete), lastAction: "Excluiu sócio" }); notify("Sócio excluído.", "success"); }));
  boardPage?.querySelectorAll("[data-broker-board-profile]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        selectedCommissionProfile: button.dataset.brokerBoardProfile,
        lastAction: "Abriu perfil do corretor",
      }),
    ),
  );
  boardPage
    ?.querySelector('[data-view="brokers"]')
    ?.addEventListener("click", () =>
      appStore.set({
        view: "brokers",
        selectedCommissionProfile: null,
        lastAction: "Abriu comissões",
      }),
    );


  return result;
  };
}
