// TypeScript owner adapter for the administrative final-presentation pass.
if (!globalThis.__BELAVISTA_FINAL_UI_RUNTIME_V5362) {
  const installTypedOwner = async () => {
    try {
      const components = await import(new URL('./dist/frontend/components.js?v=final-ui-components-ts-owner-v1', import.meta.url));
      const ViewLayer = customElements.get('view-layer');
      if (typeof components.installBelavistaFinalUiV5362 === 'function' && ViewLayer) {
        components.installBelavistaFinalUiV5362({ ViewLayer, documentRef: document, host: globalThis });
        document.documentElement.dataset.finalUiOwnerV5362 = 'typescript';
        return true;
      }
    } catch (error) {
      console.warn('[Aliança Park] Owner TypeScript da interface final indisponível; usando recuperação MJS.', error);
    }
    await import(new URL('./belavista-final-ui-legacy-v5362.mjs?v=final-ui-legacy-recovery-v1', import.meta.url));
    document.documentElement.dataset.finalUiOwnerV5362 = 'legacy-recovery';
    return false;
  };
  void installTypedOwner().catch(error => console.error('[Aliança Park] Interface final não iniciou.', error));
}
