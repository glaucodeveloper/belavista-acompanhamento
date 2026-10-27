
const loadProgressPageV1 = async (...args) => {
  const { createProgressPageV1 } = await import("./progress-page-v1.mjs?v=ts-progress-page-recovery-lazy-v1");
  return createProgressPageV1(...args);
};
const loadDashboardCardDragV1 = async (...args) => {
  const { installDashboardCardDragV1 } = await import("./dashboard-card-drag-v1.mjs?v=ts-dashboard-card-drag-recovery-lazy-v1");
  return installDashboardCardDragV1(...args);
};
const loadStageExtensionEventsV1 = async (...args) => {
  const { installStageExtensionEventsV1 } = await import("./stage-extension-events-v1.mjs?v=ts-stage-extension-events-recovery-lazy-v1");
  return installStageExtensionEventsV1(...args);
};
const loadStageBindCompositionV1 = async (...args) => {
  const { installStageBindCompositionV1 } = await import("./stage-bind-composition-v1.mjs?v=ts-stage-bind-composition-recovery-lazy-v1");
  return installStageBindCompositionV1(...args);
};
const loadStageActivityCanvasV1 = async (...args) => {
  const { installStageActivityCanvasV1 } = await import("./stage-activity-canvas-v1.mjs?v=ts-stage-activity-canvas-recovery-lazy-v2");
  return installStageActivityCanvasV1(...args);
};
const loadStageDedicatedWorkspaceV1 = async (...args) => {
  const { installStageDedicatedWorkspaceV1 } = await import("./stage-dedicated-workspace-v1.mjs?v=ts-stage-dedicated-workspace-recovery-lazy-v1");
  return installStageDedicatedWorkspaceV1(...args);
};
const loadWorkflowCanvasConnectionsV1 = async (...args) => {
  const { installWorkflowCanvasConnectionsV1 } = await import("../map/workflow-canvas-connections-v1.mjs?v=ts-workflow-canvas-recovery-lazy-v2");
  return installWorkflowCanvasConnectionsV1(...args);
};

/** Expose MJS recovery leaves; route composition and normal installers belong to program.ts. */
export const STAGE_APPLICATION_INSTALLERS_V1 = Object.freeze({
  createProgressPageV1: loadProgressPageV1,
  installDashboardCardDragLegacyV1: loadDashboardCardDragV1,
  installStageExtensionEventsLegacyV1: loadStageExtensionEventsV1,
  installStageBindCompositionLegacyV1: loadStageBindCompositionV1,
  installStageDedicatedWorkspaceLegacyV1: loadStageDedicatedWorkspaceV1,
  installStageActivityCanvasLegacyV1: loadStageActivityCanvasV1,
  installWorkflowCanvasConnectionsLegacyV1: loadWorkflowCanvasConnectionsV1,
});
