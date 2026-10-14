import { createAiChatInferencePortV1 } from "./ai-chat-inference-port-v1.mjs?v=chat-inference-port-v1";
import { createAiChatCommandPortV1 } from "./ai-chat-command-port-v1.mjs?v=chat-command-port-v1";
import { createAiChatStatePortV1 } from "./ai-chat-state-port-v1.mjs?v=chat-state-port-v1";
import { createAiChatProjectContextPortV1 } from "./ai-chat-project-context-port-v1.mjs?v=chat-project-context-port-v1";
import { createAiChatRecordPersistenceV1 } from "./ai-chat-record-persistence-v1.mjs?v=ai-chat-record-persistence-v1";
import { createAiChatAgendaPortV1 } from "./ai-chat-agenda-port-v1.mjs?v=ai-chat-agenda-port-v1";
import { createAiChatRecordsPortV1 } from "./ai-chat-records-port-v1.mjs?v=ai-chat-records-port-v1";
import { createAiChatStoragePortV1 } from "./storage.mjs?v=chat-storage-port-v1";
import {
  aiChatFactoryProviderV1,
  aiChatValueProviderV1,
} from "./ai-chat-service-container-v1.mjs?v=chat-service-container-v4";

export const BELAVISTA_AI_CHAT_PORTS_V1 = Object.freeze([
  "chat", "storage", "agenda", "state", "projectContext", "assistant",
  "recordPersistence", "commands", "events", "map", "records", "ui",
]);

const boundService = (name) => aiChatFactoryProviderV1({
  inject: [`service:${name}`],
  factory: (service) => service,
});

/** Application adapter graph: each port declares exactly which app services it needs. */
export const createBelavistaAiChatProvidersV1 = (services = {}) => ({
  ...Object.fromEntries(Object.entries(services).map(([name, value]) => [
    `service:${name}`,
    aiChatValueProviderV1(value),
  ])),
  chat: boundService("policies"),
  storage: aiChatFactoryProviderV1({
    inject: ["service:storage"],
    factory: (storage) => createAiChatStoragePortV1({ storage }),
  }),
  agenda: aiChatFactoryProviderV1({
    inject: ["service:agenda"],
    factory: (agenda) => createAiChatAgendaPortV1(agenda),
  }),
  state: aiChatFactoryProviderV1({
    inject: ["service:appStore"],
    factory: (appStore) => createAiChatStatePortV1({ appStore }),
  }),
  projectContext: aiChatFactoryProviderV1({
    inject: ["service:demoData", "service:executionModel"],
    factory: (demoData, executionModel) => createAiChatProjectContextPortV1({ demoData, executionModel }),
  }),
  assistant: aiChatFactoryProviderV1({
    inject: ["service:apiFetch", "service:operationalAssistant"],
    factory: (apiFetch, operationalAssistant) => ({
      infer: createAiChatInferencePortV1({ apiFetch, operationalAssistant }),
    }),
  }),
  recordPersistence: aiChatFactoryProviderV1({
    inject: ["service:apiFetch", "service:operationalHeaders"],
    factory: (apiFetch, operationalHeaders) => createAiChatRecordPersistenceV1({ apiFetch, operationalHeaders }),
  }),
  commands: aiChatFactoryProviderV1({
    inject: ["service:appStore", "service:commands", "service:workspace"],
    factory: (appStore, commands, workspace) => createAiChatCommandPortV1({
      appStore,
      ...commands,
      renderBrokerBoard: workspace.renderBrokerBoard,
    }),
  }),
  events: aiChatFactoryProviderV1({
    inject: ["service:eventAdministrators"],
    factory: (createServiceEventAdministrators) => ({ createServiceEventAdministrators }),
  }),
  map: aiChatFactoryProviderV1({
    inject: ["service:commonAreaLabel"],
    factory: (commonAreaLabel) => ({ commonAreaLabel }),
  }),
  records: aiChatFactoryProviderV1({
    inject: ["service:records"],
    factory: (records) => createAiChatRecordsPortV1(records),
  }),
  ui: boundService("ui"),
});
