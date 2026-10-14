/** Binds the application-state subscription and map backdrop click behavior. */
export const installMapSceneStoreEventsV1 = (
  scene,
  { appStore, demoData, performanceRef = globalThis.performance, publicPresentation },
) => {
  appStore.subscribe((state) => {
    if (scene._lastStoreView !== state.view) {
      scene._lastStoreView = state.view;
      scene.setMapContext(state.view);
    }
    if (scene._lastRecordsRef !== state.records) {
      scene._lastRecordsRef = state.records;
      scene.syncOperationalRecordMapV5370(state.records || []);
    }
    if (
      state.solarHourMode === "manual" &&
      Number.isFinite(Number(state.solarHour)) &&
      Math.abs(Number(state.solarHour) - Number(scene.solarHour || 0)) > 0.01
    )
      scene.setSolarHour(state.solarHour, false, false);
    scene.dataset.mode = state.mapMode;
    scene.setMapTileMode(
      scene._publicRequestedMapTileMode || state.mapTileMode || "satellite",
      false,
    );
    const stage = demoData.activities.find((activity) => activity.id === state.selectedStage);
    if (
      !publicPresentation &&
      stage &&
      scene._lastOverlayStageId !== state.selectedStage
    ) {
      scene._lastOverlayStageId = state.selectedStage;
      scene.setStageOverlay(stage.name, false);
    }
  });

  scene.addEventListener("click", (event) => {
    if (
      event.target.closest(
        ".leaflet-control,.map-solar-control,.map-badge,.map-category-switcher,.map-selection-tools,.map-selection-panel,.map-gesture-legend,.map-rotation-controls",
      ) ||
      performanceRef.now() < scene._suppressMapToggleUntil
    )
      return;
    appStore.set({
      mapMode: appStore.get().mapMode === "overview" ? "focus" : "overview",
      lastAction: "Alternou foco do mapa",
    });
  });
};
