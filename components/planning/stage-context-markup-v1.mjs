export const createStageContextMarkupV1 = ({
  appStore,
  defaultStageMaterialRows,
  demoData,
  esc,
  executionModel,
  ico,
  normalizeStageMaterialRows,
  readIntegrationSettings,
  stageOverlayKey,
}) => {
  const stageMaterialsFor = (stageName) =>
    demoData.stageMaterials?.[stageName] || [];
  const stageMaterialsMarkup = (stageName) => {
    const items = stageMaterialsFor(stageName);
    if (!items.length) return "";
    return `<div class="stage-material-scope"><div class="activity-card-kicker">MATERIAIS DA ETAPA</div><div class="activity-associations">${items.map((item) => `<div><small>${esc(item.name).toUpperCase()}</small><b>${item.quantity == null ? esc(item.scope) : `${esc(item.quantity)} ${esc(item.unit)} · ${esc(item.scope)}`}</b><span>${esc(item.status)} · ${item.targetLots ? `${esc(item.targetLots)} lotes` : ""}</span></div>`).join("")}</div></div>`;
  };
  const executionStageByName = (stageName) =>
    executionModel.stages.find((item) => item.name === stageName) ||
    executionModel.stages.find(
      (item) => stageOverlayKey(item.name) === stageOverlayKey(stageName),
    );
  const stageProfileSettingsFor = (stageKey) => {
    const settings = {
      ...(readIntegrationSettings() || {}),
      ...(appStore.get().integrationSettings || {}),
    };
    return settings.stageProfiles?.[stageKey] || null;
  };
  const stagePlanningMarkup = (stage) => {
    const executionStage =
      executionStageByName(stage.name) || executionModel.stages[0];
    const savedProfile = stageProfileSettingsFor(executionStage.key) || {};
    const profile = {
      ...(executionStage.executionProfile || {}),
      ...savedProfile,
    };
    const targets = profile.notificationTargets || {};
    const materialRows = normalizeStageMaterialRows(
      profile.materialsTable,
      defaultStageMaterialRows(executionStage),
    );
    return `<section class="dedicated-panel stage-planning-panel"><header><div><span class="activity-kind">INTELIGÊNCIA DA ETAPA</span><h3>Contexto que alimenta compras, atividades e cronograma</h3><p>Salvar aqui atualiza o estado operacional usado no ciclo único do Worker.</p></div></header><form data-stage-context-form="${esc(executionStage.key)}"><label>Descrição típica da execução<textarea name="typicalDescription" rows="4" placeholder="Descreva peculiaridades, cuidados e ordem típica desta etapa.">${esc(profile.typicalDescription || "")}</textarea></label><label>Requisitos e pistas para planejamento<textarea name="requestHints" rows="3" placeholder="Uma linha por pista para compras, atividades e cronograma.">${esc((profile.requestHints || []).join("\n"))}</textarea></label><label>Comprovações esperadas<textarea name="evidenceFocus" rows="2" placeholder="Fotos, medições, laudos, protocolos...">${esc((profile.evidenceFocus || []).join("\n"))}</textarea></label><label>Materiais e compras a observar<textarea name="procurementFocus" rows="2" placeholder="Uma linha por item ou cuidado de suprimentos.">${esc((profile.procurementFocus || []).join("\n"))}</textarea></label><div class="stage-material-table-wrap"><div class="stage-material-table-head"><strong>Tabela de materiais da etapa</strong><button type="button" class="ghost" data-add-stage-material="${esc(executionStage.key)}">${ico("plus")} Adicionar material</button></div><table class="stage-material-table"><thead><tr><th>Material</th><th>Descrição</th><th>Quantidade</th><th>Unidade</th><th>Estado</th></tr></thead><tbody data-stage-materials="${esc(executionStage.key)}">${materialRows.map((item) => `<tr data-stage-material-row><td><input name="materialName" value="${esc(item.name)}" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" value="${esc(item.description)}" placeholder="Escopo, bitola, uso..."></td><td><input name="materialQuantity" value="${esc(item.quantity)}" inputmode="decimal" placeholder="0"></td><td><input name="materialUnit" value="${esc(item.unit)}" placeholder="m, un, m²"></td><td><input name="materialStatus" value="${esc(item.status || "Planejado")}" placeholder="Planejado"></td></tr>`).join("")}</tbody></table></div><div class="integration-stage-targets"><label>Destino Dono<input name="notifyOwner" value="${esc((targets.owner || []).join(", "))}" placeholder="desktop-owner, rtdb/owner"></label><label>Destino Administrador<input name="notifyAdmin" value="${esc((targets.admin || []).join(", "))}" placeholder="desktop-admin, rtdb/admin"></label><label>Destino Encarregado<input name="notifyForeman" value="${esc((targets.foreman || []).join(", "))}" placeholder="mobile-foreman, rtdb/foreman"></label></div><footer><span data-stage-context-status>Essa etapa já envia seu contexto e materiais quantificados para a inteligência operacional.</span><button type="submit" class="primary">${ico("save")} Salvar contexto da etapa</button></footer></form></section>`;
  };

  return {
    stageMaterialsFor,
    stageMaterialsMarkup,
    executionStageByName,
    stageProfileSettingsFor,
    stagePlanningMarkup,
  };
};
