/** Map 3D loading surface and progressive static-base lifecycle. */
import { mapStaticCaptureSourceV1 } from "./map-asset-profile-v1.mjs?v=ts-map-asset-profile-owner-v1";
import mapLoadingScreenData from "../../frontend/src/data/map-loading-screen.json" with { type: "json" };

export const installMapLoadingScreenLegacyV1 = (MapScene, dependencies = {}) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Map loading screen requires the existing MapScene constructor.");
  const { GENERATED_AERIAL_ASSET } = dependencies;
  if (typeof GENERATED_AERIAL_ASSET !== "string" || !GENERATED_AERIAL_ASSET)
    throw new TypeError("Map loading screen requires GENERATED_AERIAL_ASSET.");
  const browser = dependencies.browser || globalThis;
  const { Image, document, window } = browser;
  const performanceRef = browser.performance || globalThis.performance;
  const localStorageRef = browser.localStorage || globalThis.localStorage;
  const DateRef = browser.Date || Date;
  const globalRef = browser.globalRef || globalThis;
  if (!document || !window || typeof Image !== "function")
    throw new TypeError("Map loading screen requires browser Image, document and window services.");
  const MapLoadingScreenMethodsV1 = class {
  mountMap3DLoadingScreenV1() {
    if (
      this.hasAttribute("compact") ||
      this.querySelector("[data-map-3d-loading]")
    )
      return;
    // O contrato data-admin-shared-public-map chega pelo módulo administrativo
    // após a primeira montagem do custom element. Deixe o backdrop preparado
    // agora e permita que o CSS o revele quando o atributo for aplicado.
    const waiting = mapLoadingScreenData.phases.waiting;
    const pdfBackdrop = `<div class="map-3d-loading-backdrop" data-map-3d-loading-backdrop="pdf-page" aria-hidden="true"><div class="map-3d-loading-backdrop-page"></div></div>`;
    this.insertAdjacentHTML(
      "afterbegin",
      `<section class="map-3d-loading-screen" data-map-3d-loading data-map-3d-loading-state="loading" role="status" aria-live="polite">${pdfBackdrop}<div class="map-3d-loading-card"><div class="map-3d-loading-mark"><span>3D</span><i></i></div><span class="activity-kind">PRÉ-CARREGAMENTO · MAPA OPERACIONAL</span><h2 data-map-3d-loading-title>${waiting.title}</h2><p data-map-3d-loading-detail>${waiting.detail}</p><div class="map-3d-loading-track" aria-hidden="true"><i data-map-3d-loading-progress></i></div><footer><b data-map-3d-loading-value>${waiting.progress}%</b><small data-map-3d-loading-phase>${waiting.label}</small></footer></div></section>`,
    );
    this.updateMap3DLoadingScreenV1("waiting", { progress: 4 });
  }

  preparePublicStaticBaseV1(state = "static-base-ready") {
    if (!this.isPublicCustomerExperience?.()) return false;

    // A captura local é a base funcional da página pública. O renderer 3D é
    // uma melhoria progressiva: se WebGL ou o GLB falhar, a visita continua
    // utilizável e não fica coberta pelo cartão de erro administrativo.
    this.dataset.renderMode = "3d-static-satellite";
    this.dataset.mapInit = "static-capture-no-maps";
    this.dataset.publicMapProvider = "local-capture";
    this.dataset.publicMapRequests = "0";
    this.dataset.publicStaticState = state;
    if (state === "static-base-loading")
      this.removeAttribute("data-public-static-base-ready");
    else this.dataset.publicStaticBaseReady = "true";
    this.querySelector("[data-map-3d-loading]")?.setAttribute("hidden", "");

    const sticky = this.closest(".public-map-sticky");
    const staticBackground = sticky?.querySelector(".public-map-static-bg");
    if (staticBackground) {
      staticBackground.hidden = false;
      staticBackground.removeAttribute("data-three-texture-active");
      staticBackground.dataset.publicFallback = "local-capture";
    }
    const source = mapStaticCaptureSourceV1(this, {
      generatedAsset: GENERATED_AERIAL_ASSET,
      browser,
    });
    const adminStaticHost = this.isAdminPublicMapV1()
      ? this.querySelector(".map-host")
      : null;
    if (adminStaticHost) {
      adminStaticHost.style.setProperty(
        "--admin-static-satellite-image",
        `url("${source}")`,
      );
      adminStaticHost.style.backgroundImage = `url("${source}")`;
      adminStaticHost.style.backgroundSize = "cover";
      adminStaticHost.style.backgroundPosition = "center";
      adminStaticHost.style.backgroundRepeat = "no-repeat";
      adminStaticHost.style.backgroundColor = "#07101e";
      adminStaticHost.style.opacity = "1";
      adminStaticHost.style.visibility = "visible";
      adminStaticHost.style.display = "block";
      adminStaticHost.style.pointerEvents = "none";
      adminStaticHost.style.zIndex = "0";
      adminStaticHost.dataset.backgroundRole = "public-static-capture";
    }
    return true;
  }

  waitForPublicStaticBaseV1() {
    if (!this.isPublicCustomerExperience?.()) return Promise.resolve(false);
    if (this._publicStaticBasePromiseV1) return this._publicStaticBasePromiseV1;

    const source = mapStaticCaptureSourceV1(this, {
      generatedAsset: GENERATED_AERIAL_ASSET,
      browser,
    });
    this._publicStaticBasePromiseV1 = new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      let timeout = 0;
      const finish = (loaded, state) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        this.preparePublicStaticBaseV1(state);
        resolve(loaded);
      };
      image.decoding = "async";
      image.onload = () => finish(true, "static-base-loaded");
      image.onerror = () => finish(false, "static-base-unavailable");
      image.src = new URL(source, document.baseURI).href;
      if (image.complete)
        queueMicrotask(() =>
          finish(
            image.naturalWidth > 0,
            image.naturalWidth > 0
              ? "static-base-loaded"
              : "static-base-unavailable",
          ),
        );
      timeout = window.setTimeout(
        () => finish(image.naturalWidth > 0, "static-base-timeout"),
        5000,
      );
    });
    return this._publicStaticBasePromiseV1;
  }

  updateMap3DLoadingScreenV1(phase = "waiting", extra = {}) {
    const screen = this.querySelector("[data-map-3d-loading]");
    if (!screen) return;
    if (this.isPublicCustomerExperience?.()) {
      // A página pública já tem uma captura aérea utilizável. O progresso do
      // renderer opcional não deve reabrir o cartão sobre a experiência.
      screen.dataset.map3dLoadingState = "public-static";
      screen.setAttribute("hidden", "");
      return;
    }
    const normalized = String(phase || "waiting").toLowerCase();
    const meshNumber = Number(extra.meshNumber || extra.stagedMeshes || 0),
      meshCount = Number(extra.meshCount || 0);
    let progress = Number(extra.progress ?? this.dataset.modelProgress);
    if (!Number.isFinite(progress) || progress <= 0)
      progress = mapLoadingScreenData.phases[normalized]?.progress ?? mapLoadingScreenData.defaultProgress;
    if (meshCount && meshNumber && /gpu-mesh|gpu-visible/.test(normalized))
      progress = Math.max(
        progress,
        46 + Math.round((meshNumber / meshCount) * 32),
      );
    if (normalized === "gpu-ready" || normalized === "ready") progress = 100;
    progress = Math.max(0, Math.min(100, Math.round(progress)));
    const labels = mapLoadingScreenData.phases[normalized] || mapLoadingScreenData.fallback;
    const error = /error$/.test(normalized);
    screen.dataset.map3dLoadingState = error
      ? "error"
      : progress >= 100
        ? "ready"
        : "loading";
    screen
      .querySelector("[data-map-3d-loading-title]")
      ?.replaceChildren(document.createTextNode(labels.title));
    screen
      .querySelector("[data-map-3d-loading-detail]")
      ?.replaceChildren(document.createTextNode(labels.detail));
    screen
      .querySelector("[data-map-3d-loading-phase]")
      ?.replaceChildren(document.createTextNode(labels.label));
    const bar = screen.querySelector("[data-map-3d-loading-progress]");
    if (bar) bar.style.width = `${progress}%`;
    const value = screen.querySelector("[data-map-3d-loading-value]");
    if (value) value.textContent = error ? "!" : `${progress}%`;
    // A composição satélite + planta transparente é a primeira superfície
    // útil do administrativo. O renderer 3D pode terminar em segundo plano,
    // sem cobrir essa leitura com um cartão de progresso.
    if (this.dataset.adminMasterplanOverlay === "true") {
      screen.setAttribute("hidden", "");
      return;
    }
    if (progress >= 100 && !error) screen.setAttribute("hidden", "");
    else screen.removeAttribute("hidden");
  }

  persist3dBootPhaseV5367(phase, extra = {}) {
    const state = (globalRef.__BELAVISTA_ADMIN_MODEL_STATE__ ??= {
      version: mapLoadingScreenData.bootStateVersion,
      startedAt: performanceRef.now(),
    });
    state.version = mapLoadingScreenData.bootStateVersion;
    state.phase = phase;
    Object.assign(state, extra);
    globalRef.__BELAVISTA_ADMIN_MODEL_STATE__ = state;
    this.dataset.modelBootPhase = phase;
    this.dataset.modelBootVersion = mapLoadingScreenData.bootStateVersion;
    this.updateMap3DLoadingScreenV1(phase, extra);
    try {
      localStorageRef.setItem(
        mapLoadingScreenData.bootStorageKey,
        JSON.stringify({
          version: mapLoadingScreenData.bootStateVersion,
          phase,
          wallClock: new DateRef().toISOString(),
          ...extra,
        }),
      );
    } catch {}
    return state;
  }
  };
  Object.defineProperties(MapScene.prototype, Object.getOwnPropertyDescriptors(MapLoadingScreenMethodsV1.prototype));
  return MapScene;
};
