import { createLeadsOperationalWorkspaceV5356, bindLeadsOperationalWorkspaceV5356 } from "../commercial/leads-operational-workspace-v5356.mjs?v=leads-operational-workspace-v5356";
import { recordStageV5360 } from "../shared/final-workspace-formatters-v5360.mjs?v=final-workspace-formatters-v5360";

/** Installs the legacy v5.3.56 records/stages/leads workspace layer. */
export const installProductWorkspacesV5356 = ({
  globalRef = globalThis,
  ViewLayer,
  appStore,
  demoData,
  esc,
  ico,
  runtimeRouteV1,
  apiFetch,
  notify,
  windowRef = globalThis.window,
} = {}) => {
  if (!globalRef.__belavistaWorkspaceBaseBindV5356) {
    globalRef.__belavistaWorkspaceBaseBindV5356 = ViewLayer.prototype.bind;
  }
  const baseBind = globalRef.__belavistaWorkspaceBaseBindV5356;

  const activityDateV5356 = (item, index = 0) =>
    String(item?.date || item?.data || item?.week || `S${String(index + 1).padStart(2, "0")}`);
  const recordStageV5356 = (record) =>
    String(record?.etapa || record?.stage || record?.atividade || "Etapa operacional");
  const normalizeToneV5356 = (value) => {
    const x = String(value || "").toLowerCase();
    if (/concl|final|feito|valid/.test(x)) return "done";
    if (/atras|bloq|pend|risco/.test(x)) return "warn";
    return "active";
  };

  // Diário: table dashboard. Each row opens a dedicated record page.
  ViewLayer.prototype.records = function () {
    const state = appStore.get();
    const allRecords = Array.isArray(state.records) ? state.records : [];
    const selectedStage = (demoData.activities || []).find(
      (item) => String(item.id) === String(state.selectedStage) || String(item.name) === String(state.selectedStage),
    );
    const records = selectedStage
      ? allRecords.filter((record) => {
          const stageValue = String(recordStageV5360(record));
          return stageValue === String(selectedStage.id) ||
            stageValue === String(selectedStage.name) ||
            String(record.atividade || "") === String(selectedStage.name);
        })
      : allRecords;
    const selectedId = state.recordDedicatedV5356 || "";
    const selected = records.find((item) => String(item.id) === String(selectedId));

    if (selected) {
      return `<section class="record-dedicated-v5356">
        <header class="workspace-head-v5356"><div><span>DIÁRIO · REGISTRO DEDICADO</span><h1>${esc(selected.atividade || "Registro operacional")}</h1><p>${esc(recordStageV5356(selected))} · ${esc(selected.data || "Sem data")} ${esc(selected.hora || "")}</p></div><button type="button" data-v5356-record-back>${ico("arrow-left")} Voltar ao Diário</button></header>
        <div class="record-dedicated-grid-v5356"><article><span>REGISTRO</span><b>${esc(selected.id || "—")}</b></article><article><span>ETAPA / ATIVIDADE</span><b>${esc(recordStageV5356(selected))}</b></article><article><span>RESPONSÁVEL</span><b>${esc(selected.responsavel || "A definir")}</b></article><article><span>STATUS</span><b>${esc(selected.status || "Pendente")}</b></article></div>
        <section class="record-dedicated-body-v5356"><span>APONTAMENTO / MEDIÇÃO</span><p>${esc(selected.detalhes || "Nenhum detalhe informado.")}</p></section>
        <footer class="record-dedicated-actions-v5356"><button type="button" data-view="stages">Ver calendário da etapa</button><button type="button" data-view="map">Localizar no mapa</button></footer>
      </section>`;
    }

    const completed = records.filter((x) => /concl|final|feito/i.test(String(x.status || ""))).length;
    const pending = Math.max(0, records.length - completed);
    const rows = records.slice().reverse().map((record) => `<tr>
      <td><b>${esc(record.id || "REG")}</b><small>${esc(record.data || "—")} ${esc(record.hora || "")}</small></td>
      <td><b>${esc(recordStageV5356(record))}</b><small>${esc(record.atividade || "Atividade operacional")}</small></td>
      <td>${esc(record.responsavel || "A definir")}</td>
      <td class="record-measure-v5356">${esc(record.detalhes || "Sem medição informada")}</td>
      <td><span class="workspace-status-v5356 ${normalizeToneV5356(record.status)}">${esc(record.status || "Pendente")}</span></td>
      <td><button type="button" data-v5356-record="${esc(record.id || "")}">Abrir página</button></td>
    </tr>`).join("");

    return `<section class="records-dashboard-v5356">
      <header class="workspace-head-v5356"><div><span>DIÁRIO · ATIVIDADES NAS ETAPAS</span><h1>Registro operacional</h1><p>Dashboard tabelado dos fatos, medições e evidências vinculados às etapas.</p></div><button type="button" data-view="stages">Ver calendário de atividades</button></header>
      <div class="records-summary-v5356"><article><span>Registros</span><b>${records.length}</b></article><article><span>Concluídos</span><b>${completed}</b></article><article><span>Pendentes</span><b>${pending}</b></article><article><span>Etapas relacionadas</span><b>${new Set(records.map(recordStageV5360)).size}</b></article></div>
      <div class="records-table-wrap-v5356"><table><thead><tr><th>Registro / data</th><th>Etapa / atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Página</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="workspace-empty-v5356">Nenhum registro cadastrado.</td></tr>'}</tbody></table></div>
    </section>`;
  };

  // Etapas + cronograma: one representation mode, the activity card calendar.
  ViewLayer.prototype.stages = function () {
    const activities = Array.isArray(demoData.activities) ? demoData.activities : [];
    const groups = [];
    for (const [index, item] of activities.entries()) {
      const label = activityDateV5356(item, index);
      let group = groups.find((candidate) => candidate.label === label);
      if (!group) { group = { label, items: [] }; groups.push(group); }
      group.items.push(item);
    }
    const columns = groups.map((group) =>
      `<section class="stage-calendar-column-v5356"><header><span>CALENDÁRIO</span><b>${esc(group.label)}</b></header><div>${group.items.map((item) => `<button type="button" class="stage-activity-card-v5356 ${normalizeToneV5356(item.status)}" data-v5356-stage-activity="${esc(item.id || item.name || "")}"><span>${esc(item.status || "Planejada")}</span><h3>${esc(item.name || "Atividade")}</h3><p>${esc(item.owner || "Responsável a definir")}</p><i><em style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></em></i><footer><b>${Number(item.progress) || 0}%</b><small>Abrir atividade →</small></footer></button>`).join("")}</div></section>`,
    ).join("");
    return `<section class="stage-calendar-page-v5356">
      <header class="workspace-head-v5356"><div><span>ETAPAS E CRONOGRAMA</span><h1>Calendário de atividades</h1><p>Uma única representação gráfica da execução: calendário horizontal de cards por etapa e atividade.</p></div><div class="stage-calendar-legend-v5356"><span class="active">Em andamento</span><span class="warn">Pendente / risco</span><span class="done">Concluído</span></div></header>
      <div class="stage-calendar-graph-v5356">${columns || '<div class="workspace-empty-v5356">Nenhuma atividade disponível.</div>'}</div>
    </section>`;
  };

  // Leads internal: public /leads remains embedded untouched.
  ViewLayer.prototype.leads = createLeadsOperationalWorkspaceV5356({ appStore, demoData, esc, ico, runtimeRouteV1 });

  // Preserve the existing event binder as the first step of this layer.
  ViewLayer.prototype.bind = function () {
    baseBind?.call(this);
    this.querySelectorAll("[data-v5356-record]").forEach((button) =>
      button.addEventListener("click", () => appStore.set({
        recordDedicatedV5356: button.dataset.v5356Record,
        lastAction: `Abriu página dedicada do registro ${button.dataset.v5356Record}`,
      })),
    );
    this.querySelector("[data-v5356-record-back]")?.addEventListener("click", () => appStore.set({
      recordDedicatedV5356: null,
      lastAction: "Voltou ao dashboard do Diário",
    }));
    this.querySelectorAll("[data-v5356-stage-activity]").forEach((button) =>
      button.addEventListener("click", () => {
        const activity = (demoData.activities || []).find(
          (item) => String(item.id || item.name) === String(button.dataset.v5356StageActivity),
        );
        appStore.set({
          view: "activities",
          selectedActivity: activity?.id || activity?.name || button.dataset.v5356StageActivity,
          activityDedicated: true,
          lastAction: `Abriu atividade ${activity?.name || button.dataset.v5356StageActivity}`,
        });
      }),
    );
    bindLeadsOperationalWorkspaceV5356(this, { appStore, runtimeRouteV1, apiFetch, notify });
    windowRef?.lucide?.createIcons();
  };

  globalRef.__BELAVISTA_ADMIN_WORKSPACES_V5356 = {
    installedAt: new Date().toISOString(),
    version: "5.3.56",
  };
};
