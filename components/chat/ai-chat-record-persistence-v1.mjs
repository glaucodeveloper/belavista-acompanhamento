/** HTTP adapter for AI Chat's record/evidence persistence use cases. */
export const createAiChatRecordPersistenceV1 = ({ apiFetch, operationalHeaders } = {}) => {
  if (typeof apiFetch !== "function")
    throw new TypeError("AI chat record persistence requires apiFetch().");
  if (typeof operationalHeaders !== "function")
    throw new TypeError("AI chat record persistence requires operationalHeaders().");

  return Object.freeze({
    async persistVisualAttachment({ stageKey, activityKey, target, title, notes, fileName, dataUrl } = {}) {
      const query = `stage=${encodeURIComponent(String(stageKey || ""))}&activity=${encodeURIComponent(String(activityKey || "ocr"))}`;
      const response = await apiFetch(`/api/workbench/attachments?${query}`, {
        method: "POST",
        headers: operationalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ kind: target, title, notes, fileName, dataUrl }),
      });
      if (!response.ok) return null;
      return (await response.json()).attachment || null;
    },

    async createRecord(record) {
      const response = await apiFetch("/api/records", {
        method: "POST",
        headers: operationalHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });
};
