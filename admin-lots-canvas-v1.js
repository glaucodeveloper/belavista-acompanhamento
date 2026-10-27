// Compatibility entry for the deferred local lots workspace.
let installed = false;
try {
  const application = await import('./dist/frontend/program.js');
  if (typeof application.startAtlasAdminLotsCanvasEntryV1 === 'function') {
    await application.startAtlasAdminLotsCanvasEntryV1({
      documentRef: document,
      windowRef: window,
      globalRef: globalThis,
    });
    installed = true;
  }
} catch (error) {
  console.warn('[Aliança Park] Owner TypeScript do canvas de lotes indisponível; usando recuperação MJS.', error);
}

if (!installed) await import('./admin-lots-canvas-adapter-legacy-v1.js?v=admin-lots-canvas-adapter-recovery-v1');
