// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedChatV1;
try {
  const [components, program] = await Promise.all([
    import("../../dist/frontend/components.js"),
    import("../../dist/frontend/program.js"),
  ]);
  if (typeof components.createAtlasAiChatV1 !== "function" ||
      typeof program.createAtlasAiChatDependenciesV1 !== "function")
    throw new TypeError("Typed AI chat owner is unavailable.");
  typedChatV1 = { components, program };
} catch {
  typedChatV1 = null;
}
const recoveryChatV1 = await import("./ai-chat-legacy-v1.mjs");

export const assertAiChatDependenciesV1 = ({ browser, ports } = {}) => {
  if (!typedChatV1) return recoveryChatV1.assertAiChatDependenciesV1({ browser, ports });
  try {
    typedChatV1.program.createAtlasAiChatDependenciesV1({ browser, ports });
    return ports;
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Validação TS do chat indisponível; usando recuperação MJS.", error);
    return recoveryChatV1.assertAiChatDependenciesV1({ browser, ports });
  }
};

export const createAiChat = ({ browser, ports } = {}) => {
  if (!typedChatV1) return recoveryChatV1.createAiChat({ browser, ports });
  try {
    const dependencies = typedChatV1.program.createAtlasAiChatDependenciesV1({ browser, ports });
    return typedChatV1.components.createAtlasAiChatV1({
      ...dependencies,
      aiAgendaInstructionV1: typedChatV1.program.aiAgendaInstructionV1,
      normalizeAiAgendaComprehensionV1: typedChatV1.program.normalizeAiAgendaComprehensionV1,
    });
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS do chat indisponível; usando recuperação MJS.", error);
    return recoveryChatV1.createAiChat({ browser, ports });
  }
};
