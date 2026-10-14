export function installDashboardFinalWorkspaceEventsV1(ViewLayer, options) {
  const {
    appStore,
    demoData,
    latestDealForV5360,
    apiFetch,
    operationalHeaders,
    notify,
    baseBind = ViewLayer.prototype.bind,
    windowRef = globalThis.window,
    DateCtor = globalThis.Date,
  } = options;

  ViewLayer.prototype.bind = function () {
      baseBind?.call(this);
  
      this.querySelectorAll("[data-v5360-record]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          appStore.set({
            selectedRecordV5360: button.dataset.v5360Record,
            lastAction: `Abriu página dedicada do registro ${button.dataset.v5360Record}`,
          });
        }),
      );
  
      this.querySelectorAll("[data-v5360-record-row]").forEach((row) =>
        row.addEventListener("dblclick", () => {
          appStore.set({
            selectedRecordV5360: row.dataset.v5360RecordRow,
            lastAction: `Abriu registro ${row.dataset.v5360RecordRow}`,
          });
        }),
      );
  
      this.querySelector("[data-v5360-record-back]")?.addEventListener(
        "click",
        () => {
          appStore.set({
            selectedRecordV5360: null,
            lastAction: "Voltou ao dashboard do Diário",
          });
        },
      );
  
      this.querySelectorAll("[data-v5360-stage-card]").forEach((button) =>
        button.addEventListener("click", () => {
          const activity = (demoData.activities || []).find(
            (item) =>
              String(item.id || item.name) ===
              String(button.dataset.v5360StageCard),
          );
          appStore.set({
            view: "activities",
            selectedActivity:
              activity?.id || activity?.name || button.dataset.v5360StageCard,
            activityDedicated: true,
            lastAction: `Abriu atividade ${activity?.name || button.dataset.v5360StageCard}`,
          });
        }),
      );
  
      this.querySelectorAll("[data-v5360-commission-toggle]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const state = appStore.get();
          appStore.set({
            dashboardCommissionOpenV5360: !state.dashboardCommissionOpenV5360,
            dashboardCommissionBrokerV5360: null,
            lastAction: state.dashboardCommissionOpenV5360
              ? "Fechou comissões rápidas"
              : "Abriu comissões rápidas",
          });
        }),
      );
  
      this.querySelectorAll("[data-v5360-broker]").forEach((button) =>
        button.addEventListener("click", () => {
          appStore.set({
            dashboardCommissionOpenV5360: true,
            dashboardCommissionBrokerV5360: button.dataset.v5360Broker,
            lastAction: `Abriu corretor ${button.textContent.trim()} dentro do widget`,
          });
        }),
      );
  
      this.querySelector("[data-v5360-broker-back]")?.addEventListener(
        "click",
        () => {
          appStore.set({
            dashboardCommissionOpenV5360: true,
            dashboardCommissionBrokerV5360: null,
            lastAction: "Voltou à lista rápida de corretores",
          });
        },
      );
  
      this.querySelectorAll("[data-v5360-commission-open]").forEach((button) =>
        button.addEventListener("click", () => {
          appStore.set({
            view: "commissions",
            selectedCommissionProfile: button.dataset.v5360CommissionOpen,
            selectedCommissionContract: null,
            lastAction: "Abriu carteira de comissão do corretor",
          });
        }),
      );
  
      this.querySelectorAll("[data-v5360-commission-correction]").forEach(
        (button) =>
          button.addEventListener("click", () => {
            const profile = button.dataset.v5360CommissionCorrection;
            const last = latestDealForV5360(profile);
            appStore.set({
              view: "commissions",
              selectedCommissionProfile: null,
              selectedCommissionContract: null,
              commissionEditorOpen: true,
              commissionEditing: last || null,
              commissionFilters: { query: "", status: "all", profile },
              lastAction: "Abriu correção da última atividade de comissão",
            });
          }),
      );
  
      this.querySelector("[data-v5360-inference-test]")?.addEventListener(
        "click",
        async (event) => {
          const button = event.currentTarget;
          const status = this.querySelector("[data-v5360-inference-status]");
          button.disabled = true;
          if (status) status.textContent = "Executando dry-run…";
  
          try {
            const response = await apiFetch("/api/operational-loop", {
              method: "POST",
              headers: operationalHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                trigger: "admin.dashboard.inference-test-v5360",
                dryRun: true,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
              throw new Error(payload.error || `HTTP ${response.status}`);
  
            const trace =
              payload.metaTrace ||
              payload.metadataTrace ||
              payload.metaUsage ||
              payload.fieldsUsed ||
              payload.trace ||
              null;
  
            appStore.set({
              lastInferenceTestV5360: {
                ok: true,
                at: new DateCtor().toISOString(),
                trace,
              },
              lastAction: "Inferência operacional dry-run concluída",
            });
  
            notify("Inferência operacional respondeu em dry-run.", "success");
          } catch (error) {
            if (status) status.textContent = `Falha: ${error.message}`;
            appStore.set({
              lastInferenceTestV5360: {
                ok: false,
                at: new DateCtor().toISOString(),
                error: error.message,
              },
              lastAction: "Teste de inferência falhou",
            });
            notify("Teste de inferência indisponível.", "warning");
          } finally {
            button.disabled = false;
          }
        },
      );
  
      windowRef.lucide?.createIcons();
    };
}

