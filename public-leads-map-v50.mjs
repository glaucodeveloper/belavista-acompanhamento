// TypeScript-first adapter for the shared administrative map environment.
const programUrl = './dist/frontend/program.js';
let ownedByTypeScript = false;
try {
  if (document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 === 'typescript') {
    ownedByTypeScript = true;
  } else {
  const program = await import(programUrl);
  if (typeof program.installAtlasAdminMapComponentRuntimeV1 === 'function') {
    program.installAtlasAdminMapComponentRuntimeV1({ documentRef: document, windowRef: window, registry: customElements });
    document.documentElement.dataset.adminPublicMapMaterialsOwnerV1 = 'typescript';
    document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 = 'typescript';
    ownedByTypeScript = true;
  }
  }
} catch (error) {
  console.warn('[Belavista admin] Owner TS de materiais do mapa indisponível; usando recuperação MJS.', error);
}
if (!ownedByTypeScript) {
  await import('./public-leads-map-legacy-v50.mjs?v=admin-public-map-materials-recovery-v1');
  document.documentElement.dataset.adminPublicMapMaterialsOwnerV1 = 'mjs-fallback';
}
