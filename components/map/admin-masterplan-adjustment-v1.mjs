/** Installs the original map and lot-marker adjustment tools on MapScene. */
export const installAdminMasterplanAdjustmentV1 = (MapScene, {
  document: documentRef = globalThis.document,
  getComputedStyle: getComputedStyleRef = globalThis.getComputedStyle,
  localStorage: localStorageRef = globalThis.localStorage,
  window: windowRef = globalThis.window,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("Masterplan adjustment requires MapScene.prototype.");
  if (!documentRef?.createElement) throw new TypeError("Masterplan adjustment requires document.createElement().");
  if (typeof getComputedStyleRef !== "function") throw new TypeError("Masterplan adjustment requires getComputedStyle().");
  if (!localStorageRef || !windowRef) throw new TypeError("Masterplan adjustment requires browser storage and window ports.");
  const document = documentRef, getComputedStyle = getComputedStyleRef, localStorage = localStorageRef, window = windowRef;
  class AdminMasterplanAdjustmentV1 {
  installAdminMasterplanDevToolsV1({ layer, fit, transform, defaultFrame, frameStorageKey, readFrame, sync }) {
    const frameKeys = ["left", "top", "width", "height", "rotation"];
    const markerOverrideStorageKey = "belavista.map.lot-marker-overrides.v1";
    const readMarkerOverrides = () => {
      try {
        const value = JSON.parse(localStorage.getItem(markerOverrideStorageKey) || "{}");
        return value && typeof value === "object" ? value : {};
      } catch {
        return {};
      }
    };
    const writeMarkerOverrides = (value) => {
      try {
        localStorage.setItem(markerOverrideStorageKey, JSON.stringify(value));
      } catch {}
    };
    const toolbar = document.createElement("div");
    toolbar.className = "map-marker-adjust-toolbar";
    toolbar.dataset.mapMarkerAdjustToolbar = "true";
    toolbar.innerHTML = `<button type="button" data-map-marker-adjust-toggle aria-pressed="false">Ajustar círculos</button><button type="button" data-map-frame-adjust-toggle aria-pressed="false">Ajustar mapa</button><button type="button" data-map-marker-adjust-reset hidden>Redefinir círculos</button><span data-map-marker-adjust-status>Escolha um modo de ajuste.</span>`;
    // A ferramenta fica na cena, acima da camada visual passiva. Assim o
    // botão continua clicável e os dois alvos (planta e círculos) recebem
    // pointer events em desktop e mobile.
    this.append(toolbar);
    const toggleButton = toolbar.querySelector("[data-map-marker-adjust-toggle]");
    const resetButton = toolbar.querySelector("[data-map-marker-adjust-reset]");
    const status = toolbar.querySelector("[data-map-marker-adjust-status]");
    const describe = () => ({
      frame: readFrame(),
      defaults: { ...defaultFrame },
      asset: transform?.querySelector("img")?.currentSrc || "",
      editing: this.dataset.adminMasterplanEditing === "true",
      overlay: {
        visible: !layer.hidden,
        opacity: Number(getComputedStyle(layer).opacity),
        zIndex: Number(getComputedStyle(layer).zIndex),
      },
      lotHitAreas: this.querySelectorAll(".satellite-lot-plan-marker").length,
      base: {
        position: this.querySelector(".map-host")?.style.backgroundPosition || "",
        size: this.querySelector(".map-host")?.style.backgroundSize || "",
      },
    });
    const setFrame = (patch = {}) => {
      const next = { ...readFrame() };
      for (const key of frameKeys) {
        if (!(key in patch)) continue;
        const value = Number(patch[key]);
        if (!Number.isFinite(value)) {
          throw new TypeError(`Frame '${key}' precisa ser um número finito.`);
        }
        if ((key === "width" || key === "height") && value <= 0) {
          throw new RangeError(`Frame '${key}' precisa ser maior que zero.`);
        }
        next[key] = value;
      }
      this.dataset.adminMasterplanFrame = JSON.stringify(next);
      try {
        localStorage.setItem(frameStorageKey, JSON.stringify(next));
      } catch {}
      sync();
      this.syncAdminMasterplanLotMarkersV1?.();
      return describe();
    };
    const setOverlay = (patch = {}) => {
      if ("visible" in patch) layer.hidden = !Boolean(patch.visible);
      if ("opacity" in patch) {
        const opacity = Number(patch.opacity);
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          throw new RangeError("Overlay 'opacity' deve estar entre 0 e 1.");
        }
        layer.style.opacity = String(opacity);
      }
      if ("zIndex" in patch) {
        const zIndex = Number(patch.zIndex);
        if (!Number.isFinite(zIndex)) throw new TypeError("Overlay 'zIndex' inválido.");
        layer.style.zIndex = String(zIndex);
      }
      return describe();
    };
    const setBase = (patch = {}) => {
      const host = this.querySelector(".map-host");
      if (!host) return describe();
      if (typeof patch.position === "string") host.style.backgroundPosition = patch.position;
      if (typeof patch.size === "string") host.style.backgroundSize = patch.size;
      return describe();
    };
    const setEditing = (enabled = this.dataset.adminMasterplanEditing !== "true") => {
      const editing = Boolean(enabled);
      this.dataset.adminMasterplanEditing = editing ? "true" : "false";
      this.classList.toggle("is-admin-masterplan-editing", editing);
      if (transform) transform.style.pointerEvents = editing ? "auto" : "none";
      const image = transform?.querySelector("img");
      if (image) image.style.pointerEvents = editing ? "auto" : "none";
      toggleButton?.setAttribute("aria-pressed", String(editing));
      toggleButton.textContent = editing ? "Concluir ajuste" : "Ajustar marcações";
      if (resetButton) resetButton.hidden = !editing;
      if (status) status.textContent = editing
        ? "Arraste a planta ou um círculo; as posições ficam salvas neste navegador."
        : "Ajuste concluído. Coordenadas registradas no console.";
      if (!editing) {
        const overrides = readMarkerOverrides();
        console.info("[Aliança Park] posições ajustadas dos marcadores", overrides);
      }
      return describe();
    };
    toggleButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setEditing();
    });
    resetButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      localStorage.removeItem(markerOverrideStorageKey);
      this.querySelectorAll(".satellite-lot-plan-marker[data-map-adjust-u]").forEach((marker) => {
        delete marker.dataset.mapAdjustU;
        delete marker.dataset.mapAdjustV;
      });
      this.syncAdminMasterplanLotMarkersV1?.();
      if (status) status.textContent = "Círculos restaurados para as coordenadas da planta.";
      console.info("[Aliança Park] ajustes de círculos restaurados.");
    });
    if (!this._adminMasterplanFrameDragBoundV1) {
      this._adminMasterplanFrameDragBoundV1 = true;
      this.addEventListener("pointerdown", (event) => {
        if (this.dataset.adminMasterplanEditing !== "true") return;
        const target = event.target?.closest?.("[data-admin-masterplan-transform]");
        if (!target || !this.contains(target) || event.target?.closest?.(".satellite-lot-plan-marker, [data-map-scale-handle]")) return;
        const fitRect = fit?.getBoundingClientRect();
        if (!fitRect?.width || !fitRect?.height) return;
        const start = readFrame();
        const origin = { x: event.clientX, y: event.clientY };
        event.preventDefault();
        event.stopPropagation();
        const move = (pointerEvent) => {
          const left = Math.max(-1, Math.min(1, start.left + (pointerEvent.clientX - origin.x) / fitRect.width));
          const top = Math.max(-1, Math.min(1, start.top + (pointerEvent.clientY - origin.y) / fitRect.height));
          setFrame({ left, top });
        };
        const finish = () => {
          window.removeEventListener("pointermove", move, true);
          window.removeEventListener("pointerup", finish, true);
          console.info("[Aliança Park] planta calibrada", readFrame());
        };
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", finish, true);
      }, true);
    }
    if (!this._adminMasterplanMarkerDragBoundV1) {
      this._adminMasterplanMarkerDragBoundV1 = true;
      this.addEventListener("pointerdown", (event) => {
        if (this.dataset.adminMasterplanEditing !== "true") return;
        const marker = event.target?.closest?.(".satellite-lot-plan-marker");
        if (!marker || !this.contains(marker)) return;
        const markerLayer = marker.closest(".satellite-lot-plan-markers");
        if (!markerLayer) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const place = (pointerEvent) => {
          const rect = markerLayer.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          const u = Math.max(0, Math.min(1, (pointerEvent.clientX - rect.left) / rect.width));
          const v = Math.max(0, Math.min(1, (pointerEvent.clientY - rect.top) / rect.height));
          marker.dataset.mapAdjustU = String(u);
          marker.dataset.mapAdjustV = String(v);
          marker.style.left = `${(u * 100).toFixed(4)}%`;
          marker.style.top = `${(v * 100).toFixed(4)}%`;
          return { u, v };
        };
        let moved = false;
        const move = (pointerEvent) => {
          moved = true;
          place(pointerEvent);
        };
        const finish = (pointerEvent) => {
          window.removeEventListener("pointermove", move, true);
          window.removeEventListener("pointerup", finish, true);
          const point = place(pointerEvent);
          if (!point) return;
          const overrides = readMarkerOverrides();
          overrides[marker.dataset.lot] = point;
          writeMarkerOverrides(overrides);
          marker.dataset.mapAdjustSuppressClick = moved ? "true" : "false";
          console.info("[Aliança Park] marcador calibrado", {
            lotId: marker.dataset.lot,
            u: point.u,
            v: point.v,
          });
        };
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", finish, true);
      }, true);
    }
    const api = {
      get: describe,
      setFrame,
      resetFrame: () => {
        try { localStorage.removeItem(frameStorageKey); } catch {}
        delete this.dataset.adminMasterplanFrame;
        sync();
        this.syncAdminMasterplanLotMarkersV1?.();
        return describe();
      },
      setOverlay,
      setBase,
      setEditing,
      markerOverrides: () => readMarkerOverrides(),
      resetMarkerOverrides: () => resetButton?.click(),
      map: this,
      overlay: layer,
    };
    this.adminMasterplanDevToolsV1 = api;
    window.__aliancaMapDebug = api;
    this.dataset.adminMasterplanDevtools = "available";
  }

  // Installed from satellite-lot-plan-overlay-v1.mjs before custom-element registration.
  }
  Object.defineProperty(MapScene.prototype, "installAdminMasterplanDevToolsV1", Object.getOwnPropertyDescriptor(AdminMasterplanAdjustmentV1.prototype, "installAdminMasterplanDevToolsV1"));
};
