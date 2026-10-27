/** Recovery path for applying a chat OCR record when the typed program is unavailable. */
export function applyWorkerChatRecordReviewLegacyV1(controller, isLimitedOperationalActor = () => false) {
  if (!controller?.recordDraft) return;
  const store = globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.appStore || globalThis.__belavistaAppStore;
  if (!store) return;
  const state = store.get?.() || {};
  // Prefer the record created for this attachment when a session has several OCR reads.
  const attachmentName = String(controller.recordDraft?.attachmentRef?.name || '').trim();
  const records = Array.isArray(state.records) ? state.records : [];
  const record = [...records].reverse().find(item => {
    if (item?.source !== 'chat-visual') return false;
    if (!attachmentName) return true;
    return (item.attachments || []).some(attachment =>
      String(attachment?.name || attachment?.fileName || attachment?.label || '').trim() === attachmentName,
    );
  }) || [...records].reverse().find(item => item?.source === 'chat-visual');
  if (!record) {
    controller.status.textContent = 'A leitura foi preservada, mas ainda falta a etapa para alocar o item.';
    return;
  }
  if (isLimitedOperationalActor(state.currentActor || {})) {
    store.set({ view: 'records', selectedRecordV5360: record.id, lastAction: 'Abriu registro visual do próprio perfil para revisão' });
    controller.setCollapsed(true);
    controller.recordDraft = null;
    controller.render();
    return;
  }
  const target = record.allocationTarget === 'material' ? 'material' : 'service';
  const itemKey = target === 'material' ? `material:AI-MATERIAL-${record.id}` : `service:${record.id}`;
  store.set({
    view: 'agenda',
    selectedAgendaEventV3: `agenda-record-${record.id}`,
    selectedStageV9: record.stageKey || state.selectedStageV9 || state.selectedStage || '',
    selectedStage: record.stageKey || state.selectedStage || state.selectedStageV9 || '',
    stageSelected: true,
    activityDedicated: false,
    stageActivityDedicatedV9: false,
    controlStageCenterTab: target === 'material' ? 'materials' : 'services',
    controlStageCenterItemModalKey: itemKey,
    lastAction: 'Abriu a alocação OCR do chat para revisão humana',
  });
  // Open the newly created allocation after the stage context redraws.
  setTimeout(() => {
    const row = document.querySelector(`[data-stage-center-item-open="${CSS.escape(itemKey)}"]`);
    row?.click();
  }, 0);
  controller.recordDraft = null;
  controller.render();
}
