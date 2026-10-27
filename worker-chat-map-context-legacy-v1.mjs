/** Recovery for cached component bundles without the typed map-context owner. */
export function applyWorkerChatMapContextLegacyV1(root, input, context = {}) {
  if (!root || !input) return false;
  const kind = context.kind === 'lot' ? 'lot' : 'common-area';
  const label = String(context.label || (kind === 'lot' ? 'lote selecionado' : 'área comum do loteamento')).trim();
  const minimize = root.querySelector('[data-worker-chat-minimize]');
  if (minimize) {
    minimize.textContent = '−';
    minimize.setAttribute('aria-label', 'Minimizar assistente');
  }
  root.dataset.mapContextKind = kind;
  root.dataset.mapContextLabel = label;
  input.dataset.mapContextKind = kind;
  input.dataset.mapContextLabel = label;
  if (kind === 'lot') {
    root.dataset.lotStatusContext = label;
    input.dataset.lotStatusContext = label;
    input.placeholder = `Pergunte sobre o status do ${label}…`;
  } else {
    input.placeholder = `Pergunte sobre ${label}…`;
    if (context.status) context.status.textContent = `${label} selecionada. Escreva sua pergunta para o assistente.`;
  }
  input.setAttribute('aria-description', `Contexto selecionado: ${label}. Escreva e envie manualmente sua pergunta.`);
  requestAnimationFrame(() => input.focus({ preventScroll: true }));
  return true;
}
