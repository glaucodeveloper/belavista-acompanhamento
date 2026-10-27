/** Recovery for cached program bundles without the typed assistant-response owner. */
export function createWorkerChatAssistantResponseLegacyV1(input, ports = {}) {
  if (String(input?.kind || '') === 'user') return null;
  const text = String(input?.text || '').trim().slice(0, 2000);
  if (!text) return null;
  const options = input.options || {};
  const now = typeof ports.now === 'function' ? ports.now : () => new Date();
  const random = typeof ports.random === 'function' ? ports.random : Math.random;
  const dateForId = now();
  const createdAt = now();
  const message = {
    id: `worker-chat-${dateForId.getTime()}-${random().toString(36).slice(2, 7)}`,
    kind: 'assistant',
    text,
    at: createdAt.toISOString(),
    auto: Boolean(options.auto),
    audit: String(options.audit || ''),
    attachment: options.attachment
      ? { name: String(options.attachment.name || 'imagem'), mimeType: String(options.attachment.mimeType || 'image/png') }
      : null,
  };
  let persisted = false;
  try {
    ports.storage?.setItem(ports.storageKey || 'belavista.worker-context-chat.v1', JSON.stringify([message]));
    persisted = Boolean(ports.storage);
  } catch { persisted = false; }
  return { message, persisted };
}
