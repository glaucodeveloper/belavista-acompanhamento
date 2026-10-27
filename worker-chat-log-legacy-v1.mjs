/** Recovery renderer for cached frontend bundles without the typed chat owner. */
export function renderWorkerContextChatLogLegacyV1(input, ports = {}) {
  const escape = typeof ports.escape === 'function' ? ports.escape : value => String(value ?? '');
  const serviceStatusLabel = typeof ports.serviceStatusLabel === 'function'
    ? ports.serviceStatusLabel
    : status => String(status || '');
  const item = input.message;
  const request = input.request;
  const requests = Array.isArray(input.requests) ? input.requests : [];
  const serviceSelector = request && requests.length > 1
    ? `<label class="worker-chat-service-select">Meus pedidos<select data-service-select aria-label="Selecionar solicitação">${requests.map(entry => `<option value="${escape(entry.id)}" ${entry.id === request.id ? 'selected' : ''}>${escape(entry.id)} · ${escape(String(entry.title || '').slice(0, 30))}</option>`).join('')}</select></label>`
    : '';
  const response = input.pending
    ? `<article class="worker-chat-pending" role="status"><span class="worker-chat-spinner" aria-hidden="true"></span><span><strong>${escape(input.pendingLabel || 'Preparando resposta…')}</strong><small>Você pode continuar nesta página enquanto preparo o resultado.</small></span></article>`
    : item
      ? `<article class="worker-context-chat-message worker-chat-message is-assistant"><div class="worker-chat-message-meta"><span>Resposta do assistente · ${new Date(item.at || Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><button type="button" data-worker-chat-speak="${escape(item.text)}" aria-label="Ouvir resposta">Ouvir</button></div><p>${escape(item.text)}</p></article>`
      : '<p class="worker-chat-empty">Descreva o serviço necessário ou faça uma pergunta.</p>';
  const service = request
    ? `<section class="worker-chat-service" aria-label="Acompanhamento da solicitação">${serviceSelector}<div><b>Solicitação ${escape(request.id)}</b><span>${escape(serviceStatusLabel(request.status))}</span></div><p>${escape(request.title)}</p><small>${escape(request.domain)}${request.stageKey ? ` · etapa ${escape(request.stageKey)}` : ''}${request.activityId ? ` · atividade ${escape(request.activityId)}` : ''}</small><ul>${(request.files || []).map(file => `<li><a href="${escape(file.fileUrl)}" target="_blank" rel="noopener">${escape(file.fileName)}</a></li>`).join('') || '<li>Sem arquivo vinculado</li>'}</ul><button type="button" data-service-refresh>Atualizar acompanhamento</button></section>`
    : '';
  const review = !input.pending && input.recordDraft
    ? renderRecordVerification(input.recordDraft, Boolean(input.limitedOperationalActor), escape)
    : '';
  const warning = input.persistenceWarning
    ? `<p class="worker-chat-empty" role="alert">${escape(input.persistenceWarning)}</p>`
    : '';
  return `${warning}${response}${service}${review}`;
}

function renderRecordVerification(draft, limited, escape) {
  const ocr = draft?.ocr || {};
  const properties = Array.isArray(ocr.properties) ? ocr.properties : [];
  const items = Array.isArray(draft?.allocations) && draft.allocations.length
    ? draft.allocations
    : Array.isArray(ocr.items) ? ocr.items : [];
  const extractedText = ocr.text || ocr.rawText || ocr.extractedText || '';
  const attachmentName = String(draft?.attachmentRef?.name || draft?.attachmentRef?.fileName || '').trim();
  const rows = properties.slice(0, 8).map(property => {
    const value = Array.isArray(property.value)
      ? property.value.map(item => item.description || item.name || JSON.stringify(item)).join(', ')
      : property.value;
    return `<div class="worker-chat-record-check-row"><dt>${escape(property.label || property.key || 'Campo')}</dt><dd>${escape(value == null || value === '' ? '—' : String(value))}</dd></div>`;
  }).join('');
  const allocations = items.map((item, index) => {
    const kind = item.target || item.itemKind || 'outro';
    const title = item.description || item.materialName || item.activityName || item.name || 'Item sem descrição';
    const quantity = item.quantity == null || item.quantity === '' ? 'Quantidade não informada' : `${item.quantity} ${item.unit || ''}`.trim();
    const material = item.materialName || item.materialId || (/servi[cç]/i.test(String(kind)) ? 'Não aplicável' : 'A confirmar');
    const details = String(item.details || '').trim();
    return `<article class="worker-chat-allocation" data-record-allocation-index="${index}"><div><b>${escape(title)}</b><span>${escape(kind)} · ${escape(quantity)}</span></div><dl><dt>Etapa</dt><dd>${escape(item.stageName || item.stageKey || 'A confirmar')}</dd><dt>Serviço / atividade</dt><dd>${escape(item.activityName || item.activityId || 'A confirmar')}</dd><dt>Material</dt><dd>${escape(material)}</dd></dl>${details ? `<p>${escape(details)}</p>` : ''}</article>`;
  }).join('');
  return `<section class="worker-chat-record-verification" data-record-verification aria-label="Verificação do anexo"><header><div><span>ETAPA 1 · VERIFICAÇÃO</span><h3>Confira os dados antes da alocação</h3></div><strong>${escape(ocr.reviewRequired === false ? 'Leitura consistente' : 'Revisão humana')}</strong></header>${attachmentName ? `<p class="worker-chat-record-extracted"><b>Anexo analisado</b><span>${escape(attachmentName)}</span></p>` : ''}${extractedText ? `<p class="worker-chat-record-extracted"><b>Texto identificado</b><span>${escape(extractedText)}</span></p>` : ''}${rows ? `<dl>${rows}</dl>` : `<p class="worker-chat-record-empty">${allocations ? 'OCR sem campos estruturados; a proposta abaixo usa a descrição enviada e permanece pendente de revisão.' : 'O worker não retornou campos estruturados. Revise o anexo antes de alocar.'}</p>`}${allocations ? `<section class="worker-chat-allocation-section"><header><b>Proposta de alocação do assistente</b><span>Etapa · serviço · material</span></header>${allocations}<small>Confira a etapa e as propriedades em ${limited ? 'Registros' : 'Dashboard'}.</small></section>` : ''}<footer><button type="button" data-chat-discard="record">Descartar leitura</button><button type="button" data-chat-apply="record" data-request-id="${escape(draft.requestId || '')}">Abrir ${limited ? 'meu registro' : 'alocação no Dashboard'}</button></footer></section>`;
}
