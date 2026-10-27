import { createLotDevelopmentProfilesV1, hasAtlasLotDevelopmentProfilesOwnerV1 } from "./lot-development-profiles-v1.mjs?v=lot-development-profiles-v3-ts-owner-gate";
import { installLotDevelopmentPageV1 } from "./lot-development-page-v1.mjs?v=lot-development-page-v2";
import { installProjectDocumentsPageV1 } from "./project-documents-page-v1.mjs?v=project-documents-page-v1";

/** Install the legacy lot-development page only as a recovery adapter. */
export const installLegacyLotDevelopmentPageV1 = ({
  ViewLayer,
  appStore,
  REPASSE_PRICE_CATALOG,
  esc,
  EventCtor = globalThis.Event,
  FormDataCtor = globalThis.FormData,
  formatBRL,
  host = globalThis,
  ico,
  notify,
  runtimeRouteV1,
} = {}) => {
  const lotDevelopmentProfiles = createLotDevelopmentProfilesV1({
    appStore,
    REPASSE_PRICE_CATALOG,
    host,
  });

  installLotDevelopmentPageV1(ViewLayer, {
    appStore,
    esc,
    Event: EventCtor,
    FormData: FormDataCtor,
    formatBRL,
    host,
    ico,
    ...lotDevelopmentProfiles,
    notify,
  });
  return lotDevelopmentProfiles;
};

/** Install the legacy project-document page only as a recovery adapter. */
export const installLegacyProjectDocumentsPageV1 = ({
  ViewLayer, appStore, esc, ico, notify, runtimeRouteV1, host = globalThis,
} = {}) => {
  installProjectDocumentsPageV1(ViewLayer, {
    appStore,
    esc,
    ico,
    notify,
    runtimeRouteV1,
    host,
  });
};

/** Preserve the old combined entrypoint for callers outside the TS bootstrap. */
export const installLotProjectWorkspacesRegistrationV1 = (dependencies = {}) => {
  const registry = dependencies.host?.customElements || globalThis.customElements;
  const typedComponentsReady =
    typeof registry?.get?.("atlas-lot-development") === "function" &&
    typeof registry?.get?.("atlas-project-documents") === "function";
  if (hasAtlasLotDevelopmentProfilesOwnerV1 && typedComponentsReady) {
    createLotDevelopmentProfilesV1({
      appStore: dependencies.appStore,
      REPASSE_PRICE_CATALOG: dependencies.REPASSE_PRICE_CATALOG,
      host: dependencies.host || globalThis,
    });
    return Object.freeze({ owner: "typescript", recoveryInstalled: false });
  }

  const lotDevelopmentProfiles = installLegacyLotDevelopmentPageV1(dependencies);
  installLegacyProjectDocumentsPageV1(dependencies);
  return lotDevelopmentProfiles;
};
