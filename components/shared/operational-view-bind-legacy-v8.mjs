/** Compose legacy operational, finance, leads, and commission view bindings. */
export const installOperationalViewBindV8 = (ViewLayer, dependencies = {}) => {
  const {
    appStore,
    demoData,
    downloadCsv,
    bindLeadsToolbarEventsV1,
    bindCommissionWorkspaceEventsV1,
    brlToNumber,
    commissionDeals,
    commissionProfiles,
    confirmRef,
    DateCtor,
    documentRef,
    EventCtor,
    FormDataCtor,
    formatBRL,
    ico,
    notify,
  } = dependencies;
  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    baseBind.call(this);
    this.querySelectorAll(".calibration-settings").forEach((panel) => panel.remove());
    this.querySelectorAll('[data-view="settings"]').forEach((button) => {
      if (button.textContent.includes("calibra")) {
        button.removeAttribute("data-view");
        button.dataset.focusCashEntry = "";
        button.textContent = "Abrir registro de caixa";
      }
    });
    this.querySelectorAll("[data-focus-cash-entry]").forEach((button) =>
      button.addEventListener(
        "click",
        () => {
          const cash = this.querySelector("[data-v8-cash-entry]");
          cash?.scrollIntoView({ behavior: "smooth", block: "center" });
          cash?.querySelector('input[name="amount"]')?.focus();
          appStore.set({ lastAction: "Abriu o registro de caixa" });
        },
        { once: true },
      ),
    );
    this.querySelectorAll('[data-view="finance"]').forEach((button) => {
      if (button.textContent.includes("Abrir financeiro"))
        button.innerHTML = "Abrir registro de caixa";
    });
    const operationalLedger = this.querySelector(
      ".control-center-page .control-center-section",
    );
    if (operationalLedger) {
      operationalLedger.classList.add(
        "control-ledger",
        "control-ledger-operational",
      );
      operationalLedger.dataset.controlLedger = "operational-cash";
    }
    const stageTabs = this.querySelector("[data-stage-detail-tabs]");
    if (
      stageTabs &&
      !stageTabs.querySelector('[data-stage-detail-tab="requisitos"]')
    ) {
      const requirements = documentRef.createElement("button");
      requirements.type = "button";
      requirements.dataset.stageDetailTab = "requisitos";
      requirements.textContent = "Requisitos";
      requirements.addEventListener("click", () => {
        stageTabs
          .querySelectorAll("button")
          .forEach((item) =>
            item.classList.toggle("active", item === requirements),
          );
        appStore.set({
          selectedStageDetailTab: "requisitos",
          lastAction: "Abriu a aba Requisitos da etapa",
        });
        this.querySelector(".stage-v9-detail-grid")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      stageTabs.insertBefore(
        requirements,
        stageTabs.querySelector('[data-stage-detail-tab="diario"]') || null,
      );
    }
    this.querySelectorAll('[data-stage-detail-tab="andamento"]').forEach(
      (button) =>
        button.addEventListener(
          "click",
          () =>
            appStore.set({
              view: "records",
              activityDedicated: false,
              lastAction: "Abriu Andamento nos registros completos",
            }),
          { once: true },
        ),
    );

    bindLeadsToolbarEventsV1(this, { appStore, demoData, downloadCsv, notify });
    bindCommissionWorkspaceEventsV1(this, {
      appStore,
      brlToNumber,
      commissionDeals,
      commissionProfiles,
      confirmRef,
      DateCtor,
      downloadCsv,
      EventCtor,
      FormDataCtor,
      formatBRL,
      ico,
      notify,
    });
  };
  return ViewLayer.prototype.bind;
};
