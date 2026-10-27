// TS-first adapter for the mobile cash-entry form and its interaction state.
if (!globalThis.__belavistaFinanceMobileCashV5358) {
  const program = await import('./dist/frontend/program.js').catch(() => null);
  let installed = false;
  try {
    if (typeof program?.installAtlasFinanceMobileCashV5358 === 'function') {
      globalThis.__belavistaFinanceMobileCashControllerV5358 = program.installAtlasFinanceMobileCashV5358({ document, window });
      document.documentElement.dataset.financeMobileCashOwnerV5358 = 'typescript';
      installed = true;
    }
  } catch (error) {
    console.warn('[finance-mobile-cash] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) {
    await import('./finance-mobile-cash-legacy-v5358.mjs?v=finance-mobile-cash-recovery-v1');
    document.documentElement.dataset.financeMobileCashOwnerV5358 = 'legacy-recovery';
  }
}
