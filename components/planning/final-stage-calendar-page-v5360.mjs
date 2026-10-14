export const createFinalStageCalendarPageV5360 = ({
  demoData,
  esc,
  tone,
  activityPeriod,
}) =>
  function finalStageCalendarPageV5360() {
    const activities = Array.isArray(demoData.activities)
      ? demoData.activities
      : [];
    const groups = [];

    activities.forEach((item, index) => {
      const period = activityPeriod(item, index);
      let group = groups.find((entry) => entry.period === period);
      if (!group) {
        group = { period, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return `<section class="stage-calendar-only-v5360">
      <header class="workspace-head-v5360">
        <div>
          <span>ETAPAS E CRONOGRAMA</span>
          <h1>Calendário de atividades</h1>
          <p>Representação única da execução. Cada card abre a página dedicada da atividade.</p>
        </div>
        <div class="stage-calendar-legend-v5360">
          <span class="active">Em andamento</span>
          <span class="warn">Pendente / risco</span>
          <span class="done">Concluído</span>
        </div>
      </header>
      <div class="stage-calendar-v5360">
        ${
          groups
            .map(
              (group) => `
          <section class="stage-period-v5360">
            <header><span>PERÍODO</span><b>${esc(group.period)}</b></header>
            <div>
              ${group.items
                .map(
                  (item) => `
                <button type="button" class="stage-card-v5360 ${tone(item.status)}" data-v5360-stage-card="${esc(item.id || item.name || "")}">
                  <span>${esc(item.status || "Planejada")}</span>
                  <h2>${esc(item.name || "Atividade")}</h2>
                  <p>${esc(item.owner || "Responsável a definir")}</p>
                  <i><em style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></em></i>
                  <footer><b>${Number(item.progress) || 0}%</b><small>Abrir página →</small></footer>
                </button>`,
                )
                .join("")}
            </div>
          </section>`,
            )
            .join("") ||
          '<div class="dashboard-empty-v5360">Nenhuma atividade disponível.</div>'
        }
      </div>
    </section>`;
  };
