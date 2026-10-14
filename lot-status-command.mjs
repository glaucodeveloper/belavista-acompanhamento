import { REPASSE_PRICE_CATALOG } from './repasse-price-catalog.mjs';

const statuses = [
  ['Repasse programado', /\brepasse\s+programad[oa]\b/],
  ['Em negociação', /\b(?:em\s+)?negociacao\b/],
  ['Disponível', /\bdisponivel\b/],
  ['Reservado', /\breservad[oa]\b/],
  ['Vendido', /\bvendid[oa]\b/],
  ['Quitado', /\bquitad[oa]\b/],
  ['Bloqueado', /\bbloquead[oa]\b/],
];
const plain = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const lotByKey = new Map(REPASSE_PRICE_CATALOG.map(item => [String(item.label).toUpperCase(), item]));

export function parseLotStatusCommand(message) {
  const text = plain(message);
  if (!/\b(?:alter\w*|mud\w*|atualiz\w*|defin\w*|coloc\w*|marqu\w*)\b/.test(text) ||
      !/\b(?:lote|quadra|status|situacao)\b|\bq[a-z]{1,3}\s*[- ]?\s*\d+\b/.test(text)) return null;

  const keys = new Set();
  for (const match of text.matchAll(/\b(q[a-z]{1,3})\s*[- ]?\s*0*(\d{1,3})\b/g)) {
    keys.add(`${match[1]}-${Number(match[2])}`.toUpperCase());
  }
  for (const match of text.matchAll(/\blote\s*0*(\d{1,3})\s*(?:da\s*)?quadra\s*(q[a-z]{1,3})\b/g)) {
    keys.add(`${match[2]}-${Number(match[1])}`.toUpperCase());
  }
  if (keys.size !== 1) return { error: 'Informe exatamente um lote e sua quadra (ex.: QA-1).' };
  const lotKey = [...keys][0];
  if (!lotByKey.has(lotKey)) return { error: `${lotKey} não consta da tabela de lotes.` };

  const matches = statuses.filter(([, pattern]) => pattern.test(text));
  if (matches.length !== 1) return { error: 'Informe um único novo status: Disponível, Reservado, Em negociação, Vendido, Repasse programado, Quitado ou Bloqueado.' };
  return { lotKey, status: matches[0][0] };
}

export function applyLotStatusCommand(store, command, { renderBrokerBoard } = {}) {
  if (!store?.get || !store?.set || !command?.lotKey || !statuses.some(([status]) => status === command.status) || !lotByKey.has(command.lotKey)) {
    throw new Error('Comando de status inválido ou estado indisponível.');
  }
  const current = store.get().lotStatuses || {};
  const previous = current[command.lotKey] || {};
  store.set({
    lotStatuses: { ...current, [command.lotKey]: { ...previous, status: command.status, updatedAt: new Date().toISOString() } },
    lastAction: `Chat atualizou ${command.lotKey} para ${command.status}`,
  });
  if (store.get().lotStatuses?.[command.lotKey]?.status !== command.status) throw new Error('Não foi possível confirmar a gravação do status.');
  if (store.get().view === 'brokers-board') {
    if (typeof renderBrokerBoard === 'function') renderBrokerBoard();
    else document.querySelector('view-layer')?.render?.();
  }
  return `${command.lotKey}: status alterado para ${command.status}.`;
}
