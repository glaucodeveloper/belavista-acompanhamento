/** Translate record-domain functions into AI Chat's stable records port. */
export const createAiChatRecordsPortV1 = ({
  listLotDevelopmentProfiles,
  readStageRecordAttachments,
  normalizeStageRecord,
  saveLotDevelopmentProfile,
} = {}) => {
  const dependencies = {
    listLotDevelopmentProfiles,
    readStageRecordAttachments,
    normalizeStageRecord,
    saveLotDevelopmentProfile,
  };
  for (const [name, implementation] of Object.entries(dependencies))
    if (typeof implementation !== "function")
      throw new TypeError(`AI chat records port requires ${name}().`);

  return Object.freeze({
    listLotDevelopmentProfiles,
    readStageRecordAttachments,
    normalizeStageRecord,
    saveLotDevelopmentProfile,
  });
};
