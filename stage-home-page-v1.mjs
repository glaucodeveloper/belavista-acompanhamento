// Compatibility exports for consumers not yet moved to the TS composition.
// The renderer and its data contract live in the TypeScript monoliths.
import {
  renderAtlasOperationalAiPriorities as renderAtlasOperationalAiPrioritiesTsV1,
  renderAtlasStageHomePage as renderAtlasStageHomePageTsV1,
} from "./dist/frontend/components.js";

export const StageHomePage = ({ props = {}, children = [] } = {}) => ({
  next(message = {}) {
    return {
      done: false,
      value: renderAtlasStageHomePageTsV1({ ...props, ...message, children }),
    };
  },
});

export const renderStageHomePageV1 = (props = {}) =>
  renderAtlasStageHomePageTsV1(props);

export const renderOperationalAiPrioritiesV1 = (items = []) =>
  renderAtlasOperationalAiPrioritiesTsV1(Array.isArray(items) ? items : []);
