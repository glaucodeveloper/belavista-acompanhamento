/** Atlas timeline projection of the agenda events for the visible week. */
export const AgendaAtlasTimelineV1 = ({ props = {}, children = [] } = {}) => ({
  next(message = {}) {
    const { days = [], events = [], todayIso = "", esc = (value) => String(value ?? "") } = { ...props, ...message };
    const byTime = [...events].sort((left, right) =>
      `${left.date || ""}T${left.start || ""}`.localeCompare(`${right.date || ""}T${right.start || ""}`));
    const maxHours = Math.max(1, ...days.map((day) => byTime
      .filter((event) => event.date === day.iso)
      .reduce((hours, event) => hours + Math.max(0, Number(event.durationHours) || 0), 0)));
    const rail = days.map(({ date, iso }) => {
      const scheduled = byTime.filter((event) => event.date === iso);
      const hours = scheduled.reduce((sum, event) => sum + Math.max(0, Number(event.durationHours) || 0), 0);
      const height = scheduled.length ? Math.max(16, Math.round(hours / maxHours * 100)) : 8;
      return `<button type="button" class="agenda-atlas-tick${iso === todayIso ? " today" : ""}" data-atlas-timeline-day="${esc(iso)}" aria-label="${esc(date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}: ${scheduled.length} compromisso(s)"${iso === todayIso ? ' aria-current="date"' : ""}><span class="agenda-atlas-tick-bar" style="height:${height}%"></span><span class="agenda-atlas-tick-name">${esc(date.toLocaleDateString("pt-BR", { weekday: "short" }))}</span><strong>${esc(date.getDate())}</strong><small>${scheduled.length}</small></button>`;
    }).join("");
    const cards = byTime.map((event) => {
      const title = String(event.title || "Compromisso");
      const date = String(event.date || "");
      const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : date;
      const status = String(event.status || "Sem status").replaceAll("_", " ");
      const details = [event.activityName, event.stageName].filter((value, index, values) =>
        value && String(value) !== title && values.indexOf(value) === index).join(" · ");
      return `<button type="button" class="agenda-atlas-event" data-agenda-mobile-edit="${esc(event.id)}" data-atlas-timeline-event-date="${esc(date)}"><span class="agenda-atlas-event-top"><time datetime="${esc(`${date}T${event.start || "00:00"}`)}">${esc(dateLabel)} · ${esc(event.start || "Horário a definir")}</time><em>${esc(status)}</em></span><strong>${esc(title)}</strong><p>${esc(details || event.stageName || "Etapa não informada")}</p><footer><span>${esc(event.owner || "Responsável não informado")}</span><small>${esc(event.durationHours || 0)} h${Number(event.spanDays || 1) > 1 ? ` · ${esc(event.spanDays)} dias` : ""}</small></footer></button>`;
    }).join("");
    return {
      done: false,
      value: `<section class="agenda-atlas-timeline" aria-label="Compromissos da agenda"><header><div><span class="activity-kind">AGENDA · COMPROMISSOS</span><h2>Compromissos da semana</h2><p>Selecione um compromisso para revisar os dados, a atividade e o horário.</p></div><button type="button" class="agenda-atlas-calendar-toggle" data-atlas-calendar-toggle aria-expanded="false">Ajustar horários no calendário</button></header><div class="agenda-atlas-rail" role="group" aria-label="Dias da semana">${rail}</div><div class="agenda-atlas-events" data-atlas-timeline-events>${cards || '<p class="agenda-atlas-empty">Nenhum compromisso registrado nesta semana.</p>'}</div>${children.join("")}</section>`,
    };
  },
});
