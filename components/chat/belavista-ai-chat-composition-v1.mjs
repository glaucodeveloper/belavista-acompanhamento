import { createAiChat } from "./ai-chat.mjs?v=mobile-focus-v1";
import { createAiChatBrowserAdapter } from "./ai-chat-browser-adapter.mjs?v=chat-browser-adapter-v4";
import { createAiChatDependenciesV1 } from "./ai-chat-dependencies-v1.mjs?v=ai-chat-dependencies-v6";
import {
  aiChatValueProviderV1,
  createAiChatServiceContainerV1,
} from "./ai-chat-service-container-v1.mjs?v=ai-chat-service-container-v4";

import {
  BELAVISTA_AI_CHAT_PORTS_V1,
  createBelavistaAiChatProvidersV1,
} from "./belavista-ai-chat-providers-v1.mjs?v=belavista-ai-chat-providers-v1";

/**
 * Compose application adapters only for ports that were not injected. A supplied
 * port is a complete replacement; its concrete application service is therefore
 * not required or even constructed. This keeps the widget independent and makes
 * alternate hosts/tests able to provide only the capabilities they own.
 */
export const createBelavistaAiChatDependenciesV1 = ({ host, services = {}, overrides = {}, providers = {} } = {}) => {
  if (!host)
    throw new TypeError("Belavista AI chat composition requires a browser host.");
  if (!services || typeof services !== "object" || Array.isArray(services))
    throw new TypeError("Belavista AI chat application services must be a named object.");
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides))
    throw new TypeError("AI chat port overrides must be a named object.");
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    throw new TypeError("AI chat service providers must be a named object.");

  const knownGroups = new Set(BELAVISTA_AI_CHAT_PORTS_V1);
  const unknownGroups = Object.keys(overrides).filter((group) => !knownGroups.has(group));
  if (unknownGroups.length)
    throw new TypeError(`AI chat received unknown service port: ${unknownGroups.join(", ")}.`);
  const unknownProviders = Object.keys(providers).filter((group) => !knownGroups.has(group));
  if (unknownProviders.length)
    throw new TypeError(`AI chat received unknown service provider: ${unknownProviders.join(", ")}.`);

  const applicationProviders = createBelavistaAiChatProvidersV1(services);
  const container = createAiChatServiceContainerV1({
    providers: {
      host: aiChatValueProviderV1(host),
      ...applicationProviders,
      ...Object.fromEntries([...knownGroups].map((group) => [
        group,
        Object.hasOwn(providers, group)
          ? providers[group]
          : Object.hasOwn(overrides, group)
            ? aiChatValueProviderV1(overrides[group])
            : applicationProviders[group],
      ])),
    },
  });
  const ports = Object.fromEntries([...knownGroups].map((group) => [group, container.resolve(group)]));

  return createAiChatDependenciesV1({
    browser: createAiChatBrowserAdapter(host),
    ports,
  });
};

/** Compose concrete app services once; the widget receives only validated ports. */
export const createBelavistaAiChatV1 = (options = {}) =>
  createAiChat(createBelavistaAiChatDependenciesV1(options));
