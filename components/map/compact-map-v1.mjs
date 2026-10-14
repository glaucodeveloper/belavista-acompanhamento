export const installCompactMapV1 = (
  MapScene,
  {
    compactMapMirrors,
    esc,
    getSharedMapScene,
    IntersectionObserver,
    requestAnimationFrame,
    stageOverlayKey,
    stageOverlayLabels,
    syncCompactMapMirrors,
    ZOOM_DRAG_SENSITIVITY,
    ResizeObserver,
  },
) => {
  Object.assign(MapScene.prototype, {
    renderCompact() {
      const stage = esc(this.getAttribute("data-stage") || "Etapa"),
        index = Number(this.getAttribute("data-map-index") || 0);
      this.dataset.mapInit = "compact-live";
      this.dataset.mapStage = stage;
      this.dataset.mapIndex = String(index);
      const overlay = stageOverlayKey(stage);
      this.dataset.overlayKey = overlay;
      const controls = this.hasAttribute("interactive")
        ? '<div class="compact-map-controls" aria-label="Controles do mapa"><button type="button" data-compact-map="zoom-out" aria-label="Afastar">−</button><button type="button" data-compact-map="zoom-in" aria-label="Aproximar">＋</button><button type="button" data-compact-map="tilt-down" aria-label="Reduzir inclinação">▿</button><button type="button" data-compact-map="tilt-up" aria-label="Aumentar inclinação">▵</button><button type="button" data-compact-map="rotate-left" aria-label="Girar à esquerda">↺</button><button type="button" data-compact-map="rotate-right" aria-label="Girar à direita">↻</button></div>'
        : "";
      this.innerHTML =
        '<canvas class="compact-map-canvas" aria-label="Vista 3D compartilhada da etapa ' +
        stage +
        '"></canvas><span class="compact-map-overlay overlay-' +
        overlay +
        '" aria-hidden="true"></span><span class="mini-map-caption"><small>MAPA 3D · ' +
        stageOverlayLabels[overlay] +
        "</small><b>" +
        stage +
        "</b></span>" +
        controls;
      compactMapMirrors.add(this);
      this._compactResizeObserver?.disconnect();
      if (ResizeObserver) {
        this._compactResizeObserver = new ResizeObserver((entries) => {
          if (!this._compactVisible) return;
          const rect = entries?.[0]?.contentRect;
          const key =
            String(Math.round(rect?.width || 0)) +
            "x" +
            String(Math.round(rect?.height || 0));
          if (this._compactObservedSize === key) return;
          this._compactObservedSize = key;
          if (this._compactResizeFrame) return;
          this._compactResizeFrame = requestAnimationFrame(() => {
            this._compactResizeFrame = 0;
            this.renderSharedMap();
          });
        });
        this._compactResizeObserver.observe(this);
      }
      // Os cards não instanciam outro GLB: aguardam o modelo mantido na cena
      // principal e só criam o renderer compacto quando de fato aparecem.
      this._compactVisible = false;
      this._compactVisibilityObserver?.disconnect();
      if (IntersectionObserver) {
        this._compactVisibilityObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            this._compactVisible = Boolean(entry?.isIntersecting);
            if (this._compactVisible) this.renderSharedMap();
          },
          { root: null, rootMargin: "160px", threshold: 0.01 },
        );
        this._compactVisibilityObserver.observe(this);
      } else {
        this._compactVisible = true;
        this.renderSharedMap();
      }
      if (this.hasAttribute("interactive")) this.bindCompactMapControls();
    },
    bindCompactMapControls() {
      if (this._compactControlsBound) return;
      this._compactControlsBound = true;
      this.addEventListener("click", (event) => {
        const button = event.target.closest?.("[data-compact-map]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        const source = getSharedMapScene(),
          action = button.dataset.compactMap;
        if (!source) return;
        if (action === "zoom-in")
          source.setSceneZoom(source.sceneManualZoom + 0.1, true);
        if (action === "zoom-out")
          source.setSceneZoom(source.sceneManualZoom - 0.1, true);
        if (action === "tilt-up")
          source.setSceneTiltAdjust(source.sceneTiltAdjust + 6, true);
        if (action === "tilt-down")
          source.setSceneTiltAdjust(source.sceneTiltAdjust - 6, true);
        if (action === "rotate-left")
          source.setSceneRotation(source.sceneManualRotation - 15, true);
        if (action === "rotate-right")
          source.setSceneRotation(source.sceneManualRotation + 15, true);
        syncCompactMapMirrors();
      });
      const canvas = this.querySelector(".compact-map-canvas");
      let down = null,
        last = null,
        mode = "";
      canvas?.addEventListener("contextmenu", (event) => event.preventDefault());
      canvas?.addEventListener(
        "wheel",
        (event) => {
          event.preventDefault();
          const source = getSharedMapScene();
          if (source) {
            source.setSceneZoomAt(
              source.sceneManualZoom +
                (event.deltaY < 0 ? 1 : -1) * (event.ctrlKey ? 0.025 : 0.07),
              event.clientX,
              event.clientY,
              false,
            );
            source.queueSceneBoundsCommit(
              event.ctrlKey ? "compact-ctrl-wheel" : "compact-wheel",
            );
            syncCompactMapMirrors();
          }
        },
        { passive: false },
      );
      canvas?.addEventListener("pointerdown", (event) => {
        const source = getSharedMapScene();
        if (!source) return;
        down = last = { x: event.clientX, y: event.clientY };
        mode =
          event.button === 2
            ? "rotate"
            : event.button === 0 && (event.shiftKey || event.ctrlKey)
              ? "zoom"
              : "pan";
        canvas.setPointerCapture?.(event.pointerId);
      });
      canvas?.addEventListener("pointermove", (event) => {
        if (!down || !last) return;
        const source = getSharedMapScene(),
          dx = event.clientX - last.x,
          dy = event.clientY - last.y;
        if (!source) return;
        if (mode === "rotate")
          source.setSceneRotation(source.sceneManualRotation + dx * 0.32, false);
        else if (mode === "zoom") {
          source.setSceneZoomAt(
            source.sceneManualZoom - dy * ZOOM_DRAG_SENSITIVITY,
            event.clientX,
            event.clientY,
            false,
          );
          source.queueSceneBoundsCommit("compact-drag-zoom");
          syncCompactMapMirrors();
        } else {
          // Converte o ponteiro do card para o NDC da cena principal. Assim o
          // mesmo raio/plano usado pelo mapa grande calcula o pan do widget,
          // respeitando zoom, inclinação e perspectiva em vez de usar pixels
          // crus que ficam acelerados depois do zoom.
          const sourceCanvas = source.querySelector(".three-overlay"),
            sourceRect = sourceCanvas?.getBoundingClientRect?.(),
            compactRect = canvas.getBoundingClientRect?.();
          const toSourcePoint = (x, y) =>
            sourceRect && compactRect && compactRect.width && compactRect.height
              ? {
                  x:
                    sourceRect.left +
                    ((x - compactRect.left) / compactRect.width) *
                      sourceRect.width,
                  y:
                    sourceRect.top +
                    ((y - compactRect.top) / compactRect.height) *
                      sourceRect.height,
                }
              : null;
          const fromPoint = toSourcePoint(last.x, last.y),
            toPoint = toSourcePoint(event.clientX, event.clientY);
          const d =
            fromPoint && toPoint
              ? source.screenDragPanDelta(
                  fromPoint.x,
                  fromPoint.y,
                  toPoint.x,
                  toPoint.y,
                )
              : source.screenDragPanDeltaFromVector?.(dx, dy) || {
                  x: -dx,
                  y: dy,
                };
          const p = source.sceneManualPan || { x: 0, y: 0 };
          source.setScenePan(
            p.x + (Number(d?.x) || 0),
            p.y + (Number(d?.y) || 0),
            false,
          );
        }
        last = { x: event.clientX, y: event.clientY };
        syncCompactMapMirrors();
      });
      const release = (event) => {
        if (event && canvas?.hasPointerCapture?.(event.pointerId))
          canvas.releasePointerCapture(event.pointerId);
        if (down) getSharedMapScene()?.constrainScenePan("compact-release");
        down = null;
        last = null;
        mode = "";
      };
      canvas?.addEventListener("pointerup", release);
      canvas?.addEventListener("pointercancel", release);
    },
  });
};
