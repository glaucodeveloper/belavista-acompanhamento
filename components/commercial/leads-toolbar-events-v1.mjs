/** Binds the lead-list filters, CSV export, and new-lead focus action. */
export const bindLeadsToolbarEventsV1 = (view, dependencies = {}) => {
  const { appStore, demoData, downloadCsv, notify } = dependencies;
  const applyLeadFilters = () => {
    const filters = {
      query: "",
      objective: "all",
      status: "all",
      ...(appStore.get().leadFilters || {}),
    };
    view.querySelectorAll(".lead-client-row").forEach((row) => {
      const text = row.textContent.toLocaleLowerCase(),
        objective = row.querySelector("small")?.textContent || "",
        status = row.querySelector("em")?.textContent || "";
      row.hidden = Boolean(
        (filters.query && !text.includes(filters.query.toLocaleLowerCase())) ||
        (filters.objective !== "all" &&
          !objective.includes(filters.objective)) ||
        (filters.status !== "all" && status !== filters.status),
      );
    });
  };
  view.querySelectorAll("[data-lead-toolbar-filter]").forEach((control) =>
    control.addEventListener("input", (event) => {
      const key = event.currentTarget.dataset.leadToolbarFilter,
        value = event.currentTarget.value;
      appStore.set({
        leadFilters: { ...(appStore.get().leadFilters || {}), [key]: value },
        lastAction: "Filtrou a lista comercial",
      });
      applyLeadFilters();
    }),
  );
  view.querySelector("[data-lead-filter-clear]")?.addEventListener(
    "click",
    () => {
      appStore.set({
        leadFilters: { query: "", objective: "all", status: "all" },
        lastAction: "Limpou filtros de leads",
      });
      view.render();
    },
  );
  view.querySelector("[data-lead-export]")?.addEventListener("click", () => {
    const rows = [...(appStore.get().publicLeads || []), ...demoData.leads];
    downloadCsv(
      "leads-lotes.csv",
      ["Cliente", "Lote", "Objetivo", "Status", "WhatsApp", "E-mail"],
      rows.map((item) => [
        item.name,
        item.lot,
        item.objective,
        item.status,
        item.whatsapp || "",
        item.email || "",
      ]),
    );
    notify("Lista de leads exportada em CSV.", "success");
    appStore.set({ lastAction: "Exportou lista de leads" });
  });
  view.querySelector("[data-lead-new]")?.addEventListener("click", () => {
    const form = view.querySelector("public-lead-form");
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    form?.querySelector('input[name="name"]')?.focus();
    notify("Preencha o formulário público para criar um novo lead.");
  });
  applyLeadFilters();
};
