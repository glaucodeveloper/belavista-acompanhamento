// Compatibility entry for deferred administrative runtime setup.
let installed = false;
try {
  const application = await import('./dist/frontend/program.js');
  if (typeof application.startAtlasAdminRuntimeExtensionsV1 === 'function') {
    await application.startAtlasAdminRuntimeExtensionsV1({
      documentRef: document,
      windowRef: window,
      registry: customElements,
    });
    installed = true;
  }
} catch (error) {
  console.warn('[Aliança Park] Owner TypeScript do runtime administrativo indisponível; usando recuperação MJS.', error);
}

if (!installed) await import('./admin-runtime-v11-legacy-v1.js?v=admin-runtime-v11-recovery-v1');
