export const installStaticSatelliteGesturesV1 = (
  MapScene,
  { ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 },
) => {
  MapScene.prototype.bindStaticSatelliteMapGesturesV1 = function () {
    if (
      !this.hasAttribute("data-public-static-only") ||
      this._staticSatelliteGesturesBoundV1
    )
      return;
    this._staticSatelliteGesturesBoundV1 = true;
    this.classList.remove("static-lot-markers-visible");
    this.dataset.staticMapGestures = "drag-pan + wheel + shift-drag-zoom + pinch-zoom";
    let zoom = 1,
      panX = 0,
      panY = 0,
      drag = null;
    const activeTouches = new Map();
    let pinch = null;
    let suppressDraggedClick = null;
    const minZoom = 0.92,
      maxZoom = this.isAdminPublicMapV1?.() ? 12 : 4;
    const publishStaticView = () => {
      this.style.setProperty("--static-map-zoom", String(zoom));
      this.style.setProperty("--static-map-pan-x", String(panX) + "px");
      this.style.setProperty("--static-map-pan-y", String(panY) + "px");
      this.dataset.staticMapZoom = String(Math.round(zoom * 100)) + "%";
      this.dataset.staticMapPan = String(Math.round(panX)) + "," + String(Math.round(panY));
      this.syncSatelliteLotContextWidgetScaleV1?.(zoom);
      this.classList.toggle("static-lot-markers-visible", zoom >= 1.5);
      this.querySelectorAll(".satellite-lot-plan-marker").forEach((marker) => {
        marker.tabIndex = zoom >= 1.5 ? 0 : -1;
        marker.setAttribute("aria-hidden", zoom >= 1.5 ? "false" : "true");
      });
    };
    const applyView = (nextZoom, anchorX, anchorY) => {
      const rect = this.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const previousZoom = zoom,
        targetZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom)),
        offsetX = anchorX - (rect.left + rect.width / 2),
        offsetY = anchorY - (rect.top + rect.height / 2),
        ratio = targetZoom / previousZoom;
      panX = offsetX - (offsetX - panX) * ratio;
      panY = offsetY - (offsetY - panY) * ratio;
      const limitX = (rect.width * Math.max(0, targetZoom - 1)) / 2,
        limitY = (rect.height * Math.max(0, targetZoom - 1)) / 2;
      panX = Math.max(-limitX, Math.min(limitX, panX));
      panY = Math.max(-limitY, Math.min(limitY, panY));
      zoom = targetZoom;
      publishStaticView();
    };
    this.fitStaticSatelliteMasterplanV1 = () => {
      if (this.dataset.staticMapInitialFit === "masterplan-centered-with-margin")
        return false;
      const rect = this.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      let frame = { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 };
      try {
        frame = { ...frame, ...JSON.parse(this.dataset.adminMasterplanFrame || "{}") };
      } catch {}
      const side = Math.max(rect.width, rect.height);
      const angle = (Number(frame.rotation || 0) * Math.PI) / 180;
      const visualWidth =
        Math.abs(Number(frame.width) * Math.cos(angle)) +
        Math.abs(Number(frame.height) * Math.sin(angle));
      const visualHeight =
        Math.abs(Number(frame.width) * Math.sin(angle)) +
        Math.abs(Number(frame.height) * Math.cos(angle));
      const fitMargin = 0.88;
      const targetZoom = Math.max(
        minZoom,
        Math.min(
          maxZoom,
          (rect.width * fitMargin) / Math.max(1, side * visualWidth),
          (rect.height * fitMargin) / Math.max(1, side * visualHeight),
        ),
      );
      const frameCenterX =
        (rect.width - side) / 2 +
        (Number(frame.left) + Number(frame.width) / 2) * side;
      const frameCenterY =
        (rect.height - side) / 2 +
        (Number(frame.top) + Number(frame.height) / 2) * side;
      const limitX = (rect.width * Math.max(0, targetZoom - 1)) / 2;
      const limitY = (rect.height * Math.max(0, targetZoom - 1)) / 2;
      zoom = targetZoom;
      panX = Math.max(
        -limitX,
        Math.min(limitX, (rect.width / 2 - frameCenterX) * zoom),
      );
      panY = Math.max(
        -limitY,
        Math.min(limitY, (rect.height / 2 - frameCenterY) * zoom),
      );
      this.dataset.staticMapInitialFit = "masterplan-centered-with-margin";
      this.dataset.staticMapFitMargin = "12%";
      publishStaticView();
      return true;
    };
    this.addEventListener(
      "wheel",
      (event) => {
        // No /leads a roda conduz a narrativa e o zoom progressivo do mapa.
        if (globalThis.document?.body?.classList.contains("public-leads-page")) return;
        if (event.defaultPrevented) return;
        const rect = this.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom ||
          event.target?.closest?.(
            'input,select,textarea,[contenteditable="true"]',
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const step = Math.min(
          0.22,
          Math.max(0.035, Math.abs(Number(event.deltaY) || 0) * (event.ctrlKey ? 0.00035 : 0.0012)),
        );
        applyView(
          zoom + (event.deltaY < 0 ? step : -step),
          event.clientX,
          event.clientY,
        );
        this.dataset.mapGesture = event.ctrlKey
          ? "ctrl-wheel-zoom"
          : "wheel-zoom";
      },
      { capture: true, passive: false },
    );
    this.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activeTouches.size === 2) {
          const [first, second] = [...activeTouches.values()];
          pinch = { distance: Math.hypot(second.x - first.x, second.y - first.y), zoom };
          drag = null;
          this.classList.remove("is-static-map-panning");
          this.dataset.mapGesture = "pinch-zoom";
          this.setPointerCapture?.(event.pointerId);
          event.preventDefault();
          return;
        }
      }
      const lotTarget = event.pointerType === "touch" &&
        !this.classList.contains("is-admin-masterplan-editing") &&
        event.target?.closest?.(".satellite-lot-plan-marker,.satellite-lot-hit-area,.satellite-common-area-hit-area");
      if (
        event.button !== 0 ||
        (!lotTarget && event.target?.closest?.("button,a,input,select,textarea,[role=\"button\"],[contenteditable=\"true\"]"))
      )
        return;
      if (!lotTarget) event.preventDefault();
      drag = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        originX: event.clientX,
        originY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        mode: event.shiftKey || event.ctrlKey ? "zoom" : "pan",
        pending: Boolean(lotTarget),
        moved: false,
      };
      if (!drag.pending) {
        this.dataset.mapGesture = drag.mode === "zoom" ? "shift-drag-zoom" : "pan";
        this.classList.toggle("is-static-map-panning", drag.mode === "pan");
        this.setPointerCapture?.(event.pointerId);
      }
    });
    this.addEventListener("pointermove", (event) => {
      if (activeTouches.has(event.pointerId)) {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pinch && activeTouches.size >= 2) {
          const [first, second] = [...activeTouches.values()];
          const distance = Math.hypot(second.x - first.x, second.y - first.y);
          if (pinch.distance > 0) applyView(
            pinch.zoom * distance / pinch.distance,
            (first.x + second.x) / 2,
            (first.y + second.y) / 2,
          );
          event.preventDefault();
          return;
        }
      }
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) >= 7)
        drag.moved = true;
      if (drag.pending) {
        if (!drag.moved) return;
        drag.pending = false;
        this.dataset.mapGesture = "pan";
        this.classList.add("is-static-map-panning");
        this.setPointerCapture?.(event.pointerId);
      }
      if (event.pointerType === "touch") event.preventDefault();
      if (drag.mode === "zoom" && Math.abs(dy) > 0) {
        applyView(zoom - dy * 0.008, event.clientX, event.clientY);
      } else if (drag.mode === "pan" && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
        const rect = this.getBoundingClientRect();
        const limitX = (rect.width * Math.max(0, zoom - 1)) / 2;
        const limitY = (rect.height * Math.max(0, zoom - 1)) / 2;
        panX = Math.max(-limitX, Math.min(limitX, panX + dx));
        panY = Math.max(-limitY, Math.min(limitY, panY + dy));
        this.style.setProperty("--static-map-pan-x", String(panX) + "px");
        this.style.setProperty("--static-map-pan-y", String(panY) + "px");
        this.dataset.staticMapPan = String(Math.round(panX)) + "," + String(Math.round(panY));
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
    });
    this.addEventListener("click", (event) => {
      if (!suppressDraggedClick || Date.now() > suppressDraggedClick.until) return;
      if (event.detail === 0 || Math.hypot(
        event.clientX - suppressDraggedClick.x,
        event.clientY - suppressDraggedClick.y,
      ) > 24) return;
      suppressDraggedClick = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    const endDrag = (event) => {
      activeTouches.delete(event.pointerId);
      if (drag?.pointerId === event.pointerId) {
        if (event.type === "pointerup" && drag.pointerType === "touch" && drag.moved)
          suppressDraggedClick = { x: event.clientX, y: event.clientY, until: Date.now() + 400 };
        drag = null;
      }
      if (this.hasPointerCapture?.(event.pointerId))
        this.releasePointerCapture?.(event.pointerId);
      if (pinch && activeTouches.size === 1) {
        pinch = null;
        const [pointerId, position] = activeTouches.entries().next().value;
        drag = { pointerId, pointerType: "touch", originX: position.x, originY: position.y,
          x: position.x, y: position.y, mode: "pan", pending: false, moved: false };
        this.dataset.mapGesture = "pan";
        this.classList.add("is-static-map-panning");
        this.setPointerCapture?.(pointerId);
      } else if (activeTouches.size < 2 && !drag) {
        pinch = null;
        this.classList.remove("is-static-map-panning");
        delete this.dataset.mapGesture;
      }
    };
    this.addEventListener("pointerup", endDrag);
    this.addEventListener("pointercancel", endDrag);
  };
};
