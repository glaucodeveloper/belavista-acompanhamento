import { createBelavistaAiChatV1 } from "./belavista-ai-chat-composition-v1.mjs?v=mobile-focus-v1";

/** Register the composed assistant as the application's chat custom element. */
export const registerBelavistaAiChatElementV1 = ({
  host,
  services,
  customElementsRef = host?.customElements,
} = {}) => {
  if (!host || !customElementsRef)
    throw new TypeError("Belavista AI chat element requires its browser host and customElements registry.");

  const AiChat = createBelavistaAiChatV1({ host, services });
  if (!customElementsRef.get("ai-chat")) customElementsRef.define("ai-chat", AiChat);
  host.__BELAVISTA_ALLOCATE_VISUAL_RECORD_V1 = async (
    args = {},
    context = {},
    feedback = () => {},
  ) => AiChat.prototype.allocateVisualRecordV1.call({ addToolFeedback: feedback }, args, context);
  return AiChat;
};
