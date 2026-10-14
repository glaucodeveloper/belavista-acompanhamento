import { createLotDevelopmentProfilesV1 } from "./lot-development-profiles-v1.mjs?v=lot-development-profiles-v1";
import { installLotDevelopmentPageV1 } from "./lot-development-page-v1.mjs?v=lot-development-page-v2";
import { installProjectDocumentsPageV1 } from "./project-documents-page-v1.mjs?v=project-documents-page-v1";

/** Install the lot-profile route followed by the project-document archive. */
export const installLotProjectWorkspacesRegistrationV1 = ({
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

  // The document archive is installed after the profile route, as before.
  installProjectDocumentsPageV1(ViewLayer, {
    appStore,
    esc,
    ico,
    notify,
    runtimeRouteV1,
    host,
  });

  return lotDevelopmentProfiles;
};
