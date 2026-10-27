// Typed program owns OCR startup timing; this entry only loads it and preserves recovery.
const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.recordOcrAdapterV1) {
  // The document bootstrap owns this lifecycle, or another compatibility entry started it.
} else {
  document.documentElement.dataset.recordOcrAdapterV1 = 'starting';
const startLegacyRecovery = async () => {
  const recovery = await import('./record-ocr-dynamic-legacy-v21.mjs?v=23-lazy-recovery');
  recovery.startAtlasRecordOcrLegacyFallbackV1();
};

async function startRecordOcrAdapter() {
  try {
    const program = await import('./dist/frontend/program.js');
    if (typeof program.startAtlasRecordOcrBootstrapV1 !== 'function') throw new Error('Owner TypeScript de OCR indisponível.');
    await program.startAtlasRecordOcrBootstrapV1();
  } catch (error) {
    console.warn('[Belavista OCR] Ativando recuperação legada.', error);
    await startLegacyRecovery();
  }
}

void startRecordOcrAdapter().catch(error => {
  console.warn('[Belavista OCR] Owner TypeScript e recuperação indisponíveis.', error);
});
}
