/** Complete dashboard home renderer and focused-timeline interaction category. */
export const createDashboardHomePageV1 = ({
  appStore,
  demoData,
  executionModel,
  formatBRL,
  esc,
  ico,
  stageV9DirectiveText,
  stageV9ProfileFor,
  window: windowRef = globalThis.window,
  workbenchActivityRouteV1,
} = {}) => {
  const render = function () {
    const state = appStore.get(),
      cash = state.cashSummary || {},
      stages = demoData.activities || [],
      notifications = state.operationalNotifications || [],
      records = state.records || [],
      widgets = [
        ["stages", "workflow", "Etapas"],
        ["records", "clipboard-pen-line", "Registros"],
        ["leads", "users-round", "Leads"],
        ["brokers", "users-round", "Corretores"],
        ["finance", "wallet-cards", "Financeiro"],
        ["reports", "file-chart-column", "Relatórios"],
        ["settings", "settings", "Ajustes"],
      ];
    const cashBalance = Number(cash.balanceCents || 0) / 100,
      active = stages.filter((item) => Number(item.progress) > 0 && Number(item.progress) < 100).length,
      completed = stages.filter((item) => Number(item.progress) >= 100).length;
    const widget = (title, eyebrow, body, view, icon, meta) =>
      `<article class="dashboard-carbon-widget"><header><div><span>${eyebrow}</span><h2>${title}</h2></div><button type="button" data-view="${view}" aria-label="Abrir ${title}">${ico("arrow-up-right")}</button></header><p>${body}</p><footer><small>${meta}</small><button type="button" data-view="${view}">Abrir contexto</button></footer></article>`;
    const timelineStages = (executionModel.stages || []).map((stage, index) => {
      const live = stages.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage.name).toLocaleLowerCase("pt-BR")) || {};
      const progress = Math.max(0, Math.min(100, Number(live.progress) || 0));
      const status = progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada";
      const period = live.week || `Fase ${String(index + 1).padStart(2, "0")}`;
      return { stage, live, progress, status, period };
    });
    const timeline = timelineStages.map(({ stage, live, progress, status, period }, index) =>
      `<article class="dashboard-stage-timeline-card" tabindex="0" role="button" data-dashboard-stage-card="${esc(stage.key)}" data-stage-state="${progress >= 100 ? "done" : progress > 0 ? "active" : "planned"}"><span class="dashboard-stage-timeline-index">${String(index + 1).padStart(2, "0")}</span><header><small>${esc(period)}</small><em>${esc(status)}</em></header><h3>${esc(stage.name)}</h3><p>${esc(live.owner || "Responsável a definir")}</p><div class="dashboard-stage-timeline-progress"><i><b style="width:${progress}%"></b></i><strong>${progress}%</strong></div><footer><span>${stage.dependsOn?.length ? `Após ${esc(stage.dependsOn[stage.dependsOn.length - 1])}` : "Início do encadeamento"}</span><button type="button" class="dashboard-stage-worker-button" data-dashboard-worker="${esc(stage.key)}">Editar worker ${ico("pencil")}</button></footer></article>`
    ).join("");
    const focusKey = String(state.dashboardStageFocus || ""),
      focus = timelineStages.find((item) => String(item.stage.key) === focusKey),
      focusTab = String(state.dashboardStageFocusTab || "overview");
    const focusContent = focus
      ? {
          overview: `<div class="dashboard-stage-focus-grid"><div><small>DESCRIÇÃO DA EXECUÇÃO</small><p>${esc(focus.stage.description || stageV9DirectiveText(focus.stage, stageV9ProfileFor(focus.stage)))}</p></div><div><small>RESPONSÁVEL DO WORKER</small><b>${esc(focus.live.owner || "Responsável a definir")}</b><span>${esc(focus.period)} · ${focus.progress}% executado</span></div><div><small>PRÓXIMO GATILHO</small><b>${esc(focus.stage.dependsOn?.length ? "Concluir dependências e liberar a frente" : "Confirmar a frente inicial")}</b><span>Validação humana antes da propagação</span></div></div>`,
          agenda: `<div class="dashboard-stage-focus-copy"><small>AGENDA DA ETAPA</small><h3>Compromissos e afazeres do worker</h3><p>Abra a agenda dedicada para editar horários, responsáveis e alertas desta frente.</p><button type="button" class="dashboard-focus-action" data-dashboard-focus-view="agenda">Abrir agenda da etapa ${ico("arrow-up-right")}</button></div>`,
          records: `<div class="dashboard-stage-focus-copy"><small>REGISTROS DA ETAPA</small><h3>Medições e evidências vinculadas</h3><p>Os registros confirmados alimentam o avanço, as evidências e a próxima decisão operacional.</p><button type="button" class="dashboard-focus-action" data-dashboard-focus-view="records">Abrir registros da etapa ${ico("arrow-up-right")}</button></div>`,
          worker: `<div class="dashboard-stage-focus-copy"><small>EDITOR DO WORKER</small><h3>Propriedades da execução</h3><p>Edite atividades, gatilhos, materiais e instruções diretamente na página do worker.</p><button type="button" class="dashboard-focus-action" data-dashboard-worker="${esc(focus.stage.key)}">Editar worker desta etapa ${ico("arrow-up-right")}</button></div>`,
        }[focusTab] || ""
      : "";
    const focusMarkup = focus
      ? `<section class="dashboard-stage-focus" aria-live="polite"><header class="dashboard-stage-focus-bar"><div><span class="activity-kind">ETAPA EM FOCO · ${esc(focus.stage.key.toUpperCase())}</span><h3>${esc(focus.stage.name)}</h3><p>${esc(focus.live.owner || "Responsável a definir")} · ${esc(focus.status)} · ${focus.progress}%</p></div><div class="dashboard-stage-focus-actions"><button type="button" class="dashboard-focus-worker" data-dashboard-worker="${esc(focus.stage.key)}">${ico("pencil")} Editar worker</button><button type="button" class="dashboard-focus-close" data-dashboard-focus-close aria-label="Fechar etapa em foco">×</button></div></header><nav class="dashboard-stage-focus-tabs" aria-label="Conteúdo da etapa em foco">${[["overview", "Resumo"], ["agenda", "Agenda"], ["records", "Registros"], ["worker", "Worker"]].map(([key, label]) => `<button type="button" class="${focusTab === key ? "active" : ""}" data-dashboard-stage-tab="${key}">${label}</button>`).join("")}</nav><div class="dashboard-stage-focus-content">${focusContent}</div></section>`
      : "";
    return `<section class="dashboard-home dashboard-carbon-home"><header class="dashboard-carbon-head"><div><span class="activity-kind">DASHBOARD INICIAL · ALIANÇA PARK</span><h1>Panorama operacional</h1><p>Registros rápidos e leitura de status, com o mapa aberto somente quando necessário.</p></div><div class="dashboard-top-action-row"><button type="button" class="carbon-top-button" data-view="map">${ico("map")} Mapa</button><button type="button" class="carbon-top-button" data-view="reports">${ico("file-chart-column")} Relatórios</button><button type="button" class="carbon-top-button primary" data-view="records" data-records-open-new="true">${ico("plus")} Novo registro</button></div></header><section class="dashboard-carbon-kpis"><article class="dashboard-cash-kpi"><small>CAIXA MESTRE · DONO</small><b>${formatBRL(cashBalance)}</b><span>Base para a distribuição das etapas</span></article><article><small>Frentes ativas</small><b>${active}</b><span>${completed} concluídas</span></article><article><small>Notificações</small><b>${notifications.length}</b><span>Ciência do agente</span></article><article><small>Registros no histórico</small><b>${records.length}</b><span>Somente consulta no Diário</span></article></section><section class="dashboard-operational-map-card" aria-labelledby="dashboard-operational-map-title"><header><div><span class="activity-kind">MAPA OPERACIONAL · MESMA SUPERFÍCIE DE LEADS</span><h2 id="dashboard-operational-map-title">Progresso físico por etapa</h2><p>Use os filtros para destacar no mapa as áreas de execução, equipes, cronograma, leads, materiais, riscos e progresso.</p></div><button type="button" class="dashboard-map-open-button" data-view="map">Abrir mapa completo ${ico("arrow-up-right")}</button></header><div class="dashboard-operational-map-frame"><map-scene compact interactive data-base-map data-dashboard-operational-map="true" class="dashboard-operational-map" data-stage="Execução do Aliança Park" data-overlay="drenagem" aria-label="Mapa operacional 3D com progresso por etapa"></map-scene><map-filter-rail></map-filter-rail></div></section><section class="dashboard-stage-timeline" aria-labelledby="dashboard-stage-timeline-title"><header><div><span class="activity-kind">CRONOGRAMA · ETAPAS DA OBRA</span><h2 id="dashboard-stage-timeline-title">Linha do tempo de execução</h2><p>Cards em cascata horizontal. Clique em uma etapa para manter seu cabeçalho fixo e alternar o conteúdo operacional.</p></div><div class="dashboard-stage-timeline-summary"><b>${timelineStages.length}</b><span>etapas<br>relacionais</span></div></header><div class="dashboard-stage-timeline-track">${timeline || "<p>Nenhuma etapa cadastrada.</p>"}</div>${focusMarkup}<footer class="dashboard-stage-timeline-legend"><span><i class="planned"></i> Planejada</span><span><i class="active"></i> Em andamento</span><span><i class="done"></i> Concluída</span><button type="button" data-view="stages">Abrir cronograma completo ${ico("arrow-up-right")}</button></footer></section><nav class="carbon-widget-bar dashboard-initial-widget-bar" aria-label="Interfaces operacionais">${widgets.map(([view, icon, label]) => `<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join("")}</nav><section class="dashboard-carbon-widget-grid">${widget("Próxima frente", "PRIORIDADE PELO CAIXA", "A etapa elegível é recalculada pelas dependências, cobertura financeira e materiais registrados.", "stages", "workflow", `${active} frentes em acompanhamento`)}${widget("Registros rápidos", "APONTAMENTOS DE CAMPO", "Abra a interface para registrar produção, unidade de medida, evidências e responsável.", "records", "clipboard-pen-line", `${records.length} registro(s) preservado(s)`)}${widget("Atendimento de leads", "COMERCIAL", "Consulte reservas, conversas, documentos e o vínculo de cada cliente ao lote.", "leads", "users-round", `${(state.publicLeads || []).length} leads recebidos`)}${widget("Comissões", "CARTEIRAS", "Navegue por cards de corretores e aplique a regra na página dedicada.", "brokers", "users-round", "Mensal · anual · acumulado")}</section></section>`;
  };

  const bind = (layer) => {
    const timeline = layer.querySelector(".dashboard-stage-timeline");
    if (!timeline || timeline.dataset.dashboardStageFocusBound === "true") return;
    timeline.dataset.dashboardStageFocusBound = "true";
    const openWorker = (key) => windowRef.location.assign(workbenchActivityRouteV1("", key));
    timeline.querySelectorAll("[data-dashboard-stage-card]").forEach((card) => {
      const select = () => {
        const key = card.dataset.dashboardStageCard,
          model = (executionModel.stages || []).find((item) => item.key === key),
          record = demoData.activities.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(model?.name || "").toLocaleLowerCase("pt-BR"));
        appStore.set({
          view: "stages",
          selectedStageV9: key,
          selectedStage: record?.id || key,
          stageSelected: true,
          activityDedicated: true,
          stageActivityDedicatedV9: false,
          dashboardStageFocus: "",
          dashboardStageFocusTab: "overview",
          lastAction: `Abriu a etapa ${card.querySelector("h3")?.textContent || key} pelo cronograma`,
        });
      };
      card.addEventListener("click", (event) => {
        if (event.target.closest("[data-dashboard-worker]")) return;
        select();
      });
      card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
          event.preventDefault();
          select();
        }
      });
    });
    timeline.querySelectorAll("[data-dashboard-worker]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openWorker(button.dataset.dashboardWorker);
      }),
    );
    timeline.querySelectorAll("[data-dashboard-stage-tab]").forEach((tab) =>
      tab.addEventListener("click", () => appStore.set({
        dashboardStageFocusTab: tab.dataset.dashboardStageTab,
        lastAction: `Alternou a aba ${tab.textContent.trim()} da etapa`,
      })),
    );
    timeline.querySelector("[data-dashboard-focus-close]")?.addEventListener("click", () =>
      appStore.set({ dashboardStageFocus: "", dashboardStageFocusTab: "overview", lastAction: "Fechou a etapa em foco" }),
    );
    timeline.querySelectorAll("[data-dashboard-focus-view]").forEach((button) =>
      button.addEventListener("click", () => {
        const state = appStore.get(),
          stage = timeline.querySelector("[data-dashboard-stage-card]")?.dataset.dashboardStageCard || state.dashboardStageFocus;
        if (button.dataset.dashboardFocusView === "agenda") appStore.set({ view: "agenda", selectedStageV9: stage });
        if (button.dataset.dashboardFocusView === "records") appStore.set({ view: "records", selectedStageV9: stage });
      }),
    );
    windowRef.lucide?.createIcons();
  };

  return Object.freeze({ render, bind });
};

/** Keep dashboard interaction in the existing ViewLayer bind chain. */
export const installDashboardHomeEventsV1 = (ViewLayer, bindDashboard) => {
  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind?.apply(this, args);
    bindDashboard(this);
    return result;
  };
};
