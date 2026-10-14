/** Stage planning, activity catalogue, and duration decoration extensions. */
export const installStagePlanningExtensionsV1 = (ViewLayer, {
  demoData,
  buildStageTimeModels,
  formatHours,
  formatPlanningDate,
  appStore,
  ico,
  stageOverlayLabels,
  stageOverlayKey,
  esc,
  notify,
  extensionStage,
  activityCatalog,
  STAGE_WORK_PACKETS,
  WORKDAY_HOURS,
  findStageTimeModel,
}) => {
const stageUtilitiesLayout = ViewLayer.prototype.addStageUtilities;
ViewLayer.prototype.addStageUtilities = function () {
  stageUtilitiesLayout.call(this);
  this.querySelectorAll(".stage-activity-card").forEach((card) =>
    card.remove(),
  );
  const shell = this.querySelector(".stage-shell"),
    toolbar = shell?.querySelector(".stage-toolbar"),
    panel = shell?.querySelector(".stage-utilities"),
    body = shell?.querySelector(".stage-body"),
    overview = shell?.querySelector(".stage-overview");
  if (panel && body) body.before(panel);
  if (!shell || !toolbar || !panel || !body) return;
  let metrics = shell.querySelector(".stage-progress-overview");
  if (!metrics) {
    const stages = demoData.activities,
      timeModels = buildStageTimeModels(stages),
      plannedHours = timeModels.reduce(
        (sum, model) => sum + model.totalHours,
        0,
      ),
      completed = stages.filter((item) => item.progress >= 100).length,
      average = Math.round(
        stages.reduce((sum, item) => sum + item.progress, 0) /
          Math.max(1, stages.length),
      ),
      elapsedHours = Math.round(((plannedHours * average) / 100) * 2) / 2;
    metrics = document.createElement("section");
    metrics.className = "stage-progress-overview";
    metrics.innerHTML = `<div class="stage-progress-copy"><span class="activity-kind">RESUMO DE PROGRESSO E ETAPAS</span><h2>Implantação acompanhada em tempo, custo e frentes</h2><p>Leitura consolidada do calendário operacional antes de abrir uma etapa. A soma considera ${stages.length} frentes e 4 atividades por frente.</p></div><div class="stage-progress-metrics"><div><small>AVANÇO MÉDIO</small><b>${average}%</b><i style="width:${average}%"></i><span>${formatHours(elapsedHours)} executadas</span></div><div><small>TEMPO PLANEJADO</small><b>${formatHours(plannedHours)}</b><span>${timeModels.reduce((sum, model) => sum + model.tasks.length, 0)} atividades somadas</span></div><div><small>ETAPAS CONCLUÍDAS</small><b>${completed}<em>/${stages.length}</em></b><span>${stages.filter((item) => item.progress > 0 && item.progress < 100).length} frentes ativas</span></div><div><small>PRÓXIMO MARCO</small><b>${formatPlanningDate(timeModels[1]?.tasks[2]?.startDay || 16)}</b><span>medição de drenagem</span></div></div>`;
    toolbar.after(metrics);
  }
  metrics.after(panel);
  body.after(overview);
  const timeModels = buildStageTimeModels(demoData.activities);
  shell.querySelectorAll(".stage-overview-card").forEach((card, index) => {
    const model = timeModels[index];
    if (!model || card.querySelector(".stage-time-chip")) return;
    card.insertAdjacentHTML(
      "beforeend",
      `<span class="stage-time-chip">Σ ${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</span>`,
    );
  });
  const card = body.querySelector(".stage-detail-card");
  if (card && !card.querySelector(".stage-expand-accordion")) {
    const selected =
      demoData.activities.find(
        (item) => item.id === appStore.get().selectedStage,
      ) || demoData.activities[0];
    card.insertAdjacentHTML(
      "beforeend",
      `<section class="stage-expand-accordion" open><button type="button" data-stage-accordion aria-expanded="true">${ico("list-tree")} Destrinchamento da etapa <span>escopo, registros e relações</span>${ico("chevron-down")}</button><div class="stage-accordion-content"><span>Escopo: frente, equipe, medição e evidências</span><span>Relações: 2 compras · 8 materiais · 4 atividades</span><span>Dependência: etapa anterior liberada</span></div></section><footer class="stage-card-footer"><span>${ico("link-2")} Diagrama relacional disponível abaixo</span><button type="button" data-open-stage>${ico("arrow-up-right")} Abrir página de ${esc(selected.name)}</button></footer>`,
    );
  }
};

ViewLayer.prototype.splitStageTabs = function () {
  const panel = this.querySelector(".stage-utilities");
  if (!panel) return;
  const stages = demoData.activities,
    timeModels = buildStageTimeModels(stages),
    plannedHours = timeModels.reduce((sum, model) => sum + model.totalHours, 0),
    planningDays = Math.max(21, timeModels.at(-1)?.endDay || 21),
    days = Array.from({ length: planningDays }, (_, index) => index + 1);
  const gantt = timeModels
    .map((model, index) => {
      const item = model.stage,
        left = ((model.startDay - 1) / planningDays) * 100,
        width = ((model.endDay - model.startDay + 1) / planningDays) * 100;
      return `<div class="planning-gantt-row"><div><b>${esc(item.name)}</b><small>${esc(item.owner)} · ${item.progress}% · soma ${formatHours(model.totalHours)}</small></div><span class="planning-gantt-track"><i style="left:${left}%;width:${width}%"><b>${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</b></i></span></div>`;
    })
    .join("");
  const monthDays = Array.from({ length: 35 }, (_, index) =>
    index < 31 ? index + 1 : "",
  );
  const agendaByDay = new Map();
  timeModels.forEach((model, index) =>
    model.tasks.forEach((task, taskIndex) => {
      for (let day = task.startDay; day <= Math.min(31, task.endDay); day++) {
        const rows = agendaByDay.get(day) || [];
        rows.push(
          `<span class="month-task tone-${index % 3}" title="${esc(task.name)} · ${formatHours(task.hours)}">${day === task.startDay ? esc(task.name) : "continua"} · ${esc(model.stage.name)}</span>`,
        );
        agendaByDay.set(day, rows);
      }
    }),
  );
  const agenda = monthDays
    .map(
      (day) =>
        `<div class="month-day ${day === 6 ? "today" : ""}"><b>${day}</b>${day ? (agendaByDay.get(day) || []).join("") + (day === 6 ? '<span class="month-task secondary">Marco de acompanhamento</span>' : "") : ""}</div>`,
    )
    .join("");
  const relationCards = timeModels
    .map(
      (model, index) =>
        `<article class="relation-stage-node" style="--x:${6 + (index % 3) * 31}%;--y:${10 + Math.floor(index / 3) * 44}%"><span>${String(index + 1).padStart(2, "0")} · ${esc(stageOverlayLabels[stageOverlayKey(model.stage.name)])}</span><b>${esc(model.stage.name)}</b><small>${model.stage.progress}% · ${esc(model.stage.owner)}</small><small>${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</small></article>`,
    )
    .join("");
  const todos = timeModels
    .map((model, index) => {
      const task = model.tasks[2] || model.tasks[0];
      return `<label class="planning-todo"><input type="checkbox" ${index === 0 ? "checked" : ""}><span><b>${esc(task.name)}</b><small>${esc(model.stage.name)} · ${esc(model.stage.owner)} · ${formatPlanningDate(task.startDay)} · ${formatHours(task.hours)}</small></span><em>${task.startDay <= 6 ? "Hoje" : "Programado"}</em></label>`;
    })
    .join("");
  panel.innerHTML = `<nav class="utility-tabs stage-planning-tabs" aria-label="Visões do planejamento"><button class="utility-tab active" data-stage-plan="cronograma">${ico("gantt-chart")} Cronograma</button><button class="utility-tab" data-stage-plan="agenda">${ico("calendar-days")} Agenda</button><button class="utility-tab" data-stage-plan="canvas">${ico("workflow")} Canvas relacional</button><button class="utility-tab" data-stage-plan="afazeres">${ico("list-checks")} A fazeres</button></nav><div class="utility-content stage-planning-content"><section class="stage-plan-pane" data-stage-pane="cronograma"><header><div><span class="activity-kind">CALENDÁRIO DE IMPLANTAÇÃO</span><h3>Consumo de tempo por etapa</h3><p>Leitura horizontal da duração planejada e do avanço de cada frente.</p></div><div class="planning-legend"><span><i></i> Em execução</span><span><i></i> Planejado</span></div></header><div class="planning-calendar-head"><span>Etapa / responsável</span><div>${days.map((day) => `<b>D${day}</b>`).join("")}</div></div><div class="planning-gantt">${gantt}</div></section><section class="stage-plan-pane" data-stage-pane="agenda" hidden><header><div><span class="activity-kind">AGENDA OPERACIONAL</span><h3>Junho de 2024</h3><p>Navegue entre meses e acompanhe as atividades distribuídas no calendário.</p></div><div class="month-nav"><button data-calendar-shift="-1">←</button><b>Junho 2024</b><button data-calendar-shift="1">→</button></div></header><div class="month-weekdays"><b>Dom</b><b>Seg</b><b>Ter</b><b>Qua</b><b>Qui</b><b>Sex</b><b>Sáb</b></div><div class="month-grid">${agenda}</div></section><section class="stage-plan-pane" data-stage-pane="canvas" hidden><header><div><span class="activity-kind">DIAGRAMA RELACIONAL</span><h3>Canvas relacional das etapas</h3><p>Dependências rotuladas entre frentes, compras, medições e liberações.</p></div><button class="agenda-action" data-stage-relate>${ico("plus")} Criar relação</button></header><div class="stage-relation-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M28 31 C38 31 37 40 42 46 S58 57 68 60"/><path d="M25 70 C39 70 42 60 58 59 S70 37 75 28"/><text x="43" y="38">libera</text><text x="53" y="67">depende de</text></svg>${relationCards}</div></section><section class="stage-plan-pane" data-stage-pane="afazeres" hidden><header><div><span class="activity-kind">A FAZERES</span><h3>Próximas confirmações operacionais</h3><p>Conclua, atribua responsáveis ou leve o item para a agenda.</p></div><button class="agenda-action" data-plan-todo>${ico("plus")} Adicionar afazer</button></header><div class="planning-todo-list">${todos}</div></section></div>`;
  panel.style.setProperty("--planning-days", planningDays);
  panel
    .querySelectorAll(".planning-calendar-head>div")
    .forEach(
      (element) =>
        (element.style.gridTemplateColumns = `repeat(${planningDays},minmax(24px,1fr))`),
    );
  panel.querySelector('[data-stage-pane="cronograma"] h3').textContent =
    `Consumo de tempo por etapa · ${formatHours(plannedHours)} somadas`;
  panel.querySelector('[data-stage-pane="cronograma"] p').textContent =
    `${timeModels.reduce((sum, model) => sum + model.tasks.length, 0)} atividades distribuídas em ${planningDays} dias úteis previstos; frações calculadas em horas.`;
  const panes = [...panel.querySelectorAll("[data-stage-pane]")];
  panel.querySelectorAll("[data-stage-plan]").forEach((button) =>
    button.addEventListener("click", () => {
      panel
        .querySelectorAll("[data-stage-plan]")
        .forEach((tab) => tab.classList.toggle("active", tab === button));
      panes.forEach(
        (pane) =>
          (pane.hidden = pane.dataset.stagePane !== button.dataset.stagePlan),
      );
      appStore.set({
        lastAction: `Abriu ${button.textContent.trim()} do planejamento`,
      });
    }),
  );
  panel
    .querySelector("[data-stage-relate]")
    ?.addEventListener("click", () =>
      notify("Relação pronta para ser rotulada entre as etapas.", "success"),
    );
  panel
    .querySelector("[data-plan-todo]")
    ?.addEventListener("click", () =>
      notify("Novo afazer adicionado à lista da etapa.", "success"),
    );
};

const activitiesCatalogTemplate = ViewLayer.prototype.activities;
ViewLayer.prototype.activities = function () {
  const stage = extensionStage(),
    items = activityCatalog.slice(0, 11),
    categories = [...new Set(items.map((item) => item.nature))];
  return `<div class="stage-extension-page activities-page"><div class="extension-head"><div><span class="activity-kind">${esc(stage.week)} · ${esc(stage.name)}</span><h1>Atividades da etapa</h1><p>Lista operacional com propriedades, execução e controles administrativos.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico("arrow-left")} Todas as etapas</button><button class="primary" data-activity-new>${ico("plus")} Nova atividade</button></div></div><section class="activities-dynamic-summary"><div><span class="activity-kind">RESUMO CONTROLADO</span><b>${items.length} modelos disponíveis</b><small>${items
    .slice(0, 3)
    .map((item) => item.nature)
    .join(
      " · ",
    )}</small></div><div><b>04</b><small>em execução</small></div><div><b>02</b><small>aguardando compra</small></div><div><b>${stage.progress}%</b><small>avanço da etapa</small></div></section><div class="activity-toolbar"><div class="activity-filter-label">Filtrar por natureza</div><button class="active" data-activity-category-filter="all">Todas <span>${items.length}</span></button>${categories.map((category) => `<button data-activity-category-filter="${esc(category)}">${esc(category)} <span>${items.filter((item) => item.nature === category).length}</span></button>`).join("")}</div><div class="activity-list-layout">${items.map((item, index) => `<article class="activity-list-row" data-activity-card data-activity-category="${esc(item.nature)}"><div class="activity-row-index">${String(index + 1).padStart(2, "0")}</div><div><span class="activity-kind">${esc(item.nature)}</span><h3>${esc(item.name)}</h3><p>${item.initial.length} campos iniciais · ${item.execution.length} campos de execução · ${esc(stage.name)}</p></div><div class="activity-row-status"><b>${index < 3 ? "Em execução" : "Planejada"}</b><small>${index < 3 ? `${Math.max(12, stage.progress - index * 9)}% realizado` : "Aguardando liberação"}</small></div><div class="activity-row-actions"><button data-activity-open="${index}">${ico("panel-right-open")} Abrir</button><button data-activity-edit="${index}">${ico("pencil")} Editar</button><button data-activity-delete="${index}">${ico("trash-2")} Excluir</button></div></article>`).join("")}</div></div>`;
};

const viewLayerBindPlanning = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function () {
  viewLayerBindPlanning.call(this);
  this.querySelector("[data-open-stage]")?.addEventListener("click", () =>
    appStore.set({
      activityDedicated: true,
      lastAction: "Abriu página dedicada da etapa",
    }),
  );
  this.querySelector("[data-stage-accordion]")?.addEventListener("click", () =>
    notify(
      "O destrinchamento permanece visível durante o acompanhamento da etapa.",
      "success",
    ),
  );
  this.querySelectorAll("[data-activity-edit]").forEach((button) =>
    button.addEventListener("click", () =>
      notify(
        "Edição da atividade aberta no painel de propriedades.",
        "success",
      ),
    ),
  );
  this.querySelectorAll("[data-activity-delete]").forEach((button) =>
    button.addEventListener("click", () =>
      notify(
        "Atividade marcada para exclusão; confirme no fluxo de execução.",
        "warning",
      ),
    ),
  );
  this.querySelectorAll(".journal-entry").forEach((entry) => {
    if (entry.querySelector(".journal-responsible-footer")) return;
    const owner =
      entry
        .querySelector(".journal-meta span")
        ?.textContent.replace(/\s+/g, " ")
        .trim() || "Responsável da frente";
    const initials = owner
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    entry.insertAdjacentHTML(
      "beforeend",
      `<aside class="journal-responsible-footer"><span class="avatar">${esc(initials)}</span><span><small>RESPONSÁVEL PELO APONTAMENTO</small><b>${esc(owner)}</b><em>Disponível para confirmação</em></span></aside>`,
    );
  });
};

// A posição horizontal vira o início no calendário; a largura representa a
// duração. A etiqueta é atualizada ao soltar o card, sem um relógio separado.
const stageNodesWithDuration = ViewLayer.prototype.addActivityNodes;
ViewLayer.prototype.addActivityNodes = function () {
  stageNodesWithDuration.call(this);
  const layer = this.querySelector(".stage-canvas .activity-layer");
  if (!layer || layer.dataset.timeLabels) return;
  layer.dataset.timeLabels = "true";
  const models = buildStageTimeModels(demoData.activities);
  const update = (node) => {
    const stageModel = findStageTimeModel(node.dataset.stage, models),
      nodeIndex =
        [...layer.querySelectorAll(".activity-node")].indexOf(node) %
        STAGE_WORK_PACKETS.length,
      task = stageModel?.tasks[nodeIndex] || stageModel?.tasks[0],
      hours =
        task?.hours ||
        Math.max(0.5, Math.round((node.offsetWidth / 26) * 2) / 2),
      start =
        task?.startDay ||
        Math.max(1, Math.round((node.offsetLeft - 24) / 46) + 1),
      end =
        task?.endDay ||
        start + Math.max(0, Math.ceil(hours / WORKDAY_HOURS) - 1);
    node.dataset.timeHours = String(hours);
    node.dataset.timeStart = String(start);
    node.dataset.timeEnd = String(end);
    let label = node.querySelector(".activity-time-label");
    if (!label) {
      label = document.createElement("span");
      label.className = "activity-time-label";
      node.appendChild(label);
    }
    label.innerHTML = `${formatHours(hours)}<br>dia ${start} a dia ${end}`;
  };
  layer.querySelectorAll(".activity-node").forEach((node) => {
    update(node);
    node.addEventListener("pointerup", () => update(node));
    node.addEventListener("pointercancel", () => update(node));
  });
};
};

