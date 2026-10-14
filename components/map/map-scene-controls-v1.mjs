export const installMapSceneControlsV1 = (
  MapScene,
  {
    ADMIN_STANDALONE_BASE_TILT_DEG_V1,
    MAP_CAMERA_VIEW,
    sceneTiltBoostForView,
    viewThemes,
  },
) => {
  MapScene.prototype.bindSceneControls = function () {
    if (this._sceneControlsBound) return;
    this._sceneControlsBound = true;
    this.dataset.mapControls = "connected";
    this.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest?.(
          "[data-scene-rotate],[data-scene-pan],[data-scene-zoom],[data-scene-tilt],[data-scene-overlay],[data-scene-selection],[data-map-tiles],[data-scene-fit],[data-scene-print-map]",
        );
        // map-scene também recebe data-scene-* para expor estado (zoom,
        // rotação etc.). Não trate o próprio mapa como se fosse um botão:
        // isso interceptava os cliques dos marcadores e de toda a cena.
        if (!button || button === this || !this.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();
        if (button.hasAttribute("data-scene-rotate")) {
          const value = button.dataset.sceneRotate;
          this.setSceneRotation(
            value === "reset" ? 0 : this.sceneManualRotation + Number(value),
            true,
          );
          this.dataset.mapControlAction = `rotate:${value}`;
          return;
        }
        if (button.hasAttribute("data-scene-pan")) {
          const value = button.dataset.scenePan;
          if (value === "reset") this.setScenePan(0, 0, true);
          else this.nudgeScenePan(value, true);
          this.dataset.mapControlAction = `pan:${value}`;
          return;
        }
        if (button.hasAttribute("data-scene-zoom")) {
          this.setSceneZoom(
            this.sceneManualZoom + Number(button.dataset.sceneZoom),
            true,
          );
          this.dataset.mapControlAction = `zoom:${button.dataset.sceneZoom}`;
          return;
        }
        if (button.hasAttribute("data-scene-tilt")) {
          this.setSceneTiltAdjust(
            this.sceneTiltAdjust + Number(button.dataset.sceneTilt),
            true,
          );
          this.dataset.mapControlAction = `tilt:${button.dataset.sceneTilt}`;
          return;
        }
        if (button.hasAttribute("data-scene-overlay")) {
          this.setStageOverlay(button.dataset.sceneOverlay, true);
          this.dataset.mapControlAction = `overlay:${button.dataset.sceneOverlay}`;
          return;
        }
        if (button.hasAttribute("data-scene-selection")) {
          this.setMapSelectionMode(button.dataset.sceneSelection || "progress");
          this.dataset.mapControlAction = `selection:${button.dataset.sceneSelection || "progress"}`;
          return;
        }
        if (button.hasAttribute("data-map-tiles")) {
          this.setMapTileMode(button.dataset.mapTiles, true);
          this.dataset.mapControlAction = `tiles:${button.dataset.mapTiles}`;
          return;
        }
        if (button.hasAttribute("data-scene-print-map")) {
          this.openMapCanvasPrintV1();
          this.dataset.mapControlAction = "print-map-pdf-interface";
          return;
        }
        this.fitSceneView(true);
        this.dataset.mapControlAction = "fit";
      },
      true,
    );
    this.addEventListener(
      "input",
      (event) => {
        const control = event.target.closest?.("[data-scene-tilt-range]");
        if (!control || !this.contains(control)) return;
        const base = this.isAdminStandaloneInteractiveV5370?.()
          ? ADMIN_STANDALONE_BASE_TILT_DEG_V1
          : this.hasAttribute("data-admin-shared-public-map")
            ? 22
            : (Number(viewThemes[MAP_CAMERA_VIEW]?.tilt) || 18) +
              sceneTiltBoostForView(MAP_CAMERA_VIEW);
        this.setSceneTiltAdjust(Number(control.value) - base, false);
        this.dataset.mapControlAction = `tilt:absolute:${control.value}`;
      },
      true,
    );
    this.syncSceneTiltControlV1?.();
  };
};
