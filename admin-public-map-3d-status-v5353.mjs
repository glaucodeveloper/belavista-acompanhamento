// TypeScript-first adapter for 3D map readiness and failure status.
const programUrl = './dist/frontend/program.js';
let ownedByTypeScript = false;
try {
  if (document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 === 'typescript') {
    ownedByTypeScript = true;
  } else {
  const program = await import(programUrl);
  if (typeof program.installAtlasAdminMapComponentRuntimeV1 === 'function') {
    program.installAtlasAdminMapComponentRuntimeV1({ documentRef: document, windowRef: window, registry: customElements });
    document.documentElement.dataset.adminPublicMap3dStatusOwnerV1 = 'typescript';
    document.documentElement.dataset.adminMapComponentRuntimeOwnerV1 = 'typescript';
    ownedByTypeScript = true;
  }
  }
} catch (error) {
  console.warn('[Belavista admin] Owner TS do estado 3D indisponível; usando recuperação MJS.', error);
}
if (!ownedByTypeScript) {
  await import('./admin-public-map-3d-status-legacy-v5353.mjs?v=admin-public-map-3d-status-recovery-v1');
  document.documentElement.dataset.adminPublicMap3dStatusOwnerV1 = 'mjs-fallback';
}
