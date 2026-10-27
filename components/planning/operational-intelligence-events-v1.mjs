import { installAtlasOperationalIntelligenceEvents } from "../../dist/frontend/components.js";

/** Compatibility adapter; the typed component now owns the planning bindings. */
export const installOperationalIntelligenceEventsV1 = (ViewLayer, dependencies = {}) =>
  installAtlasOperationalIntelligenceEvents({ ViewLayer, ...dependencies });
