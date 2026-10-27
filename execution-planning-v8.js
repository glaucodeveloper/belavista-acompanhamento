// Compatibility entry for the deferred execution-planning workspace.
if (!globalThis.__belavistaExecutionPlanningControllerV1) {
  let installed = false;
  try {
    const application = await import('./dist/frontend/program.js');
    if (typeof application.startAtlasExecutionPlanningEntryV1 === 'function') {
      application.startAtlasExecutionPlanningEntryV1({ documentRef: document, windowRef: window, globalRef: globalThis });
      installed = true;
    }
  } catch (error) {
    console.warn('[execution-planning] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) await import('./execution-planning-adapter-legacy-v1.js?v=execution-planning-adapter-recovery-v1');
}
