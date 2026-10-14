import test from "node:test";
import assert from "node:assert/strict";
import { installSettingsCommercialWorkspaceV1 } from "../../components/commercial/settings-commercial-workspace-v1.mjs";

const createHarness = () => {
  let state = {
    settingsCommissionPeriodV1: "monthly",
    commissionRulesByPeriodV1: {},
    stageCompensationsV1: [],
    activityCompensationsV1: [],
    agendaMobileNotifications: [],
  };
  const writes = [], notices = [],
    appStore = {
      get: () => state,
      set(patch) { writes.push(patch); state = { ...state, ...patch }; },
    },
    rule = { id: "rule-1", label: "Infra", payment: "Por venda", sharePercent: 10, warley: 60, partner: 40, description: "Regra atual" },
    listeners = new Map(),
    makeControl = (dataset = {}, values = {}) => ({
      dataset,
      textContent: "Mensal",
      addEventListener(type, callback) { listeners.set(`${dataset.kind || dataset.settingsPeriod || dataset.settingsCompensationForm || dataset.id || "control"}:${type}`, callback); },
      ...values,
    }),
    periodButton = makeControl({ settingsPeriod: "annual" }),
    ruleForm = makeControl({ id: "rule-form" }, { entries: Object.entries({ id: rule.id, label: "Infra atualizada", sharePercent: "12", warley: "55", partner: "45", description: "Ajustada" }) }),
    compensationForm = makeControl({ settingsCompensationForm: "activity" }, { entries: Object.entries({ id: "", stageKey: "water", activity: "Teste de pressão", mode: "prazo", value: "2", description: "Prazo justificado" }) }),
    settings = {
      querySelectorAll(selector) {
        return ({
          "[data-settings-period]": [periodButton],
          "[data-settings-rule-form]": [ruleForm],
          "[data-settings-compensation-form]": [compensationForm],
          "[data-settings-compensation-edit]": [],
          "[data-settings-compensation-delete]": [],
        })[selector] || [];
      },
      querySelector() { return makeControl({ id: "apply-rules" }); },
    },
    root = {
      dataset: { view: "settings" },
      querySelector(selector) { return selector === "[data-settings-commercial]" ? settings : null; },
      render() { writes.push({ rendered: true }); },
    },
    ViewLayer = class { bind() {} };
  const brokerReasonsV9 = () => [rule];
  installSettingsCommercialWorkspaceV1(ViewLayer, {
    appStore,
    brokerReasonsV9,
    executionModel: { stages: [{ key: "water", name: "Rede de Água" }] },
    esc: (value) => String(value ?? ""),
    ico: (name) => `<i>${name}</i>`,
    notify: (...args) => notices.push(args),
    settingsAuditTemplate: () => "<main>Auditoria</main>",
    FormDataCtor: class { constructor(form) { return form.entries; } },
  });
  return { ViewLayer, appStore, root, state: () => state, writes, notices, listeners, ruleForm, compensationForm };
};

test("settings commercial page renders its original audit base, commission periods and compensation forms", () => {
  const { ViewLayer, appStore } = createHarness();
  const html = ViewLayer.prototype.settings.call({}, "argument");

  assert.match(html, /^<main>Auditoria<\/main>/);
  assert.match(html, /Regras de comissão e compensações/);
  assert.match(html, /data-settings-period="monthly"/);
  assert.match(html, /data-settings-period="annual"/);
  assert.match(html, /data-settings-compensation-form="activity"/);
  assert.match(html, /data-settings-compensation-form="stage"/);
  assert.match(html, /Rede de Água/);
  assert.equal(appStore.get().settingsCommissionPeriodV1, "monthly");
});

test("settings commercial handlers retain period selection, validated rule updates and compensation creation", () => {
  const harness = createHarness();
  harness.ViewLayer.prototype.bind.call(harness.root);

  harness.listeners.get("annual:click")();
  assert.equal(harness.state().settingsCommissionPeriodV1, "annual");
  assert.deepEqual(harness.state().commissionRulesByPeriodV1.annual, [{ ...harness.state().commissionRulesByPeriodV1.annual[0] }]);

  const submitRule = harness.listeners.get("rule-form:submit");
  let prevented = false;
  submitRule({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(harness.state().commissionRulesByPeriodV1.annual[0].label, "Infra atualizada");
  assert.equal(harness.state().commissionRulesByPeriodV1.annual[0].warley, 55);
  assert.ok(harness.notices.some(([message]) => message.includes("Regra salva")));

  harness.listeners.get("activity:submit")({ preventDefault() {} });
  assert.equal(harness.state().activityCompensationsV1.length, 1);
  assert.equal(harness.state().activityCompensationsV1[0].activity, "Teste de pressão");
  assert.equal(harness.state().activityCompensationsV1[0].value, 2);
});
