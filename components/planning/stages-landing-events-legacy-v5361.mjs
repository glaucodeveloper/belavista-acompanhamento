/** Installs the event behavior for the v5.3.61 stages landing and detail pages. */
export const installStagesLandingEventsV5361 = (
  ViewLayer,
  { appStore, notify, window: windowRef = globalThis.window } = {},
) => {
  if (!ViewLayer?.prototype || !appStore?.get || !appStore?.set)
    throw new TypeError("Stages landing events require ViewLayer and the application store.");

  const baseBind = ViewLayer.prototype.bind;
  const activatePlanningPane = (root, name, source) => {
    const panel =
      source.closest(".stage-planning-panel") ||
      source.closest(".stage-planner-panel") ||
      source.closest(".utility-content")?.parentElement ||
      root;

    const directTabs = [...panel.querySelectorAll("[data-stage-plan]")];
    const directPanes = [...panel.querySelectorAll("[data-stage-pane]")];
    if (directTabs.length && directPanes.length) {
      directTabs.forEach((tab) =>
        tab.classList.toggle("active", tab.dataset.stagePlan === name),
      );
      directPanes.forEach((pane) => {
        const visible = pane.dataset.stagePane === name;
        pane.hidden = !visible;
        pane.classList.toggle("active", visible);
      });
      appStore.set({
        lastAction: `Abriu ${source.textContent.trim()} na página da etapa`,
      });
      return true;
    }

    const legacyTabs = [...panel.querySelectorAll("[data-stage-pane-tab]")];
    const legacyPanes = [...panel.querySelectorAll("[data-stage-pane]")];
    if (legacyTabs.length && legacyPanes.length) {
      legacyTabs.forEach((tab) =>
        tab.classList.toggle("active", tab.dataset.stagePaneTab === name),
      );
      legacyPanes.forEach((pane) => {
        const visible = pane.dataset.stagePane === name;
        pane.hidden = !visible;
        pane.classList.toggle("active", visible);
      });
      appStore.set({
        lastAction: `Abriu ${source.textContent.trim()} na página da etapa`,
      });
      return true;
    }

    const utilityTabs = [...panel.querySelectorAll("[data-utility-tab]")];
    const utilityPanes = [...panel.querySelectorAll("[data-pane]")];
    if (utilityTabs.length && utilityPanes.length) {
      utilityTabs.forEach((tab) =>
        tab.classList.toggle("active", tab.dataset.utilityTab === name),
      );
      utilityPanes.forEach((pane) => {
        const visible = pane.dataset.pane === name;
        pane.hidden = !visible;
        pane.classList.toggle("active", visible);
      });
      appStore.set({
        lastAction: `Abriu ${source.textContent.trim()} na página da etapa`,
      });
      return true;
    }
    return false;
  };

  ViewLayer.prototype.bind = function () {
    baseBind?.call(this);

    this.querySelectorAll("[data-v5361-open-stage]").forEach((button) =>
      button.addEventListener("click", () => {
        const key = button.dataset.v5361OpenStage;
        appStore.set({
          stageSelected: key,
          stagesPageV5361: "detail",
          activityDedicated: true,
          lastAction: `Abriu página detalhada da etapa ${key}`,
        });
      }),
    );

    this.querySelector("[data-v5361-stage-back]")?.addEventListener(
      "click",
      () => {
        appStore.set({
          stagesPageV5361: "landing",
          activityDedicated: false,
          lastAction: "Voltou para Agenda e cronograma",
        });
      },
    );

    this.querySelector("[data-v5361-open-agenda-page]")?.addEventListener(
      "click",
      () => {
        appStore.set({
          view: "agenda",
          lastAction: "Abriu Agenda completa a partir de Etapas",
        });
      },
    );

    if (!this.__stagePlanningCaptureV5361) {
      this.__stagePlanningCaptureV5361 = true;
      this.addEventListener(
        "click",
        (event) => {
          const plan = event.target.closest?.("[data-stage-plan]");
          if (plan && this.contains(plan)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            activatePlanningPane(this, plan.dataset.stagePlan, plan);
            return;
          }

          const legacy = event.target.closest?.("[data-stage-pane-tab]");
          if (legacy && this.contains(legacy)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            activatePlanningPane(this, legacy.dataset.stagePaneTab, legacy);
            return;
          }

          const utility = event.target.closest?.("[data-utility-tab]");
          if (utility && this.contains(utility)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            activatePlanningPane(this, utility.dataset.utilityTab, utility);
            return;
          }

          const relate = event.target.closest?.("[data-stage-relate]");
          if (relate && this.contains(relate)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            notify("Relação pronta para ser rotulada entre as etapas.", "success");
            appStore.set({
              lastAction: "Abriu criação de relação entre etapas",
            });
            return;
          }

          const todo = event.target.closest?.(
            "[data-plan-todo],.utility-add-todo",
          );
          if (todo && this.contains(todo)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            notify("Novo afazer preparado para a etapa.", "success");
            appStore.set({ lastAction: "Preparou novo afazer da etapa" });
          }
        },
        true,
      );
    }

    windowRef?.lucide?.createIcons();
  };
};
