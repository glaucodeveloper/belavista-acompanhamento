export const INTEGRATION_SETTINGS_KEY = "belavista.integrations.v1";

/** Read shared UI integration preferences through an injected storage boundary. */
export const createIntegrationSettingsReaderV1 = ({
  getStorage = () => globalThis.localStorage,
} = {}) => () => {
  try {
    return JSON.parse(getStorage().getItem(INTEGRATION_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
};
