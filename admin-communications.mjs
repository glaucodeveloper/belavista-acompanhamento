// TypeScript owns mount readiness and selects the preserved legacy panel only on timeout.
const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.adminCommunicationsAdapterV1) {
  // The document bootstrap owns this lifecycle, or another compatibility entry started it.
} else {
  document.documentElement.dataset.adminCommunicationsAdapterV1 = 'starting';
const recoveryUrl = new URL('./admin-communications-legacy-v1.mjs?v=communications-legacy-fallback-v1', import.meta.url);

async function startCommunicationsAdapter() {
  if (!/^\/admin(?:\/|$)/.test(location.pathname)) return;
  try {
    const program = await import('./dist/frontend/program.js');
    if (typeof program.startAtlasAdminCommunicationsMountV1 !== 'function') throw new Error('Owner TypeScript de comunicações indisponível.');
    await program.startAtlasAdminCommunicationsMountV1({ documentRef: document, windowRef: window, timeoutMs: 1800 });
  } catch (error) {
    console.warn('[Aliança Park communications] Usando recuperação legada.', error);
    document.documentElement.dataset.adminCommunicationsAdapterOwnerV1 = 'legacy-fallback';
    await import(recoveryUrl.href);
  }
}

void startCommunicationsAdapter();
}
