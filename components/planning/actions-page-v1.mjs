/** Complete Actions page renderer and interaction binding. */
export const createActionsPageV1 = ({
  appStore,
  extensionStage,
  operationalActions,
  OPERATIONAL_PHASES,
  esc,
  ico,
  notify,
  window: windowRef,
  Date: DateCtor = Date,
} = {}) => {
  const render = function () {
    const stage = extensionStage(),
      actions = operationalActions(),
      selectedId = appStore.get().selectedAiAction || actions[0].id,
      selected = actions.find((item) => item.id === selectedId) || actions[0];
    const points = actions
      .map(
        (item) =>
          `<button type="button" class="action-point ${item.id === selected.id ? "selected" : ""} phase-${item.phase}" data-ai-action="${item.id}" style="left:${item.readiness}%;bottom:${item.impact}%" title="${esc(item.label)} · impacto ${item.impact} · prontidão ${item.readiness}"><span></span><b>${esc(item.label)}</b><small>${item.readiness}% pronto</small></button>`,
      )
      .join("");
    const highNow = actions.filter((item) => item.impact >= 75 && item.readiness >= 75).length;
    return `<div class="stage-extension-page ai-actions-page"><div class="extension-head"><div><span class="activity-kind">IA · AGENDA GERAL · ${esc(stage.name)}</span><h1>Ações por evolução e prontidão</h1><p>As ações são propagadas da agenda geral conforme avanço confirmado, dependências lógicas, materiais e descrição operacional de referência.</p></div><div class="extension-head-actions"><span class="ai-ready-count">${highNow} ações em “executar agora”</span></div></div><div class="action-workspace"><section class="action-matrix" data-action-matrix><div class="matrix-quadrant q-now"><b>EXECUTAR AGORA</b><small>alto impacto · alta prontidão</small></div><div class="matrix-quadrant q-prepare"><b>PREPARAR</b><small>alto impacto · baixa prontidão</small></div><div class="matrix-quadrant q-opportunity"><b>OPORTUNIDADES</b><small>prontas · menor impacto</small></div><div class="matrix-axis axis-y"><span>IMPACTO</span><b>alto</b><small>baixo</small></div><div class="matrix-axis axis-x"><span>PRONTIDÃO</span><small>preparar</small><b>pronto</b></div>${points}</section><aside class="action-inspector"><span class="activity-kind">${esc(selected.track).toUpperCase()} · ${esc(OPERATIONAL_PHASES[selected.phase])}</span><h2>${esc(selected.label)}</h2><div class="action-score"><div><small>IMPACTO</small><b>${selected.impact}</b></div><div><small>PRONTIDÃO</small><b>${selected.readiness}%</b></div></div><dl><dt>Responsável</dt><dd>${esc(selected.owner)}</dd><dt>Próxima janela</dt><dd>${esc(selected.eta)}</dd><dt>Bloqueio atual</dt><dd>${esc(selected.blocker)}</dd><dt>Entidade ligada</dt><dd>${esc(selected.relation)}</dd><dt>Referência de execução</dt><dd>${esc(selected.referenceDescription || "Descrição operacional da etapa")}</dd><dt>Requisitos materiais</dt><dd>${esc((selected.materialRequirements || []).join(" · ") || "Sem falta material registrada")}</dd></dl><div class="action-inspector-buttons"><button class="primary" data-ai-advance="${selected.id}">${selected.phase >= 4 ? ico("check-circle") + " Encerrada" : ico("arrow-right") + " Adiantar atitude"}</button></div></aside></div></div>`;
  };

  const bind = function (layer, view) {
    if (view !== "actions" && !layer.querySelector("[data-dashboard-action-workspace]")) return;
    const matrix = layer.querySelector("[data-action-matrix]");
    layer.querySelectorAll("[data-ai-action]").forEach((point) => {
      point.addEventListener("click", () => {
        if (point.dataset.dragged === "true") {
          delete point.dataset.dragged;
          return;
        }
        appStore.set({
          selectedAiAction: point.dataset.aiAction,
          lastAction: `Selecionou ação IA ${point.textContent.trim()}`,
        });
      });
      point.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !matrix) return;
        event.preventDefault();
        event.stopPropagation();
        const id = point.dataset.aiAction,
          current = operationalActions().find((item) => item.id === id) || {},
          from = { impact: Number(current.impact) || 0, readiness: Number(current.readiness) || 0 };
        let moved = false;
        point.setPointerCapture?.(event.pointerId);
        const move = (ev) => {
          const rect = matrix.getBoundingClientRect(),
            readiness = Math.max(4, Math.min(96, Math.round(((ev.clientX - rect.left) / rect.width) * 100))),
            impact = Math.max(4, Math.min(96, Math.round(((rect.bottom - ev.clientY) / rect.height) * 100)));
          point.style.left = `${readiness}%`;
          point.style.bottom = `${impact}%`;
          point.dataset.nextReadiness = readiness;
          point.dataset.nextImpact = impact;
          moved = true;
        };
        const up = () => {
          point.releasePointerCapture?.(event.pointerId);
          windowRef.removeEventListener("pointermove", move);
          windowRef.removeEventListener("pointerup", up);
          if (!moved) return;
          point.dataset.dragged = "true";
          const to = { readiness: Number(point.dataset.nextReadiness), impact: Number(point.dataset.nextImpact) },
            actions = operationalActions().map((item) => item.id === id ? { ...item, ...to } : item),
            positionChanges = { ...(appStore.get().aiActionPositionChanges || {}), [id]: { at: new DateCtor().toISOString(), from, to } };
          appStore.set({
            aiActions: actions,
            aiActionPositionChanges: positionChanges,
            selectedAiAction: id,
            lastAction: `Reposicionou ação ${id} na matriz`,
          });
          notify("Impacto e prontidão recalculados para a ação.", "success");
        };
        windowRef.addEventListener("pointermove", move);
        windowRef.addEventListener("pointerup", up, { once: true });
      });
    });

    layer.querySelector("[data-ai-advance]")?.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.aiAdvance,
        nextPhase = Math.min(4, (Number(operationalActions().find((item) => item.id === id)?.phase) || 0) + 1),
        actions = operationalActions().map((item) => item.id === id ? {
          ...item,
          phase: nextPhase,
          readiness: Math.min(100, item.readiness + 8),
          blocker: item.phase >= 2 ? "Sem bloqueios críticos" : "Pré-condição atualizada pela IA",
        } : item);
      appStore.set({ aiActions: actions, selectedAiAction: id, lastAction: `Adiantou atitude ${id}` });
      notify("Ação avançou uma etapa.", "success");
    });
  };

  return Object.freeze({ render, bind });
};
