import { installMapSceneStoreEventsV1 } from "./map-scene-store-events-v1.mjs";
import { activateAtlasMapScene, installAtlasMapSceneStoreEvents } from "../../dist/frontend/components.js";

/** Activates the connected MapScene after its shell and cover layout are ready. */
export const activateMapSceneV1 = (
  scene,
  { appStore, demoData, performanceRef = globalThis.performance, solarMarkup },
) => {
  if (typeof activateAtlasMapScene === "function") return activateAtlasMapScene(scene, {
    appStore,
    demoData,
    performanceRef,
    publicPresentation: scene.isPublicCustomerExperience() && !scene.isAdminPublicMapV1(),
    solarMarkup,
  });
  scene.mountMap3DLoadingScreenV1();
  scene.querySelector(".map-tint")?.insertAdjacentHTML(
    "afterend",
    solarMarkup,
  );
  // O dashboard administrativo compartilhado usa a mesma composição visual
  // do /leads, mas não é a página pública: seus controles, filtros e widgets
  // continuam interativos.
  const publicPresentation =
    scene.isPublicCustomerExperience() && !scene.isAdminPublicMapV1();
  if (publicPresentation) {
    scene.dataset.mapControls = "public-disabled";
    scene.querySelectorAll(
      ".map-badge,.map-category-switcher,.map-rotation-controls,.map-gesture-legend,.map-selection-tools,.map-selection-panel,.map-v5-launcher,.compact-map-controls,.map-status-panel,[data-map-controls],[data-scene-selection]",
    ).forEach((node) => node.remove());
  } else {
    scene.dataset.mapControls = "admin-enabled";
  }
  scene.bindSolarControl();
  scene.setMapTileMode(scene.mapTileMode, false);
  if (!publicPresentation) scene.bindSceneControls();
  scene._lastOverlayStageId = appStore.get().selectedStage;
  scene._lastStoreView = appStore.get().view;
  scene.setMapContext(scene._lastStoreView);
  // A cena administrativa mantém a calibração visual compartilhada, mas usa
  // o renderer isolado e estático para que o GLB nunca seja bootado junto
  // com a abertura do painel.
  if (scene.isAdminStandalone3DV5370()) {
    scene.mountAdminStandalone3DV5370();
  } else {
    scene.initWhenReady();
  }
  const storeEventDependencies = {
    appStore,
    demoData,
    performanceRef,
    publicPresentation,
  };
  if (typeof installAtlasMapSceneStoreEvents === "function") installAtlasMapSceneStoreEvents(scene, storeEventDependencies);
  else installMapSceneStoreEventsV1(scene, storeEventDependencies);
  return publicPresentation;
};
