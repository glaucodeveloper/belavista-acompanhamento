/** Agenda calendar page: rendering, event model, and interactions. */
import { AgendaAtlasTimelineV1 } from "./agenda-atlas-timeline-v1.mjs";
export const installAgendaCalendarPageV8 = (ViewLayer, dependencies = {}) => {
  const {
    STAGE_WORKBENCH, appStore, apiFetch, beginCardCanvasLinkV1, demoData, esc,
    executionModel, extensionStage, ico, normalizeActivityRouteTextV1,
    notify, stagePersistentTimelineMarkupV1, stageV9LiveFor,
    workbenchStageFromValueV1, host = globalThis,
  } = dependencies;
  const document = host.document;
  const window = host.window || host;
  const FormData = host.FormData;
  const Element = host.Element;
  const CSS = host.CSS;
  const requestAnimationFrame = host.requestAnimationFrame.bind(host);

  const AGENDA_CALENDAR_STORAGE_KEY_V3 = "belavista.agenda-calendar.v3";
  // V8: espaços de dia 20% menores que a grade anterior.
  const AGENDA_CALENDAR_PIXELS_PER_HOUR_V6 = 38.4;
  const AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6 =
    AGENDA_CALENDAR_PIXELS_PER_HOUR_V6 / 2;
  const AGENDA_CALENDAR_DAY_BODY_HEIGHT_V6 =
    AGENDA_CALENDAR_PIXELS_PER_HOUR_V6 * 24;

  const agendaCalendarPadV3 = (value) => String(value).padStart(2, "0");
  const agendaCalendarIsoV3 = (date) =>
    `${date.getFullYear()}-${agendaCalendarPadV3(date.getMonth() + 1)}-${agendaCalendarPadV3(date.getDate())}`;
  const agendaCalendarMonthKeyV3 = (date) =>
    `${date.getFullYear()}-${agendaCalendarPadV3(date.getMonth() + 1)}`;
  const agendaCalendarParseDateV3 = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
    return Number.isFinite(date.getTime()) ? date : null;
  };
  const agendaCalendarAddDaysV3 = (value, days) => {
    const date =
      value instanceof Date
        ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
        : agendaCalendarParseDateV3(value);
    if (!date) return String(value || "");
    date.setDate(date.getDate() + Number(days || 0));
    return agendaCalendarIsoV3(date);
  };
  const agendaCalendarTimeToHoursV3 = (value) => {
    const [hour = 0, minute = 0] = String(value || "08:00")
      .split(":")
      .map(Number);
    return Math.max(0, Math.min(23.5, hour + minute / 60));
  };
  const agendaCalendarHoursToTimeV3 = (hours) => {
    const value = Math.max(0, Math.min(23.5, Number(hours) || 0)),
      total = Math.round(value * 2) * 30,
      hour = Math.floor(total / 60),
      minute = total % 60;
    return `${agendaCalendarPadV3(hour)}:${agendaCalendarPadV3(minute)}`;
  };
  const agendaCalendarMonthLabelV3 = (key) => {
    const [year, month] = String(key || "")
        .split("-")
        .map(Number),
      date = new Date(year || 2024, Math.max(0, (month || 1) - 1), 1);
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };
  const agendaCalendarShiftMonthV3 = (key, delta) => {
    const [year, month] = String(key || "")
        .split("-")
        .map(Number),
      date = new Date(
        year || 2024,
        Math.max(0, (month || 1) - 1) + Number(delta || 0),
        1,
      );
    return agendaCalendarMonthKeyV3(date);
  };
  const agendaCalendarMonthDaysV3 = (key) => {
    const [year, month] = String(key || "")
        .split("-")
        .map(Number),
      first = new Date(year || 2024, Math.max(0, (month || 1) - 1), 1),
      last = new Date(first.getFullYear(), first.getMonth() + 1, 0),
      start = new Date(first),
      end = new Date(last);
    start.setDate(start.getDate() - start.getDay());
    end.setDate(end.getDate() + (6 - end.getDay()));
    const days = [];
    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    )
      days.push(new Date(cursor));
    return days;
  };

  // ---------------------------------------------------------------------------
  // Agenda semanal V8
  // ---------------------------------------------------------------------------
  const agendaCalendarWeekStartV8 = (value) => {
    const source =
        value instanceof Date
          ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
          : agendaCalendarParseDateV3(value) || new Date(),
      start = new Date(source.getFullYear(), source.getMonth(), source.getDate());
    // Domingo = início visual da semana, compatível com DOM..SÁB.
    start.setDate(start.getDate() - start.getDay());
    return start;
  };

  const agendaCalendarWeekKeyV8 = (value) =>
    agendaCalendarIsoV3(agendaCalendarWeekStartV8(value));

  const agendaCalendarWeekDaysV8 = (weekKey) => {
    const start = agendaCalendarWeekStartV8(weekKey);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  };

  const agendaCalendarShiftWeekV8 = (weekKey, delta) =>
    agendaCalendarAddDaysV3(
      agendaCalendarWeekKeyV8(weekKey),
      Number(delta || 0) * 7,
    );

  const agendaCalendarWeekLabelV8 = (weekKey) => {
    const days = agendaCalendarWeekDaysV8(weekKey),
      first = days[0],
      last = days[6],
      sameMonth =
        first.getMonth() === last.getMonth() &&
        first.getFullYear() === last.getFullYear();

    if (sameMonth)
      return `${first.getDate()} — ${last.getDate()} de ${first.toLocaleDateString(
        "pt-BR",
        { month: "long", year: "numeric" },
      )}`;

    return `${first.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })} — ${last.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  };

  const agendaCalendarInitialWeekV8 = (state, data) => {
    const requested = String(state.agendaCalendarWeekV8 || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(requested))
      return agendaCalendarWeekKeyV8(requested);

    const today = new Date(),
      todayWeek = agendaCalendarWeekKeyV8(today),
      todayDays = new Set(
        agendaCalendarWeekDaysV8(todayWeek).map(agendaCalendarIsoV3),
      ),
      events = Array.isArray(data?.events) ? data.events : [];

    if (events.some((event) => todayDays.has(String(event.date || ""))))
      return todayWeek;

    const dated = events
      .map((event) => ({
        event,
        date: agendaCalendarParseDateV3(event.date),
      }))
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          Math.abs(a.date.getTime() - today.getTime()) -
          Math.abs(b.date.getTime() - today.getTime()),
      );

    return dated[0] ? agendaCalendarWeekKeyV8(dated[0].date) : todayWeek;
  };

  const agendaCalendarLastAvailableSlotV8 = (events, weekKey) => {
    const days = agendaCalendarWeekDaysV8(weekKey),
      daySet = new Set(days.map(agendaCalendarIsoV3)),
      inWeek = (events || [])
        .filter((item) => daySet.has(String(item.date || "")))
        .sort(
          (a, b) => agendaCalendarEventEndV3(a) - agendaCalendarEventEndV3(b),
        );

    if (!inWeek.length) {
      // Segunda-feira, 08:00, se disponível na semana.
      return {
        date: agendaCalendarIsoV3(days[1] || days[0]),
        start: "08:00",
      };
    }

    const last = inWeek[inWeek.length - 1],
      lastDate =
        agendaCalendarParseDateV3(last.date) ||
        agendaCalendarWeekStartV8(weekKey),
      endHour =
        agendaCalendarTimeToHoursV3(last.start) +
        Math.max(0.5, Number(last.durationHours || 1));

    lastDate.setDate(
      lastDate.getDate() + Math.max(0, Number(last.spanDays || 1) - 1),
    );

    if (endHour <= 23.5)
      return {
        date: agendaCalendarIsoV3(lastDate),
        start: agendaCalendarHoursToTimeV3(Math.ceil(endHour * 2) / 2),
      };

    lastDate.setDate(lastDate.getDate() + 1);
    const weekEnd = days[6];
    if (lastDate > weekEnd) lastDate.setTime(days[0].getTime());

    return {
      date: agendaCalendarIsoV3(lastDate),
      start: "08:00",
    };
  };

  const agendaCalendarReadV3 = () => {
    const state = appStore.get();
    return { version: 3, initialized: Boolean(state.agendaCalendarLoadedV3 && !state.agendaCalendarErrorV3),
      events: Array.isArray(state.agendaDatabaseEventsV3) ? state.agendaDatabaseEventsV3 : [] };
  };
  const agendaCalendarWriteV3 = async (data) => {
    if(typeof apiFetch!=="function" || !agendaCalendarReadV3().initialized)
      throw new Error("Agenda ainda não foi carregada do banco de dados.");
    const response=await apiFetch("/api/agenda-events",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({events:data?.events||[]})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!Array.isArray(payload.events))throw new Error(payload.error||`HTTP ${response.status}`);
    appStore.set({agendaDatabaseEventsV3:payload.events,agendaCalendarRevisionV3:Date.now(),agendaCalendarErrorV3:""});
    return payload.events;
  };

  const agendaCalendarFindStageV3 = (value) => {
    const token = normalizeActivityRouteTextV1(value);
    return (
      (executionModel.stages || []).find(
        (stage) =>
          normalizeActivityRouteTextV1(stage.key) === token ||
          normalizeActivityRouteTextV1(stage.name) === token,
      ) ||
      (executionModel.stages || [])[0] ||
      null
    );
  };
  const agendaCalendarActivitiesForStageV3 = (stageKey, stageName = "") => {
    const direct =
        STAGE_WORKBENCH.find(
          (stage) =>
            String(stage.key) === String(stageKey) ||
            normalizeActivityRouteTextV1(stage.title) ===
              normalizeActivityRouteTextV1(stageName),
        ) || workbenchStageFromValueV1(stageKey || stageName),
      values = Array.isArray(direct?.activities) ? direct.activities : [];
    if (values.length)
      return values.map((item) => ({
        id: String(item.id || item.title),
        title: String(item.title || item.name || item.id),
      }));
    return [
      {
        id: String(stageKey || "atividade"),
        title: String(stageName || "Atividade da etapa"),
      },
    ];
  };
  const agendaCalendarDemoEventsV3 = (stage) => {
    const stageKey = stage?.key || "drainage",
      stageName = stage?.name || "Drenagem Pluvial",
      owner = stageV9LiveFor(stage || {})?.owner || stage?.owner || "";
    return [
      {
        id: "agenda-demo-01",
        title: "Planejar frente",
        stageKey,
        stageName,
        activityId: "front",
        activityName: "Preparar frente",
        owner: owner || "Paula",
        date: "2024-06-03",
        start: "08:00",
        durationHours: 2,
        spanDays: 1,
        status: "Planejado",
      },
      {
        id: "agenda-demo-02",
        title: "Comprar materiais",
        stageKey,
        stageName,
        activityId: "materials",
        activityName: "Suprimentos",
        owner: "Suprimentos",
        date: "2024-06-04",
        start: "10:00",
        durationHours: 2,
        spanDays: 1,
        status: "Em andamento",
      },
      {
        id: "agenda-demo-03",
        title: "Conferir medição",
        stageKey,
        stageName,
        activityId: "measure",
        activityName: "Validar medição",
        owner: "Carlos",
        date: "2024-06-05",
        start: "14:00",
        durationHours: 2,
        spanDays: 1,
        status: "Pendente",
      },
      {
        id: "agenda-demo-04",
        title: "Confirmar medição",
        stageKey,
        stageName,
        activityId: "measure",
        activityName: "Validar medição",
        owner: "Carlos",
        date: "2024-06-06",
        start: "08:30",
        durationHours: 1.5,
        spanDays: 1,
        status: "Em andamento",
      },
      {
        id: "agenda-demo-05",
        title: "Receber materiais",
        stageKey,
        stageName,
        activityId: "materials",
        activityName: "Recebimento",
        owner: "Paula",
        date: "2024-06-06",
        start: "10:30",
        durationHours: 2,
        spanDays: 1,
        status: "Em andamento",
      },
      {
        id: "agenda-demo-06",
        title: "Liberar próxima frente",
        stageKey,
        stageName,
        activityId: "release",
        activityName: "Liberar próxima frente",
        owner: "Mariana",
        date: "2024-06-06",
        start: "16:00",
        durationHours: 2,
        spanDays: 1,
        status: "Pendente",
      },
      {
        id: "agenda-demo-07",
        title: "Validar evidências",
        stageKey,
        stageName,
        activityId: "evidence",
        activityName: "Validar evidências",
        owner: "Paula",
        date: "2024-06-07",
        start: "09:00",
        durationHours: 2,
        spanDays: 1,
        status: "Planejado",
      },
      {
        id: "agenda-demo-08",
        title: "Revisar pendências",
        stageKey,
        stageName,
        activityId: "review",
        activityName: "Revisar pendências",
        owner: "Admin",
        date: "2024-06-08",
        start: "11:00",
        durationHours: 2,
        spanDays: 1,
        status: "Pendente",
      },
    ];
  };
  const agendaCalendarOperationalEventsV3 = (state) =>
    (state.operationalAgenda || [])
      .map((item, index) => {
        const raw =
            item.plannedStart ||
            item.start ||
            item.date ||
            item.referenceDate ||
            "",
          parsed = new Date(raw),
          valid = Number.isFinite(parsed.getTime()),
          date =
            agendaCalendarParseDateV3(raw) ||
            (valid
              ? new Date(
                  parsed.getFullYear(),
                  parsed.getMonth(),
                  parsed.getDate(),
                )
              : null);
        if (!date) return null;
        const stage = agendaCalendarFindStageV3(item.stageKey || item.stageName),
          start =
            String(raw)
              .match(/T(\d{2}):(\d{2})/)
              ?.slice(1, 3)
              .join(":") ||
            item.time ||
            "08:00";
        return {
          id: `agenda-op-${item.id || index + 1}`,
          title: item.title || item.name || "Compromisso operacional",
          stageKey: stage?.key || item.stageKey || "",
          stageName: stage?.name || item.stageName || "Etapa",
          activityId: item.activityId || item.activity || item.title || "",
          activityName: item.activity || item.title || "Atividade",
          owner: item.owner || item.responsible || "",
          date: agendaCalendarIsoV3(date),
          start,
          durationHours: Math.max(
            0.5,
            Number(item.durationHours || item.hours || 1.5),
          ),
          spanDays: Math.max(1, Number(item.spanDays || item.durationDays || 1)),
          status: item.status || "Planejado",
        };
      })
      .filter(Boolean);

  const agendaCalendarStateV3 = (state, stage) => {
    const stored = agendaCalendarReadV3();
    return stored;
  };
  const agendaCalendarInitialMonthV3 = (state, data) => {
    const requested = String(state.agendaCalendarMonthV3 || "");
    if (/^\d{4}-\d{2}$/.test(requested)) return requested;
    const first = (data.events || [])
      .map((item) => agendaCalendarParseDateV3(item.date))
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    return first
      ? agendaCalendarMonthKeyV3(first)
      : agendaCalendarMonthKeyV3(new Date());
  };
  const agendaCalendarEventEndV3 = (event) => {
    const date = agendaCalendarParseDateV3(event.date);
    if (!date) return 0;
    date.setDate(date.getDate() + Math.max(0, Number(event.spanDays || 1) - 1));
    const hours =
      agendaCalendarTimeToHoursV3(event.start) +
      Math.max(0.5, Number(event.durationHours || 1));
    date.setMinutes(date.getMinutes() + Math.round(hours * 60));
    return date.getTime();
  };
  const agendaCalendarLastAvailableSlotV3 = (events, monthKey) => {
    const inMonth = (events || [])
        .filter((item) => String(item.date || "").startsWith(monthKey))
        .sort(
          (a, b) => agendaCalendarEventEndV3(a) - agendaCalendarEventEndV3(b),
        ),
      [year, month] = monthKey.split("-").map(Number),
      monthLast = new Date(year, month, 0),
      first = new Date(year, month - 1, 1);

    if (!inMonth.length) {
      while (first.getDay() === 0 || first.getDay() === 6)
        first.setDate(first.getDate() + 1);
      return { date: agendaCalendarIsoV3(first), start: "08:00" };
    }

    const last = inMonth[inMonth.length - 1],
      lastDate = agendaCalendarParseDateV3(last.date) || first,
      endHour =
        agendaCalendarTimeToHoursV3(last.start) +
        Math.max(0.5, Number(last.durationHours || 1));

    lastDate.setDate(
      lastDate.getDate() + Math.max(0, Number(last.spanDays || 1) - 1),
    );

    if (endHour <= 19.5 && lastDate <= monthLast)
      return {
        date: agendaCalendarIsoV3(lastDate),
        start: agendaCalendarHoursToTimeV3(Math.ceil(endHour * 2) / 2),
      };

    lastDate.setDate(lastDate.getDate() + 1);
    if (lastDate > monthLast) {
      lastDate.setTime(first.getTime());
    }
    return { date: agendaCalendarIsoV3(lastDate), start: "08:00" };
  };
  const agendaCalendarStatusToneV3 = (status) => {
    const token = normalizeActivityRouteTextV1(status);
    if (token.includes("concl")) return "done";
    if (token.includes("andamento") || token.includes("exec")) return "active";
    if (token.includes("pend") || token.includes("risco")) return "warning";
    return "planned";
  };
  const agendaCalendarEventMarkupV3 = (event, weekdayIndex) => {
    const startHours = agendaCalendarTimeToHoursV3(event.start),
      durationHours = Math.max(
        0.5,
        Math.round(Number(event.durationHours || 1) * 2) / 2,
      ),
      endHours = Math.min(24, startHours + durationHours),
      endLabel = agendaCalendarHoursToTimeV3(
        Math.min(23.5, Math.max(0, endHours)),
      ),
      maxSpan = Math.max(1, 7 - Number(weekdayIndex || 0)),
      spanDays = Math.max(
        1,
        Math.min(maxSpan, Math.round(Number(event.spanDays || 1))),
      ),
      topPx = startHours * AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
      heightPx = durationHours * AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
      gapPx = 8,
      widthGap = Math.max(0, spanDays - 1) * gapPx,
      tone = agendaCalendarStatusToneV3(event.status),
      sizeClass =
        durationHours <= 0.5
          ? "micro"
          : durationHours <= 1
            ? "compact"
            : durationHours <= 1.5
              ? "short"
              : "full";
    return `<article class="agenda-month-event-v3 ${tone} ${sizeClass}" data-agenda-event-v3="${esc(event.id)}" data-agenda-event-date="${esc(event.date)}" data-agenda-event-start="${esc(event.start)}" data-agenda-event-duration="${durationHours}" data-agenda-event-span="${spanDays}" style="top:${topPx}px;height:${heightPx}px;width:calc(${spanDays * 100}% + ${widthGap}px)" tabindex="0"><div class="agenda-month-event-body-v3"><div class="agenda-event-time-v4"><time>${esc(event.start)}—${esc(endLabel)}</time><span>${durationHours}h · ${spanDays}d</span></div><strong>${esc(event.title)}</strong><small>${esc(event.activityName || "Atividade")} · ${esc(event.stageName || "Etapa")}</small><em>${esc(event.owner || "Responsável a definir")}</em></div><button type="button" class="agenda-card-link-handle" data-agenda-link-from="${esc(event.id)}" aria-label="Puxar relação para novo card" title="Arraste para criar card relacionado">＋</button><span class="agenda-resize-edge-v4 agenda-resize-start-hours-v4" data-agenda-resize-edge-v4 data-agenda-resize-start-hours aria-label="Ajustar hora inicial" title="Aresta superior: hora inicial"></span><span class="agenda-resize-edge-v4 agenda-resize-hours-v3" data-agenda-resize-edge-v4 data-agenda-resize-hours aria-label="Ajustar hora final" title="Aresta inferior: hora final"></span><span class="agenda-resize-edge-v4 agenda-resize-start-days-v4" data-agenda-resize-edge-v4 data-agenda-resize-start-days aria-label="Ajustar dia inicial" title="Aresta esquerda: dia inicial"></span><span class="agenda-resize-edge-v4 agenda-resize-days-v3" data-agenda-resize-edge-v4 data-agenda-resize-days aria-label="Ajustar dia final" title="Aresta direita: dia final"></span></article>`;
  };
  const agendaCalendarFormMarkupV3 = (stage, data, monthKey) => {
    const slot = agendaCalendarLastAvailableSlotV8(data.events || [], monthKey),
      stages = executionModel.stages || [],
      stageOptions = stages
        .map(
          (item) =>
            `<option value="${esc(item.key)}" ${String(item.key) === String(stage?.key) ? "selected" : ""}>${esc(item.name)}</option>`,
        )
        .join(""),
      activityOptions = stages
        .flatMap((item) =>
          agendaCalendarActivitiesForStageV3(item.key, item.name).map(
            (activity) =>
              `<option value="${esc(activity.id)}" data-agenda-activity-stage="${esc(item.key)}" data-agenda-activity-title="${esc(activity.title)}">${esc(item.name)} · ${esc(activity.title)}</option>`,
          ),
        )
        .join("");
    return `<section class="agenda-month-editor-v3" data-agenda-editor-v3 hidden><header><div><span class="activity-kind">NOVO COMPROMISSO / APONTAMENTO</span><h3 data-agenda-editor-title>Adicionar compromisso</h3><p>Associe à etapa e à atividade. Sem data/hora manual, o formulário começa no último horário disponível do mês.</p></div><button type="button" class="ghost" data-agenda-editor-close>Fechar</button></header><form data-agenda-editor-form><input type="hidden" name="id"><div class="agenda-editor-grid-v3"><label>Título<input name="title" placeholder="Ex.: Conferir medição"></label><label>Etapa<select name="stageKey" data-agenda-editor-stage>${stageOptions}</select></label><label>Atividade<select name="activityId" data-agenda-editor-activity>${activityOptions}</select></label><label>Responsável<input name="owner" value="${esc(stageV9LiveFor(stage)?.owner || stage?.owner || "")}" placeholder="Responsável ou equipe"></label><label>Data<input type="date" name="date" value="${esc(slot.date)}"></label><label>Hora inicial<input type="time" name="start" step="1800" value="${esc(slot.start)}"></label><label>Duração em horas<input type="number" name="durationHours" min="0.5" max="24" step="0.5" value="1.5"></label><label>Duração em dias<input type="number" name="spanDays" min="1" max="7" step="1" value="1"></label><label>Status<select name="status"><option>Planejado</option><option>Em andamento</option><option>Pendente</option><option>Concluído</option></select></label></div><footer><button type="button" class="ghost danger" data-agenda-editor-delete hidden>${ico("trash-2")} Excluir</button><span data-agenda-editor-feedback>O card será colocado no último espaço disponível caso você mantenha a posição sugerida.</span><button type="submit" class="activity-install-primary">${ico("save")} Salvar compromisso</button></footer></form></section>`;
  };
  const agendaCalendarMarkupV3 = (stage) => {
    const state = appStore.get(),
      data = agendaCalendarStateV3(state, stage),
      weekKey = agendaCalendarInitialWeekV8(state, data),
      days = agendaCalendarWeekDaysV8(weekKey),
      daySet = new Set(days.map(agendaCalendarIsoV3)),
      todayIso = agendaCalendarIsoV3(new Date()),
      weekDayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
      weekEvents = (data.events || []).filter((event) =>
        daySet.has(String(event.date || "")),
      ),
      atlasTimeline = AgendaAtlasTimelineV1({ props: {
        days: days.map((date) => ({ date, iso: agendaCalendarIsoV3(date) })),
        events: weekEvents,
        todayIso,
        esc,
      } }).next().value,
      pickerDate =
        days.find((date) => agendaCalendarIsoV3(date) === todayIso) ||
        days[1] ||
        days[0],
      mobileDaysMarkup = days
        .map((date) => {
          const iso = agendaCalendarIsoV3(date),
            dayEvents = weekEvents
              .filter((event) => event.date === iso)
              .sort((left, right) =>
                String(left.start || "").localeCompare(String(right.start || "")),
              );
          return `<section class="agenda-mobile-day-v8 ${iso === todayIso ? "today" : ""}"><header><time datetime="${esc(iso)}">${esc(date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</time><b>${dayEvents.length}</b></header>${dayEvents.length ? `<div>${dayEvents
            .map(
              (event) =>
                `<button type="button" class="agenda-mobile-event-v8 ${agendaCalendarStatusToneV3(event.status)}" data-agenda-mobile-edit="${esc(event.id)}"><span class="agenda-mobile-event-time-v8">${esc(event.start || "Horário a definir")}<small>${Number(event.durationHours || 1)}h · ${Number(event.spanDays || 1)}d</small></span><span class="agenda-mobile-event-copy-v8"><strong>${esc(event.title || "Compromisso")}</strong><small>${esc(event.activityName || "Atividade")} · ${esc(event.stageName || "Etapa")}</small><em>${esc(event.owner || "Responsável a definir")}</em></span><span class="agenda-custom-status">${esc(event.status || "Planejado")}</span></button>`,
            )
            .join("")}</div>` : '<p class="agenda-mobile-empty-v8">Sem compromissos neste dia.</p>'}</section>`;
        })
        .join("");

    return `<section class="stage-agenda-month-page-v3 agenda-week-page-v8" data-agenda-week-v8="${esc(weekKey)}">
  <style>
  .stage-agenda-month-page-v3{--agenda-gap:8px;--agenda-hour-px:38.4px;--agenda-half-hour-px:19.2px;--agenda-time-height:921.6px;--agenda-day-header-height:38px;--agenda-shift-gutter:42px;width:100%;min-width:0;height:calc(100dvh - 88px);max-height:calc(100dvh - 88px);min-height:520px;box-sizing:border-box;padding:12px 16px 10px;background:#0d121a;color:#e8edf6;overflow:hidden;display:flex;flex-direction:column}
  .agenda-week-fixed-v8{flex:0 0 auto;position:relative;z-index:100;background:#0d121a;padding-bottom:8px;border-bottom:1px solid #344255}
  .stage-agenda-month-head-v3{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:end;gap:16px;margin-bottom:10px}
  .stage-agenda-month-head-v3>div:first-child h1{margin:3px 0 2px;font-size:23px}
  .stage-agenda-month-head-v3>div:first-child p{margin:0;color:#8d9aab;font-size:11px}
  .agenda-month-pagination-v3{display:flex;align-items:center;gap:7px;justify-self:center}
  .agenda-month-pagination-v3 button,.agenda-month-actions-v3 button{height:34px;border:1px solid #405167;background:#111b29;color:#dce8f7;cursor:pointer;padding:0 11px}
  .agenda-month-pagination-v3 b{min-width:205px;text-align:center;text-transform:capitalize;font-size:14px}
  .agenda-week-picker-v8{height:34px;min-width:135px;box-sizing:border-box;border:1px solid #405167;background:#0b121c;color:#e7eef9;padding:0 7px;color-scheme:dark}
  .agenda-month-actions-v3{justify-self:end}.agenda-month-actions-v3 .primary{border-color:#d79b0d;background:#f4b62b;color:#08111b;font-weight:900}

  .agenda-month-editor-v3{border:1px solid #3c5675;background:#101a27;padding:10px 12px;margin:0}
  .agenda-month-editor-v3>header{display:flex;justify-content:space-between;align-items:start;gap:16px;margin-bottom:9px}
  .agenda-month-editor-v3 h3{margin:2px 0;font-size:16px}.agenda-month-editor-v3 p{margin:0;color:#8d9aab;font-size:10px}
  .agenda-editor-grid-v3{display:grid;grid-template-columns:2fr 1.15fr 1.55fr 1.15fr repeat(5,minmax(105px,.72fr));gap:7px}
  .agenda-editor-grid-v3 label{display:grid;gap:3px;font-size:9px;color:#9fb1c7;text-transform:uppercase;letter-spacing:.06em}
  .agenda-editor-grid-v3 input,.agenda-editor-grid-v3 select{min-width:0;height:31px;background:#0a111a;border:1px solid #3b495c;color:#fff;padding:0 7px}
  .agenda-month-editor-v3 footer{display:flex;align-items:center;gap:9px;margin-top:8px}.agenda-month-editor-v3 footer span{flex:1;color:#8191a5;font-size:10px}
  .agenda-month-editor-v3 button{height:31px;border:1px solid #43536a;background:#162131;color:#fff;padding:0 10px;cursor:pointer}.agenda-month-editor-v3 .activity-install-primary{background:#1266ef;border-color:#2475ff}.agenda-month-editor-v3 .danger{border-color:#6b323a;color:#ff8c98}

  /* ÚNICO container rolável: o cabeçalho/paginação acima permanece fixo. */
  .agenda-week-viewport-v8{flex:1 1 auto;min-height:0;width:100%;overflow:auto;scrollbar-gutter:stable;overscroll-behavior:contain;background:#0b1118;border:1px solid #2b3745;margin-top:8px;position:relative}
  .agenda-week-viewport-v8::-webkit-scrollbar{width:13px;height:13px}
  .agenda-week-viewport-v8::-webkit-scrollbar-track{background:#080d13;border:1px solid #222c38}
  .agenda-week-viewport-v8::-webkit-scrollbar-thumb{background:#34475d;border:2px solid #080d13}
  .agenda-week-canvas-v8{--calendar-wide:calc(233.333333% + var(--agenda-shift-gutter));width:var(--calendar-wide);min-width:1760px;display:grid;grid-template-columns:var(--agenda-shift-gutter) minmax(0,1fr);align-items:start;position:relative;padding-bottom:2px}

  /* Etiquetas dos turnos em uma faixa lateral mínima, sem repetição em cada dia. */
  .agenda-shift-gutter-v8{position:sticky;left:0;z-index:65;width:var(--agenda-shift-gutter);height:calc(var(--agenda-day-header-height) + var(--agenda-time-height));background:#0a1017;border-right:1px solid #354355;box-sizing:border-box}
  .agenda-shift-gutter-title-v8{height:var(--agenda-day-header-height);display:flex;align-items:center;justify-content:center;border-bottom:1px solid #344255;color:#62758c;font-size:7px;letter-spacing:.06em}
  .agenda-shift-scale-v8{height:var(--agenda-time-height);position:relative}
  .agenda-shift-scale-v8 span{position:absolute;left:2px;right:2px;font-size:7px;line-height:1.05;color:#75869b;text-align:center;padding:2px 0;border-top:1px dashed rgba(126,149,176,.28);background:#0a1017cc}
  .agenda-shift-scale-v8 span:nth-child(1){top:0}
  .agenda-shift-scale-v8 span:nth-child(2){top:33.333333%}
  .agenda-shift-scale-v8 span:nth-child(3){top:66.666667%}

  .agenda-week-track-v8{min-width:0;position:relative}
  .agenda-month-weekdays-v3{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--agenda-gap);height:var(--agenda-day-header-height);position:sticky;top:0;z-index:55;background:#0b1118;padding:0 0 0}
  .agenda-month-weekdays-v3 b{display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #2b3645;background:#141a22;font-size:10px;letter-spacing:.07em;color:#8ea2ba;box-sizing:border-box}
  .agenda-month-weekdays-v3 b strong{font-size:15px;color:#e7edf6;letter-spacing:0}
  .agenda-month-weekdays-v3 b.today{border-color:#3184ff;color:#71a9ff}
  .agenda-week-days-v8{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--agenda-gap);overflow:visible}
  .agenda-month-day-v3{height:var(--agenda-time-height);position:relative;overflow:visible;border:1px solid #303b49;border-top:0;background:#11161d;box-sizing:border-box}
  .agenda-month-day-v3.today{border-color:#3184ff;box-shadow:inset 0 0 0 1px #3184ff}
  .agenda-month-day-v3>header{display:none}
  .agenda-month-day-body-v3{position:absolute;inset:0;height:var(--agenda-time-height);overflow:visible;background-image:linear-gradient(to bottom,rgba(125,149,176,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(125,149,176,.23) 1px,transparent 1px);background-size:100% var(--agenda-half-hour-px),100% var(--agenda-hour-px)}
  .agenda-month-shifts-v3{display:none}

  /* Dimensão real do card = horário e duração. */
  .agenda-month-event-v3{position:absolute;left:0;min-height:0;box-sizing:border-box;border:1px solid #536780;background:#182536;color:#fff;z-index:8;cursor:grab;user-select:none;overflow:visible;touch-action:none;box-shadow:0 3px 12px #0005;pointer-events:auto}
  .agenda-month-event-v3.active{background:#15375c;border-color:#357fc5}.agenda-month-event-v3.warning{background:#4a3914;border-color:#d4a924}.agenda-month-event-v3.done{background:#163d2a;border-color:#34a56d}.agenda-month-event-v3.planned{background:#262f3c;border-color:#657488}
  .agenda-month-event-v3.dragging{opacity:.84;z-index:90;box-shadow:0 14px 36px #000a;cursor:grabbing}
  .agenda-month-event-body-v3{height:100%;padding:5px 18px 5px 9px;display:grid;grid-template-columns:1fr;grid-template-rows:auto auto auto auto;gap:2px;box-sizing:border-box;overflow:hidden}
  .agenda-event-time-v4{display:flex;align-items:center;gap:7px;justify-content:space-between;min-width:0}
  .agenda-event-time-v4 time{font-size:9px;color:#8fbbff;font-weight:900;white-space:nowrap}
  .agenda-event-time-v4 span{font-size:8px;color:#b6c2d0;border:1px solid #637389;padding:0 4px;white-space:nowrap}
  .agenda-month-event-body-v3 strong{font-size:12px;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .agenda-month-event-body-v3 small{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c7d3e2}
  .agenda-month-event-body-v3 em{font-size:8px;font-style:normal;color:#9eabba;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .agenda-month-event-v3.micro .agenda-month-event-body-v3{display:flex;align-items:center;gap:7px;padding:1px 18px 1px 7px}.agenda-month-event-v3.micro .agenda-event-time-v4 span,.agenda-month-event-v3.micro small,.agenda-month-event-v3.micro em{display:none}.agenda-month-event-v3.micro strong{font-size:9px}
  .agenda-month-event-v3.compact .agenda-month-event-body-v3{grid-template-rows:auto auto;padding-top:3px;padding-bottom:3px}.agenda-month-event-v3.compact small,.agenda-month-event-v3.compact em{display:none}
  .agenda-month-event-v3.short .agenda-month-event-body-v3{grid-template-rows:auto auto auto}.agenda-month-event-v3.short em{display:none}
  .agenda-week-mobile-list{display:none}

  .agenda-resize-edge-v4{position:absolute;z-index:25;opacity:.26;transition:opacity .12s,background .12s;pointer-events:auto}
  .agenda-month-event-v3:hover .agenda-resize-edge-v4,.agenda-month-event-v3:focus-within .agenda-resize-edge-v4{opacity:1}
  .agenda-resize-days-v3{right:-7px;top:5px;bottom:5px;width:15px;cursor:ew-resize;background:linear-gradient(90deg,transparent,#7ab0ff)}
  .agenda-resize-start-days-v4{left:-7px;top:5px;bottom:5px;width:15px;cursor:ew-resize;background:linear-gradient(90deg,#7ab0ff,transparent)}
  .agenda-resize-hours-v3{left:5px;right:5px;bottom:-7px;height:15px;cursor:ns-resize;background:linear-gradient(transparent,#7ab0ff)}
  .agenda-resize-start-hours-v4{left:5px;right:5px;top:-7px;height:15px;cursor:ns-resize;background:linear-gradient(#7ab0ff,transparent)}
  .agenda-resize-days-v3::after,.agenda-resize-start-days-v4::after,.agenda-resize-hours-v3::after,.agenda-resize-start-hours-v4::after{position:absolute;background:#07111e;border:1px solid #5479a8;color:#bcd6ff;font-size:8px;line-height:16px;height:16px;padding:0 5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s}
  .agenda-month-event-v3:hover .agenda-resize-edge-v4::after{opacity:.94}
  .agenda-resize-days-v3::after{content:"dia final";right:9px;top:50%;transform:translateY(-50%)}
  .agenda-resize-start-days-v4::after{content:"dia inicial";left:9px;top:50%;transform:translateY(-50%)}
  .agenda-resize-hours-v3::after{content:"hora final";bottom:9px;left:50%;transform:translateX(-50%)}
  .agenda-resize-start-hours-v4::after{content:"hora inicial";top:9px;left:50%;transform:translateX(-50%)}

  .stage-agenda-month-foot-v3{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:7px 2px 0;color:#77879a;font-size:9px}
  @media(max-width:1250px){.agenda-week-canvas-v8{min-width:1500px}.agenda-editor-grid-v3{grid-template-columns:repeat(4,minmax(150px,1fr))}}
  @media(max-width:760px){.stage-agenda-month-page-v3{height:auto;max-height:none;min-height:0;overflow:visible;padding:9px 10px calc(22px + env(safe-area-inset-bottom))}.agenda-week-fixed-v8{position:relative;padding-bottom:10px}.stage-agenda-month-head-v3{grid-template-columns:minmax(0,1fr);align-items:stretch;gap:9px}.stage-agenda-month-head-v3>div:first-child h1{font-size:20px}.stage-agenda-month-head-v3>div:first-child p{font-size:10px}.agenda-month-pagination-v3{width:100%;justify-self:stretch;justify-content:space-between;gap:5px}.agenda-month-pagination-v3 b{min-width:0;flex:1;font-size:12px}.agenda-month-pagination-v3 button,.agenda-week-picker-v8{height:40px}.agenda-month-actions-v3{justify-self:stretch}.agenda-month-actions-v3 button{width:100%;height:44px}.agenda-month-editor-v3{padding:10px}.agenda-month-editor-v3>header{gap:8px}.agenda-editor-grid-v3{grid-template-columns:1fr 1fr}.agenda-editor-grid-v3 label{min-width:0}.agenda-month-editor-v3 footer{align-items:stretch;flex-wrap:wrap}.agenda-month-editor-v3 footer span{flex-basis:100%}.agenda-month-editor-v3 footer button{min-height:42px}.agenda-week-viewport-v8{flex:none;min-height:0;width:100%;overflow:visible;border:0;margin-top:10px}.agenda-week-canvas-v8{display:none}.agenda-week-mobile-list{display:grid;gap:8px}.agenda-mobile-day-v8{min-width:0;border:1px solid #2b3745;background:#101923}.agenda-mobile-day-v8.today{border-color:#3184ff}.agenda-mobile-day-v8>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border-bottom:1px solid #2b3745;background:#141e2b}.agenda-mobile-day-v8>header time{font-size:12px;font-weight:700;text-transform:capitalize}.agenda-mobile-day-v8>header b{display:grid;place-items:center;min-width:24px;height:24px;border-radius:50%;background:#1d3553;color:#c6e0ff;font-size:10px}.agenda-mobile-day-v8>div{display:grid;gap:6px;padding:7px}.agenda-mobile-event-v8{display:grid;grid-template-columns:minmax(54px,auto) minmax(0,1fr);gap:8px;width:100%;min-height:62px;padding:9px;border:1px solid #405167;border-left:3px solid #657488;border-radius:8px;background:#182536;color:#e8edf6;text-align:left}.agenda-mobile-event-v8.active{border-left-color:#357fc5;background:#15375c}.agenda-mobile-event-v8.warning{border-left-color:#d4a924;background:#4a3914}.agenda-mobile-event-v8.done{border-left-color:#34a56d;background:#163d2a}.agenda-mobile-event-time-v8{display:grid;align-content:start;gap:4px;color:#8fbbff;font-size:11px;font-weight:800;white-space:nowrap}.agenda-mobile-event-time-v8 small{color:#9eabba;font-size:9px;font-weight:500}.agenda-mobile-event-copy-v8{display:grid;gap:3px;min-width:0}.agenda-mobile-event-copy-v8 strong,.agenda-mobile-event-copy-v8 small,.agenda-mobile-event-copy-v8 em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.agenda-mobile-event-copy-v8 strong{font-size:11px}.agenda-mobile-event-copy-v8 small,.agenda-mobile-event-copy-v8 em{color:#b6c2d0;font-size:9px}.agenda-mobile-event-copy-v8 em{color:#9eabba;font-style:normal}.agenda-mobile-event-v8>.agenda-custom-status{grid-column:2;justify-self:start;font-size:9px}.agenda-mobile-empty-v8{margin:0;padding:10px 11px;color:#8191a5;font-size:10px}.stage-agenda-month-foot-v3{align-items:flex-start;flex-direction:column;gap:5px;padding:10px 2px 0}}
  </style>

  ${state.agendaCalendarErrorV3 ? `<p role="alert" class="agenda-atlas-error">${esc(state.agendaCalendarErrorV3)}</p>` : !state.agendaCalendarLoadedV3 ? '<p role="status">Carregando agenda do banco de dados…</p>' : ''}
  <div class="agenda-week-fixed-v8">
    <header class="stage-agenda-month-head-v3">
      <div>
        <span class="activity-kind">CALENDÁRIO OPERACIONAL · OBRA</span>
        <h1>Agenda</h1>
        <p>Linha do tempo dos compromissos da obra.</p>
      </div>
      <div class="agenda-month-pagination-v3">
        <button type="button" data-agenda-week-shift-v8="-1" aria-label="Semana anterior">‹</button>
        <b>${esc(agendaCalendarWeekLabelV8(weekKey))}</b>
        <input class="agenda-week-picker-v8" type="date" data-agenda-week-picker-v8 value="${esc(agendaCalendarIsoV3(pickerDate))}" aria-label="Escolher uma data da semana">
        <button type="button" data-agenda-week-shift-v8="1" aria-label="Próxima semana">›</button>
      </div>
      <div class="agenda-month-actions-v3">
        <button type="button" class="primary" data-agenda-new-v3${state.agendaCalendarErrorV3 || !state.agendaCalendarLoadedV3 ? ' disabled title="Agenda indisponível até que a conexão com o servidor seja restabelecida"' : ''}>${ico("plus")} Novo compromisso</button>
      </div>
    </header>
    ${agendaCalendarFormMarkupV3(stage, data, weekKey)}
  </div>

  ${atlasTimeline}
  <div class="agenda-week-viewport-v8" data-agenda-horizontal-v4 data-agenda-week-scroll-v8 hidden>
    <div class="agenda-week-canvas-v8">
      <aside class="agenda-shift-gutter-v8" aria-label="Turnos">
        <div class="agenda-shift-gutter-title-v8">TURNO</div>
        <div class="agenda-shift-scale-v8">
          <span>MANHÃ<br>00—08</span>
          <span>TARDE<br>08—16</span>
          <span>NOITE<br>16—24</span>
        </div>
      </aside>
      <div class="agenda-week-track-v8">
        <div class="agenda-month-weekdays-v3">
          ${days
            .map((date, index) => {
              const iso = agendaCalendarIsoV3(date);
              return `<b class="${iso === todayIso ? "today" : ""}"><span>${weekDayNames[index]}</span><strong>${date.getDate()}</strong>${iso === todayIso ? "<small>HOJE</small>" : ""}</b>`;
            })
            .join("")}
        </div>
        <section class="agenda-week-days-v8">
          ${days
            .map((date) => {
              const iso = agendaCalendarIsoV3(date),
                weekdayIndex = date.getDay(),
                dayEvents = weekEvents.filter((event) => event.date === iso);
              return `<article class="agenda-month-day-v3 ${iso === todayIso ? "today" : ""}" data-agenda-day-v3="${iso}"><header></header><div class="agenda-month-day-body-v3">${dayEvents
                .map((event) => agendaCalendarEventMarkupV3(event, weekdayIndex))
                .join("")}</div></article>`;
            })
            .join("")}
        </section>
      </div>
    </div>
    <div class="agenda-week-mobile-list" aria-label="Compromissos da semana">${mobileDaysMarkup}</div>
  </div>

  <footer class="stage-agenda-month-foot-v3">
    <span>${ico("move")} Abra o calendário para ajustar dia e horário por arraste.</span>
    <b>${weekEvents.length} compromisso(s) na semana · Fuso America/Bahia</b>
  </footer>
  </section>`;
  };

  ViewLayer.prototype.agenda = function () {
    return agendaCalendarMarkupV3(extensionStage());
  };

  const bindAgendaCalendarV8 = (ViewLayer) => {
    const previousBind = ViewLayer.prototype.bind;
    ViewLayer.prototype.bind = function (...args) {
      const result = previousBind?.apply(this, args);
      const state = appStore.get();
        const agendaCalendarRootV5 = this.querySelector(
          ".stage-agenda-month-page-v3",
        );
        if (agendaCalendarRootV5) {
          if(!state.agendaCalendarLoadedV3 && !state.agendaCalendarLoadingV3){
            appStore.set({agendaCalendarLoadingV3:true});
            Promise.resolve().then(async()=>{
              if(typeof apiFetch!=="function")throw new Error("Cliente da API da agenda indisponível.");
              const response=await apiFetch("/api/agenda-events",{cache:"no-store"});
              const payload=await response.json().catch(()=>({}));
              if(!response.ok||!Array.isArray(payload.events))throw new Error(payload.error||`HTTP ${response.status}`);
              appStore.set({agendaCalendarLoadedV3:true,agendaCalendarLoadingV3:false,agendaCalendarErrorV3:"",agendaDatabaseEventsV3:payload.events});
            }).catch(error=>{
              const detail=String(error?.message||error);
              const authUnavailable=/default credentials|OAuth2 access token|Project Id|Autentica|HTTP 401/i.test(detail);
              appStore.set({agendaCalendarLoadedV3:true,agendaCalendarLoadingV3:false,
                agendaCalendarErrorV3:authUnavailable
                  ? "A agenda está indisponível porque o servidor não tem credenciais de autenticação configuradas."
                  : `Não foi possível carregar a agenda: ${detail}`,agendaDatabaseEventsV3:[]});
            });
          }
          let agendaLinkSourceV1 = "";
          const calendarRoot = agendaCalendarRootV5,
            editor = calendarRoot?.querySelector("[data-agenda-editor-v3]"),
            form = editor?.querySelector("[data-agenda-editor-form]"),
            readData = () => {
              const stored = agendaCalendarReadV3();
              return stored;
            },
            commit = async (events, action) => {
              events=await agendaCalendarWriteV3({ version: 3, initialized: true, events });
      
              // O calendário é uma projeção visual dos apontamentos. Sempre que um
              // card muda, data/hora/duração precisam voltar ao modelo operacional.
              const current = appStore.get(),
                existingAgenda = Array.isArray(current.operationalAgenda)
                  ? current.operationalAgenda
                  : [],
                represented = new Set(),
                projectedAgenda = (events || []).map((event) => {
                  const rawId = String(event.id || ""),
                    sourceId = rawId.startsWith("agenda-op-")
                      ? rawId.slice("agenda-op-".length)
                      : rawId,
                    existing =
                      existingAgenda.find(
                        (item) =>
                          String(item?.id || "") === sourceId ||
                          `agenda-op-${String(item?.id || "")}` === rawId,
                      ) || {};
                  represented.add(String(existing?.id || sourceId));
                  return {
                    ...existing,
                    id: existing?.id || sourceId,
                    title: event.title,
                    name: event.title,
                    stageKey: event.stageKey,
                    stageName: event.stageName,
                    activityId: event.activityId,
                    activity: event.activityName,
                    relatedFrom: event.relatedFrom || "",
                    owner: event.owner,
                    responsible: event.owner,
                    status: event.status,
                    date: event.date,
                    start: event.start,
                    time: event.start,
                    durationHours: Number(event.durationHours || 0.5),
                    spanDays: Number(event.spanDays || 1),
                    durationDays: Number(event.spanDays || 1),
                    plannedStart: `${event.date}T${event.start}:00`,
                  };
                }),
                untouched = existingAgenda.filter(
                  (item) => !represented.has(String(item?.id || "")),
                );
      
              appStore.set({
                operationalAgenda: [...untouched, ...projectedAgenda],
                agendaCalendarRevisionV3: Date.now(),
                agendaCalendarRevisionV7: Date.now(),
                lastAction: action,
              });
            },
            visibleWeek =
              calendarRoot?.dataset.agendaWeekV8 ||
              agendaCalendarInitialWeekV8(state, readData()),
            filterActivityOptions = () => {
              if (!form) return;
              const stageKey = form.elements.stageKey?.value || "",
                options = [...form.querySelectorAll("[data-agenda-activity-stage]")],
                visible = options.filter(
                  (option) =>
                    String(option.dataset.agendaActivityStage) === String(stageKey),
                );
              options.forEach((option) => {
                const active =
                  String(option.dataset.agendaActivityStage) === String(stageKey);
                option.hidden = !active;
                option.disabled = !active;
              });
              if (
                visible.length &&
                !visible.some(
                  (option) =>
                    String(option.value) === String(form.elements.activityId?.value),
                )
              )
                form.elements.activityId.value = visible[0].value;
            },
            showEditor = (eventData = null) => {
              if (!editor || !form) return;
              const data = readData(),
                selectedStage = extensionStage(),
                slot = agendaCalendarLastAvailableSlotV8(
                  data.events || [],
                  visibleWeek,
                ),
                event = eventData || null;
      
              form.reset();
              agendaLinkSourceV1 = event?.relatedFrom || "";
              form.elements.id.value = event?.id || "";
              form.elements.stageKey.value =
                event?.stageKey || selectedStage?.key || form.elements.stageKey.value;
              filterActivityOptions();
      
              if (event?.activityId)
                form.elements.activityId.value = event.activityId;
              form.elements.title.value = event?.title || "";
              form.elements.owner.value =
                event?.owner ||
                stageV9LiveFor(selectedStage)?.owner ||
                selectedStage?.owner ||
                "";
              form.elements.date.value = event?.date || slot.date;
              form.elements.start.value = event?.start || slot.start;
              form.elements.durationHours.value = Number(event?.durationHours || 1.5);
              form.elements.spanDays.value = Number(event?.spanDays || 1);
              form.elements.status.value = event?.status || "Planejado";
      
              editor.hidden = false;
              editor.querySelector("[data-agenda-editor-title]").textContent = event
                ? `Editar · ${event.title}`
                : "Adicionar compromisso";
              const remove = editor.querySelector("[data-agenda-editor-delete]");
              if (remove) remove.hidden = !event;
              requestAnimationFrame(() => form.elements.title?.focus?.());
            },
            updateEvent = (id, updater, action) => {
              const data = readData(),
                events = (data.events || []).map((event) =>
                  String(event.id) === String(id) ? updater({ ...event }) : event,
                );
              commit(events, action).catch(error=>notify(`Não foi possível salvar a agenda: ${error.message}`,"error"));
            };

          const calendarViewport = calendarRoot.querySelector("[data-agenda-week-scroll-v8]");
          const calendarToggle = calendarRoot.querySelector("[data-atlas-calendar-toggle]");
          calendarToggle?.addEventListener("click", () => {
            const opening = calendarViewport.hidden;
            calendarViewport.hidden = !opening;
            calendarToggle.setAttribute("aria-expanded", String(opening));
            calendarToggle.textContent = opening ? "Fechar ajuste de horários" : "Ajustar horários no calendário";
            if (opening) requestAnimationFrame(() => {
              const today = calendarRoot.querySelector(".agenda-month-day-v3.today");
              if (today) calendarViewport.scrollLeft = Math.max(0, today.offsetLeft - calendarViewport.clientWidth / 2);
              calendarViewport.dispatchEvent(new Event("scroll"));
            });
          });
          calendarRoot.querySelectorAll("[data-atlas-timeline-day]").forEach((day) => day.addEventListener("click", () => {
            calendarRoot.querySelectorAll("[data-atlas-timeline-day]").forEach((item) => item.classList.toggle("selected", item === day));
            calendarRoot.querySelector(`[data-atlas-timeline-event-date="${CSS.escape(day.dataset.atlasTimelineDay)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
          }));
      
          calendarRoot
            ?.querySelectorAll("[data-agenda-mobile-edit]")
            .forEach((button) => {
              button.addEventListener("click", () => {
                const event = (readData().events || []).find(
                  (item) => String(item.id) === String(button.dataset.agendaMobileEdit),
                );
                if (event) showEditor(event);
              });
            });
      
          if (state.selectedAgendaEventV3) {
            const selectedEvent = (readData().events || []).find(
              (item) => String(item.id) === String(state.selectedAgendaEventV3),
            );
            if (selectedEvent) showEditor(selectedEvent);
          }
      
          calendarRoot
            ?.querySelectorAll("[data-agenda-week-shift-v8]")
            .forEach((button) => {
              button.addEventListener("click", () => {
                appStore.set({
                  agendaCalendarWeekV8: agendaCalendarShiftWeekV8(
                    visibleWeek,
                    Number(button.dataset.agendaWeekShiftV8 || 0),
                  ),
                  lastAction: "Navegou pela semana da agenda",
                });
              });
            });
      
          calendarRoot
            ?.querySelector("[data-agenda-week-picker-v8]")
            ?.addEventListener("change", (event) => {
              const chosen = String(event.currentTarget.value || "");
              if (!agendaCalendarParseDateV3(chosen)) return;
              appStore.set({
                agendaCalendarWeekV8: agendaCalendarWeekKeyV8(chosen),
                lastAction: `Selecionou a semana de ${chosen}`,
              });
            });
      
          calendarRoot
            ?.querySelector("[data-agenda-new-v3]")
            ?.addEventListener("click", () => showEditor());
      
          editor
            ?.querySelector("[data-agenda-editor-close]")
            ?.addEventListener("click", () => {
              editor.hidden = true;
            });
      
          form?.elements.stageKey?.addEventListener("change", filterActivityOptions);
          filterActivityOptions();
      
          form?.elements.activityId?.addEventListener("change", () => {
            const option = form.elements.activityId.selectedOptions?.[0];
            if (option && !String(form.elements.title.value || "").trim())
              form.elements.title.value =
                option.dataset.agendaActivityTitle ||
                option.textContent.split("·").pop()?.trim() ||
                "";
          });
      
          form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const fd = new FormData(form),
              stage = agendaCalendarFindStageV3(fd.get("stageKey")),
              activityOption = form.elements.activityId.selectedOptions?.[0],
              id = String(fd.get("id") || "").trim(),
              title =
                String(fd.get("title") || "").trim() ||
                activityOption?.dataset.agendaActivityTitle ||
                "Compromisso operacional",
              next = {
                id: id || `agenda-${Date.now().toString(36)}`,
                title,
                stageKey: String(fd.get("stageKey") || ""),
                stageName: stage?.name || "Etapa",
                activityId: String(fd.get("activityId") || ""),
                activityName:
                  activityOption?.dataset.agendaActivityTitle ||
                  activityOption?.textContent?.split("·").pop()?.trim() ||
                  title,
                owner: String(fd.get("owner") || "").trim(),
                date: String(fd.get("date") || ""),
                start: String(fd.get("start") || "08:00"),
                durationHours: Math.max(
                  0.5,
                  Math.min(24, Number(fd.get("durationHours") || 1.5)),
                ),
                spanDays: Math.max(
                  1,
                  Math.min(7, Math.round(Number(fd.get("spanDays") || 1))),
                ),
                status: String(fd.get("status") || "Planejado"),
                relatedFrom: agendaLinkSourceV1,
              },
              data = readData(),
              events = [...(data.events || [])],
              index = events.findIndex((item) => String(item.id) === String(next.id));
            if (!next.date) {
              const slot = agendaCalendarLastAvailableSlotV8(events, visibleWeek);
              next.date = slot.date;
              next.start = slot.start;
            }
            if (index >= 0) events[index] = next;
            else events.push(next);
            try{
              await commit(events,index >= 0
                ? `Atualizou compromisso ${next.title}`
                : `Criou compromisso ${next.title} em ${next.stageName}`);
              editor.hidden = true;
              notify(index >= 0 ? "Compromisso atualizado." : "Compromisso adicionado no calendário.","success");
            }catch(error){notify(`Não foi possível salvar o compromisso: ${error.message}`,"error");}
          });
      
          editor
            ?.querySelector("[data-agenda-editor-delete]")
            ?.addEventListener("click", async () => {
              if (!form) return;
              const id = String(form.elements.id.value || "");
              if (!id) return;
              const data = readData(),
                event = (data.events || []).find((item) => String(item.id) === id),
                events = (data.events || []).filter((item) => String(item.id) !== id);
              try{
                await commit(events, `Removeu compromisso ${event?.title || id} da agenda`);
                editor.hidden = true;
                notify("Compromisso removido.", "warning");
              }catch(error){notify(`Não foi possível excluir o compromisso: ${error.message}`,"error");}
            });
      
          // Interação V7 — manipulação direta da grade.
          // O card não recebe apenas um transform visual: durante o gesto ele é
          // reparentado para o DIA real sob o ponteiro e recebe top/height/width
          // derivados diretamente do apontamento que será salvo.
          const previousAgendaPointerV7 =
            globalThis.__BELAVISTA_AGENDA_POINTER_V7__ ||
            globalThis.__BELAVISTA_AGENDA_POINTER_V5__;
          previousAgendaPointerV7?.destroy?.();
      
          const agendaPointerV7 = {
            root: calendarRoot,
            active: null,
            destroyed: false,
          };
      
          const clampAgendaV7 = (value, min, max) =>
            Math.max(min, Math.min(max, Number(value) || 0));
          const snapHalfHourV7 = (value) => Math.round((Number(value) || 0) * 2) / 2;
          const dayDiffV7 = (fromIso, toIso) => {
            const from = agendaCalendarParseDateV3(fromIso),
              to = agendaCalendarParseDateV3(toIso);
            if (!from || !to) return 0;
            return Math.round(
              (new Date(to.getFullYear(), to.getMonth(), to.getDate()) -
                new Date(from.getFullYear(), from.getMonth(), from.getDate())) /
                86400000,
            );
          };
      
          const dayAtPointV7 = (x, y) => {
            const elements = document.elementsFromPoint?.(x, y) || [],
              day = elements.find(
                (element) =>
                  element?.matches?.("[data-agenda-day-v3]") &&
                  calendarRoot.contains(element),
              );
            return day || null;
          };
      
          const bodyForDayV7 = (day) =>
            day?.querySelector?.(".agenda-month-day-body-v3") || null;
      
          const timeAtPointerV7 = (day, clientY, grabOffsetPx = 0) => {
            const body = bodyForDayV7(day),
              rect = body?.getBoundingClientRect();
            if (!rect) return 0;
            const px = clampAgendaV7(
                clientY - rect.top - Number(grabOffsetPx || 0),
                0,
                AGENDA_CALENDAR_DAY_BODY_HEIGHT_V6 -
                  AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6,
              ),
              hours = px / AGENDA_CALENDAR_PIXELS_PER_HOUR_V6;
            return clampAgendaV7(snapHalfHourV7(hours), 0, 23.5);
          };
      
          const endTimeAtPointerV7 = (day, clientY) => {
            const body = bodyForDayV7(day),
              rect = body?.getBoundingClientRect();
            if (!rect) return 0.5;
            const px = clampAgendaV7(
                clientY - rect.top,
                AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6,
                AGENDA_CALENDAR_DAY_BODY_HEIGHT_V6,
              ),
              hours = px / AGENDA_CALENDAR_PIXELS_PER_HOUR_V6;
            return clampAgendaV7(snapHalfHourV7(hours), 0.5, 24);
          };
      
          const modeFromTargetV7 = (target, card) => {
            if (target.closest("[data-agenda-resize-start-days]"))
              return "start-days";
            if (target.closest("[data-agenda-resize-days]")) return "end-days";
            if (target.closest("[data-agenda-resize-start-hours]"))
              return "start-hours";
            if (target.closest("[data-agenda-resize-hours]")) return "end-hours";
            return card ? "move" : "";
          };
      
          const normalizedPreviewV7 = (source) => {
            const startHours = agendaCalendarTimeToHoursV3(source.start || "08:00"),
              duration = clampAgendaV7(
                snapHalfHourV7(source.durationHours || 0.5),
                0.5,
                Math.max(0.5, 24 - startHours),
              ),
              date = String(source.date || ""),
              weekday = Number(agendaCalendarParseDateV3(date)?.getDay() || 0),
              span = clampAgendaV7(
                Math.round(Number(source.spanDays || 1)),
                1,
                Math.max(1, 7 - weekday),
              );
            return {
              ...source,
              date,
              start: agendaCalendarHoursToTimeV3(startHours),
              durationHours: duration,
              spanDays: span,
            };
          };
      
          const applyPreviewV7 = (active, preview) => {
            const card = active?.card;
            if (!card || !preview) return false;
      
            const targetDay = calendarRoot.querySelector(
                `[data-agenda-day-v3="${CSS.escape(preview.date)}"]`,
              ),
              targetBody = bodyForDayV7(targetDay);
            if (!targetDay || !targetBody) return false;
      
            const normalized = normalizedPreviewV7(preview),
              startHours = agendaCalendarTimeToHoursV3(normalized.start),
              duration = Number(normalized.durationHours || 0.5),
              span = Number(normalized.spanDays || 1),
              topPx = startHours * AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
              heightPx = duration * AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
              gapPx = 8,
              widthGap = Math.max(0, span - 1) * gapPx;
      
            // Reparentar é o ponto central: o card passa a pertencer visualmente ao
            // dia de destino durante o arraste, em vez de apenas "flutuar" por transform.
            if (card.parentElement !== targetBody) targetBody.appendChild(card);
      
            card.style.transform = "";
            card.style.transformOrigin = "";
            card.style.left = "0px";
            card.style.top = `${topPx}px`;
            card.style.height = `${heightPx}px`;
            card.style.width = `calc(${span * 100}% + ${widthGap}px)`;
      
            card.dataset.agendaEventDate = normalized.date;
            card.dataset.agendaEventStart = normalized.start;
            card.dataset.agendaEventDuration = String(duration);
            card.dataset.agendaEventSpan = String(span);
            card.dataset.agendaPreviewDateV7 = normalized.date;
            card.dataset.agendaPreviewStartV7 = normalized.start;
            card.dataset.agendaPreviewDurationV7 = String(duration);
            card.dataset.agendaPreviewSpanV7 = String(span);
      
            const end = Math.min(24, startHours + duration),
              timeNode = card.querySelector(".agenda-event-time-v4 time"),
              badge = card.querySelector(".agenda-event-time-v4 span");
            if (timeNode)
              timeNode.textContent = `${normalized.start}—${agendaCalendarHoursToTimeV3(
                Math.min(23.5, end),
              )}`;
            if (badge) badge.textContent = `${duration}h · ${span}d`;
      
            active.preview = normalized;
            return true;
          };
      
          const restoreOriginalV7 = (active) => {
            if (!active?.card || !active?.original) return;
            applyPreviewV7(active, active.original);
            active.card.classList.remove("dragging");
          };
      
          const autoScrollV7 = (event, active) => {
            const scroller = active?.horizontalScroller;
            if (!scroller) return;
            const rect = scroller.getBoundingClientRect(),
              edge = 90;
            if (event.clientX > rect.right - edge) scroller.scrollLeft += 24;
            else if (event.clientX < rect.left + edge) scroller.scrollLeft -= 24;
          };
      
          const previewFromPointerV7 = (event, active) => {
            const original = active.original,
              current = active.preview || original,
              mode = active.mode;
      
            if (mode === "move") {
              autoScrollV7(event, active);
              const targetDay =
                  dayAtPointV7(event.clientX, event.clientY) ||
                  calendarRoot.querySelector(
                    `[data-agenda-day-v3="${CSS.escape(current.date)}"]`,
                  ),
                targetDate =
                  targetDay?.dataset.agendaDayV3 || current.date || original.date,
                startHours = timeAtPointerV7(
                  targetDay,
                  event.clientY,
                  active.grabOffsetY,
                ),
                targetWeekday = Number(
                  agendaCalendarParseDateV3(targetDate)?.getDay() || 0,
                );
              return normalizedPreviewV7({
                ...original,
                date: targetDate,
                start: agendaCalendarHoursToTimeV3(startHours),
                spanDays: Math.min(
                  Number(original.spanDays || 1),
                  Math.max(1, 7 - targetWeekday),
                ),
              });
            }
      
            if (mode === "start-hours") {
              const day = calendarRoot.querySelector(
                  `[data-agenda-day-v3="${CSS.escape(original.date)}"]`,
                ),
                originalStart = agendaCalendarTimeToHoursV3(original.start),
                originalEnd = Math.min(
                  24,
                  originalStart + Number(original.durationHours || 0.5),
                ),
                nextStart = clampAgendaV7(
                  timeAtPointerV7(day, event.clientY, 0),
                  0,
                  Math.max(0, originalEnd - 0.5),
                );
              return normalizedPreviewV7({
                ...original,
                start: agendaCalendarHoursToTimeV3(nextStart),
                durationHours: Math.max(0.5, snapHalfHourV7(originalEnd - nextStart)),
              });
            }
      
            if (mode === "end-hours") {
              const day = calendarRoot.querySelector(
                  `[data-agenda-day-v3="${CSS.escape(original.date)}"]`,
                ),
                startHours = agendaCalendarTimeToHoursV3(original.start),
                endHours = clampAgendaV7(
                  endTimeAtPointerV7(day, event.clientY),
                  startHours + 0.5,
                  24,
                );
              return normalizedPreviewV7({
                ...original,
                durationHours: Math.max(0.5, snapHalfHourV7(endHours - startHours)),
              });
            }
      
            if (mode === "start-days") {
              autoScrollV7(event, active);
              const targetDay =
                  dayAtPointV7(event.clientX, event.clientY) ||
                  calendarRoot.querySelector(
                    `[data-agenda-day-v3="${CSS.escape(original.date)}"]`,
                  ),
                targetDate = targetDay?.dataset.agendaDayV3 || original.date,
                originalEndDate = agendaCalendarAddDaysV3(
                  original.date,
                  Number(original.spanDays || 1) - 1,
                ),
                originalWeekday = Number(
                  agendaCalendarParseDateV3(original.date)?.getDay() || 0,
                ),
                endWeekday = Number(
                  agendaCalendarParseDateV3(originalEndDate)?.getDay() || 0,
                ),
                targetWeekday = Number(
                  agendaCalendarParseDateV3(targetDate)?.getDay() || 0,
                );
      
              // A largura visual de um card não atravessa para outra linha semanal.
              // A aresta esquerda pode ir do domingo da linha até o dia final atual.
              const minDate = agendaCalendarAddDaysV3(
                  original.date,
                  -originalWeekday,
                ),
                maxDate = originalEndDate,
                min = agendaCalendarParseDateV3(minDate)?.getTime() || 0,
                max = agendaCalendarParseDateV3(maxDate)?.getTime() || 0,
                candidate = agendaCalendarParseDateV3(targetDate)?.getTime() || min,
                clampedDate =
                  candidate < min ? minDate : candidate > max ? maxDate : targetDate,
                nextSpan = Math.max(1, dayDiffV7(clampedDate, originalEndDate) + 1);
              return normalizedPreviewV7({
                ...original,
                date: clampedDate,
                spanDays: nextSpan,
              });
            }
      
            if (mode === "end-days") {
              autoScrollV7(event, active);
              const targetDay =
                  dayAtPointV7(event.clientX, event.clientY) ||
                  calendarRoot.querySelector(
                    `[data-agenda-day-v3="${CSS.escape(
                      agendaCalendarAddDaysV3(
                        original.date,
                        Number(original.spanDays || 1) - 1,
                      ),
                    )}"]`,
                  ),
                targetDate =
                  targetDay?.dataset.agendaDayV3 ||
                  agendaCalendarAddDaysV3(
                    original.date,
                    Number(original.spanDays || 1) - 1,
                  ),
                startWeekday = Number(
                  agendaCalendarParseDateV3(original.date)?.getDay() || 0,
                ),
                maxDate = agendaCalendarAddDaysV3(original.date, 6 - startWeekday),
                startMs = agendaCalendarParseDateV3(original.date)?.getTime() || 0,
                maxMs = agendaCalendarParseDateV3(maxDate)?.getTime() || 0,
                candidate =
                  agendaCalendarParseDateV3(targetDate)?.getTime() || startMs,
                clampedDate =
                  candidate < startMs
                    ? original.date
                    : candidate > maxMs
                      ? maxDate
                      : targetDate,
                nextSpan = Math.max(1, dayDiffV7(original.date, clampedDate) + 1);
              return normalizedPreviewV7({
                ...original,
                spanDays: nextSpan,
              });
            }
      
            return normalizedPreviewV7(original);
          };
      
          const agendaPointerMoveV7 = (event) => {
            const active = agendaPointerV7.active;
            if (!active || agendaPointerV7.destroyed) return;
      
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
      
            if (
              Math.hypot(
                event.clientX - active.originX,
                event.clientY - active.originY,
              ) > 3
            )
              active.moved = true;
      
            const preview = previewFromPointerV7(event, active);
            applyPreviewV7(active, preview);
          };
      
          const finishAgendaPointerV7 = (event, cancelled = false) => {
            const active = agendaPointerV7.active;
            if (!active) return;
      
            agendaPointerV7.active = null;
            window.removeEventListener("pointermove", agendaPointerMoveV7, true);
            window.removeEventListener("pointerup", agendaPointerUpV7, true);
            window.removeEventListener("pointercancel", agendaPointerCancelV7, true);
      
            const finalPreview = normalizedPreviewV7(
              active.preview || active.original,
            );
      
            if (cancelled) {
              restoreOriginalV7(active);
              return;
            }
      
            active.card.classList.remove("dragging");
      
            if (!active.moved) {
              restoreOriginalV7(active);
              if (active.mode === "move") showEditor(active.original);
              return;
            }
      
            // Salvar o MESMO objeto que está sendo exibido: posição no dia,
            // hora inicial, duração horária e extensão lateral em dias.
            updateEvent(
              active.id,
              (item) => ({
                ...item,
                date: finalPreview.date,
                start: finalPreview.start,
                durationHours: finalPreview.durationHours,
                spanDays: finalPreview.spanDays,
              }),
              active.mode === "move"
                ? `Reagendou ${active.original.title} para ${finalPreview.date} ${finalPreview.start}`
                : `Redimensionou apontamento ${active.original.title}`,
            );
          };
      
          const agendaPointerUpV7 = (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            finishAgendaPointerV7(event, false);
          };
      
          const agendaPointerCancelV7 = (event) => finishAgendaPointerV7(event, true);
      
          const agendaPointerDownV7 = (event) => {
            if (agendaPointerV7.destroyed) return;
      
            const target = event.target;
            if (!(target instanceof Element)) return;
      
            const card = target.closest("[data-agenda-event-v3]");
            if (target.closest("[data-agenda-link-from]")) return;
            if (
              !card ||
              !calendarRoot.contains(card) ||
              (event.pointerType === "mouse" && Number(event.button) !== 0)
            )
              return;
      
            const id = card.dataset.agendaEventV3,
              data = readData(),
              original = (data.events || []).find(
                (item) => String(item.id) === String(id),
              );
            if (!original) return;
      
            const mode = modeFromTargetV7(target, card),
              cardRect = card.getBoundingClientRect(),
              horizontalScroller = calendarRoot.querySelector(
                "[data-agenda-horizontal-v4]",
              );
      
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
      
            agendaPointerV7.active = {
              id,
              card,
              mode,
              original: normalizedPreviewV7({
                ...original,
              }),
              preview: normalizedPreviewV7({
                ...original,
              }),
              originX: event.clientX,
              originY: event.clientY,
              // Ao mover o corpo, o horário corresponde à posição do topo do
              // card, não à posição exata do cursor dentro dele.
              grabOffsetY: event.clientY - cardRect.top,
              horizontalScroller,
              moved: false,
            };
      
            card.classList.add("dragging");
      
            window.addEventListener("pointermove", agendaPointerMoveV7, {
              capture: true,
              passive: false,
            });
            window.addEventListener("pointerup", agendaPointerUpV7, {
              capture: true,
              passive: false,
              once: true,
            });
            window.addEventListener("pointercancel", agendaPointerCancelV7, {
              capture: true,
              passive: false,
              once: true,
            });
          };
      
          window.addEventListener("pointerdown", agendaPointerDownV7, {
            capture: true,
            passive: false,
          });
          // O mesmo gesto de ligação do PERT cria compromissos vinculados. O editor
          // recebe o dia e a hora do ponto de soltura; o arraste existente permanece.
          calendarRoot.querySelectorAll("[data-agenda-link-from]").forEach((handle) => {
            handle.addEventListener("pointerdown", (event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              const source = handle.dataset.agendaLinkFrom,
                track = calendarRoot.querySelector(".agenda-week-days-v8");
              if (!track) return;
              beginCardCanvasLinkV1({
                event, source, surface: track,
                from: () => {
                  const rect = handle.getBoundingClientRect();
                  return { x: rect.right, y: rect.top + rect.height / 2 };
                },
                onDrop: (pointer) => {
                  const day = dayAtPointV7(pointer.clientX, pointer.clientY);
                  if (!day) return;
                  showEditor();
                  if (!form) return;
                  agendaLinkSourceV1 = source;
                  form.elements.date.value = day.dataset.agendaDayV3;
                  form.elements.start.value = agendaCalendarHoursToTimeV3(
                    timeAtPointerV7(day, pointer.clientY),
                  );
                  editor.querySelector("[data-agenda-editor-title]").textContent =
                    "Novo card relacionado";
                },
              });
            });
          });
      
          const drawAgendaRelationsV1 = () => {
            const track = calendarRoot.querySelector(".agenda-week-days-v8");
            if (!track) return;
            track.querySelector("[data-agenda-relation-layer]")?.remove();
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("agenda-card-relations");
            svg.dataset.agendaRelationLayer = "";
            const bounds = track.getBoundingClientRect();
            svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
            (readData().events || []).forEach((item) => {
              if (!item.relatedFrom) return;
              const from = [...track.querySelectorAll("[data-agenda-event-v3]")]
                  .find((card) => card.dataset.agendaEventV3 === String(item.relatedFrom)),
                to = [...track.querySelectorAll("[data-agenda-event-v3]")]
                  .find((card) => card.dataset.agendaEventV3 === String(item.id));
              if (!from || !to) return;
              const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(),
                x1 = a.right - bounds.left, y1 = a.top + a.height / 2 - bounds.top,
                x2 = b.left - bounds.left, y2 = b.top + b.height / 2 - bounds.top,
                bend = Math.max(35, Math.abs(x2 - x1) * .45),
                path = document.createElementNS("http://www.w3.org/2000/svg", "path");
              path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
              svg.appendChild(path);
            });
            track.prepend(svg);
          };
          requestAnimationFrame(drawAgendaRelationsV1);
          calendarRoot.querySelector("[data-agenda-horizontal-v4]")
            ?.addEventListener("scroll", drawAgendaRelationsV1, { passive: true });
      
          agendaPointerV7.destroy = () => {
            if (agendaPointerV7.destroyed) return;
            agendaPointerV7.destroyed = true;
            window.removeEventListener("pointerdown", agendaPointerDownV7, true);
            window.removeEventListener("pointermove", agendaPointerMoveV7, true);
            window.removeEventListener("pointerup", agendaPointerUpV7, true);
            window.removeEventListener("pointercancel", agendaPointerCancelV7, true);
            if (agendaPointerV7.active) restoreOriginalV7(agendaPointerV7.active);
            agendaPointerV7.active = null;
          };
      
          globalThis.__BELAVISTA_AGENDA_POINTER_V7__ = agendaPointerV7;
          globalThis.__BELAVISTA_AGENDA_POINTER_V5__ = agendaPointerV7;
          calendarRoot.dataset.agendaInteractionsV5 = "direct-v7";
          calendarRoot.dataset.agendaInteractionsV7 = "ready";
          calendarRoot.dataset.agendaWeekV8 = "ready";
      
          requestAnimationFrame(() => {
            const scroller = calendarRoot?.querySelector(
                "[data-agenda-horizontal-v4]",
              ),
              today = calendarRoot?.querySelector(".agenda-month-day-v3.today");
            if (!scroller || !today) return;
            const target =
              today.offsetLeft -
              Math.max(0, (scroller.clientWidth - today.clientWidth) / 2);
            scroller.scrollLeft = Math.max(0, target);
          });
      
          calendarRoot?.querySelectorAll("[data-agenda-day-v3]").forEach((day) => {
            day.addEventListener("dblclick", (event) => {
              if (event.target.closest("[data-agenda-event-v3]")) return;
              showEditor();
              if (form) {
                form.elements.date.value = day.dataset.agendaDayV3;
                const body = day.querySelector(".agenda-month-day-body-v3"),
                  rect = body?.getBoundingClientRect();
                if (rect) {
                  const ratio = Math.max(
                    0,
                    Math.min(
                      1,
                      (event.clientY - rect.top) / Math.max(1, rect.height),
                    ),
                  );
                  form.elements.start.value = agendaCalendarHoursToTimeV3(
                    Math.round(
                      (event.clientY - rect.top) /
                        AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6,
                    ) * 0.5,
                  );
                }
              }
            });
          });
        }
      return result;
    };
  };

  bindAgendaCalendarV8(ViewLayer);

  return Object.freeze({
    AGENDA_CALENDAR_STORAGE_KEY_V3,
    AGENDA_CALENDAR_PIXELS_PER_HOUR_V6,
    AGENDA_CALENDAR_HALF_HOUR_PIXELS_V6,
    AGENDA_CALENDAR_DAY_BODY_HEIGHT_V6,
    agendaCalendarPadV3,
    agendaCalendarIsoV3,
    agendaCalendarMonthKeyV3,
    agendaCalendarParseDateV3,
    agendaCalendarAddDaysV3,
    agendaCalendarTimeToHoursV3,
    agendaCalendarHoursToTimeV3,
    agendaCalendarMonthLabelV3,
    agendaCalendarShiftMonthV3,
    agendaCalendarMonthDaysV3,
    agendaCalendarWeekStartV8,
    agendaCalendarWeekKeyV8,
    agendaCalendarWeekDaysV8,
    agendaCalendarShiftWeekV8,
    agendaCalendarWeekLabelV8,
    agendaCalendarInitialWeekV8,
    agendaCalendarLastAvailableSlotV8,
    agendaCalendarReadV3,
    agendaCalendarWriteV3,
    agendaCalendarFindStageV3,
    agendaCalendarActivitiesForStageV3,
    agendaCalendarDemoEventsV3,
    agendaCalendarOperationalEventsV3,
    agendaCalendarStateV3,
    agendaCalendarInitialMonthV3,
    agendaCalendarEventEndV3,
    agendaCalendarLastAvailableSlotV3,
    agendaCalendarStatusToneV3,
    agendaCalendarEventMarkupV3,
    agendaCalendarFormMarkupV3,
    agendaCalendarMarkupV3
  });
};
