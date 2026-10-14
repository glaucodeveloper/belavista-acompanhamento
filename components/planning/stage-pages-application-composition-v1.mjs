import { installDashboardHomeEventsV1 } from "./dashboard-home-page-v1.mjs?v=dashboard-home-page-v1";
import { installDashboardStageControlV1 } from "./dashboard-stage-control-v1.mjs?v=dashboard-stage-control-v1";
import { installStageDedicatedSubpagesEventsV5427 } from "./stage-dedicated-subpages-events-v5427.mjs?v=stage-dedicated-subpages-events-v5427";
import { installStagePanoramaPageV1 } from "./stage-panorama-page-v1.mjs?v=stage-panorama-page-v1";
import { installStageSubpageMapShellV1, installStageViewTabsEventsV1, createStagePersistentTimelineMarkupV1, installStagePersistentTimelinePagesV1, installPersistentStageTimelineEventsV1 } from "./stage-context-chrome-v1.mjs?v=stage-context-chrome-v7";
import { installStageRecordEntryPageV1 } from "../records/stage-record-entry-page-v1.mjs?v=stage-record-entry-page-v1";
import { installPertInteractiveV1 } from "./pert-workspace-v1.mjs?v=pert-workspace-v2";
import { installDashboardHomeContextV1 } from "../map/dashboard-home-context-v1.mjs?v=dashboard-home-context-v1";

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
  // STAGE_DEDICATED_SUBPAGES_V5427: cards do cronograma e abas da etapa
  // compartilham o mesmo contexto. Agenda e Registros são superfícies próprias,
  // enquanto as abas de leitura permanecem âncoras dentro da etapa dedicada.
  const stageDedicatedSubpagesBindV5427 = ViewLayer.prototype.bind;
  installStageDedicatedSubpagesEventsV5427(ViewLayer, {
    bindBase: stageDedicatedSubpagesBindV5427,
    appStore,
    executionModel,
    demoData,
  });

  installDashboardHomeEventsV1(ViewLayer, dashboardHomePageV1.bind);

  // Keep the lot route guard between dashboard and stage-control installation,
  // matching the source bootstrap's prototype-patching order.
  installLotDevelopmentRenderGuardV1(ViewLayer, { appStore, windowRef });

  installDashboardStageControlV1(ViewLayer, {
    appStore,
    executionModel,
    stageV9LiveFor,
    esc,
    ico,
    runtimeRouteV1,
    windowRef,
    fetcher,
  });

  // STAGES_PANORAMA_HOME_V1: the stage and schedule area shares this landing renderer.
  installStagePanoramaPageV1(ViewLayer);

  // Subpage renderers share the 3D map chrome owned by the planning module.
  installStageSubpageMapShellV1(ViewLayer, { extensionStage, stageHeader3DMarkup });

  // The planning module owns tab state transitions for stage subpages.
  installStageViewTabsEventsV1(ViewLayer, { appStore, stageContextV1 });

  // The final stage-scoped records page is owned by the records module.
  installStageRecordEntryPageV1(ViewLayer, { appStore, demoData, activityCatalog, esc, ico });

  const stagePersistentTimelineMarkupV1 = createStagePersistentTimelineMarkupV1({
    appStore,
    extensionStage,
    executionModel,
    stageV9LiveFor,
    demoData,
    esc,
    ico,
    isLimitedOperationalActor,
  });
  installStagePersistentTimelinePagesV1(ViewLayer, { stagePersistentTimelineMarkupV1 });
  installPersistentStageTimelineEventsV1(ViewLayer, { appStore, executionModel, demoData });

  // PERT_INTERACTIVE_RELATIONS_V1: PERT also serves as the visual editor.
  installPertInteractiveV1(ViewLayer, {
    appStore,
    beginCardCanvasLink: beginCardCanvasLinkV1,
    currentPertNodes,
    documentRef,
    windowRef,
    esc,
    notify,
  });

  installDashboardHomeContextV1(ViewLayer, { appStore, dashboardFilters, documentRef });

  return Object.freeze({ stagePersistentTimelineMarkupV1 });
};
