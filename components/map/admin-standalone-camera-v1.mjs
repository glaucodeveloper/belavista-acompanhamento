const ADMIN_STANDALONE_CAMERA_CONFIG_V1 = [
  "ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2",
  "ADMIN_AERIAL_TILE_SWAP_RATIO_V2",
  "ADMIN_AERIAL_ZOOM_TILE_GRID_V1",
  "ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1",
  "ADMIN_AERIAL_ZOOM_TILE_ROOT_V1",
  "ADMIN_STANDALONE_BASE_TILT_DEG_V1",
  "ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11",
  "ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11",
  "ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10",
  "ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10",
  "ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12",
  "ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12",
  "ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11",
  "DASHBOARD_PAN_BOUNDING_SCREEN_RATIO",
  "MAP_CAMERA_VIEW",
  "MAX_SCENE_TILT",
  "MAX_SCENE_ZOOM",
  "MIN_SCENE_TILT",
  "MIN_SCENE_ZOOM",
  "SCENE_MAP_Z",
];

export const assertAdminStandaloneCameraDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Standalone map camera requires injected dependencies.");
  for (const key of ADMIN_STANDALONE_CAMERA_CONFIG_V1)
    if (!(key in dependencies))
      throw new TypeError(`Standalone map camera requires ${key}.`);
  for (const key of ["runtimeRouteV1", "sceneTiltBoostForView"])
    if (typeof dependencies[key] !== "function")
      throw new TypeError(`Standalone map camera requires ${key}().`);
  if (typeof dependencies.appStore?.get !== "function")
    throw new TypeError("Standalone map camera requires appStore.get().");
  const browser = dependencies.browser;
  if (typeof browser?.Image !== "function" ||
      !["performanceNow", "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"]
        .every((key) => typeof browser[key] === "function"))
    throw new TypeError("Standalone map camera requires browser image and animation/timer ports.");
  return dependencies;
};

export const installAdminStandaloneCameraV1 = (MapScene, dependencies) => {
  assertAdminStandaloneCameraDependenciesV1(dependencies);
  const {
    ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2,
    ADMIN_AERIAL_TILE_SWAP_RATIO_V2,
    ADMIN_AERIAL_ZOOM_TILE_GRID_V1,
    ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1,
    ADMIN_AERIAL_ZOOM_TILE_ROOT_V1,
    ADMIN_STANDALONE_BASE_TILT_DEG_V1,
    ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11,
    ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11,
    ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10,
    ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10,
    ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12,
    ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12,
    ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11,
    DASHBOARD_PAN_BOUNDING_SCREEN_RATIO,
    MAP_CAMERA_VIEW,
    MAX_SCENE_TILT,
    MAX_SCENE_ZOOM,
    MIN_SCENE_TILT,
    MIN_SCENE_ZOOM,
    SCENE_MAP_Z,
    appStore,
    runtimeRouteV1,
    sceneTiltBoostForView,
    viewThemes
  } = dependencies;
  const {
    Image: ImageConstructor,
    performanceNow: now,
    requestAnimationFrame: scheduleFrame,
    cancelAnimationFrame: cancelFrame,
    setTimeout: scheduleTimeout,
    clearTimeout: cancelTimeout,
  } = dependencies.browser;
  const AdminStandaloneCameraMethodsV1 = class {
    isAdminStandaloneInteractiveV5370() {
      return Boolean(
        this._adminStandaloneStageV5370 &&
        this._adminStandaloneCameraV5370 &&
        this._adminStandaloneRendererV5370,
      );
    }
    adminStandaloneGroundPointV5370(clientX, clientY) {
      const THREE = this.THREE,
        camera = this._adminStandaloneCameraV5370;
      const canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect?.();
      if (!THREE || !camera || !canvas || !rect?.width || !rect?.height)
        return null;
      this._adminStandaloneRaycasterV5370 ??= new THREE.Raycaster();
      this._adminStandaloneGroundPlaneV5370 ??= new THREE.Plane(
        new THREE.Vector3(0, 0, 1),
        0,
      );
      this._adminStandaloneNdcV5370 ??= new THREE.Vector2();
      this._adminStandaloneNdcV5370.set(
        ((Number(clientX) - rect.left) / rect.width) * 2 - 1,
        -(((Number(clientY) - rect.top) / rect.height) * 2 - 1),
      );
      camera.updateMatrixWorld(true);
      this._adminStandaloneRaycasterV5370.setFromCamera(
        this._adminStandaloneNdcV5370,
        camera,
      );
      return this._adminStandaloneRaycasterV5370.ray.intersectPlane(
        this._adminStandaloneGroundPlaneV5370,
        new THREE.Vector3(),
      );
    }
    adminStandalonePanBasisV5370() {
      const THREE = this.THREE,
        camera = this._adminStandaloneCameraV5370;
      if (!THREE || !camera) return null;
      camera.updateMatrixWorld(true);
      const right = new THREE.Vector3().setFromMatrixColumn(
        camera.matrixWorld,
        0,
      );
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      right.z = 0;
      up.z = 0;
      if (right.lengthSq() < 0.0001 || up.lengthSq() < 0.0001) return null;
      right.normalize();
      up.normalize();
      return { right, up };
    }
    adminStandaloneScreenPanDeltaV5370(dx = 0, dy = 0) {
      const rect =
        this.querySelector(".three-overlay")?.getBoundingClientRect?.();
      const basis = this.adminStandalonePanBasisV5370();
      if (!rect?.width || !rect?.height || !basis) {
        return {
          x: -(Number(dx) || 0),
          y: Number(dy) || 0,
          source: "standalone-heading-fallback",
        };
      }
      const camera = this._adminStandaloneCameraV5370,
        THREE = this.THREE;
      const distance = Math.max(
        1,
        camera.position.distanceTo(
          this._adminStandaloneFocusPointV5370 ||
            this._adminStandaloneFitCenterV5370 ||
            new THREE.Vector3(),
        ),
      );
      const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
      const worldPerPixel =
        (2 * Math.tan(halfFov) * distance) /
        (Math.max(1, rect.height) * Math.max(0.01, camera.zoom));
      const heading =
        (Number(this._adminStandaloneRotationV5370 || 0) * Math.PI) / 180;
      const cos = Math.cos(heading),
        sin = Math.sin(heading);
      // Os controles descrevem o espaço do loteamento. Rotacionamos o vetor
      // da tela pelo heading atual antes de convertê-lo para a base horizontal
      // da câmera; assim “direita” continua coerente após girar o modelo.
      const sx = Number(dx) || 0,
        sy = Number(dy) || 0;
      const localX = -sx * cos + sy * sin,
        localY = sx * sin + sy * cos;
      const x = (basis.right.x * localX + basis.up.x * localY) * worldPerPixel;
      const y = (basis.right.y * localX + basis.up.y * localY) * worldPerPixel;
      return { x, y, source: "camera-ground · rotation-aware · standalone" };
    }
    getAdminStandalonePanBoundsV5370() {
      const THREE = this.THREE,
        camera = this._adminStandaloneCameraV5370;
      const stage = this._adminStandaloneStageV5370;
      const fitBox = this._adminStandaloneFitBoxV5370;
      const canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect?.();
      if (!THREE || !camera || !stage || !fitBox || fitBox.isEmpty?.()) {
        return { x: 0, y: 0, source: "standalone-safe-zero" };
      }
      const size = fitBox.getSize(new THREE.Vector3());
      const rotation =
        (Number(this._adminStandaloneRotationV5370 || 0) * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotation)),
        sin = Math.abs(Math.sin(rotation));
      const surfaceHalfX = (size.x * cos + size.y * sin) / 2;
      const surfaceHalfY = (size.x * sin + size.y * cos) / 2;
      let visibleHalfX = surfaceHalfX,
        visibleHalfY = surfaceHalfY;
      if (rect?.width && rect?.height) {
        const corners = [
          [rect.left, rect.top],
          [rect.right, rect.top],
          [rect.right, rect.bottom],
          [rect.left, rect.bottom],
        ]
          .map(([x, y]) => this.adminStandaloneGroundPointV5370(x, y))
          .filter(
            (point) =>
              point && Number.isFinite(point.x) && Number.isFinite(point.y),
          );
        if (corners.length === 4) {
          visibleHalfX = Math.max(...corners.map((point) => Math.abs(point.x)));
          visibleHalfY = Math.max(...corners.map((point) => Math.abs(point.y)));
        }
      }
      // A pequena folga evita encostar a borda renderizada no limite do
      // viewport. O resultado é deliberadamente conservador: se a câmera
      // mostrar mais chão que o modelo, o pan é reduzido a zero naquele eixo.
      const dashboardScene =
        this.matches?.(
          'map-scene[data-dashboard-operational-map],map-scene[data-dashboard-progress-map],map-scene[data-persistent-map="true"]',
        ) && ["assistant", "map"].includes(appStore.get().view);
      const screenHalfX =
        dashboardScene && rect?.width
          ? rect.width * DASHBOARD_PAN_BOUNDING_SCREEN_RATIO
          : 0;
      const screenHalfY =
        dashboardScene && rect?.height
          ? rect.height * DASHBOARD_PAN_BOUNDING_SCREEN_RATIO
          : 0;
      const x = Math.max(screenHalfX, (surfaceHalfX - visibleHalfX) * 0.92);
      const y = Math.max(screenHalfY, (surfaceHalfY - visibleHalfY) * 0.92);
      const bounds = { x, y, source: "standalone-fit-envelope · rotation-safe" };
      this.dataset.scenePanSpace = `world-translation · zoom-aware · ${bounds.source}`;
      this.dataset.scenePanBounds = `±${Math.round(x)},±${Math.round(y)}`;
      return bounds;
    }
    clampAdminStandalonePanV5370(x, y) {
      const bounds = this.getAdminStandalonePanBoundsV5370();
      const target = {
        x: Math.max(-bounds.x, Math.min(bounds.x, Number(x) || 0)),
        y: Math.max(-bounds.y, Math.min(bounds.y, Number(y) || 0)),
      };
      this.dataset.scenePanClamped =
        target.x !== Number(x) || target.y !== Number(y) ? "true" : "false";
      return target;
    }
    adminStandaloneAerialScreenBoundsV9() {
      const THREE = this.THREE,
        plane =
          this._adminStandaloneAerialBasePlaneV5380 ||
          this.adminReferenceAerialTerrainV1,
        camera = this._adminStandaloneCameraV5370,
        canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect?.();
  
      if (
        !THREE?.Vector3 ||
        !plane?.geometry ||
        !camera ||
        !rect?.width ||
        !rect?.height
      )
        return null;
  
      plane.geometry.computeBoundingBox?.();
      const box = plane.geometry.boundingBox;
      if (!box) return null;
  
      plane.updateWorldMatrix?.(true, false);
      camera.updateMatrixWorld?.(true);
  
      const z =
          Number.isFinite(box.min.z) && Number.isFinite(box.max.z)
            ? (box.min.z + box.max.z) / 2
            : 0,
        localCorners = [
          new THREE.Vector3(box.min.x, box.min.y, z),
          new THREE.Vector3(box.max.x, box.min.y, z),
          new THREE.Vector3(box.max.x, box.max.y, z),
          new THREE.Vector3(box.min.x, box.max.y, z),
        ],
        screenCorners = localCorners.map((point) => {
          point.applyMatrix4(plane.matrixWorld).project(camera);
          return {
            x: (point.x * 0.5 + 0.5) * rect.width,
            y: (-point.y * 0.5 + 0.5) * rect.height,
          };
        }),
        xs = screenCorners.map((point) => point.x),
        ys = screenCorners.map((point) => point.y),
        left = Math.min(...xs),
        right = Math.max(...xs),
        top = Math.min(...ys),
        bottom = Math.max(...ys);
  
      return {
        rect,
        corners: screenCorners,
        left,
        right,
        top,
        bottom,
        width: Math.max(0.001, right - left),
        height: Math.max(0.001, bottom - top),
      };
    }
  
    clearAdminAerialZoomTilesV1() {
      if (this._adminAerialTileFadeFrameV2) {
        cancelFrame(this._adminAerialTileFadeFrameV2);
        this._adminAerialTileFadeFrameV2 = 0;
      }
      this._adminAerialTileFadeV2 = { opacity: 0, target: 0 };
      const entries = this._adminAerialZoomTilesV1;
      if (!entries) return;
      entries.forEach((entry) => {
        entry.cancelled = true;
        entry.mesh?.removeFromParent?.();
        entry.mesh?.geometry?.dispose?.();
        entry.mesh?.material?.dispose?.();
        entry.texture?.dispose?.();
      });
      entries.clear();
    }
  
    setAdminAerialTileOpacityV2(target, visibleKeys, clearAfter = false) {
      const state = (this._adminAerialTileFadeV2 ??= { opacity: 0, target: 0 });
      state.visibleKeys = visibleKeys;
      const renderer = this._adminStandaloneRendererV5370;
      const camera = this._adminStandaloneCameraV5370;
      const scene = this._adminStandaloneSceneV5370;
      const paint = () => {
        for (const [key, entry] of this._adminAerialZoomTilesV1 || []) {
          if (!entry.mesh) continue;
          entry.mesh.visible = state.opacity > 0.001 && state.visibleKeys.has(key);
          entry.mesh.material.opacity = state.opacity;
        }
        renderer?.render?.(scene, camera);
      };
      if (state.target === target && !this._adminAerialTileFadeFrameV2) {
        paint();
        if (clearAfter && state.opacity <= 0.001) this.clearAdminAerialZoomTilesV1();
        return;
      }
      if (state.target === target) {
        paint();
        return;
      }
      if (this._adminAerialTileFadeFrameV2)
        cancelFrame(this._adminAerialTileFadeFrameV2);
      const from = state.opacity;
      const started = now();
      state.target = target;
      const tick = (now) => {
        const progress = Math.min(1, Math.max(0, (now - started) / 320));
        const eased = progress * progress * (3 - 2 * progress);
        state.opacity = from + (target - from) * eased;
        paint();
        if (progress < 1) {
          this._adminAerialTileFadeFrameV2 = scheduleFrame(tick);
        } else {
          this._adminAerialTileFadeFrameV2 = 0;
          if (clearAfter && target === 0) this.clearAdminAerialZoomTilesV1();
        }
      };
      this._adminAerialTileFadeFrameV2 = scheduleFrame(tick);
    }
  
    updateAdminAerialZoomTilesV1() {
      const THREE = this.THREE,
        plane = this._adminStandaloneAerialBasePlaneV5380,
        camera = this._adminStandaloneCameraV5370,
        renderer = this._adminStandaloneRendererV5370,
        rect = this.querySelector(".three-overlay")?.getBoundingClientRect?.();
      if (!THREE || !plane || !camera || !renderer || !rect?.width || !rect?.height)
        return;
  
      const entries = (this._adminAerialZoomTilesV1 ??= new Map());
      const { cols, rows } = ADMIN_AERIAL_ZOOM_TILE_GRID_V1;
      const { width, height } = ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1;
      const fitZoom = (this._adminAerialFitZoomV2 ??= Math.max(0.001, Number(camera.zoom) || 1));
      const zoomRatio = (Number(camera.zoom) || fitZoom) / fitZoom;
      this.dataset.adminAerialZoomRatio = zoomRatio.toFixed(2);
      this.dataset.adminAerialZoomTileThreshold = "pré-carregar 130% · detalhe 150%";
      const maxTextureSize = renderer.capabilities?.maxTextureSize || 0;
      if (maxTextureSize < Math.max(Math.ceil(width / cols), Math.ceil(height / rows))) {
        this.clearAdminAerialZoomTilesV1();
        this.dataset.adminAerialZoomTiles = "unsupported-gpu";
        this.dataset.adminAerialZoomTileStage = "preview";
        return;
      }
      if (zoomRatio < ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2) {
        const visibleKeys = new Set(this._adminAerialZoomTilesV1?.keys?.() || []);
        this.setAdminAerialTileOpacityV2(0, visibleKeys, true);
        this.dataset.adminAerialZoomTileStage = "preview";
        this.dataset.adminAerialZoomTileVisible = "0";
        this.dataset.adminAerialZoomTiles = "base-4k";
        return;
      }
  
      plane.updateWorldMatrix(true, false);
      camera.updateMatrixWorld(true);
      const project = (u, v) => {
        const point = new THREE.Vector3(u - 0.5, 0.5 - v, 0)
          .applyMatrix4(plane.matrixWorld)
          .project(camera);
        return {
          x: (point.x * 0.5 + 0.5) * rect.width,
          y: (-point.y * 0.5 + 0.5) * rect.height,
        };
      };
      const desired = [];
      const visibleKeys = new Set();
      const preloadMarginX = rect.width * 0.25;
      const preloadMarginY = rect.height * 0.25;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const left = Math.floor(width * col / (cols * 5)) * 5,
            top = Math.floor(height * row / (rows * 5)) * 5,
            right = Math.floor(width * (col + 1) / (cols * 5)) * 5,
            bottom = Math.floor(height * (row + 1) / (rows * 5)) * 5,
            u0 = left / width,
            v0 = top / height,
            u1 = right / width,
            v1 = bottom / height,
            points = [project(u0, v0), project(u1, v0), project(u1, v1), project(u0, v1)],
            xs = points.map((point) => point.x),
            ys = points.map((point) => point.y),
            x0 = Math.min(...xs),
            x1 = Math.max(...xs),
            y0 = Math.min(...ys),
            y1 = Math.max(...ys);
          // Keep a ring of nearby tiles ready before they enter the viewport.
          if (
            x1 < -preloadMarginX || x0 > rect.width + preloadMarginX ||
            y1 < -preloadMarginY || y0 > rect.height + preloadMarginY
          ) continue;
          const key = `${row}-${col}`;
          if (x1 >= 0 && x0 <= rect.width && y1 >= 0 && y0 <= rect.height)
            visibleKeys.add(key);
          desired.push({
            key, row, col, u0, v0, u1, v1,
            distance: Math.hypot((x0 + x1) / 2 - rect.width / 2, (y0 + y1) / 2 - rect.height / 2),
          });
        }
      }
      const desiredKeys = new Set(desired.map((tile) => tile.key));
      for (const [key, entry] of entries) {
        if (desiredKeys.has(key)) continue;
        entry.cancelled = true;
        entry.mesh?.removeFromParent?.();
        entry.mesh?.geometry?.dispose?.();
        entry.mesh?.material?.dispose?.();
        entry.texture?.dispose?.();
        entries.delete(key);
      }
      desired.sort((a, b) => a.distance - b.distance);
      let loading = [...entries.values()].filter((entry) => entry.state === "loading").length;
      for (const tile of desired) {
        if (entries.has(tile.key) || loading >= 4) continue;
        loading++;
        const entry = { state: "loading", cancelled: false };
        entries.set(tile.key, entry);
        const image = new ImageConstructor();
        image.decoding = "async";
        image.onload = () => {
          if (entry.cancelled || !this.isConnected) return;
          const texture = new THREE.Texture(image);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.max(1, renderer.capabilities?.getMaxAnisotropy?.() || 1);
          texture.needsUpdate = true;
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(tile.u1 - tile.u0, tile.v1 - tile.v0),
            new THREE.MeshBasicMaterial({
              map: texture, side: THREE.DoubleSide, depthTest: true,
              depthWrite: false, toneMapped: false, transparent: true, opacity: 0,
              polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
            }),
          );
          mesh.name = `AdminAerialZoomTile-r${tile.row + 1}-c${tile.col + 1}`;
          mesh.position.set((tile.u0 + tile.u1) / 2 - 0.5, 0.5 - (tile.v0 + tile.v1) / 2, 0.01);
          mesh.renderOrder = -29;
          mesh.raycast = () => {};
          mesh.visible = false;
          plane.add(mesh);
          entry.state = "ready";
          entry.texture = texture;
          entry.mesh = mesh;
          this.dataset.adminAerialZoomTiles = `${[...entries.values()].filter((item) => item.state === "ready").length}/15 ready`;
          this.updateAdminAerialZoomTilesV1();
          renderer.render(this._adminStandaloneSceneV5370, camera);
        };
        image.onerror = () => {
          if (entries.get(tile.key) === entry) entries.delete(tile.key);
          this.dataset.adminAerialZoomTiles = "load-error";
        };
        image.src = runtimeRouteV1(
          `${ADMIN_AERIAL_ZOOM_TILE_ROOT_V1}/r${tile.row + 1}-c${tile.col + 1}.webp`,
          "v=2",
        );
      }
      this.dataset.adminAerialZoomTileGrid = "5x3";
      this.dataset.adminAerialZoomTileSource = ADMIN_AERIAL_ZOOM_TILE_ROOT_V1;
      const allVisibleReady = visibleKeys.size > 0 &&
        [...visibleKeys].every((key) => entries.get(key)?.state === "ready");
      const showDetail = zoomRatio >= ADMIN_AERIAL_TILE_SWAP_RATIO_V2 && allVisibleReady;
      this.setAdminAerialTileOpacityV2(showDetail ? 1 : 0, visibleKeys);
      this.dataset.adminAerialZoomTileStage = showDetail
        ? "detail"
        : zoomRatio >= ADMIN_AERIAL_TILE_SWAP_RATIO_V2 ? "waiting-detail" : "preloading";
      this.dataset.adminAerialZoomTileVisible = String(visibleKeys.size);
      this.dataset.adminAerialZoomTiles = desired.length
        ? `${[...entries.values()].filter((entry) => entry.state === "ready").length}/15 ready`
        : "base-4k";
    }
  
    ensureAdminStandaloneAerialCoverV9({
      overscan = 1.025,
      clampPan = true,
      render = true,
    } = {}) {
      const THREE = this.THREE,
        camera = this._adminStandaloneCameraV5370,
        renderer = this._adminStandaloneRendererV5370,
        scene = this._adminStandaloneSceneV5370,
        stage = this._adminStandaloneStageV5370,
        canvas = this.querySelector(".three-overlay");
  
      if (!THREE?.Vector3 || !camera || !renderer || !scene || !stage || !canvas)
        return null;
  
      const rect = canvas.getBoundingClientRect();
      if (!(rect.width > 2 && rect.height > 2)) return null;
  
      let bounds = this.adminStandaloneAerialScreenBoundsV9();
      if (!bounds) return null;
  
      // COVER e não CONTAIN:
      // se o plano mede menos que a viewport em qualquer eixo, aumentamos zoom
      // pelo maior fator necessário. Assim não existe letterbox.
      const requiredScale = Math.max(
        (rect.width * overscan) / bounds.width,
        (rect.height * overscan) / bounds.height,
        1,
      );
  
      if (requiredScale > 1.0005) {
        camera.zoom = Math.max(
          MIN_SCENE_ZOOM,
          Math.min(MAX_SCENE_ZOOM, (Number(camera.zoom) || 1) * requiredScale),
        );
        camera.updateProjectionMatrix();
        bounds = this.adminStandaloneAerialScreenBoundsV9() || bounds;
      }
  
      // Pan pode continuar existindo, mas é limitado pela borda real da foto.
      // Se uma ação expuser fundo vazio, deslocamos somente o necessário para
      // recolocar a borda da fotografia além da viewport.
      if (clampPan) {
        for (let pass = 0; pass < 3; pass++) {
          bounds = this.adminStandaloneAerialScreenBoundsV9() || bounds;
  
          const marginX = rect.width * ((overscan - 1) / 2),
            marginY = rect.height * ((overscan - 1) / 2),
            minLeft = -marginX,
            minTop = -marginY,
            minRight = rect.width + marginX,
            minBottom = rect.height + marginY;
  
          let shiftScreenX = 0,
            shiftScreenY = 0;
  
          if (bounds.left > minLeft) shiftScreenX = minLeft - bounds.left;
          else if (bounds.right < minRight)
            shiftScreenX = minRight - bounds.right;
  
          if (bounds.top > minTop) shiftScreenY = minTop - bounds.top;
          else if (bounds.bottom < minBottom)
            shiftScreenY = minBottom - bounds.bottom;
  
          if (Math.abs(shiftScreenX) < 0.35 && Math.abs(shiftScreenY) < 0.35)
            break;
  
          camera.updateMatrixWorld(true);
  
          const rightWorld = new THREE.Vector3().setFromMatrixColumn(
              camera.matrixWorld,
              0,
            ),
            upWorld = new THREE.Vector3().setFromMatrixColumn(
              camera.matrixWorld,
              1,
            ),
            groundRight = new THREE.Vector3(rightWorld.x, rightWorld.y, 0),
            groundUp = new THREE.Vector3(upWorld.x, upWorld.y, 0);
  
          if (groundRight.lengthSq() < 1e-8) groundRight.set(1, 0, 0);
          else groundRight.normalize();
  
          const groundUpLength = Math.max(0.001, groundUp.length());
          groundUp.multiplyScalar(1 / groundUpLength);
  
          const worldPerPixelX =
              (camera.right - camera.left) /
              (rect.width * Math.max(0.001, Number(camera.zoom) || 1)),
            worldPerPixelY =
              (camera.top - camera.bottom) /
              (rect.height * Math.max(0.001, Number(camera.zoom) || 1));
  
          stage.position.addScaledVector(
            groundRight,
            shiftScreenX * worldPerPixelX,
          );
          stage.position.addScaledVector(
            groundUp,
            -shiftScreenY * worldPerPixelY,
          );
          stage.updateMatrixWorld(true);
        }
      }
  
      this.sceneManualZoom = Number(camera.zoom) || 1;
      this.sceneManualPan = {
        x: Number(stage.position.x) || 0,
        y: Number(stage.position.y) || 0,
      };
  
      this.dataset.sceneZoom = `${Math.round(this.sceneManualZoom * 100)}%`;
      this.dataset.scenePan = `${Math.round(this.sceneManualPan.x)},${Math.round(
        this.sceneManualPan.y,
      )}`;
      this.dataset.mapCoverLockV9 = "active";
      this.dataset.mapCoverOverscanV9 = `${((overscan - 1) * 100).toFixed(1)}%`;
      this.dataset.mapCoverViewportV9 = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
  
      bounds = this.adminStandaloneAerialScreenBoundsV9() || bounds;
      this.dataset.mapCoverBoundsV9 = `${Math.round(bounds.left)},${Math.round(
        bounds.top,
      )} → ${Math.round(bounds.right)},${Math.round(bounds.bottom)}`;
  
      this.updateAdminAerialZoomTilesV1();
      if (render) renderer.render(scene, camera);
      return {
        zoom: this.sceneManualZoom,
        pan: { ...this.sceneManualPan },
        bounds,
      };
    }
  
    setAdminStandalonePanV5370(x, y, animate = true) {
      const stage = this._adminStandaloneStageV5370;
      if (!stage) return;
      const target = this.clampAdminStandalonePanV5370(x, y);
      const previous = this.sceneManualPan || { x: 0, y: 0 };
      this.sceneManualPan = target;
      stage.position.x = target.x;
      stage.position.y = target.y;
      this.sceneUserInteracted = true;
      this.dataset.scenePan = `${Math.round(target.x)},${Math.round(target.y)}`;
      this.dataset.sceneWorldTranslation = `${stage.position.x.toFixed(2)},${stage.position.y.toFixed(2)},0`;
      this.dataset.scenePanDirection =
        this.dataset.scenePanDirection || "standalone";
      this.rememberMapView();
      this.ensureAdminStandaloneAerialCoverV9?.({
        clampPan: true,
        render: false,
      });
      this._adminStandaloneRendererV5370.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
      if (animate && (target.x !== previous.x || target.y !== previous.y))
        this.dataset.scenePanAnimation = "settled";
      return target;
    }
    setAdminStandaloneRotationV5370(degrees, animate = true) {
      const stage = this._adminStandaloneStageV5370;
      if (!stage) return;
      const normalized = (((Number(degrees) % 360) + 540) % 360) - 180;
      const apply = (rotation) => {
        stage.rotation.z = ((Number(rotation) || 0) * Math.PI) / 180;
        this._adminStandaloneRotationV5370 = Number(rotation) || 0;
        this.sceneManualRotation = Number(rotation) || 0;
        const targetPan = this.clampAdminStandalonePanV5370(
          this.sceneManualPan?.x || 0,
          this.sceneManualPan?.y || 0,
        );
        this.sceneManualPan = targetPan;
        stage.position.x = targetPan.x;
        stage.position.y = targetPan.y;
        this.dataset.sceneRotation = `${Math.round(Number(rotation) || 0)}deg`;
        this.dataset.sceneRotationBehavior =
          "horizontal orbit · fixed pitch · standalone terrain pivot";
        this.dataset.scenePan = `${Math.round(targetPan.x)},${Math.round(targetPan.y)}`;
        this.ensureAdminStandaloneAerialCoverV9?.({
          clampPan: true,
          render: false,
        });
        this._adminStandaloneRendererV5370.render(
          this._adminStandaloneSceneV5370,
          this._adminStandaloneCameraV5370,
        );
      };
      if (!animate) {
        apply(normalized);
        this.rememberMapView();
        return;
      }
      const started = now(),
        from = Number(this._adminStandaloneRotationV5370 || 0);
      const delta = ((normalized - from + 540) % 360) - 180,
        token = Symbol("standalone-rotation");
      this._adminStandaloneTransitionV5370 = token;
      const tick = (now) => {
        if (this._adminStandaloneTransitionV5370 !== token) return;
        const t = Math.min(1, (now - started) / 320),
          e = t * t * (3 - 2 * t);
        apply(from + delta * e);
        if (t < 1) scheduleFrame(tick);
        else {
          apply(normalized);
          this.rememberMapView();
        }
      };
      scheduleFrame(tick);
    }
    adminStandaloneCurrentTiltV5370() {
      const camera = this._adminStandaloneCameraV5370,
        target =
          this._adminStandaloneFocusPointV5370 ||
          this._adminStandaloneFitCenterV5370;
      if (!camera || !target) return ADMIN_STANDALONE_BASE_TILT_DEG_V1;
      const horizontal = Math.hypot(
        camera.position.x - target.x,
        camera.position.y - target.y,
      );
      const vertical = Math.abs(camera.position.z - target.z);
      return (Math.atan2(horizontal, Math.max(0.001, vertical)) * 180) / Math.PI;
    }
    adminStandaloneCurrentFocusPointV5370() {
      const THREE = this.THREE,
        camera = this._adminStandaloneCameraV5370,
        canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect?.();
      if (!THREE || !camera) return null;
  
      // O ponto de foco é o ponto do terreno sob o centro da tela neste
      // instante. Isso inclui o pan, zoom e rotação já aplicados pelo operador.
      if (rect?.width && rect?.height) {
        const point = this.adminStandaloneGroundPointV5370(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
          point.z = SCENE_MAP_Z;
          this._adminStandaloneFocusPointV5370 = point.clone();
          return point;
        }
      }
  
      const saved = this._adminStandaloneFocusPointV5370;
      if (saved?.isVector3) return saved.clone();
      const fallback = this._adminStandaloneFitCenterV5370;
      return fallback?.isVector3 ? fallback.clone() : null;
    }
    cancelAdminStandaloneDetiltZoomDelayV11(resetSession = true) {
      if (this._adminDetiltZoomTimerV11) {
        cancelTimeout(this._adminDetiltZoomTimerV11);
        this._adminDetiltZoomTimerV11 = 0;
      }
      // Trocar o token invalida qualquer animação de zoom já em execução.
      this._adminDetiltZoomAnimationTokenV11 = Symbol("detilt-zoom-cancelled");
      if (resetSession) this._adminDetiltZoomSessionV11 = null;
    }
  
    scheduleAdminStandaloneDetiltZoomV11(fromTilt, toTilt) {
      const camera = this._adminStandaloneCameraV5370,
        renderer = this._adminStandaloneRendererV5370,
        scene = this._adminStandaloneSceneV5370;
  
      if (!camera || !renderer || !scene) return;
  
      const from = Math.max(
          0.5,
          Math.min(MAX_SCENE_TILT, Number(fromTilt) || 0.5),
        ),
        to = Math.max(0.5, Math.min(MAX_SCENE_TILT, Number(toTilt) || from));
  
      // O acoplamento é somente no sentido de desinclinação.
      if (!(to < from - 0.0001)) {
        this.cancelAdminStandaloneDetiltZoomDelayV11(true);
        return;
      }
  
      const timestamp = now(),
        existing = this._adminDetiltZoomSessionV11,
        canContinueSession =
          existing &&
          !existing.animating &&
          timestamp - Number(existing.lastInputAt || 0) <=
            ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11 &&
          from <= Number(existing.baseTilt || from) + 0.25;
  
      // Enquanto o range emite vários "input", preservamos o ponto inicial
      // da mesma desinclinação. Assim 37° -> 30° -> 20° continua equivalendo
      // a zoom * 20/37, porém o zoom só começa depois da pausa configurada.
      const session = canContinueSession
        ? existing
        : {
            baseTilt: from,
            baseZoom: Number(camera.zoom) || 1,
            targetTilt: to,
            lastTilt: to,
            lastInputAt: now,
            animating: false,
          };
  
      session.targetTilt = Math.min(Number(session.targetTilt || to), to);
      session.lastTilt = to;
      session.lastInputAt = now;
      this._adminDetiltZoomSessionV11 = session;
  
      if (this._adminDetiltZoomTimerV11)
        cancelTimeout(this._adminDetiltZoomTimerV11);
  
      // Invalida uma animação de zoom anterior sem destruir a nova sessão.
      this._adminDetiltZoomAnimationTokenV11 = Symbol("detilt-zoom-pending");
  
      this.dataset.sceneDetiltZoomDelayV11 = `${ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11}ms`;
      this.dataset.sceneDetiltZoomStateV11 = "waiting";
      this.dataset.sceneDetiltZoomTargetTiltV11 = `${session.targetTilt.toFixed(1)}deg`;
  
      const sessionRef = session;
      this._adminDetiltZoomTimerV11 = scheduleTimeout(() => {
        this._adminDetiltZoomTimerV11 = 0;
        if (
          this._adminDetiltZoomSessionV11 !== sessionRef ||
          !this._adminStandaloneCameraV5370
        )
          return;
  
        const liveCamera = this._adminStandaloneCameraV5370,
          floorTilt = ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10,
          baseCoupledTilt = Math.max(
            floorTilt,
            Math.min(MAX_SCENE_TILT, Number(sessionRef.baseTilt) || floorTilt),
          ),
          targetCoupledTilt = Math.max(
            floorTilt,
            Math.min(MAX_SCENE_TILT, Number(sessionRef.targetTilt) || floorTilt),
          ),
          proportionalFactor =
            baseCoupledTilt > 0 ? targetCoupledTilt / baseCoupledTilt : 1,
          fullProportionalTargetZoom = Math.max(
            MIN_SCENE_ZOOM,
            Math.min(
              4.5,
              (Number(sessionRef.baseZoom) || 1) * proportionalFactor,
            ),
          ),
          baseZoomForReserve = Number(sessionRef.baseZoom) || 1,
          fullZoomOutDelta = Math.max(
            0,
            baseZoomForReserve - fullProportionalTargetZoom,
          ),
          requestedTargetZoom = Math.max(
            MIN_SCENE_ZOOM,
            Math.min(
              4.5,
              baseZoomForReserve -
                fullZoomOutDelta *
                  ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12,
            ),
          ),
          reservedZoomOut = Math.max(
            0,
            requestedTargetZoom - fullProportionalTargetZoom,
          ),
          zoomFrom = Number(liveCamera.zoom) || 1,
          token = Symbol("detilt-zoom-running"),
          started = now();
  
        sessionRef.animating = true;
        this._adminDetiltZoomAnimationTokenV11 = token;
  
        this.dataset.sceneDetiltZoomStateV11 = "running";
        this.dataset.sceneDetiltZoomFactorV10 = proportionalFactor.toFixed(5);
        this.dataset.sceneDetiltZoomRequestedV10 = `${Math.round(requestedTargetZoom * 100)}%`;
        this.dataset.sceneDetiltZoomFullTargetV12 = `${Math.round(fullProportionalTargetZoom * 100)}%`;
        this.dataset.sceneDetiltZoomReserveV12 = `${Math.round(
          ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12 * 100,
        )}%`;
        this.dataset.sceneDetiltZoomReservedAmountV12 =
          reservedZoomOut.toFixed(4);
        this.dataset.sceneDetiltZoomHeadroomV12 =
          "automatic zoom-out stops early; manual zoom-out remains";
  
        const applyZoom = (zoom) => {
          if (this._adminDetiltZoomAnimationTokenV11 !== token) return false;
  
          liveCamera.zoom = Math.max(
            MIN_SCENE_ZOOM,
            Math.min(MAX_SCENE_ZOOM, Number(zoom) || zoomFrom),
          );
          liveCamera.updateProjectionMatrix();
  
          // O cover-lock continua sendo o limite inferior real.
          // Se o zoom desejado revelar fundo, ele é corrigido para cima.
          this.ensureAdminStandaloneAerialCoverV9?.({
            clampPan: true,
            render: false,
          });
  
          this.sceneManualZoom = Number(liveCamera.zoom) || 1;
          this.dataset.sceneZoom = `${Math.round(this.sceneManualZoom * 100)}%`;
          this.dataset.sceneDetiltZoomEffectiveV10 = `${Math.round(this.sceneManualZoom * 100)}%`;
  
          renderer.render(scene, liveCamera);
          return true;
        };
  
        const tickZoom = (time) => {
          if (this._adminDetiltZoomAnimationTokenV11 !== token) return;
  
          const progress = Math.min(
              1,
              (time - started) / ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11,
            ),
            eased = progress * progress * (3 - 2 * progress),
            zoom = zoomFrom + (requestedTargetZoom - zoomFrom) * eased;
  
          if (!applyZoom(zoom)) return;
  
          if (progress < 1) {
            scheduleFrame(tickZoom);
            return;
          }
  
          applyZoom(requestedTargetZoom);
          this.dataset.sceneDetiltZoomStateV11 = "settled";
          this._adminDetiltZoomSessionV11 = null;
          this.rememberMapView?.();
        };
  
        scheduleFrame(tickZoom);
      }, ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11);
    }
  
    setAdminStandaloneTiltV5370(degrees, animate = true) {
      const camera = this._adminStandaloneCameraV5370,
        renderer = this._adminStandaloneRendererV5370,
        scene = this._adminStandaloneSceneV5370;
      if (!this.THREE?.Vector3 || !camera || !renderer || !scene) {
        return;
      }
  
      const target = this.adminStandaloneCurrentFocusPointV5370();
      if (!target) return;
  
      const from =
          Number(this._adminStandaloneTiltV5370) ||
          this.adminStandaloneCurrentTiltV5370(),
        to = Math.max(0.5, Math.min(MAX_SCENE_TILT, Number(degrees) || from)),
        distance = Math.max(
          1,
          Number(this._adminStandaloneCameraDistanceV5370) ||
            camera.position.distanceTo(target),
        ),
        horizontal = new this.THREE.Vector3(
          camera.position.x - target.x,
          camera.position.y - target.y,
          0,
        ),
        zoomFloorTilt = ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10;
  
      if (horizontal.lengthSq() < 0.0001) horizontal.set(0, -1, 0);
      horizontal.normalize();
  
      // Agenda o zoom-out UMA vez por mudança de controle.
      // Para o input range, chamadas sucessivas reiniciam os 180ms:
      // o tilt responde imediatamente e o zoom só vem depois.
      if (to < from - 0.0001) this.scheduleAdminStandaloneDetiltZoomV11(from, to);
      else if (to > from + 0.0001)
        this.cancelAdminStandaloneDetiltZoomDelayV11(true);
  
      const applyTiltOnly = (tilt) => {
        const boundedTilt = Math.max(
            0.5,
            Math.min(MAX_SCENE_TILT, Number(tilt) || from),
          ),
          radians = (boundedTilt * Math.PI) / 180,
          groundDistance = distance * Math.sin(radians),
          height = distance * Math.cos(radians);
  
        camera.position.set(
          target.x + horizontal.x * groundDistance,
          target.y + horizontal.y * groundDistance,
          target.z + height,
        );
        camera.up.set(0, 0, 1);
        camera.lookAt(target);
        camera.updateProjectionMatrix();
  
        this._adminStandaloneFocusPointV5370 = target.clone();
        this._adminStandaloneTiltV5370 = boundedTilt;
  
        this.dataset.sceneTilt = `${Math.round(boundedTilt)}deg`;
        this.dataset.sceneTiltFrame =
          "orthographic orbit · adjustable inclination around current focus";
        this.dataset.sceneTiltAnchor = `current-ground-focus · ${Math.round(target.x)},${Math.round(
          target.y,
        )}`;
  
        this.dataset.sceneDetiltZoomCouplingV10 = "proportional-on-decrease";
        this.dataset.sceneDetiltZoomFloorV10 = `${zoomFloorTilt.toFixed(1)}deg · ${Math.round(
          ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10 * 100,
        )}% max tilt`;
        this.dataset.sceneDetiltZoomCouplingV11 =
          "delayed-debounced-proportional";
        this.dataset.sceneDetiltZoomPolicyV12 =
          "85%-automatic · 15%-manual-headroom";
  
        this.syncSceneTiltControlV1?.();
  
        // Mesmo durante o delay, inclinar/desinclinar não pode revelar
        // as bordas do plano aéreo.
        this.ensureAdminStandaloneAerialCoverV9?.({
          clampPan: true,
          render: false,
        });
  
        this.sceneManualZoom = Number(camera.zoom) || 1;
        this.dataset.sceneZoom = `${Math.round(this.sceneManualZoom * 100)}%`;
  
        renderer.render(scene, camera);
      };
  
      if (!animate || Math.abs(to - from) < 0.01) {
        applyTiltOnly(to);
        this.rememberMapView();
        return;
      }
  
      const started = now(),
        token = Symbol("standalone-tilt");
      this._adminStandaloneTransitionV5370 = token;
  
      const tick = (now) => {
        if (this._adminStandaloneTransitionV5370 !== token) return;
        const progress = Math.min(1, (now - started) / 260),
          eased = progress * progress * (3 - 2 * progress);
  
        applyTiltOnly(from + (to - from) * eased);
  
        if (progress < 1) scheduleFrame(tick);
        else {
          applyTiltOnly(to);
          this.rememberMapView();
        }
      };
  
      scheduleFrame(tick);
    }
    syncSceneTiltControlV1() {
      const standalone = Boolean(this.isAdminStandaloneInteractiveV5370?.());
      const base = standalone
        ? ADMIN_STANDALONE_BASE_TILT_DEG_V1
        : this.hasAttribute("data-admin-shared-public-map")
          ? 22
          : (Number(viewThemes[MAP_CAMERA_VIEW]?.tilt) || 18) +
            sceneTiltBoostForView(MAP_CAMERA_VIEW);
      const tilt = standalone
        ? Number(this._adminStandaloneTiltV5370) || base
        : Math.max(
            MIN_SCENE_TILT,
            Math.min(MAX_SCENE_TILT, base + (Number(this.sceneTiltAdjust) || 0)),
          );
      this.querySelectorAll("[data-scene-tilt-range]").forEach((input) => {
        input.value = String(Math.round(tilt));
        input.setAttribute("aria-valuenow", String(Math.round(tilt)));
      });
      this.querySelectorAll("[data-scene-tilt-value]").forEach(
        (output) => (output.textContent = `${Math.round(tilt)}°`),
      );
      this.dataset.sceneTiltControl = standalone
        ? "range + buttons · standalone"
        : "range + buttons";
    }
    setAdminStandaloneZoomV5370(value, animate = true) {
      const camera = this._adminStandaloneCameraV5370;
      if (!camera) return;
      const target = Math.max(MIN_SCENE_ZOOM, Math.min(MAX_SCENE_ZOOM, Number(value) || 1));
      const from = Math.max(
        MIN_SCENE_ZOOM,
        Math.min(MAX_SCENE_ZOOM, Number(camera.zoom) || 1),
      );
      const apply = (zoom) => {
        camera.zoom = Math.max(MIN_SCENE_ZOOM, Math.min(MAX_SCENE_ZOOM, Number(zoom) || 1));
        camera.updateProjectionMatrix();
        this.ensureAdminStandaloneAerialCoverV9?.({
          clampPan: true,
          render: false,
        });
        this.sceneManualZoom = camera.zoom;
        this.dataset.sceneZoom = `${Math.round(camera.zoom * 100)}%`;
        this.clampAdminStandalonePanV5370(
          this.sceneManualPan?.x || 0,
          this.sceneManualPan?.y || 0,
        );
        this.setAdminStandalonePanV5370(
          this.sceneManualPan?.x || 0,
          this.sceneManualPan?.y || 0,
          false,
        );
      };
      if (!animate) {
        apply(target);
        this.rememberMapView();
        return;
      }
      const started = now(),
        token = Symbol("standalone-zoom");
      this._adminStandaloneTransitionV5370 = token;
      const tick = (now) => {
        if (this._adminStandaloneTransitionV5370 !== token) return;
        const t = Math.min(1, (now - started) / 240),
          e = t * t * (3 - 2 * t);
        apply(from + (target - from) * e);
        if (t < 1) scheduleFrame(tick);
        else {
          apply(target);
          this.rememberMapView();
        }
      };
      scheduleFrame(tick);
    }
  };
  for (const name of Object.getOwnPropertyNames(AdminStandaloneCameraMethodsV1.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(AdminStandaloneCameraMethodsV1.prototype, name),
    );
  }
};
