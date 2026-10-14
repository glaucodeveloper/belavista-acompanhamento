/** Translate the application's calendar API into AI Chat's stable agenda port. */
export const createAiChatAgendaPortV1 = ({
  findLastAvailableSlot,
  parseDate,
  readCalendar,
  weekKey,
  writeCalendar,
  normalizeActivityRouteText,
} = {}) => {
  const dependencies = {
    findLastAvailableSlot,
    parseDate,
    readCalendar,
    weekKey,
    writeCalendar,
    normalizeActivityRouteText,
  };
  for (const [name, implementation] of Object.entries(dependencies))
    if (typeof implementation !== "function")
      throw new TypeError(`AI chat agenda port requires ${name}().`);

  return Object.freeze({
    findLastAvailableSlot,
    parseDate,
    readCalendar,
    weekKey,
    writeCalendar,
    normalizeActivityRouteText,
  });
};
