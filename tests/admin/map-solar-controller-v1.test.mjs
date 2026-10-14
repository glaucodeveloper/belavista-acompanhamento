import test from "node:test";
import assert from "node:assert/strict";
import { installMapSolarLightingControllerV1 } from "../../components/map/solar-lighting-controller-v1.mjs";
import { MAP_GEOREFERENCE_FALLBACK } from "../../components/map/solar-lighting.mjs";

test("solar controller is installed on MapScene and uses injected state, solar, UI and notification ports", () => {
  class MapScene {}
  const writes = [], notices = [], style = new Map(), dataset = {}, nodes = new Map();
  const appStore = {
    get: () => ({ solarHourMode: "clock" }),
    set: (value) => writes.push(value),
  };
  const windowRef = { lucide: { createIcons: () => notices.push("icons") } };
  installMapSolarLightingControllerV1(MapScene, {
    appStore,
    MAP_GEOREFERENCE_FALLBACK,
    localClockHourForGeo: () => 12,
    notify: (message, tone) => notices.push([message, tone]),
    solarHourLabel: (hour) => `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`,
    solarStateForHour: (hour) => ({ elevation: 0.5, azimuth: hour, daylight: true }),
    solarWindowForGeo: () => ({ sunrise: 6, sunset: 18, solarNoon: 12, label: "Obra" }),
    windowRef,
  });
  const scene = Object.assign(new MapScene(), {
    dataset,
    style: { setProperty: (key, value) => style.set(key, value) },
    querySelector: (selector) => nodes.get(selector) || null,
  });

  scene.setSolarHour(21, true, true);

  assert.equal(scene.solarHour, 18);
  assert.equal(dataset.solarTime, "18:00");
  assert.equal(dataset.solarWindow, "6:00–18:00");
  assert.match(style.get("--solar-filter"), /^brightness\(/);
  assert.deepEqual(writes, [{ solarHour: 18, solarHourMode: "manual", lastAction: "Horário solar ajustado para 18:00" }]);
  assert.deepEqual(notices, [["Iluminação solar ajustada para 18:00.", "success"]]);
  assert.equal(typeof scene.bindSolarControl, "function");
  assert.equal(typeof scene.applySolarLighting, "function");
  assert.equal(typeof scene.configureSolarShadows, "function");
});
