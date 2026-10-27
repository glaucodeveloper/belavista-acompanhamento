// Recovery implementation for visual OCR allocation when the TS owner is absent.
const activityTokenV1 = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function projectLegacyVisualAllocationCallsV1(input) {
  const { reply, message = '', context = {}, applicationState = {}, resolveStageMention, resolveVisualStage } = input;
  const stages = Array.isArray(context.stages) ? context.stages : [];
  const ocr = reply?.recordOcr;
  if (ocr?.error) return [];
  const items = Array.isArray(ocr?.items) ? ocr.items : [];
  const describedServiceAction = String(message.match(/\bAção de serviço\s*:\s*([^\n.!?]+)/i)?.[1] || '').trim();
  const provided = (Array.isArray(reply?.toolCalls) ? reply.toolCalls : [])
    .filter(call => call?.name === 'stage.allocate_visual_record');
  const explicit = resolveStageMention(message, stages);
  const serviceEvidence = ocr?.serviceEvidence || {};
  const isStageOnlyName = value => explicit.status === 'matched' && activityTokenV1(value) === activityTokenV1(explicit.stage.name);
  const usableItems = items.filter((item, index) => {
    const description = String(item?.description || item?.name || item?.materialName || item?.materialId || '').trim();
    const confidence = Number(item?.confidence ?? ocr?.confidence);
    const proposedArgs = provided[index]?.arguments || provided[index]?.args || provided[0]?.arguments || provided[0]?.args || {};
    const documentKind = ['purchase_invoice', 'purchase_receipt'].includes(String(ocr?.documentType || '')) ? 'material' : '';
    const kind = String(item?.itemKind || item?.type || proposedArgs.target || documentKind).toLocaleLowerCase('pt-BR');
    const service = /servi[cç]|atividade|labor|m[aã]o de obra/.test(kind);
    return description.length >= 3 && !/^item\s+ocr\s+\d+$/i.test(description) &&
      Number.isFinite(confidence) && confidence >= 0 &&
      /^(material|materiais|servico|serviço|serviços|servicos|service|labor|m[aã]o de obra)$/.test(kind) &&
      !(service && isStageOnlyName(description));
  });
  const ocrVisualActionCandidate = String(serviceEvidence.actionDescription || '').trim();
  const ocrVisualAction = isStageOnlyName(ocrVisualActionCandidate) ? '' : ocrVisualActionCandidate;
  const modelServiceCall = String(ocr?.documentType || '') === 'service_evidence' && explicit.status === 'matched'
    ? provided.map(call => call.arguments || call.args || {}).find(args => {
      const target = String(args.target || '').toLocaleLowerCase('pt-BR');
      const modelStage = resolveStageMention(`${args.stageName || ''} ${args.stageKey || ''}`, stages);
      return target === 'service' && String(args.activityName || '').trim().length >= 3 && !isStageOnlyName(args.activityName) &&
        modelStage.status === 'matched' && modelStage.stage.key === explicit.stage.key;
    }) || null
    : null;
  const allocationItems = usableItems.length
    ? usableItems
    : String(ocr?.documentType || '') === 'service_evidence' && ocrVisualAction
      ? [{ itemKind: 'servico', description: ocrVisualAction, activityName: String(serviceEvidence.activityName || ocrVisualAction), details: ocrVisualAction, confidence: serviceEvidence.confidence ?? ocr?.confidence }]
      : String(ocr?.documentType || '') === 'service_evidence' && modelServiceCall
        ? [{ itemKind: 'servico', description: modelServiceCall.activityName, activityName: modelServiceCall.activityName, details: modelServiceCall.details || '', pointer: modelServiceCall.pointer || '', confidence: modelServiceCall.confidence }]
        : String(ocr?.documentType || '') === 'service_evidence' && describedServiceAction
          ? [{ itemKind: 'servico', description: describedServiceAction, confidence: 0 }]
          : [];
  if (!allocationItems.length || explicit.status === 'ambiguous') return [];
  const includesPhrase = (text, phrase) => {
    const normalizedText = ` ${activityTokenV1(text)} `;
    const normalizedPhrase = activityTokenV1(phrase);
    return Boolean(normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `));
  };
  const existingMaterials = [
    ...stages.flatMap(stage => Array.isArray(stage?.materials) ? stage.materials : []),
    ...(Array.isArray(applicationState.materialCatalogAdditions) ? applicationState.materialCatalogAdditions.map(item => item?.name || item?.materialName || '') : []),
    ...(Array.isArray(applicationState.records) ? applicationState.records.flatMap(record =>
      (Array.isArray(record?.properties) ? record.properties : [])
        .filter(property => ['allocation_material', 'material_name'].includes(String(property?.id || property?.key || '')))
        .map(property => property?.value || '')
    ) : [])
  ].map(value => String(value || '').trim()).filter(Boolean);
  const explicitlyRequestedMaterial = [...new Set(existingMaterials)].find(name => includesPhrase(message, name));
  return allocationItems.map((item, index) => {
    const args = provided[index]?.arguments || provided[index]?.args || provided[0]?.arguments || provided[0]?.args || {};
    const documentKind = ['purchase_invoice', 'purchase_receipt'].includes(String(ocr?.documentType || '')) ? 'material' : '';
    const kind = String(item?.itemKind || item?.type || args.target || documentKind).toLocaleLowerCase('pt-BR');
    const target = /servi[cç]|atividade|m[aã]o de obra/.test(kind) ? 'service' : 'material';
    const description = String(item?.description || item?.name || item?.materialName || item?.materialId || `Item OCR ${index + 1}`).trim();
    const ocrResolution = resolveVisualStage({ message, item, stages });
    const modelStage = resolveStageMention(`${args.stageName || ''} ${args.stageKey || ''}`, stages);
    const stage = explicit.status === 'matched' ? explicit.stage : ocrResolution.stage || (modelStage.status === 'matched' ? modelStage.stage : null);
    if (!stage) return null;
    const stageRow = stages.find(candidate => candidate.key === stage.key) || stage;
    const activities = Array.isArray(stageRow.activities) ? stageRow.activities : [];
    const requestedActivityId = String(item?.activityId || args.activityId || '').trim();
    const activityMention = String(message.match(/\batividade\s+([^.;,]+)/i)?.[1] || '').trim();
    const requestedActivityCandidate = String(activityMention || (target === 'service' ? args.activityName : '') || item?.activityName || serviceEvidence.activityName || args.activityName || '').trim();
    const requestedActivityName = isStageOnlyName(requestedActivityCandidate) ? '' : requestedActivityCandidate;
    const explicitActivity = activities.find(activity => includesPhrase(message, activity?.name || activity?.title));
    const canonicalActivity = explicitActivity || activities.find(activity => requestedActivityId && String(activity?.id || activity?.key || '') === requestedActivityId) ||
      activities.find(activity => requestedActivityName && activityTokenV1(activity?.name || activity?.title) === activityTokenV1(requestedActivityName)) || null;
    const serviceWhen = [serviceEvidence.observedDate && `Data informada/visível: ${serviceEvidence.observedDate}`, serviceEvidence.observedTime && `Hora informada/visível: ${serviceEvidence.observedTime}`].filter(Boolean).join(' · ');
    const personDescription = target === 'service' && message && !/^\s*(?:etapa|stage)\s*:/i.test(message)
      ? `Descrição enviada pela pessoa: ${message}`
      : '';
    const stageHint = target === 'service' && explicit.status === 'matched' ? `Etapa indicada pela pessoa: ${stage.name}` : '';
    const details = [item?.details, personDescription, stageHint, target === 'service' && serviceWhen, ocr?.text || ocr?.rawText].filter(Boolean).join('\n');
    const confidence = [item?.confidence, ocr?.confidence, args.confidence].map(Number).find(value => Number.isFinite(value) && value > 0);
    return {
      name: 'stage.allocate_visual_record',
      arguments: {
        target,
        stageKey: stage.key,
        stageName: stage.name,
        activityId: String(canonicalActivity?.id || canonicalActivity?.key || ''),
        activityName: String(canonicalActivity?.name || canonicalActivity?.title || requestedActivityName || (target === 'service' ? serviceEvidence.actionDescription : '') || (target === 'service' ? description : 'Leitura de material')),
        materialName: target === 'material' ? String(explicitlyRequestedMaterial || item?.materialName || description || args.materialName || '') : '',
        ...(item?.quantity == null && args.quantity == null ? {} : { quantity: item?.quantity ?? args.quantity }),
        unit: String(args.unit || (target === 'material' ? item?.unit || stage.unit || 'un.' : 'registro')),
        details: String(details || args.details || 'Item identificado no anexo pelo OCR.'),
        pointer: String(target === 'material' ? description : item?.pointer || item?.description || description),
        ...(confidence == null ? {} : { confidence })
      }
    };
  }).filter(Boolean);
}

export function projectLegacyVisualClarificationV1(ocr, messages) {
  const hasAction = String(ocr?.serviceEvidence?.actionDescription || '').trim() ||
    (Array.isArray(ocr?.items) ? ocr.items : []).some(item =>
      /servi[cç]|service|labor/.test(String(item?.itemKind || item?.type || '').toLocaleLowerCase('pt-BR')) &&
      String(item?.activityName || item?.description || '').trim()
    );
  return String(ocr?.documentType || '') === 'service_evidence' && !hasAction
    ? messages.serviceAction
    : messages.stage;
}
