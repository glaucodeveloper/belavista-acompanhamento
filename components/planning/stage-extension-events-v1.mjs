/** Bind the original Agenda, activity catalogue, and progress-page controls. */
export const installStageExtensionEventsV1 = (ViewLayer, {
  appStore,
  notify,
  activityCatalog,
  demoData,
  esc,
  ico,
  extensionStage,
  runtimeRouteV1,
  apiFetch,
  operationalHeaders,
  window: windowRef = globalThis.window,
  FormData: FormDataRef = globalThis.FormData,
  Date: DateRef = globalThis.Date,
  console: consoleRef = globalThis.console,
} = {}) => {
  ViewLayer.prototype.bindStageExtensions = function () {
    const view = appStore.get().view;
    if (view === "agenda") {
      this.querySelectorAll("[data-agenda-day]").forEach((button) =>
        button.addEventListener("click", () => {
          this.querySelectorAll("[data-agenda-day]").forEach((item) =>
            item.classList.remove("active"),
          );
          button.classList.add("active");
          notify(`Agenda filtrada por ${button.textContent.trim()}.`);
          appStore.set({
            lastAction: `Filtrou agenda por ${button.textContent.trim()}`,
          });
        }),
      );
      this.querySelectorAll("[data-agenda-item]").forEach((item) =>
        item.addEventListener("click", (event) => {
          if (event.target.closest("button")) return;
          item.classList.toggle("selected");
          notify(
            item.classList.contains("selected")
              ? "Compromisso selecionado para acompanhamento."
              : "Compromisso recolhido.",
          );
        }),
      );
      this.querySelectorAll("[data-agenda-item-menu]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          notify(
            "Ações do compromisso: confirmar, reagendar ou registrar evidência.",
          );
          appStore.set({ lastAction: "Abriu ações do compromisso da agenda" });
        }),
      );
      this.querySelector("[data-agenda-new]")?.addEventListener("click", () => {
        appStore.set({
          view: "records",
          lastAction: "Abriu formulário para novo compromisso",
        });
      });
      this.querySelectorAll(".whatsapp-action,[data-agenda-whatsapp]").forEach(
        (button) => {
          button.lastChild.textContent = " Notificar";
          button.setAttribute("aria-label", "Notificar pelo TWA");
        },
      );
      this.querySelector("[data-agenda-whatsapp]")?.addEventListener(
        "click",
        () => {
          notify("Notificação da agenda preparada para o TWA.", "success");
          appStore.set({ lastAction: "Preparou notificação da agenda pelo TWA" });
        },
      );
      this.querySelector("[data-agenda-alert]")?.addEventListener("click", () => {
        notify("Alerta criado para o próximo compromisso da etapa.", "warning");
        appStore.set({ lastAction: "Criou alerta de prazo na agenda" });
      });
    }
    if (view === "activities") {
      this.querySelectorAll("[data-activity-category-filter]").forEach((button) =>
        button.addEventListener("click", () => {
          const category = button.dataset.activityCategoryFilter;
          this.querySelectorAll("[data-activity-category-filter]").forEach(
            (item) => item.classList.toggle("active", item === button),
          );
          this.querySelectorAll("[data-activity-card]").forEach((card) => {
            card.hidden =
              category !== "all" && card.dataset.activityCategory !== category;
          });
          notify(
            category === "all"
              ? "Exibindo todas as naturezas de atividade."
              : `Filtro aplicado: ${category}.`,
          );
          appStore.set({
            lastAction: `Filtrou atividades por ${category === "all" ? "todas as naturezas" : category}`,
          });
        }),
      );
      this.querySelectorAll("[data-activity-open]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const item = activityCatalog[Number(button.dataset.activityOpen)];
          const drawer = this.querySelector(".activity-detail-drawer");
          if (!item || !drawer) return;
          drawer.innerHTML = `<div class="activity-detail-head"><div><span class="activity-kind">${esc(item.nature)}</span><h2>${esc(item.name)}</h2><p>Fluxo relacionado à etapa ${esc(extensionStage().name)}.</p></div><button class="icon-btn compact" data-activity-close aria-label="Fechar detalhes">×</button></div><div class="activity-detail-progress"><span>Modelo de preenchimento</span><b>01 Inicial <i></i> 02 Execução <i></i> 03 Evidências</b></div><section class="activity-detail-section"><div class="extension-card-head"><h3>01 · Dados iniciais</h3>${ico("file-plus-2")}</div>${item.initial.map((field) => `<label>${esc(field)}<input placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join("")}</section><section class="activity-detail-section"><div class="extension-card-head"><h3>02 · Execução e evidências</h3>${ico("camera")}</div>${item.execution.map((field) => `<label>${esc(field)}<input placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join("")}</section><section class="activity-detail-section"><div class="extension-card-head"><h3>03 · Associações administrativas</h3>${ico("link-2")}</div><label>Responsável<select><option>Selecionar envolvido</option>${demoData.collaborators.map(([name]) => `<option>${esc(name)}</option>`).join("")}</select></label><label>Compra associada<input placeholder="ID do pedido ou fornecedor"></label><label>Material associado<input placeholder="Material · quantidade · unidade"></label><label>Comprovante<input type="file"></label></section><div class="activity-detail-actions"><button class="ghost" data-activity-add-record>${ico("clipboard-pen-line")} Registrar evidência</button><button class="primary" data-activity-save>${ico("save")} Salvar atividade</button></div>`;
          drawer.classList.add("open");
          drawer
            .querySelector("[data-activity-close]")
            ?.addEventListener("click", () => drawer.classList.remove("open"));
          drawer
            .querySelector("[data-activity-add-record]")
            ?.addEventListener("click", () =>
              appStore.set({
                view: "records",
                lastAction: `Abriu registro para ${item.name}`,
              }),
            );
          drawer
            .querySelector("[data-activity-save]")
            ?.addEventListener("click", () => {
              notify(`${item.name} salva com campos e associações.`, "success");
              appStore.set({ lastAction: `Salvou atividade ${item.name}` });
            });
          windowRef.lucide?.createIcons();
        }),
      );
      this.querySelector("[data-activity-new]")?.addEventListener("click", () => {
        const stage = extensionStage();
        const stageKey = stage?.id || "project";
        windowRef.location.assign(
          runtimeRouteV1(
            "/admin/workers/activity",
            `stage=${encodeURIComponent(stageKey)}&activity=new`,
          ),
        );
      });
    }
    if (view === "progress") {
      this.querySelectorAll("[data-progress-period]").forEach((button) =>
        button.addEventListener("click", () => {
          this.querySelectorAll("[data-progress-period]").forEach((item) =>
            item.classList.toggle("active", item === button),
          );
          notify(`Diário filtrado por ${button.textContent.trim()}.`);
          appStore.set({
            lastAction: `Filtrou diário por ${button.textContent.trim()}`,
          });
        }),
      );
      this.querySelector("[data-progress-stage]")?.addEventListener(
        "change",
        (event) => {
          const stage = demoData.activities.find(
            (item) => item.name === event.currentTarget.value,
          );
          if (stage)
            appStore.set({
              selectedStage: stage.id,
              lastAction: `Mudou diário para ${stage.name}`,
            });
        },
      );
      this.querySelector("[data-progress-new]")?.addEventListener("click", () => {
        const form = this.querySelector(".progress-entry-form");
        if (form) {
          form.hidden = false;
          form.scrollIntoView({ behavior: "smooth", block: "center" });
          form.querySelector("textarea")?.focus();
        }
      });
      this.querySelector("[data-progress-cancel]")?.addEventListener(
        "click",
        () => {
          const form = this.querySelector(".progress-entry-form");
          if (form) form.hidden = true;
        },
      );
      this.querySelectorAll("[data-progress-entry]").forEach((entry) =>
        entry.addEventListener("click", (event) => {
          if (event.target.closest("button")) return;
          entry.classList.toggle("expanded");
          appStore.set({
            lastAction: `${entry.classList.contains("expanded") ? "Abriu" : "Recolheu"} apontamento do diário`,
          });
        }),
      );
      this.querySelector("[data-progress-send]")?.addEventListener(
        "click",
        () => {
          notify(
            "Diário enviado para compor a medição físico-financeira.",
            "success",
          );
          appStore.set({ lastAction: "Enviou diário para medição" });
        },
      );
      this.querySelector("[data-progress-form]")?.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          const form = new FormDataRef(event.currentTarget),
            value = Object.fromEntries(form.entries());
          value.obra = "Aliança Park";
          value.data = new DateRef().toISOString().slice(0, 10);
          value.etapa = extensionStage().name;
          try {
            const response = await apiFetch("/api/records", {
              method: "POST",
              headers: operationalHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify(value),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const record = await response.json();
            appStore.update((state) => ({
              ...state,
              records: [record, ...(state.records || [])],
              lastAction: "Criou apontamento no diário",
            }));
            notify("Apontamento salvo no diário e no banco local.", "success");
          } catch (error) {
            notify(
              "Não foi possível salvar o apontamento no banco local.",
              "warning",
            );
            consoleRef.warn("Diário persistente indisponível.", error);
          }
        },
      );
    }
  };
  return ViewLayer;
};
