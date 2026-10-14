const requireDependencies = (dependencies) => {
  const required = ["appStore", "operationalActions", "extensionStage", "controlStageProfileV1", "esc", "ico", "notify"];
  for (const name of required) {
    if (dependencies[name] == null)
      throw new TypeError(`AI action reflection requires ${name}.`);
  }
  if (typeof dependencies.appStore.get !== "function" || typeof dependencies.appStore.set !== "function")
    throw new TypeError("AI action reflection requires appStore.get() and set().");
  for (const name of required.slice(1)) {
    if (typeof dependencies[name] !== "function")
      throw new TypeError(`AI action reflection requires ${name}().`);
  }
  return dependencies;
};

const inferScheduleImpact = (stage, profile, action, state) => {
  const requirements = profile?.requirements || [],
    conditions = profile?.conditions || [],
    requests = profile?.requestHints || [],
    production = profile?.production || stage?.production || {};
  const changed =
      state?.aiComprehensionChanges?.stageKey === stage?.key
        ? state.aiComprehensionChanges?.fields || []
        : [],
    positionChange = state?.aiActionPositionChanges?.[action?.id],
    from = positionChange?.from || {
      impact: Number(action?.impact) || 0,
      readiness: Number(action?.readiness) || 0,
    },
    to = positionChange?.to || {
      impact: Number(action?.impact) || 0,
      readiness: Number(action?.readiness) || 0,
    },
    impactDelta = to.impact - from.impact,
    readinessDelta = to.readiness - from.readiness;
  const signals = [
    changed.length ? `alterou ${changed.join(", ")}` : null,
    requirements.length ? `${requirements.length} requisito(s)` : null,
    conditions.length ? `${conditions.length} condição(ões) de liberação` : null,
    requests.length ? `${requests.length} gatilho(s) de requisição` : null,
    profile?.organizationRequest ? "instrução de organização da IA" : null,
  ].filter(Boolean);
  const cadence = Number(production.rate) > 0
      ? `${production.rate} ${production.rateUnit || "un./dia"}`
      : "ritmo ainda não definido",
    gate = conditions.length
      ? "A atividade seguinte só é liberada após validar as condições informadas."
      : "A sequência pode avançar sem um novo portão textual configurado.",
    positionSummary = positionChange
      ? `ponto movido de impacto ${from.impact} / prontidão ${from.readiness}% para impacto ${to.impact} / prontidão ${to.readiness}%`
      : `posição atual: impacto ${to.impact} / prontidão ${to.readiness}% (mova o ponto para gerar uma nova inferência)`,
    positionEffect = impactDelta > 0 && readinessDelta > 0
      ? "ganhou prioridade e prontidão para execução imediata"
      : impactDelta > 0
        ? "ganhou prioridade no cronograma"
        : readinessDelta > 0
          ? "ficou mais pronta para execução"
          : impactDelta < 0 && readinessDelta < 0
            ? "perdeu prioridade e prontidão, devendo aguardar revisão"
            : "teve sua posição recalibrada sem mudança de quadrante";
  return {
    signals: [
      positionSummary,
      signals.length ? `contexto secundário: ${signals.join(" · ")}` : "sem parâmetros textuais adicionais",
    ].join(" · "),
    cadence,
    gate,
    positionEffect,
    summary: positionChange
      ? "A inferência foi recalculada a partir da mudança de posição do ponto no gráfico."
      : profile?.organizationRequest || profile?.typicalDescription ||
        `A posição atual do ponto orienta a ordenação da ação ${action?.label || "selecionada"}.`,
  };
};

/** Install the AI reflection panel and its schedule-recording interaction. */
export const installAiActionReflectionV1 = (ViewLayer, dependencies = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype !== "object")
    throw new TypeError("AI action reflection requires ViewLayer.prototype.");
  const { appStore, operationalActions, extensionStage, controlStageProfileV1, esc, ico, notify } = requireDependencies(dependencies);
  const baseActions = ViewLayer.prototype.actions;
  ViewLayer.prototype.actions = function (...args) {
    const html = baseActions?.apply(this, args) || "";
    const state = appStore.get(),
      actions = operationalActions(),
      selected = actions.find((item) => item.id === state.selectedAiAction) || actions[0],
      stage = extensionStage(),
      profile = controlStageProfileV1(stage, state),
      impact = inferScheduleImpact(stage, profile, selected, state);
    if (!selected) return html.replace('<aside class="action-inspector">', '<aside class="action-inspector">');
    const quadrant = selected.impact >= 75 && selected.readiness >= 75
      ? "Executar agora"
      : selected.impact >= 75
        ? "Preparar"
        : "Oportunidade";
    const markup = `<section class="ai-action-reflection-panel" data-ai-action-reflection><header><span class="activity-kind">INFERÊNCIA PELO GRÁFICO · ${esc(stage.name)}</span><b>Impacto do reposicionamento no cronograma</b><small>A leitura é recalculada quando um ponto muda de posição na matriz.</small></header><div class="ai-reflection-step"><small>01 · MOVIMENTO DO PONTO</small><p>${esc(impact.summary)}</p><span>${esc(impact.signals)}</span></div><div class="ai-reflection-step"><small>02 · IMPACTO INFERIDO</small><p>O reposicionamento indica que <strong>${esc(selected.label)}</strong> ${esc(impact.positionEffect)}. A IA classifica como <strong>${quadrant}</strong>, considerando também o bloqueio “${esc(selected.blocker)}” e o vínculo “${esc(selected.relation)}”.</p></div><div class="ai-reflection-step"><small>03 · GERAÇÃO DO CRONOGRAMA</small><p>${esc(impact.gate)} A próxima janela <strong>${esc(selected.eta)}</strong> organiza a execução e a atividade será refletida no caminho de ${esc(selected.track)}.</p></div><button type="button" class="ai-reflection-apply" data-ai-reflection-apply="${esc(selected.id)}">${ico("calendar-check-2")} Registrar inferência no cronograma</button></section>`;
    return html.replace('<aside class="action-inspector">', '<aside class="action-inspector">' + markup);
  };

  const baseBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = baseBind?.apply(this, args);
    this.querySelectorAll("[data-ai-reflection-apply]").forEach((button) => {
      if (button.dataset.reflectionBound === "true") return;
      button.dataset.reflectionBound = "true";
      button.addEventListener("click", () => {
        const id = button.dataset.aiReflectionApply,
          action = operationalActions().find((item) => item.id === id);
        if (!action) return;
        const currentState = appStore.get(),
          reflections = {
            ...(currentState.aiScheduleReflections || {}),
            [id]: {
              at: new Date().toISOString(),
              eta: action.eta,
              phase: action.phase,
              relation: action.relation,
              position: currentState.aiActionPositionChanges?.[id] || null,
            },
          };
        appStore.set({
          aiScheduleReflections: reflections,
          lastAction: `Refletiu a ação ${action.label} no cronograma`,
        });
        notify("Inferência baseada no gráfico registrada no cronograma operacional.", "success");
      });
    });
    return result;
  };
  return ViewLayer;
};
