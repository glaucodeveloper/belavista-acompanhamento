import { installAtlasMapSceneStartupReadiness } from "../../dist/frontend/components.js";

/** Installs the MapScene viewport gate and renderer startup policy. */
export const installMapSceneStartupReadinessV1 = (MapScene, dependencies = {}) => {
  if (typeof installAtlasMapSceneStartupReadiness === "function")
    return installAtlasMapSceneStartupReadiness(MapScene, dependencies);

  MapScene.prototype.waitForAdminShellViewportV5376 = function () {
    if (this._adminShellViewportGateV5376) return;
    this._adminShellViewportGateV5376 = true;
    this.dataset.adminModelLifecycle = "waiting-for-visible-shell";
    this.dataset.modelBootPhase = "waiting-admin-shell";
    const started = performance.now();
    const tick = () => {
      if (!this.isConnected) return;
      const app = this.closest("belavista-app");
      const host = this.querySelector(".map-host");
      const rect = host?.getBoundingClientRect?.();
      const visible = Boolean(
        (!app || !app.hidden) &&
        rect &&
        rect.width > 32 &&
        rect.height > 32 &&
        getComputedStyle(host).display !== "none" &&
        getComputedStyle(host).visibility !== "hidden",
      );
      if (visible) {
        this._adminShellViewportReadyV5376 = true;
        this.dataset.adminModelLifecycle = "shell-visible-viewport-ready";
        this.dataset.adminShellReadyMs = String(
          Math.round(performance.now() - started),
        );
        this.dataset.modelBootPhase = "admin-shell-ready-static";
        this.initWhenReady();
        return;
      }
      setTimeout(tick, 180);
    };
    requestAnimationFrame(() => requestAnimationFrame(tick));
  };

  MapScene.prototype.initWhenReady = function () {
    const adminShared = this.hasAttribute("data-admin-shared-public-map");

    if (adminShared && !this._adminShellViewportReadyV5376) {
      this.waitForAdminShellViewportV5376();
      return;
    }

    if (this.hasAttribute("data-public-static-only")) {
      this.mapTileMode = "generated";
      this.dataset.renderMode = "static-satellite-markers";
      this.dataset.mapInit = "static-only";
      this.dataset.publicThree = "disabled-static-only";
      this.bindStaticSatelliteMapGesturesV1();
      this.preparePublicStaticBaseV1("static-base-loading");
      if (this.isAdminPublicMapV1?.()) {
        // O administrativo usa a mesma foto satélite estática, porém a
        // camada comercial substitui as bolhas verdes do fluxo público.
        this.installAdminMasterplanOverlayV1();
        this.installSatelliteLotPlanOverlayV1({
          markers: true,
          outlines: false,
        });
        // Algumas rotas reutilizam a camada comercial já montada. Esperamos
        // dois frames para o quadro calibrado e suas dimensões existirem antes
        // de aplicar o encaixe inicial, sem interferir em pan/zoom posterior.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          this.fitStaticSatelliteMasterplanV1?.();
        }));
        this.querySelectorAll("[data-public-static-lot-markers]").forEach(
          (layer) => layer.remove(),
        );
        this.querySelector("[data-map-3d-loading]")?.setAttribute(
          "hidden",
          "",
        );
      }
      this.waitForPublicStaticBaseV1().then((loaded) => {
        if (!this.isConnected) return;
        this.dataset.publicStaticImage = loaded ? "loaded" : "unavailable";
        this.dataset.renderMode = "static-satellite-markers";
        this.dataset.publicThree = "disabled-static-only";
      });
      return;
    }

    // O /leads usa uma captura local da área, georreferenciada pelo DWG.
    // Não aguarde nem inicialize Leaflet/Maps para liberar a cena pública.
    if (this.isPublicCustomerExperience()) {
      this.mapTileMode = "generated";
      this.dataset.publicThree = "waiting-static-base";
      this.preparePublicStaticBaseV1("static-base-loading");
      this.waitForPublicStaticBaseV1().then((loaded) => {
        if (!this.isConnected) return;
        this.dataset.publicStaticImage = loaded ? "loaded" : "unavailable";
        this.dataset.publicThree = "forced-after-static";
        this.scheduleThree({ force: true });
      });
      return;
    }

    // The Leads page already has Leaflet available before map-scene connects.
    // The original admin did not. For the shared public map, WebGL/GLB must not
    // depend on Leaflet readiness: start Three immediately and initialize
    // Leaflet independently when it is present.
    if (adminShared) {
      this.dataset.renderMode = "3d-public-shared";
      this.dataset.mapInit = window.L ? "leaflet-found" : "three-first";
      if (window.L) {
        try {
          this.initLeaflet();
        } catch (err) {
          this.dataset.mapInit = "leaflet-error";
          console.warn(
            "Leaflet falhou no mapa administrativo compartilhado.",
            err,
          );
        }
      }
      this.scheduleThree();
      return;
    }

    const allowThree = true;
    this.dataset.renderMode = allowThree ? "3d-experimental" : "safe-map";
    this.dataset.mapInit = "waiting";
    const start = Date.now();
    const tick = () => {
      this.dataset.mapInit = window.L ? "leaflet-found" : "waiting";
      if (window.L) {
        try {
          this.initLeaflet();
        } catch (err) {
          this.dataset.mapInit = "leaflet-error";
          console.warn(
            "Leaflet indisponível, mantendo superfície de mapa.",
            err,
          );
        }
        if (allowThree) this.scheduleThree();
        return;
      }
      if (Date.now() - start < 7000) setTimeout(tick, 100);
      else {
        this.dataset.mapInit = "timeout";
        if (allowThree) this.scheduleThree();
      }
    };
    tick();
  };

  MapScene.prototype.scheduleThree = function ({ force = false } = {}) {
    if (this.hasAttribute("data-public-static-only")) {
      this.dataset.three = "blocked-static-only";
      this.dataset.publicThree = "disabled-static-only";
      this.dataset.modelBootPhase = "static-only-no-webgl";
      return false;
    }
    const forcedPublicBoot = force && this.isPublicCustomerExperience?.();
    if (
      this.isAdminStandalone3DV5370?.() &&
      !this._adminStandaloneActivatedV5370 &&
      !forcedPublicBoot
    ) {
      this.dataset.three = "blocked-static-first";
      this.dataset.modelBootPhase = "blocked-until-explicit-activation";
      return;
    }
    if (this._threeScheduled || this.renderer) return;
    this._threeScheduled = true;
    this.dataset.modelBootPhase = forcedPublicBoot
      ? "scheduled-after-static-base"
      : "scheduled-after-first-paint";

    const run = () =>
      Promise.resolve(this.initThree()).catch((error) => {
        const publicStaticFallback = this.isPublicCustomerExperience?.();
        this.dataset.three = publicStaticFallback ? "fallback-static" : "fallback";
        this.dataset.modelError = "three-init-failed";
        this.dataset.modelBootPhase = "three-init-error";
        if (publicStaticFallback)
          this.preparePublicStaticBaseV1("static-fallback");
        else this.updateMap3DLoadingScreenV1("three-init-error");
        console.warn(
          "[Aliança Park] inicialização 3D falhou; base pública preservada.",
          error,
        );
      });
    requestAnimationFrame(() => {
      if (forcedPublicBoot) {
        run();
        return;
      }
      setTimeout(() => {
        if ("requestIdleCallback" in window)
          window.requestIdleCallback(run, { timeout: 1200 });
        else run();
      }, 650);
    });
  };

  return MapScene;
};
