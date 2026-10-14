/**
 * Rendering and form serialization for the operational stage context inside
 * the control-center page.
 */
export const createControlStageContextV1 = ({
  readIntegrationSettings,
  normalizeStageMaterialRows,
  defaultStageMaterialRows,
  stageV9LiveFor,
  stageV9StatusFor,
  esc,
  ico,
  STAGE_WORKBENCH,
  workbenchStageFromValueV1,
  splitStageConfigList,
}) => {
  const controlCenterRealtimeLabelV1 = (state) =>
    state.controlRealtime?.updatedAt
      ? `RTDB ouvido às ${new Date(state.controlRealtime.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "RTDB aguardando conexão";
  const controlStageProfileV1 = (stage, state) => {
    const settings = {
      ...(readIntegrationSettings() || {}),
      ...(state.integrationSettings || {}),
    };
    return {
      ...(stage?.executionProfile || {}),
      ...(settings.stageProfiles?.[stage?.key] || {}),
    };
  };
  const controlStageMaterialRowsV1 = (stage, profile) =>
    normalizeStageMaterialRows(
      profile?.materialsTable,
      defaultStageMaterialRows(stage || {}),
    );
  const controlStageContextMarkupV1 = (state, stages) => {
    const selectedKey = state.selectedPlanningStage || stages[0]?.key || "";
    const stage =
      stages.find((item) => item.key === selectedKey) || stages[0] || {};
    const profile = controlStageProfileV1(stage, state),
      production = profile.production || stage.production || {},
      materials = controlStageMaterialRowsV1(stage, profile),
      live = stageV9LiveFor(stage);
    const optionRows = stages
      .map(
        (item) =>
          `<option value="${esc(item.key)}" ${item.key === stage.key ? "selected" : ""}>${esc(item.name)}</option>`,
      )
      .join("");
    const rows = materials
      .map(
        (item) =>
          `<tr data-control-context-material-row><td><input name="materialName" value="${esc(item.name)}" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" value="${esc(item.description || item.scope || "")}" placeholder="Uso, bitola ou escopo"></td><td><input name="materialQuantity" type="number" min="0" step="any" value="${item.quantity == null ? "" : esc(item.quantity)}" placeholder="A medir"></td><td><input name="materialUnit" value="${esc(item.unit || "un.")}" placeholder="m, un, m²"></td><td><select name="materialStatus"><option ${item.status === "Planejado" ? "selected" : ""}>Planejado</option><option ${item.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${item.status === "Atenção" ? "selected" : ""}>Atenção</option><option ${item.status === "Concluído" ? "selected" : ""}>Concluído</option><option ${item.status === "Dimensionar" ? "selected" : ""}>Dimensionar</option></select></td><td><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico("trash-2")}</button></td></tr>`,
      )
      .join("");
    return `<section class="control-center-section control-stage-context-section"><header><div><span class="activity-kind">06 · COMPREENSÕES OPERACIONAIS</span><h2>Editar requisitos de execução e materiais</h2><p>Esta é a fonte de calibração que orienta compras, medições, agenda, caixa e propagação do Worker por etapa.</p></div><span class="control-section-note">escuta ativa · ${esc(controlCenterRealtimeLabelV1(state))}</span></header><form class="control-stage-context-form" data-control-stage-context-form="${esc(stage.key)}"><div class="control-stage-context-top"><label>Etapa<select name="stageKey" data-control-stage-selector>${optionRows}</select></label><div class="control-context-live"><small>LEITURA ATUAL</small><b>${Number(live.progress) || 0}% · ${esc(stageV9StatusFor(live))}</b><span>Prioridade ${stage.priority || "—"} · ${stage.dependsOn?.length ? `depende de ${esc(stage.dependsOn.join(" · "))}` : "sem dependência"}</span></div></div><div class="control-stage-context-grid"><label><span>Requisitos de execução</span><textarea name="requirements" rows="4" placeholder="Uma regra por linha. Ex.: subleito compactado">${esc((profile.requirements || []).join("\n"))}</textarea></label><label><span>Condições para liberar</span><textarea name="conditions" rows="4" placeholder="Uma condição por linha. Ex.: teste aprovado">${esc((profile.conditions || []).join("\n"))}</textarea></label><label class="wide"><span>Compreensão típica da execução</span><textarea name="typicalDescription" rows="3" placeholder="Explique a lógica de execução para a IA e para o encarregado.">${esc(profile.typicalDescription || "")}</textarea></label><label><span>Gatilhos e pedidos</span><textarea name="requestHints" rows="3" placeholder="Quando pedir material, equipe ou ação.">${esc((profile.requestHints || []).join("\n"))}</textarea></label><label><span>Evidências obrigatórias</span><textarea name="evidenceFocus" rows="3" placeholder="Fotos, medições, laudos, protocolos.">${esc((profile.evidenceFocus || []).join("\n"))}</textarea></label><label><span>Compras e logística</span><textarea name="procurementFocus" rows="3" placeholder="Frete, estoque, fornecedor, lead time.">${esc((profile.procurementFocus || []).join("\n"))}</textarea></label><div class="control-production-calibration"><header><div><span>UNIDADE DE PRODUÇÃO</span><b>Como o avanço deve ser medido</b></div><small>os valores editados alimentam prazo e prontidão</small></header><div><label>Meta<input name="productionQuantity" type="number" min="0" step="any" value="${production.quantity == null ? "" : esc(production.quantity)}"></label><label>Unidade<input name="productionUnit" value="${esc(production.unit || "un.")}" placeholder="m, m², m³, viagem, un."></label><label>Ritmo<input name="productionRate" type="number" min="0" step="any" value="${production.rate == null ? "" : esc(production.rate)}"></label><label>Ritmo / unidade de tempo<input name="productionRateUnit" value="${esc(production.rateUnit || "un./dia")}" placeholder="m/dia, viagens/dia"></label></div></div></div><div class="control-context-materials"><header><div><span>MATERIAIS E EQUIPAMENTOS</span><b>Composição editável da frente</b></div><button type="button" class="control-add-context-material" data-control-context-add-material>${ico("plus")} Adicionar item</button></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Material / equipamento</th><th>Descrição</th><th>Quantidade</th><th>Unidade</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="control-context-empty">Nenhum item configurado. Adicione o primeiro requisito.</td></tr>'}</tbody></table></div></div><div class="control-context-targets"><label>Dono / RTDB<input name="notifyOwner" value="${esc((profile.notificationTargets?.owner || []).join(", "))}" placeholder="desktop-owner, rtdb/owner"></label><label>Administrador / RTDB<input name="notifyAdmin" value="${esc((profile.notificationTargets?.admin || []).join(", "))}" placeholder="desktop-admin, rtdb/admin"></label><label>Encarregado / RTDB<input name="notifyForeman" value="${esc((profile.notificationTargets?.foreman || []).join(", "))}" placeholder="mobile-foreman, rtdb/foreman"></label></div><footer><span data-control-context-status>As edições ficam auditadas e são reenviadas ao ciclo operacional.</span><button type="submit">${ico("save")} Salvar compreensão da etapa</button></footer></form></section>`;
  };
  const controlStagePropertyGridMarkupV1 = (stage, profile) => {
    const materials = controlStageMaterialRowsV1(stage, profile);
    if (!materials.length)
      return '<p class="control-context-empty" data-control-context-empty>Nenhuma propriedade material configurada. Adicione o primeiro item desta frente.</p>';
    return materials
      .map(
        (item) =>
          `<article class="control-stage-property" data-control-context-material-row><header><div><small>PROPRIEDADE MATERIAL · ${esc(item.activityName || "Atividade principal")}</small><h3>${esc(item.name || "Nova propriedade")}</h3><p>${esc(item.scope || item.description || "Requisito operacional da etapa.")}</p></div><span class="control-material-status">${esc(item.status || "Planejado")}</span></header><div class="control-stage-property-fields"><label><span>Material / equipamento</span><input name="materialName" value="${esc(item.name || "")}" placeholder="Ex.: Tubo PEAD"></label><label><span>Descrição / uso</span><input name="materialDescription" value="${esc(item.description || item.scope || "")}" placeholder="Uso, bitola ou escopo"></label><label><span>Quantidade</span><input name="materialQuantity" type="number" min="0" step="any" value="${item.quantity == null ? "" : esc(item.quantity)}" placeholder="A medir"></label><label><span>Unidade</span><input name="materialUnit" value="${esc(item.unit || "un.")}" placeholder="m, un, m²"></label><label><span>Situação</span><select name="materialStatus"><option ${item.status === "Planejado" ? "selected" : ""}>Planejado</option><option ${item.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${item.status === "Atenção" ? "selected" : ""}>Atenção</option><option ${item.status === "Concluído" ? "selected" : ""}>Concluído</option><option ${item.status === "Dimensionar" ? "selected" : ""}>Dimensionar</option></select></label><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico("trash-2")} Remover</button></div></article>`,
      )
      .join("");
  };
  const controlStageUnifiedFormMarkupV1 = (state, stages) => {
    const selectedKey = state.selectedPlanningStage || stages[0]?.key || "",
      stage =
        stages.find((item) => item.key === selectedKey) || stages[0] || {},
      profile = controlStageProfileV1(stage, state),
      production = profile.production || stage.production || {},
      live = stageV9LiveFor(stage),
      workbenchStage =
        STAGE_WORKBENCH.find((item) => item.key === stage.key) ||
        workbenchStageFromValueV1(stage.key) ||
        null,
      recordActivities = Array.isArray(workbenchStage?.activities)
        ? workbenchStage.activities
        : [],
      recordActivityOptions = (
        recordActivities.length
          ? recordActivities.map((item) => item.title || item.name || item.id)
          : [stage.name || "Atividade principal"]
      )
        .filter(Boolean)
        .map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
        .join(""),
      properties = controlStagePropertyGridMarkupV1(stage, profile);
    return `<section class="control-center-section control-stage-context-section control-stage-unified-section"><header><div><span class="activity-kind">06 · FORMULÁRIO UNIFICADO DA FRENTE</span><h2>Propriedades, requisitos e execução</h2><p>Uma única ficha por etapa para calibrar propriedades, materiais, produção, evidências e regras que orientam o Worker.</p></div><span class="control-section-note">escuta ativa · ${esc(controlCenterRealtimeLabelV1(state))}</span></header><form class="control-stage-context-form" data-control-stage-context-form="${esc(stage.key)}"><div class="control-stage-context-top control-stage-record-top-v2" style="display:grid;grid-template-columns:minmax(0,5fr) minmax(220px,2fr);gap:12px;align-items:stretch"><section class="control-stage-inline-record-v2" data-control-stage-inline-record="${esc(stage.key)}" data-control-stage-inline-record-name="${esc(stage.name)}" style="border:1px solid rgba(75,118,166,.55);background:rgba(9,20,34,.64);padding:12px;min-width:0"><header style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 10px"><div><small style="display:block;color:#6fa8ff;font-size:10px;letter-spacing:.11em">NOVO REGISTRO · ETAPA DESTINO</small><b style="display:block;margin-top:3px">${esc(stage.name || "Etapa em foco")}</b></div><span style="font-size:11px;opacity:.68">data e hora: agora</span></header><div style="display:grid;grid-template-columns:minmax(170px,1.2fr) minmax(150px,1fr) minmax(120px,.65fr);gap:8px"><label><span>Atividade</span><select data-inline-record-activity>${recordActivityOptions}</select></label><label><span>Responsável</span><input data-inline-record-responsible value="${esc(live.owner || stage.owner || "")}" placeholder="Encarregado ou equipe"></label><label><span>Status</span><select data-inline-record-status><option>Pendente</option><option>Concluído</option></select></label></div><div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin-top:8px"><label><span>Registro / medição</span><textarea data-inline-record-details rows="2" placeholder="Quantidade produzida, ocorrência, medição ou evidência"></textarea></label><button type="button" data-control-inline-record-submit style="min-height:52px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border:1px solid #2b78ff;background:#0d6efd;color:#fff;font:inherit;font-weight:800;cursor:pointer">${ico("plus")} Registrar</button></div><small data-control-inline-record-status style="display:block;margin-top:7px;opacity:.68">O apontamento será salvo diretamente em ${esc(stage.name || "esta etapa")}.</small></section><div class="control-context-live" style="height:auto;display:flex;flex-direction:column;justify-content:center"><small>LEITURA ATUAL</small><b>${Number(live.progress) || 0}% · ${esc(stageV9StatusFor(live))}</b><span>Prioridade ${stage.priority || "—"} · ${stage.dependsOn?.length ? `depende de ${esc(stage.dependsOn.join(" · "))}` : "sem dependência"}</span></div></div><section class="control-stage-unified-block control-stage-properties-block"><header><div><span>01 · PROPRIEDADES DA FRENTE</span><b>Materiais e equipamentos da etapa</b></div><small>Quantidade, unidade, situação e uso permanecem no mesmo registro.</small></header><div class="control-stage-property-grid">${properties}</div><button type="button" class="control-add-context-material" data-control-context-add-material>${ico("plus")} Adicionar propriedade</button></section><section class="control-stage-unified-block"><header><div><span>02 · REQUISITOS E EXECUÇÃO</span><b>Compreensão operacional da frente</b></div><small>Regras, liberações e evidências condicionam a próxima ação.</small></header><div class="control-stage-context-grid"><label><span>Requisitos de execução</span><textarea name="requirements" rows="4" placeholder="Uma regra por linha. Ex.: subleito compactado">${esc((profile.requirements || []).join("\n"))}</textarea></label><label><span>Condições para liberar</span><textarea name="conditions" rows="4" placeholder="Uma condição por linha. Ex.: teste aprovado">${esc((profile.conditions || []).join("\n"))}</textarea></label><label class="wide"><span>Compreensão típica da execução</span><textarea name="typicalDescription" rows="3" placeholder="Explique a lógica de execução para a IA e para o encarregado.">${esc(profile.typicalDescription || "")}</textarea></label><label><span>Gatilhos e pedidos</span><textarea name="requestHints" rows="3" placeholder="Quando pedir material, equipe ou ação.">${esc((profile.requestHints || []).join("\n"))}</textarea></label><label><span>Evidências obrigatórias</span><textarea name="evidenceFocus" rows="3" placeholder="Fotos, medições, laudos, protocolos.">${esc((profile.evidenceFocus || []).join("\n"))}</textarea></label><label><span>Compras e logística</span><textarea name="procurementFocus" rows="3" placeholder="Frete, estoque, fornecedor, lead time.">${esc((profile.procurementFocus || []).join("\n"))}</textarea></label></div></section><section class="control-production-calibration"><header><div><span>03 · UNIDADE DE PRODUÇÃO</span><b>Como o avanço deve ser medido</b></div><small>os valores editados alimentam prazo e prontidão</small></header><div><label>Meta<input name="productionQuantity" type="number" min="0" step="any" value="${production.quantity == null ? "" : esc(production.quantity)}"></label><label>Unidade<input name="productionUnit" value="${esc(production.unit || "un.")}" placeholder="m, m², m³, viagem, un."></label><label>Ritmo<input name="productionRate" type="number" min="0" step="any" value="${production.rate == null ? "" : esc(production.rate)}"></label><label>Ritmo / unidade de tempo<input name="productionRateUnit" value="${esc(production.rateUnit || "un./dia")}" placeholder="m/dia, viagens/dia"></label></div></section><div class="control-context-targets"><label>Dono / RTDB<input name="notifyOwner" value="${esc((profile.notificationTargets?.owner || []).join(", "))}" placeholder="desktop-owner, rtdb/owner"></label><label>Administrador / RTDB<input name="notifyAdmin" value="${esc((profile.notificationTargets?.admin || []).join(", "))}" placeholder="desktop-admin, rtdb/admin"></label><label>Encarregado / RTDB<input name="notifyForeman" value="${esc((profile.notificationTargets?.foreman || []).join(", "))}" placeholder="mobile-foreman, rtdb/foreman"></label></div><footer><span data-control-context-status>As edições ficam auditadas e são reenviadas ao ciclo operacional.</span><button type="submit">${ico("save")} Salvar formulário da etapa</button></footer></form></section>`;
  };
  const controlStageContextPayloadV1 = (form) => ({
    requirements: splitStageConfigList(
      form.querySelector('[name="requirements"]')?.value,
    ),
    conditions: splitStageConfigList(
      form.querySelector('[name="conditions"]')?.value,
    ),
    typicalDescription:
      form.querySelector('[name="typicalDescription"]')?.value || "",
    organizationRequest:
      form.querySelector('[name="organizationRequest"]')?.value || "",
    organizationContext:
      form.querySelector('[name="organizationContext"]')?.value || "",
    requestHints: splitStageConfigList(
      form.querySelector('[name="requestHints"]')?.value,
    ),
    evidenceFocus: splitStageConfigList(
      form.querySelector('[name="evidenceFocus"]')?.value,
    ),
    procurementFocus: splitStageConfigList(
      form.querySelector('[name="procurementFocus"]')?.value,
    ),
    production: {
      quantity:
        Number(form.querySelector('[name="productionQuantity"]')?.value) || 0,
      unit: form.querySelector('[name="productionUnit"]')?.value || "un.",
      rate: Number(form.querySelector('[name="productionRate"]')?.value) || 0,
      rateUnit:
        form.querySelector('[name="productionRateUnit"]')?.value || "un./dia",
    },
    materialsTable: [
      ...form.querySelectorAll("[data-control-context-material-row]"),
    ]
      .map((row) => ({
        name: row.querySelector('[name="materialName"]')?.value || "",
        description:
          row.querySelector('[name="materialDescription"]')?.value || "",
        quantity: row.querySelector('[name="materialQuantity"]')?.value || "",
        unit: row.querySelector('[name="materialUnit"]')?.value || "",
        status:
          row.querySelector('[name="materialStatus"]')?.value || "Planejado",
      }))
      .filter((item) => item.name || item.description || item.quantity),
    notificationTargets: {
      owner: splitStageConfigList(
        form.querySelector('[name="notifyOwner"]')?.value,
      ),
      admin: splitStageConfigList(
        form.querySelector('[name="notifyAdmin"]')?.value,
      ),
      foreman: splitStageConfigList(
        form.querySelector('[name="notifyForeman"]')?.value,
      ),
    },
  });

  return Object.freeze({
    controlCenterRealtimeLabelV1,
    controlStageProfileV1,
    controlStageMaterialRowsV1,
    controlStageContextMarkupV1,
    controlStagePropertyGridMarkupV1,
    controlStageUnifiedFormMarkupV1,
    controlStageContextPayloadV1,
  });
};
