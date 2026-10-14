import { installAdminLeadsDirectoryV1 } from "./leads-directory-v1.mjs?v=leads-directory-v1";

/** Register the administrative lead directory with its real app/browser ports. */
export const installLeadsDirectoryRegistrationV1 = ({
  ViewLayer,
  appStore,
  apiFetch,
  runtimeRouteV1,
  demoData,
  esc,
  ico,
  notify,
  host = globalThis,
  getWorkerAssistant = () => host.belavistaWorkerAssistant,
} = {}) => installAdminLeadsDirectoryV1(ViewLayer, {
  appStore,
  apiFetch,
  runtimeRouteV1,
  demoData,
  esc,
  ico,
  notify,
  storage: host.localStorage,
  windowRef: host.window,
  getWorkerAssistant,
});
