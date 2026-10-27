// TS-first host adapter. Keep this shell entry limited to module loading.
const legacyRecoveryUrl = new URL('./admin-application-entry-legacy-v1.mjs?v=ts-admin-document-bootstrap-legacy-v1', import.meta.url);
let adminProgram = null;
try {
  adminProgram = await import('../dist/frontend/program.js');
} catch (error) {
  console.warn('[Belavista admin bootstrap] TypeScript owner indisponível; usando recuperação MJS.', error);
}

if (typeof adminProgram?.startAtlasAdminDocumentBootstrapV1 !== 'function') {
  await import(legacyRecoveryUrl.href);
} else {
  await adminProgram.startAtlasAdminDocumentBootstrapV1({
    document,
    window,
    loadAuthenticationGate: () => import('../admin-auth.mjs?v=github-pat-session-timeout-v18-leads-route-owner&ts-admin-auth-gate-projection-v1&ts-admin-auth-session-flow-v1&ts-admin-auth-runtime-owner-v1&ts-admin-auth-application-owner-v1&desktop-local-demo-v1&ts-dashboard-organic-layout-v1&ts-dashboard-crm-summary-v1&ts-progress-diary-form-v1'),
  });
}
