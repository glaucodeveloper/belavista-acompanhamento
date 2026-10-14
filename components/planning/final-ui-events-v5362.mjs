/** Installs the final UI's record, activity, and commission event bindings. */
export const installBelavistaFinalUiV5362 = ({
  globalRef = globalThis,
  ViewLayer,
  appStore,
  window: windowRef = globalRef.window,
} = {}) => {
  if (!globalRef || !ViewLayer?.prototype || !appStore?.get || !appStore?.set)
    throw new TypeError("Final UI events require global, ViewLayer, and the application store.");

  if (!globalRef.__BELAVISTA_V5362_BASE_BIND)
    globalRef.__BELAVISTA_V5362_BASE_BIND = ViewLayer.prototype.bind;
  const baseBind = globalRef.__BELAVISTA_V5362_BASE_BIND;

  const bind = function () {
    baseBind?.call(this);
    this.querySelectorAll("[data-v5362-record]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          selectedRecordV5362: button.dataset.v5362Record,
          lastAction: "Abriu registro",
        }),
      ),
    );
    this.querySelector("[data-v5362-record-back]")?.addEventListener(
      "click",
      () =>
        appStore.set({
          selectedRecordV5362: null,
          lastAction: "Voltou ao Diário",
        }),
    );
    this.querySelectorAll("[data-v5362-activity]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          view: "activities",
          selectedActivity: button.dataset.v5362Activity,
          activityDedicated: true,
          lastAction: "Abriu atividade",
        }),
      ),
    );
    this.querySelector("[data-v5362-commission-toggle]")?.addEventListener(
      "click",
      () => {
        const state = appStore.get();
        appStore.set({
          dashboardCommissionOpenV5362: !state.dashboardCommissionOpenV5362,
          dashboardCommissionBrokerV5362: null,
          lastAction: "Comissões rápidas",
        });
      },
    );
    this.querySelector("[data-v5362-commission-close]")?.addEventListener(
      "click",
      () =>
        appStore.set({
          dashboardCommissionOpenV5362: false,
          dashboardCommissionBrokerV5362: null,
        }),
    );
    this.querySelectorAll("[data-v5362-broker]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          dashboardCommissionOpenV5362: true,
          dashboardCommissionBrokerV5362: button.dataset.v5362Broker,
        }),
      ),
    );
    this.querySelector("[data-v5362-broker-back]")?.addEventListener(
      "click",
      () =>
        appStore.set({
          dashboardCommissionOpenV5362: true,
          dashboardCommissionBrokerV5362: null,
        }),
    );
    this.querySelectorAll("[data-v5362-commission]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          view: "commissions",
          selectedCommissionProfile: button.dataset.v5362Commission,
          lastAction: "Abriu comissão",
        }),
      ),
    );
    this.querySelectorAll("[data-v5362-correction]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          view: "commissions",
          commissionEditorOpen: true,
          commissionFilters: {
            query: "",
            status: "all",
            profile: button.dataset.v5362Correction,
          },
          lastAction: "Abriu correção",
        }),
      ),
    );
    windowRef?.lucide?.createIcons();
  };

  const install = () => {
    ViewLayer.prototype.bind = bind;
    globalRef.__BELAVISTA_FINAL_UI_V5362 = {
      version: "5.3.62",
      installedAt: new Date().toISOString(),
    };
    return globalRef.__BELAVISTA_FINAL_UI_V5362;
  };
  globalRef.installBelavistaFinalUiV5362 = install;
  return install();
};
