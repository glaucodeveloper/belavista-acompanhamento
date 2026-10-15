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
    this.dataset.staticMapGestures = "drag-pan + wheel + shift-drag-zoom";
    let zoom = 1,
      panX = 0,
      panY = 0,
      drag = null;
    const minZoom = 0.92,
      maxZoom = 4;
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
        if (document.body.classList.contains("public-leads-page")) return;
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
      if (
        event.button !== 0 ||
        event.target?.closest?.("button,a,input,select,textarea,[role=\"button\"],[contenteditable=\"true\"]")
      )
        return;
      event.preventDefault();
      drag = {
        x: event.clientX,
        y: event.clientY,
        mode: event.shiftKey || event.ctrlKey ? "zoom" : "pan",
      };
      this.dataset.mapGesture =
        drag.mode === "zoom" ? "shift-drag-zoom" : "pan";
      this.classList.toggle("is-static-map-panning", drag.mode === "pan");
      this.setPointerCapture?.(event.pointerId);
    });
    this.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
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
    const endDrag = (event) => {
      if (!drag) return;
      drag = null;
      if (this.hasPointerCapture?.(event.pointerId))
        this.releasePointerCapture?.(event.pointerId);
      this.classList.remove("is-static-map-panning");
      delete this.dataset.mapGesture;
    };
    this.addEventListener("pointerup", endDrag);
    this.addEventListener("pointercancel", endDrag);
  };
};
