const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.adminTestControlsAdapterV1) {
  // The root program owns test-control startup, or another compatibility entry started it.
} else {
  document.documentElement.dataset.adminTestControlsAdapterV1 = 'starting';
const [componentsTs, programTs] = await Promise.all([
  import('./dist/frontend/components.js').catch(() => null),
  import('./dist/frontend/program.js').catch(() => null),
]);

let installed = false;
try {
  installed = Boolean(componentsTs?.mountAtlasAdminTestControlsV1
    && programTs?.installAtlasAdminTestControlsV1?.({
      documentRef: document,
      windowRef: window,
      storage: localStorage,
      fetcher: (input, init) => fetch(input, init),
      getActor: () => globalThis.BELAVISTA_ADMIN_ACTOR || {},
      getIdToken: () => globalThis.BELAVISTA_GET_ID_TOKEN?.(),
      globalRef: globalThis,
      BroadcastChannelCtor: globalThis.BroadcastChannel,
    }));
} catch (error) {
  console.warn('[Aliança Park] Owner TS dos controles de teste indisponível; usando recuperação MJS.', error);
}

if (!installed) await import('./admin-test-controls-legacy-v1.mjs?v=admin-test-controls-recovery-v1');
}
