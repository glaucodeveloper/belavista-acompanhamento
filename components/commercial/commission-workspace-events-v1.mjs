/** Binds filters, CSV, proposal navigation, and entry CRUD for commissions. */
export const bindCommissionWorkspaceEventsV1 = (view, dependencies = {}) => {
  const {
    appStore,
    brlToNumber,
    commissionDeals,
    commissionProfiles,
    confirmRef = globalThis.confirm,
    DateCtor = globalThis.Date,
    downloadCsv,
    EventCtor = globalThis.Event,
    FormDataCtor = globalThis.FormData,
    formatBRL,
    ico,
    notify,
  } = dependencies;

  view.querySelectorAll("[data-commission-filter]").forEach((control) =>
    control.addEventListener("input", (event) => {
      const key = event.currentTarget.dataset.commissionFilter,
        value = event.currentTarget.value;
      appStore.set({
        commissionFilters: {
          ...(appStore.get().commissionFilters || {}),
          [key]: value,
        },
        lastAction: "Filtrou lançamentos de comissão",
      });
    }),
  );
  view.querySelector("[data-commission-clear]")?.addEventListener("click", () =>
    appStore.set({
      commissionFilters: { query: "", status: "all", profile: "all" },
      lastAction: "Limpou filtros de comissões",
    }),
  );
  view.querySelector("[data-commission-export]")?.addEventListener(
    "click",
    () => {
      const state = appStore.get(),
        hidden = new Set(state.commissionHiddenIds || []),
        rows = [...commissionDeals, ...(state.commissionEntries || [])].filter(
          (item) => !hidden.has(item.id),
        );
      downloadCsv(
        "comissoes-lotes.csv",
        ["Contrato", "Lote", "Cliente", "Responsável", "Status", "Valor", "Comissão"],
        rows.map((item) => [
          item.id,
          item.lot,
          item.client,
          commissionProfiles.find((person) => person.id === item.profile)?.name || "",
          item.status,
          item.value,
          item.commission,
        ]),
      );
      notify("Carteira de comissões exportada em CSV.", "success");
      appStore.set({ lastAction: "Exportou carteira de comissões" });
    },
  );
  view.querySelector("[data-commission-new]")?.addEventListener("click", () =>
    appStore.set({
      view: "contracts",
      commissionEditorOpen: false,
      commissionEditing: null,
      proposalFormOpen: true,
      selectedCommissionProposal: null,
      selectedCommissionContract: null,
      lastAction: "Abriu nova venda de lote",
    }),
  );
  view.querySelectorAll("[data-commission-new]").forEach((button) => {
    button.innerHTML = `${ico("plus")} Nova venda`;
    button.setAttribute("aria-label", "Nova venda de lote");
  });
  view.querySelector("[data-commission-cancel]")?.addEventListener(
    "click",
    () =>
      appStore.set({
        commissionEditorOpen: false,
        commissionEditing: null,
        lastAction: "Fechou lançamento de comissão",
      }),
  );
  view.querySelectorAll("[data-commission-edit]").forEach((button) =>
    button.addEventListener("click", () => {
      const state = appStore.get(),
        deal = [...commissionDeals, ...(state.commissionEntries || [])].find(
          (item) => item.id === button.dataset.commissionEdit,
        );
      if (deal)
        appStore.set({
          commissionEditorOpen: true,
          commissionEditing: deal,
          lastAction: `Editou ${deal.id}`,
        });
    }),
  );
  view.querySelectorAll("[data-commission-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.commissionDelete;
      if (!confirmRef(`Excluir o lançamento ${id}?`)) return;
      const state = appStore.get();
      appStore.set({
        commissionHiddenIds: [...(state.commissionHiddenIds || []), id],
        lastAction: `Excluiu lançamento ${id}`,
      });
      notify("Lançamento removido da carteira exibida.", "success");
    }),
  );
  view.querySelectorAll("[data-commission-open]").forEach((button) =>
    button.addEventListener("click", () => {
      const deal = commissionDeals.find(
        (item) => item.id === button.dataset.commissionOpen,
      );
      if (deal)
        appStore.set({
          selectedCommissionContract: deal.id,
          lastAction: `Abriu contrato ${deal.id}`,
        });
      else notify("Lançamento local aberto para edição.");
    }),
  );
  view.querySelector("[data-commission-entry-form]")?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const values = Object.fromEntries(
          new FormDataCtor(event.currentTarget).entries(),
        ),
        state = appStore.get(),
        rate = Number(values.rate || 0),
        value = formatBRL(values.value),
        id =
          state.commissionEditing?.id ||
          `CT-LOCAL-${DateCtor.now().toString().slice(-6)}`;
      const entry = {
        id,
        profile: values.profile,
        lot: values.lot.toUpperCase(),
        quadra: `Lote ${values.lot.toUpperCase()}`,
        client: values.client,
        status: values.status,
        value,
        commission: formatBRL((brlToNumber(value) * rate) / 100),
        rate: `${rate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`,
        date: new DateCtor().toLocaleDateString("pt-BR"),
        payment: "A definir",
        purpose: "A definir",
        stage: "Cadastro comercial local",
      };
      const existing = (state.commissionEntries || []).filter(
        (item) => item.id !== id,
      );
      appStore.set({
        commissionEntries: [...existing, entry],
        commissionEditorOpen: false,
        commissionEditing: null,
        lastAction: `Salvou lançamento ${id}`,
      });
      notify("Lançamento comercial salvo na carteira local.", "success");
    },
  );
  const commissionForm = view.querySelector("[data-commission-entry-form]");
  commissionForm
    ?.querySelector('button[type="submit"]')
    ?.addEventListener("click", (event) => {
      // Some embedded map layers can intercept a native submit. Keep the save
      // action explicit while preserving the standard form as a keyboard fallback.
      event.preventDefault();
      commissionForm.dispatchEvent(
        new EventCtor("submit", { bubbles: true, cancelable: true }),
      );
    });
};
