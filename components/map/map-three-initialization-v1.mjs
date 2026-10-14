/** Installs MapScene's WebGL/Three.js initialization lifecycle. */
export const installMapThreeInitializationV1 = (MapScene, {
  MAP_CAMERA_VIEW,
  MAP_GEOREFERENCE_FALLBACK,
  SCENE_MAP_Z,
  SCENE_MODEL_BASE_Z,
  TILT_DRAG_SENSITIVITY,
  ZOOM_DRAG_SENSITIVITY,
  appStore,
  solarStateForHour,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("MapScene initialization requires MapScene.prototype.");
  if (!documentRef?.createElement) throw new TypeError("MapScene initialization requires document.createElement().");
  if (!windowRef) throw new TypeError("MapScene initialization requires the browser window.");
  for (const [name, value] of Object.entries({
    MAP_CAMERA_VIEW,
    MAP_GEOREFERENCE_FALLBACK,
    SCENE_MAP_Z,
    SCENE_MODEL_BASE_Z,
    TILT_DRAG_SENSITIVITY,
    ZOOM_DRAG_SENSITIVITY,
    appStore,
    solarStateForHour,
  })) if (value === undefined) throw new TypeError(`MapScene initialization requires ${name}.`);
  const document = documentRef, window = windowRef;
  class MapThreeInitializationV1 {
  async initThree() {
    if (this.hasAttribute("data-public-static-only")) {
      this.dataset.three = "blocked-static-only";
      this.dataset.publicThree = "disabled-static-only";
      this.dataset.modelBootPhase = "static-only-no-webgl";
      return false;
    }
    if (
      this.isAdminStandalone3DV5370?.() &&
      !this._adminStandaloneActivatedV5370
    ) {
      this.dataset.three = "blocked-static-first";
      this.dataset.modelBootPhase = "blocked-until-explicit-activation";
      return false;
    }
    this.dataset.three = "loading";
    if (this.isPublicMapVisual()) this.dataset.publicThree = "loading";
    try {
      const THREE = await import("three");
      this.THREE = THREE;
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      this.GLTFLoader = GLTFLoader;
      const canvas = this.querySelector(".three-overlay");
      /* BELAVISTA_PUBLIC_RENDER_QUALITY_V5337 */
      const adminRuntime =
        !this.isAdminPublicMapV1() &&
        (location.pathname === "/admin" ||
        location.pathname.startsWith("/admin/") ||
        this.hasAttribute("data-admin-shared-public-map") ||
        Boolean(this.closest("belavista-app")));
      const publicHighQuality =
        !adminRuntime &&
        this.matches?.(
          "map-scene[data-public-map],map-scene[data-public-presentation]",
        );
      if (adminRuntime) {
        this.dataset.adminThreeContext = "true";
        this.dataset.publicRendererProfile = "blocked-on-admin-v5369";
      }
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: adminRuntime ? false : Boolean(publicHighQuality),
        powerPreference: adminRuntime
          ? "low-power"
          : publicHighQuality
            ? "high-performance"
            : "low-power",
        precision: adminRuntime
          ? "mediump"
          : publicHighQuality
            ? "highp"
            : "mediump",
      });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const publicRenderRatio = adminRuntime
        ? 1
        : publicHighQuality
          ? Math.min(2.0, Math.max(1.65, window.devicePixelRatio || 1))
          : 1;
      this.renderer.setPixelRatio(publicRenderRatio);
      if (publicHighQuality) {
        this.dataset.publicRenderQuality = "supersampled-highp-v5337";
        this.dataset.publicRenderPixelRatio = publicRenderRatio.toFixed(2);
      } else {
        this.dataset.bootPixelRatio = "1";
        this.dataset.adminRenderQuality = "safe-mediump-noaa-v5368";
      }
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.dataset.modelRender = "webgl-live-glb";
      this.dataset.modelRasterized = "false";
      this.dataset.three = "ready";
      if (this.isPublicMapVisual()) this.dataset.publicThree = "ready";
      this.scene = new THREE.Scene();
      const hemisphere = new THREE.HemisphereLight(0xcfe4ff, 0x1a2735, 2.6);
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
      keyLight.castShadow = true;
      keyLight.position.set(-120, -160, 220);
      keyLight.target.position.set(0, 0, 0);
      this.scene.add(hemisphere, keyLight, keyLight.target);
      this.solarHemisphere = hemisphere;
      this.solarLight = keyLight;
      this.sceneStage = new THREE.Group();
      this.sceneStage.scale.setScalar(1);
      this.scene.add(this.sceneStage);
      this.camera = this.isAdminOrthographicMapV1()
        ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10000)
        : new THREE.PerspectiveCamera(34, 1, 0.1, 10000);
      this.dataset.cameraProjection = this.isAdminOrthographicMapV1()
        ? "orthographic"
        : "perspective";
      this.applySolarLighting(
        solarStateForHour(
          this.solarHour ?? appStore.get().solarHour ?? 9,
          this.solarGeo || MAP_GEOREFERENCE_FALLBACK,
        ),
      );
      this.mapSurfaceCanvas = document.createElement("canvas");
      this.mapSurfaceTexture = new THREE.CanvasTexture(this.mapSurfaceCanvas);
      this.mapSurfaceTexture.colorSpace = THREE.SRGBColorSpace;
      this.mapSurfaceTexture.generateMipmaps = false;
      this.mapSurfaceTexture.minFilter = THREE.LinearFilter;
      this.mapSurfaceTexture.magFilter = THREE.LinearFilter;
      this.mapSurfaceTexture.anisotropy = Math.min(
        8,
        this.renderer.capabilities?.getMaxAnisotropy?.() || 1,
      );
      this.mapSurface = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this.mapSurfaceTexture,
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: false,
          depthWrite: false,
        }),
      );
      this.mapSurface.renderOrder = 0;
      this.mapSurface.visible = !this.hasAttribute("data-public-static-base");
      /* BELAVISTA_PUBLIC_STATIC_BASE_V521 */ this.mapSurface.position.z =
        SCENE_MAP_Z;
      this.sceneStage.add(this.mapSurface);
      this.dataset.mapRasterMode = "webgl-raster";
      this.dataset.mapContact = `Captura satélite local + GLB na mesma cena Three.js · sem Maps · surface z=${SCENE_MAP_Z} · model base z=${SCENE_MODEL_BASE_Z}`;
      const geo = new THREE.CircleGeometry(8, 32);
      const colors = [0x7d64ff, 0x2fe6ae, 0xffb020, 0x55a8ff, 0xff5c58];
      this.markerGroup = new THREE.Group();
      this.sceneStage.add(this.markerGroup);
      this.gpsMarkerGeometry = geo;
      this.gpsMarkerColors = colors;
      // A camada inicial usa o centro do desenho até o manifesto do DWG ser
      // carregado. O fallback mantém a cena funcional mesmo offline, mas não
      // volta a coordenadas fictícias de outro empreendimento.
      this.setGpsMarkers(THREE, [
        {
          id: "site-center",
          label: "Centro do empreendimento",
          lat: -13.00044486,
          lng: -39.62315439,
        },
      ]);
      this.dataset.dwgGeoreference = "deferred-until-gpu-ready-v5367";
      this.modelGroup = new THREE.Group();
      this.sceneStage.add(this.modelGroup);
      this.dataset.modelHeight = "native GLB scale";
      this.modelParts = { lots: [], streets: [], other: [] };
      this.stageOverlayTargets = {};
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.selectionHalo = new THREE.Mesh(
        new THREE.RingGeometry(8, 13, 48),
        new THREE.MeshBasicMaterial({
          color: 0x2fe6ae,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      this.selectionHalo.visible = false;
      this.sceneStage.add(this.selectionHalo);
      this.applySceneView(MAP_CAMERA_VIEW, false);
      this.loadMasterplan(THREE, GLTFLoader);
      // O manifesto do DWG precisa acompanhar o GLB desde o início. Sem esta
      // chamada os marcadores usavam apenas o centro de fallback e a matriz
      // afim nunca era recalculada quando o modelo terminava o staging.
      // A rotina é independente do carregamento do GLB: se o DWG chegar antes,
      // o último sync do enriquecimento aplica a transformação; se chegar
      // depois, setGpsMarkers() sincroniza a cena novamente.
      this.loadDwgGeoreference(THREE);
      let down = null,
        lastX = 0,
        lastY = 0,
        dragging = false,
        panning = false,
        tilting = false,
        rotating = false,
        zooming = false,
        selecting = false;
      canvas.addEventListener("contextmenu", (event) => event.preventDefault());
      /* A roda aproxima o mapa; Ctrl + roda usa passos menores para ajuste
       * preciso. O host captura o evento sobre todas as camadas da cena. */
      const zoomSceneAtCursorByCtrlWheel = (event) => {
        if (event.defaultPrevented) return;
        const target = event.target;
        if (
          target?.closest?.(
            'button,input,select,textarea,label,a,[contenteditable="true"]',
          )
        )
          return;
        const rect = canvas.getBoundingClientRect?.();
        if (
          !rect ||
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const wheelMagnitude = Math.max(
          event.ctrlKey ? 0.025 : 0.055,
          Math.min(
            event.ctrlKey ? 0.08 : 0.18,
            Math.abs(Number(event.deltaY) || 0) * (event.ctrlKey ? 0.00035 : 0.0008),
          ),
        );
        const nextZoom =
          this.sceneManualZoom +
          (event.deltaY < 0 ? wheelMagnitude : -wheelMagnitude);
        this.setSceneZoomAt(nextZoom, event.clientX, event.clientY, false);
        this.dataset.mapGesture = event.ctrlKey ? "ctrl-wheel-zoom" : "wheel-zoom";
        this.dataset.sceneWheelZoom = event.ctrlKey
          ? "ctrl-wheel · cursor-ground · precise"
          : "wheel · cursor-ground";
        this.queueSceneBoundsCommit("wheel-zoom");
      };
      this.addEventListener("wheel", zoomSceneAtCursorByCtrlWheel, {
        capture: true,
        passive: false,
      });
      canvas.addEventListener("pointerdown", (event) => {
        down = { x: event.clientX, y: event.clientY };
        lastX = event.clientX;
        lastY = event.clientY;
        dragging = false;
        // O modo de pintura de registros tem prioridade sobre a seleção por
        // retângulo. Sem esta guarda, deixar “Progresso” ativo na tela
        // anterior intercepta o clique e impede que o GLB entregue o trecho
        // de rua ao formulário.
        // Em Registros, “Pintar no mapa” transforma o botão esquerdo em
        // seleção: clique escolhe uma superfície; arraste desenha uma área.
        const altSelection = event.altKey && event.button === 0;
        selecting =
          (this.recordPaintMode ||
            this.mapSelectionMode === "progress" ||
            altSelection) &&
          event.button === 0;
        if (
          altSelection &&
          !this.recordPaintMode &&
          this.mapSelectionMode !== "progress"
        )
          this.setMapSelectionMode("progress");
        // Shift + arraste vertical controla o zoom; Ctrl continua aceito como
        // atalho compatível. Inclinação permanece disponível pelos controles.
        tilting = false;
        zooming =
          !selecting &&
          event.button === 0 &&
          (event.shiftKey || event.ctrlKey);
        rotating = !selecting && event.button === 2;
        panning =
          !selecting &&
          !zooming &&
          !tilting &&
          !rotating &&
          (event.button === 0 || event.button === 1);
        this.dataset.mapGesture = selecting
          ? "select-progress"
          : zooming
            ? event.shiftKey
              ? "shift-drag-zoom"
              : "ctrl-drag-zoom"
            : rotating
              ? "rotate"
              : panning
                ? "pan"
                : "idle";
        if (selecting) this.beginMapAreaSelection(event.clientX, event.clientY);
        canvas.setPointerCapture?.(event.pointerId);
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!down) return;
        const total = Math.hypot(
          event.clientX - down.x,
          event.clientY - down.y,
        );
        if (!dragging && total > 6) dragging = true;
        if (dragging) {
          const dx = event.clientX - lastX,
            dy = event.clientY - lastY;
          if (selecting)
            this.updateMapAreaSelection(event.clientX, event.clientY);
          else if (zooming)
            this.setSceneZoomAt(
              this.sceneManualZoom - dy * ZOOM_DRAG_SENSITIVITY,
              event.clientX,
              event.clientY,
              false,
            );
          else if (tilting)
            this.setSceneTiltAdjust(
              this.sceneTiltAdjust + dy * TILT_DRAG_SENSITIVITY,
              false,
            );
          else if (rotating)
            this.setSceneRotation(this.sceneManualRotation + dx * 0.32, false);
          else if (panning) {
            // O pan precisa acompanhar a projeção perspectiva. Dividir dx/dy
            // somente pela escala funciona em vista ortogonal, mas erra com
            // a inclinação e faz o mapa escapar ou andar pouco no zoom. A
            // interseção dos dois ponteiros com o plano XY devolve o delta no
            // mesmo espaço mundial usado por mapSurface, GLB e markers.
            const projectedDelta = this.screenDragPanDelta(
              lastX,
              lastY,
              event.clientX,
              event.clientY,
            );
            const terrainDx = Number(projectedDelta?.x) || 0;
            const terrainDy = Number(projectedDelta?.y) || 0;
            const currentPan = this.sceneManualPan || { x: 0, y: 0 };
            const bounds = this.getScenePanBounds?.() || {
              x: Infinity,
              y: Infinity,
            };
            const limitX = Number.isFinite(Number(bounds.x))
              ? Math.max(0, Number(bounds.x))
              : Infinity;
            const limitY = Number.isFinite(Number(bounds.y))
              ? Math.max(0, Number(bounds.y))
              : Infinity;
            const nextPanX = Math.max(
              -limitX,
              Math.min(limitX, currentPan.x + terrainDx),
            );
            const nextPanY = Math.max(
              -limitY,
              Math.min(limitY, currentPan.y + terrainDy),
            );
            this.setScenePan(nextPanX, nextPanY, false);
            this.dataset.mapPanBehavior =
              "world-translation · projected screen delta · zoom-aware v5332";
          }
          lastX = event.clientX;
          lastY = event.clientY;
          this._suppressMapToggleUntil = performance.now() + 300;
        }
      });
      canvas.addEventListener("pointerup", (event) => {
        if (!down) return;
        const shouldConstrain =
          dragging && !selecting && (panning || tilting || rotating || zooming);
        const total = Math.hypot(
          event.clientX - down.x,
          event.clientY - down.y,
        );
        if (selecting) {
          if (dragging) {
            if (this.recordPaintMode) {
              const parts = this.collectModelPartsInRect(down, {
                x: event.clientX,
                y: event.clientY,
              });
              if (parts.length > 1) this.selectRecordMapParts(parts);
              else if (parts.length === 1) this.selectRecordMapPart(parts[0]);
              else this.clearCurrentMapSelectionV1(true);
            } else this.finishMapAreaSelection(event.clientX, event.clientY);
          } else {
            this.removeMapAreaSelection();
            const point = this.pointFromClient(event.clientX, event.clientY);
            const picked = point ? this.pickModelAt(point) : false;
            if (!picked) this.clearCurrentMapSelectionV1(true);
          }
          this._suppressMapToggleUntil = performance.now() + 520;
        } else if (
          event.button !== 2 &&
          !dragging &&
          total <= 6 &&
          event.pointerType !== "touch"
        ) {
          const point = this.pointFromClient(event.clientX, event.clientY);
          const picked = point ? this.pickModelAt(point) : false;
          if (!picked) this.clearCurrentMapSelectionV1(true);
          this._suppressMapToggleUntil = performance.now() + 520;
        } else this._suppressMapToggleUntil = performance.now() + 520;
        canvas.releasePointerCapture?.(event.pointerId);
        if (shouldConstrain) this.constrainScenePan("pointer-release");
        down = null;
        dragging = false;
        panning = false;
        tilting = false;
        rotating = false;
        zooming = false;
        selecting = false;
        delete this.dataset.mapGesture;
      });
      canvas.addEventListener("pointercancel", () => {
        const shouldConstrain =
          dragging && !selecting && (panning || tilting || rotating || zooming);
        this.removeMapAreaSelection();
        if (shouldConstrain) this.constrainScenePan("pointer-cancel");
        down = null;
        dragging = false;
        panning = false;
        tilting = false;
        rotating = false;
        zooming = false;
        selecting = false;
        delete this.dataset.mapGesture;
      });
      // Keep the active gesture visible for diagnostics without introducing a
      // second visual map layer or changing the shared Three.js transform.
      canvas.addEventListener("pointerdown", () => {
        if (!this.dataset.mapGesture) this.dataset.mapGesture = "holding";
      });
      const releaseMapGesture = () => {
        delete this.dataset.mapGesture;
      };
      canvas.addEventListener("pointerup", releaseMapGesture);
      canvas.addEventListener("pointercancel", releaseMapGesture);
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        this.dataset.threeContext = "lost";
        this.dataset.mapTexture = "fallback";
      });
      canvas.addEventListener("webglcontextrestored", () => {
        delete this.dataset.threeContext;
        this.dataset.mapTexture = "loading";
        if (this._modelGpuReady) this.syncThree();
      });
      this.dataset.threeBoot = "renderer-ready-awaiting-glb";
    } catch (err) {
      const publicStaticFallback = this.isPublicCustomerExperience?.();
      this.dataset.three = publicStaticFallback ? "fallback-static" : "fallback";
      if (this.isPublicMapVisual())
        this.dataset.publicThree = publicStaticFallback ? "fallback-static" : "fallback";
      this.dataset.modelError = String(err?.message || err || "three-init-failed").slice(0, 240);
      this.dataset.modelBootPhase = "three-init-error";
      if (publicStaticFallback)
        this.preparePublicStaticBaseV1("static-fallback");
      else this.updateMap3DLoadingScreenV1("three-init-error");
      console.warn("Three.js indisponível, mantendo a base pública estática.", err);
    }
  }
  }
  Object.defineProperty(MapScene.prototype, "initThree", Object.getOwnPropertyDescriptor(MapThreeInitializationV1.prototype, "initThree"));
};
