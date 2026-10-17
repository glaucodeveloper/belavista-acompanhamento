/** Dashboard agenda preview, agenda detail, notifications, and lifecycle wiring. */
export const installAgendaDashboardDetailV1 = (ViewLayer, services = {}) => {
const { appStore, apiFetch, operationalHeaders, ensureAgendaCalendarLoadedV8, agendaCalendarReadV3, agendaCalendarOperationalEventsV3, agendaCalendarIsoV3, agendaCalendarWriteV3, agendaCalendarParseDateV3, agendaCalendarStatusToneV3, agendaCalendarAddDaysV3, executionModel, stageV9LiveFor, esc, ico, notify, stageRecordStagesV1, stageRecordDashboardActionWorkspaceMarkupV1, stageMaterialReportDialogV1, stageRecordMaterialRowsV1, capacitor, NotificationCtor, FormDataCtor, queueMicrotaskFn } = services;
  if (!ViewLayer?.prototype || typeof appStore?.get !== "function" || typeof appStore?.set !== "function") throw new TypeError("Agenda dashboard integration requires ViewLayer and appStore get/set.");
  for (const [name, dependency] of Object.entries({ agendaCalendarReadV3, agendaCalendarOperationalEventsV3, agendaCalendarIsoV3, agendaCalendarWriteV3, agendaCalendarParseDateV3, agendaCalendarStatusToneV3, agendaCalendarAddDaysV3, stageV9LiveFor, esc, ico, notify, stageRecordStagesV1, stageRecordDashboardActionWorkspaceMarkupV1, stageMaterialReportDialogV1, stageRecordMaterialRowsV1, queueMicrotaskFn })) if (typeof dependency !== "function") throw new TypeError(`Agenda dashboard integration requires ${name}().`);
  if (!executionModel || typeof executionModel !== "object" || typeof FormDataCtor !== "function") throw new TypeError("Agenda dashboard integration requires executionModel and FormData.");
const agendaWorkspaceEventsV1 = (state) => {
  const stored = agendaCalendarReadV3();
  if (stored.initialized) return stored;
  return { ...stored, initialized: false, events: [] };
};

const dashboardAgendaPreviewV1 = (state) => {
  if (typeof ensureAgendaCalendarLoadedV8 === "function") ensureAgendaCalendarLoadedV8();
  if (!state.agendaCalendarLoadedV3 || state.agendaCalendarErrorV3) {
    return `<section class="dashboard-agenda" data-dashboard-agenda><header><div><span class="activity-kind">AGENDA DE EXECUÇÃO · PRÓXIMAS TAREFAS</span><h2>Agenda operacional</h2><p>${esc(state.agendaCalendarErrorV3 || "Carregando compromissos persistidos do banco operacional…")}</p></div></header></section>`;
  }
  const data = agendaWorkspaceEventsV1(state),
    events = [...(data.events || [])].sort((a, b) =>
      `${a.date || ""}T${a.start || "00:00"}`.localeCompare(`${b.date || ""}T${b.start || "00:00"}`),
    ),
    today = new Date(),
    todayKey = agendaCalendarIsoV3(today),
    selectedDate =
      agendaCalendarParseDateV3(state.dashboardAgendaSelectedDateV1) || today,
    selectedKey = agendaCalendarIsoV3(selectedDate),
    weekStart = new Date(selectedDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  const dayCells = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const key = agendaCalendarIsoV3(date),
        items = events.filter((event) => event.date === key),
        weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      return `<button type="button" class="dashboard-agenda-day ${key === todayKey ? "is-today" : ""} ${key === selectedKey ? "is-selected" : ""}" data-dashboard-agenda-select-day="${key}" aria-pressed="${key === selectedKey}" aria-label="Ver agenda de ${date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}"><b>${esc(weekday)}</b><strong>${date.getDate()}</strong><span>${items.length ? `${items.length} tarefa${items.length === 1 ? "" : "s"}` : "Sem tarefas"}</span></button>`;
    }).join(""),
    selectedDayEvents = events.filter((event) => event.date === selectedKey),
    selectedDayLabel = selectedDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return `<section class="dashboard-agenda" data-dashboard-agenda><header><div><span class="activity-kind">AGENDA DE EXECUÇÃO · PRÓXIMAS TAREFAS</span><h2>Agenda operacional</h2><p>Inclui atividades, requisitos e preparação de compras vinculados às etapas.</p></div><div class="dashboard-agenda-actions">${state.agendaMobileNotificationsEnabled ? '<span class="dashboard-agenda-notifications-active">Notificações ativas</span>' : `<button type="button" class="toolbar-action" data-agenda-notifications-enable>${ico("bell")} Ativar notificações</button>`}</div></header><div class="dashboard-agenda-week-navigation" role="group" aria-label="Navegação semanal da agenda"><button type="button" data-dashboard-agenda-week-shift="-7" aria-label="Semana anterior">${ico("chevron-left")}</button><strong>${weekLabel}</strong><button type="button" data-dashboard-agenda-today>Hoje</button><button type="button" data-dashboard-agenda-week-shift="7" aria-label="Próxima semana">${ico("chevron-right")}</button></div><div class="dashboard-agenda-week" aria-label="Calendário semanal">${dayCells}</div><div class="dashboard-agenda-selected-heading" data-dashboard-agenda-selected-date="${selectedKey}"><div><span class="activity-kind">VISUALIZAÇÃO DO DIA</span><h3>${selectedDayLabel}</h3></div><span class="dashboard-agenda-day-count">${selectedDayEvents.length} tarefa${selectedDayEvents.length === 1 ? "" : "s"}</span></div><div class="dashboard-agenda-upcoming">${selectedDayEvents.map((event) => {
    const requirements = Array.isArray(event.requirements) ? event.requirements : [];
    return `<button type="button" class="dashboard-agenda-task" data-dashboard-agenda-open="${esc(event.id)}" data-dashboard-agenda-event-date="${esc(event.date || "")}"><span class="dashboard-agenda-task-date"><b>${esc(event.start || "Horário a definir")}</b><small>${esc(event.end || "")}</small></span><span class="dashboard-agenda-task-main"><b>${esc(event.title || event.activityName || "Atividade")}</b><small>${esc(event.stageName || "Etapa não indicada")} · ${esc(event.owner || "Responsável a definir")}</small><em>${esc(requirements[0] || event.materials?.[0] || "Sem requisito adicional")}</em></span><span class="agenda-custom-status ${agendaCalendarStatusToneV3(event.status)}">${esc(event.customStatus || event.status || "Planejado")}</span>${ico("chevron-right")}</button>`;
  }).join("") || '<p class="dashboard-agenda-empty-day">Nenhuma tarefa programada para este dia.</p>'}</div><footer><span>${events.length} tarefa(s) · ${Number(state.agendaMobileNotifications?.length || 0)} notificações registradas</span><span>${state.agendaMobileNotificationsEnabled ? "Notificações mobile ativas" : "Notificações mobile desativadas"}</span></footer></section>`;
};



const agendaEventIdV1 = (value) => String(value || "");
const agendaMobileNotificationIdV1 = (value) => {
  let hash = 2166136261;
  for (const char of String(value || "agenda")) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2147483646 + 1;
};
const agendaNotificationPluginV1 = async () => {
  if (!capacitor?.isNativePlatform?.()) return null;
  const module = await import("@capacitor/local-notifications");
  return module.LocalNotifications;
};
const agendaScheduleDeviceNotificationV1 = async (event) => {
  try {
    const plugin = await agendaNotificationPluginV1();
    if (!plugin) return { scheduled: false, reason: "mobile-only" };
    let permission = await plugin.checkPermissions();
    if (permission.display !== "granted") permission = await plugin.requestPermissions();
    if (permission.display !== "granted") return { scheduled: false, reason: "permission-denied" };
    const [year, month, day] = String(event.date || "").split("-").map(Number),
      [hour, minute] = String(event.start || "08:00").split(":").map(Number),
      at = new Date(year, month - 1, day, hour, minute);
    at.setMinutes(at.getMinutes() - Math.max(0, Number(event.notificationOffsetMinutes ?? 30)));
    if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) return { scheduled: false, reason: "past-event" };
    await plugin.schedule({ notifications: [{
      id: agendaMobileNotificationIdV1(event.id),
      title: event.title || event.activityName || "Tarefa da agenda",
      body: `${event.stageName || "Etapa"} · ${event.owner || "Responsável a definir"}${event.requirements?.[0] ? ` · ${event.requirements[0]}` : ""}`.slice(0, 240),
      schedule: { at, allowWhileIdle: true },
      extra: { agendaEventId: String(event.id || "") },
    }] });
    return { scheduled: true };
  } catch (error) {
    console.warn("Não foi possível programar a notificação de agenda no aparelho.", error);
    return { scheduled: false, reason: String(error?.message || error) };
  }
};
const agendaCancelDeviceNotificationV1 = async (event) => {
  try {
    const plugin = await agendaNotificationPluginV1();
    if (plugin) await plugin.cancel({ notifications: [{ id: agendaMobileNotificationIdV1(event.id) }] });
  } catch (error) { console.info("Aviso agendado não pôde ser removido.", error); }
};
const agendaPersistWorkspaceV1 = (events, action, changedEvent = null) => {
  const state = appStore.get(),
    normalized = Array.isArray(events) ? events : [],
    operationalAgenda = normalized.map((event) => ({
      ...event,
      id: agendaEventIdV1(event.id).replace(/^agenda-op-/, ""),
      title: event.title || event.activityName || "Atividade",
      name: event.title || event.activityName || "Atividade",
      plannedStart: `${event.date || ""}T${event.start || "08:00"}:00`,
      date: event.date,
      start: event.start,
      durationHours: event.durationHours,
      spanDays: event.spanDays,
      status: event.customStatus || event.status || "Planejado",
      requirements: event.requirements || [],
      materials: event.materials || [],
      updatedAt: new Date().toISOString(),
    })),
    logEntry = changedEvent ? {
      id: agendaEventIdV1(changedEvent.id),
      title: changedEvent.title || changedEvent.activityName || "Tarefa da agenda",
      action,
      at: new Date().toISOString(),
    } : null;
  agendaCalendarWriteV3({ version: 3, initialized: true, events: normalized });
  appStore.set({
    operationalAgenda,
    agendaMobileNotifications: logEntry ? [...(state.agendaMobileNotifications || []), logEntry] : state.agendaMobileNotifications || [],
    lastAction: action,
  });
  if (changedEvent && state.agendaMobileNotificationsEnabled) {
    if (/conclu|anulad/i.test(String(changedEvent.status || changedEvent.customStatus || ""))) agendaCancelDeviceNotificationV1(changedEvent);
    else agendaScheduleDeviceNotificationV1(changedEvent);
  }
};

ViewLayer.prototype["agenda-detail"] = function () {
  const state = appStore.get(),
    event = agendaWorkspaceEventsV1(state).events.find((item) => String(item.id) === String(state.agendaFocusedEventId));
  if (!event) return `<section class="agenda-detail-page"><h1>Tarefa não encontrada</h1><button type="button" data-agenda-detail-back>${ico("arrow-left")} Voltar à agenda</button></section>`;
  const stages = executionModel.stages || [],
    requirements = Array.isArray(event.requirements) ? event.requirements.join("\n") : String(event.requirements || ""),
    materials = Array.isArray(event.materials) ? event.materials.join("\n") : String(event.materials || "");
  return `<section class="agenda-detail-page" data-agenda-detail data-agenda-event-id="${esc(event.id)}"><div class="agenda-detail-toolbar"><button type="button" class="toolbar-action" data-agenda-detail-back>${ico("arrow-left")} Agenda</button><button type="button" class="toolbar-action" data-agenda-mark-done>${ico("check")} Riscar como concluída</button></div><header><div><span class="activity-kind">TAREFA OPERACIONAL · ${esc(event.stageName || "ETAPA")}</span><h1>${esc(event.title || event.activityName || "Atividade")}</h1><p>Edite responsável, encaixe no cronograma e requisitos da etapa.</p></div><span class="agenda-custom-status ${agendaCalendarStatusToneV3(event.customStatus || event.status)}">${esc(event.customStatus || event.status || "Planejado")}</span></header><form data-agenda-detail-form><div class="agenda-detail-fields"><label>Atividade<input name="title" required value="${esc(event.title || event.activityName || "")}"></label><label>Etapa<select name="stageKey">${stages.map((stage) => `<option value="${esc(stage.key)}" ${String(stage.key) === String(event.stageKey) ? "selected" : ""}>${esc(stage.name)}</option>`).join("")}</select></label><label>Data<input name="date" type="date" required value="${esc(event.date || "")}"></label><label>Horário<input name="start" type="time" required value="${esc(event.start || "08:00")}"></label><label>Responsável<input name="owner" value="${esc(event.owner || "")}"></label><label>Status padrão<select name="status">${["Planejado", "Pendente", "Em andamento", "Concluído", "Anulado"].map((status) => `<option ${String(event.status) === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><label class="wide">Condição personalizada<input name="customStatus" value="${esc(event.customStatus || "")}" placeholder="Ex.: aguardando vistoria, bloqueada por chuva"></label><label class="wide">Requisitos e critérios de aceite<textarea name="requirements" rows="4">${esc(requirements)}</textarea></label><label class="wide">Materiais / compras necessários<textarea name="materials" rows="3">${esc(materials)}</textarea></label><label class="wide">Descrição da atividade<textarea name="activityName" rows="3">${esc(event.activityName || "")}</textarea></label></div><footer><button type="submit" class="toolbar-primary">${ico("save")} Salvar atividade</button></footer></form><form data-agenda-cancel-form class="agenda-cancel-form"><header><div><span class="activity-kind">ANULAÇÃO / BLOQUEIO</span><h2>Registrar motivo da operação</h2><p>A agenda guarda a descrição, o responsável e a confirmação antes de anular.</p></div></header><label>Descrição do motivo<textarea name="reason" required rows="3" placeholder="Explique por que esta atividade será anulada"></textarea></label><label class="agenda-cancel-confirm"><input type="checkbox" name="confirmed" required><span>Confirmo a anulação desta atividade e o registro do motivo acima.</span></label><button type="submit" class="toolbar-danger">${ico("circle-x")} Confirmar anulação</button></form><aside class="agenda-detail-context"><b>Etapa: ${esc(event.stageName || "Não associada")}</b><span>${esc(event.owner || "Responsável a definir")} · ${esc(event.date || "Sem data")} ${esc(event.start || "")}</span><p>${esc(requirements || "Nenhum requisito cadastrado.")}</p></aside></section>`;
};

const stageRecordAgendaActivityMarkupV1 = (event, state = {}) => {
  const today = new Date().toISOString().slice(0, 10),
    activity = String(event.title || event.activityName || "Atividade"),
    selectedStage = String(event.stageKey || ""),
    priorFeedback = state.agendaActivityRecordFeedbackV1,
    feedbackText = priorFeedback?.eventId === String(event.id) ? priorFeedback.message : "Pronto para registrar nesta atividade.",
    stages = stageRecordStagesV1(),
    options = stages.map((stage) => '<option value="' + esc(stage.key) + '" ' + (String(stage.key) === selectedStage ? "selected" : "") + '>' + esc(stage.name) + '</option>').join("");
  return '<section class="stage-dashboard-quick-capture agenda-activity-record" data-agenda-activity-record-panel><header><div><span class="activity-kind">APONTAMENTO DA TAREFA</span><h2>Adicionar registro</h2><p>O registro será associado à atividade aberta e à etapa selecionada.</p></div><span class="stage-record-section-note">' + esc(event.id) + '</span></header><div class="stage-dashboard-quick-grid stage-dashboard-quick-grid-single"><form data-activity-quick-record><header><span>' + ico("clipboard-pen-line") + '</span><div><b>Novo registro</b><small>Vinculado a esta atividade da agenda</small></div></header><label>Etapa<select name="stageKey" required>' + options + '</select></label><label>Atividade<input name="activity" required value="' + esc(activity) + '"></label><div class="stage-dashboard-quick-pair"><label>Data<input name="date" type="date" required value="' + esc(event.date || today) + '"></label><label>Responsável<input name="responsible" value="' + esc(event.owner || "") + '" placeholder="A definir"></label></div><label>Resumo<input name="detail" placeholder="Medição, ocorrência ou evidência (opcional)"></label><button type="submit" class="primary">Adicionar registro ' + ico("arrow-up-right") + '</button></form></div><p class="stage-dashboard-quick-feedback" data-activity-record-feedback aria-live="polite">' + esc(feedbackText) + '</p></section>';
};

const agendaDetailBeforeActivityRecordV1 = ViewLayer.prototype["agenda-detail"];
ViewLayer.prototype["agenda-detail"] = function (...args) {
  const html = agendaDetailBeforeActivityRecordV1.apply(this, args);
  if (!html.includes('<form data-agenda-detail-form>')) return html;
  const state = appStore.get(),
    event = agendaWorkspaceEventsV1(state).events.find((item) => String(item.id) === String(state.agendaFocusedEventId));
  if (!event) return html;
  return html.replace(
    '</form><form data-agenda-cancel-form',
    '</form>' + stageRecordAgendaActivityMarkupV1(event, state) + '<form data-agenda-cancel-form',
  );
};

const workspacePreviousControlV1 = ViewLayer.prototype.control;
ViewLayer.prototype.control = function (...args) {
  let html = workspacePreviousControlV1.apply(this, args);
  if (!html.includes('data-stage-record-center')) {
    if (!html.includes('data-dashboard-agenda')) {
      const headerEnd = html.indexOf('</header>');
      if (headerEnd >= 0) {
        const insertAt = headerEnd + '</header>'.length;
        html = html.slice(0, insertAt) + dashboardAgendaPreviewV1(appStore.get()) + stageRecordDashboardActionWorkspaceMarkupV1() + html.slice(insertAt);
      }
    }
    return html;
  }
  html = html.replace(/<header class="stage-record-center-head">[\s\S]*?<\/header>/, "");
  const state = appStore.get(),
    quickCaptureStart = html.indexOf('<section class="stage-dashboard-quick-capture"');
  if (quickCaptureStart >= 0) {
    const quickCaptureEnd = html.indexOf("</section>", quickCaptureStart);
    if (quickCaptureEnd >= 0) {
      const insertAt = quickCaptureEnd + "</section>".length;
      html = html.slice(0, insertAt) + dashboardAgendaPreviewV1(state) + html.slice(insertAt);
    }
  }
  const agendaStart = html.indexOf('<section class="dashboard-agenda"');
  if (agendaStart >= 0) {
    const agendaEnd = html.indexOf("</section>", agendaStart);
    if (agendaEnd >= 0) {
      const insertAt = agendaEnd + "</section>".length;
      html = html.slice(0, insertAt) + stageRecordDashboardActionWorkspaceMarkupV1() + html.slice(insertAt);
    }
  }
  if (html.includes('data-stage-center-panel="materials"')) {
    const rootClose = html.lastIndexOf("</section>");
    if (rootClose >= 0) {
      const reportDialog = stageMaterialReportDialogV1(stageRecordMaterialRowsV1(state), stageRecordStagesV1());
      html = html.slice(0, rootClose) + reportDialog + html.slice(rootClose);
    }
  }
  return html;
};



const bindBeforeAgendaDashboardV1 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = bindBeforeAgendaDashboardV1.apply(this, args),
    root = this,
    route = this.dataset.view || appStore.get().view;
  if (route === "control") {
    root.querySelectorAll("[data-dashboard-agenda-select-day]").forEach((button) => button.addEventListener("click", () => {
      appStore.set({ dashboardAgendaSelectedDateV1: button.dataset.dashboardAgendaSelectDay });
      this.render();
    }));
    root.querySelectorAll("[data-dashboard-agenda-week-shift]").forEach((button) => button.addEventListener("click", () => {
      const selected = appStore.get().dashboardAgendaSelectedDateV1 || agendaCalendarIsoV3(new Date()),
        date = agendaCalendarAddDaysV3(selected, Number(button.dataset.dashboardAgendaWeekShift));
      appStore.set({ dashboardAgendaSelectedDateV1: date });
      this.render();
    }));
    root.querySelector("[data-dashboard-agenda-today]")?.addEventListener("click", () => {
      appStore.set({ dashboardAgendaSelectedDateV1: agendaCalendarIsoV3(new Date()) });
      this.render();
    });
    root.querySelectorAll("[data-dashboard-agenda-open]").forEach((button) => button.addEventListener("click", () => {
      appStore.set({ view: "agenda-detail", agendaFocusedEventId: button.dataset.dashboardAgendaOpen, lastAction: "Abriu tarefa da agenda operacional" });
    }));
  }
  if (route === "agenda-detail") {
    const detail = root.querySelector("[data-agenda-detail]");
    if (detail) {
      const eventId = detail.dataset.agendaEventId;
      detail.querySelector("[data-agenda-detail-back]")?.addEventListener("click", () => appStore.set({ view: "agenda", lastAction: "Voltou ao calendário operacional" }));
      const persist = (patch, action) => {
        const data = agendaWorkspaceEventsV1(appStore.get()),
          events = (data.events || []).map((event) => String(event.id) === String(eventId) ? { ...event, ...patch, updatedAt: new Date().toISOString() } : event),
          changed = events.find((event) => String(event.id) === String(eventId));
        agendaPersistWorkspaceV1(events, action, changed);
        this.render();
        notify(action, "success");
      };
      detail.querySelector("[data-activity-quick-record]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormDataCtor(event.currentTarget)),
          stage = stageRecordStagesV1().find((item) => String(item.key) === String(values.stageKey)),
          activity = String(values.activity || "").trim(),
          feedback = detail.querySelector("[data-activity-record-feedback]");
        if (!stage || !activity) {
          if (feedback) feedback.textContent = "Informe uma atividade e selecione a etapa deste registro.";
          return;
        }
        const state = appStore.get(),
          record = {
            id: `REG-ACT-${Date.now().toString().slice(-8)}`,
            obra: "Aliança Park",
            etapa: stage.name,
            stageKey: stage.key,
            atividade: activity,
            data: String(values.date || ""),
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            responsavel: String(values.responsible || "A definir").trim() || "A definir",
            detalhes: String(values.detail || `Registro da atividade: ${activity}`).trim(),
            status: "Pendente",
            activityEventId: String(eventId),
            attachments: [],
            properties: [
              { label: "Origem", value: `Agenda operacional · ${activity}` },
              { label: "ID da atividade", value: String(eventId) },
            ],
          };
        const button = event.currentTarget.querySelector('button[type="submit"]');
        if (typeof apiFetch !== "function" || typeof operationalHeaders !== "function") {
          if (feedback) feedback.textContent = "Serviço de registros indisponível; nenhum dado foi salvo.";
          return;
        }
        if (button) button.disabled = true;
        if (feedback) feedback.textContent = "Salvando registro no diário operacional…";
        try {
          const response = await apiFetch("/api/records", {
              method: "POST",
              headers: operationalHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                obra: record.obra,
                etapa: record.etapa,
                stageKey: record.stageKey,
                atividade: record.atividade,
                data: record.data,
                hora: record.hora,
                responsavel: record.responsavel,
                detalhes: record.detalhes,
                status: record.status,
                properties: record.properties,
              }),
            }),
            payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          const saved = payload.record || payload,
            feedbackMessage = `Registro ${saved.id} salvo na etapa ${stage.name}.`;
          appStore.set({
            records: [saved, ...(Array.isArray(state.records) ? state.records : []).filter((item) => String(item.id) !== String(saved.id))],
            agendaActivityRecordFeedbackV1: { eventId: String(eventId), message: feedbackMessage },
            lastAction: `Adicionou registro ${saved.id} na atividade ${activity}`,
          });
          notify(`Registro salvo na atividade ${activity}.`, "success");
        } catch (error) {
          if (feedback) feedback.textContent = `Registro não salvo: ${error.message || "serviço indisponível"}`;
          notify("Registro não confirmado; revise a conexão e tente novamente.", "warning");
        } finally {
          if (button) button.disabled = false;
        }
      });
      detail.querySelector("[data-agenda-detail-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormDataCtor(event.currentTarget)), state = appStore.get(),
          stage = executionModel.stages.find((item) => item.key === values.stageKey),
          data = agendaWorkspaceEventsV1(state),
          events = (data.events || []).map((item) => String(item.id) === String(eventId) ? {
            ...item,
            title: String(values.title || "").trim(),
            activityName: String(values.activityName || values.title || "").trim(),
            stageKey: values.stageKey,
            stageName: stage?.name || "",
            date: values.date,
            start: values.start,
            owner: String(values.owner || "").trim(),
            status: values.status,
            customStatus: String(values.customStatus || "").trim(),
            requirements: String(values.requirements || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
            materials: String(values.materials || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
            updatedAt: new Date().toISOString(),
          } : item);
        const changed = events.find((item) => String(item.id) === String(eventId));
        agendaPersistWorkspaceV1(events, "Atualizou atividade, cronograma e requisitos da agenda", changed);
        this.render();
        notify("Atividade e requisitos da agenda foram atualizados.", "success");
      });
      detail.querySelector("[data-agenda-mark-done]")?.addEventListener("click", () => persist({ status: "Concluído", customStatus: "" }, "Concluiu a atividade da agenda"));
      detail.querySelector("[data-agenda-cancel-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormDataCtor(event.currentTarget));
        if (values.confirmed !== "on") return;
        persist({ status: "Anulado", customStatus: "Anulado", cancellationReason: String(values.reason || "").trim(), cancelledAt: new Date().toISOString(), cancellationConfirmed: true }, `Anulou atividade: ${String(values.reason || "").trim()}`);
      });
    }
  }
  root.querySelectorAll("[data-agenda-notifications-enable]").forEach((button) => button.addEventListener("click", async () => {
    try {
      const plugin = await agendaNotificationPluginV1();
      if (!plugin) {
        if (!NotificationCtor) {
          notify("Este navegador não oferece notificações. No APK elas são programadas no aparelho.", "info");
          return;
        }
        const permission = await NotificationCtor.requestPermission();
        if (permission !== "granted") {
          notify("Permissão de notificações não concedida neste navegador.", "warning");
          return;
        }
        appStore.set({ agendaMobileNotificationsEnabled: true, lastAction: "Ativou notificações da agenda neste navegador" });
        this.render();
        notify("Notificações da agenda ativadas neste navegador.", "success");
        return;
      }
      let permission = await plugin.checkPermissions();
      if (permission.display !== "granted") permission = await plugin.requestPermissions();
      if (permission.display !== "granted") {
        notify("Permissão de notificações não concedida no aparelho.", "warning");
        return;
      }
      appStore.set({ agendaMobileNotificationsEnabled: true, lastAction: "Ativou notificações da agenda neste aparelho" });
      const events = agendaWorkspaceEventsV1(appStore.get()).events || [];
      await Promise.all(events.filter((event) => !/conclu|anulad/i.test(String(event.status || ""))).map(agendaScheduleDeviceNotificationV1));
      this.render();
      notify("Notificações móveis programadas para as tarefas futuras.", "success");
    } catch (error) {
      console.error("Falha ao ativar notificações de agenda", error);
      notify("Não foi possível ativar as notificações deste aparelho.", "error");
    }
  }));
  return result;
};

if (capacitor?.isNativePlatform?.()) {
  const current = appStore.get();
  if (current.agendaMobileNotificationsEnabled) {
    queueMicrotaskFn(() => Promise.all((agendaWorkspaceEventsV1(appStore.get()).events || [])
      .filter((event) => !/conclu|anulad/i.test(String(event.status || "")))
      .map(agendaScheduleDeviceNotificationV1)));
  }
}


  return { agendaWorkspaceEventsV1, dashboardAgendaPreviewV1 };
};
