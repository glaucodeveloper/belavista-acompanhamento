/**
 * Keeps the historical Leads render layers together in the commercial domain.
 * Later commercial workspace installers may intentionally replace this route;
 * preserving this order is required for the current application composition.
 */
export const installLeadsPageCompositionV1 = (
  ViewLayer,
  { appStore, demoData, esc, ico },
) => {
  ViewLayer.prototype.leads = function () {
    const s = appStore.get(),
      firebaseLeads = (s.publicLeads || []).map((item) => ({
        name: item.name || "Novo interessado",
        lot: item.lot || "Lote a definir",
        objective: item.objective || "Moradia",
        budget: item.budget || "Faixa a confirmar",
        status: item.status || "Novo",
        sun: item.sun || "A definir",
        altitude: item.altitude || "—",
        terrain: item.terrain || "A definir",
        whatsapp: item.whatsapp || "",
        email: item.email || "",
        source: "Firebase",
      })),
      allLeads = [...firebaseLeads, ...demoData.leads],
      selectedIndex = Math.max(
        0,
        Math.min(allLeads.length - 1, Number(s.selectedLead) || 0),
      ),
      lead = allLeads[selectedIndex];
    const lotPositions = {
      "Lote 54 · Q-12": { x: 46, y: 42 },
      "Lote 12 · Q-03": { x: 61, y: 34 },
      "Lote 93 · Q-18": { x: 73, y: 58 },
    };
    const lots = [
      ...new Map(
        allLeads.map((item, index) => [
          item.lot,
          { lot: item.lot, indices: [index] },
        ]),
      ).values(),
    ];
    allLeads.forEach((item, index) => {
      const group = lots.find((entry) => entry.lot === item.lot);
      if (group && !group.indices.includes(index)) group.indices.push(index);
    });
    const markers = lots
      .map((item, index) => {
        const point = lotPositions[item.lot] || {
            x: 36 + index * 15,
            y: 32 + index * 11,
          },
          active = item.indices.includes(selectedIndex);
        return `<button type="button" class="lead-lot-marker ${active ? "active" : ""}" data-lead="${item.indices[0]}" style="left:${point.x}%;top:${point.y}%" title="${esc(item.lot)} · ${item.indices.length} interessados"><span>${item.indices.length}</span><small>${esc(item.lot.replace(" · ", " / "))}</small></button>`;
      })
      .join("");
    const links = lots
      .map((item, index) => {
        const point = lotPositions[item.lot] || {
            x: 36 + index * 15,
            y: 32 + index * 11,
          },
          targetY = 19 + index * 24,
          active = item.indices.includes(selectedIndex);
        return `<path class="lead-lot-link ${active ? "active" : ""}" d="M ${point.x} ${point.y} C 76 ${point.y}, 77 ${targetY}, 88 ${targetY}"/>`;
      })
      .join("");
    const rows = allLeads
      .map(
        (item, index) =>
          `<button type="button" class="lead-client-row ${index === selectedIndex ? "selected" : ""}" data-lead="${index}"><span class="avatar">${esc(item.name[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.objective)} · ${esc(item.lot)}</small></span><em>${esc(item.status)}</em></button>`,
      )
      .join("");
    return `<div class="leads-page-shell"><public-leads-surface data-embedded></public-leads-surface><div class="lead-lot-links" aria-label="Interesses apontados aos lotes"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg><div class="lead-lot-markers">${markers}</div></div><section class="lead-ops-summary lead-ops-window"><span class="activity-kind">CRM · CAPTAÇÃO PÚBLICA</span><h2>Intenções no loteamento</h2><p>O conteúdo público e o atendimento interno usam a mesma origem de captação.</p><div class="lead-ops-kpis"><div><b>${allLeads.length}</b><small>Recebidos</small></div><div><b>96</b><small>Lotes apontados</small></div><div><b>37</b><small>Qualificados</small></div></div></section><section class="lead-ops-list lead-ops-window"><div class="lead-window-head"><div><span class="activity-kind">CLIENTES INTERESSADOS</span><h2>Lista de leads</h2></div><span class="lead-window-count">${firebaseLeads.length ? "Firebase ao vivo" : `${demoData.leads.length} demo`}</span></div><label class="lead-search">Buscar cliente, lote ou objetivo<input type="search" placeholder="Ex.: Juliana, Q-12, investimento" data-lead-search></label><div class="lead-client-list">${rows}</div></section><section class="lead-ops-detail lead-ops-window"><div class="lead-window-head"><div><span class="activity-kind">DRILL-IN · LOTE APONTADO</span><h2>${esc(lead.name)}</h2></div><span class="lead-status-chip">${esc(lead.status)}</span></div><div class="lead-lot-focus"><span class="lead-lot-pin">⌖</span><div><b>${esc(lead.lot)}</b><small>${esc(lead.objective)} · ${esc(lead.budget)}</small></div><button type="button" data-lead="${selectedIndex}">${ico("scan-search")} Foco</button></div><dl class="lead-ops-fields"><dt>WhatsApp / contato</dt><dd>${esc(lead.whatsapp || "Contato comercial pendente")}</dd><dt>E-mail</dt><dd>${esc(lead.email || "A confirmar")}</dd><dt>Orientação solar</dt><dd>${esc(lead.sun)}</dd><dt>Topografia</dt><dd>${esc(lead.terrain)} · ${esc(lead.altitude)}</dd><dt>Origem</dt><dd>${esc(lead.source || "Site / Página Pública")}</dd><dt>Próxima ação</dt><dd>Enviar condições e registrar retorno</dd></dl><div class="lead-detail-actions"><button type="button" class="primary" data-lead-message="${selectedIndex}">${ico("message-circle")} Abrir WhatsApp</button><button type="button" class="ghost" data-lead-reserve="${selectedIndex}">${ico("calendar-check")} Abrir reserva</button></div></section><div class="lead-ops-caption">${ico("link-2")} Linhas conectam a concentração de interesse aos lotes do modelo 3D. Selecione um cliente para atualizar o drill-in.</div></div>`;
  };

  const leadsScreenTemplate = ViewLayer.prototype.leads;
  ViewLayer.prototype.leads = function () {
    const state = appStore.get(),
      firebaseLeads = (state.publicLeads || []).map((item) => ({
        name: item.name || "Novo interessado",
        lot: item.lot || "Lote a definir",
        objective: item.objective || "Moradia",
        budget: item.budget || "Faixa a confirmar",
        status: item.status || "Novo",
        sun: item.sun || "A definir",
        altitude: item.altitude || "—",
        terrain: item.terrain || "A definir",
        whatsapp: item.whatsapp || "",
        email: item.email || "",
        source: "Firebase",
      })),
      allLeads = [...firebaseLeads, ...demoData.leads],
      selectedIndex = Math.max(
        0,
        Math.min(allLeads.length - 1, Number(state.selectedLead) || 0),
      ),
      lead = allLeads[selectedIndex];
    const rows = allLeads
      .map(
        (item, index) =>
          `<button type="button" class="lead-client-row ${index === selectedIndex ? "selected" : ""}" data-lead="${index}"><span class="avatar">${esc(item.name[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.objective)} · ${esc(item.lot)}</small></span><em>${esc(item.status)}</em></button>`,
      )
      .join("");
    return `<div class="leads-reference-layout"><main class="leads-reference-page"><section class="leads-reference-hero"><div class="leads-reference-copy"><div class="leads-public-brand"><span class="leads-leaf">❧</span><span>ALIANÇA PARK <small>LOTEAMENTO</small></span></div><span class="public-eyebrow">LANÇAMENTO</span><h1>Escolha seu lote<br>para <em>viver ou investir</em></h1><p>Explore o empreendimento no mapa e converse agora com nosso atendimento para conhecer disponibilidade, valores e condições de reserva.</p><div class="leads-benefits"><span>${ico("land-plot")} Lotes a partir de<br><b>250 m²</b></span><span>${ico("construction")} Infraestrutura<br><b>planejada</b></span><span>${ico("map-pin")} Atendimento<br><b>personalizado</b></span></div></div><div class="leads-reference-form"><public-lead-form></public-lead-form></div></section><section class="leads-map-section"><div class="leads-section-heading"><div><span class="public-eyebrow">MAPA DE LOTES</span><h2>Explore o empreendimento</h2><p>Toque em um lote para consultar sua disponibilidade.</p></div></div><div class="leads-map-frame"><map-scene compact interactive data-base-map class="leads-header-map" data-stage="Leads e reservas" data-overlay="urbanizacao" aria-label="Mapa OpenStreet e modelo 3D do loteamento com highlight comercial"></map-scene><div class="leads-map-captions"><span><i class="available"></i>Disponível</span><span><i class="reserved"></i>Reservado</span><span><i class="sold"></i>Vendido</span></div><aside class="leads-lot-selected"><button type="button" class="leads-lot-close" aria-label="Fechar">×</button><small>LOTE SELECIONADO</small><h3>QD02-L18 <span>Disponível</span></h3><dl><dt>Quadra</dt><dd>QD02</dd><dt>Área total</dt><dd>210,00 m²</dd><dt>Frente</dt><dd>10,00 m</dd></dl><button type="button" class="leads-lot-interest">Quero reservar este lote ${ico("arrow-right")}</button></aside></div><div class="leads-map-legend"><span><i class="dot green"></i>Disponível</span><span><i class="dot violet"></i>Reservado</span><span><i class="dot amber"></i>Em análise</span><span><i class="dot"></i>Vendido</span></div></section></main><aside class="leads-floating-sidebar" aria-label="Atendimento ao visitante"><section class="leads-client-panel"></section><section class="leads-detail-panel"></section></aside></div>`;
  };

  // Toolbar operacional sobre o CRM público. A página comercial continua sendo
  // a referência visual; os controles internos ficam concentrados antes da lista.
  const leadsReferenceTemplate = ViewLayer.prototype.leads;
  ViewLayer.prototype.leads = function () {
    const state = appStore.get(),
      filters = {
        query: "",
        objective: "all",
        status: "all",
        ...(state.leadFilters || {}),
      };
    const markup = leadsReferenceTemplate.call(this);
    const toolbar = `<div class="data-page-toolbar leads-data-toolbar" aria-label="Controles de leads e lotes">
    <div class="toolbar-context"><span class="activity-kind">CRM / LOTES</span><b>Gestão de interesse</b><small>Filtre, exporte ou avance para o atendimento.</small></div>
    <div class="toolbar-controls">
      <label class="toolbar-search">Buscar<input type="search" value="${esc(filters.query)}" placeholder="Cliente, lote ou contato" data-lead-toolbar-filter="query"></label>
      <label>Objetivo<select data-lead-toolbar-filter="objective"><option value="all" ${filters.objective === "all" ? "selected" : ""}>Todos os objetivos</option><option value="Moradia" ${filters.objective === "Moradia" ? "selected" : ""}>Moradia</option><option value="Investimento" ${filters.objective === "Investimento" ? "selected" : ""}>Investimento</option><option value="Veraneio" ${filters.objective === "Veraneio" ? "selected" : ""}>Veraneio</option></select></label>
      <label>Status<select data-lead-toolbar-filter="status"><option value="all" ${filters.status === "all" ? "selected" : ""}>Todos os status</option><option value="Novo" ${filters.status === "Novo" ? "selected" : ""}>Novo</option><option value="Qualificado" ${filters.status === "Qualificado" ? "selected" : ""}>Qualificado</option><option value="Em contato" ${filters.status === "Em contato" ? "selected" : ""}>Em contato</option><option value="Proposta" ${filters.status === "Proposta" ? "selected" : ""}>Proposta</option></select></label>
      <button type="button" class="toolbar-action" data-lead-filter-clear>${ico("filter-x")} Limpar</button>
      <button type="button" class="toolbar-action" data-lead-export>${ico("download")} Exportar</button>
      <button type="button" class="toolbar-primary" data-lead-new>${ico("plus")} Novo lead</button>
    </div>
  </div>`;
    return markup.replace(
      '<section class="leads-crm-section leads-crm-summary">',
      `${toolbar}<section class="leads-crm-section leads-crm-summary">`,
    );
  };
};

/** Adds the website lead/reservation CRM layer over the existing Leads page. */
export const installLeadsOperationalCrmV1 = (
  ViewLayer,
  {
    appStore,
    demoData,
    esc,
    ico,
    apiFetch,
    operationalHeaders,
    notify,
    documentRef = globalThis.document,
    confirmFn = globalThis.confirm?.bind(globalThis),
    DateCtor = globalThis.Date,
    consoleRef = globalThis.console,
  },
) => {
  // A página de Leads mantém a experiência pública no topo e oferece a visão
  // longa de CRM abaixo do mapa, com origem limitada ao site nesta fase.
  const leadsPublicAndMapTemplate = ViewLayer.prototype.leads;
  ViewLayer.prototype.leads = function () {
    const state = appStore.get(),
      reservations = state.publicReservations || [],
      websiteLeads = state.publicLeads || [];
    const cards = [
      ...reservations.map((item) => ({
        id: item.id,
        name: item.client || "Cliente em análise",
        status: item.status || "Documentos em análise",
        lot: item.lot || "A definir",
        phone: item.clientPhone || "Não informado",
        email: "Cadastro documental",
        last: item.notes || "Documentos enviados para conferência",
        files: item.files || [],
        createdAt: item.createdAt,
        source: "Site · Reserva",
      })),
      ...websiteLeads.map((item) => ({
        id: item.id,
        name: item.name || "Novo lead",
        status: item.status || "Novo",
        lot: item.lot || "A definir",
        phone: item.whatsapp || "Não informado",
        email: item.email || "Não informado",
        last: item.conversation || item.notes || "Intenção registrada no site",
        files: [],
        createdAt: item.createdAt,
        source: "Site · Atendimento",
      })),
    ];
    if (!cards.length)
      cards.push(
        ...demoData.leads.slice(0, 4).map((item, index) => ({
          id: `DEMO-${index + 1}`,
          name: item.name,
          status: item.status,
          lot: item.lot,
          phone: "Contato pendente",
          email: "Cadastro inicial",
          last: `Objetivo informado: ${item.objective}`,
          files: [],
          source: "Site · Demonstração",
        })),
      );
    const board = `<section class="leads-crm-board"><header><div><span class="activity-kind">CRM · LEADS VINDOS DO SITE</span><h2>Atendimentos e reservas</h2><p>Negociação, última interação, dados cadastrais e anexos em uma grade operacional.</p></div><div class="crm-channel-state"><span class="active">Site ativo</span><span>WhatsApp preparado</span><span>Instagram preparado</span></div></header><div class="lead-card-grid">${cards.map((card) => `<article class="lead-crm-card"><div class="lead-card-top"><span>${esc(card.source)}</span><em>${esc(card.status)}</em></div><h3>${esc(card.name)}</h3><b>${esc(card.lot)}</b><dl><div><dt>Contato</dt><dd>${esc(card.phone)}</dd></div><div><dt>E-mail / cadastro</dt><dd>${esc(card.email)}</dd></div><div><dt>Último passo</dt><dd>${esc(card.last)}</dd></div></dl><div class="lead-document-list"><small>ANEXOS DE DOCUMENTO</small>${card.files.length ? card.files.map((file) => `<a href="${esc(file.fileUrl || "#")}" target="_blank" rel="noopener">${ico("paperclip")} ${esc(file.kind || file.fileName || "Documento")}</a>`).join("") : "<span>Nenhum documento anexado</span>"}</div><footer><small>${card.createdAt ? new DateCtor(card.createdAt).toLocaleString("pt-BR") : "Aguardando interação"}</small><button type="button" data-lead-card="${esc(card.id)}">Abrir atendimento</button></footer></article>`).join("")}</div></section>`;
    return leadsPublicAndMapTemplate
      .call(this)
      .replace(
        '</main><aside class="leads-floating-sidebar"',
        `${board}</main><aside class="leads-floating-sidebar"`,
      );
  };

  const bindMasterCashAndIntegrations = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    bindMasterCashAndIntegrations.call(this);
    this.querySelectorAll("[data-lead-card]").forEach((button) => {
      const reservation = (appStore.get().publicReservations || []).find(
        (item) => item.id === button.dataset.leadCard,
      );
      if (reservation && reservation.files?.length) {
        button.textContent =
          reservation.status === "Reserva validada"
            ? "Documentos validados"
            : "Validar documentos e reserva";
        button.disabled = reservation.status === "Reserva validada";
        button.addEventListener("click", async () => {
          if (
            !confirmFn(
              `Confirmar que os documentos de ${reservation.client} foram conferidos e validar a reserva do lote ${reservation.lot}?`,
            )
          )
            return;
          button.disabled = true;
          try {
            const response = await apiFetch(
              `/api/commercial-sales/${encodeURIComponent(reservation.id)}`,
              {
                method: "PUT",
                headers: operationalHeaders({
                  "Content-Type": "application/json",
                }),
                body: JSON.stringify({
                  status: "Reserva validada",
                  documentValidation: true,
                  notes: `${reservation.notes || ""}; Documentos conferidos em ${new DateCtor().toLocaleString("pt-BR")}`,
                }),
              },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            notify("Documentos confirmados; reserva validada.", "success");
            await this.loadCommercialReservations();
          } catch (error) {
            button.disabled = false;
            notify("Não foi possível validar a reserva.", "warning");
            consoleRef.warn(error);
          }
        });
      } else
        button.addEventListener("click", () => {
          documentRef
            .querySelector('.lead-conversation-widget input[name="message"]')
            ?.focus();
          notify(`Atendimento ${button.dataset.leadCard} selecionado.`);
        });
    });
  };
};
