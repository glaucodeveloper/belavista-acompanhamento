import * as atlasComponents from "../../dist/frontend/components.js";

export const installMapSolarLightingControllerV1 = (
  MapScene,
  {
    appStore,
    MAP_GEOREFERENCE_FALLBACK,
    localClockHourForGeo,
    notify,
    solarHourLabel,
    solarStateForHour,
    solarWindowForGeo,
    windowRef,
  },
) => {
  if (typeof atlasComponents.installAtlasMapSolarLighting === "function")
    return atlasComponents.installAtlasMapSolarLighting(MapScene, {
      appStore,
      MAP_GEOREFERENCE_FALLBACK,
      localClockHourForGeo,
      notify,
      solarHourLabel,
      solarStateForHour,
      solarWindowForGeo,
      windowRef,
    });

  Object.assign(MapScene.prototype, {
    bindSolarControl() {
      if (this._solarControlBound) return;
      const control = this.querySelector("[data-solar-control]"),
        input = control?.querySelector("[data-solar-hour]");
      if (!control || !input) return;
      this._solarControlBound = true;
      const update = () => this.setSolarHour(input.value, false, false);
      input.addEventListener("input", update);
      input.addEventListener("change", () =>
        this.setSolarHour(input.value, true, true),
      );
      control.addEventListener("pointerdown", (event) => event.stopPropagation());
      const stored = appStore.get(),
        clockHour = localClockHourForGeo(MAP_GEOREFERENCE_FALLBACK),
        manual =
          stored.solarHourMode === "manual" &&
          Number.isFinite(Number(stored.solarHour));
      this.setSolarHour(
        manual ? Number(stored.solarHour) : clockHour,
        false,
        false,
      );
      this.dataset.solarInitialMode = manual ? "manual" : "clock";
      this.dataset.solarClockHour = clockHour.toFixed(2);
      windowRef.lucide?.createIcons?.({ attrs: { "stroke-width": 1.5 } });
    },
    setSolarHour(value = 9, persist = false, announce = false) {
      const point =
        this.dwgGeo?.drawingBounds?.center ||
        this.dwgGeo?.controlPoints?.find((item) => item.id === "site-center") ||
        MAP_GEOREFERENCE_FALLBACK;
      const geo = {
        ...MAP_GEOREFERENCE_FALLBACK,
        ...point,
        label:
          this.dwgGeo?.source?.project ||
          point.label ||
          MAP_GEOREFERENCE_FALLBACK.label,
      };
      const windowState = solarWindowForGeo(geo),
        min = windowState.sunrise,
        max = windowState.sunset;
      const numericValue = Number(value),
        hour = Math.max(
          min,
          Math.min(
            max,
            Number.isFinite(numericValue) ? numericValue : windowState.solarNoon,
          ),
        );
      this.solarGeo = geo;
      this.solarHour = hour;
      this._solarWindow = windowState;
      const control = this.querySelector("[data-solar-control]"),
        input = control?.querySelector("[data-solar-hour]");
      if (input) {
        input.min = min.toFixed(2);
        input.max = max.toFixed(2);
        input.value = hour.toFixed(2);
      }
      const time = solarHourLabel(hour),
        sunrise = solarHourLabel(min),
        sunset = solarHourLabel(max),
        state = solarStateForHour(hour, geo);
      const timeNode = control?.querySelector("[data-solar-time]"),
        sunriseNode = control?.querySelector("[data-solar-sunrise]"),
        sunsetNode = control?.querySelector("[data-solar-sunset]"),
        locationNode = control?.querySelector("[data-solar-location]");
      if (timeNode) timeNode.textContent = time;
      if (sunriseNode) sunriseNode.textContent = sunrise;
      if (sunsetNode) sunsetNode.textContent = sunset;
      if (locationNode)
        locationNode.textContent = `DWG · ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`;
      const lightness = 0.78 + state.elevation * 0.27,
        warmth = (1 - state.elevation) * 0.14;
      this.style.setProperty(
        "--solar-filter",
        `brightness(${lightness.toFixed(3)}) saturate(${(0.88 + state.elevation * 0.18).toFixed(3)}) sepia(${warmth.toFixed(3)})`,
      );
      this.dataset.solarHour = hour.toFixed(2);
      this.dataset.solarTime = time;
      this.dataset.solarWindow = `${sunrise}–${sunset}`;
      this.dataset.solarSource = "DWG geographic centre · solar position";
      this.applySolarLighting(state);
      if (persist)
        appStore.set({
          solarHour: hour,
          solarHourMode: "manual",
          lastAction: `Horário solar ajustado para ${time}`,
        });
      if (announce) notify(`Iluminação solar ajustada para ${time}.`, "success");
    },
    applySolarLighting(state) {
      const THREE = this.THREE;
      if (!THREE) return;
      const distance = 320,
        azimuth = state.azimuth,
        elevation = state.elevation;
      const targets = [this.solarLight, this._adminStandaloneSolarLight].filter(
        Boolean,
      );
      targets.forEach((light) => {
        const horizon = state.daylight ? Math.max(7, distance * 0.055) : 4;
        light.position.set(
          Math.cos(azimuth) * distance,
          Math.sin(azimuth) * distance,
          horizon + Math.max(0, elevation) * distance * 0.86,
        );
        light.intensity = 0.55 + elevation * 3.65;
        light.color.setHSL(
          0.09 - 0.045 * elevation,
          0.3 + 0.42 * elevation,
          0.62 + 0.08 * elevation,
        );
        light.target?.position?.set(0, 0, 0);
        light.target?.updateMatrixWorld?.();
      });
      [this.solarHemisphere, this._adminStandaloneSolarHemisphere]
        .filter(Boolean)
        .forEach((light) => {
          light.intensity = 1.35 + elevation * 1.45;
          light.color.setHSL(0.56, 0.35, 0.76);
          light.groundColor.setHSL(0.08, 0.24, 0.16);
        });
      this.configureSolarShadows(this._solarShadowBounds);
      this.dataset.solarPath = "leste → zênite → oeste · sombras dinâmicas";
      this.renderer?.render(this.scene, this.camera);
      this._adminStandaloneRendererV5370?.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
    },
    configureSolarShadows(bounds = null) {
      const THREE = this.THREE;
      if (!THREE) return;
      const targets = [this.solarLight, this._adminStandaloneSolarLight].filter(
        Boolean,
      );
      const size = bounds?.getSize?.(new THREE.Vector3());
      const span = Math.max(70, size?.x || 0, size?.y || 0, size?.z || 0) * 0.72;
      targets.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.set(
          this.dataset.adminThreeContext === "true" ? 512 : 1024,
          this.dataset.adminThreeContext === "true" ? 512 : 1024,
        );
        light.shadow.bias = -0.00045;
        light.shadow.normalBias = 0.025;
        light.shadow.camera.left = -span;
        light.shadow.camera.right = span;
        light.shadow.camera.top = span;
        light.shadow.camera.bottom = -span;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = Math.max(720, span * 5);
        light.shadow.camera.updateProjectionMatrix();
      });
      if (targets.length)
        this.dataset.sceneShadows = "enabled · sun path · PCF soft";
    },
  });
};
