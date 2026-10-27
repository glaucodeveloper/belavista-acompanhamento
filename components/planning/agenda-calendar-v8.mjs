// Compatibility edge; keep the pre-migration owner as recovery until the route is validated.
let typedAgendaCalendarV8;
try {
  const components = await import("../../dist/frontend/components.js");
  if (typeof components.installAtlasAgendaCalendarPageV8 !== "function")
    throw new TypeError("Typed agenda calendar owner is unavailable.");
  typedAgendaCalendarV8 = components.installAtlasAgendaCalendarPageV8;
} catch {
  typedAgendaCalendarV8 = null;
}
const recoveryAgendaCalendarV8 = await import("./agenda-calendar-v8-legacy-v1.mjs");

export const installAgendaCalendarPageV8 = (...args) => {
  if (!typedAgendaCalendarV8) return recoveryAgendaCalendarV8.installAgendaCalendarPageV8(...args);
  try {
    return typedAgendaCalendarV8(...args);
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Owner TS da agenda indisponível; usando recuperação MJS.", error);
    return recoveryAgendaCalendarV8.installAgendaCalendarPageV8(...args);
  }
};
