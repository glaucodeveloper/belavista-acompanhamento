const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const stageRows = stages => (Array.isArray(stages) ? stages : [])
  .map(stage => ({
    ...stage,
    key: String(stage?.key ?? '').trim(),
    name: String(stage?.name ?? '').trim()
  }))
  .filter(stage => stage.key && stage.name);

function exactPhraseInText(text, phrase) {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `));
}

export function resolveStageMentionV1(text, stages) {
  const rows = stageRows(stages);
  const matches = rows.filter(stage =>
    exactPhraseInText(text, stage.name) || exactPhraseInText(text, stage.key)
  );
  if (!matches.length) return { status: 'none', stage: null };

  const normalizedText = ` ${normalize(text)} `;
  const directed = matches.filter(stage => {
    const variants = [stage.name, stage.key].map(normalize).filter(Boolean);
    return variants.some(phrase => {
      const index = normalizedText.indexOf(` ${phrase} `);
      if (index < 0) return false;
      const prefix = normalizedText.slice(Math.max(0, index - 110), index);
      return /\b(?:na|em|para a|para) etapa\s*$/.test(prefix) ||
        /\betapa(?:\s+(?:explicitamente|solicitada|pedida|correta|de destino|alvo|indicada|selecionada)){0,3}\s+(?:e|:)\s*$/.test(prefix);
    });
  });
  const candidates = directed.length ? directed : matches;

  // Mantém o match mais específico quando nomes de etapas se sobrepõem;
  // menções independentes sem uma instrução de destino são ambíguas.
  const mostSpecific = candidates.filter(stage => {
    const variants = [stage.name, stage.key].map(normalize).filter(Boolean);
    return !candidates.some(other => other !== stage &&
      [other.name, other.key].map(normalize).filter(Boolean).some(otherPhrase =>
        variants.some(phrase => otherPhrase.length > phrase.length && otherPhrase.includes(phrase))
      )
    );
  });
  if (mostSpecific.length !== 1) return { status: 'ambiguous', stage: null, matches: mostSpecific };
  return { status: 'matched', stage: mostSpecific[0] };
}

function stageFromOcrItem(item, stages) {
  const source = [item?.stageName, item?.stageKey].filter(Boolean).join(' ');
  if (!source) return null;
  const match = resolveStageMentionV1(source, stages);
  return match.status === 'matched' ? match.stage : null;
}

function stageCandidateV1(stage) {
  const profile = stage?.executionProfile || stage?.aiConfig || {};
  const list = value => (Array.isArray(value) ? value : [])
    .map(item => typeof item === 'string' ? item : [item?.name, item?.title, item?.description].filter(Boolean).join(': '))
    .map(item => String(item || '').trim().slice(0, 240))
    .filter(Boolean)
    .slice(0, 10);
  return {
    key: stage.key,
    name: stage.name,
    executionDescription: String(stage.description || profile.typicalDescription || profile.executionDescription || '').trim().slice(0, 700),
    activityHints: [...list(stage.activityHints), ...list(profile.requestHints), ...list(profile.evidenceFocus)],
    activities: (Array.isArray(stage.activities) ? stage.activities : []).slice(0, 12).map(activity => ({
      id: String(activity?.id || activity?.key || ''),
      name: String(activity?.name || activity?.title || '').slice(0, 180),
      description: String(activity?.description || activity?.details || '').slice(0, 300)
    })).filter(activity => activity.name || activity.description),
    materials: list(stage.materials)
  };
}

export function resolveVisualStageV1({ message = '', item = null, stages = [], selectedStageKey = '' } = {}) {
  const explicit = resolveStageMentionV1(message, stages);
  if (explicit.status === 'matched') return { stage: explicit.stage, source: 'user-description' };
  if (explicit.status === 'ambiguous') return { stage: null, source: 'ambiguous-user-description' };

  const ocrStage = stageFromOcrItem(item, stages);
  if (ocrStage) return { stage: ocrStage, source: 'ocr-suggestion' };

  // Imagem/anexo nunca herda a etapa ativa da navegação: ela não comprova destino.
  return { stage: null, source: 'unresolved-attachment-stage' };
}

export function buildRecordInterpretationV1({ message = '', stages = [], selectedStageKey = '', recordOcr = null } = {}) {
  const rows = stageRows(stages);
  const selected = rows.find(stage => stage.key === String(selectedStageKey || '').trim()) || null;
  const explicit = resolveStageMentionV1(message, rows);
  const items = Array.isArray(recordOcr?.items) ? recordOcr.items.slice(0, 30).map(item => ({
    itemKind: String(item?.itemKind || item?.type || 'outro'),
    materialId: String(item?.materialId || ''),
    materialName: String(item?.materialName || ''),
    description: String(item?.description || item?.name || ''),
    quantity: item?.quantity ?? null,
    unit: String(item?.unit || ''),
    stageKey: String(item?.stageKey || ''),
    stageName: String(item?.stageName || ''),
    activityId: String(item?.activityId || ''),
    activityName: String(item?.activityName || ''),
    details: String(item?.details || ''),
    pointer: String(item?.pointer || ''),
    confidence: item?.confidence ?? null
  })) : [];
  const properties = Array.isArray(recordOcr?.properties) ? recordOcr.properties.slice(0, 24).map(property => ({
    key: String(property?.key || ''),
    label: String(property?.label || ''),
    value: property?.value ?? ''
  })) : [];

  return {
    source: 'chat-attachment-ocr',
    userDescription: String(message || '').trim().slice(0, 2000),
    explicitStage: explicit.status === 'matched' ? { key: explicit.stage.key, name: explicit.stage.name } : null,
    stageMentionStatus: explicit.status,
    selectedStage: selected ? { key: selected.key, name: selected.name, role: 'navigation-context-only' } : null,
    stageCandidates: rows.slice(0, 40).map(stageCandidateV1),
    documentType: String(recordOcr?.documentType || 'unknown'),
    ocrConfidence: recordOcr?.confidence ?? null,
    ocrReviewRequired: recordOcr?.reviewRequired !== false,
    ocrError: String(recordOcr?.error || ''),
    serviceEvidence: recordOcr?.serviceEvidence ? {
      actionDescription: String(recordOcr.serviceEvidence.actionDescription || ''),
      visualDescription: String(recordOcr.serviceEvidence.visualDescription || ''),
      observedDate: String(recordOcr.serviceEvidence.observedDate || ''),
      observedTime: String(recordOcr.serviceEvidence.observedTime || ''),
      stageKey: String(recordOcr.serviceEvidence.stageKey || ''),
      stageName: String(recordOcr.serviceEvidence.stageName || ''),
      activityId: String(recordOcr.serviceEvidence.activityId || ''),
      activityName: String(recordOcr.serviceEvidence.activityName || '')
    } : null,
    properties,
    items
  };
}

export function resolveRequestStageV1({ message = '', recordOcr = null, stages = [], selectedStageKey = '' } = {}) {
  const explicit = resolveStageMentionV1(message, stages);
  if (explicit.status === 'matched') return { stage: explicit.stage, source: 'user-description' };
  if (explicit.status === 'ambiguous') return { stage: null, source: 'ambiguous-user-description' };

  const items = Array.isArray(recordOcr?.items) ? recordOcr.items : [];
  const ocrStages = [...new Map(items.map(item => stageFromOcrItem(item, stages)).filter(Boolean).map(stage => [stage.key, stage])).values()];
  if (ocrStages.length === 1) return { stage: ocrStages[0], source: 'ocr-suggestion' };
  if (ocrStages.length > 1) return { stage: null, source: 'conflicting-ocr-suggestions' };

  if (recordOcr) return { stage: null, source: 'unresolved-attachment-stage' };
  const selected = stageRows(stages).find(stage => stage.key === String(selectedStageKey || '').trim());
  return selected ? { stage: selected, source: 'selected-stage-fallback' } : { stage: null, source: 'unresolved' };
}
