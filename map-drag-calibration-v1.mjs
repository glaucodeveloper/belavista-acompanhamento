/* Entry adapter; the program discovers the map and observes late route mounting. */
const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.adminMapDragCalibrationAdapterV1) {
  // The root program owns calibration startup, or another compatibility entry started it.
} else {
  document.documentElement.dataset.adminMapDragCalibrationAdapterV1 = 'starting';
let legacyFallbackPromise;

const loadLegacyFallback = () => {
  if (!legacyFallbackPromise) {
    legacyFallbackPromise = import("./map-drag-calibration-legacy-v1.mjs?v=legacy-fallback-1")
      .catch(error => {
        legacyFallbackPromise = undefined;
        console.error("[Aliança Park] fallback da calibração não carregou", error);
      });
  }
  return legacyFallbackPromise;
};

try {
  const typedProgram = await import("./dist/frontend/program.js");
  const install = typedProgram.installAtlasMapDragCalibrationProgramV1;
  const installed = typeof install === "function" && install({
    documentRef: document,
    MutationObserverCtor: globalThis.MutationObserver,
    loadLegacyFallback,
  });
  if (!installed) void loadLegacyFallback();
} catch (error) {
  console.warn("[Aliança Park] owner TypeScript da calibração indisponível; carregando recuperação MJS.", error);
  void loadLegacyFallback();
}
}
