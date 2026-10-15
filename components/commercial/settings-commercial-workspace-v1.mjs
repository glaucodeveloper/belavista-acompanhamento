/** Complete commercial-settings page and its form/event behavior. */
export const installSettingsCommercialWorkspaceV1 = (ViewLayer, {
  appStore,
  brokerReasonsV9,
  executionModel,
  esc,
  ico,
  notify,
  settingsAuditTemplate,
  FormDataCtor = globalThis.FormData,
} = {}) => {
  if (!ViewLayer?.prototype || typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Commercial settings require ViewLayer and appStore get/set.");
  for (const [name, dependency] of Object.entries({ brokerReasonsV9, esc, ico, notify }))
    if (typeof dependency !== "function") throw new TypeError(`Commercial settings require ${name}().`);
  if (!executionModel || typeof executionModel !== "object")
    throw new TypeError("Commercial settings require the execution model.");
  if (typeof FormDataCtor !== "function")
    throw new TypeError("Commercial settings require a FormData constructor.");

  const settingsCommissionRulesV1 = (state, period) => {
    const saved = state.commissionRulesByPeriodV1?.[period];
    return Array.isArray(saved) ? saved : brokerReasonsV9(state).map((item) => ({ ...item }));
  };

  const settingsCompensationMarkupV1 = (state, kind) => {
    const isStage = kind === "stage",
      title = isStage ? "Compensação de etapas" : "Compensação de atividades",
      collection = isStage ? state.stageCompensationsV1 || [] : state.activityCompensationsV1 || [],
      stages = executionModel.stages || [];
    return `<section class="settings-compensation-card"><header><div><span class="activity-kind">AJUSTE DE PLANEJAMENTO</span><h2>${title}</h2><p>Registre prazo, esforço ou custo adicional com justificativa rastreável.</p></div><span>${collection.length} regra(s)</span></header><form data-settings-compensation-form="${kind}"><input type="hidden" name="id"><label>${isStage ? "Etapa" : "Atividade"}${isStage ? `<select name="stageKey" required>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}</select>` : `<input name="activity" required placeholder="Ex.: teste de pressão da rede">`}</label>${isStage ? `<label>Atividade associada<input name="activity" placeholder="Todas ou atividade específica"></label>` : `<label>Etapa associada<select name="stageKey" required>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}</select></label>`}<label>Tipo de compensação<select name="mode"><option value="prazo">Prazo (dias)</option><option value="esforco">Esforço (%)</option><option value="custo">Custo (R$)</option></select></label><label>Valor<input name="value" type="number" min="0" step="0.1" required placeholder="0"></label><label class="wide">Descrição e justificativa<textarea name="description" rows="2" required placeholder="Motivo, requisito ou condição que originou o ajuste"></textarea></label><button type="submit">${ico("save")} Salvar compensação</button></form><div class="settings-compensation-list">${collection.map((item) => `<article><div><b>${esc(isStage ? stages.find((stage) => stage.key === item.stageKey)?.name || item.stageKey : item.activity)}</b><small>${esc(item.activity || "Etapa completa")} · ${esc(item.mode)} ${esc(item.value)} · ${esc(item.description)}</small></div><button type="button" data-settings-compensation-edit="${esc(item.id)}" data-compensation-kind="${kind}">Editar</button><button type="button" data-settings-compensation-delete="${esc(item.id)}" data-compensation-kind="${kind}" aria-label="Excluir compensação">${ico("trash-2")}</button></article>`).join("") || '<p class="empty-data">Nenhuma compensação configurada.</p>'}</div></section>`;
  };

  ViewLayer.prototype.settings = function (...args) {
    const state = appStore.get(),
      periodLabels = { monthly: "Mensal", annual: "Anual", cumulative: "Acumulado" },
      period = periodLabels[state.settingsCommissionPeriodV1] ? state.settingsCommissionPeriodV1 : "monthly",
      rules = settingsCommissionRulesV1(state, period),
      base = typeof settingsAuditTemplate === "function" ? settingsAuditTemplate.apply(this, args) : "";
    const workspace = `<section class="settings-commercial-workspace" data-settings-commercial><header><div><span class="activity-kind">PARÂMETROS COMERCIAIS</span><h2>Regras de comissão e compensações</h2><p>As competências alteram as regras ativas usadas no cálculo e ficam registradas separadamente.</p></div><button type="button" class="toolbar-action" data-settings-apply-rules>${ico("check-check")} Aplicar à competência</button></header><nav class="settings-commission-periods" aria-label="Competência das regras">${Object.entries(periodLabels).map(([key, label]) => `<button type="button" class="${period === key ? "active" : ""}" data-settings-period="${key}">${label}</button>`).join("")}</nav><div class="settings-commission-rules">${rules.map((rule) => `<form data-settings-rule-form="${esc(rule.id)}"><input type="hidden" name="id" value="${esc(rule.id)}"><header><b>${esc(rule.label)}</b><small>${esc(rule.payment || "Regra de comissão")}</small></header><label>Nome da regra<input name="label" required value="${esc(rule.label)}"></label><label>Composição da comissão (%)<input name="sharePercent" type="number" min="0" max="100" step="0.1" value="${Number(rule.sharePercent ?? 0)}"></label><label>Warley (%)<input name="warley" type="number" min="0" max="100" step="0.1" value="${Number(rule.warley ?? 50)}"></label><label>Contraparte (%)<input name="partner" type="number" min="0" max="100" step="0.1" value="${Number(rule.partner ?? 50)}"></label><label class="wide">Descrição<input name="description" value="${esc(rule.description || "")}" placeholder="Condição para aplicação da regra"></label><button type="submit">${ico("save")} Salvar ${periodLabels[period].toLowerCase()}</button></form>`).join("")}</div><div class="settings-compensation-grid">${settingsCompensationMarkupV1(state, "activity")}${settingsCompensationMarkupV1(state, "stage")}</div><p class="settings-agenda-notice">Agenda no mobile: ${state.agendaMobileNotificationsEnabled ? "notificações autorizadas" : "notificações ainda não ativadas"} · ${Number(state.agendaMobileNotifications?.length || 0)} eventos notificados.</p></section>`;
    return `${base}${workspace}`;
  };

  const bindBeforeCommercialSettingsV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeCommercialSettingsV1.apply(this, args),
      root = this,
      route = this.dataset.view || appStore.get().view;
    if (route !== "settings") return result;
    const settings = root.querySelector("[data-settings-commercial]");
    if (!settings) return result;

    settings.querySelectorAll("[data-settings-period]").forEach((button) => button.addEventListener("click", () => {
      const state = appStore.get(), period = button.dataset.settingsPeriod,
        rules = settingsCommissionRulesV1(state, period),
        rulesByPeriod = { ...(state.commissionRulesByPeriodV1 || {}), [period]: rules };
      appStore.set({ settingsCommissionPeriodV1: period, reportPeriod: period, commissionReasons: rules, commissionRulesByPeriodV1: rulesByPeriod, lastAction: `Abriu regras ${button.textContent.trim()}` });
      this.render();
    }));
    settings.querySelectorAll("[data-settings-rule-form]").forEach((form) => form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormDataCtor(form)), state = appStore.get(),
        period = state.settingsCommissionPeriodV1 || "monthly",
        current = settingsCommissionRulesV1(state, period),
        warley = Math.max(0, Math.min(100, Number(values.warley) || 0)),
        partner = Math.max(0, Math.min(100, Number(values.partner) || 0));
      if (Math.abs(warley + partner - 100) > 0.01) {
        notify("A divisão de Warley e contraparte precisa totalizar 100%.", "warning");
        return;
      }
      const nextRules = current.map((rule) => rule.id === values.id ? { ...rule, label: String(values.label || "").trim(), sharePercent: Math.max(0, Math.min(100, Number(values.sharePercent) || 0)), warley, partner, description: String(values.description || "").trim() } : rule),
        rulesByPeriod = { ...(state.commissionRulesByPeriodV1 || {}), [period]: nextRules };
      appStore.set({ commissionReasons: nextRules, commissionRulesByPeriodV1: rulesByPeriod, lastAction: `Salvou regra comercial da competência ${period}` });
      this.render();
      notify("Regra salva e aplicada aos cálculos desta competência.", "success");
    }));
    for (const form of settings.querySelectorAll("[data-settings-compensation-form]")) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormDataCtor(form)), state = appStore.get(),
          kind = form.dataset.settingsCompensationForm,
          key = kind === "stage" ? "stageCompensationsV1" : "activityCompensationsV1",
          items = [...(state[key] || [])],
          row = { id: values.id || `comp-${kind}-${Date.now()}`, stageKey: values.stageKey, activity: String(values.activity || "").trim(), mode: values.mode, value: Number(values.value) || 0, description: String(values.description || "").trim(), updatedAt: new Date().toISOString() },
          next = values.id ? items.map((item) => item.id === values.id ? row : item) : [...items, row];
        appStore.set({ [key]: next, lastAction: `${values.id ? "Atualizou" : "Adicionou"} compensação de ${kind === "stage" ? "etapa" : "atividade"}` });
        this.render();
        notify("Compensação salva nas configurações.", "success");
      });
    }
    settings.querySelectorAll("[data-settings-compensation-edit]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.compensationKind, key = kind === "stage" ? "stageCompensationsV1" : "activityCompensationsV1",
        item = (appStore.get()[key] || []).find((row) => row.id === button.dataset.settingsCompensationEdit),
        form = settings.querySelector(`[data-settings-compensation-form="${kind}"]`);
      if (!item || !form) return;
      for (const [name, value] of Object.entries(item)) if (form.elements[name]) form.elements[name].value = value ?? "";
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    settings.querySelectorAll("[data-settings-compensation-delete]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.compensationKind, key = kind === "stage" ? "stageCompensationsV1" : "activityCompensationsV1", state = appStore.get();
      appStore.set({ [key]: (state[key] || []).filter((item) => item.id !== button.dataset.settingsCompensationDelete), lastAction: "Removeu regra de compensação" });
      this.render();
    }));
    settings.querySelector("[data-settings-apply-rules]")?.addEventListener("click", () => {
      const state = appStore.get(), period = state.settingsCommissionPeriodV1 || "monthly";
      appStore.set({ commissionRulesAppliedAt: new Date().toISOString(), commissionReasons: settingsCommissionRulesV1(state, period), lastAction: `Aplicou regras comerciais ${period}` });
      notify("Regras aplicadas à competência selecionada.", "success");
    });
    return result;
  };
};
