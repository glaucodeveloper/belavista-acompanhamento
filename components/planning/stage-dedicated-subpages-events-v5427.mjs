export const installStageDedicatedSubpagesEventsV5427 = (ViewLayer, dependencies = {}) => {
  const { bindBase, appStore, executionModel, demoData } = dependencies;

  ViewLayer.prototype.bind = function (...args) {
  const result = bindBase?.apply(this, args);
  const recordsTab = this.querySelector('[data-stage-detail-tab="diario"]');
  if (recordsTab) recordsTab.textContent = "Registros";
  if (this.dataset.stageDedicatedSubpagesBound === "true") return result;
  this.dataset.stageDedicatedSubpagesBound = "true";
  const stageContext = (key) => {
    const stage =
      (executionModel.stages || []).find(
        (item) => String(item.key) === String(key),
      ) || executionModel.stages?.[0];
    const activity =
      demoData.activities.find((item) => item.name === stage?.name) ||
      demoData.activities.find((item) => item.id === stage?.key);
    return {
      selectedStageV9: stage?.key || "",
      selectedStage: activity?.id || stage?.key || "",
    };
  };
  this.addEventListener(
    "click",
    (event) => {
      const stageButton = event.target?.closest?.("[data-stage-v9]");
      if (stageButton && this.contains(stageButton)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const context = stageContext(stageButton.dataset.stageV9);
        appStore.set({
          ...context,
          view: "stages",
          activityDedicated: true,
          stageActivityDedicatedV9: false,
          selectedStageDetailTab: "andamento",
          lastAction: `Abriu a etapa ${stageButton.textContent.trim()}`,
        });
        return;
      }
      const tab = event.target?.closest?.("[data-stage-detail-tab]");
      if (!tab || !this.contains(tab)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const dedicated = tab.closest(".stage-v9-dedicated-page"),
        key = tab.dataset.stageDetailTab;
      dedicated
        ?.querySelectorAll("[data-stage-detail-tab]")
        .forEach((item) => item.classList.toggle("active", item === tab));
      const state = appStore.get(),
        context = stageContext(state.selectedStageV9 || state.selectedStage),
        label = key === "diario" ? "Registros" : tab.textContent.trim();
      if (key === "agenda" || key === "diario") {
        appStore.set({
          ...context,
          view: key === "agenda" ? "agenda" : "records",
          activityDedicated: false,
          stageActivityDedicatedV9: false,
          selectedStageDetailTab: key,
          lastAction: `Abriu ${label} da etapa`,
        });
        return;
      }
      appStore.set({
        ...context,
        selectedStageDetailTab: key,
        lastAction: `Abriu a aba ${label} da etapa`,
      });
      const targets = {
        andamento: ".stage-v9-status-lines",
        atividades: ".stage-v9-flow-section",
        materiais: ".stage-v9-detail-grid",
      };
      dedicated
        ?.querySelector(targets[key])
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    true,
  );
  return result;
};
};

