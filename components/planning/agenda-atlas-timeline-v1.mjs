/** Atlas timeline projection of the agenda events for the visible week. */
const normalizeAgendaStatus = (value) => String(value || "Planejado")
  .trim()
  .replaceAll("_", " ")
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("pt-BR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const agendaStatusTitles = {
  pendente: "Pendentes de execução",
  "em andamento": "Em andamento",
  planejado: "Planejados",
  "aguardando material": "Aguardando materiais",
  "aguardando materiais": "Aguardando materiais",
  bloqueado: "Bloqueados",
  concluido: "Concluídos",
};

const agendaStatusTitle = (status) => agendaStatusTitles[normalizeAgendaStatus(status)]
  || String(status || "Planejado").trim().replaceAll("_", " ").replace(/\s+/g, " ").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));

export const AgendaAtlasTimelineV1 = ({ props = {}, children = [] } = {}) => ({
  next(message = {}) {
    const { days = [], events = [], todayIso = "", presentation = "status", esc = (value) => String(value ?? "") } = { ...props, ...message };
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
    const stateOrder = ["pendente", "em andamento", "planejado", "aguardando material", "bloqueado", "concluido"];
    const groups = [...new Set(byTime.map((event) => normalizeAgendaStatus(event.status)))]
      .sort((left, right) => {
        const leftIndex = stateOrder.indexOf(normalizeAgendaStatus(left));
        const rightIndex = stateOrder.indexOf(normalizeAgendaStatus(right));
        return (leftIndex < 0 ? stateOrder.length : leftIndex) - (rightIndex < 0 ? stateOrder.length : rightIndex)
          || left.localeCompare(right, "pt-BR");
      });
    const stateGroups = groups.map((status) => {
      const statusEvents = byTime.filter((event) => normalizeAgendaStatus(event.status) === status);
      const rows = statusEvents.map((event) => {
        const date = String(event.date || "");
        const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : date;
        const details = [event.activityName, event.stageName].filter((value, index, values) => value && String(value) !== String(event.title || "Compromisso") && values.indexOf(value) === index).join(" · ");
        return `<button type="button" class="agenda-atlas-state-event" data-agenda-mobile-edit="${esc(event.id)}"><span><time datetime="${esc(`${date}T${event.start || "00:00"}`)}">${esc(dateLabel)} · ${esc(event.start || "Horário a definir")}</time><em>${esc(event.durationHours || 0)} h</em></span><strong>${esc(event.title || "Compromisso")}</strong><small>${esc(details || event.stageName || "Etapa não informada")}</small><footer><span>${esc(event.owner || "Responsável não informado")}</span><small>${Number(event.spanDays || 1)} dia(s)</small></footer></button>`;
      }).join("");
      return `<section class="agenda-atlas-state-group"><header><h3>${esc(agendaStatusTitle(status))}</h3><span>${statusEvents.length}</span></header><div>${rows}</div></section>`;
    }).join("");
    return {
      done: false,
      value: `<section class="agenda-atlas-timeline" aria-label="Compromissos da agenda"><header><div><span class="activity-kind">AGENDA · COMPROMISSOS</span><h2>Compromissos da semana</h2><p>Atividades da semana agrupadas pelo estado. Selecione uma para revisar ou editar os dados.</p></div><button type="button" class="agenda-atlas-calendar-toggle" data-atlas-calendar-toggle aria-expanded="false">Ajustar horários no calendário</button></header><nav class="agenda-atlas-presentation" aria-label="Organização da agenda"><button type="button" data-agenda-presentation="status" aria-pressed="${presentation !== "timeline"}">Por estado</button><button type="button" data-agenda-presentation="timeline" aria-pressed="${presentation === "timeline"}">Linha do tempo</button></nav><div class="agenda-atlas-status-groups"${presentation === "timeline" ? " hidden" : ""}>${stateGroups || '<p class="agenda-atlas-empty">Nenhum compromisso registrado nesta semana.</p>'}</div><div class="agenda-atlas-rail" role="group" aria-label="Dias da semana"${presentation !== "timeline" ? " hidden" : ""}>${rail}</div><div class="agenda-atlas-events" data-atlas-timeline-events${presentation !== "timeline" ? " hidden" : ""}>${cards || '<p class="agenda-atlas-empty">Nenhum compromisso registrado nesta semana.</p>'}</div>${children.join("")}</section>`,
    };
  },
});
