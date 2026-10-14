export const chatLayouts = {
  assistant: { left: 28, top: 92 },
  map: { left: 18, top: 76 },
  stages: { left: 18, top: 18 },
  agenda: { left: 18, top: 104 },
  activities: { left: 18, top: 132 },
  progress: { left: 18, top: 160 },
  records: { left: 18, top: 104 },
  inventory: { left: 18, top: 132 },
  leads: { left: 18, top: 160 },
  reports: { left: 18, top: 18 },
  settings: { left: 18, top: 104 },
};

export const CHAT_WINDOW_STORAGE_KEY = "belavista.ai-window.v1";
export const CHAT_VOICE_STORAGE_KEY_V1 = "belavista.ai-chat.voice-enabled.v1";
export const CHAT_HISTORY_STORAGE_KEY = "belavista.ai-chat.history.v1";
export const CHAT_HISTORY_LIMIT = 48;

/**
 * Chat persistence port. The caller supplies storage, so the chat feature does
 * not reach for browser globals and can be composed with another durable store.
 */
export const createAiChatStoragePortV1 = ({
  storage,
  historyKey = CHAT_HISTORY_STORAGE_KEY,
  layoutKey = CHAT_WINDOW_STORAGE_KEY,
  voiceKey = CHAT_VOICE_STORAGE_KEY_V1,
} = {}) => {
  for (const method of ["getItem", "setItem", "removeItem"])
    if (typeof storage?.[method] !== "function")
      throw new TypeError(`AI chat storage requires storage.${method}().`);

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };
  const writeJson = (key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  return Object.freeze({
    CHAT_HISTORY_STORAGE_KEY: historyKey,
    CHAT_VOICE_STORAGE_KEY_V1: voiceKey,
    readChatHistory: () => {
      const value = readJson(historyKey, []);
      return Array.isArray(value)
        ? value.filter((item) => item && typeof item.text === "string").slice(-CHAT_HISTORY_LIMIT)
        : [];
    },
    writeChatHistory: (history) => writeJson(
      historyKey,
      Array.isArray(history) ? history.slice(-CHAT_HISTORY_LIMIT) : [],
    ),
    clearChatHistory: () => {
      try { storage.removeItem(historyKey); } catch {}
    },
    readChatWindowLayout: () => {
      const value = readJson(layoutKey, null);
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    },
    writeChatWindowLayout: (layout) => writeJson(layoutKey, layout),
    readChatVoiceEnabled: () => {
      try { return storage.getItem(voiceKey) === "1"; } catch { return false; }
    },
    writeChatVoiceEnabled: (enabled) => {
      try { storage.setItem(voiceKey, enabled ? "1" : "0"); } catch {}
    },
  });
};
export const readChatWindowLayout = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(CHAT_WINDOW_STORAGE_KEY) || "null",
    );
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
};
export const writeChatWindowLayout = (layout) => {
  try {
    localStorage.setItem(CHAT_WINDOW_STORAGE_KEY, JSON.stringify(layout));
  } catch {}
};

export const readChatHistory = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) || "[]",
    );
    return Array.isArray(value)
      ? value
          .filter((item) => item && typeof item.text === "string")
          .slice(-CHAT_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
};
export const writeChatHistory = (history) => {
  try {
    localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(-CHAT_HISTORY_LIMIT)),
    );
  } catch {}
};
