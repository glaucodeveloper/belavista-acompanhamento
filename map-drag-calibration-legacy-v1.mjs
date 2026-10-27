/* Controlador final de calibração: carregado após os módulos de tela para que
 * o ajuste continue disponível mesmo quando extensões antigas registrarem o
 * elemento map-scene antes do módulo principal. */
const FRAME_KEY = "belavista.map.masterplan-frame.v1";
const MARKERS_KEY = "belavista.map.lot-marker-overrides.v1";

const parse = (value, fallback = {}) => {
  try {
    const data = JSON.parse(value || "{}");
    return data && typeof data === "object" ? data : fallback;
  } catch { return fallback; }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeAngle = (value) => ((Number(value || 0) + 180) % 360 + 360) % 360 - 180;
const calibrationStorage = () => globalThis.belavistaPublicMapCalibrationStorage;
const readMarkerOverrides = () => calibrationStorage()?.readMarkers?.(MARKERS_KEY) ?? globalThis.belavistaPublicMapMarkerOverrides?.(parse(localStorage.getItem(MARKERS_KEY))) ?? parse(localStorage.getItem(MARKERS_KEY));
const writeMarkerOverrides = (overrides) => calibrationStorage()?.saveMarkers?.(MARKERS_KEY, overrides) ?? localStorage.setItem(MARKERS_KEY, JSON.stringify(overrides));
const saveMarkerOverride = (lotId, point) => calibrationStorage()?.saveMarker?.(MARKERS_KEY, lotId, point) ?? (() => { const overrides = readMarkerOverrides(); overrides[lotId] = point; return writeMarkerOverrides(overrides); })();
const removeMarkerOverrides = () => calibrationStorage()?.removeMarkers?.(MARKERS_KEY) ?? localStorage.removeItem(MARKERS_KEY);
const writeCalibrationFrame = (frame) => calibrationStorage()?.saveFrame?.(FRAME_KEY, frame) ?? localStorage.setItem(FRAME_KEY, JSON.stringify(frame));

const install = () => {
  const scene = document.querySelector("map-scene[data-admin-masterplan-overlay]");
  const toggle = document.querySelector("[data-map-marker-adjust-toggle]");
  if (!scene || !toggle || toggle.dataset.dragCalibrationBound === "true") return Boolean(scene);
  toggle.dataset.dragCalibrationBound = "true";
  const mapToggle = document.querySelector("[data-map-frame-adjust-toggle]");
  const reset = document.querySelector("[data-map-marker-adjust-reset]");
  const status = document.querySelector("[data-map-marker-adjust-status]");
  const toolbar = toggle.closest("atlas-map-adjustment-toolbar");
  const pointerDefaults = scene.adminMasterplanDevToolsV1?.get?.()?.defaults;
  const typedGestureController = toolbar?.installPointerController?.(scene, pointerDefaults || { left: 0, top: 0, width: 0.25, height: 0.3, rotation: 0 }) === true;
  const typedPlacementController = scene.dataset.adminMapManualPlacementTsOwner === "true";
  if (typedGestureController && scene.dataset.adminMapCalibrationTsOwner === "true") return true;
  const transform = scene.querySelector("[data-admin-masterplan-transform]");
  const image = transform?.querySelector("img");
  const scaleHandleSides = ["n", "e", "s", "w"];
  if (transform && !transform.querySelector("[data-map-scale-handle]")) {
    if (typeof toolbar?.ensureScaleHandles === "function") toolbar.ensureScaleHandles(transform);
    else scaleHandleSides.forEach((side) => {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = `admin-masterplan-scale-handle is-${side}`;
      handle.dataset.mapScaleHandle = side;
      handle.setAttribute("aria-label", `Redimensionar planta pela lateral ${side.toUpperCase()}`);
      transform.append(handle);
    });
  }
  const setEditing = (enabled, mode = "markers") => {
    const editing = Boolean(enabled);
    scene.dataset.adminMasterplanEditing = editing ? "true" : "false";
    scene.dataset.adminMasterplanEditMode = editing ? mode : "";
    scene.classList.toggle("is-admin-masterplan-editing", editing);
    if (transform) transform.style.pointerEvents = "none";
    if (image) image.style.pointerEvents = "none";
    const statusText = editing
      ? mode === "markers"
        ? "Clique na planta para posicionar um número; arraste um círculo para refinar; Ctrl + arrastar move a planta; Ctrl + Shift + arrastar gira; use as quatro laterais para escalar."
        : "Arraste a planta para ajustar sua posição; Ctrl + Shift + arrastar gira; use as quatro alças laterais para escalar."
      : "Ajuste concluído. Coordenadas registradas no console.";
    if (typeof toolbar?.setState === "function") toolbar.setState({ editing, mode, status: statusText });
    else {
      toggle.setAttribute("aria-pressed", String(editing && mode === "markers"));
      mapToggle?.setAttribute("aria-pressed", String(editing && mode === "map"));
      toggle.textContent = editing && mode === "markers" ? "Concluir círculos" : "Ajustar círculos";
      if (mapToggle) mapToggle.textContent = editing && mode === "map" ? "Concluir mapa" : "Ajustar mapa";
      if (reset) reset.hidden = !editing;
      if (status) status.textContent = statusText;
    }
    if (!editing) console.info("[Aliança Park] calibração do mapa", {
      frame: parse(scene.dataset.adminMasterplanFrame),
      markers: readMarkerOverrides(),
    });
  };
  if (typeof toolbar?.setState === "function") {
    toolbar.addEventListener("atlas:map-adjustment-toggle", event => {
      event.stopPropagation();
      setEditing(event.detail?.editing ?? (scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "markers"), event.detail?.mode || "markers");
    });
    toolbar.addEventListener("atlas:map-adjustment-frame-toggle", event => {
      event.stopPropagation();
      setEditing(event.detail?.editing ?? (scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "map"), event.detail?.mode || "map");
    });
    toolbar.addEventListener("atlas:map-adjustment-reset", event => {
      event.stopPropagation();
      removeMarkerOverrides();
      scene.querySelectorAll(".satellite-lot-plan-marker[data-map-adjust-u]").forEach(marker => {
        delete marker.dataset.mapAdjustU;
        delete marker.dataset.mapAdjustV;
      });
      scene.syncAdminMasterplanLotMarkersV1?.();
    });
  } else {
    toggle.addEventListener("click", event => {
      event.preventDefault(); event.stopImmediatePropagation();
      setEditing(scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "markers", "markers");
    }, true);
    mapToggle?.addEventListener("click", event => {
      event.preventDefault(); event.stopImmediatePropagation();
      setEditing(scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "map", "map");
    }, true);
    reset?.addEventListener("click", () => {
      removeMarkerOverrides();
      scene.querySelectorAll(".satellite-lot-plan-marker[data-map-adjust-u]").forEach(marker => {
        delete marker.dataset.mapAdjustU;
        delete marker.dataset.mapAdjustV;
      });
      scene.syncAdminMasterplanLotMarkersV1?.();
    }, true);
  }
  const typedPlacementDialog = !typedPlacementController && Boolean(customElements.get("atlas-map-lot-placement-dialog"));
  const placementDialog = typedPlacementController ? null : document.createElement(typedPlacementDialog ? "atlas-map-lot-placement-dialog" : "form");
  if (!typedPlacementController && !typedPlacementDialog && placementDialog) {
    placementDialog.className = "map-lot-placement-dialog";
    placementDialog.innerHTML = `<label>Número do lote<input name="lotNumber" inputmode="numeric" autocomplete="off" placeholder="Ex.: 001" required></label><div><button type="button" data-map-lot-placement-cancel>Cancelar</button><button type="submit">Posicionar</button></div>`;
  }
  if (placementDialog) scene.append(placementDialog);
  const closePlacementDialog = () => {
    if (!placementDialog) return;
    if (typeof placementDialog.closePlacement === "function") placementDialog.closePlacement();
    else {
      placementDialog.hidden = true;
      delete placementDialog.dataset.u;
      delete placementDialog.dataset.v;
    }
  };
  const persistMarkerPlacement = ({ lotNumber: requestedNumber, u: requestedU, v: requestedV, rawNumber = requestedNumber }) => {
    const activeMarkers = [...scene.querySelectorAll(".satellite-lot-plan-marker")];
    let lotNumber = String(requestedNumber || "");
    let u = Number(requestedU), v = Number(requestedV), targetMarker = null;
    if (globalThis.belavistaPublicMapManualLotPlacement) {
      const resolution = globalThis.belavistaPublicMapManualLotPlacement({
        rawLotNumber: rawNumber,
        u,
        v,
        availableLotIds: activeMarkers.map(marker => marker.dataset.lot || ""),
      });
      lotNumber = resolution.lotNumber;
      u = resolution.u; v = resolution.v;
      targetMarker = resolution.found ? activeMarkers.find(marker => marker.dataset.lot === resolution.lotId) : null;
    } else {
      lotNumber = String(rawNumber || "").match(/\d+/)?.[0]?.padStart(3, "0") || lotNumber;
      targetMarker = lotNumber ? activeMarkers.find(marker => marker.dataset.lot === `Lote_${lotNumber}`) : null;
    }
    if (!targetMarker || !Number.isFinite(u) || !Number.isFinite(v)) {
      if (status) status.textContent = `Lote ${lotNumber || rawNumber || "informado"} não encontrado entre os marcadores ativos.`;
      return;
    }
    if (typeof targetMarker.setMapPosition === "function") targetMarker.setMapPosition({ u, v, zIndex: Number(targetMarker.style.zIndex) || 0, manualPosition: { u, v } });
    else {
      targetMarker.dataset.mapAdjustU = String(u);
      targetMarker.dataset.mapAdjustV = String(v);
      targetMarker.style.left = `${(u * 100).toFixed(4)}%`;
      targetMarker.style.top = `${(v * 100).toFixed(4)}%`;
    }
    saveMarkerOverride(targetMarker.dataset.lot, { u, v });
    if (status) status.textContent = `Lote ${lotNumber} posicionado. Arraste para refinar ou clique em Concluir ajuste.`;
    console.info("[Aliança Park] marcador posicionado por clique", { lotId: targetMarker.dataset.lot, u, v });
    closePlacementDialog();
  };
  if (!typedPlacementController && typedPlacementDialog && placementDialog) {
    placementDialog.addEventListener("atlas:map-lot-placement-submit", event => persistMarkerPlacement(event.detail || {}));
  } else if (!typedPlacementController && placementDialog) {
    placementDialog.querySelector("[data-map-lot-placement-cancel]")?.addEventListener("click", closePlacementDialog);
    placementDialog.addEventListener("submit", event => {
      event.preventDefault();
      const rawNumber = new FormData(placementDialog).get("lotNumber");
      const lotNumber = String(rawNumber || "").match(/\d+/)?.[0]?.padStart(3, "0");
      persistMarkerPlacement({ lotNumber, rawNumber, u: Number(placementDialog.dataset.u), v: Number(placementDialog.dataset.v) });
    });
  }
  const openPlacementDialog = (u, v) => {
    if (!placementDialog) return;
    if (typeof placementDialog.openAt === "function") placementDialog.openAt({ u, v });
    else {
      placementDialog.dataset.u = String(u);
      placementDialog.dataset.v = String(v);
      placementDialog.hidden = false;
      placementDialog.elements.lotNumber.value = "";
      placementDialog.elements.lotNumber.focus();
    }
  };
  if (typedGestureController) {
    if (scene.dataset.adminMapCalibrationCommitTsOwner !== "true") scene.addEventListener("atlas:admin-map-calibration-frame-preview", event => {
      const frame = event.detail?.frame;
      if (!frame) return;
      writeCalibrationFrame(frame);
      scene.syncAdminMasterplanLotMarkersV1?.();
      const fit = scene.querySelector(".admin-masterplan-fit");
      if (fit) {
        fit.style.setProperty("--masterplan-left", `${frame.left * 100}%`);
        fit.style.setProperty("--masterplan-top", `${frame.top * 100}%`);
        fit.style.setProperty("--masterplan-width", `${frame.width * 100}%`);
        fit.style.setProperty("--masterplan-height", `${frame.height * 100}%`);
        fit.style.setProperty("--masterplan-rotation", `${Number(frame.rotation || 0)}deg`);
      }
    });
    if (scene.dataset.adminMapCalibrationCommitTsOwner !== "true") scene.addEventListener("atlas:admin-map-calibration-marker-commit", event => {
      const { lotId, u, v } = event.detail || {};
      if (!lotId || !Number.isFinite(u) || !Number.isFinite(v)) return;
      saveMarkerOverride(lotId, { u, v });
      console.info("[Aliança Park] marcador calibrado", { lotId, u, v });
    });
    if (!typedPlacementController) scene.addEventListener("atlas:admin-map-calibration-placement-request", event => {
      const { u, v } = event.detail || {};
      if (Number.isFinite(u) && Number.isFinite(v)) openPlacementDialog(u, v);
    });
  } else {
  scene.addEventListener("pointerdown", (event) => {
    if (scene.dataset.adminMasterplanEditing !== "true") return;
    if (event.target.closest?.(".map-marker-adjust-toolbar, .satellite-lot-context-widget, .map-lot-placement-dialog")) return;
    const editMode = scene.dataset.adminMasterplanEditMode || "markers";
    // Ctrl/Cmd prioriza o pan; Ctrl/Cmd + Shift gira a planta. Ambos também
    // funcionam quando o ponteiro começa sobre um círculo de lote.
    const rotating = Boolean((event.ctrlKey || event.metaKey) && event.shiftKey);
    const panning = Boolean((event.ctrlKey || event.metaKey) && !event.shiftKey);
    const resizeHandle = event.target.closest?.("[data-map-scale-handle]");
    const marker = editMode === "markers" && !panning && !rotating ? event.target.closest?.(".satellite-lot-plan-marker") : null;
    const plant = event.target.closest?.("[data-admin-masterplan-transform]");
    const markerLayer = marker?.closest(".satellite-lot-plan-markers") || scene.querySelector(".satellite-lot-plan-markers");
    // O SVG dos polígonos fica sobre a imagem da planta. Ele deve participar
    // do ajuste para que um clique em qualquer área do loteamento abra a
    // escolha do número, em vez de só funcionar sobre o raster da planta.
    const mapSurface = Boolean(markerLayer && scene.contains(event.target));
    if (!resizeHandle && !marker && !plant && !mapSurface) return;
    const frameFit = transform?.closest(".admin-masterplan-fit");
    const bounds = (markerLayer || frameFit)?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return;
    event.preventDefault();
    event.stopPropagation();
    if (resizeHandle) {
      resizeHandle.classList.add("is-dragging");
      try { resizeHandle.setPointerCapture(event.pointerId); } catch {}
      if (status) status.textContent = "Redimensionando a planta. Arraste a alça e solte para concluir.";
    }
    const frameFallback = { left: 0, top: 0, width: 0.25, height: 0.3, rotation: 0 };
    const initialFrame = globalThis.belavistaPublicMapFrameFromOverrides?.(frameFallback, scene.dataset.adminMasterplanFrame)
      ?? parse(scene.dataset.adminMasterplanFrame);
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    const update = (moveEvent) => {
      if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) > 5) moved = true;
      if (marker) {
        const point = globalThis.belavistaPublicMapDragPosition?.(moveEvent.clientX, moveEvent.clientY, bounds)
          ?? { u: clamp((moveEvent.clientX - bounds.left) / bounds.width, 0, 1), v: clamp((moveEvent.clientY - bounds.top) / bounds.height, 0, 1) };
        if (typeof marker.setMapPosition === "function") marker.setMapPosition({ ...point, zIndex: Number(marker.style.zIndex) || 0, manualPosition: point });
        else {
          marker.dataset.mapAdjustU = String(point.u);
          marker.dataset.mapAdjustV = String(point.v);
          marker.style.left = `${(point.u * 100).toFixed(4)}%`;
          marker.style.top = `${(point.v * 100).toFixed(4)}%`;
        }
        return;
      }
      const resizeSide = resizeHandle?.dataset.mapScaleHandle || "";
      const deltaX = moveEvent.clientX - start.x;
      const deltaY = moveEvent.clientY - start.y;
      const next = globalThis.belavistaPublicMapCalibrationFrameAfterDrag?.({
        initialFrame,
        deltaX,
        deltaY,
        boundsWidth: bounds.width,
        boundsHeight: bounds.height,
        resizeSide,
        rotating,
      }) ?? (resizeSide
        ? (() => {
            const dx = deltaX;
            const dy = deltaY;
            const angle = (Number(initialFrame.rotation || 0) * Math.PI) / 180;
            const localDx = dx * Math.cos(angle) + dy * Math.sin(angle);
            const localDy = -dx * Math.sin(angle) + dy * Math.cos(angle);
            const horizontal = resizeSide === "e" || resizeSide === "w";
            const vertical = resizeSide === "n" || resizeSide === "s";
            const fromLeft = resizeSide === "w";
            const fromTop = resizeSide === "n";
            const initialWidth = Number(initialFrame.width || 0.25);
            const initialHeight = Number(initialFrame.height || 0.3);
            const width = horizontal
              ? clamp(initialWidth + (fromLeft ? -localDx : localDx) / bounds.width, 0.04, 1.6)
              : initialWidth;
            const height = vertical
              ? clamp(initialHeight + (fromTop ? -localDy : localDy) / bounds.height, 0.04, 1.6)
              : initialHeight;
            const shiftX = horizontal ? (fromLeft ? -1 : 1) * (width - initialWidth) * bounds.width / 2 : 0;
            const shiftY = vertical ? (fromTop ? -1 : 1) * (height - initialHeight) * bounds.height / 2 : 0;
            return {
              ...initialFrame,
              left: clamp(Number(initialFrame.left || 0) + (initialWidth - width) / 2 + (shiftX * Math.cos(angle) - shiftY * Math.sin(angle)) / bounds.width, -1, 1),
              top: clamp(Number(initialFrame.top || 0) + (initialHeight - height) / 2 + (shiftX * Math.sin(angle) + shiftY * Math.cos(angle)) / bounds.height, -1, 1),
              width,
              height,
            };
          })()
        : rotating
        ? {
            ...initialFrame,
            rotation: normalizeAngle(Number(initialFrame.rotation || 0) + (deltaX / bounds.width) * 180),
          }
        : {
            ...initialFrame,
            left: clamp(Number(initialFrame.left) + deltaX / bounds.width, -1, 1),
            top: clamp(Number(initialFrame.top) + deltaY / bounds.height, -1, 1),
          });
      scene.dataset.adminMasterplanFrame = JSON.stringify(next);
      writeCalibrationFrame(next);
      scene.syncAdminMasterplanLotMarkersV1?.();
      const fit = scene.querySelector(".admin-masterplan-fit");
      if (fit) {
        fit.style.setProperty("--masterplan-left", `${next.left * 100}%`);
        fit.style.setProperty("--masterplan-top", `${next.top * 100}%`);
        fit.style.setProperty("--masterplan-width", `${next.width * 100}%`);
        fit.style.setProperty("--masterplan-height", `${next.height * 100}%`);
        fit.style.setProperty("--masterplan-rotation", `${Number(next.rotation || 0)}deg`);
      }
    };
    const finish = (finishEvent) => {
      update(finishEvent);
      window.removeEventListener("pointermove", update, true);
      window.removeEventListener("pointerup", finish, true);
      if (resizeHandle) {
        resizeHandle.classList.remove("is-dragging");
        try { resizeHandle.releasePointerCapture(finishEvent.pointerId); } catch {}
      }
      if (marker) {
        saveMarkerOverride(marker.dataset.lot, { u: Number(marker.dataset.mapAdjustU), v: Number(marker.dataset.mapAdjustV) });
        marker.dataset.mapAdjustSuppressClick = "true";
        console.info("[Aliança Park] marcador calibrado", { lotId: marker.dataset.lot, ...overrides[marker.dataset.lot] });
      } else if (editMode === "markers" && !resizeHandle && !panning && !rotating && !moved) {
        const markerLayer = scene.querySelector(".satellite-lot-plan-markers");
        const targetBounds = markerLayer?.getBoundingClientRect();
        if (!targetBounds?.width || !targetBounds?.height) return;
        const u = clamp((finishEvent.clientX - targetBounds.left) / targetBounds.width, 0, 1);
        const v = clamp((finishEvent.clientY - targetBounds.top) / targetBounds.height, 0, 1);
        openPlacementDialog(u, v);
      } else console.info("[Aliança Park] planta calibrada", parse(scene.dataset.adminMasterplanFrame));
    };
    window.addEventListener("pointermove", update, true);
    window.addEventListener("pointerup", finish, true);
  }, true);
  }
  return true;
};

if (!install()) new MutationObserver(() => install()).observe(document.documentElement, { childList: true, subtree: true });
