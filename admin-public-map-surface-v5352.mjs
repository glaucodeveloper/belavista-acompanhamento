// TypeScript-first adapter for the administrative satellite map surface.
const programUrl = './dist/frontend/program.js';
let ownedByTypeScript = false;
try {
  if (document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 === 'typescript') {
    ownedByTypeScript = true;
  } else {
  const program = await import(programUrl);
  if (typeof program.installAtlasAdminMapComponentRuntimeV1 === 'function') {
    program.installAtlasAdminMapComponentRuntimeV1({
      documentRef: document,
      windowRef: window,
      registry: customElements,
      fetchRef: (resource, init) => window.fetch(resource, init),
    });
    document.documentElement.dataset.adminPublicMapSurfaceOwnerV1 = 'typescript';
    document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 = 'typescript';
    ownedByTypeScript = true;
  }
  }
} catch (error) {
  console.warn('[Belavista admin] Owner TS da superfície aérea indisponível; usando recuperação MJS.', error);
}
if (!ownedByTypeScript) {
  await import('./admin-public-map-surface-legacy-v5352.mjs?v=admin-public-map-surface-recovery-v1');
  document.documentElement.dataset.adminPublicMapSurfaceOwnerV1 = 'mjs-fallback';
}
