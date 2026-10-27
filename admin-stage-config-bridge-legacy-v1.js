import stageCatalog from './frontend/src/data/admin-stage-config-bridge.json' with { type: 'json' };

const catalogById = new Map(stageCatalog.stages.map(stage => [stage.id, stage]));
const text = (value, limit = 500) => String(value ?? '').trim().slice(0, limit);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const arrays = value => Array.isArray(value) ? value : [];
const stageKey = (id, name = '') => {
  const catalogKey = catalogById.get(Number(id))?.key;
  if (catalogKey) return catalogKey;
  return text(name, 100).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `stage-${id}`;
};
const listFromDoc = data => Array.isArray(data) ? data : arrays(object(data).stages);
const profileFromDoc = (data, id, name) => {
  const profiles = object(object(data).stageProfiles || object(data).profiles);
  return object(profiles[stageKey(id, name)] || profiles[String(id)] || profiles[name]);
};
const stateFromDoc = (data, id, name) => {
  const states = object(object(data).stageState || object(data).state);
  return object(states[stageKey(id, name)] || states[String(id)] || states[name]);
};
const findStage = (data, id) => {
  const name = catalogById.get(Number(id))?.name || `Etapa ${id}`;
  return listFromDoc(data).find(item => Number(item?.id) === Number(id)
    || String(item?.key || item?.stageId || '') === stageKey(id, name)
    || String(item?.name || '').toLowerCase() === name.toLowerCase()) || {};
};
const toAi = (profile = {}, stage = {}) => {
  const source = { ...object(stage.aiConfig), ...object(stage.ai), ...object(profile.aiConfig), ...object(profile.ai), ...profile };
  return {
    requirements: arrays(source.requirements),
    conditions: arrays(source.conditions || source.peculiarities),
    typicalDescription: text(source.typicalDescription || source.executionDescription || source.description || '', 6000),
    requestHints: arrays(source.requestHints || source.planningHints),
    evidenceFocus: arrays(source.evidenceFocus || source.evidenceRequirements),
    procurementFocus: arrays(source.procurementFocus || source.purchaseFocus),
    notificationTargets: object(source.notificationTargets),
    executionProfile: { ...object(source.executionProfile), materialsTable: arrays(source.executionProfile?.materialsTable || source.materialsTable) },
    updatedAt: source.updatedAt || source.modifiedAt || null,
  };
};
const makeStageReport = (doc, id) => {
  const name = catalogById.get(Number(id))?.name || `Etapa ${id}`;
  const stage = findStage(doc, id), profile = profileFromDoc(doc, id, name), state = stateFromDoc(doc, id, name);
  return {
    id: Number(id), name: text(stage.name || name, 160),
    owner: text(stage.owner || stage.ownerName || profile.owner || '', 160),
    status: text(state.status || stage.status || 'planejado', 60),
    progress: Number(state.progress ?? stage.progress ?? 0) || 0,
    week: text(stage.week || stage.reference || profile.week || '', 160), aiConfig: toAi(profile, stage),
    activities: arrays(stage.activities || profile.activities), purchases: arrays(stage.purchases || profile.purchases),
    materials: arrays(stage.materials || profile.materials), records: arrays(stage.records || profile.records),
    receipts: arrays(stage.receipts || profile.receipts), outsourcing: arrays(stage.outsourcing || profile.outsourcing),
    relations: arrays(stage.relations || profile.relations), cashEntries: arrays(stage.cashEntries || profile.cashEntries),
    summary: object(stage.summary || profile.summary), situation: object(stage.situation || profile.situation),
  };
};
const mergeStageDoc = (data, id, patch, aiOnly = false) => {
  const name = catalogById.get(Number(id))?.name || `Etapa ${id}`;
  const key = stageKey(id, name), next = structuredClone(data ?? {}), list = listFromDoc(next);
  if (list.length) {
    const index = list.findIndex(item => Number(item?.id) === Number(id)
      || String(item?.key || item?.stageId || '') === key
      || String(item?.name || '').toLowerCase() === name.toLowerCase());
    const current = index >= 0 ? list[index] : { id: Number(id), key, name };
    list[index >= 0 ? index : list.length] = aiOnly
      ? { ...current, aiConfig: { ...object(current.aiConfig), ...patch }, updatedAt: new Date().toISOString() }
      : { ...current, ...patch, updatedAt: new Date().toISOString() };
    if (Array.isArray(next)) return list;
    next.stages = list;
    return next;
  }
  const profiles = { ...object(next.stageProfiles || next.profiles) }, current = object(profiles[key]);
  profiles[key] = aiOnly
    ? { ...current, ...patch, aiConfig: { ...object(current.aiConfig), ...patch }, updatedAt: new Date().toISOString() }
    : { ...current, ...patch, updatedAt: new Date().toISOString() };
  next.stageProfiles = profiles;
  return next;
};

/** Legacy recovery for old generated bundles without the TypeScript fetch bridge. */
export function installLegacyAtlasAdminStageConfigBridgeV1({ globalRef, locationRef }) {
  const previousFetch = globalRef.fetch;
  const marker = '__atlasAdminStageConfigBridgeV1';
  if (previousFetch[marker]) return () => {};
  const nativeFetch = previousFetch.bind(globalRef);
  const response = (payload, status = 200) => globalRef.Response.json(payload, { status });
  const bridgeFetch = async (input, init = {}) => {
    let url;
    try {
      const requestUrl = typeof input === 'string' ? input : input instanceof globalRef.URL ? input.href : input.url;
      url = new globalRef.URL(requestUrl, locationRef.href);
    } catch { return nativeFetch(input, init); }
    const match = url.pathname.match(/^\/api\/stages-admin\/(\d+)(?:\/(ai|report))?$/);
    if (!match) return nativeFetch(input, init);
    const id = Number(match[1]), resource = match[2] || '';
    const method = String(init.method || (input instanceof globalRef.Request ? input.method : '') || 'GET').toUpperCase();
    const headers = new globalRef.Headers(init.headers || (input instanceof globalRef.Request ? input.headers : undefined));
    const configUrl = new globalRef.URL('/api/admin/config/stages', url.origin).href;
    try {
      const read = await nativeFetch(configUrl, { method: 'GET', headers, cache: 'no-store' });
      const raw = await read.text();
      if (!read.ok) return new globalRef.Response(raw, { status: read.status, headers: { 'content-type': 'application/json' } });
      const config = raw ? JSON.parse(raw) : {}, data = config.data ?? config;
      if (method === 'GET' && resource === 'report') return response({ report: makeStageReport(data, id), source: config.source, sha: config.sha });
      if (method === 'GET') return response({ stage: makeStageReport(data, id), source: config.source, sha: config.sha });
      if (method === 'PUT') {
        const bodyText = typeof init.body === 'string' ? init.body : '{}', patch = bodyText ? JSON.parse(bodyText) : {};
        const next = mergeStageDoc(data, id, patch, resource === 'ai'), writeHeaders = new globalRef.Headers(headers);
        writeHeaders.set('Content-Type', 'application/json');
        const write = await nativeFetch(configUrl, { method: 'PUT', headers: writeHeaders, body: JSON.stringify({ data: next, sha: config.sha }) });
        const savedText = await write.text();
        if (!write.ok) return new globalRef.Response(savedText, { status: write.status, headers: { 'content-type': 'application/json' } });
        return response({ stage: makeStageReport(next, id), saved: savedText ? JSON.parse(savedText) : {}, source: 'github-worker' });
      }
      return response({ error: 'Método não permitido.' }, 405);
    } catch (error) {
      return response({ error: `Falha na configuração persistente da etapa: ${error.message}` }, 502);
    }
  };
  Object.defineProperty(bridgeFetch, marker, { value: true });
  globalRef.fetch = bridgeFetch;
  return () => { if (globalRef.fetch === bridgeFetch) globalRef.fetch = previousFetch; };
}
