import * as atlasProgram from "../../dist/frontend/program.js";

const MAP_GEOREFERENCE_FALLBACK_FALLBACK = {
  lat: -13.00044486,
  lng: -39.62315439,
  label: "Aliança Park · Amargosa, BA",
  timezone: "America/Bahia",
  timezoneOffset: -3,
};
const localClockHourForGeoFallback = (geo = {}, date = new Date()) => {
  const timezone = geo.timezone || MAP_GEOREFERENCE_FALLBACK.timezone;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((item) => item.type === "hour")?.value),
      minute = Number(parts.find((item) => item.type === "minute")?.value);
    if (Number.isFinite(hour) && Number.isFinite(minute))
      return (((hour + minute / 60) % 24) + 24) % 24;
  } catch {}
  const offset = Number(
      geo.timezoneOffset ?? MAP_GEOREFERENCE_FALLBACK.timezoneOffset,
    ),
    utc =
      date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600;
  return (((utc + offset) % 24) + 24) % 24;
};
const solarDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
};
const solarWindowForGeoFallback = (geo = {}, date = new Date()) => {
  const lat =
    (Math.max(
      -89,
      Math.min(
        89,
        Number(geo.lat ?? geo.center?.lat ?? MAP_GEOREFERENCE_FALLBACK.lat),
      ),
    ) *
      Math.PI) /
    180;
  const lng =
    Number(geo.lng ?? geo.center?.lng ?? MAP_GEOREFERENCE_FALLBACK.lng) ||
    MAP_GEOREFERENCE_FALLBACK.lng;
  const day = solarDayOfYear(date),
    declination =
      ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (day - 81)) / 365);
  const hourAngle = Math.acos(
    Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(declination))),
  );
  const offset = Number(
      geo.timezoneOffset ?? MAP_GEOREFERENCE_FALLBACK.timezoneOffset,
    ),
    meridian = 15 * offset;
  const equationOfTime =
    9.87 * Math.sin(2 * ((2 * Math.PI * (day - 81)) / 365)) -
    7.53 * Math.cos((2 * Math.PI * (day - 81)) / 365) -
    1.5 * Math.sin((2 * Math.PI * (day - 81)) / 365);
  const noon = 12 - (lng - meridian) / 15 - equationOfTime / 60,
    halfDay = (hourAngle * 12) / Math.PI;
  return {
    sunrise: Math.max(4, noon - halfDay),
    solarNoon: noon,
    sunset: Math.min(21, noon + halfDay),
    lat,
    lng,
    label: geo.label || MAP_GEOREFERENCE_FALLBACK.label,
  };
};
const solarHourLabelFallback = (hour) => {
  const totalMinutes = Math.round(Math.max(0, Number(hour) || 0) * 60),
    hours = Math.floor(totalMinutes / 60),
    minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};
const solarStateForHourFallback = (hour, geo = {}) => {
  const window = solarWindowForGeoFallback(geo),
    span = Math.max(0.1, window.sunset - window.sunrise),
    progress = Math.max(0, Math.min(1, (Number(hour) - window.sunrise) / span));
  const elevation = Math.max(0, Math.sin(progress * Math.PI)),
    azimuth = progress * Math.PI * 1.12 - Math.PI * 0.56;
  return {
    ...window,
    hour: Number(hour),
    progress,
    elevation,
    azimuth,
    daylight: elevation > 0.02,
  };
};

export const MAP_GEOREFERENCE_FALLBACK = atlasProgram.MAP_GEOREFERENCE_FALLBACK || MAP_GEOREFERENCE_FALLBACK_FALLBACK;
export const localClockHourForGeo = (...args) => atlasProgram.localClockHourForGeo?.(...args) ?? localClockHourForGeoFallback(...args);
export const solarWindowForGeo = (...args) => atlasProgram.solarWindowForGeo?.(...args) ?? solarWindowForGeoFallback(...args);
export const solarHourLabel = (...args) => atlasProgram.solarHourLabel?.(...args) ?? solarHourLabelFallback(...args);
export const solarStateForHour = (...args) => atlasProgram.solarStateForHour?.(...args) ?? solarStateForHourFallback(...args);
