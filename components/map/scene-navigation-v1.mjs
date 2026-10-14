const SCENE_NAVIGATION_METHODS_V1 = Object.freeze(["getSceneOrbitPivot","isAdminOrthographicMapV1","configureOrthographicCameraV1","configurePerspectiveCamera","applySceneTransformAnchor","centerModelProjection","setTheme","setSceneVisual","applySceneView","setSceneRotation","getScenePanBounds","clampScenePan","queueSceneBoundsCommit","constrainScenePan","screenPointOnMapPlane","screenDragPanDelta","screenDragPanDeltaFromVector","applyScreenPanFromPointer","setScenePan","nudgeScenePan","setSceneZoom","setSceneZoomAt","getSceneTiltBounds","clampSceneTilt"]);
const SCENE_NAVIGATION_CONFIG_V1 = Object.freeze(["ADMIN_FIXED_MAP_ROTATION_DEG","DASHBOARD_PAN_BOUNDING_SCREEN_RATIO","DASHBOARD_PAN_SAFETY","DEFAULT_SCENE_ZOOM","DEFAULT_TILT_BOOST","MAP_CAMERA_VIEW","MAX_SCENE_TILT","MAX_SCENE_ZOOM","MIN_SCENE_TILT","MIN_SCENE_ZOOM","SCENE_MAP_Z","SCENE_PAN_SAFETY","SCENE_PUBLIC_PAN_SAFETY","SCENE_SURFACE_SCALE","SCENE_TILT_ADJUST_LIMIT","SCENE_TILT_ZOOM_OUT_FACTOR"]);

export const assertSceneNavigationDependenciesV1 = (MapScene, dependencies) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Scene navigation requires the existing MapScene constructor.");
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Scene navigation requires injected dependencies.");
  for (const key of SCENE_NAVIGATION_CONFIG_V1) {
    if (key === "MAP_CAMERA_VIEW") {
      if (typeof dependencies.config?.[key] !== "string" || !dependencies.config[key])
        throw new TypeError("Scene navigation requires config.MAP_CAMERA_VIEW.");
      continue;
    }
    if (!Number.isFinite(dependencies.config?.[key]))
      throw new TypeError("Scene navigation requires numeric config." + key + ".");
  }
  if (typeof dependencies.sceneTiltBoostForView !== "function" || !dependencies.viewThemes?.assistant)
    throw new TypeError("Scene navigation requires the camera theme services.");
  for (const method of ["get", "update"])
    if (typeof dependencies.appStore?.[method] !== "function")
      throw new TypeError("Scene navigation requires appStore." + method + "().");
  for (const method of ["performanceNow", "requestAnimationFrame", "setTimeout", "clearTimeout"])
    if (typeof dependencies.browser?.[method] !== "function")
      throw new TypeError("Scene navigation requires browser." + method + "().");
  return dependencies;
};

export const installSceneNavigationV1 = (MapScene, dependencies) => {
  assertSceneNavigationDependenciesV1(MapScene, dependencies);
  const { config, appStore, browser, sceneTiltBoostForView, viewThemes } = dependencies;
  const { ADMIN_FIXED_MAP_ROTATION_DEG, DASHBOARD_PAN_BOUNDING_SCREEN_RATIO, DASHBOARD_PAN_SAFETY, DEFAULT_SCENE_ZOOM, DEFAULT_TILT_BOOST, MAP_CAMERA_VIEW, MAX_SCENE_TILT, MAX_SCENE_ZOOM, MIN_SCENE_TILT, MIN_SCENE_ZOOM, SCENE_MAP_Z, SCENE_PAN_SAFETY, SCENE_PUBLIC_PAN_SAFETY, SCENE_SURFACE_SCALE, SCENE_TILT_ADJUST_LIMIT, SCENE_TILT_ZOOM_OUT_FACTOR } = config;
  const { performanceNow, requestAnimationFrame: requestFrame, setTimeout: scheduleTimer, clearTimeout: clearTimer } = browser;
  const SceneNavigationMethodsV1 = class {
  getSceneOrbitPivot(targetX, targetY) {
    const host = this.querySelector(".map-host");
    const fallbackX = Number(targetX) || (host?.clientWidth || 2) / 2,
      fallbackY = Number(targetY) || (host?.clientHeight || 2) / 2;
    const shared = this.sceneSharedOrigin;
    // sceneSharedOrigin é o centro do footprint compartilhado pelo raster, o
    // GLB, os markers e o relevo. O pan fica fora deste pivô de órbita: assim
    // ele continua deslocando a cena, mas não muda a inclinação nem cria um
    // segundo eixo de rotação quando o usuário gira o mapa.
    if (
      Number.isFinite(Number(shared?.x)) &&
      Number.isFinite(Number(shared?.y))
    ) {
      return {
        x: Number(shared.x),
        y: Number(shared.y),
        z: Number(this.mapSurface?.position?.z) || SCENE_MAP_Z,
        source: "shared-terrain-origin",
      };
    }
    // Durante a primeira montagem o centro compartilhado ainda pode não ter
    // sido calculado. O centro do modelo fornece o mesmo ponto no espaço de
    // mundo sem bloquear o primeiro frame do canvas.
    if (this.THREE && this.sceneStage && this.masterplanModel) {
      try {
        this.sceneStage.updateMatrixWorld(true);
        this.masterplanModel.updateWorldMatrix?.(true, true);
        const bounds = new this.THREE.Box3().setFromObject(
          this.masterplanModel,
        );
        if (!bounds.isEmpty()) {
          const center = bounds.getCenter(new this.THREE.Vector3());
          return {
            x: center.x,
            y: center.y,
            z: Number(this.mapSurface?.position?.z) || SCENE_MAP_Z,
            source: "masterplan-footprint-center",
          };
        }
      } catch {}
    }
    return {
      x: fallbackX,
      y: fallbackY,
      z: Number(this.mapSurface?.position?.z) || SCENE_MAP_Z,
      source: "viewport-fallback",
    };
  }
  isAdminOrthographicMapV1() {
    return this.hasAttribute("data-admin-shared-public-map");
  }
  configureOrthographicCameraV1(
    w,
    h,
    targetX = (Number(w) || 2) / 2,
    targetY = (Number(h) || 2) / 2,
  ) {
    if (!this.camera) return;
    const width = Math.max(2, Number(w) || 2),
      height = Math.max(2, Number(h) || 2),
      distance = Math.max(width, height) * 2.25;
    const halfWidth = width / 2,
      halfHeight = height / 2;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.near = 0.1;
    this.camera.far = 10000;
    this.camera.zoom = 1;
    const pivot = this.getSceneOrbitPivot(targetX, targetY),
      visual = this._sceneVisual || {},
      visualTilt = Number(visual.tilt),
      tilt = this.clampSceneTilt(
        Number.isFinite(visualTilt) ? visualTilt : DEFAULT_TILT_BOOST,
      ),
      heading = ((Number(visual.rotation) || 0) * Math.PI) / 180,
      elevation = (Math.max(0.5, Math.min(89.5, 90 - tilt)) * Math.PI) / 180,
      groundDistance = distance * Math.cos(elevation),
      pivotZ = Number(pivot.z) || SCENE_MAP_Z;
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(
      pivot.x + Math.sin(heading) * groundDistance,
      pivot.y + Math.cos(heading) * groundDistance,
      pivotZ + distance * Math.sin(elevation),
    );
    this.camera.lookAt(pivot.x, pivot.y, pivotZ);
    this.camera.updateProjectionMatrix();
    this.sceneVisualAnchor = { x: pivot.x, y: pivot.y, z: pivotZ };
    this.dataset.sceneOrbitPivot = `${pivot.source} · ${Math.round(pivot.x)},${Math.round(pivot.y)},${pivotZ.toFixed(2)}`;
    this.dataset.sceneTiltAnchor = `terrain-pivot · ${Math.round(pivot.x)},${Math.round(pivot.y)}`;
    this.dataset.cameraProjection = "orthographic";
    this.dataset.cameraProjectionMode = "parallel";
    this.dataset.cameraDistance = String(Math.round(distance));
    this.dataset.sceneTiltFrame =
      "orthographic orbit · constant ground inclination";
    this.dataset.sceneRotationBehavior =
      "horizontal orbit · fixed pitch · terrain pivot";
  }
  configurePerspectiveCamera(
    w,
    h,
    targetX = (Number(w) || 2) / 2,
    targetY = (Number(h) || 2) / 2,
  ) {
    if (!this.camera) return;
    if (this.isAdminOrthographicMapV1()) {
      this.configureOrthographicCameraV1(w, h, targetX, targetY);
      return;
    }
    const width = Math.max(2, Number(w) || 2),
      height = Math.max(2, Number(h) || 2),
      distance = Math.max(width, height) * 1.55;
    this.camera.aspect = width / height;
    this.camera.fov = 34;
    this.camera.near = 0.1;
    this.camera.far = 10000;
    // A rotação é uma órbita no plano horizontal ao redor do footprint real.
    // A inclinação é convertida uma única vez em elevação da câmera e não é
    // alterada pelo heading. O stage permanece neutro para mapa, GLB, terreno
    // e markers continuarem com o mesmo plano de solo.
    const pivot = this.getSceneOrbitPivot(targetX, targetY),
      visual = this._sceneVisual || {},
      visualTilt = Number(visual.tilt),
      tilt = this.clampSceneTilt(
        Number.isFinite(visualTilt) ? visualTilt : DEFAULT_TILT_BOOST,
      ),
      heading = ((Number(visual.rotation) || 0) * Math.PI) / 180,
      elevation = (Math.max(0.5, Math.min(89.5, 90 - tilt)) * Math.PI) / 180,
      groundDistance = distance * Math.cos(elevation),
      pivotZ = Number(pivot.z) || SCENE_MAP_Z;
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(
      pivot.x + Math.sin(heading) * groundDistance,
      pivot.y + Math.cos(heading) * groundDistance,
      pivotZ + distance * Math.sin(elevation),
    );
    this.camera.lookAt(pivot.x, pivot.y, pivotZ);
    this.camera.updateProjectionMatrix();
    // O mesmo ponto é usado no lookAt e na origem visual. Isso impede que o
    // giro abra uma lacuna no topo quando o mapa estiver inclinado.
    this.sceneVisualAnchor = { x: pivot.x, y: pivot.y, z: pivotZ };
    this.dataset.sceneOrbitPivot = `${pivot.source} · ${Math.round(pivot.x)},${Math.round(pivot.y)},${pivotZ.toFixed(2)}`;
    this.dataset.sceneTiltAnchor = `terrain-pivot · ${Math.round(pivot.x)},${Math.round(pivot.y)}`;
    this.dataset.cameraProjection = "perspective-orbit";
    this.dataset.cameraProjectionMode = "perspective";
    this.dataset.cameraDistance = String(Math.round(distance));
    this.dataset.sceneTiltFrame = "camera orbit · constant ground inclination";
    this.dataset.sceneRotationBehavior =
      "horizontal orbit · fixed pitch · terrain pivot";
  }
  applySceneTransformAnchor(tilt, rotation, scale) {
    if (!this.sceneStage || !this.THREE) return;
    const host = this.querySelector(".map-host"),
      anchor = this.sceneVisualAnchor || {
        x: (host?.clientWidth || 2) / 2,
        y: (host?.clientHeight || 2) / 2,
        z: 0,
      },
      origin = this.sceneTransformOrigin || this.sceneSharedOrigin || anchor;
    // Pan é a única translação do mundo. Inclinação e heading pertencem à
    // câmera; manter o stage neutro impede que raster e GLB assumam eixos ou
    // pivôs diferentes durante a rotação.
    this.sceneStage.position.set(
      Number(origin.x) || anchor.x,
      Number(origin.y) || anchor.y,
      SCENE_MAP_Z,
    );
    this.dataset.sceneTiltAnchor = `camera pivot · heading ${Math.round(Number(rotation) || 0)}° · ${Math.round(anchor.x)},${Math.round(anchor.y)}`;
  }
  centerModelProjection() {
    this.dataset.modelCenterProjection = "started";
    if (
      !this.THREE ||
      !this.camera ||
      !this.modelGroup ||
      !this.masterplanModel
    ) {
      this.dataset.modelCenterProjection = `skipped · THREE:${Boolean(this.THREE)} camera:${Boolean(this.camera)} group:${Boolean(this.modelGroup)} model:${Boolean(this.masterplanModel)}`;
      return;
    }
    // Mapa e GLB usam a mesma origem de cena. O modelo já é centralizado no
    // plano XY nativo do arquivo durante o carregamento; portanto qualquer
    // "correção" de tela baseada em NDC introduz paralaxe artificial quando a
    // cena inclina e desloca o loteamento para um canto. Mantemos a âncora no
    // centro real do footprint, sem mover o DOM nem separar o GLB do mapa.
    this.modelGroup.position.set(0, 0, 0);
    this.modelGroup.updateMatrixWorld(true);
    this.sceneStage?.updateMatrixWorld(true);
    const bounds = new this.THREE.Box3().setFromObject(this.masterplanModel),
      center = bounds.getCenter(new this.THREE.Vector3()),
      base = new this.THREE.Vector3(center.x, center.y, bounds.min.z),
      projected = base.clone().project(this.camera);
    this.dataset.modelOffset = "0,0";
    this.dataset.modelProjectedDrift = `${(projected.x * 100).toFixed(3)},${(projected.y * 100).toFixed(3)}`;
    this.dataset.modelProjectedCenter = `${projected.x.toFixed(3)},${projected.y.toFixed(3)}`;
    this.dataset.modelAnchorPoint = "shared XY footprint center";
    this.dataset.modelCenterProjection = "shared-scene-center";
    this.dataset.mapModelAnchor =
      "shared scene origin · center of GLB footprint";
  }
  setTheme(view) {
    const theme = viewThemes[view] || viewThemes.assistant;
    this.dataset.tint = theme.tint;
    if (this.modelGroup) {
      this.modelGroup.rotation.set(0, 0, 0);
      this.modelGroup.visible = true;
    }
    const changingView = Boolean(this._themeView && this._themeView !== view);
    this.applySceneView(view, changingView);
    this._themeView = view;
    // Keep the geographic surface mounted while the SPA changes pages.
    // Leaflet navigation here emitted move/resize events and rebuilt the
    // shared map texture on every transition, making the map appear to reload.
    this._lastTheme = view;
    this.classList.remove("theme-enter");
    this.dataset.themeTilt = `${theme.tilt}deg`;
    const label = {
      assistant: "Execução atual",
      map: "Mapa geral",
      stages: "Cronograma",
      purchases: "Compras",
      inventory: "Materiais",
      leads: "Leads",
      collaborators: "Colaboradores",
      reports: "Indicadores",
      settings: "Configuração",
    }[view];
    const span = this.querySelector(".map-badge span");
    if (span)
      span.textContent = this.dataset.selectedPart
        ? `${this.dataset.selectedPart} · selecionado`
        : label;
  }
  setSceneVisual(tilt, rotation, scale) {
    const publicPresentation = this.isPublicCameraPreset();
    const safeTilt = publicPresentation
        ? Math.max(18, Math.min(26, Number(tilt) || 22))
        : this.clampSceneTilt(Number(tilt) || 0),
      safeRotation = this.hasAttribute("data-admin-shared-public-map")
        ? ADMIN_FIXED_MAP_ROTATION_DEG
        : Number(rotation) || 0;
    this._sceneVisual = { tilt: safeTilt, rotation: safeRotation, scale };
    this.dataset.sceneTilt = `${Math.round(safeTilt)}deg`;
    this.dataset.sceneRotation = `${Math.round(safeRotation)}deg`;
    this.dataset.sceneRotationLock = this.hasAttribute(
      "data-admin-shared-public-map",
    )
      ? `${ADMIN_FIXED_MAP_ROTATION_DEG}deg · fixo`
      : "";
    this.dataset.sceneZoom = String(scale);
    if (this.sceneStage) {
      const pan = this.sceneManualPan || { x: 0, y: 0 };
      this.sceneStage.rotation.set(0, 0, 0);
      this.sceneStage.scale.setScalar(Number(scale) || 1);
      const origin = this.sceneSharedOrigin ||
        this.sceneTransformOrigin ||
        this.sceneVisualAnchor || { x: 0, y: 0 };
      this.sceneTransformOrigin = { x: origin.x + pan.x, y: origin.y + pan.y };
      this.applySceneTransformAnchor(safeTilt, safeRotation, scale);
      const host = this.querySelector(".map-host"),
        orbitX = Number.isFinite(Number(this.sceneSharedOrigin?.x))
          ? Number(this.sceneSharedOrigin.x)
          : (host?.clientWidth || 2) / 2,
        orbitY = Number.isFinite(Number(this.sceneSharedOrigin?.y))
          ? Number(this.sceneSharedOrigin.y)
          : (host?.clientHeight || 2) / 2;
      this.configurePerspectiveCamera(
        host?.clientWidth || 2,
        host?.clientHeight || 2,
        orbitX,
        orbitY,
      );
      this.dataset.sceneTransform =
        "Three.js shared world · map + GLB · camera orbit";
      this.dataset.sceneRotation = `${Math.round(safeRotation)}deg`;
      this.dataset.sceneTilt = `${Math.round(safeTilt)}deg`;
    }
    this.updatePublicCommercialMarkers?.();
    this.renderer?.render(this.scene, this.camera);
  }
  applySceneView(view, animate = true) {
    // BELAVISTA_PUBLIC_CAMERA_V50: public presentation opens as a readable site plan.
    const theme = viewThemes[view] || viewThemes.assistant,
      publicPresentation = this.isPublicCameraPreset(),
      adminFixedRotation = this.hasAttribute("data-admin-shared-public-map"),
      tiltBase = adminFixedRotation
        ? 22
        : (Number(theme.tilt) || 18) + sceneTiltBoostForView(view),
      targetTilt = publicPresentation
        ? 22
        : this.clampSceneTilt(tiltBase + this.sceneTiltAdjust),
      targetRotation = publicPresentation
        ? 0
        : adminFixedRotation
          ? ADMIN_FIXED_MAP_ROTATION_DEG
          : this.sceneManualRotation || 0,
      targetScale = publicPresentation
        ? 1.62
        : this.sceneManualZoom || DEFAULT_SCENE_ZOOM;
    if (adminFixedRotation)
      this.sceneManualRotation = ADMIN_FIXED_MAP_ROTATION_DEG;
    if (publicPresentation) {
      this.sceneManualRotation = 0;
      this.sceneManualZoom = 1.62;
      this.sceneTiltAdjust = 0;
      this.sceneManualPan = { x: 0, y: 0 };
      this.sceneUserInteracted = true;
      this.style.setProperty("--scene-pan-x", "0px");
      this.style.setProperty("--scene-pan-y", "0px");
      this.dataset.scenePan = "0,0";
      this.dataset.publicViewPreset = "oblique-22deg-terrain-coverage-v55";
    }
    this.dataset.sceneTilt = `${targetTilt}deg`;
    const current = this._sceneVisual || {
      tilt: targetTilt,
      rotation: targetRotation,
      scale: targetScale,
    };
    if (!this.sceneStage) {
      this.setSceneVisual(targetTilt, targetRotation, targetScale);
      return;
    }
    // setSceneVisual already applies the shared transform and renders it.
    // Calling syncThree here rebuilt the tile composition during navigation.
    const finish = () => {
      this.setSceneVisual(targetTilt, targetRotation, targetScale);
      this.constrainScenePan("view-transition");
    };
    if (!animate) {
      finish();
      return;
    }
    const started = performanceNow(),
      duration = 460,
      token = Symbol("scene-transition");
    this._sceneTransition = token;
    const tick = (now) => {
      if (this._sceneTransition !== token) return;
      const t = Math.min(1, (now - started) / duration),
        e = t * t * (3 - 2 * t);
      this.setSceneVisual(
        current.tilt + (targetTilt - current.tilt) * e,
        current.rotation + (targetRotation - current.rotation) * e,
        current.scale + (targetScale - current.scale) * e,
      );
      if (t < 1) requestFrame(tick);
      else finish();
    };
    requestFrame(tick);
  }
  setSceneRotation(degrees, animate = true) {
    this.markAdminCameraInteracted();
    const normalized = this.hasAttribute("data-admin-shared-public-map")
      ? ADMIN_FIXED_MAP_ROTATION_DEG
      : (((Number(degrees) % 360) + 540) % 360) - 180;
    this.sceneManualRotation = normalized;
    this.dataset.sceneRotation = `${Math.round(normalized)}deg`;
    this.dataset.sceneRotationLock = this.hasAttribute(
      "data-admin-shared-public-map",
    )
      ? `${ADMIN_FIXED_MAP_ROTATION_DEG}deg · fixo`
      : "";
    this.rememberMapView();
    if (this.isAdminStandaloneInteractiveV5370()) {
      this.setAdminStandaloneRotationV5370(normalized, animate);
      return;
    }
    if (!this.sceneStage) return;
    const start = this._sceneVisual?.rotation || 0,
      holdTilt =
        this._sceneVisual?.tilt ||
        Number.parseFloat(this.dataset.sceneTilt) ||
        40,
      holdScale = this._sceneVisual?.scale || this.sceneManualZoom;
    this.dataset.sceneRotationBehavior =
      "horizontal orbit · fixed pitch · terrain pivot";
    if (!animate) {
      this._sceneTransition = Symbol("manual-rotation");
      this.setSceneVisual(holdTilt, normalized, holdScale);
      return;
    }
    const started = performanceNow(),
      duration = 420,
      token = Symbol("manual-rotation");
    this._sceneTransition = token;
    const tick = (now) => {
      if (this._sceneTransition !== token) return;
      const t = Math.min(1, (now - started) / duration),
        e = t * t * (3 - 2 * t);
      this.setSceneVisual(
        holdTilt,
        start + (normalized - start) * e,
        holdScale,
      );
      if (t < 1) requestFrame(tick);
      else this.constrainScenePan("rotation-finish");
    };
    requestFrame(tick);
  }
  getScenePanBounds() {
    const host = this.querySelector(".map-host");
    const viewportW = Math.max(1, host?.clientWidth || 1280);
    const viewportH = Math.max(1, host?.clientHeight || 800);
    const surface = this.sceneSurfaceDimensions || {
      width: viewportW * SCENE_SURFACE_SCALE,
      height: viewportH * SCENE_SURFACE_SCALE,
    };
    const scale = Math.max(
      0.01,
      Number(this._sceneVisual?.scale || this.sceneManualZoom) ||
        DEFAULT_SCENE_ZOOM,
    );
    const tilt = this.clampSceneTilt(
      Number(this._sceneVisual?.tilt) || DEFAULT_TILT_BOOST,
    );
    // Quanto maior a inclinação, maior fica a deformação perspectiva nas
    // bordas. Reduzimos o deslocamento permitido de forma conservadora para
    // que o plano cartográfico continue cobrindo o viewport inteiro.
    const tiltSafety = 1 + Math.sin((tilt * Math.PI) / 180) * 0.58;
    const dashboardScene =
      this.matches?.(
        'map-scene[data-dashboard-operational-map],map-scene[data-dashboard-progress-map],map-scene[data-persistent-map="true"]',
      ) && ["assistant", "map"].includes(appStore.get().view);
    const panSafety = dashboardScene
      ? DASHBOARD_PAN_SAFETY
      : this.isPublicMapVisual()
        ? SCENE_PUBLIC_PAN_SAFETY
        : SCENE_PAN_SAFETY;
    const visibleLocalW = viewportW / scale;
    const visibleLocalH = viewportH / scale;
    // sceneStage.position is a world translation, while its children are
    // scaled by `scale`. The usable pan therefore follows the rendered
    // coverage (surface * zoom), not the unscaled/local footprint.
    let visibleWorldHalfW = (viewportW * tiltSafety) / 2;
    let visibleWorldHalfH = (viewportH * tiltSafety) / 2;
    // A rotação altera a projeção horizontal da área vista. Reserve uma
    // margem adicional próxima de 45° para não permitir que o raster/terreno
    // apareça deslocado além da borda enquanto a câmera estiver orbitada.
    const heading = Math.abs(
      Math.sin(
        ((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation) ||
          0) *
          Math.PI) /
          90,
      ),
    );
    const rotationSafety = 1 + heading * 0.12;
    let panBoundsSource = "tilt-heuristic";
    // In perspective, the ground footprint seen by the viewport grows with
    // the camera inclination. Measure the four screen corners on the actual
    // ground plane when the camera is ready, then reserve a small overscan so
    // dragging never exposes the edge of the raster or the empty background.
    const canvas = this.querySelector(".three-overlay"),
      rect = canvas?.getBoundingClientRect?.();
    if (this.THREE && this.camera && canvas && rect?.width && rect?.height) {
      this.camera.updateMatrixWorld?.();
      const origin = this.sceneSharedOrigin || {
        x: viewportW / 2,
        y: viewportH / 2,
      };
      const corners = [
        [rect.left, rect.top],
        [rect.right, rect.top],
        [rect.right, rect.bottom],
        [rect.left, rect.bottom],
      ];
      const footprint = corners
        .map(([x, y]) => this.screenPointOnMapPlane(x, y))
        .filter(
          (point) =>
            point && Number.isFinite(point.x) && Number.isFinite(point.y),
        );
      if (footprint.length === corners.length) {
        // A interseção dos quatro cantos já contém a rotação real da câmera.
        // Aplicar mais um fator de heading aqui fazia o limite encolher de
        // forma diferente em cada ângulo e dava a sensação de pan travado.
        visibleWorldHalfW =
          Math.max(...footprint.map((point) => Math.abs(point.x - origin.x))) *
          panSafety;
        visibleWorldHalfH =
          Math.max(...footprint.map((point) => Math.abs(point.y - origin.y))) *
          panSafety;
        this.dataset.scenePanRotationProjection =
          "camera-ground-envelope · exact heading";
        // Preserve the public source label used by diagnostics while the
        // rotation-safe envelope remains expressed by `rotationSafety` above.
        panBoundsSource = "camera-ground-envelope";
      }
    }
    const panX = Math.max(
      dashboardScene ? viewportW * DASHBOARD_PAN_BOUNDING_SCREEN_RATIO : 0,
      (Number(surface.width || viewportW) * scale) / 2 - visibleWorldHalfW,
    );
    const panY = Math.max(
      dashboardScene ? viewportH * DASHBOARD_PAN_BOUNDING_SCREEN_RATIO : 0,
      (Number(surface.height || viewportH) * scale) / 2 - visibleWorldHalfH,
    );
    this.dataset.scenePanSpace = `world-translation · zoom-aware · ${panBoundsSource}`;
    this.dataset.scenePanSafety = panSafety.toFixed(3);
    this.dataset.sceneVisibleTerrain = `${Math.round(visibleLocalW)}x${Math.round(visibleLocalH)}`;
    this.dataset.sceneTerrain = `${Math.round(surface.width)}x${Math.round(surface.height)}`;
    return {
      x: panX,
      y: panY,
      surfaceW: Number(surface.width) || viewportW,
      surfaceH: Number(surface.height) || viewportH,
      coveredW: (Number(surface.width) || viewportW) * scale,
      coveredH: (Number(surface.height) || viewportH) * scale,
      visibleLocalW,
      visibleLocalH,
      visibleWorldHalfW,
      visibleWorldHalfH,
      tiltProjection: 1 / tiltSafety,
      tiltSafety,
      rotationSafety,
      panBoundsSource,
    };
  }
  clampScenePan(x, y) {
    const bounds = this.isAdminStandaloneInteractiveV5370()
      ? this.getAdminStandalonePanBoundsV5370()
      : this.getScenePanBounds();
    const target = {
      x: Math.max(-bounds.x, Math.min(bounds.x, Number(x) || 0)),
      y: Math.max(-bounds.y, Math.min(bounds.y, Number(y) || 0)),
    };
    this.dataset.scenePanBounds = `±${Math.round(bounds.x)},±${Math.round(bounds.y)}`;
    this.dataset.scenePanClamped =
      target.x !== Number(x) || target.y !== Number(y) ? "true" : "false";
    return target;
  }
  queueSceneBoundsCommit(reason = "gesture") {
    clearTimer(this._sceneBoundsCommitTimer);
    this._sceneBoundsCommitTimer = scheduleTimer(
      () => this.constrainScenePan(reason),
      140,
    );
  }
  constrainScenePan(reason = "release") {
    const previous = this.sceneManualPan || { x: 0, y: 0 },
      target = this.clampScenePan(previous.x, previous.y);
    this.dataset.sceneBoundsCommit = reason;
    if (target.x === previous.x && target.y === previous.y) return target;
    this.sceneManualPan = target;
    this.style.setProperty("--scene-pan-x", `${target.x}px`);
    this.style.setProperty("--scene-pan-y", `${target.y}px`);
    this.dataset.scenePan = `${Math.round(target.x)},${Math.round(target.y)}`;
    if (this.isAdminStandaloneInteractiveV5370()) {
      this._adminStandaloneStageV5370.position.x = target.x;
      this._adminStandaloneStageV5370.position.y = target.y;
      this._adminStandaloneRendererV5370.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
      this.rememberMapView();
      return target;
    }
    if (this.sceneStage) {
      const origin = this.sceneSharedOrigin || {
        x: this.sceneStage.position.x - previous.x,
        y: this.sceneStage.position.y - previous.y,
      };
      this.sceneTransformOrigin = {
        x: origin.x + target.x,
        y: origin.y + target.y,
      };
      this.applySceneTransformAnchor(
        this._sceneVisual?.tilt || 0,
        this._sceneVisual?.rotation || 0,
        this._sceneVisual?.scale || 1,
      );
      this.renderer?.render(this.scene, this.camera);
    }
    this.rememberMapView();
    return target;
  }
  // BELAVISTA_MAP_PAN_ROTATION_V511
  // Pan de tela -> plano do mapa. Usa ray/plane para respeitar heading, tilt, zoom e FOV atuais.
  screenPointOnMapPlane(clientX, clientY) {
    if (this.isAdminStandaloneInteractiveV5370()) {
      return this.adminStandaloneGroundPointV5370(clientX, clientY);
    }
    if (!this.THREE || !this.camera) return null;
    const canvas = this.querySelector(".three-overlay"),
      rect = canvas?.getBoundingClientRect?.();
    if (!canvas || !rect || !rect.width || !rect.height) return null;
    this._panRaycaster ??= new this.THREE.Raycaster();
    this._panGroundPlane ??= new this.THREE.Plane(
      new this.THREE.Vector3(0, 0, 1),
      0,
    );
    this._panNdc ??= new this.THREE.Vector2();
    const nx = ((Number(clientX) - rect.left) / rect.width) * 2 - 1,
      ny = -(((Number(clientY) - rect.top) / rect.height) * 2 - 1);
    this._panNdc.set(nx, ny);
    this._panRaycaster.setFromCamera(this._panNdc, this.camera);
    return this._panRaycaster.ray.intersectPlane(
      this._panGroundPlane,
      new this.THREE.Vector3(),
    );
  }
  screenDragPanDelta(fromX, fromY, toX, toY) {
    const a = this.screenPointOnMapPlane(fromX, fromY),
      b = this.screenPointOnMapPlane(toX, toY);
    // sceneStage.position recebe uma translação mundial. O raio já devolve
    // exatamente esse delta no plano do terreno; não dividir pelo zoom evita
    // que o mapa ande pouco quando aproximado.
    if (a && b && Number.isFinite(a.x) && Number.isFinite(b.x))
      return { x: b.x - a.x, y: b.y - a.y, source: "ray-plane-world" };
    const heading =
        ((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation) ||
          0) *
          Math.PI) /
        180,
      cos = Math.cos(heading),
      sin = Math.sin(heading),
      dx = (Number(toX) || 0) - (Number(fromX) || 0),
      dy = (Number(toY) || 0) - (Number(fromY) || 0);
    // Fallback em base de câmera: direita da tela = (-cos,+sin); baixo = (+sin,+cos).
    return {
      x: -dx * cos + dy * sin,
      y: dx * sin + dy * cos,
      source: "heading",
    };
  }
  screenDragPanDeltaFromVector(dx = 0, dy = 0) {
    const rect =
      this.querySelector(".three-overlay")?.getBoundingClientRect?.();
    if (rect?.width && rect?.height) {
      const centerX = (rect.left + rect.right) / 2;
      const centerY = (rect.top + rect.bottom) / 2;
      const from = this.screenPointOnMapPlane(centerX, centerY);
      const to = this.screenPointOnMapPlane(
        centerX + (Number(dx) || 0),
        centerY + (Number(dy) || 0),
      );
      if (
        from &&
        to &&
        Number.isFinite(from.x) &&
        Number.isFinite(from.y) &&
        Number.isFinite(to.x) &&
        Number.isFinite(to.y)
      ) {
        // The ray already includes the current camera heading, pitch and
        // zoom. Do not rotate this result a second time: in the standalone
        // renderer that would apply the stage heading twice, while in the
        // shared renderer it would desynchronise arrow controls from drag.
        return {
          x: to.x - from.x,
          y: to.y - from.y,
          source: this.isAdminStandaloneInteractiveV5370()
            ? "camera-ground · rotation-aware · standalone"
            : "camera-ground · rotation-aware",
        };
      }
    }
    const heading =
        ((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation) ||
          0) *
          Math.PI) /
        180,
      cos = Math.cos(heading),
      sin = Math.sin(heading),
      sx = Number(dx) || 0,
      sy = Number(dy) || 0;
    return {
      x: -sx * cos + sy * sin,
      y: sx * sin + sy * cos,
      source: "heading-world-fallback",
    };
  }
  applyScreenPanFromPointer(fromX, fromY, toX, toY, animate = false) {
    const delta = this.screenDragPanDelta(fromX, fromY, toX, toY),
      pan = this.sceneManualPan || { x: 0, y: 0 };
    this.dataset.mapPanVector = delta.source;
    this.setScenePan(pan.x + delta.x, pan.y + delta.y, animate);
    return delta;
  }
  setScenePan(x, y, animate = true) {
    this.markAdminCameraInteracted();
    if (this.isAdminStandaloneInteractiveV5370()) {
      this.setAdminStandalonePanV5370(x, y, animate);
      return;
    }
    const previous = this.sceneManualPan || { x: 0, y: 0 },
      requested = { x: Number(x) || 0, y: Number(y) || 0 },
      target = this.clampScenePan(requested.x, requested.y);
    this.sceneUserInteracted = true;
    this.sceneManualPan = target;
    this.dataset.scenePan = `${Math.round(target.x)},${Math.round(target.y)}`;
    this.rememberMapView();
    if (!this.sceneStage) {
      return;
    }
    // O pan é uma transformação da cena inteira. Recalcular o modelo via Leaflet
    // aqui fazia o mapa e o GLB percorrerem coordenadas diferentes durante o drag.
    this.style.setProperty("--scene-pan-x", `${target.x}px`);
    this.style.setProperty("--scene-pan-y", `${target.y}px`);
    // Recompose the complete world translation from one immutable origin. This
    // avoids accumulating rounding/drift when Leaflet or the camera resizes
    // between pointer events. Every child (map plane, GLB, markers and
    // selection halo) follows the same Three.js group coordinates.
    const origin = this.sceneSharedOrigin || {
      x: this.sceneStage.position.x - previous.x,
      y: this.sceneStage.position.y - previous.y,
    };
    this.sceneTransformOrigin = {
      x: origin.x + target.x,
      y: origin.y + target.y,
    };
    this.applySceneTransformAnchor(
      this._sceneVisual?.tilt || 0,
      this._sceneVisual?.rotation || 0,
      this._sceneVisual?.scale || 1,
    );
    this.dataset.sceneWorldTranslation = `${this.sceneStage.position.x.toFixed(2)},${this.sceneStage.position.y.toFixed(2)},${SCENE_MAP_Z}`;
    this.renderer?.render(this.scene, this.camera);
    if (animate) this.constrainScenePan("pan-control");
  }
  nudgeScenePan(direction, animate = true) {
    const screenStep = Math.max(
      44,
      Math.min(
        96,
        (this.querySelector(".three-overlay")?.clientWidth || 960) * 0.07,
      ),
    );
    const screenVector = {
      up: [0, -screenStep],
      down: [0, screenStep],
      left: [-screenStep, 0],
      right: [screenStep, 0],
    }[direction] || [0, 0];
    // Botões e gestos devem usar a mesma base da câmera. Assim, após girar
    // o loteamento, "direita" continua deslocando para a direita da tela,
    // em vez de continuar preso aos eixos globais X/Y do modelo.
    const delta = this.screenDragPanDeltaFromVector(
      screenVector[0],
      screenVector[1],
    );
    const pan = this.sceneManualPan || { x: 0, y: 0 };
    this.dataset.scenePanDirection = `${direction} · ${delta.source}`;
    this.setScenePan(
      pan.x + (Number(delta.x) || 0),
      pan.y + (Number(delta.y) || 0),
      animate,
    );
  }
  setSceneZoom(value, animate = true) {
    this.markAdminCameraInteracted();
    const target = Math.max(
      MIN_SCENE_ZOOM,
      Math.min(MAX_SCENE_ZOOM, Number(value) || DEFAULT_SCENE_ZOOM),
    );
    this.sceneManualZoom = target;
    this.dataset.sceneZoom = `${Math.round(target * 100)}%`;
    this.dataset.sceneZoomMin = `${Math.round(MIN_SCENE_ZOOM * 100)}%`;
    this.dataset.sceneZoomMax = `${Math.round(MAX_SCENE_ZOOM * 100)}%`;
    this.rememberMapView();
    if (this.isAdminStandaloneInteractiveV5370()) {
      this.setAdminStandaloneZoomV5370(target, animate);
      return;
    }
    if (!this.sceneStage) return;
    const start = this._sceneVisual?.scale || 1,
      targetScale = target;
    if (!animate) {
      this._sceneTransition = Symbol("manual-zoom");
      this.setSceneVisual(
        this._sceneVisual?.tilt || 40,
        this._sceneVisual?.rotation || 0,
        targetScale,
      );
      return;
    }
    const started = performanceNow(),
      duration = 320,
      token = Symbol("manual-zoom");
    this._sceneTransition = token;
    const tick = (now) => {
      if (this._sceneTransition !== token) return;
      const t = Math.min(1, (now - started) / duration),
        e = t * t * (3 - 2 * t);
      this.setSceneVisual(
        this._sceneVisual?.tilt || 40,
        this._sceneVisual?.rotation || 0,
        start + (targetScale - start) * e,
      );
      if (t < 1) requestFrame(tick);
      else this.syncThree();
    };
    requestFrame(tick);
  }
  setSceneZoomAt(value, clientX, clientY, animate = false) {
    const canvas = this.querySelector(".three-overlay"),
      rect = canvas?.getBoundingClientRect?.();
    const pointBefore =
      rect?.width && rect?.height
        ? this.screenPointOnMapPlane(clientX, clientY)
        : null;
    const previous = this.sceneManualPan || { x: 0, y: 0 };
    this.setSceneZoom(value, animate);
    if (animate || !pointBefore) return;
    const pointAfter = this.screenPointOnMapPlane(clientX, clientY);
    if (!pointAfter) return;
    // O delta está no plano do terreno e já incorpora a rotação e a
    // inclinação atuais da câmera. Não aplicar uma segunda rotação.
    this.dataset.mapZoomAnchor = "cursor-ground · rotation-aware";
    this.setScenePan(
      previous.x + (pointAfter.x - pointBefore.x),
      previous.y + (pointAfter.y - pointBefore.y),
      false,
    );
  }
  getSceneTiltBounds() {
    const mapSurface = this.sceneSurfaceDimensions || {};
    const host = this.querySelector(".map-host");
    const viewportW = Math.max(1, host?.clientWidth || 1280),
      viewportH = Math.max(1, host?.clientHeight || 800);
    const scale = Math.max(
      0.01,
      Number(this._sceneVisual?.scale || this.sceneManualZoom) ||
        DEFAULT_SCENE_ZOOM,
    );
    const coverageW =
      ((Number(mapSurface.width) || viewportW * SCENE_SURFACE_SCALE) * scale) /
      viewportW;
    const coverageH =
      ((Number(mapSurface.height) || viewportH * SCENE_SURFACE_SCALE) * scale) /
      viewportH;
    const coverage = Math.min(coverageW, coverageH);
    // O zoom só muda a área enquadrada; não deve reduzir a faixa de
    // inclinação. Antes, a cobertura menor do zoom out baixava o teto para
    // 38°/44° e a câmera mudava de orientação sozinha ao atingir o mínimo.
    // O plano compartilhado já é amplo o bastante e a inclinação é uma
    // preferência independente do zoom, inclusive na vista superior.
    const tiltZoomFactor = SCENE_TILT_ZOOM_OUT_FACTOR;
    this.dataset.sceneTiltCoverage = coverage.toFixed(3);
    this.dataset.sceneTiltZoomFactor = tiltZoomFactor.toFixed(3);
    this.dataset.sceneTiltZoomPolicy =
      "independente do zoom · zoom out preserva inclinação";
    return {
      min: MIN_SCENE_TILT,
      max: Math.min(MAX_SCENE_TILT, MAX_SCENE_TILT * tiltZoomFactor),
    };
  }
  clampSceneTilt(value) {
    const bounds = this.getSceneTiltBounds?.() || {
      min: MIN_SCENE_TILT,
      max: MAX_SCENE_TILT,
    };
    return Math.max(bounds.min, Math.min(bounds.max, Number(value) || 0));
  }
  };
  for (const method of SCENE_NAVIGATION_METHODS_V1)
    Object.defineProperty(MapScene.prototype, method, Object.getOwnPropertyDescriptor(SceneNavigationMethodsV1.prototype, method));
  return MapScene;
};
