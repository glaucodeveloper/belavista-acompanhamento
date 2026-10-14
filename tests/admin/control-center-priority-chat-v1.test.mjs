import test from "node:test";
import assert from "node:assert/strict";
import { installControlCenterPriorityChatV1 } from "../../components/planning/control-center-priority-chat-v1.mjs";

test("priority card sends full execution context to the injected worker assistant", async () => {
  const action = {
      id: "priority-1", label: "Concluir drenagem", track: "Drenagem", phase: 2,
      relation: "Etapa 03", blocker: "Aguardar tubos", readiness: 61, impact: 82,
      eta: "Hoje", requirements: ["validar caimento"], materialRequirements: ["tubo PEAD"],
    },
    state = {}, listeners = [], calls = [], chatEvents = [],
    card = {
      dataset: { stageHomeAiAction: "priority-1" },
      classList: new Set(["stage-home-ai-action", "tone-warning"]),
      attributes: {},
      getAttribute(name) { return this.attributes[name] ?? null; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      addEventListener(type, handler) { listeners.push({ type, handler }); },
    },
    minimize = { textContent: "", setAttribute(name, value) { this[name] = value; } },
    assistant = {
      root: {
        classList: { remove: (...args) => chatEvents.push(["expand", ...args]) },
        querySelector: () => minimize,
      },
      submit: async (...args) => { calls.push(args); },
    },
    ViewLayer = class {
      bind() { return "base-bind-result"; }
      querySelectorAll(selector) {
        assert.equal(selector, ".stage-home-ai-grid [data-stage-home-ai-action]");
        return [card];
      }
    };

  installControlCenterPriorityChatV1(ViewLayer, {
    appStore: { set: (patch) => Object.assign(state, patch) },
    operationalActions: () => [action],
    CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: "policy",
    notify: (...args) => calls.push(["notify", ...args]),
    getWorkerAssistant: () => assistant,
  });

  const layer = new ViewLayer();
  assert.equal(layer.bind(), "base-bind-result");
  assert.equal(layer.bind(), "base-bind-result");
  assert.equal(listeners.length, 1, "binding is idempotent for the same card");
  await listeners[0].handler();

  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /Conduza pelo chat.*Concluir drenagem/);
  assert.equal(calls[0][4].instruction, "policy");
  assert.equal(calls[0][4].mode, "priority");
  assert.equal(calls[0][4].requestContext.source, "stage-home-ai-priority");
  assert.deepEqual(calls[0][4].requestContext.priority, {
    id: "priority-1", label: "Concluir drenagem", track: "Drenagem", phase: 2,
    relation: "Etapa 03", blocker: "Aguardar tubos", readiness: 61, impact: 82,
    eta: "Hoje", requirements: ["validar caimento"], materialRequirements: ["tubo PEAD"],
  });
  assert.equal(state.lastAction, "Enviou prioridade Concluir drenagem ao assistente operacional dos workers");
  assert.deepEqual(chatEvents, [["expand", "is-collapsed"]]);
  assert.equal(minimize.textContent, "−");
  assert.equal(minimize["aria-label"], "Minimizar assistente");
  assert.equal(card.getAttribute("aria-busy"), null);
});

test("missing assistant keeps the original warning path without attempting a request", async () => {
  const notices = [], listeners = [],
    card = {
      dataset: { stageHomeAiAction: "priority-1" },
      classList: new Set(),
      getAttribute: () => null,
      setAttribute() {},
      removeAttribute() {},
      addEventListener: (_type, handler) => listeners.push(handler),
    },
    ViewLayer = class { querySelectorAll() { return [card]; } };
  installControlCenterPriorityChatV1(ViewLayer, {
    appStore: { set() {} }, operationalActions: () => [{ id: "priority-1", label: "Ação" }],
    CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: "policy",
    notify: (...args) => notices.push(args), getWorkerAssistant: () => null,
  });
  new ViewLayer().bind();
  await listeners[0]();
  assert.deepEqual(notices, [["Assistente operacional dos workers não está disponível nesta tela.", "warning"]]);
});

test("priority board composes into the existing Control view from the planning module", () => {
  const actions = [{ id: "priority-1", label: "Revisar drenagem" }],
    rendered = [];
  class ViewLayer {
    control(...args) { return `base:${args.join(":")}:<section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO`; }
    bind() { return "base"; }
  }
  installControlCenterPriorityChatV1(ViewLayer, {
    appStore: { set() {} },
    operationalActions: () => actions,
    renderOperationalAiPrioritiesV1: (items) => { rendered.push(items); return "<priority-board>"; },
    CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: "policy",
    notify() {},
  });

  assert.equal(new ViewLayer().control("arg"), 'base:arg:<priority-board><section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO');
  assert.deepEqual(rendered, [actions]);
});
