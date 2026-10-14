import test from "node:test";
import assert from "node:assert/strict";
import { installOperationalSettingsWorkspaceV1 } from "../../components/commercial/operational-settings-workspace-v1.mjs";

const setup = ({ failDevice = false, failCalibration = false } = {}) => {
  const state = {
      currentActor: { role: "admin", label: "Administradora" },
      systemCalibration: {
        version: 4,
        updatedBy: "Warley",
        config: {
          reserveCents: 250000,
          dependencyProgress: 80,
          notificationCooldownMinutes: 60,
          stages: [{ key: "water", name: "Rede de água", dependsOn: ["survey"], budgetCents: 50000, priority: 70 }],
        },
      },
      integrationSettings: { ownerNotificationUid: "owner-from-state" },
    },
    writes = [],
    storageWrites = [],
    dispatched = [],
    notices = [],
    apiCalls = [],
    listeners = new Map(),
    appStore = {
      get: () => state,
      set: (patch) => { writes.push(patch); Object.assign(state, patch); },
    },
    integrationForm = {
      values: { apiBase: "https://worker.example", githubToken: "ghp_do-not-store", ownerNotificationUid: "form-owner" },
      elements: { autoNotify: { checked: true } },
      addEventListener(type, callback) { listeners.set(`integration:${type}`, callback); },
    },
    calibrationStatus = { textContent: "" },
    stageRow = {
      dataset: { calibrationStage: "water" },
      querySelector(selector) {
        return {
          '[name="budgetCents"]': { value: "1.234,50" },
          '[name="priority"]': { value: "72" },
          '[name="dependsOn"]': { value: "survey,permits" },
        }[selector];
      },
    },
    calibrationForm = {
      elements: { reserve: { value: "2.000,25" }, dependencyProgress: { value: "85" }, notificationCooldownMinutes: { value: "45" } },
      querySelector: (selector) => selector === "[data-calibration-status]" ? calibrationStatus : null,
      querySelectorAll: (selector) => selector === "[data-calibration-stage]" ? [stageRow] : [],
      addEventListener(type, callback) { listeners.set(`calibration:${type}`, callback); },
    },
    deviceStatus = { textContent: "" },
    deviceButton = { disabled: false, addEventListener(type, callback) { listeners.set(`device:${type}`, callback); } },
    host = {
      querySelector(selector) {
        return {
          "[data-integration-form]": integrationForm,
          "[data-calibration-form]": calibrationForm,
          "[data-register-device]": deviceButton,
          "[data-device-status]": deviceStatus,
        }[selector] || null;
      },
      querySelectorAll: () => [],
      connectOperationalNotifications: async () => {},
      runOperationalLoop: async (eventName) => { apiCalls.push(["loop", eventName]); },
    },
    FormDataCtor = class {
      constructor(form) { return Object.entries(form.values || {})[Symbol.iterator](); }
    },
    document = { dispatchEvent: (event) => dispatched.push(event) },
    workspace = installOperationalSettingsWorkspaceV1(class ViewLayer { bind() { return "base"; } }, {
      appStore,
      readIntegrationSettings: () => ({ apiBase: "https://worker.example", stageProfiles: { water: ["pipe"] } }),
      integrationSettingsKey: "belavista.integrations.v1",
      apiFetch: async (...args) => {
        apiCalls.push(args);
        if (failCalibration) return { ok: false, status: 503, json: async () => ({ error: "calibration service unavailable" }) };
        return { ok: true, json: async () => ({ calibration: { version: 5 }, operational: { balance: 10 } }) };
      },
      operationalHeaders: (headers) => ({ authorization: "session", ...headers }),
      registerOperationalDevice: async () => {
        if (failDevice) throw new Error("device registration unavailable");
        return { pushEnabled: true };
      },
      esc: (value) => String(value ?? "").replaceAll("<", "&lt;"),
      ico: (name) => `[${name}]`,
      notify: (...args) => notices.push(args),
      settingsAuditTemplate: () => '<main>base settings<footer class="settings-tools"></footer></main>',
      storage: { setItem: (...args) => storageWrites.push(args) },
      document,
      CustomEventCtor: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } },
      FormDataCtor,
    });
  return { appStore, state, writes, storageWrites, dispatched, notices, apiCalls, listeners, host, integrationForm, calibrationForm, deviceButton, deviceStatus, calibrationStatus, workspace };
};

test("operational settings render the existing role, calibration, and integration sections", () => {
  const ctx = setup(), html = ctx.workspace.render.call({}, "kept");
  for (const expected of [
    "Governança do agente", "CALIBRAÇÃO OPERACIONAL · VERSÃO 4", "Rede de água",
    "Integrações operacionais", "https://worker.example", "owner-from-state",
    "GITHUB_PAT · configurado no Worker", "<footer class=\"settings-tools\">",
  ]) assert.ok(html.includes(expected), `missing operational settings contract: ${expected}`);
});

test("operational settings preserve secure integration save and calibration publication flows", async () => {
  const ctx = setup();
  assert.equal(ctx.workspace.bind.call(ctx.host), "base");

  await ctx.listeners.get("integration:submit")({ preventDefault() {} });
  const saved = JSON.parse(ctx.storageWrites[0][1]);
  assert.equal(ctx.storageWrites[0][0], "belavista.integrations.v1");
  assert.equal(saved.apiBase, "https://worker.example");
  assert.equal(saved.githubToken, undefined);
  assert.equal(saved.workerSecretGithubPat, "GITHUB_PAT");
  assert.deepEqual(saved.stageProfiles, { water: ["pipe"] });
  assert.equal(saved.autoNotify, true);
  assert.equal(ctx.dispatched[0].type, "belavista:integrations-saved");

  await ctx.listeners.get("calibration:submit")({ preventDefault() {}, currentTarget: ctx.calibrationForm });
  const request = ctx.apiCalls.find(([url]) => url === "/api/calibrations");
  assert.equal(request[1].method, "PUT");
  assert.deepEqual(JSON.parse(request[1].body), {
    reserveCents: 200025,
    dependencyProgress: 85,
    notificationCooldownMinutes: 45,
    stages: [{ key: "water", budgetCents: 123450, priority: 72, dependsOn: ["survey", "permits"] }],
  });
  assert.equal(ctx.state.systemCalibration.version, 5);
  assert.deepEqual(ctx.writes.at(-1), {
    systemCalibration: { version: 5 },
    operationalState: { balance: 10 },
    lastAction: "Administrador publicou calibração 5",
  });
  assert.ok(ctx.apiCalls.some((call) => call[0] === "loop" && call[1] === "calibration.changed"));
  assert.equal(ctx.calibrationStatus.textContent, "Validando relações e criando uma nova versão…");
  assert.ok(ctx.notices.some(([message]) => message === "Calibração publicada e caixa redistribuído."));
});

test("operational settings preserve successful device registration feedback", async () => {
  const ctx = setup();
  ctx.workspace.bind.call(ctx.host);
  await ctx.listeners.get("device:click")({ currentTarget: ctx.deviceButton });
  assert.equal(ctx.deviceButton.disabled, true);
  assert.equal(ctx.deviceStatus.textContent, "Dispositivo registrado no Realtime Database com push habilitado.");
  assert.ok(ctx.notices.some(([message]) => message === "Dispositivo vinculado ao canal operacional em tempo real."));
});

test("operational settings expose external calibration and device failures without claiming success", async () => {
  const ctx = setup({ failDevice: true, failCalibration: true });
  ctx.workspace.bind.call(ctx.host);
  await ctx.listeners.get("device:click")({ currentTarget: ctx.deviceButton });
  await ctx.listeners.get("calibration:submit")({ preventDefault() {}, currentTarget: ctx.calibrationForm });
  assert.equal(ctx.deviceButton.disabled, false);
  assert.equal(ctx.deviceStatus.textContent, "device registration unavailable");
  assert.equal(ctx.calibrationStatus.textContent, "calibration service unavailable");
  assert.ok(ctx.notices.some(([message, type]) => message === "Não foi possível ativar notificações." && type === "warning"));
  assert.ok(ctx.notices.some(([message, type]) => message === "Calibração não foi alterada." && type === "warning"));
  assert.equal(ctx.state.systemCalibration.version, 4);
});
