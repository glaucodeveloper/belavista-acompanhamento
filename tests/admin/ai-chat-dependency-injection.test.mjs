import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAiChatBrowserAdapter } from "../../components/chat/ai-chat-browser-adapter.mjs";
import { createAiChatInferencePortV1 } from "../../components/chat/ai-chat-inference-port-v1.mjs";
import { createAiChatCommandPortV1 } from "../../components/chat/ai-chat-command-port-v1.mjs";
import { createAiChatRecordPersistenceV1 } from "../../components/chat/ai-chat-record-persistence-v1.mjs";
import { createAiChatStatePortV1 } from "../../components/chat/ai-chat-state-port-v1.mjs";
import { createAiChatProjectContextPortV1 } from "../../components/chat/ai-chat-project-context-port-v1.mjs";
import { createAiChatStoragePortV1 } from "../../components/chat/storage.mjs";
import { createAiChatAgendaPortV1 } from "../../components/chat/ai-chat-agenda-port-v1.mjs";
import { createAiChatRecordsPortV1 } from "../../components/chat/ai-chat-records-port-v1.mjs";
import { createAiChat } from "../../components/chat/ai-chat.mjs";
import { createBelavistaAiChatDependenciesV1 } from "../../components/chat/belavista-ai-chat-composition-v1.mjs";
import {
  BELAVISTA_AI_CHAT_PORTS_V1,
  createBelavistaAiChatProvidersV1,
} from "../../components/chat/belavista-ai-chat-providers-v1.mjs";
import { assertAiChatDependenciesV1, createAiChatDependenciesV1 } from "../../components/chat/ai-chat-dependencies-v1.mjs";
import {
  aiChatFactoryProviderV1,
  aiChatValueProviderV1,
  createAiChatServiceContainerV1,
} from "../../components/chat/ai-chat-service-container-v1.mjs";

const callablePorts = (names) => Object.fromEntries(names.map((name) => [name, () => {}]));
const serviceGroups = () => ({
  chat: {
    CHAT_IMAGE_MAX_BYTES_V1: 6_000_000,
    CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: "instruction",
    CHAT_VISUAL_ALLOCATION_POLICY_V1: "policy",
  },
  storage: {
    ...callablePorts([
      "readChatHistory", "readChatWindowLayout", "writeChatHistory", "writeChatWindowLayout",
      "clearChatHistory", "readChatVoiceEnabled", "writeChatVoiceEnabled",
    ]),
  },
  agenda: callablePorts([
    "findLastAvailableSlot", "parseDate", "readCalendar", "weekKey", "writeCalendar",
    "normalizeActivityRouteText",
  ]),
  state: { get() {}, set() {}, update() {}, subscribe() {} },
  projectContext: { metrics: {}, activities: [], executionModel: {} },
  assistant: {
    ...callablePorts(["infer"]),
  },
  recordPersistence: callablePorts(["persistVisualAttachment", "createRecord"]),
  commands: callablePorts(["applyLotStatusCommand", "parseLotStatusCommand"]),
  events: callablePorts(["createServiceEventAdministrators"]),
  map: {
    commonAreaLabel: "Área comum",
  },
  records: callablePorts([
    "listLotDevelopmentProfiles", "readStageRecordAttachments", "normalizeStageRecord",
    "saveLotDevelopmentProfile",
  ]),
  ui: callablePorts(["esc", "ico", "notify"]),
});
const browserPort = (HTMLElement = class HTMLElement {}) => ({
  eventTarget: { addEventListener() {}, removeEventListener() {} },
  HTMLElement,
  FileReader: class FileReader {},
  document: { createElement() {} },
  lucide: { createIcons() {} },
  createIcons() {},
  print: null,
  speechSynthesis: null,
  SpeechSynthesisUtterance: null,
  setTimeout() {},
  clearTimeout() {},
  requestAnimationFrame() {},
});

test("AI chat DI container resolves provider dependencies once and reports missing bindings and cycles", () => {
  const calls = [];
  const container = createAiChatServiceContainerV1({
    providers: {
      config: aiChatFactoryProviderV1({ factory: () => { calls.push("config"); return { mode: "operational" }; } }),
      assistant: aiChatFactoryProviderV1({ inject: ["config"], factory: (config) => {
        calls.push("assistant");
        return { mode: config.mode };
      } }),
    },
  });

  assert.deepEqual(container.resolve("assistant"), { mode: "operational" });
  assert.equal(container.resolve("config").mode, "operational");
  assert.deepEqual(calls, ["config", "assistant"]);
  assert.throws(() => container.resolve("missing"), /no provider registered for missing/);
  const cyclic = createAiChatServiceContainerV1({
    providers: {
      first: aiChatFactoryProviderV1({ inject: ["second"], factory: (second) => second }),
      second: aiChatFactoryProviderV1({ inject: ["first"], factory: (first) => first }),
    },
  });
  assert.throws(() => cyclic.resolve("first"), /dependency cycle detected: first -> second -> first/);
  const empty = createAiChatServiceContainerV1({ providers: { empty: aiChatFactoryProviderV1({ factory: () => null }) } });
  assert.throws(() => empty.resolve("empty"), /provider empty returned no service/);

  const declared = createAiChatServiceContainerV1({
    providers: {
      store: aiChatValueProviderV1({ get: () => "persistent-state" }),
      repository: aiChatFactoryProviderV1({
        inject: ["store"],
        factory: (store) => ({ read: () => store.get() }),
      }),
    },
  });
  assert.equal(declared.resolve("repository").read(), "persistent-state");
  assert.equal(declared.resolve("store"), declared.resolve("store"));
  const functionValue = () => "callable service";
  assert.equal(createAiChatServiceContainerV1({ providers: { callable: aiChatValueProviderV1(functionValue) } }).resolve("callable"), functionValue);
  const optional = createAiChatServiceContainerV1({ providers: { absent: aiChatValueProviderV1(undefined) } });
  assert.equal(optional.resolve("absent"), undefined);
  assert.equal(optional.resolve("absent"), undefined);
  const mutableBindings = { configured: aiChatValueProviderV1({ version: 1 }) };
  const immutableContainer = createAiChatServiceContainerV1({ providers: mutableBindings });
  mutableBindings.configured = aiChatValueProviderV1({ version: 2 });
  assert.deepEqual(immutableContainer.resolve("configured"), { version: 1 });
  assert.throws(() => createAiChatServiceContainerV1({
    providers: { invalid: { inject: "store", factory: () => ({}) } },
  }), /must be an explicit value or factory provider/);
  assert.throws(() => aiChatFactoryProviderV1({ inject: [], factory: true }), /require factory\(\)/);
  assert.throws(() => createAiChatServiceContainerV1({
    providers: { invalid: aiChatFactoryProviderV1({ inject: ["missing"], factory: () => ({}) }) },
  }), /depends on unregistered services: missing/);
});

test("Belavista AI chat application provider catalog declares narrow service graphs", () => {
  const services = {
    apiFetch() {},
    operationalAssistant: { infer() {} },
    operationalHeaders() {},
    appStore: { get() {}, set() {}, update() {}, subscribe() {} },
    commands: { applyLotStatusCommand() {}, parseLotStatusCommand() {} },
    workspace: { renderBrokerBoard() {} },
  };
  const providers = createBelavistaAiChatProvidersV1(services);

  assert.deepEqual(BELAVISTA_AI_CHAT_PORTS_V1, [
    "chat", "storage", "agenda", "state", "projectContext", "assistant",
    "recordPersistence", "commands", "events", "map", "records", "ui",
  ]);
  assert.deepEqual(providers.assistant.inject, ["service:apiFetch", "service:operationalAssistant"]);
  assert.deepEqual(providers.recordPersistence.inject, ["service:apiFetch", "service:operationalHeaders"]);
  assert.deepEqual(providers.commands.inject, ["service:appStore", "service:commands", "service:workspace"]);
  assert.equal(providers["service:apiFetch"].value, services.apiFetch);
  assert.equal(providers["service:appStore"].value, services.appStore);
  assert.equal(typeof providers.assistant.factory, "function");
});

test("AI chat browser adapter binds browser capabilities to the composition host", () => {
  const calls = [];
  const host = {
    HTMLElement: class HTMLElement {},
    FileReader: class FileReader {},
    document: { querySelector: () => "document" },
    localStorage: { getItem: () => "must-not-leak" },
    window: {
      lucide: { createIcons: () => calls.push("icons") },
      print: () => calls.push("print"),
      speechSynthesis: { cancel: () => calls.push("cancel"), speak: () => calls.push("speak") },
      SpeechSynthesisUtterance: class SpeechSynthesisUtterance {},
    },
    setTimeout(callback, delay) { calls.push(["set", delay]); return 7; },
    clearTimeout(id) { calls.push(["clear", id]); },
    requestAnimationFrame(callback) { calls.push("frame"); callback(); },
  };
  const browser = createAiChatBrowserAdapter(host);

  assert.equal(browser.eventTarget, host);
  assert.equal(browser.document, host.document);
  assert.equal(browser.HTMLElement, host.HTMLElement);
  assert.equal(browser.FileReader, host.FileReader);
  assert.equal(typeof browser.createIcons, "function");
  browser.createIcons();
  assert.equal(typeof browser.print, "function");
  browser.print();
  assert.equal(browser.speechSynthesis, host.window.speechSynthesis);
  assert.equal(browser.SpeechSynthesisUtterance, host.window.SpeechSynthesisUtterance);
  assert.equal("global" in browser, false);
  assert.equal("window" in browser, false);
  assert.equal("storage" in browser, false);
  assert.equal(browser.setTimeout(() => {}, 12), 7);
  browser.clearTimeout(7);
  browser.requestAnimationFrame(() => calls.push("callback"));
  assert.deepEqual(calls, ["icons", "print", ["set", 12], ["clear", 7], "frame", "callback"]);
  assert.throws(
    () => createAiChatBrowserAdapter({ ...host, window: {} }),
    /requires lucide\.createIcons\(\)/,
  );
});

test("AI chat state and project context are separate, narrow injected dependencies", () => {
  const calls = [];
  const store = {
    get() { calls.push("get"); return { view: "map" }; },
    set(patch) { calls.push(["set", patch]); },
    update(updater) { calls.push(["update", updater({ count: 1 })]); },
    subscribe(listener) { calls.push(["subscribe", listener]); return () => calls.push("unsubscribe"); },
  };
  const state = createAiChatStatePortV1({ appStore: store });
  const metrics = { completeness: 63 }, activities = [{ id: "stage-1" }], executionModel = {};
  const projectContext = createAiChatProjectContextPortV1({ demoData: { metrics, activities }, executionModel });
  const listener = () => {};
  const unsubscribe = state.subscribe(listener);
  unsubscribe();

  assert.deepEqual(state.get(), { view: "map" });
  state.set({ view: "stages" });
  state.update((current) => ({ count: current.count + 1 }));
  assert.equal(projectContext.metrics, metrics);
  assert.equal(projectContext.activities, activities);
  assert.equal(projectContext.executionModel, executionModel);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(projectContext), true);
  assert.deepEqual(calls, [
    ["subscribe", listener], "unsubscribe", "get", ["set", { view: "stages" }], ["update", { count: 2 }],
  ]);
  assert.throws(() => createAiChatStatePortV1({}), /appStore\.get/);
  assert.throws(() => createAiChatProjectContextPortV1({}), /requires metrics and activities/);
});

test("AI chat consumes injected browser ports instead of ambient browser globals", async () => {
  const source = await readFile(new URL("../../components/chat/ai-chat.mjs", import.meta.url), "utf8");
  assert.match(source, /export const createAiChat = \(\{ browser, ports \}\)/);
  assert.match(source, /createAiChatDependenciesV1\(\{ browser, ports \}\)/);
  assert.match(source, /class AiChat extends browser\.HTMLElement/);
  assert.match(source, /infer: inferAssistantRequestV1/);
  assert.match(source, /await inferAssistantRequestV1\(\{/);
  assert.match(source, /assistant: \{ infer: inferAssistantRequestV1 \}/);
  assert.match(source, /recordPersistence: \{ persistVisualAttachment, createRecord \}/);
  assert.doesNotMatch(source, /\bapiFetch\s*\(|\boperationalHeaders\s*\(/);
  assert.match(source, /commands: \{ applyLotStatusCommand, parseLotStatusCommand \}/);
  assert.doesNotMatch(source, /operationalAssistant\?\.infer/);
  assert.doesNotMatch(source, /\b(?:globalThis|localStorage)\s*\.|\bbrowserWindow\.|\bbrowserGlobal\.|\bdocument\.querySelector|new FileReader\(|\b(?:requestAnimationFrame|setTimeout|clearTimeout)\s*\(/);
  const composition = await readFile(new URL("../../components/chat/belavista-ai-chat-composition-v1.mjs", import.meta.url), "utf8");
  const element = await readFile(new URL("../../components/chat/ai-chat-element-v1.mjs", import.meta.url), "utf8");
  const appProviders = await readFile(new URL("../../components/chat/belavista-ai-chat-providers-v1.mjs", import.meta.url), "utf8");
  const applicationRoot = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  const chatRegistration = await readFile(new URL("../../components/chat/admin-ai-chat-registration-v1.mjs", import.meta.url), "utf8");
  assert.match(applicationRoot, /registerBelavistaAdminAiChatV1\(\{\s*host: globalThis,[\s\S]*?agendaCalendar:/);
  assert.match(applicationRoot, /import \{ registerBelavistaAdminAiChatV1 \} from "\.\/components\/chat\/admin-ai-chat-registration-v1\.mjs/);
  assert.match(element, /createBelavistaAiChatV1\(\{ host, services \}\)/);
  assert.match(element, /customElementsRef\.define\("ai-chat", AiChat\)/);
  assert.match(element, /__BELAVISTA_ALLOCATE_VISUAL_RECORD_V1/);
  for (const group of ["policies", "agenda", "commands", "records"])
    assert.match(chatRegistration, new RegExp(`^    ${group}: \\{`, "m"));
  assert.match(chatRegistration, /^    ui,/m);
  assert.match(chatRegistration, /import \{ createServiceEventAdministrators \} from "\.\.\/events\/service-event-admin/);
  assert.match(chatRegistration, /^    eventAdministrators: createServiceEventAdministrators,/m);
  assert.match(chatRegistration, /storage: host\.localStorage/);
  assert.match(chatRegistration, /apiFetch,/);
  assert.match(chatRegistration, /appStore,/);
  assert.match(composition, /createBelavistaAiChatDependenciesV1 = \(\{ host, services = \{\}, overrides = \{\}, providers = \{\} \}/);
  assert.match(composition, /createAiChatDependenciesV1\(\{\s*browser: createAiChatBrowserAdapter\(host\),\s*ports,/);
  assert.match(composition, /createAiChat\(createBelavistaAiChatDependenciesV1\(options\)\)/);
  assert.match(composition, /createBelavistaAiChatProvidersV1\(services\)/);
  assert.match(appProviders, /storage:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:storage"\],\s*factory:/);
  assert.match(appProviders, /state:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:appStore"\],\s*factory:/);
  assert.match(appProviders, /projectContext:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:demoData", "service:executionModel"\],\s*factory:/);
  assert.match(appProviders, /agenda:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:agenda"\],\s*factory:/);
  assert.match(appProviders, /assistant:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:apiFetch", "service:operationalAssistant"\],\s*factory:/);
  assert.match(appProviders, /recordPersistence:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:apiFetch", "service:operationalHeaders"\],\s*factory:/);
  assert.match(appProviders, /commands:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:appStore", "service:commands", "service:workspace"\],\s*factory:/);
  assert.match(appProviders, /renderBrokerBoard: workspace\.renderBrokerBoard/);
  assert.doesNotMatch(composition, /browserHost\.document\.querySelector/);
  assert.match(appProviders, /events:\s*aiChatFactoryProviderV1\(\{\s*inject: \["service:eventAdministrators"\],\s*factory:/);
  assert.doesNotMatch(composition, /from "\.\.\/events\/service-event-admin/);
  assert.match(source, /applyLotStatusCommand\(lotCommand\)/);
  assert.doesNotMatch(source, /applyLotStatusCommand\(appStore,/);
  assert.match(chatRegistration, /listLotDevelopmentProfiles: host\.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1/);
  assert.match(chatRegistration, /saveLotDevelopmentProfile: host\.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1/);
});

test("AI chat validates complete service ports before class creation", () => {
  const ports = serviceGroups();
  assert.equal(assertAiChatDependenciesV1({ browser: browserPort(), ports }), ports);

  delete ports.agenda.writeCalendar;
  assert.throws(
    () => assertAiChatDependenciesV1({ browser: browserPort(), ports }),
    /requires agenda\.writeCalendar\(\)/,
  );
});

test("AI chat validates configuration and administrative services as explicit ports", () => {
  const browser = browserPort();
  const cases = [
    [{ ...serviceGroups(), events: {} }, /events\.createServiceEventAdministrators\(\)/],
    [{ ...serviceGroups(), map: {} }, /map\.commonAreaLabel/],
    [{ ...serviceGroups(), assistant: { ...serviceGroups().assistant, apiFetch() {} } }, /unknown members in assistant: apiFetch/],
    [{ ...serviceGroups(), chat: { ...serviceGroups().chat, CHAT_IMAGE_MAX_BYTES_V1: 0 } }, /positive chat\.CHAT_IMAGE_MAX_BYTES_V1/],
    [{ ...serviceGroups(), chat: { ...serviceGroups().chat, CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: " " } }, /non-empty chat\.CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1/],
    [{ ...serviceGroups(), telemetry: {} }, /unknown service port: telemetry/],
  ];
  for (const [ports, error] of cases)
    assert.throws(() => createAiChatDependenciesV1({ browser, ports }), error);
});

test("AI chat dependency container freezes named ports at composition time", () => {
  const browser = browserPort();
  const ports = serviceGroups();
  const dependencies = createAiChatDependenciesV1({ browser, ports });

  assert.equal(Object.isFrozen(dependencies), true);
  assert.equal(Object.isFrozen(dependencies.ports), true);
  assert.equal(Object.isFrozen(dependencies.ports.assistant), true);
  assert.equal(Object.isFrozen(dependencies.ports.recordPersistence), true);
  assert.equal(Object.isFrozen(dependencies.ports.commands), true);
  assert.deepEqual(Object.keys(dependencies.ports.assistant), ["infer"]);
  assert.deepEqual(Object.keys(dependencies.ports.recordPersistence), ["persistVisualAttachment", "createRecord"]);
  assert.deepEqual(Object.keys(dependencies.ports.commands), ["applyLotStatusCommand", "parseLotStatusCommand"]);
  assert.equal("prepareAssistantLotStatusPromptV1" in dependencies.ports.assistant, false);
  assert.equal("roadPlanarAngleV1" in dependencies.ports.map, false);
  assert.notEqual(dependencies.ports.state, ports.state);
  assert.notEqual(dependencies.ports.projectContext, ports.projectContext);
  assert.equal(dependencies.ports.projectContext.metrics, ports.projectContext.metrics);
  assert.equal(Object.isFrozen(dependencies.browser), true);
  assert.throws(() => createAiChatDependenciesV1({ browser, ports: { ...ports, recordPersistence: null } }), /requires the recordPersistence port/);
});

test("Belavista composition allows replacing a service port without changing application adapters", () => {
  const host = {
    ...browserPort(),
    addEventListener() {},
    removeEventListener() {},
    setTimeout(callback) { return 1; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); },
  };
  const noop = () => {};
  const commandCalls = [];
  const services = {
    policies: {
      CHAT_IMAGE_MAX_BYTES_V1: 6_000_000,
      CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1: "instruction",
      CHAT_VISUAL_ALLOCATION_POLICY_V1: "policy",
    },
    storage: { getItem: () => null, setItem: noop, removeItem: noop },
    apiFetch: async () => ({ ok: true, json: async () => ({}) }),
    operationalHeaders: (headers) => headers,
    appStore: {
      get: () => ({}), set: noop, update: noop, subscribe: () => noop,
    },
    demoData: { metrics: {}, activities: [] },
    executionModel: {},
    agenda: callablePorts([
      "findLastAvailableSlot", "parseDate", "readCalendar", "weekKey",
      "writeCalendar", "normalizeActivityRouteText",
    ]),
    commands: {
      applyLotStatusCommand: (...args) => commandCalls.push(args),
      parseLotStatusCommand: (message) => message,
    },
    eventAdministrators: noop,
    commonAreaLabel: "Área comum",
    records: callablePorts([
      "listLotDevelopmentProfiles", "readStageRecordAttachments",
      "normalizeStageRecord", "saveLotDevelopmentProfile",
    ]),
    ui: callablePorts(["esc", "ico", "notify"]),
    workspace: { renderBrokerBoard: noop },
  };
  const infer = async () => ({ text: "injected" });
  const dependencies = createBelavistaAiChatDependenciesV1({
    host,
    services,
    overrides: { assistant: { infer } },
  });

  assert.equal(dependencies.ports.assistant.infer, infer);
  assert.equal(Object.isFrozen(dependencies.ports.assistant), true);
  assert.deepEqual(dependencies.ports.state.get(), {});
  assert.equal(dependencies.ports.agenda.parseDate, services.agenda.parseDate);
  assert.equal(dependencies.ports.events.createServiceEventAdministrators, noop);
  dependencies.ports.commands.applyLotStatusCommand({ lotKey: "LOT-1" });
  assert.equal(commandCalls[0][2].renderBrokerBoard, noop);
  assert.throws(() => createBelavistaAiChatDependenciesV1({
    host,
    services,
    overrides: { telemetry: { send: noop } },
  }), /unknown service port: telemetry/);
});

test("Belavista composition accepts complete injected ports without constructing application adapters", () => {
  const host = {
    ...browserPort(),
    addEventListener() {},
    removeEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); },
  };
  const injected = serviceGroups();
  const dependencies = createBelavistaAiChatDependenciesV1({ host, overrides: injected });

  assert.deepEqual(Object.keys(dependencies.ports), Object.keys(injected));
  assert.equal(dependencies.ports.assistant.infer, injected.assistant.infer);
  assert.equal(dependencies.ports.recordPersistence.createRecord, injected.recordPersistence.createRecord);
  assert.equal(dependencies.ports.agenda.parseDate, injected.agenda.parseDate);
  assert.throws(
    () => createBelavistaAiChatDependenciesV1({ host, overrides: { ...serviceGroups(), assistant: {} } }),
    /requires assistant\.infer\(\)/,
  );
  assert.throws(
    () => createBelavistaAiChatDependenciesV1({ host, overrides: { telemetry: {} } }),
    /unknown service port: telemetry/,
  );
});

test("Belavista composition resolves injected service providers ahead of app defaults", () => {
  const host = {
    ...browserPort(),
    addEventListener() {},
    removeEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); },
  };
  const injected = serviceGroups();
  const { assistant: _assistant, ...overrides } = injected;
  const calls = [];
  const dependencies = createBelavistaAiChatDependenciesV1({
    host,
    overrides,
    providers: {
      assistant: aiChatFactoryProviderV1({ inject: ["chat"], factory: (chat) => {
        calls.push("assistant");
        assert.equal(chat.CHAT_IMAGE_MAX_BYTES_V1, injected.chat.CHAT_IMAGE_MAX_BYTES_V1);
        return injected.assistant;
      } }),
    },
  });

  assert.equal(dependencies.ports.assistant.infer, injected.assistant.infer);
  assert.deepEqual(calls, ["assistant"]);
  assert.throws(() => createBelavistaAiChatDependenciesV1({ host, providers: { metrics: () => ({}) } }), /unknown service provider: metrics/);
});

test("AI chat factory accepts isolated service groups and extends the injected HTMLElement", () => {
  class InjectedHTMLElement {}
  const ChatElement = createAiChat({
    browser: browserPort(InjectedHTMLElement),
    ports: serviceGroups(),
  });

  assert.equal(Object.getPrototypeOf(ChatElement.prototype), InjectedHTMLElement.prototype);
  assert.throws(
    () => createAiChat({ browser: {}, ports: {} }),
    /requires the chat port/,
  );
});

test("AI chat inference port selects the injected System Model and forwards its result", async () => {
  const calls = [];
  const infer = createAiChatInferencePortV1({
    apiFetch: async (...args) => { calls.push(["http", ...args]); },
    operationalAssistant: { infer: async (...args) => { calls.push(["model", ...args]); return { text: "ok" }; } },
  });
  const result = await infer({
    modelRequest: { endpoint: "/api/inference", body: { message: "status" } },
    httpRequest: { endpoint: "/api/ai", init: { method: "POST" } },
  });

  assert.deepEqual(result, { text: "ok" });
  assert.deepEqual(calls, [["model", { endpoint: "/api/inference", body: { message: "status" } }]]);
});

test("AI chat command port binds the workspace store behind the use-case boundary", () => {
  const calls = [];
  const appStore = { get() { return { lotStatuses: {} }; }, set(value) { calls.push(value); } };
  const parsed = { lotKey: "QA-1", status: "Reservado" };
  const renderBrokerBoard = () => calls.push("render");
  const port = createAiChatCommandPortV1({
    appStore,
    renderBrokerBoard,
    parseLotStatusCommand: (message) => `parsed:${message}`,
    applyLotStatusCommand: (store, command, context) => {
      calls.push([store, command, context]);
      return "applied";
    },
  });

  assert.equal(port.parseLotStatusCommand("reserve QA-1"), "parsed:reserve QA-1");
  assert.equal(port.applyLotStatusCommand(parsed), "applied");
  assert.equal(calls[0][0], appStore);
  assert.equal(calls[0][1], parsed);
  assert.equal(calls[0][2].renderBrokerBoard, renderBrokerBoard);
  assert.equal(Object.isFrozen(port), true);
  assert.throws(() => createAiChatCommandPortV1(), /requires appStore.get/);
  assert.throws(() => createAiChatCommandPortV1({ appStore }), /requires applyLotStatusCommand/);
});

test("AI chat inference port uses the original HTTP route only when no System Model is configured", async () => {
  const calls = [];
  const infer = createAiChatInferencePortV1({
    apiFetch: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ text: "http response" }) };
    },
  });
  const request = { endpoint: "/api/ai/vision-reasoning", init: { method: "POST" } };
  assert.deepEqual(await infer({
    modelRequest: { endpoint: "/api/inference", body: { message: "image" } },
    httpRequest: request,
  }), { text: "http response" });
  assert.deepEqual(calls, [[request.endpoint, request.init]]);
});

test("AI chat inference port surfaces backend failures without inventing local answers", async () => {
  const infer = createAiChatInferencePortV1({
    apiFetch: async () => ({ ok: false, status: 503, json: async () => ({ error: "offline" }) }),
  });
  await assert.rejects(infer({
    modelRequest: { endpoint: "/api/inference", body: {} },
    httpRequest: { endpoint: "/api/ai", init: {} },
  }), /offline/);
});

test("AI chat record persistence adapter owns API routes and preserves attachment/record semantics", async () => {
  const calls = [];
  const responses = [
    { ok: true, json: async () => ({ attachment: { fileUrl: "/evidence/1" } }) },
    { ok: false, status: 503 },
  ];
  const service = createAiChatRecordPersistenceV1({
    apiFetch: async (...args) => { calls.push(args); return responses.shift(); },
    operationalHeaders: (headers) => ({ ...headers, "X-Session": "active" }),
  });
  assert.deepEqual(await service.persistVisualAttachment({
    stageKey: "water & sewer",
    activityKey: "OCR/photo 1",
    target: "material-proof",
    title: "OCR · nota.jpg",
    notes: "revisão humana",
    fileName: "nota.jpg",
    dataUrl: "data:image/jpeg;base64,AA==",
  }), { fileUrl: "/evidence/1" });
  await assert.rejects(service.createRecord({ id: "REG-1" }), /HTTP 503/);
  assert.equal(calls[0][0], "/api/workbench/attachments?stage=water%20%26%20sewer&activity=OCR%2Fphoto%201");
  assert.equal(JSON.parse(calls[0][1].body).dataUrl, "data:image/jpeg;base64,AA==");
  assert.equal(calls[0][1].headers["X-Session"], "active");
  assert.equal(calls[1][0], "/api/records");
  assert.throws(() => createAiChatRecordPersistenceV1(), /requires apiFetch/);
});

test("AI chat injects validated domain-specific agenda, records, and map ports", () => {
  const identity = (value) => value;
  const agenda = createAiChatAgendaPortV1({
    findLastAvailableSlot: identity,
    parseDate: identity,
    readCalendar: identity,
    weekKey: identity,
    writeCalendar: identity,
    normalizeActivityRouteText: identity,
  });
  const records = createAiChatRecordsPortV1({
    listLotDevelopmentProfiles: identity,
    readStageRecordAttachments: identity,
    normalizeStageRecord: identity,
    saveLotDevelopmentProfile: identity,
  });
  assert.equal(agenda.parseDate, identity);
  assert.equal(records.saveLotDevelopmentProfile, identity);
  assert.ok(Object.isFrozen(agenda) && Object.isFrozen(records));
  assert.throws(() => createAiChatAgendaPortV1({}), /requires findLastAvailableSlot/);
  assert.throws(() => createAiChatRecordsPortV1({}), /requires listLotDevelopmentProfiles/);
});

test("AI chat storage port injects persistence and preserves existing keys and history limits", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const port = createAiChatStoragePortV1({ storage });
  assert.equal(port.CHAT_HISTORY_STORAGE_KEY, "belavista.ai-chat.history.v1");
  assert.equal(port.CHAT_VOICE_STORAGE_KEY_V1, "belavista.ai-chat.voice-enabled.v1");
  port.writeChatHistory(Array.from({ length: 60 }, (_, index) => ({ text: String(index) })));
  assert.equal(port.readChatHistory().length, 48);
  assert.equal(port.readChatHistory()[0].text, "12");
  port.writeChatWindowLayout({ left: 20, top: 30 });
  assert.deepEqual(port.readChatWindowLayout(), { left: 20, top: 30 });
  port.writeChatVoiceEnabled(true);
  assert.equal(port.readChatVoiceEnabled(), true);
  port.clearChatHistory();
  assert.deepEqual(port.readChatHistory(), []);
  assert.throws(() => createAiChatStoragePortV1(), /storage\.getItem/);
});
