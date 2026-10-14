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

const install = () => {
  const scene = document.querySelector("map-scene[data-admin-masterplan-overlay]");
  const toggle = document.querySelector("[data-map-marker-adjust-toggle]");
  if (!scene || !toggle || toggle.dataset.dragCalibrationBound === "true") return Boolean(scene);
  toggle.dataset.dragCalibrationBound = "true";
  const mapToggle = document.querySelector("[data-map-frame-adjust-toggle]");
  const reset = document.querySelector("[data-map-marker-adjust-reset]");
  const status = document.querySelector("[data-map-marker-adjust-status]");
  const transform = scene.querySelector("[data-admin-masterplan-transform]");
  const image = transform?.querySelector("img");
  const scaleHandleSides = ["n", "e", "s", "w"];
  if (transform && !transform.querySelector("[data-map-scale-handle]")) {
    scaleHandleSides.forEach((side) => {
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
    toggle.setAttribute("aria-pressed", String(editing && mode === "markers"));
    mapToggle?.setAttribute("aria-pressed", String(editing && mode === "map"));
    toggle.textContent = editing && mode === "markers" ? "Concluir círculos" : "Ajustar círculos";
    if (mapToggle) mapToggle.textContent = editing && mode === "map" ? "Concluir mapa" : "Ajustar mapa";
    if (reset) reset.hidden = !editing;
    if (status) status.textContent = editing
      ? mode === "markers"
        ? "Clique na planta para posicionar um número; arraste um círculo para refinar; Ctrl + arrastar move a planta; Ctrl + Shift + arrastar gira; use as quatro laterais para escalar."
        : "Arraste a planta para ajustar sua posição; Ctrl + Shift + arrastar gira; use as quatro alças laterais para escalar."
      : "Ajuste concluído. Coordenadas registradas no console.";
    if (!editing) console.info("[Aliança Park] calibração do mapa", {
      frame: parse(scene.dataset.adminMasterplanFrame),
      markers: parse(localStorage.getItem(MARKERS_KEY)),
    });
  };
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setEditing(scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "markers", "markers");
  }, true);
  mapToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setEditing(scene.dataset.adminMasterplanEditing !== "true" || scene.dataset.adminMasterplanEditMode !== "map", "map");
  }, true);
  reset?.addEventListener("click", () => {
    localStorage.removeItem(MARKERS_KEY);
    scene.querySelectorAll(".satellite-lot-plan-marker[data-map-adjust-u]").forEach((marker) => {
      delete marker.dataset.mapAdjustU;
      delete marker.dataset.mapAdjustV;
    });
    scene.syncAdminMasterplanLotMarkersV1?.();
  }, true);
  const placementDialog = document.createElement("form");
  placementDialog.className = "map-lot-placement-dialog";
  placementDialog.hidden = true;
  placementDialog.innerHTML = `<label>Número do lote<input name="lotNumber" inputmode="numeric" autocomplete="off" placeholder="Ex.: 001" required></label><div><button type="button" data-map-lot-placement-cancel>Cancelar</button><button type="submit">Posicionar</button></div>`;
  scene.append(placementDialog);
  const closePlacementDialog = () => {
    placementDialog.hidden = true;
    delete placementDialog.dataset.u;
    delete placementDialog.dataset.v;
  };
  placementDialog.querySelector("[data-map-lot-placement-cancel]")?.addEventListener("click", closePlacementDialog);
  placementDialog.addEventListener("submit", (event) => {
    event.preventDefault();
    const rawNumber = new FormData(placementDialog).get("lotNumber");
    const lotNumber = String(rawNumber || "").match(/\d+/)?.[0]?.padStart(3, "0");
    const targetMarker = lotNumber
      ? scene.querySelector(`.satellite-lot-plan-marker[data-lot="Lote_${lotNumber}"]`)
      : null;
    const u = Number(placementDialog.dataset.u);
    const v = Number(placementDialog.dataset.v);
    if (!targetMarker || !Number.isFinite(u) || !Number.isFinite(v)) {
      if (status) status.textContent = `Lote ${lotNumber || rawNumber || "informado"} não encontrado entre os marcadores ativos.`;
      return;
    }
    targetMarker.dataset.mapAdjustU = String(u);
    targetMarker.dataset.mapAdjustV = String(v);
    targetMarker.style.left = `${(u * 100).toFixed(4)}%`;
    targetMarker.style.top = `${(v * 100).toFixed(4)}%`;
    const overrides = parse(localStorage.getItem(MARKERS_KEY));
    overrides[targetMarker.dataset.lot] = { u, v };
    localStorage.setItem(MARKERS_KEY, JSON.stringify(overrides));
    if (status) status.textContent = `Lote ${lotNumber} posicionado. Arraste para refinar ou clique em Concluir ajuste.`;
    console.info("[Aliança Park] marcador posicionado por clique", { lotId: targetMarker.dataset.lot, u, v });
    closePlacementDialog();
  });
  const openPlacementDialog = (u, v) => {
    placementDialog.dataset.u = String(u);
    placementDialog.dataset.v = String(v);
    placementDialog.hidden = false;
    placementDialog.elements.lotNumber.value = "";
    placementDialog.elements.lotNumber.focus();
  };
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
    const initialFrame = parse(scene.dataset.adminMasterplanFrame);
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    const update = (moveEvent) => {
      if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) > 5) moved = true;
      if (marker) {
        const u = clamp((moveEvent.clientX - bounds.left) / bounds.width, 0, 1);
        const v = clamp((moveEvent.clientY - bounds.top) / bounds.height, 0, 1);
        marker.dataset.mapAdjustU = String(u);
        marker.dataset.mapAdjustV = String(v);
        marker.style.left = `${(u * 100).toFixed(4)}%`;
        marker.style.top = `${(v * 100).toFixed(4)}%`;
        return;
      }
      const resizeSide = resizeHandle?.dataset.mapScaleHandle || "";
      const next = resizeSide
        ? (() => {
            const dx = moveEvent.clientX - start.x;
            const dy = moveEvent.clientY - start.y;
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
            rotation: normalizeAngle(Number(initialFrame.rotation || 0) + ((moveEvent.clientX - start.x) / bounds.width) * 180),
          }
        : {
            ...initialFrame,
            left: clamp(Number(initialFrame.left) + (moveEvent.clientX - start.x) / bounds.width, -1, 1),
            top: clamp(Number(initialFrame.top) + (moveEvent.clientY - start.y) / bounds.height, -1, 1),
          };
      scene.dataset.adminMasterplanFrame = JSON.stringify(next);
      localStorage.setItem(FRAME_KEY, JSON.stringify(next));
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
        const overrides = parse(localStorage.getItem(MARKERS_KEY));
        overrides[marker.dataset.lot] = { u: Number(marker.dataset.mapAdjustU), v: Number(marker.dataset.mapAdjustV) };
        localStorage.setItem(MARKERS_KEY, JSON.stringify(overrides));
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
  return true;
};

if (!install()) new MutationObserver(() => install()).observe(document.documentElement, { childList: true, subtree: true });
