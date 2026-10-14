const AI_CHAT_PORT_CONTRACT_V1 = Object.freeze({
  chat: [
    "CHAT_IMAGE_MAX_BYTES_V1", "CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1",
    "CHAT_VISUAL_ALLOCATION_POLICY_V1",
  ],
  storage: [
    "readChatHistory", "readChatWindowLayout", "writeChatHistory",
    "writeChatWindowLayout", "clearChatHistory", "readChatVoiceEnabled",
    "writeChatVoiceEnabled",
  ],
  agenda: [
    "findLastAvailableSlot", "parseDate", "readCalendar", "weekKey",
    "writeCalendar", "normalizeActivityRouteText",
  ],
  state: ["get", "set", "update", "subscribe"],
  projectContext: [],
  assistant: ["infer"],
  recordPersistence: ["persistVisualAttachment", "createRecord"],
  commands: ["applyLotStatusCommand", "parseLotStatusCommand"],
  events: ["createServiceEventAdministrators"],
  map: ["commonAreaLabel"],
  records: [
    "listLotDevelopmentProfiles", "readStageRecordAttachments",
    "normalizeStageRecord", "saveLotDevelopmentProfile",
  ],
  ui: ["esc", "ico", "notify"],
});
const AI_CHAT_PORT_MEMBERS_V1 = Object.freeze({
  ...AI_CHAT_PORT_CONTRACT_V1,
  storage: [...AI_CHAT_PORT_CONTRACT_V1.storage, "CHAT_HISTORY_STORAGE_KEY", "CHAT_VOICE_STORAGE_KEY_V1"],
  projectContext: ["metrics", "activities", "executionModel"],
});

const assertPortContract = (ports) => {
  if (!ports || typeof ports !== "object" || Array.isArray(ports))
    throw new TypeError("AI chat requires a named service-port container.");
  const unexpectedGroups = Object.keys(ports).filter((name) => !(name in AI_CHAT_PORT_CONTRACT_V1));
  if (unexpectedGroups.length)
    throw new TypeError(`AI chat received an unknown service port: ${unexpectedGroups.join(", ")}.`);

  for (const [group, methods] of Object.entries(AI_CHAT_PORT_CONTRACT_V1)) {
    const port = ports?.[group];
    if (!port || typeof port !== "object")
      throw new TypeError(`AI chat requires the ${group} port.`);
    const unexpectedMembers = Object.keys(port).filter((name) => !(AI_CHAT_PORT_MEMBERS_V1[group] || []).includes(name));
    if (unexpectedMembers.length)
      throw new TypeError(`AI chat received unknown members in ${group}: ${unexpectedMembers.join(", ")}.`);
    for (const member of methods) {
      if (group === "chat" && member === "CHAT_IMAGE_MAX_BYTES_V1") {
        if (!Number.isFinite(port[member]) || port[member] <= 0)
          throw new TypeError(`AI chat requires a positive ${group}.${member}.`);
      } else if (group === "chat" || group === "map") {
        if (typeof port[member] !== "string" || !port[member].trim())
          throw new TypeError(`AI chat requires a non-empty ${group}.${member}.`);
      } else if (typeof port[member] !== "function") {
        throw new TypeError(`AI chat requires ${group}.${member}().`);
      }
    }
  }

  const { projectContext } = ports;
  if (!projectContext.metrics || typeof projectContext.metrics !== "object" || !Array.isArray(projectContext.activities))
    throw new TypeError("AI chat requires projectContext metrics and activities.");
  if (!projectContext.executionModel || typeof projectContext.executionModel !== "object")
    throw new TypeError("AI chat requires the projectContext execution model.");
};

const assertBrowserPort = (browser) => {
  if (!browser?.HTMLElement || typeof browser?.FileReader !== "function" ||
      typeof browser?.document?.createElement !== "function" ||
      typeof browser?.eventTarget?.addEventListener !== "function" ||
      typeof browser?.createIcons !== "function" ||
      !["setTimeout", "clearTimeout", "requestAnimationFrame"].every((method) => typeof browser?.[method] === "function"))
    throw new TypeError("AI chat requires a complete browser port at composition time.");
  if (browser.print != null && typeof browser.print !== "function")
    throw new TypeError("AI chat browser print capability must be a function when available.");
  if (browser.speechSynthesis != null && typeof browser.speechSynthesis.speak !== "function")
    throw new TypeError("AI chat speech synthesis capability must implement speak().");
  if (browser.SpeechSynthesisUtterance != null && typeof browser.SpeechSynthesisUtterance !== "function")
    throw new TypeError("AI chat speech utterance capability must be a constructor when available.");
};

/** Validate and freeze AI Chat's explicit ports once, at the application composition root. */
export const createAiChatDependenciesV1 = ({ browser, ports } = {}) => {
  assertPortContract(ports);
  assertBrowserPort(browser);

  const immutablePorts = Object.freeze(Object.fromEntries(
    Object.entries(AI_CHAT_PORT_CONTRACT_V1).map(([name]) => [name, Object.freeze({ ...ports[name] })]),
  ));
  return Object.freeze({ browser: Object.freeze({ ...browser }), ports: immutablePorts });
};

export const assertAiChatDependenciesV1 = ({ browser, ports } = {}) => {
  createAiChatDependenciesV1({ browser, ports });
  return ports;
};

export const AI_CHAT_PORT_CONTRACT_V1_PUBLIC = AI_CHAT_PORT_CONTRACT_V1;
