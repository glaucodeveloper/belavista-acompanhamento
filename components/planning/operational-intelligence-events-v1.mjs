/** Installs event binding for the PERT, actions, RACI, RAID planning views. */
export const installOperationalIntelligenceEventsV1 = (
  ViewLayer,
  { appStore, ico, notify, actionsPageV1, raciPageV1, raidPageV1 } = {},
) => {
  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    previousBind.call(this);
    this.bindOperationalIntelligence?.();
  };

  ViewLayer.prototype.bindOperationalIntelligence = function () {
    const view = appStore.get().view;
    if (view === "stages") {
      const pane = this.querySelector(
        '.stage-plan-pane[data-stage-pane="cronograma"]',
      );
      if (pane && !pane.dataset.ganttEnhanced) {
        pane.dataset.ganttEnhanced = "true";
        pane.style.setProperty("--gantt-day-width", "28px");
        const header = pane.querySelector("header");
        header?.insertAdjacentHTML(
          "afterend",
          `<div class="gantt-operational-tools"><span>${ico("milestone")} Gantt navegável + milestones</span><div><button type="button" data-gantt-zoom="-1">−</button><button type="button" data-gantt-today>Hoje</button><button type="button" data-gantt-zoom="1">＋</button></div></div>`,
        );
        const labels = [
          ["31", "Medição"],
          ["58", "Liberação"],
          ["82", "Conclusão"],
        ];
        pane
          .querySelectorAll(".planning-gantt-track")
          .forEach((track, index) =>
            labels.forEach(([left, label]) =>
              track.insertAdjacentHTML(
                "beforeend",
                `<span class="gantt-milestone" style="left:${left}%"><i></i>${index === 0 ? `<b>${label}</b>` : ""}</span>`,
              ),
            ),
          );
        pane.querySelectorAll("[data-gantt-zoom]").forEach((button) =>
          button.addEventListener("click", () => {
            const current =
                parseInt(pane.style.getPropertyValue("--gantt-day-width")) || 28,
              next = Math.max(
                20,
                Math.min(52, current + Number(button.dataset.ganttZoom) * 6),
              );
            pane.style.setProperty("--gantt-day-width", `${next}px`);
            notify(`Escala do Gantt: ${next}px por dia.`);
          }),
        );
        pane
          .querySelector("[data-gantt-today]")
          ?.addEventListener("click", () => {
            pane.scrollTo({
              left: Math.max(0, pane.scrollWidth * 0.28),
              behavior: "smooth",
            });
            notify("Cronograma centralizado na janela atual.");
          });
      }
    }
    if (view === "pert") {
      this.querySelectorAll("[data-pert-node]").forEach((button) =>
        button.addEventListener("click", () =>
          appStore.set({
            selectedPertNode: button.dataset.pertNode,
            lastAction: `Selecionou nó PERT ${button.textContent.trim()}`,
          }),
        ),
      );
      this.querySelector("[data-pert-complete]")?.addEventListener(
        "click",
        (buttonEvent) => {
          const id = buttonEvent.currentTarget.dataset.pertComplete,
            overrides = {
              ...(appStore.get().pertOverrides || {}),
              [id]: {
                ...(appStore.get().pertOverrides?.[id] || {}),
                progress: 100,
              },
            };
          appStore.set({
            pertOverrides: overrides,
            selectedPertNode: id,
            lastAction: `Concluiu nó PERT ${id}`,
          });
          notify(
            "Atividade concluída. Dependências reavaliadas e próximas ações liberadas.",
            "success",
          );
        },
      );
    }
    if (view === "actions" || this.querySelector("[data-dashboard-action-workspace]")) {
      actionsPageV1.bind(this, view);
    }
    if (view === "raci") {
      raciPageV1.bind(this, view);
    }
    if (view === "raid") raidPageV1.bind(this, view);
  };

  return ViewLayer;
};
