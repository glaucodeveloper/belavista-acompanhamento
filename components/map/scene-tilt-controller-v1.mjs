const SCENE_TILT_CONFIG_V1 = Object.freeze([
  "ADMIN_STANDALONE_BASE_TILT_DEG_V1",
  "DEFAULT_SCENE_ZOOM",
  "MAP_CAMERA_VIEW",
  "MAX_SCENE_TILT",
  "MIN_SCENE_TILT",
  "SCENE_TILT_ADJUST_LIMIT",
]);

export const assertSceneTiltControllerDependenciesV1 = (MapScene, dependencies) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Scene tilt requires the existing MapScene constructor.");
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Scene tilt requires injected dependencies.");
  for (const key of SCENE_TILT_CONFIG_V1) {
    if (key === "MAP_CAMERA_VIEW") {
      if (typeof dependencies.config?.[key] !== "string" || !dependencies.config[key])
        throw new TypeError("Scene tilt requires config.MAP_CAMERA_VIEW.");
      continue;
    }
    if (!Number.isFinite(dependencies.config?.[key]))
      throw new TypeError(`Scene tilt requires numeric config.${key}.`);
  }
  if (typeof dependencies.sceneTiltBoostForView !== "function" || !dependencies.viewThemes?.assistant)
    throw new TypeError("Scene tilt requires camera theme services.");
  if (typeof dependencies.browser?.performanceNow !== "function" ||
      typeof dependencies.browser?.requestAnimationFrame !== "function")
    throw new TypeError("Scene tilt requires browser animation services.");
  return dependencies;
};

/** Install the effective tilt controller after navigation methods on MapScene. */
export const installSceneTiltControllerV1 = (MapScene, dependencies) => {
  assertSceneTiltControllerDependenciesV1(MapScene, dependencies);
  const {
    ADMIN_STANDALONE_BASE_TILT_DEG_V1,
    DEFAULT_SCENE_ZOOM,
    MAP_CAMERA_VIEW,
    MAX_SCENE_TILT,
    MIN_SCENE_TILT,
    SCENE_TILT_ADJUST_LIMIT,
  } = dependencies.config;
  const { performanceNow, requestAnimationFrame } = dependencies.browser;
  const { sceneTiltBoostForView, viewThemes } = dependencies;

  MapScene.prototype.setSceneTiltAdjust = function (value, animate = true) {
    const previousAdjust = Number(this.sceneTiltAdjust) || 0;
    const previousTiltValue = Number(this._sceneVisual?.tilt),
      previousTilt = Number.isFinite(previousTiltValue) ? previousTiltValue : 22;
    this.markAdminCameraInteracted?.();
    if (this.isAdminStandaloneInteractiveV5370?.()) {
      const base = ADMIN_STANDALONE_BASE_TILT_DEG_V1,
        previousStandaloneTilt = Number(this._adminStandaloneTiltV5370) || base,
        requestedAdjust = Math.max(
          -SCENE_TILT_ADJUST_LIMIT,
          Math.min(SCENE_TILT_ADJUST_LIMIT, Number(value) || 0),
        ),
        targetTilt = Math.max(
          MIN_SCENE_TILT,
          Math.min(
            MAX_SCENE_TILT,
            previousStandaloneTilt +
              (requestedAdjust - (Number(this.sceneTiltAdjust) || 0)),
          ),
        );
      this.sceneTiltAdjust = targetTilt - base;
      this.dataset.sceneTiltBounds = `${MIN_SCENE_TILT}–${MAX_SCENE_TILT}deg`;
      this.dataset.sceneTiltControl = "range + buttons · standalone";
      this.dataset.sceneTilt = `${Math.round(targetTilt)}deg`;
      this.setAdminStandaloneTiltV5370(targetTilt, animate);
      this.rememberMapView?.();
      return;
    }
    const view = MAP_CAMERA_VIEW;
    const theme = viewThemes[view] || viewThemes.assistant;
    const publicPresentation = this.isPublicCameraPreset();
    const base = this.hasAttribute("data-admin-shared-public-map")
      ? 22
      : (Number(theme.tilt) || 18) + sceneTiltBoostForView(view);
    const requestedAdjust = Math.max(
      -SCENE_TILT_ADJUST_LIMIT,
      Math.min(SCENE_TILT_ADJUST_LIMIT, Number(value) || 0),
    );
    const bounds = this.getSceneTiltBounds?.() || {
      min: MIN_SCENE_TILT,
      max: MAX_SCENE_TILT,
    };
    const targetTilt = publicPresentation
      ? 22
      : Math.max(
          bounds.min,
          Math.min(bounds.max, previousTilt + (requestedAdjust - previousAdjust)),
        );
    this.sceneTiltAdjust = publicPresentation ? 0 : targetTilt - base;
    this.dataset.sceneTiltBounds = `${bounds.min}–${bounds.max}deg`;
    this.dataset.sceneTiltControl = "ctrl-mouse";
    this.rememberMapView?.();
    this.dataset.sceneTilt = `${targetTilt}deg`;
    const current = this._sceneVisual || {
      tilt: targetTilt,
      rotation: this.sceneManualRotation || 0,
      scale: this.sceneManualZoom || DEFAULT_SCENE_ZOOM,
    };
    if (!animate) {
      this._sceneTransition = Symbol("manual-tilt");
      this.setSceneVisual(targetTilt, current.rotation, current.scale);
      return;
    }
    const started = performanceNow(),
      duration = 320,
      token = Symbol("manual-tilt");
    this._sceneTransition = token;
    const tick = (now) => {
      if (this._sceneTransition !== token) return;
      const t = Math.min(1, (now - started) / duration),
        e = t * t * (3 - 2 * t);
      this.setSceneVisual(
        current.tilt + (targetTilt - current.tilt) * e,
        current.rotation,
        current.scale,
      );
      if (t < 1) requestAnimationFrame(tick);
      else this.constrainScenePan("tilt-finish");
    };
    requestAnimationFrame(tick);
  };
  return MapScene;
};
