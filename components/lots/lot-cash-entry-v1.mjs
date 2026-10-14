/** Cash entries linked to the canonical lot label, never to a payment-plan draft. */
export const lotCashEntriesV1 = (state, lotKey) =>
  (state.cashFlowLocal || []).filter((entry) =>
    entry.kind === "entrada" && String(entry.lotKey || "") === String(lotKey || ""),
  );

export const renderLotCashEntriesV1 = ({ state, lotKey, esc, formatBRL, ico }) => {
  const entries = lotCashEntriesV1(state, lotKey);
  const totalCents = entries.reduce((sum, entry) => sum + Number(entry.amountCents || 0), 0);
  const actorRole = state.currentActor?.role || "";
  const canRegister = actorRole === "owner" || actorRole === "developer";
  return `<div class="lot-cash-summary"><div><small>RECEBIDO NO CAIXA</small><strong>${formatBRL(totalCents / 100)}</strong><span>${entries.length} lançamento(s) vinculado(s)</span></div>${canRegister ? `<button type="button" class="atlas-dark-button" data-lot-cash-entry="${esc(lotKey)}">${ico("plus")} Registrar entrada</button>` : ""}</div><ol class="lot-cash-entry-list">${entries.map((entry) => `<li><div><b>${esc(entry.category || "Entrada de caixa")}</b><small>${esc(entry.date || "Sem data")} · ${esc(entry.description || "Sem descrição")}</small></div><strong>${formatBRL(Number(entry.amountCents || 0) / 100)}</strong></li>`).join("") || '<li class="empty-data">Nenhuma entrada de caixa vinculada a este lote.</li>'}</ol>`;
};

export const openLotCashEntryV1 = (appStore, lotKey, returnView) => {
  appStore.set({
    view: "cash-record",
    cashRecordReturnView: returnView,
    cashRecordDraft: { kind: "entrada", lotKey },
    lastAction: `Abriu entrada de caixa do lote ${lotKey}`,
  });
};
