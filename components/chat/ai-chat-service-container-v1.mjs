/** Explicit singleton provider descriptors for AI Chat's composition root. */
export const aiChatValueProviderV1 = (value) => Object.freeze({
  kind: "value",
  value,
});

export const aiChatFactoryProviderV1 = ({ inject = [], factory } = {}) => {
  if (!Array.isArray(inject) || inject.some((dependency) => typeof dependency !== "string" || !dependency))
    throw new TypeError("AI chat factory providers require a named inject array.");
  if (typeof factory !== "function")
    throw new TypeError("AI chat factory providers require factory().");
  if (new Set(inject).size !== inject.length)
    throw new TypeError("AI chat factory providers cannot inject the same dependency more than once.");
  return Object.freeze({ kind: "factory", inject: Object.freeze([...inject]), factory });
};

/** Small synchronous singleton DI container for AI Chat's composition root. */
export const createAiChatServiceContainerV1 = ({ providers } = {}) => {
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    throw new TypeError("AI chat service providers must be a named object.");

  for (const [name, provider] of Object.entries(providers)) {
    if (!name.trim()) throw new TypeError("AI chat provider names cannot be empty.");
    if (!provider || typeof provider !== "object" || Array.isArray(provider))
      throw new TypeError(`AI chat provider ${name} must be an explicit value or factory provider.`);
    if (provider.kind === "value") {
      if (Object.keys(provider).some((key) => !["kind", "value"].includes(key)))
        throw new TypeError(`AI chat value provider ${name} has unknown fields.`);
      continue;
    }
    if (provider.kind !== "factory" || Object.keys(provider).some((key) => !["kind", "inject", "factory"].includes(key)))
      throw new TypeError(`AI chat provider ${name} must be an explicit value or factory provider.`);
    if (!Array.isArray(provider.inject) || provider.inject.some((dependency) => typeof dependency !== "string" || !dependency))
      throw new TypeError(`AI chat provider ${name} requires a named inject array.`);
    if (new Set(provider.inject).size !== provider.inject.length)
      throw new TypeError(`AI chat provider ${name} cannot inject the same dependency more than once.`);
    if (typeof provider.factory !== "function")
      throw new TypeError(`AI chat provider ${name} requires factory().`);
    const missing = provider.inject.filter((dependency) => !Object.hasOwn(providers, dependency));
    if (missing.length)
      throw new TypeError(`AI chat provider ${name} depends on unregistered services: ${missing.join(", ")}.`);
  }

  const registry = Object.freeze(Object.fromEntries(Object.entries(providers).map(([name, provider]) => [
    name,
    provider.kind === "value"
      ? Object.freeze({ kind: "value", value: provider.value })
      : Object.freeze({ kind: "factory", inject: Object.freeze([...provider.inject]), factory: provider.factory }),
  ])));
  const cache = new Map();
  const resolving = [];

  const resolve = (name) => {
    if (!Object.hasOwn(registry, name))
      throw new TypeError(`AI chat has no provider registered for ${name}.`);
    if (cache.has(name)) return cache.get(name);
    const cycleStart = resolving.indexOf(name);
    if (cycleStart >= 0)
      throw new TypeError(`AI chat service dependency cycle detected: ${[...resolving.slice(cycleStart), name].join(" -> ")}.`);

    resolving.push(name);
    try {
      const provider = registry[name];
      const value = provider.kind === "value"
        ? provider.value
        : provider.factory(...provider.inject.map(resolve));
      if (provider.kind === "factory" && value == null)
        throw new TypeError(`AI chat service provider ${name} returned no service.`);
      cache.set(name, value);
      return value;
    } finally {
      resolving.pop();
    }
  };

  return Object.freeze({ resolve });
};
