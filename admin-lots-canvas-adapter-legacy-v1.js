// TypeScript owner adapter for the optional local lot-layout workspace.
(() => {
  if (globalThis.__belavistaAdminLotsCanvasAdapterV1) return;
  globalThis.__belavistaAdminLotsCanvasAdapterV1 = true;
  const installRecovery = async () => {
    const legacy = await import('./admin-lots-canvas-legacy-v1.js?v=admin-lots-canvas-recovery-v1');
    document.documentElement.dataset.adminLotsCanvasOwnerV1 = 'mjs-fallback';
    void legacy;
  };
  void (async () => {
    try {
      const program = await import('./dist/frontend/program.js');
      if (typeof program.installAtlasAdminLotsCanvasRuntimeV1 === 'function') {
        program.installAtlasAdminLotsCanvasRuntimeV1({
          documentRef: document,
          windowRef: window,
          storageRef: window.localStorage,
          fetchRef: globalThis.fetch.bind(globalThis),
        });
        document.documentElement.dataset.adminLotsCanvasOwnerV1 = 'typescript';
        return;
      }
    } catch (error) {
      console.warn('[Aliança Park] Canvas administrativo de lotes TS indisponível; usando recuperação MJS.', error);
    }
    await installRecovery();
  })().catch(error => console.error('[Aliança Park] Canvas administrativo de lotes não iniciou.', error));
})();
