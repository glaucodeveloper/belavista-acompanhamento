const priorityChatRequestV1 = (action) =>
  [
    `Conduza pelo chat a execução encadeada desta prioridade operacional: ${action?.label || "Ação operacional"}.`,
    `Frente: ${action?.track || "não informada"}.`,
    `Etapa/relação: ${action?.relation || "não informada"}.`,
    `Situação ou bloqueio: ${action?.blocker || "sem bloqueio informado"}.`,
    `Prontidão: ${Number(action?.readiness) || 0}% · impacto: ${Number(action?.impact) || 0}.`,
    `Previsão/referência: ${action?.eta || "a definir"}.`,
    "Siga uma cadeia guiada: confira o estado atual e os pré-requisitos; execute pela API/ferramentas disponíveis as etapas seguras e dependentes; valide o resultado; depois informe o próximo passo concreto.",
    "Se faltarem dados ou documentos, prepare uma pendência no cronograma ou abra o fluxo documental quando aplicável e pergunte somente o que falta. Não declare etapas concluídas sem confirmação da ferramenta.",
    "O tom visual tone-done do card não prova que a ação sugerida já foi executada. Verifique antes; se já estiver concluída, não a repita e guie para o próximo passo ainda pendente da mesma prioridade.",
  ].join("\n");

/** Connects the operational priority cards to the existing worker assistant. */
export const installControlCenterPriorityChatV1 = (
  ViewLayer,
  {
    appStore,
    operationalActions,
    renderOperationalAiPrioritiesV1,
    CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
    notify,
    getWorkerAssistant = () => globalThis.belavistaWorkerAssistant,
  } = {},
) => {
  // The operational priority board belongs to the same planning surface as
  // its worker-chat action, while the base control-page renderer stays intact.
  const controlBeforeAiPrioritiesV1 = ViewLayer.prototype.control;
  ViewLayer.prototype.control = function (...args) {
    const html = controlBeforeAiPrioritiesV1.apply(this, args);
    const board = renderOperationalAiPrioritiesV1(operationalActions());
    return html.replace(
      /(?=<section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO)/,
      board,
    );
  };

  const bindBeforeControlAiPriorityChatV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeControlAiPriorityChatV1?.apply(this, args);
    this.querySelectorAll(".stage-home-ai-grid [data-stage-home-ai-action]").forEach((card) => {
      if (card.dataset.priorityChatBoundV1 === "true") return;
      card.dataset.priorityChatBoundV1 = "true";
      card.addEventListener("click", async () => {
        if (card.getAttribute("aria-busy") === "true") return;
        const actionId = String(card.dataset.stageHomeAiAction || ""),
          action = operationalActions().find(
            (item) => String(item.id || item.label || "") === actionId,
          );
        if (!action) return;
        const chat = getWorkerAssistant();
        if (!chat?.submit) {
          notify("Assistente operacional dos workers não está disponível nesta tela.", "warning");
          return;
        }
        chat.root?.classList.remove("is-collapsed");
        const minimize = chat.root?.querySelector("[data-worker-chat-minimize]");
        if (minimize) {
          minimize.textContent = "−";
          minimize.setAttribute("aria-label", "Minimizar assistente");
        }
        card.setAttribute("aria-busy", "true");
        appStore.set({
          lastAction: `Enviou prioridade ${action.label} ao assistente operacional dos workers`,
        });
        try {
          await chat.submit(priorityChatRequestV1(action), null, null, [], {
            mode: "priority",
            instruction: CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
            requestContext: {
              source: "stage-home-ai-priority",
              workflow: "guided-operational-action-chain",
              executionChain: [
                "verify-current-state-and-prerequisites",
                "execute-supported-safe-actions-through-tools",
                "validate-tool-confirmed-results",
                "prepare-pending-item-and-ask-only-missing-data-when-blocked",
                "guide-the-next-unfinished-step",
              ],
              cardTone: [...card.classList].find((name) => name.startsWith("tone-")) || "tone-active",
              priority: {
                id: action.id || action.label || "",
                label: action.label || "",
                track: action.track || "",
                phase: action.phase || "",
                relation: action.relation || "",
                blocker: action.blocker || "",
                readiness: Number(action.readiness) || 0,
                impact: Number(action.impact) || 0,
                eta: action.eta || "",
                requirements: action.requirements || [],
                materialRequirements: action.materialRequirements || [],
              },
            },
          });
        } finally {
          card.removeAttribute("aria-busy");
        }
      });
    });
    return result;
  };
};
