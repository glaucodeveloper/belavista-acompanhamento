// Compatibility entry for deferred stage administration.
let installed = false;
try {
  const application = await import('./dist/frontend/program.js');
  if (typeof application.startAtlasStageAdministrationEntryV1 === 'function') {
    await application.startAtlasStageAdministrationEntryV1({
      documentRef: document,
      windowRef: window,
      globalRef: globalThis,
    });
    installed = true;
  }
} catch (error) {
  console.warn('[stage-admin] owner TypeScript indisponível; usando recuperação MJS.', error);
}

if (!installed) await import('./stage-admin-adapter-legacy-v1.js?v=stage-admin-adapter-recovery-v1');
