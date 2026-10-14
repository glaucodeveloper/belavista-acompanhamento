/** Expose only the platform capabilities used by AI Chat, not ambient globals. */
export const createAiChatBrowserAdapter = (host = globalThis) => {
  const view = host.window || host;
  const speechSynthesis = view.speechSynthesis || null;
  const SpeechSynthesisUtterance = view.SpeechSynthesisUtterance || null;
  if (typeof view.lucide?.createIcons !== "function")
    throw new TypeError("AI chat browser adapter requires lucide.createIcons().");
  const createIcons = view.lucide.createIcons.bind(view.lucide);
  const print = typeof view.print === "function" ? view.print.bind(view) : null;
  return Object.freeze({
    eventTarget: host,
    document: host.document,
    HTMLElement: host.HTMLElement,
    FileReader: host.FileReader,
    speechSynthesis,
    SpeechSynthesisUtterance,
    createIcons,
    print,
    setTimeout: host.setTimeout.bind(host),
    clearTimeout: host.clearTimeout.bind(host),
    requestAnimationFrame: host.requestAnimationFrame.bind(host),
  });
};
