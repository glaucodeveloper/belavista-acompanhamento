export const BELAVISTA_ROLES = Object.freeze({
  owner: Object.freeze({
    id: 'owner', label: 'Dono', description: 'Controla o fluxo de caixa e registra fatos.',
    capabilities: Object.freeze(['cash:read', 'cash:write', 'records:read', 'records:write', 'calibration:read', 'notifications:read'])
  }),
  admin: Object.freeze({
    id: 'admin', label: 'Administrador', description: 'Calibra prioridades, relações e parâmetros.',
    capabilities: Object.freeze(['cash:read', 'records:read', 'records:write', 'calibration:read', 'calibration:write', 'notifications:read'])
  }),
  foreman: Object.freeze({
    id: 'foreman', label: 'Encarregado', description: 'Registra produção, evidências e confirmações.',
    capabilities: Object.freeze(['cash:read', 'records:read', 'records:write', 'calibration:read', 'notifications:read'])
  })
});

export const BELAVISTA_TONES = Object.freeze({
  active: 'green', success: 'green', completed: 'green', disponível: 'green', disponivel: 'green',
  warning: 'yellow', attention: 'yellow', reservado: 'yellow', pending: 'yellow', pendente: 'yellow',
  danger: 'red', critical: 'red', critico: 'red', crítico: 'red', atrasado: 'red',
  info: 'blue', progress: 'blue', andamento: 'blue', planned: 'gray', planejado: 'gray',
  neutral: 'gray', disabled: 'gray'
});

export function normalizeRole(role = '') {
  const key = String(role).trim().toLocaleLowerCase('pt-BR');
  return ({ dono: 'owner', proprietário: 'owner', proprietario: 'owner', administrador: 'admin', encarregado: 'foreman' })[key] || key;
}

export function can(role, capability) {
  return Boolean(BELAVISTA_ROLES[normalizeRole(role)]?.capabilities.includes(capability));
}

export function toneFor(status = '') {
  const key = String(status).trim().toLocaleLowerCase('pt-BR');
  return BELAVISTA_TONES[key] || 'gray';
}

export const formatBRL = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
export const formatPercent = value => `${Math.max(0, Math.min(100, Number(value) || 0)).toLocaleString('pt-BR')}%`;
export const formatDateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';

export function createBelavistaEvent(type, payload = {}, actor = {}) {
  return Object.freeze({
    id: `bv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: String(type), payload: structuredClone(payload),
    actor: { id: actor.id || actor.uid || 'local', role: normalizeRole(actor.role || 'foreman'), name: actor.name || 'Usuário' },
    createdAt: new Date().toISOString(), version: 1
  });
}

export function createBelavistaStore(initialState = {}) {
  let state = structuredClone(initialState);
  const target = new EventTarget();
  const api = {
    get: () => structuredClone(state),
    set(patch, meta = {}) {
      const previous = state;
      state = { ...state, ...(typeof patch === 'function' ? patch(structuredClone(state)) : patch) };
      target.dispatchEvent(new CustomEvent('change', { detail: { state: api.get(), previous: structuredClone(previous), meta } }));
      return api.get();
    },
    subscribe(listener) {
      const handler = event => listener(event.detail.state, event.detail);
      target.addEventListener('change', handler);
      listener(api.get(), { initial: true });
      return () => target.removeEventListener('change', handler);
    }
  };
  return Object.freeze(api);
}

export function allocateByPriority({ cashCents = 0, reserveCents = 0, dependencyProgress = 100, stages = [] } = {}) {
  let available = Math.max(0, Math.round(Number(cashCents) - Number(reserveCents)));
  const normalized = stages.map((stage, index) => ({
    ...stage, index, key: String(stage.key || `stage-${index + 1}`),
    progress: Math.max(0, Math.min(100, Number(stage.progress) || 0)),
    priority: Math.max(0, Math.min(100, Number(stage.priority) || 0)),
    budgetCents: Math.max(0, Math.round(Number(stage.budgetCents) || 0)),
    dependsOn: Array.isArray(stage.dependsOn) ? stage.dependsOn.map(String) : []
  }));
  const byKey = new Map(normalized.map(stage => [stage.key, stage]));
  const ranked = [...normalized].sort((a, b) => b.priority - a.priority || a.index - b.index);
  const allocations = new Map();

  ranked.forEach(stage => {
    const blockedBy = stage.dependsOn.filter(key => (byKey.get(key)?.progress || 0) < dependencyProgress);
    const needCents = Math.max(0, Math.round(stage.budgetCents * (1 - stage.progress / 100)));
    const allocatedCents = blockedBy.length ? 0 : Math.min(available, needCents);
    available -= allocatedCents;
    allocations.set(stage.key, {
      ...stage, blockedBy, needCents, allocatedCents,
      coverage: needCents ? Math.round(allocatedCents / needCents * 100) : 100,
      state: blockedBy.length ? 'blocked' : allocatedCents >= needCents ? 'funded' : allocatedCents ? 'partial' : 'waiting'
    });
  });

  return {
    cashCents: Math.round(Number(cashCents) || 0), reserveCents: Math.round(Number(reserveCents) || 0),
    allocatableCents: Math.max(0, Math.round(Number(cashCents) - Number(reserveCents))),
    remainingCents: available, stages: normalized.map(stage => allocations.get(stage.key))
  };
}

export function validateSystemEvent(event) {
  const errors = [];
  if (!event?.type) errors.push('type é obrigatório');
  if (!event?.actor?.role || !BELAVISTA_ROLES[normalizeRole(event.actor.role)]) errors.push('actor.role inválido');
  if (!event?.createdAt || Number.isNaN(Date.parse(event.createdAt))) errors.push('createdAt inválido');
  return { valid: errors.length === 0, errors };
}
