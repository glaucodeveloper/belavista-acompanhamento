import { installDashboardHomeEventsV1 } from "./dashboard-home-page-v1.mjs?v=dashboard-home-page-v1";
import { installDashboardStageControlV1 } from "./dashboard-stage-control-v1.mjs?v=dashboard-stage-control-v1";
import { installStagePanoramaPageV1 } from "./stage-panorama-page-v1.mjs?v=stage-panorama-page-v1";
import { installStageSubpageMapShellV1, installStageViewTabsEventsV1, createStagePersistentTimelineMarkupV1, installStagePersistentTimelinePagesV1, installPersistentStageTimelineEventsV1 } from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v9&ts-stage-context-chrome-adapter-v1&ts-stage-context-resolver-owner-v1";
import { installPertInteractiveV1 } from "./pert-workspace-v1.mjs?v=pert-workspace-v2";
import { installDashboardHomeContextV1 } from "../map/dashboard-home-context-v1.mjs?v=dashboard-home-context-v1";
import * as stagePageProgramTsV1 from "../../dist/frontend/program.js";
import * as stagePageComponentsTsV1 from "../../dist/frontend/components.js";

/** Install the stage, dashboard, timeline and PERT page families in original bootstrap order. */
export const installStagePagesApplicationCompositionV1 = ({
  ViewLayer,
  appStore,
  activityCatalog,
  beginCardCanvasLinkV1,
  controlStageProfileV1,
  currentPertNodes,
  dashboardFilters,
  dashboardHomePageV1,
  demoData,
  documentRef = globalThis.document,
  executionModel,
  extensionStage,
  esc,
  fetcher,
  ico,
  installLotDevelopmentRenderGuardV1,
  isLimitedOperationalActor,
  notify,
  operationalActions,
  runtimeRouteV1,
  stageContextV1,
  stageHeader3DMarkup,
  stageV9LiveFor,
  windowRef = globalThis.window,
} = {}) => {
  if (typeof stagePageComponentsTsV1.installAtlasDashboardHomeEventsV1 === "function")
    stagePageComponentsTsV1.installAtlasDashboardHomeEventsV1(ViewLayer, dashboardHomePageV1.bind);
  else
    installDashboardHomeEventsV1(ViewLayer, dashboardHomePageV1.bind);

  // Keep the lot route guard between dashboard and stage-control installation,
  // matching the source bootstrap's prototype-patching order.
  installLotDevelopmentRenderGuardV1(ViewLayer, { appStore, windowRef });

  const installTypedDashboardStageControlV1 = stagePageProgramTsV1.installAtlasDashboardStageControlV1;
  let typedDashboardStageControlInstalledV1 = false;
  try {
    typedDashboardStageControlInstalledV1 = typeof installTypedDashboardStageControlV1 === "function"
      && installTypedDashboardStageControlV1({
        ViewLayer,
        appStore,
        executionModel,
        stageV9LiveFor,
        esc,
        ico,
        runtimeRouteV1,
        windowRef,
        apiFetch: fetcher,
      });
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] TypeScript dashboard stage control unavailable; keeping MJS fallback.", error);
  }
  if (!typedDashboardStageControlInstalledV1) installDashboardStageControlV1(ViewLayer, {
    appStore, executionModel, stageV9LiveFor, esc, ico, runtimeRouteV1, windowRef, fetcher,
  });

  // STAGES_PANORAMA_HOME_V1: the stage and schedule area shares this landing renderer.
  if (typeof stagePageComponentsTsV1.installAtlasStagePanoramaPageV1 === "function") {
    stagePageComponentsTsV1.installAtlasStagePanoramaPageV1(ViewLayer);
  } else {
    installStagePanoramaPageV1(ViewLayer);
  }

  // Subpage renderers share the 3D map chrome owned by the planning module.
  if (typeof stagePageComponentsTsV1.installAtlasStageSubpageMapShellV1 === "function")
    stagePageComponentsTsV1.installAtlasStageSubpageMapShellV1(ViewLayer, { extensionStage, stageHeader3DMarkup });
  else
    installStageSubpageMapShellV1(ViewLayer, { extensionStage, stageHeader3DMarkup });

  // The planning module owns tab state transitions for stage subpages.
  if (typeof stagePageComponentsTsV1.installAtlasStageViewTabsEventsV1 === "function")
    stagePageComponentsTsV1.installAtlasStageViewTabsEventsV1(ViewLayer, { appStore, stageContextV1 });
  else
    installStageViewTabsEventsV1(ViewLayer, { appStore, stageContextV1 });

  const timelineInputV1 = {
    appStore,
    extensionStage,
    executionModel,
    stageV9LiveFor,
    demoData,
    esc,
    ico,
    isLimitedOperationalActor,
  };
  const stagePersistentTimelineMarkupV1 = typeof stagePageComponentsTsV1.createAtlasStagePersistentTimelineMarkupV1 === "function"
    ? stagePageComponentsTsV1.createAtlasStagePersistentTimelineMarkupV1(timelineInputV1)
    : createStagePersistentTimelineMarkupV1(timelineInputV1);
  if (typeof stagePageComponentsTsV1.installAtlasStagePersistentTimelinePagesV1 === "function")
    stagePageComponentsTsV1.installAtlasStagePersistentTimelinePagesV1(ViewLayer, { stagePersistentTimelineMarkupV1 });
  else
    installStagePersistentTimelinePagesV1(ViewLayer, { stagePersistentTimelineMarkupV1 });
  if (typeof stagePageComponentsTsV1.installAtlasPersistentStageTimelineEventsV1 === "function")
    stagePageComponentsTsV1.installAtlasPersistentStageTimelineEventsV1(ViewLayer, { appStore, executionModel, demoData });
  else
    installPersistentStageTimelineEventsV1(ViewLayer, { appStore, executionModel, demoData });

  // PERT_INTERACTIVE_RELATIONS_V1: PERT also serves as the visual editor.
  if (ViewLayer.prototype.__atlasPertWorkspaceTsOwnerV1 !== true) {
    installPertInteractiveV1(ViewLayer, {
      appStore,
      beginCardCanvasLink: beginCardCanvasLinkV1,
      currentPertNodes,
      documentRef,
      windowRef,
      esc,
      notify,
    });
  }

  if (typeof stagePageComponentsTsV1.installAtlasDashboardHomeContextV1 === "function")
    stagePageComponentsTsV1.installAtlasDashboardHomeContextV1(ViewLayer, { appStore, dashboardFilters, documentRef });
  else
    installDashboardHomeContextV1(ViewLayer, { appStore, dashboardFilters, documentRef });

  return Object.freeze({ stagePersistentTimelineMarkupV1 });
};
