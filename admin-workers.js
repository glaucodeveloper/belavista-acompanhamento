const legacyRecoveryUrl = new URL('./admin-workers-legacy-v1.mjs?v=worker-monitor-bootstrap-recovery-v1', import.meta.url);

try {
  const ownerUrl = new URL('./dist/frontend/program.js?ts-worker-monitor-entry-runtime-v1', import.meta.url);
  const owner = await import(ownerUrl.href);
  if (typeof owner.startAtlasWorkerMonitorEntryV1 !== 'function') {
    await import(legacyRecoveryUrl.href);
  } else {
    await owner.startAtlasWorkerMonitorEntryV1({ documentRef: document, windowRef: window });
  }
} catch (error) {
  console.warn('[Belavista worker monitor] TypeScript owner indisponível; usando recuperação MJS.', error);
  await import(legacyRecoveryUrl.href);
}
