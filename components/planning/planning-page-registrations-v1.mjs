import * as atlasProgramTsV1 from "../../dist/frontend/program.js";
import {
  installPlanningPageRegistrationsV1 as installLegacyPlanningPageRegistrationsV1,
} from "./planning-page-registrations-legacy-v1.mjs?v=planning-page-registration-recovery-v1";
import { installProductWorkspacesV5356 as recoverProductWorkspacesV5356 } from "./product-workspaces-v5356.mjs?v=product-workspaces-recovery-v2";
import { installBelavistaFinalWorkspacesBootstrapV5360 as recoverFinalWorkspacesV5360 } from "./final-workspaces-bootstrap-legacy-v5360.mjs?v=final-workspaces-recovery-v1";
import { registerBelavistaStagesLandingV5361 as recoverStagesLandingV5361 } from "./stages-landing-page-legacy-v5361.mjs?v=stages-landing-recovery-v1";
import { installBelavistaFinalUiV5362 as recoverFinalUiEventsV5362 } from "./final-ui-events-legacy-v5362.mjs?v=final-ui-events-recovery-v1";

export const PLANNING_PAGE_REGISTRATION_LEAF_INSTALLERS_V1 = Object.freeze({
  installProductWorkspacesRecoveryV5356: recoverProductWorkspacesV5356,
  installFinalWorkspacesRecoveryV5360: recoverFinalWorkspacesV5360,
  installStagesLandingRecoveryV5361: recoverStagesLandingV5361,
  installFinalUiEventsRecoveryV5362: recoverFinalUiEventsV5362,
  installPlanningPageRegistrationsLegacyV1: installLegacyPlanningPageRegistrationsV1,
});

/** Adapt legacy leaf installers; program.ts owns their registration order. */
export const installPlanningPageRegistrationsV1 = ({
  globalRef = globalThis,
  ViewLayer,
  appStore,
  demoData,
  commissionDeals,
  esc,
  ico,
  notify,
  runtimeRouteV1,
  apiFetch,
  operationalHeaders,
  windowRef = globalRef.window,
  DateCtor = globalRef.Date,
  consoleRef = globalRef.console,
} = {}) => {
  const shared = {
    globalRef,
    ViewLayer,
    appStore,
    demoData,
    commissionDeals,
    esc,
    ico,
    notify,
    runtimeRouteV1,
    apiFetch,
    operationalHeaders,
    windowRef,
    DateCtor,
    consoleRef,
  };
  const installTyped = atlasProgramTsV1.installAtlasPlanningPageRegistrationsV1;
  if (typeof installTyped === "function") return installTyped({
    ...shared,
    productWorkspacesRecoveryV1: recoverProductWorkspacesV5356,
    finalWorkspacesRecoveryV1: recoverFinalWorkspacesV5360,
    stagesLandingRecoveryV1: recoverStagesLandingV5361,
    finalUiEventsRecoveryV1: recoverFinalUiEventsV5362,
  });
  return installLegacyPlanningPageRegistrationsV1(shared);
};
