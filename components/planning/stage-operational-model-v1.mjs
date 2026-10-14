/** Bind the stage data model helpers to the real application repositories. */
export const createStageOperationalModelV1 = ({
  appStore,
  demoData,
  executionModel,
  stageOverlayKey,
  stageProfileSettingsFor,
  stageMaterialsFor,
  esc,
} = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Stage operational model requires appStore.get().");
  if (!Array.isArray(executionModel?.stages))
    throw new TypeError("Stage operational model requires executionModel.stages.");
  for (const [name, value] of Object.entries({ stageOverlayKey, stageProfileSettingsFor, stageMaterialsFor, esc }))
    if (typeof value !== "function")
      throw new TypeError(`Stage operational model requires ${name}().`);

  const stageOf = (record) => String(record?.etapa || record?.stage || record?.atividade || "Etapa operacional");
  const stageV9LiveFor = (stage) => {
    const activities = Array.isArray(demoData.activities) ? demoData.activities : [];
    return activities.find((item) => item.id === stage.id || item.name === stage.name) ||
      activities.find((item) => stageOverlayKey(item.name) === stageOverlayKey(stage.name)) || {};
  };
  const stageV9ByState = (state) => {
    const stages = Array.isArray(executionModel.stages) ? executionModel.stages : [];
    return stages.find((item) => String(item.key) === String(state.selectedStageV9 || "")) ||
      stages.find((item) => String(item.key) === String(state.selectedStage || "")) ||
      stages.find((item) => String(item.id) === String(state.selectedStage || "")) ||
      stages.find((item) => item.name === state.selectedStage) || stages[0];
  };
  const stageV9OperationalFor = (stage, state = appStore.get()) => {
    const rows = state.operationalState?.stages || state.operationalState?.stageAllocations || [];
    return rows.find((item) => item.key === stage.key || item.stageKey === stage.key || item.name === stage.name) || {};
  };
  const stageV9ProfileFor = (stage) => {
    const saved = stageProfileSettingsFor(stage.key) || {};
    return { ...(stage.executionProfile || {}), ...saved };
  };
  const stageV9ProductionFor = (stage) => {
    const production = stage.production || {};
    return `${production.quantity == null ? "—" : production.quantity.toLocaleString?.("pt-BR") || production.quantity} ${production.unit || "un."} · ${production.rate || "—"} ${production.rateUnit || ""}`.trim();
  };
  const stageV9MaterialsFor = (stage) => {
    const configured = stageMaterialsFor(stage.name);
    if (configured.length) return configured;
    return (stage.materials || []).map((name, index) => ({
      name,
      scope: "Requisito operacional",
      quantity: null,
      unit: "—",
      status: index === 0 ? "Principal" : "Planejado",
    }));
  };
  const stageV9BudgetFor = (stage, state = appStore.get()) => {
    const operational = stageV9OperationalFor(stage, state),
      cents = Number(operational.needCents || operational.budgetCents || 0);
    return cents > 0 ? cents / 100 : 2800000 * Number(stage.cashWeight || 0);
  };
  const stageV9StatusFor = (live) => Number(live.progress) >= 100 ? "Concluída" : Number(live.progress) > 0 ? "Em andamento" : "Planejada";
  const stageV9DirectiveText = (stage, profile) => profile.typicalDescription ||
    `A inteligência acompanha ${stage.name.toLowerCase()} por produção, caixa, dependências e comprovações.`;
  const stageV9FlowPackets = (stage) => {
    const production = stage.production || {};
    return [
      { key: "front", label: "Preparar frente", detail: "Confirmar equipe, área liberada, materiais e segurança.", trigger: "Fato: frente liberada", unit: "checklist" },
      { key: "execute", label: "Executar atividade", detail: `Medir ${production.unit || "produção"} conforme a unidade cadastrada.`, trigger: "Fato: produção apontada", unit: production.rateUnit || production.unit || "un." },
      { key: "measure", label: "Validar medição", detail: "Conferir quantidade, evidência, orçamento e responsável.", trigger: "Fato: evidência anexada", unit: "medição" },
      { key: "release", label: "Liberar próxima frente", detail: "Propagar status, pedido e notificação somente após validação.", trigger: "Diretriz: completude confirmada", unit: "liberação" },
    ];
  };
  const stageV9EscList = (items, empty = "Não configurado") => Array.isArray(items) && items.length
    ? items.map((item) => `<li>${esc(item)}</li>`).join("")
    : `<li>${empty}</li>`;
  const stageV9TreeNode = (kind, title, detail, meta = "") =>
    `<article class="stage-v9-tree-node"><span>${esc(kind)}</span><b>${esc(title)}</b><small>${esc(detail)}</small>${meta ? `<em>${esc(meta)}</em>` : ""}</article>`;

  return Object.freeze({
    stageOf,
    stageV9LiveFor,
    stageV9ByState,
    stageV9OperationalFor,
    stageV9ProfileFor,
    stageV9ProductionFor,
    stageV9MaterialsFor,
    stageV9BudgetFor,
    stageV9StatusFor,
    stageV9DirectiveText,
    stageV9FlowPackets,
    stageV9EscList,
    stageV9TreeNode,
  });
};
