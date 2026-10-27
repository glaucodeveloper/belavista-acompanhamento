/** TypeScript-first compatibility boundary for stage context chrome. */
import * as componentsTsV1 from "../../dist/frontend/components.js";
import * as programTsV1 from "../../dist/frontend/program.js";
import * as legacyV1 from "./stage-context-chrome-legacy-v1.mjs?v=ts-stage-context-chrome-owner-v1";

export const STAGE_CONTEXT_VIEWS_V1 = new Set([
  "stages", "records", "progress", "foremen",
]);

const owner = (name, fallback) =>
  typeof componentsTsV1[name] === "function" ? componentsTsV1[name] : fallback;

export const installStageHeader3DControlsV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStageHeader3DControlsV1", legacyV1.installStageHeader3DControlsV1)(ViewLayer, input);

export const installStageSubpageMapShellV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStageSubpageMapShellV1", legacyV1.installStageSubpageMapShellV1)(ViewLayer, input);

export const installStageStableViewTabsV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStageStableViewTabsV1", legacyV1.installStageStableViewTabsV1)(ViewLayer, input);

export const createStageContextResolverV1 = (input = {}) =>
  typeof programTsV1.createAtlasStageContextResolverV1 === "function"
    ? programTsV1.createAtlasStageContextResolverV1(input)
    : legacyV1.createStageContextResolverV1(input);

export const createStageViewTabsMarkupV1 = (input = {}) =>
  owner("createAtlasStageViewTabsMarkupV1", legacyV1.createStageViewTabsMarkupV1)(input);

export const installStageViewTabsEventsV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStageViewTabsEventsV1", legacyV1.installStageViewTabsEventsV1)(ViewLayer, input);

export const createStagePersistentTimelineMarkupV1 = (input = {}) =>
  owner("createAtlasStagePersistentTimelineMarkupV1", legacyV1.createStagePersistentTimelineMarkupV1)(input);

export const installStagePersistentTimelinePagesV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStagePersistentTimelinePagesV1", legacyV1.installStagePersistentTimelinePagesV1)(ViewLayer, input);

export const installPersistentStageTimelineEventsV1 = (ViewLayer, input = {}) =>
  owner("installAtlasPersistentStageTimelineEventsV1", legacyV1.installPersistentStageTimelineEventsV1)(ViewLayer, input);

export const installStageContextChromeV1 = (ViewLayer, input = {}) =>
  owner("installAtlasStageContextChromeV1", legacyV1.installStageContextChromeV1)(ViewLayer, input);
