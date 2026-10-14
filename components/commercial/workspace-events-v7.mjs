/** Event bindings for the v7 broker and finance workspaces. */
export const installCommercialWorkspaceEventsV7 = (
  ViewLayer,
  {
    appStore,
    downloadCsv,
    commissionProfiles = [],
    reportCatalog = [],
    syncLiveSystemReportV1 = () => {},
    window: windowRef = globalThis.window,
  } = {},
) => {
  if (!ViewLayer?.prototype || !appStore?.get || !appStore?.set)
    throw new TypeError("Commercial workspace events require ViewLayer and the application store.");

  ViewLayer.prototype.bindCommercialPagesV7 = function () {
    const root = this.querySelector(".v7-brokers-page,.v7-finance-page");
    if (!root || root.dataset.v7Bound) return;
    root.dataset.v7Bound = "1";
    if (root.matches(".v7-finance-page")) {
      const exportButton = root.querySelector("[data-v7-finance-export]");
      exportButton?.insertAdjacentHTML(
        "afterend",
        '<button type="button" class="toolbar-action" data-v7-finance-print>Imprimir</button>',
      );
      root
        .querySelector("[data-v7-finance-print]")
        ?.addEventListener("click", () => windowRef.print());
    }
    root
      .querySelector("[data-v7-broker-search]")
      ?.addEventListener("input", (event) => {
        const query = event.target.value.toLowerCase();
        root
          .querySelectorAll("[data-v7-broker-row]")
          .forEach((row) => (row.hidden = !row.dataset.search.includes(query)));
      });
    root.querySelectorAll("[data-v7-open-broker]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          view: "commissions",
          selectedCommissionProfile: button.dataset.v7OpenBroker,
          selectedCommissionContract: null,
          lastAction: "Abriu carteira do corretor",
        }),
      ),
    );
    root.querySelectorAll("[data-v7-fin-report]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          view: "finance",
          reportFamily: "Financeiro",
          reportType: button.dataset.v7FinReport,
          lastAction: "Abriu planilha financeira",
        }),
      ),
    );
    root.querySelectorAll("[data-v7-period]").forEach((button) =>
      button.addEventListener("click", () =>
        appStore.set({
          reportPeriod: button.dataset.v7Period,
          lastAction: `Alterou período para ${button.textContent.trim()}`,
        }),
      ),
    );
    root
      .querySelector("[data-v7-brokers-export]")
      ?.addEventListener("click", () =>
        downloadCsv(
          "corretores.csv",
          ["Corretor", "CRECI", "Vendas", "Comissão", "Conversão", "Lotes"],
          commissionProfiles.map((profile) => [
            profile.name,
            profile.creci,
            profile.sales,
            profile.commission,
            profile.conversion,
            profile.lots.join(" | "),
          ]),
        ),
      );
    root
      .querySelector("[data-v7-finance-export]")
      ?.addEventListener("click", () => {
        syncLiveSystemReportV1(appStore.get());
        const report =
          reportCatalog.find((item) => item.id === appStore.get().reportType) ||
          reportCatalog.find((item) => item.family === "Financeiro");
        if (report) downloadCsv(`${report.id}.csv`, report.columns, report.rows);
      });
    windowRef?.lucide?.createIcons();
  };
};
