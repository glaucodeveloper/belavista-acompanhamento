/** Recovery implementation for Worker chat service requests before the TS owner exists. */
export async function createLegacyWorkerChatServiceRequestV1(input, ports) {
  const text = String(input.text || '');
  const files = Array.isArray(input.files) ? input.files : [];
  const state = ports.getApplicationState() || {};
  const context = ports.getContext();
  const selectedStageKey = String(state.selectedStageV9 || state.selectedStage?.key || state.selectedStage || context.stage || '').trim();
  const stageResolution = ports.resolveRequestStage({ message: text, recordOcr: input.recordOcr, stages: context.stages, selectedStageKey });
  const resolvedStage = stageResolution.stage;
  const stageKey = resolvedStage?.key || '';
  const stageIsUnresolved = ['ambiguous-user-description', 'conflicting-ocr-suggestions', 'unresolved-attachment-stage'].includes(stageResolution.source);
  const selectedActivityId = String(state.selectedActivity?.id || input.routeActivityId || '');
  const activityId = stageKey && stageKey !== selectedStageKey ? '' : selectedActivityId;
  const lower = text.toLocaleLowerCase('pt-BR');
  const domain = [
    ['obra', /obra|etapa|atividade|cronograma|drenagem|pavimenta/],
    ['suprimentos', /material|compra|fornecedor|estoque/],
    ['documentos', /documento|pdf|dwg|licen[cç]a|projeto/],
    ['comercial', /lead|cliente|reserva|contrato|comiss[aã]o|corretor/],
    ['financeiro', /caixa|pagamento|lan[cç]amento|despesa|financeir/],
    ['relatorios', /relat[oó]rio|indicador|balan[cç]o/],
  ].find(([, pattern]) => pattern.test(lower))?.[0] || String(state.view || 'geral');
  const response = await ports.apiFetch('/api/service-requests', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: text.trim().slice(0, 140),
      description: text.trim(),
      domain,
      stageKey: stageIsUnresolved ? '' : stageKey || selectedStageKey,
      activityId: stageIsUnresolved ? '' : activityId,
      files: files.map(file => ({ fileName: file.name, dataUrl: file.dataUrl })),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.request) throw new Error(payload.error || `HTTP ${response.status}`);
  ports.setCurrentRequest(payload.request);
  ports.storageSet(input.serviceKey, payload.request.id);
  await ports.refreshServiceRequests();
  ports.setCurrentRequest(payload.request);
  ports.setRequests([payload.request, ...ports.getRequests().filter(item => item.id !== payload.request.id)]);
  ports.storageSet(input.serviceKey, payload.request.id);
  ports.render();
  return payload.request;
}

export async function refreshLegacyWorkerChatServiceRequestV1(serviceKey, ports) {
  const id = ports.storageGet(serviceKey);
  if (!id) return;
  try {
    const response = await ports.apiFetch(`/api/service-requests/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    ports.setCurrentRequest(payload.request || null);
    ports.render();
  } catch {
    ports.setStatus('Acompanhamento temporariamente indisponível.');
  }
}

export async function refreshLegacyWorkerChatServiceRequestsV1(serviceKey, ports) {
  try {
    const response = await ports.apiFetch('/api/service-requests', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const requests = Array.isArray(payload.requests) ? payload.requests : [];
    ports.setRequests(requests);
    const id = ports.storageGet(serviceKey);
    const current = requests.find(item => item.id === id) || requests[0] || null;
    ports.setCurrentRequest(current);
    if (current) ports.storageSet(serviceKey, current.id);
    ports.render();
  } catch {
    // Recovery matches the former UI adapter's quiet refresh failure behavior.
  }
}
