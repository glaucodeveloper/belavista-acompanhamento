import { registerPrimitiveElementsV1 } from "./primitive-elements-registration-v1.mjs?v=primitive-elements-registration-v1";
import { createAppNavigationElementsV1, dashboardModeKeyV1 } from "./app-navigation-elements-v1.mjs?v=atlas-zip-shell-v2";
import { installMapApplicationRegistrationV1 } from "../map/map-application-registration-v1.mjs?v=map-application-registration-v2&pdf-marker-anchors-v1&pdf-yellow-circles-v4";
import { createViewLayerV1 } from "./view-layer-v1.mjs?v=mobile-focus-v1";

/** Register the shared custom elements in the original application boot order. */
export const registerApplicationElementsV1 = ({
  customElementsRef = globalThis.customElements,
  navigationDependencies = {},
  mapDependencies = {},
  viewLayerDependencies = {},
  registerPrimitives = registerPrimitiveElementsV1,
  createNavigation = createAppNavigationElementsV1,
  registerMap = installMapApplicationRegistrationV1,
  createViewLayer = createViewLayerV1,
} = {}) => {
  registerPrimitives({ customElementsRef });

  const navigation = createNavigation({
      ...navigationDependencies,
      customElements: customElementsRef,
    }),
    map = registerMap({ dashboardModeKeyV1, ...mapDependencies, customElementsRef }),
    MapScene = map.MapScene;

  if (!customElementsRef.get("map-scene"))
    customElementsRef.define("map-scene", MapScene);

  const ViewLayer = createViewLayer(viewLayerDependencies);
  return Object.freeze({ ...navigation, ...map, MapScene, ViewLayer });
};
