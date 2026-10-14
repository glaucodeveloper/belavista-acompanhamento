import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installAiActionReflectionV1 } from "../../components/planning/ai-action-reflection-v1.mjs";

const createHarness = () => {
  const patches = [], notifications = [];
  const action = {
    id: "drainage", label: "Drenagem pluvial", impact: 80, readiness: 90,
    blocker: "projeto", relation: "terraplenagem", eta: "próxima semana",
    phase: "execução", track: "rede pluvial",
  };
  const state = {
    selectedAiAction: action.id,
    aiComprehensionChanges: { stageKey: "water", fields: ["conditions"] },
    aiActionPositionChanges: { [action.id]: { from: { impact: 30, readiness: 30 }, to: { impact: 80, readiness: 90 } } },
  };
  const appStore = {
    get: () => state,
    set: (patch) => { patches.push(patch); Object.assign(state, patch); },
  };
  const button = {
    dataset: { aiReflectionApply: action.id },
    addEventListener: (_, handler) => { button.click = handler; },
  };
  class ViewLayer {
    actions() { return '<main><aside class="action-inspector">origem</aside></main>'; }
    bind() { this.baseBindCalled = true; }
    querySelectorAll(selector) { return selector === "[data-ai-reflection-apply]" ? [button] : []; }
  }
  const stage = { key: "water", name: "Drenagem Pluvial", production: { rate: 5, rateUnit: "m/dia" } };
  installAiActionReflectionV1(ViewLayer, {
    appStore,
    operationalActions: () => [action],
    extensionStage: () => stage,
    controlStageProfileV1: () => ({
      requirements: ["tubo"], conditions: ["base validada"], requestHints: ["estoque"],
      organizationRequest: "organizar por trecho",
    }),
    esc: (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    ico: (name) => `<i data-icon="${name}"></i>`,
    notify: (...args) => notifications.push(args),
  });
  return { ViewLayer, button, patches, notifications, state, action };
};

test("action reflection renders the selected matrix inference from current stage context", () => {
  const { ViewLayer } = createHarness();
  const html = new ViewLayer().actions();

  assert.match(html, /class="action-inspector"><section class="ai-action-reflection-panel"/);
  assert.match(html, /<\/section>origem<\/aside>/);
  assert.match(html, /data-ai-action-reflection/);
  assert.match(html, /Drenagem Pluvial/);
  assert.match(html, /alterou conditions/);
  assert.match(html, /1 requisito\(s\)/);
  assert.match(html, /1 condição\(ões\) de liberação/);
  assert.match(html, /Executar agora/);
  assert.match(html, /Registrar inferência no cronograma/);
});

test("reflection action preserves base binding and records the selected action in app state", () => {
  const { ViewLayer, button, patches, notifications, state, action } = createHarness();
  const view = new ViewLayer();
  view.bind();
  assert.equal(view.baseBindCalled, true);
  button.click();

  const saved = patches.at(-1);
  assert.equal(saved.lastAction, `Refletiu a ação ${action.label} no cronograma`);
  assert.equal(saved.aiScheduleReflections[action.id].eta, action.eta);
  assert.equal(saved.aiScheduleReflections[action.id].phase, action.phase);
  assert.equal(saved.aiScheduleReflections[action.id].relation, action.relation);
  assert.deepEqual(saved.aiScheduleReflections[action.id].position, state.aiActionPositionChanges[action.id]);
  assert.deepEqual(notifications, [["Inferência baseada no gráfico registrada no cronograma operacional.", "success"]]);
});

test("action reflection fails fast on missing application ports and root delegates rendering and events", async () => {
  assert.throws(() => installAiActionReflectionV1(class ViewLayer {}, {}), /requires appStore/);
  const source = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(source, /import \{ installAiActionReflectionV1 \} from "\.\/components\/planning\/ai-action-reflection-v1\.mjs/);
  assert.match(source, /installAiActionReflectionV1\(ViewLayer, \{/);
  assert.doesNotMatch(source, /const inferScheduleImpactV1 =/);
  assert.doesNotMatch(source, /const aiActionReflectionMarkupV1 =/);
  assert.doesNotMatch(source, /const bindAiActionReflectionV1 =/);
});
