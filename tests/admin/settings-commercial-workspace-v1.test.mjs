import test from "node:test";
import assert from "node:assert/strict";
import { installSettingsCommercialWorkspaceV1, stageKeyFor } from "../../components/commercial/settings-commercial-workspace-v1.mjs";

const stage = { id: 9, name: "Drenagem", status: "Em andamento", progress: 42, stageKey: "drainage", aiConfig: {
  requirements: ["Projeto aprovado"], conditions: ["Cota validada"], typicalDescription: "Executar rede pluvial.",
  requestHints: ["Tubo dimensionado"], evidenceFocus: ["Registro fotográfico"], procurementFocus: ["Conferir estoque"],
  executionProfile: { materialsTable: [{ name: "Tubo PEAD", description: "Rede principal", quantity: "80", unit: "m", status: "Planejado" }], expectedActivities: ["Assentar tubulação"] },
} };

const harness = ({ apiFetch = async () => ({ ok: true, json: async () => ({ stages: [stage] }) }) } = {}) => {
  const state = { view: "settings", currentActor: { role: "owner", uid: "u-1", name: "Dono" } }, writes = [], requests = [], notices = [], listeners = new Map();
  const appStore = { get: () => state, set(patch) { Object.assign(state, patch); writes.push(patch); } };
  const fetcher = async (url, init) => { requests.push({ url, init }); return apiFetch(url, init); };
  const host = { dataset: {}, ownerDocument: { createElement: () => ({}) }, innerHTML: "", querySelector() { return null; }, querySelectorAll() { return []; } };
  const root = { dataset: { view: "settings" }, querySelector(selector) { return selector === "[data-stage-comprehension-content]" ? host : null; } };
  class ViewLayer { bind() {} }
  installSettingsCommercialWorkspaceV1(ViewLayer, { appStore, executionModel: { stages: [{ key: "drainage", name: "Drenagem" }] }, apiFetch: fetcher, esc: (v) => String(v ?? ""), ico: (name) => `<i>${name}</i>`, notify: (...args) => notices.push(args) });
  return { ViewLayer, root, host, state, writes, requests, notices, listeners };
};

test("settings page includes the desktop owner UI to manage delegated foreman keys", () => {
  const { ViewLayer } = harness();
  const previousNative = globalThis.BELAVISTA_CAPACITOR_NATIVE;
  delete globalThis.BELAVISTA_CAPACITOR_NATIVE;
  const html = ViewLayer.prototype.settings.call({});
  if (previousNative === undefined) delete globalThis.BELAVISTA_CAPACITOR_NATIVE;
  else globalThis.BELAVISTA_CAPACITOR_NATIVE = previousNative;
  assert.match(html, /Chaves de encarregados/);
  assert.match(html, /data-foreman-key-form/);
  assert.match(html, /ai\.photos/);
  assert.match(html, /value="agenda\.write"\s*> Criar e alterar compromissos na agenda/);
  assert.match(html, /data-foreman-key-list/);
});

test("foreman key administration remains desktop-only", () => {
  const { ViewLayer } = harness();
  const previousNative = globalThis.BELAVISTA_CAPACITOR_NATIVE;
  globalThis.BELAVISTA_CAPACITOR_NATIVE = true;
  const html = ViewLayer.prototype.settings.call({});
  if (previousNative === undefined) delete globalThis.BELAVISTA_CAPACITOR_NATIVE;
  else globalThis.BELAVISTA_CAPACITOR_NATIVE = previousNative;
  assert.doesNotMatch(html, /Chaves de encarregados|data-foreman-key-form/);
});

test("settings page retains stage materials, expected activities and execution comprehension", () => {
  const { ViewLayer } = harness();
  const html = ViewLayer.prototype.settings.call({});
  assert.match(html, /Compreensão por etapa/);
  assert.match(html, /materiais, atividades esperadas e execução/);
  assert.match(html, /data-stage-create/);
  assert.match(html, /Nova etapa/);
  assert.doesNotMatch(html, /Regras de comissão|Compensação de atividades|Compensação de etapas/);
});

test("stage names without a direct execution-model key map to the original Worker comprehension key", () => {
  assert.equal(stageKeyFor({ id: 6, name: "Sinalização" }, { stages: [] }), "signage");
  assert.equal(stageKeyFor({ id: 9, name: "Etapa customizada" }, { stages: [] }), "9");
});

test("settings loads each stage from the persisted API and publishes the profile to application memory", async () => {
  const workbenchState = { inputSessions: [{
    id: "input-pipes", activityId: "pipes", title: "Assentar tubulação",
    text: "Conferir declividade e juntas.", unit: "m", materials: [
      { id: "mat-1", name: "Tubo PEAD", description: "Diâmetro nominal 600 mm", usage: "Assentamento da rede principal", quantity: "12", unit: "m" },
      "Juntas",
    ],
    release: "Alinhamento e declividade aceitos", properties: [{ id: "p1", label: "Diâmetro", value: "600 mm" }],
    inference: { production: { measureForm: "Medição por trecho", referenceRate: 24, rateUnit: "m/dia" }, conditions: [{ trigger: "notificar se houver vazamento" }] },
  }] };
  const h = harness({ apiFetch: async (url) => {
    if (url === "/api/stages-admin") return { ok: true, json: async () => ({ stages: [{ id: 9, name: "Drenagem", status: "Em andamento", progress: 42 }] }) };
    if (url === "/api/stages-admin/9") return { ok: true, json: async () => ({ stage }) };
    return { ok: true, json: async () => ({ state: workbenchState }) };
  } });
  h.ViewLayer.prototype.bind.call(h.root);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[1].url, "/api/stages-admin/9");
  assert.equal(h.requests[2].url, "/api/workbench/state?stage=drainage");
  assert.match(h.host.innerHTML, /Materiais/);
  assert.match(h.host.innerHTML, /data-stage-admin-form/);
  assert.match(h.host.innerHTML, /name="name"/);
  assert.match(h.host.innerHTML, /name="status"/);
  assert.match(h.host.innerHTML, /name="progress"/);
  assert.match(h.host.innerHTML, /name="week"/);
  assert.match(h.host.innerHTML, /name="owner"/);
  assert.match(h.host.innerHTML, /data-stage-delete/);
  assert.match(h.host.innerHTML, /Atividades esperadas/);
  assert.match(h.host.innerHTML, /Compreensão de materiais/);
  assert.match(h.host.innerHTML, /Tubo PEAD/);
  assert.match(h.host.innerHTML, /Assentar tubulação/);
  assert.match(h.host.innerHTML, /Conferir declividade e juntas/);
  assert.match(h.host.innerHTML, /Medição por trecho/);
  assert.match(h.host.innerHTML, /600 mm/);
  assert.match(h.host.innerHTML, /data-session-field="title"/);
  assert.match(h.host.innerHTML, /data-session-field="text"/);
  assert.match(h.host.innerHTML, /Materiais e equipamentos desta atividade/);
  assert.match(h.host.innerHTML, /data-session-material-add/);
  assert.match(h.host.innerHTML, /data-session-material-remove/);
  assert.match(h.host.innerHTML, /data-session-material-field="name"/);
  assert.match(h.host.innerHTML, /data-session-material-field="description"/);
  assert.match(h.host.innerHTML, /data-session-material-field="usage"/);
  assert.match(h.host.innerHTML, /data-session-material-field="quantity"/);
  assert.match(h.host.innerHTML, /data-session-material-field="unit"/);
  assert.match(h.host.innerHTML, /Diâmetro nominal 600 mm/);
  assert.match(h.host.innerHTML, /Assentamento da rede principal/);
  assert.match(h.host.innerHTML, /Juntas/);
  assert.match(h.host.innerHTML, /data-session-production="measureForm"/);
  assert.match(h.host.innerHTML, /data-session-condition="trigger"/);
  assert.match(h.host.innerHTML, /data-session-infer/);
  assert.deepEqual(h.state.integrationSettings.stageProfiles.drainage.expectedActivities, ["Assentar tubulação"]);
  const activityMaterial = h.state.integrationSettings.stageProfiles.drainage.materialsTable.find((item) => item.activityName === "Assentar tubulação" && item.name === "Tubo PEAD");
  assert.equal(activityMaterial.description, "Diâmetro nominal 600 mm");
  assert.equal(activityMaterial.usage, "Assentamento da rede principal");
  assert.equal(activityMaterial.quantity, "12");
  assert.equal(activityMaterial.unit, "m");
});

test("stage loading failures are displayed instead of presented as a successful configuration", async () => {
  const h = harness({ apiFetch: async () => ({ ok: false, status: 403, json: async () => ({ error: "Acesso negado." }) }) });
  h.ViewLayer.prototype.bind.call(h.root);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(h.host.innerHTML, /Acesso negado/);
  assert.equal(h.host.dataset.loaded, undefined);
});

test("settings preserves the original Worker stage comprehension when no custom workbench session is stored", async () => {
  const h = harness({ apiFetch: async (url) => {
    if (url === "/api/stages-admin") return { ok: true, json: async () => ({ stages: [{ id: 9, name: "Drenagem", status: "Em andamento", progress: 42 }] }) };
    if (url === "/api/stages-admin/9") return { ok: true, json: async () => ({ stage }) };
    return { ok: true, json: async () => ({ state: { inputSessions: [] } }) };
  } });
  h.ViewLayer.prototype.bind.call(h.root);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(h.host.innerHTML, /Assentamento de tubos e manilhas/);
  assert.match(h.host.innerHTML, /Medir metros lineares de vala aberta e liberada para berço/);
  assert.match(h.host.innerHTML, /data-session-property-add/);
  assert.match(h.host.innerHTML, /data-session-option="generateSchedule"/);
  assert.deepEqual(h.state.integrationSettings.stageProfiles.drainage.expectedActivities, ["Assentar tubulação"]);
});
