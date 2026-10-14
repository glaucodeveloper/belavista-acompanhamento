/** Keep chat state access behind the application's state-store boundary. */
export const createAiChatStatePortV1 = ({ appStore } = {}) => {
  for (const method of ["get", "set", "update", "subscribe"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`AI chat state requires appStore.${method}().`);

  return Object.freeze({
    get: () => appStore.get(),
    set: (patch) => appStore.set(patch),
    update: (updater) => appStore.update(updater),
    subscribe: (listener) => appStore.subscribe(listener),
  });
};
