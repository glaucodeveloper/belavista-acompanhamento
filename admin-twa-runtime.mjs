const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.adminTwaAdapterV1) {
  // The root program owns TWA startup, or another compatibility entry started it.
} else {
  document.documentElement.dataset.adminTwaAdapterV1 = 'starting';
const [componentsTs, programTs] = await Promise.all([
  import('./dist/frontend/components.js').catch(() => null),
  import('./dist/frontend/program.js').catch(() => null),
]);

let installed = false;
try {
  installed = Boolean(componentsTs?.mountAtlasAdminTwaPushCardV1 && programTs?.startAtlasAdminTwaRuntimeV1);
  if (installed) {
    programTs.startAtlasAdminTwaRuntimeV1({
      documentRef: document,
      windowRef: window,
      navigatorRef: navigator,
      globalRef: globalThis,
      localStorage,
      sessionStorage,
      registerOperationalDevice: async actor => {
        const { registerOperationalDevice } = await import('./firebase.mjs?v=admin-twa-device-v1');
        return registerOperationalDevice(actor);
      },
      warn: (message, error) => console.warn(message, error),
    });
  }
} catch (error) {
  console.warn('[Aliança Park TWA] Owner TypeScript indisponível; usando recuperação MJS.', error);
}

if (!installed) await import('./admin-twa-runtime-legacy-v1.mjs?v=admin-twa-runtime-recovery-v1');
}
