/** Bind lot-status command use cases to the workspace without leaking its store to the chat UI. */
export const createAiChatCommandPortV1 = ({
  appStore,
  applyLotStatusCommand,
  parseLotStatusCommand,
  renderBrokerBoard,
} = {}) => {
  for (const method of ["get", "set"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`AI chat command port requires appStore.${method}().`);
  if (typeof applyLotStatusCommand !== "function")
    throw new TypeError("AI chat command port requires applyLotStatusCommand().");
  if (typeof parseLotStatusCommand !== "function")
    throw new TypeError("AI chat command port requires parseLotStatusCommand().");
  if (typeof renderBrokerBoard !== "function")
    throw new TypeError("AI chat command port requires renderBrokerBoard().");

  return Object.freeze({
    parseLotStatusCommand: (message) => parseLotStatusCommand(message),
    applyLotStatusCommand: (command) => applyLotStatusCommand(appStore, command, { renderBrokerBoard }),
  });
};
