// TS-first adapter for the AI chat tab and map-widget ghost preference.
if (!globalThis.__belavistaChatTabWidgetGhostV5359) {
  const program = await import('./dist/frontend/program.js').catch(() => null);
  let installed = false;
  try {
    if (typeof program?.installAtlasChatTabWidgetV5359 === 'function') {
      globalThis.__belavistaChatTabWidgetControllerV5359 = program.installAtlasChatTabWidgetV5359({ document, window });
      document.documentElement.dataset.chatTabWidgetOwnerV5359 = 'typescript';
      installed = true;
    }
  } catch (error) {
    console.warn('[chat-tab-widget] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) {
    await import('./chat-tab-widget-ghost-legacy-v5359.mjs?v=chat-tab-widget-recovery-v1');
    document.documentElement.dataset.chatTabWidgetOwnerV5359 = 'legacy-recovery';
  }
}
