const enabled = new URLSearchParams(location.search).get('glauco_shell') === '1';

if (enabled) {
  let installedByTypescript = false;
  try {
    const atlasProgramTsV1 = await import('./dist/frontend/program.js');
    const installBridge = atlasProgramTsV1.installAtlasGlaucoShellBridgeV1;
    if (typeof installBridge === 'function') {
      installedByTypescript = installBridge({
        windowRef: globalThis.window,
        documentRef: globalThis.document,
        customElementsRef: globalThis.customElements,
      });
    }
  } catch {
    installedByTypescript = false;
  }

  if (!installedByTypescript) {
    await import('./glauco-shell-bridge-legacy-v58.mjs?v=typescript-program-component-owner-v1')
      .catch(() => undefined);
  }
}
