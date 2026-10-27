/* Thin compatibility adapter; the root program owns the shared store, authenticated reads,
 * assignment loading, and installation of the typed map component. */
const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.activityMapAdapterOwner) {
  // The administrative TypeScript root already installed this shared map layer.
} else {
  document.documentElement.dataset.activityMapAdapterOwner = 'starting';
const legacyFallback = async () => {
  try {
    await import("./activity-map-layer-legacy-v1.mjs?v=legacy-fallback-1");
  } catch (error) {
    console.error("[Aliança Park] activity-map fallback unavailable", error);
  }
};

try {
  const [typedProgram, state] = await Promise.all([
    import("./dist/frontend/program.js"),
    import("./state.js"),
  ]);
  const installed = typeof typedProgram.installAtlasWorkerActivityMapLayerV1 === "function"
    && await typedProgram.installAtlasWorkerActivityMapLayerV1({
      appStore: state.appStore,
      demoData: state.demoData,
    });
  if (installed) {
    document.documentElement.dataset.activityMapAdapterOwner = "typescript";
  } else {
    await legacyFallback();
  }
} catch (error) {
  console.warn("[Aliança Park] TypeScript activity-map owner unavailable; loading MJS recovery.", error);
  await legacyFallback();
}
}
