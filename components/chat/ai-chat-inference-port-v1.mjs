/**
 * Adapts the chat's inference use case to the configured System Model service,
 * retaining the original HTTP endpoint as the explicit transport fallback.
 */
export const createAiChatInferencePortV1 = ({ apiFetch, operationalAssistant } = {}) => {
  if (typeof apiFetch !== "function")
    throw new TypeError("AI chat inference requires apiFetch().");
  if (operationalAssistant != null && typeof operationalAssistant.infer !== "function")
    throw new TypeError("AI chat inference requires operationalAssistant.infer().");

  return async ({ modelRequest, httpRequest } = {}) => {
    if (!modelRequest || typeof modelRequest.endpoint !== "string" || !modelRequest.body)
      throw new TypeError("AI chat inference requires a model request endpoint and body.");
    if (!httpRequest || typeof httpRequest.endpoint !== "string" || !httpRequest.init)
      throw new TypeError("AI chat inference requires an HTTP fallback endpoint and init.");

    if (operationalAssistant) {
      return operationalAssistant.infer({
        endpoint: modelRequest.endpoint,
        body: modelRequest.body,
      });
    }

    const response = await apiFetch(httpRequest.endpoint, httpRequest.init);
    if (!response.ok)
      throw new Error(
        (await response.json().catch(() => ({}))).error || `HTTP ${response.status}`,
      );
    return response.json();
  };
};
