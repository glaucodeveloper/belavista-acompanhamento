import test from "node:test";
import assert from "node:assert/strict";
import {
  MAP_GEOREFERENCE_FALLBACK,
  localClockHourForGeo,
  solarHourLabel,
  solarStateForHour,
  solarWindowForGeo,
} from "../../components/map/solar-lighting.mjs";

test("solar module preserves the application location, local clock and fallback offset", () => {
  const date = new Date("2026-07-10T15:30:00.000Z");
  assert.deepEqual(MAP_GEOREFERENCE_FALLBACK, {
    lat: -13.00044486,
    lng: -39.62315439,
    label: "Aliança Park · Amargosa, BA",
    timezone: "America/Bahia",
    timezoneOffset: -3,
  });
  assert.equal(localClockHourForGeo({ timezone: "America/Bahia" }, date), 12.5);
  assert.equal(
    localClockHourForGeo({ timezone: "Invalid/Zone", timezoneOffset: -3 }, date),
    12.5,
  );
});

test("solar window, labels and daylight state remain derived from the supplied location", () => {
  const geo = { lat: -13, lng: -39.6, timezoneOffset: -3, label: "Obra" },
    date = new Date("2026-03-20T12:00:00.000Z"),
    window = solarWindowForGeo(geo, date),
    state = solarStateForHour(12, geo);
  assert.ok(window.sunrise < window.solarNoon);
  assert.ok(window.solarNoon < window.sunset);
  assert.equal(window.label, "Obra");
  assert.equal(solarHourLabel(12.51), "12:31");
  assert.equal(state.daylight, true);
  assert.ok(state.elevation > 0);
  assert.ok(Number.isFinite(state.azimuth));
});
