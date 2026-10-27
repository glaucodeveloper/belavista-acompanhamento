import { registerProductWorkspacesV5356 } from "./product-workspaces-registration-v5356.mjs?v=product-workspaces-registration-v5356";
import { installBelavistaFinalWorkspacesBootstrapV5360 } from "./final-workspaces-bootstrap-v5360.mjs?v=final-workspaces-ts-owner-v1";
import { registerBelavistaStagesLandingV5361 } from "./stages-landing-page-v5361.mjs?v=stages-landing-ts-owner-v1";
import { installBelavistaFinalUiV5362 } from "./final-ui-events-v5362.mjs?v=final-ui-events-ts-owner-v1";

/** Install planning-related page owners in their established override order. */
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
  productWorkspacesInstallerV1 = registerProductWorkspacesV5356,
  finalWorkspacesInstallerV1 = installBelavistaFinalWorkspacesBootstrapV5360,
  stagesLandingInstallerV1 = registerBelavistaStagesLandingV5361,
  finalUiInstallerV1 = installBelavistaFinalUiV5362,
} = {}) => {
  productWorkspacesInstallerV1({
    globalRef,
    ViewLayer,
    appStore,
    demoData,
    esc,
    ico,
    runtimeRouteV1,
    apiFetch,
    notify,
    windowRef,
  });
  finalWorkspacesInstallerV1({
    globalRef,
    ViewLayer,
    appStore,
    demoData,
    commissionDeals,
    esc,
    ico,
    apiFetch,
    operationalHeaders,
    notify,
    windowRef,
    DateCtor,
  });
  stagesLandingInstallerV1({
    globalRef,
    ViewLayer,
    appStore,
    demoData,
    esc,
    ico,
    notify,
    windowRef,
    consoleRef,
    DateCtor,
  });
  finalUiInstallerV1({
    globalRef,
    ViewLayer,
    appStore,
    window: windowRef,
  });
};
