const requireDependencies = (dependencies) => {
  const required = ["appStore", "executionModel", "stageV9LiveFor", "esc", "ico", "runtimeRouteV1", "windowRef", "fetcher"];
  for (const name of required) {
    if (dependencies[name] == null)
      throw new TypeError(`Dashboard stage control requires ${name}.`);
  }
  if (typeof dependencies.appStore.get !== "function" || typeof dependencies.appStore.set !== "function")
    throw new TypeError("Dashboard stage control requires appStore.get() and set().");
  if (!Array.isArray(dependencies.executionModel.stages))
    throw new TypeError("Dashboard stage control requires executionModel.stages.");
  for (const name of ["stageV9LiveFor", "esc", "ico", "runtimeRouteV1", "fetcher"])
    if (typeof dependencies[name] !== "function") throw new TypeError(`Dashboard stage control requires ${name}().`);
  if (typeof dependencies.windowRef.location?.assign !== "function")
    throw new TypeError("Dashboard stage control requires windowRef.location.assign().");
  return dependencies;
};

/** Compose the dashboard's stage catalog, worker navigation, and live admin list. */
export const installDashboardStageControlV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype !== "object")
    throw new TypeError("Dashboard stage control requires ViewLayer.prototype.");
  const { appStore, executionModel, stageV9LiveFor, esc, ico, runtimeRouteV1, windowRef, fetcher } =
    requireDependencies(dependencies);

  const markup = () => {
    const state = appStore.get(), operational = state.operationalState || {};
    const adminStages = Array.isArray(state.dashboardStageAdminStagesV1) ? state.dashboardStageAdminStagesV1 : [];
    const modeledStages = (executionModel.stages || []).map((stage) => ({
      ...stage,
      stageId: adminStages.find((item) => String(item.name).toLocaleLowerCase("pt-BR") === String(stage.name).toLocaleLowerCase("pt-BR"))?.id || "",
    }));
    const additionalStages = adminStages
      .filter((item) => !modeledStages.some((stage) => String(stage.name).toLocaleLowerCase("pt-BR") === String(item.name).toLocaleLowerCase("pt-BR")))
      .map((item) => ({ key: `stage-${item.id}`, stageId: item.id, name: item.name, owner: item.owner, status: item.status, progress: item.progress, week: item.week, dependsOn: [] }));
    const stageRows = [...modeledStages, ...additionalStages];
    const cards = stageRows.map((stage, index) => {
      const live = (operational.stages || []).find((item) => item.key === stage.key) || stageV9LiveFor(stage) || {};
      const progress = Math.max(0, Math.min(100, Number(live.progress) || 0));
      return `<article class="stage-persistent-timeline-card stage-persistent-timeline-control-card" tabindex="0" role="button" data-dashboard-stage-control-open="${esc(stage.key)}" data-dashboard-stage-control-id="${esc(stage.stageId || "")}"><span>${String(index + 1).padStart(2, "0")}</span><div><small>${esc(live.week || stage.week || `Fase ${String(index + 1).padStart(2, "0")}`)} · ${esc(progress >= 100 ? "Concluída" : progress > 0 ? "Em andamento" : "Planejada")}</small><b>${esc(stage.name)}</b><i><em style="width:${progress}%"></em></i></div><strong>${progress}%</strong><button type="button" class="stage-persistent-timeline-edit" data-dashboard-stage-control-edit="${esc(stage.key)}" data-dashboard-stage-control-id="${esc(stage.stageId || "")}" aria-label="Editar ${esc(stage.name)}">${ico("pencil")}</button></article>`;
    }).join("");
    return `<section class="stage-persistent-timeline dashboard-stage-control" data-dashboard-stage-control><header><div><span class="activity-kind">CONTROLE DE ETAPAS · WORKER</span><b>Etapas e atividades da obra</b><small>Role horizontalmente para navegar. Abra uma frente ou edite diretamente pelo ícone.</small></div><span class="stage-persistent-timeline-count">${stageRows.length} frentes</span></header><div class="stage-persistent-timeline-track">${cards}<button type="button" class="stage-persistent-timeline-add" data-dashboard-stage-control-new aria-label="Adicionar etapa">${ico("plus")}<span>Adicionar<br>etapa</span></button></div></section>`;
  };

  const baseAssistant = ViewLayer.prototype.assistant;
  ViewLayer.prototype.assistant = function (...args) {
    const html = baseAssistant?.apply(this, args) || "";
    return html.includes("data-dashboard-stage-control") ? html : html.replace('<section class="dashboard-stage-timeline"', `${markup()}<section class="dashboard-stage-timeline"`);
  };

  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind?.apply(this, args), control = this.querySelector("[data-dashboard-stage-control]");
    if (!control || control.dataset.bound === "true") return result;
    control.dataset.bound = "true";
    const open = (key, mode = "", stageId = "") => {
      const query = `stage=${encodeURIComponent(key || "new")}${stageId ? `&stageId=${encodeURIComponent(stageId)}` : ""}${mode ? `&mode=${encodeURIComponent(mode)}` : ""}`;
      windowRef.location.assign(runtimeRouteV1("/admin/workers/stage", query));
    };
    control.addEventListener("click", (event) => {
      const create = event.target.closest("[data-dashboard-stage-control-new]");
      if (create) { event.preventDefault(); return open("new", "new"); }
      const edit = event.target.closest("[data-dashboard-stage-control-edit]");
      if (edit) { event.preventDefault(); event.stopPropagation(); return open(edit.dataset.dashboardStageControlEdit, "edit", edit.dataset.dashboardStageControlId); }
      const card = event.target.closest("[data-dashboard-stage-control-open]");
      if (card) { event.preventDefault(); open(card.dataset.dashboardStageControlOpen, "edit", card.dataset.dashboardStageControlId); }
    });
    control.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-dashboard-stage-control-open]")) {
        event.preventDefault();
        open(event.target.dataset.dashboardStageControlOpen, "edit", event.target.dataset.dashboardStageControlId);
      }
    });
    if (!this.__dashboardStageControlCatalogLoadedV1) {
      this.__dashboardStageControlCatalogLoadedV1 = true;
      fetcher("/api/stages-admin", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const stages = payload?.stages;
          if (Array.isArray(stages) && JSON.stringify(stages) !== JSON.stringify(appStore.get().dashboardStageAdminStagesV1 || []))
            appStore.set({ dashboardStageAdminStagesV1: stages });
        })
        .catch(() => {});
    }
    windowRef.lucide?.createIcons();
    return result;
  };
  return ViewLayer;
};
