/** Data projections, activity tracking, and material markup for Control Center. */
export const createControlCenterDataV1 = ({
  appStore,
  formatBRL,
  publishOperationalEvent,
  esc,
  ico,
  Date: DateImpl = Date,
} = {}) => {
  if (!appStore || typeof appStore.get !== "function" || typeof appStore.update !== "function")
    throw new TypeError("Control Center data requires appStore.get() and appStore.update().");
  if (typeof formatBRL !== "function") throw new TypeError("Control Center data requires formatBRL().");
  if (typeof publishOperationalEvent !== "function")
    throw new TypeError("Control Center data requires publishOperationalEvent().");
  if (typeof esc !== "function" || typeof ico !== "function")
    throw new TypeError("Control Center data requires esc() and ico().");

  const isAssistantVisualAdditionV1 = (item) => {
    if (!item || typeof item !== "object") return false;
    if (item.source === "chat-visual") return true;
    const properties = Array.isArray(item.properties)
      ? item.properties
      : item.properties && typeof item.properties === "object"
        ? Object.entries(item.properties).map(([id, value]) => ({ id, value }))
        : [];
    return properties.some(
      (property) =>
        property?.id === "allocation_source" &&
        /assistente operacional|leitura visual|ocr/i.test(String(property.value || "")),
    );
  };

  const controlCenterMaterialRowsV1 = (state) => {
    const overrides = state.controlMaterialOverrides || {};
    const records = Array.isArray(state.records) ? state.records : [];
    return (state.materialCatalogAdditions || [])
      .filter(isAssistantVisualAdditionV1)
      .map((item) => {
        const sourceRecord = records.find(
          (record) => String(record.id) === String(item.sourceRecordId),
        );
        const itemAttachments = item.attachments,
          hasItemAttachments = Array.isArray(itemAttachments)
            ? itemAttachments.length > 0
            : Boolean(itemAttachments && typeof itemAttachments === "object" && Object.keys(itemAttachments).length);
        return {
          ...sourceRecord,
          ...item,
          properties: Array.isArray(item.properties) && item.properties.length
            ? item.properties
            : sourceRecord?.properties || item.properties || [],
          attachments: hasItemAttachments ? itemAttachments : sourceRecord?.attachments || [],
          files: item.files?.length ? item.files : sourceRecord?.files || [],
          evidencias: item.evidencias?.length ? item.evidencias : sourceRecord?.evidencias || [],
          evidenceUri: item.evidenceUri || sourceRecord?.evidenceUri,
          comprovante: item.comprovante || sourceRecord?.comprovante,
          ...(overrides[item.id] || {}),
        };
      })
      .filter((item) => !overrides[item.id]?.deleted);
  };

  const controlCenterFinanceRowsV1 = (state) => {
    const rows = Array.isArray(state.cashFlowLocal) ? state.cashFlowLocal : [];
    return rows.length
      ? rows.slice(0, 10)
      : [
          {
            id: "DEMO-CAIXA-01",
            date: "—",
            kind: "Saldo inicial",
            stage: "Projeto",
            amount: 0,
            description: "Nenhum lançamento local neste dispositivo",
          },
        ];
  };

  const controlCenterMoneyV1 = (value) =>
    formatBRL(Number(value?.amount ?? value?.value ?? 0));

  const controlCenterRecordChangeV1 = (label, detail, entity = {}) => {
    const at = new DateImpl().toISOString(),
      entry = {
        id: `CTRL-${DateImpl.now().toString(36).toUpperCase()}`,
        label,
        detail,
        entity,
        at,
        actor: appStore.get().currentActor?.name || "Usuário autorizado",
      };
    appStore.update((state) => ({
      ...state,
      controlChangeLog: [entry, ...(state.controlChangeLog || [])].slice(0, 30),
      lastAction: `Central ouviu: ${label}`,
    }));
    return entry;
  };

  const controlCenterPublishV1 = (event, entity, entityId, payload) =>
    publishOperationalEvent({
      actor: appStore.get().currentActor || {},
      type: event,
      entity,
      entityId,
      payload: { ...payload, projectId: "project-alianca-park" },
    }).catch((error) =>
      console.info(
        "Evento da Central mantido localmente; RTDB indisponível.",
        error,
      ),
    );

  const controlCenterMaterialsAccordionMarkupV1 = (materials, stages) => {
    const groups = stages
      .map((stage) => ({
        stage,
        items: materials.filter((item) => item.stageKey === stage.key),
      }))
      .filter((group) => group.items.length);
    if (!groups.length)
      return '<div class="control-material-accordion-empty">Nenhum material ou equipamento relacionado às etapas.</div>';
    return `<div class="control-material-accordion-list">${groups.map(({ stage, items }, index) => `<details class="control-material-accordion" ${index === 0 ? "open" : ""}><summary><span><small>ETAPA · ${esc(stage.key)}</small><b>${esc(stage.name)}</b><em>${items.length} propriedade(s) vinculada(s)</em></span><i>${ico("chevron-down")}</i></summary><div class="control-material-accordion-body"><p class="control-material-group-description">Esta composição orienta a frente de <strong>${esc(stage.name)}</strong>. Cada propriedade possui quantidade, unidade e situação próprias para facilitar a leitura e a decisão operacional.</p><div class="control-material-property-grid">${items.map((item) => `<article class="control-material-property" data-control-material-row="${esc(item.id)}"><header><div><small>PROPRIEDADE MATERIAL · ${esc(item.activityName || "Atividade principal")}</small><h3>${esc(item.name)}</h3><p>${esc(item.scope || "Requisito operacional da etapa, aguardando descrição complementar.")}</p></div><span class="control-material-status">${esc(item.status || "Planejado")}</span></header><div class="control-material-fields"><label><span>Quantidade<small>volume previsto ou medido</small></span><input data-control-material-field="quantity" data-control-material-id="${esc(item.id)}" type="number" min="0" step="any" value="${item.quantity == null ? "" : esc(item.quantity)}" aria-label="Quantidade de ${esc(item.name)}"></label><label><span>Unidade<small>como o consumo é contabilizado</small></span><input data-control-material-field="unit" data-control-material-id="${esc(item.id)}" value="${esc(item.unit || "")}" aria-label="Unidade de ${esc(item.name)}"></label><label><span>Situação<small>estado atual da propriedade</small></span><select data-control-material-field="status" data-control-material-id="${esc(item.id)}"><option ${item.status === "Planejado" ? "selected" : ""}>Planejado</option><option ${item.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${item.status === "Atenção" ? "selected" : ""}>Atenção</option><option ${item.status === "Concluído" ? "selected" : ""}>Concluído</option><option ${item.status === "Dimensionar" ? "selected" : ""}>Dimensionar</option></select></label></div></article>`).join("")}</div></div></details>`).join("")}</div>`;
  };

  return Object.freeze({
    isAssistantVisualAdditionV1,
    controlCenterMaterialRowsV1,
    controlCenterFinanceRowsV1,
    controlCenterMoneyV1,
    controlCenterRecordChangeV1,
    controlCenterPublishV1,
    controlCenterMaterialsAccordionMarkupV1,
  });
};
