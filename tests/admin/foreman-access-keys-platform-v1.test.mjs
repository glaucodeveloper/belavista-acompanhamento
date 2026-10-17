import test from "node:test";
import assert from "node:assert/strict";
import { installOperationalSettingsWorkspaceV1 } from "../../components/commercial/operational-settings-workspace-v1.mjs";

const renderSettings = (native) => {
  const previous = globalThis.BELAVISTA_CAPACITOR_NATIVE;
  if (native === undefined) delete globalThis.BELAVISTA_CAPACITOR_NATIVE;
  else globalThis.BELAVISTA_CAPACITOR_NATIVE = native;
  class ViewLayer {}
  installOperationalSettingsWorkspaceV1(ViewLayer, {
    appStore: { get: () => ({ currentActor: { role: "owner", userType: "", label: "Dono" }, systemCalibration: { config: {} } }), set() {} },
    readIntegrationSettings: () => ({}),
    integrationSettingsKey: "settings.test",
    apiFetch: async () => ({ ok: true, json: async () => ({ keys: [] }) }),
    operationalHeaders: () => ({}),
    registerOperationalDevice: async () => ({}),
    esc: (value) => String(value ?? ""),
    ico: () => "",
    notify() {},
    settingsAuditTemplate: () => '<footer class="settings-tools">',
    storage: { setItem() {} },
    document: { defaultView: { navigator: {} } },
    window: { confirm: () => true },
    CustomEventCtor: class CustomEvent {},
    FormDataCtor: class FormData {},
  });
  const html = ViewLayer.prototype.settings.call({});
  if (previous === undefined) delete globalThis.BELAVISTA_CAPACITOR_NATIVE;
  else globalThis.BELAVISTA_CAPACITOR_NATIVE = previous;
  return html;
};

test("administra chaves no desktop para o dono", () => {
  const html = renderSettings(false);
  assert.match(html, /Chaves de encarregados/);
  assert.match(html, /ai\.photos/);
});

test("não inclui a administração de chaves na interface do APK", () => {
  const html = renderSettings(true);
  assert.doesNotMatch(html, /Chaves de encarregados|data-foreman-key-form/);
});
