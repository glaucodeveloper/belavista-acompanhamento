// Full message-submit recovery used only when the TS orchestration cannot load.
function projectLegacyWorkerChatUiIntentV1(message) {
  const text = String(message || '').toLocaleLowerCase('pt-BR');
  if (!/\b(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar|destaque|destacar|aproxime|aproximar|afaste|afastar|gire|girar)\b/.test(text)) return [];
  if (/\b(mapa|vista 3d)\b/.test(text)) {
    const overlay = [['terraplanagem',/terraplanagem/],['drenagem',/drenagem/],['rede-agua',/rede de [aá]gua/],['rede-eletrica',/rede el[eé]trica/],['pavimentacao',/pavimenta[cç][aã]o|asfalto/],['urbanizacao',/pra[cç]a|urbaniza[cç][aã]o/]].find(([,pattern])=>pattern.test(text))?.[0];
    if (overlay && /destac|mostr|real[cç]ar/.test(text)) return [{ name: 'map.set_overlay', arguments: { category: overlay } }];
    if (/aproxim/.test(text)) return [{ name: 'map.adjust_view', arguments: { zoomDelta: .22 } }];
    if (/afast/.test(text)) return [{ name: 'map.adjust_view', arguments: { zoomDelta: -.22 } }];
    if (/gir/.test(text)) return [{ name: 'map.adjust_view', arguments: { rotationDelta: /esquerd/.test(text) ? -20 : 20 } }];
  }
  if (/\b(evento|ocorr[eê]ncia|registro geral)\b/.test(text) && /\b(novo|nova|criar|adicionar|registrar)\b/.test(text)) return [{ name: 'records.open_form', arguments: {} }];
  const destinations = [
    ['documents', /documento/], ['materials', /materia(is|l)/], ['contracts', /contrato/],
    ['brokers-board', /corretor/], ['brokers', /comiss[aã]o|negocia[cç][aã]o/],
    ['reports', /relat[oó]rio/], ['finance', /finan[cç]|caixa|dre/],
    ['personnel', /encarregado|pessoal|equipe/], ['leads', /lead|cliente/],
    ['map', /mapa/], ['settings', /configura[cç]/], ['control', /central operacional|dashboard/],
    ['agenda', /agenda|compromisso/], ['actions', /a[cç][oõ]es ia|a[cç][aã]o ia/],
    ['activities', /atividade/], ['progress', /andamento|apontamento/],
    ['records', /registro/], ['stages', /etapa|cronograma/]
  ];
  const target = destinations.find(([, pattern]) => pattern.test(text))?.[0];
  if (!target) return [];
  const create = /\b(novo|nova|criar|adicionar)\b/.test(text);
  if (target === 'reports' && !create) {
    const family = /financeir|dre|caixa/.test(text) ? 'Financeiro' : /constru[cç]|obra/.test(text) ? 'Construção' : /suprimento|material|compra/.test(text) ? 'Suprimentos' : /comercial|venda|lead/.test(text) ? 'Comercial' : /governan[cç]/.test(text) ? 'Governança' : null;
    if (family) return [{ name: 'reports.select', arguments: { family } }];
  }
  return [{ name: create ? 'ui.open_form' : 'ui.navigate', arguments: { view: target } }];
}

export function isLegacyWorkerChatServiceRequestV1(textValue) {
  const value = String(textValue || '').trim();
  const actionableText = value.replace(/\b(?:n[aã]o|nao)\b[^.!?;\n]*/gi, ' ').trim();
  if (/^(qual|quais|como|quando|onde|por que|o que|me explique|explique|confirme|confirma)\b/i.test(actionableText)) return false;
  return /\b(solicito|solicitar|preciso que|fa[cç]a|fazer|crie|criar|prepare|preparar|atualize|atualizar|alterar|corrija|corrigir|revisar|agendar|comprar|registrar|gerar|elabore|executar)\b/i.test(actionableText);
}

export async function performLegacyWorkerChatSubmitV1(chat, text, editingId = null, attachment = null, files = [], options = {}, ports = {}) {
  const { SERVICE_KEY, parseLotStatusCommandV1, applyLotStatusCommandV1, currentContext, resolveStageMentionV1, serviceStatusLabel, visualAllocationCallsFromReply, visualClarificationForV1, projectActionPlan, projectUiIntent, projectServiceRequest, VISUAL_ACTION_CLARIFICATION_V1 } = ports;
  const isServiceRequest = typeof projectServiceRequest === 'function'
    ? projectServiceRequest
    : isLegacyWorkerChatServiceRequestV1;
    chat.recordDraft = null;
    const directOperational = options?.mode === 'priority';
    const lotCommand = !attachment && !files.length ? parseLotStatusCommandV1(text) : null;
    if (lotCommand) {
      const store = globalThis.__belavistaAppStore;
      const answer = lotCommand.error ? lotCommand.error : !location.pathname.startsWith('/admin') || !store
        ? 'A alteração de status está disponível apenas no painel administrativo.'
        : applyLotStatusCommandV1(store, lotCommand);
      chat.add('assistant', answer, { audit: lotCommand.error ? 'Comando de lote não executado' : 'Controle do lote' });
      chat.status.textContent = lotCommand.error ? 'Nenhuma alteração foi feita.' : answer;
      return;
    }
    const explicitAgenda = !attachment && !files.length && /\b(crie|criar|agende|agendar|adicione|adicionar)\b/i.test(text) && /\b(compromisso|agenda|calend[aá]rio)\b/i.test(text);
    if (explicitAgenda) {
      const context = currentContext();
      const stageMatch = resolveStageMentionV1(text, context.stages);
      const title = String(text.match(/(?:chamad[oa]|t[ií]tulo)\s+["“]?([^"”,.;\n]+?)(?=["”]|,\s*(?:na|no|em)\b|$)/i)?.[1] || '').trim();
      if (stageMatch.status !== 'matched' || !title) {
        chat.add('assistant', 'Para criar o compromisso, informe um título e uma etapa sem ambiguidade.');
        chat.status.textContent = 'Nenhum compromisso foi criado.';
        return;
      }
      const tomorrow = /amanh[ãa]/i.test(text);
      const date = new Date();
      if (tomorrow) date.setDate(date.getDate() + 1);
      const writtenDate = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
      const isoDate = writtenDate
        ? `${writtenDate[3]}-${writtenDate[2]}-${writtenDate[1]}`
        : tomorrow ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '';
      const start = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/)?.[0] || '';
      const materialName = String(text.match(/\bmaterial(?:\s+necess[aá]rio)?\s*:?\s+([^,.;\n]+)/i)?.[1] || '').trim();
      const results = await chat.executeToolCalls([{ name: 'agenda.create_pending', arguments: {
        title, stageKey: stageMatch.stage.key, stageName: stageMatch.stage.name,
        activityName: String(text.match(/atividade\s+([^,.;\n]+)/i)?.[1] || title).trim(),
        date: isoDate, start, durationHours: Number(text.match(/(?:por|dura[cç][aã]o\s+de)\s+(\d+(?:[.,]\d+)?)\s*horas?/i)?.[1]?.replace(',','.') || 1),
        notes: 'Compromisso solicitado pelo chat; confirme os detalhes antes da execução.',
        materialIds: materialName ? [materialName] : []
      }}]);
      const answer = results.join(' ') || 'Não foi possível criar o compromisso.';
      chat.add('assistant', answer);
      chat.status.textContent = answer;
      return;
    }
    if(!directOperational&&/(estado|status|andamento)/i.test(text)&&/(solicita[cç][aã]o|pedido|servi[cç]o)/i.test(text)&&localStorage.getItem(SERVICE_KEY)){
      await chat.refreshServiceRequest();
      const request=chat.currentRequest;
      chat.add('assistant',request?`Solicitação ${request.id}: ${serviceStatusLabel(request.status)}. ${request.files.length} arquivo(s) vinculado(s).`:'Não foi possível consultar a solicitação agora.');
      chat.status.textContent='Acompanhamento consultado.';
      return;
    }
    const stageOnlyVisualSubmission=Boolean(
      attachment &&
      !/^(qual|quais|como|quando|onde|por que|o que|me explique|explique)\b/i.test(String(text||'').trim()) &&
      resolveStageMentionV1(text,currentContext().stages).status==='matched'
    );
    const agendaIntent = /\b(agenda|compromisso|calend[aá]rio|hor[aá]rio)\b/i.test(text);
    if(!directOperational&&((isServiceRequest(text)&&!agendaIntent)||stageOnlyVisualSubmission)){
      try{
        const shouldReadAttachment = Boolean(attachment && (stageOnlyVisualSubmission || /\b(nota|comprovante|registro|ocr|foto|imagem|anexo)\b/i.test(text)));
        const reply = shouldReadAttachment ? await chat.ask(text, attachment, options) : null;
        const attachmentOcr = reply?.recordOcr;
        const expectsAllocation = Boolean(attachmentOcr && !attachmentOcr.error && (
          (Array.isArray(attachmentOcr.items) && attachmentOcr.items.length) ||
          ['service_evidence', 'purchase_invoice', 'purchase_receipt'].includes(String(attachmentOcr.documentType || ''))
        ));
        if (shouldReadAttachment && expectsAllocation && !visualAllocationCallsFromReply(reply, text).length) {
          chat.recordDraft = { ocr: attachmentOcr, attachmentRef: reply.attachment, requestId: null, dataUrl: attachment?.dataUrl };
          chat.add('assistant', visualClarificationForV1(attachmentOcr));
          chat.status.textContent = 'Nenhuma solicitação ou alocação foi criada; falta confirmar a etapa/atividade.';
          return;
        }
        const request=await chat.createServiceRequest(text,files,{recordOcr:reply?.recordOcr});
        const answer=`Solicitação ${request.id} recebida em triagem para ${request.domain}. ${request.files.length} arquivo(s) vinculado(s). Acompanhe o estado abaixo; nenhuma alteração operacional foi executada automaticamente.`;
        chat.add('assistant',answer);
        chat.status.textContent='Solicitação registrada e aguardando triagem.';
        if (shouldReadAttachment && reply) {
          if (reply.recordOcr && !reply.recordOcr.error) {
            chat.recordDraft = { ocr: reply.recordOcr, attachmentRef: reply.attachment, requestId: request.id, dataUrl: attachment.dataUrl };
            chat.add('assistant', `Solicitação ${request.id} · ${reply.text}`);
            chat.status.textContent = 'Leitura concluída. Revise os campos antes de confirmar o registro.';
            const visualCalls = visualAllocationCallsFromReply(reply, text);
            chat.recordDraft = { ...chat.recordDraft, allocations: visualCalls.map(call => call.arguments || call.args || {}) };
            const allocationResults = await chat.executeToolCalls(visualCalls, {
              sourceAttachment: attachment,
              payload: reply,
              serviceRequest: request
            });
            if (allocationResults.length) {
              chat.add('assistant', allocationResults.join('\n'));
              chat.status.textContent = allocationResults.some(result => /^Alocou a leitura visual/i.test(String(result)))
                ? 'Leitura persistida; abra o registro para revisão humana.'
                : 'Leitura recebida, mas o registro ainda não foi persistido.';
            } else if (attachment && reply.recordOcr?.items?.length) {
               chat.add('assistant', visualClarificationForV1(reply.recordOcr));
              chat.status.textContent = 'Leitura preservada; falta confirmar a etapa ou atividade.';
            }
          } else {
            chat.add('assistant', `Solicitação ${request.id} registrada. ${reply.text}`);
            chat.status.textContent = 'Solicitação preservada; leitura OCR indisponível.';
          }
        }
    if(chat.getVoiceState().enabled)chat.speak(answer);
      }catch(error){chat.input.value=text;chat.files=files;chat.attachment=attachment;chat.renderAttachment();chat.add('assistant',`Não foi possível registrar a solicitação: ${error.message}`);chat.status.textContent='Solicitação não registrada; texto e anexos preservados.';}
      return;
    }
    const reply = await chat.ask(text, attachment, options);
    if (reply.recordOcr && !reply.recordOcr.error) chat.recordDraft = {
      ocr: reply.recordOcr, attachmentRef: reply.attachment, requestId: null, dataUrl: attachment?.dataUrl
    };
    if(reply.source==='error'){chat.input.value=text;chat.files=files;chat.attachment=attachment;chat.renderAttachment();}
    const planToolCallsTs = projectActionPlan;
    const actionPlan = typeof planToolCallsTs === 'function'
      ? planToolCallsTs({ message: text, directOperational, replyToolCalls: reply.toolCalls })
      : null;
    if (actionPlan && chat.root) chat.root.dataset.chatIntentPlanOwnerV1 = 'typescript';
    const localCalls = actionPlan?.localCalls ?? (typeof projectUiIntent === 'function'
      ? projectUiIntent(text)
      : projectLegacyWorkerChatUiIntentV1(text));
    const actionRequested = actionPlan?.actionRequested ?? (directOperational || /\b(abra|abrir|mostre|mostrar|acesse|acessar|ir para|navegue|navegar|novo|nova|criar|adicionar|registre|registrar|filtre|filtrar|destaque|destacar|aproxime|aproximar|afaste|afastar|gire|girar|imprima|imprimir|execute|executar|fa[cç]a|fazer)\b/i.test(text));
    const proposedCalls = actionPlan?.proposedCalls ?? (!actionRequested ? [] : (directOperational && reply.toolCalls?.length ? reply.toolCalls : localCalls.length ? localCalls.map(call => {
      const proposed = reply.toolCalls?.find(item => item?.name === call.name);
      return call.name === 'records.open_form' && proposed ? { ...call, arguments: { ...call.arguments, ...(proposed.arguments || {}) } } : call;
    }) : (Array.isArray(reply.toolCalls) ? reply.toolCalls : [])));
    const visualCalls = attachment ? visualAllocationCallsFromReply(reply, text) : [];
    if (visualCalls.length && chat.recordDraft) {
      chat.recordDraft = { ...chat.recordDraft, allocations: visualCalls.map(call => call.arguments || call.args || {}) };
    }
    const calls = [
      ...visualCalls,
      ...proposedCalls.filter(call => call?.name !== 'stage.allocate_visual_record')
    ];
    const needsStageClarification = Boolean(
      attachment &&
      Array.isArray(reply.recordOcr?.items) &&
      reply.recordOcr.items.length &&
      !visualCalls.length,
    );
    const needsActionClarification = Boolean(attachment && visualClarificationForV1(reply.recordOcr) === VISUAL_ACTION_CLARIFICATION_V1);
    const results = await chat.executeToolCalls(calls, { sourceAttachment: attachment, payload: reply });
    const actionText = results.length ? results.join(' ') : needsActionClarification ? VISUAL_ACTION_CLARIFICATION_V1 : needsStageClarification ? visualClarificationForV1(reply.recordOcr) : '';
    const answer = [reply.text, actionText].filter(Boolean).join('\n\n');
    chat.add('assistant', answer, { audit: `${reply.audit}${actionText ? ` · ${actionText}` : ''}` });
    chat.status.textContent = actionText || (reply.source === 'endpoint' ? 'Resposta recebida; nenhuma ação na interface.' : 'Endpoint indisponível; nenhuma ação executada.');
    if (chat.getVoiceState().enabled) chat.speak(answer);
  }
