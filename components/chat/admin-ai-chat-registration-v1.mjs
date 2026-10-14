import { CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1, CHAT_VISUAL_ALLOCATION_POLICY_V1 } from "./policies.mjs";
import { registerBelavistaAiChatElementV1 } from "./ai-chat-element-v1.mjs?v=ai-chat-element-v1";
import { MASTERPLAN_COMMON_AREA_LABEL_V1 } from "../map/georeference.mjs?v=admin-map-georeference-v1";
import { createServiceEventAdministrators } from "../events/service-event-admin.mjs?v=service-event-admin-v4";
import { parseLotStatusCommand, applyLotStatusCommand } from "../../lot-status-command.mjs";

/** Register the administrative chat with its domain service ports. */
export const registerBelavistaAdminAiChatV1 = ({
  host = globalThis,
  appStore,
  demoData,
  executionModel,
  apiFetch,
  operationalHeaders,
  agendaCalendar,
  stageRecords,
  ui,
} = {}) => registerBelavistaAiChatElementV1({
  host,
  customElementsRef: host.customElements,
  services: {
    policies: {
      CHAT_IMAGE_MAX_BYTES_V1: 6_000_000,
      CHAT_OPERATIONAL_EXECUTION_INSTRUCTION_V1,
      CHAT_VISUAL_ALLOCATION_POLICY_V1,
    },
    storage: host.localStorage,
    apiFetch,
    operationalHeaders,
    operationalAssistant: host.RubyOperationalAssistant,
    appStore,
    demoData,
    executionModel,
    agenda: {
      findLastAvailableSlot: agendaCalendar.lastAvailableSlot,
      parseDate: agendaCalendar.parseDate,
      readCalendar: agendaCalendar.read,
      weekKey: agendaCalendar.weekKey,
      writeCalendar: agendaCalendar.write,
      normalizeActivityRouteText: agendaCalendar.normalizeActivityRouteText,
    },
    commands: { applyLotStatusCommand, parseLotStatusCommand },
    eventAdministrators: createServiceEventAdministrators,
    commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
    records: {
      listLotDevelopmentProfiles: host.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1,
      readStageRecordAttachments: stageRecords.attachments,
      normalizeStageRecord: stageRecords.normalize,
      saveLotDevelopmentProfile: host.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1,
    },
    ui,
    workspace: {
      renderBrokerBoard: () => host.document.querySelector("view-layer")?.render?.(),
    },
  },
});
