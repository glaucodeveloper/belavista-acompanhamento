/** Typed map loading screen entrypoint with a preserved MJS recovery owner. */
import { installAtlasMapLoadingScreen } from "../../dist/frontend/components.js";
import { installMapLoadingScreenLegacyV1 } from "./map-loading-screen-legacy-v1.mjs?v=ts-map-loading-screen-legacy-v1";

export const installMapLoadingScreenV1 = (MapScene, dependencies = {}) => {
  if (typeof installAtlasMapLoadingScreen === "function")
    return installAtlasMapLoadingScreen(MapScene, dependencies);
  return installMapLoadingScreenLegacyV1(MapScene, dependencies);
};
