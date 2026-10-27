const importExportV1 = (specifier, exportName) => async (...args) => {
  const module = await import(specifier);
  const installer = module[exportName];
  if (typeof installer !== "function")
    throw new TypeError(`Planning recovery export is unavailable: ${exportName}`);
  return installer(...args);
};

const installPlanningPageRegistrationsLegacyV1 = importExportV1(
  "./planning-page-registrations-legacy-v1.mjs?v=planning-page-registration-recovery-v2",
  "installPlanningPageRegistrationsV1",
);
const installProductWorkspacesRecoveryV5356 = importExportV1(
  "./product-workspaces-v5356.mjs?v=product-workspaces-recovery-v3",
  "installProductWorkspacesV5356",
);
const installFinalWorkspacesRecoveryV5360 = importExportV1(
  "./final-workspaces-bootstrap-legacy-v5360.mjs?v=final-workspaces-recovery-v2",
  "installBelavistaFinalWorkspacesBootstrapV5360",
);
const installStagesLandingRecoveryV5361 = importExportV1(
  "./stages-landing-page-legacy-v5361.mjs?v=stages-landing-recovery-v2",
  "registerBelavistaStagesLandingV5361",
);
const installFinalUiEventsRecoveryV5362 = importExportV1(
  "./final-ui-events-legacy-v5362.mjs?v=final-ui-events-recovery-v2",
  "installBelavistaFinalUiV5362",
);

const installPlanningPageRegistrationsV1 = importExportV1(
  "./planning-page-registrations-v1.mjs?v=planning-page-registrations-lazy-recovery-v1",
  "installPlanningPageRegistrationsV1",
);
const installOperationalMapPageV1 = importExportV1(
  "../map/operational-map-page-v1.mjs?v=operational-map-page-lazy-recovery-v1",
  "installOperationalMapPageV1",
);
const installStageOperationalPagesCompositionV1 = importExportV1(
  "./stage-operational-pages-composition-v1.mjs?v=stage-operational-pages-lazy-recovery-v1",
  "installStageOperationalPagesCompositionV1",
);
const installControlCenterApplicationCompositionV1 = importExportV1(
  "./control-center-application-composition-v1.mjs?v=control-center-composition-lazy-recovery-v1",
  "installControlCenterApplicationCompositionV1",
);
const installActivityRouteBridgeLifecycleV1 = importExportV1(
  "./activity-route-bridge-lifecycle-v1.mjs?v=activity-route-bridge-lazy-recovery-v1",
  "installActivityRouteBridgeLifecycleV1",
);
const installActivityRouteBridgeLegacyLifecycleV1 = importExportV1(
  "./activity-route-bridge-lifecycle-v1.mjs?v=activity-route-bridge-legacy-lazy-recovery-v1",
  "installActivityRouteBridgeLifecycleV1",
);
const installLegacyActivityInstallationSessionV1 = importExportV1(
  "./activity-installation-session-v1.mjs?v=activity-installation-session-lazy-recovery-v1",
  "installActivityInstallationSessionV1",
);
const installPersonnelPageRegistrationV1 = importExportV1(
  "./personnel-page-registration-v1.mjs?v=personnel-page-registration-lazy-recovery-v1",
  "installPersonnelPageRegistrationV1",
);
const installStageDedicatedSubpagesEventsLegacyV1 = importExportV1(
  "./stage-dedicated-subpages-events-v5427.mjs?v=stage-subpage-events-lazy-recovery-v1",
  "installStageDedicatedSubpagesEventsV5427",
);
const installStageRecordEntryPageLegacyV1 = importExportV1(
  "../records/stage-record-entry-page-v1.mjs?v=stage-record-entry-lazy-recovery-v1",
  "installStageRecordEntryPageV1",
);
const installStagePagesApplicationCompositionV1 = importExportV1(
  "./stage-pages-application-composition-v1.mjs?v=stage-pages-composition-lazy-recovery-v1",
  "installStagePagesApplicationCompositionV1",
);

const installStageDedicatedSubpagesEventsV1 = async (...args) => {
  try {
    const typed = await import("../../dist/frontend/components.js");
    if (typeof typed.installAtlasStageDedicatedSubpagesEventsV1 === "function")
      return typed.installAtlasStageDedicatedSubpagesEventsV1(...args);
  } catch {}
  return installStageDedicatedSubpagesEventsLegacyV1(...args);
};

const installStageRecordEntryPageV1 = async (...args) => {
  try {
    const typed = await import("../../dist/frontend/components.js");
    if (typeof typed.installAtlasStageRecordEntryPageV1 === "function")
      return typed.installAtlasStageRecordEntryPageV1(...args);
  } catch {}
  return installStageRecordEntryPageLegacyV1(...args);
};

const installStageAgendaApplicationCompositionV1 = async (input = {}) => {
  try {
    const typed = await import("../../dist/frontend/program.js");
    if (typeof typed.installAtlasStageAgendaApplicationCompositionV1 === "function")
      return await typed.installAtlasStageAgendaApplicationCompositionV1({
        ...input,
        installLegacyActivityInstallationSessionV1,
      });
  } catch {}
  const legacy = await import("./stage-agenda-application-composition-v1.mjs?v=stage-agenda-composition-lazy-recovery-v1");
  return legacy.installStageAgendaApplicationCompositionV1(input);
};

/** Planning recovery leaves load only when the TypeScript owner needs recovery. */
export const PLANNING_PAGE_INSTALLERS_V1 = Object.freeze({
  installPlanningPageRegistrationsV1,
  installPlanningPageRegistrationsLegacyV1,
  installProductWorkspacesRecoveryV5356,
  installFinalWorkspacesRecoveryV5360,
  installStagesLandingRecoveryV5361,
  installFinalUiEventsRecoveryV5362,
  installOperationalMapPageV1,
  installStageOperationalPagesCompositionV1,
  installControlCenterApplicationCompositionV1,
  installActivityRouteBridgeLifecycleV1,
  installActivityRouteBridgeLegacyLifecycleV1,
  installLegacyActivityInstallationSessionV1,
  installPersonnelPageRegistrationV1,
  installStageDedicatedSubpagesEventsV1,
  installStageDedicatedSubpagesEventsLegacyV1,
  installStageRecordEntryPageV1,
  installStageRecordEntryPageLegacyV1,
  installStagePagesApplicationCompositionV1,
  installStageAgendaApplicationCompositionV1,
});
