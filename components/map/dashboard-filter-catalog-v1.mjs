/** Map dashboard filter catalog and the summaries rendered by MapFilterRail. */
export const createDashboardFilterCatalogV1 = ({
  demoData,
  dashboardModeKeyV1,
  esc,
  ico,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  globalRef = globalThis,
} = {}) => {
  if (typeof dashboardModeKeyV1 !== "function" || typeof esc !== "function" || typeof ico !== "function")
    throw new TypeError("Dashboard filter catalog requires mode, escape and icon services.");
  if (!demoData?.metrics || !Array.isArray(demoData.activities))
    throw new TypeError("Dashboard filter catalog requires application metrics and activities.");

  const dashboardFilters = [
    ["execution", "Execução Atual", "activity", "drenagem"],
    ["collaborators", "Colaboradores", "users", "terraplanagem"],
    ["schedule", "Cronograma", "calendar-clock", "pavimentacao"],
    ["leads", "Leads", "users-round", "urbanizacao"],
    ["materials", "Materiais", "boxes", "rede-agua"],
    ["risks", "Riscos", "triangle-alert", "rede-eletrica"],
    ["progress", "Progresso", "chart-no-axes-combined", "progress"],
  ];
  const highlightStatus = {
    execution: { eyebrow: "EXECUÇÃO ATUAL", title: "Drenagem pluvial", progress: 42, status: "Em andamento", priority: "Alta", detail: "Frente ativa com medição e liberação parcial de trechos.", next: "Validar medição e liberar o próximo trecho.", view: "stages" },
    collaborators: { eyebrow: "EQUIPE EM CAMPO", title: "Terraplanagem", progress: 68, status: "Equipe alocada", priority: "Operacional", detail: "Frente com operador, encarregado e máquina em atividade.", next: "Confirmar produção por hora de máquina.", view: "stages" },
    schedule: { eyebrow: "CRONOGRAMA", title: "Pavimentação", progress: 0, status: "Bloqueada", priority: "Dependência", detail: "Só inicia após as redes e liberações de infraestrutura.", next: "Acompanhar a liberação da rede de água.", view: "stages" },
    leads: { eyebrow: "INTERESSE COMERCIAL", title: "Quadras e áreas verdes", progress: 63, status: "Em visualização", priority: "Comercial", detail: "Destaque territorial para leitura de lotes e demanda.", next: "Responder leads com lote e condição disponíveis.", view: "leads" },
    materials: { eyebrow: "MATERIAIS", title: "Rede de água", progress: 12, status: "Aguardando insumos", priority: "Antes da pavimentação", detail: "Tubos PEAD, cavaletes e ramais vinculados aos 298 lotes.", next: "Conferir entrega e apontar consumo por frente.", view: "stages" },
    risks: { eyebrow: "RISCO E DEPENDÊNCIA", title: "Rede elétrica", progress: 8, status: "Aguardando Coelba", priority: "Última frente", detail: "Ligação depende do prazo externo e dos requisitos de material.", next: "Confirmar prazo da Coelba e lista de materiais.", view: "stages" },
    progress: { eyebrow: "PROGRESSO FÍSICO", title: "Avanço das etapas", progress: 63, status: "Leitura consolidada", priority: "Visão geral", detail: "Selecione uma área do loteamento para visualizar e registrar o avanço físico.", next: "Abrir o mapa completo e selecionar uma área de progresso.", view: "map" },
    "commercial-leads": { eyebrow: "LEADS NO MAPA", title: "Demanda por lote", progress: 63, status: "Captação ativa", priority: "Comercial", detail: "Lotes com interesse recebido na página pública e nos canais de atendimento.", next: "Abrir Leads para distribuir o próximo contato.", view: "leads" },
    "commercial-contracts": { eyebrow: "CONTRATOS E LOTES", title: "Negociações vinculadas", progress: 78, status: "Em acompanhamento", priority: "Documentos", detail: "Contratos, propostas e lotes vinculados formam a carteira comercial rastreável.", next: "Abrir propostas e contratos para revisar documentos.", view: "proposals" },
    "commercial-lots": { eyebrow: "DISPONIBILIDADE", title: "Lotes do empreendimento", progress: 54, status: "Leitura territorial", priority: "Mapa comercial", detail: "A distribuição territorial conecta interesse, disponibilidade e valor por lote.", next: "Abrir o resumo de lotes sobre o mapa.", view: "leads" },
    "commercial-reservations": { eyebrow: "RESERVAS", title: "Lotes reservados", progress: 42, status: "Reserva ativa", priority: "Atenção comercial", detail: "O amarelo identifica reservas abertas que aguardam evolução documental.", next: "Abrir a carteira comercial e conferir os próximos contatos.", view: "proposals" },
    "commercial-installments": { eyebrow: "PRESTAÇÕES E SINAIS", title: "Carteira parcelada", progress: 68, status: "Fluxo financeiro", priority: "Recebimentos", detail: "Lotes com entrada, sinal ou parcelas exigem acompanhamento do vínculo comercial.", next: "Abrir a carteira para revisar o plano de pagamento.", view: "proposals" },
    "commercial-paid": { eyebrow: "QUITADOS", title: "Lotes concluídos", progress: 100, status: "Quitado", priority: "Carteira consolidada", detail: "Verde identifica negócios quitados e prontos para consulta histórica.", next: "Abrir contratos para consultar a documentação final.", view: "proposals" },
    "social-instagram": { eyebrow: "COMUNICAÇÃO · INSTAGRAM", title: "Leads do Instagram", progress: 61, status: "Conversas abertas", priority: "Entrada social", detail: "O destaque roxo acompanha os lotes associados a conversas recebidas pelo Instagram.", next: "Abrir Mensagens e continuar o atendimento do lead.", view: "map" },
    "social-personal": { eyebrow: "COMUNICAÇÃO · PESSOAL", title: "Conversas internas", progress: 74, status: "Equipe conectada", priority: "Canal interno", detail: "O destaque ciano acompanha o contexto de conversas com a equipe do empreendimento.", next: "Abrir a central de Mensagens para responder.", view: "map" },
    "social-clients": { eyebrow: "CONTATOS · CLIENTES", title: "Clientes e lotes", progress: 72, status: "Vínculo comercial", priority: "Relacionamento", detail: "Clientes são lidos junto ao status comercial do lote: reserva, parcelas, sinal ou quitado.", next: "Abrir Leads e contratos para revisar o vínculo.", view: "leads" },
    "social-brokers": { eyebrow: "CONTATOS · CORRETORES", title: "Carteiras de corretores", progress: 68, status: "Atendimento", priority: "Venda e reserva", detail: "Corretores recebem a cor do status comercial dos lotes que acompanham.", next: "Abrir Comissões para consultar carteira e contratos.", view: "brokers" },
    "social-staff-operating": { eyebrow: "EQUIPE · OPERANDO", title: "Encarregados em operação", progress: 82, status: "Operando", priority: "Campo", detail: "Verde forte identifica responsáveis operando em frentes e lotes ativos.", next: "Abrir Encarregados para consultar presença e alocação.", view: "personnel" },
    "social-staff-services": { eyebrow: "EQUIPE · SERVIÇOS", title: "Serviços em campo", progress: 56, status: "Serviços", priority: "Execução", detail: "Azul identifica equipes vinculadas a serviços, medições e entregas em campo.", next: "Abrir Encarregados para acompanhar os serviços.", view: "personnel" },
    "social-staff-planned": { eyebrow: "EQUIPE · PLANEJADOS", title: "Serviços planejados", progress: 28, status: "Planejados", priority: "Próximos passos", detail: "Âmbar identifica equipes e contatos previstos para as próximas frentes.", next: "Abrir o cronograma para conferir a programação.", view: "stages" },
  };
  const dashboardModeFiltersV1 = {
    tracking: dashboardFilters,
    commercial: [
      ["commercial-leads", "Leads", "users-round", "commercial"],
      ["commercial-contracts", "Contratos", "file-signature", "commercial"],
      ["commercial-lots", "Lotes", "map-pinned", "commercial"],
      ["commercial-reservations", "Reservas", "calendar-check", "commercial"],
      ["commercial-installments", "Prestações / sinais", "wallet-cards", "commercial"],
      ["commercial-paid", "Quitados", "badge-check", "commercial"],
    ],
    social: [
      ["social-instagram", "Instagram", "instagram", "social"],
      ["social-personal", "Pessoal", "messages-square", "social"],
      ["social-clients", "Clientes", "user-round", "social"],
      ["social-brokers", "Corretores", "badge-dollar-sign", "social"],
      ["social-staff-operating", "Operando", "hard-hat", "social"],
      ["social-staff-services", "Serviços", "briefcase-business", "social"],
      ["social-staff-planned", "Planejados", "calendar-clock", "social"],
    ],
  };
  const dashboardFiltersForModeV1 = (mode) =>
    dashboardModeFiltersV1[dashboardModeKeyV1(mode)] || dashboardModeFiltersV1.tracking;
  const dashboardFilterForModeV1 = (key, mode = dashboardModeKeyV1()) =>
    dashboardFiltersForModeV1(mode).find((item) => item[0] === key) || null;
  const mapFilterSelectionKeyV1 = (state) => {
    const allowed = new Set(dashboardFiltersForModeV1(state?.dashboardMode).map((item) => item[0]));
    const candidates = [
      state?.mapFilterWidget,
      state?.mapFilter,
      ...(Array.isArray(state?.mapFilters) ? state.mapFilters.slice().reverse() : []),
    ];
    return candidates.find((key) => allowed.has(key)) || null;
  };
  const mapFilterSummaryMetricsV1 = (key, state) => {
    const records = Array.isArray(state.records) ? state.records : [];
    const notifications = Array.isArray(state.operationalNotifications) ? state.operationalNotifications : [];
    const leads = Array.isArray(state.publicLeads) ? state.publicLeads : [];
    const metrics = {
      execution: [["Avanço", "42%", "Drenagem pluvial"], ["Status", "Em andamento", "Medição parcial"], ["Registros", String(records.length || 1), "No diário"]],
      collaborators: [["Pessoas", String(demoData.metrics.collaborators || 0), "cadastro operacional"], ["Em campo", "4", "responsáveis ativos"], ["Alertas", "2", "a confirmar"]],
      schedule: [["Atividades", "28", "unidades de produção"], ["Hoje", "3", "compromissos"], ["Atrasos", "2", "dependências"]],
      leads: [["Leads", String(leads.length || demoData.metrics.leads || 0), "recebidos"], ["Lotes", "96", "com interesse"], ["Conversão", "8,4%", "lead → proposta"]],
      materials: [["Pedidos", "12", "em aberto"], ["Críticos", "3", "prioridade de compra"], ["No prazo", "78%", "últimos 90 dias"]],
      risks: [["Riscos", "7", "abertos"], ["Críticos", "2", "alto impacto"], ["Notificações", String(notifications.length || 3), "no canal"]],
      progress: [["Avanço", "63%", "consolidado"], ["Etapas", String(demoData.activities?.length || 0), "frentes relacionais"], ["Modo", "Área", "seleção no mapa"]],
      "commercial-leads": [["Leads", String(leads.length || demoData.metrics.leads || 0), "recebidos"], ["Lotes", "96", "com interesse"], ["Qualificados", "37", "prioridade de atendimento"]],
      "commercial-contracts": [["Contratos", "7", "carteira vinculada"], ["Propostas", "12", "em negociação"], ["Documentos", "18", "anexos rastreáveis"]],
      "commercial-lots": [["Lotes", "298", "na base"], ["Disponíveis", "202", "sem vínculo"], ["Valor médio", "R$ 468k", "faixa observada"]],
      "commercial-reservations": [["Reservas", "12", "em aberto"], ["Sinais", "8", "aguardando confirmação"], ["Conversão", "42%", "reserva → contrato"]],
      "commercial-installments": [["Parcelados", "31", "planos ativos"], ["Sinais", "8", "no ciclo atual"], ["Receber", "R$ 1,24M", "próximos 90 dias"]],
      "commercial-paid": [["Quitados", "24", "contratos encerrados"], ["Documentos", "24", "completos"], ["Carteira", "R$ 8,4M", "valor consolidado"]],
      "social-instagram": [["Conversas", "24", "últimos 7 dias"], ["Lotes", "18", "com interesse"], ["Resposta", "92%", "dentro do SLA"]],
      "social-personal": [["Conversas internas", "18", "em andamento"], ["Equipe", "12", "contatos ativos"], ["Pendências", "3", "aguardando retorno"]],
      "social-clients": [["Clientes", "61", "em atendimento"], ["Lotes", "37", "com vínculo"], ["Status", "4", "categorias comerciais"]],
      "social-brokers": [["Corretores", "8", "carteiras ativas"], ["Reservas", "12", "acompanhadas"], ["Contratos", "7", "vinculados"]],
      "social-staff-operating": [["Operando", "14", "agora"], ["Frentes", "6", "em campo"], ["Presença", "94%", "na janela atual"]],
      "social-staff-services": [["Serviços", "9", "em execução"], ["Registros", "28", "no diário"], ["Medições", "6", "pendentes"]],
      "social-staff-planned": [["Planejados", "11", "próximos"], ["Janelas", "4", "esta semana"], ["Dependências", "2", "a liberar"]],
    };
    return metrics[key] || metrics.execution;
  };
  const mapProgressSummaryMarkupV1 = (state) => {
    const areas = Array.isArray(state.mapProgressSelection) ? state.mapProgressSelection : [];
    const selectedStage = String(state.selectedStage ?? "");
    const stages = Array.isArray(demoData.activities) ? demoData.activities : [];
    const areaMarkup = areas.length
      ? `<div class="map-filter-progress-areas">${areas.slice(0, 5).map((area) => `<span>${esc(area.label || area.partId)}</span>`).join("")}${areas.length > 5 ? `<span>+${areas.length - 5} áreas</span>` : ""}</div>`
      : '<p class="map-filter-progress-empty">Nenhuma área poligonal selecionada. Clique em “Selecionar áreas” e marque um ou mais polígonos no mapa.</p>';
    const stageMarkup = stages.map((stage, index) => {
      const progress = Math.max(0, Math.min(100, Number(stage.progress) || 0));
      const active = String(stage.id) === selectedStage;
      const stateLabel = progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada";
      return `<div class="map-filter-progress-stage ${active ? "selected" : ""}"><div><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(stage.name)}</b><em>${stateLabel}</em></div><i><strong style="width:${progress}%"></strong></i><small>${progress}%</small></div>`;
    }).join("");
    return `<section class="map-filter-progress-context" data-map-progress-context><header><span>ÁREAS POLIGONAIS SELECIONADAS</span><b>${areas.length}</b></header>${areaMarkup}<div class="map-filter-progress-list" aria-label="Progresso das etapas">${stageMarkup}</div><div class="map-filter-progress-actions"><button type="button" class="ghost" data-map-progress-start>${ico("scan-search")} ${areas.length ? "Adicionar áreas" : "Selecionar áreas"}</button>${areas.length ? `<button type="button" class="primary" data-map-progress-entry>${ico("clipboard-pen-line")} Registrar avanço</button><button type="button" class="map-filter-progress-clear" data-map-progress-clear>Limpar</button>` : ""}</div></section>`;
  };
  const mapFilterSummaryMarkupV1 = (key, state) => {
    const filter = dashboardFilterForModeV1(key, state.dashboardMode) || dashboardFilters[0];
    const status = highlightStatus[key] || highlightStatus.execution;
    if (!filter) return "";
    const metrics = mapFilterSummaryMetricsV1(key, state);
    return `<aside class="map-filter-summary-widget" id="map-filter-summary-${esc(key)}" data-map-summary-widget data-map-summary-key="${esc(key)}" aria-live="polite"><header><div><span>RESUMO DA CAMADA</span><h3>${ico(filter[2])} ${esc(filter[1])}</h3></div><button type="button" data-map-widget-close aria-label="Fechar resumo de ${esc(filter[1])}">×</button></header><div class="map-filter-summary-metrics">${metrics.map(([label, value, detail]) => `<div><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(detail)}</span></div>`).join("")}</div><p>${esc(status.detail)}</p>${key === "progress" ? mapProgressSummaryMarkupV1(state) : ""}<footer><small>${esc(status.next)}</small><button type="button" data-map-widget-context="${esc(status.view)}">Abrir contexto ${ico("arrow-up-right")}</button></footer></aside>`;
  };
  const installProgressSummaryFallbackV1 = (appStore) => {
    const refresh = () => {
      const state = appStore.get();
      if (state.mapFilterWidget !== "progress") return;
      documentRef
        .querySelectorAll('[data-map-summary-key="progress"]')
        .forEach((widget) => {
          widget.querySelector("[data-map-progress-context]")?.remove();
          const footer = widget.querySelector("footer");
          if (footer) footer.insertAdjacentHTML("beforebegin", mapProgressSummaryMarkupV1(state));
          else widget.insertAdjacentHTML("beforeend", mapProgressSummaryMarkupV1(state));
          windowRef.lucide?.createIcons?.();
        });
    };
    if (!globalRef.__belavistaProgressSummaryFallbackV1) {
      globalRef.__belavistaProgressSummaryFallbackV1 = true;
      appStore.subscribe(refresh);
      documentRef.addEventListener("click", (event) => {
        const button = event.target.closest?.("[data-map-progress-start],[data-map-progress-clear],[data-map-progress-entry]");
        if (!button || button.dataset.mapProgressActionBound === "true") return;
        event.preventDefault();
        event.stopPropagation();
        const map = documentRef.querySelector("map-scene[data-dashboard-operational-map]") || documentRef.querySelector("map-scene:not([compact])");
        if (button.hasAttribute("data-map-progress-start")) {
          map?.setMapSelectionMode("progress");
          appStore.set({ mapFilterWidget: "progress", lastAction: "Ativou seleção de áreas para leitura de progresso" });
        } else if (button.hasAttribute("data-map-progress-clear")) {
          map?.clearProgressAreaSelectionV1?.(true);
        } else {
          const parts = map?.progressSelectionParts?.length ? map.progressSelectionParts : map?.progressAreaPartsFromStoreV1?.();
          if (parts?.length) map.renderProgressSelectionPanel(parts);
          else map?.setMapSelectionMode("progress");
        }
      }, true);
    }
    refresh();
  };

  return Object.freeze({
    dashboardFilters,
    highlightStatus,
    dashboardModeFiltersV1,
    dashboardFiltersForModeV1,
    dashboardFilterForModeV1,
    mapFilterSelectionKeyV1,
    mapFilterSummaryMetricsV1,
    mapProgressSummaryMarkupV1,
    mapFilterSummaryMarkupV1,
    installProgressSummaryFallbackV1,
  });
};
