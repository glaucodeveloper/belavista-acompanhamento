const COMPACT_MAP_RENDERER_DEPENDENCIES_V1 = Object.freeze([
  "blendStageOverlayColorV1",
  "getSharedMapScene",
  "normalizeStageOverlayKeysV1",
  "stageOverlayKey",
  "stageOverlayLabelV1",
]);

export const installCompactMapRendererV1 = (MapScene, dependencies = {}) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Compact map renderer requires the existing MapScene constructor.");
  for (const name of COMPACT_MAP_RENDERER_DEPENDENCIES_V1)
    if (typeof dependencies[name] !== "function")
      throw new TypeError(`Compact map renderer requires ${name}().`);
  for (const name of ["MODEL_VERTICAL_EXAGGERATION", "SCENE_MAP_Z"])
    if (!Number.isFinite(dependencies[name]))
      throw new TypeError(`Compact map renderer requires numeric ${name}.`);

  const {
    blendStageOverlayColorV1,
    getSharedMapScene,
    MODEL_VERTICAL_EXAGGERATION,
    normalizeStageOverlayKeysV1,
    SCENE_MAP_Z,
    stageOverlayKey,
    stageOverlayLabelV1,
  } = dependencies;

  const CompactMapRendererMethodsV1 = class {
    renderSharedMap() {
      if (
        !this.hasAttribute("compact") ||
        !this.isConnected ||
        !this._compactVisible
      )
        return;
      const source = getSharedMapScene();
      if (
        !source?.THREE ||
        !source?.scene ||
        !source?.camera ||
        !source?.modelReady ||
        !source?._modelGpuReady
      ) {
        this.dataset.mapMirror = "waiting-main-gpu";
        return;
      }
      const canvas = this.querySelector(".compact-map-canvas"),
        rect = canvas?.getBoundingClientRect();
      if (!canvas || !rect?.width || !rect?.height) return;
      const THREE = source.THREE;
      if (!this._compactRenderer) {
        this._compactRenderer = new THREE.WebGLRenderer({
          canvas,
          alpha: false,
          antialias: false,
          powerPreference: "low-power",
          precision: "mediump",
        });
        this._compactRenderer.outputColorSpace = THREE.SRGBColorSpace;
        this._compactRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._compactRenderer.toneMappingExposure =
          source.renderer?.toneMappingExposure || 1;
        this._compactCamera = source.camera.clone();
      }
      const w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      this._compactRenderer.setPixelRatio(1);
      this._compactRenderer.setSize(w, h, false);
      this._compactCamera.copy(source.camera);
      this._compactCamera.aspect = w / h;
      // O renderer compacto não herda o enquadramento da tela inteira: ele
      // focaliza a caixa tridimensional do loteamento. Assim o vão de imagem
      // do mapa de lotes mostra a implantação ocupando a área útil, sem captura
      // de canvas, textura rasterizada ou uma segunda carga do GLB.
      /*
       * O renderer dos cards não pode herdar o transform visual da tela inteira.
       * A cena principal pode estar em zoom 900%, inclinada ou deslocada; usar
       * essa caixa de mundo no compacto fazia o loteamento parecer minúsculo,
       * achatado ou preso em um canto. Para cards que exibem somente o GLB,
       * renderizamos o mesmo objeto Three.js em uma pose neutra temporária,
       * compartilhando geometrias e materiais — nunca uma imagem rasterizada e
       * nunca uma segunda carga do arquivo.
       */
      const compactModelOnly = !this.hasAttribute("data-base-map"),
        stage = source.sceneStage,
        modelRoot = source.modelGroup,
        modelFrame = source.masterplanModel,
        mapSurface = source.mapSurface;
      const savedStage = stage
        ? {
            position: stage.position.clone(),
            rotation: stage.rotation.clone(),
            scale: stage.scale.clone(),
          }
        : null;
      const savedRoot = modelRoot
        ? {
            position: modelRoot.position.clone(),
            rotation: modelRoot.rotation.clone(),
            scale: modelRoot.scale.clone(),
          }
        : null;
      const savedFrame = modelFrame
        ? {
            position: modelFrame.position.clone(),
            rotation: modelFrame.rotation.clone(),
            scale: modelFrame.scale.clone(),
          }
        : null;
      const savedSurface = mapSurface
        ? {
            position: mapSurface.position.clone(),
            rotation: mapSurface.rotation.clone(),
            scale: mapSurface.scale.clone(),
            visible: mapSurface.visible,
          }
        : null;
      // Todo espelho usa a mesma origem local: a pose de zoom/tilt/pan da tela
      // principal nunca deve contaminar o mapa dos cards ou o mapa comercial de
      // Leads. O mapa e o GLB continuam juntos dentro do mesmo sceneStage.
      if (stage && modelRoot) {
        stage.position.set(0, 0, 0);
        stage.rotation.set(0, 0, 0);
        stage.scale.setScalar(1);
        modelRoot.position.set(0, 0, 0);
        modelRoot.rotation.set(0, 0, 0);
        modelRoot.scale.setScalar(1);
        if (modelFrame && source.masterplanLargest) {
          const compactScale =
            145 / Math.max(1, Number(source.masterplanLargest));
          modelFrame.scale.set(
            compactScale,
            compactScale * MODEL_VERTICAL_EXAGGERATION,
            compactScale,
          );
        }
      }
      source.scene?.updateMatrixWorld?.(true);
      modelRoot?.updateMatrixWorld?.(true);
      const modelBounds = new THREE.Box3().setFromObject(modelRoot),
        modelCenter = modelBounds.getCenter(new THREE.Vector3()),
        modelSize = modelBounds.getSize(new THREE.Vector3());
      if (Number.isFinite(modelCenter.x) && modelSize.lengthSq() > 0) {
        const aspect = Math.max(0.45, w / h),
          fov = 34;
        const footprintSpan = Math.max(
            modelSize.x,
            modelSize.y,
            modelSize.z / aspect,
          ),
          frameSpan = Math.max(footprintSpan, modelSize.y * 1.08),
          distance = Math.max(
            18,
            (frameSpan / (2 * Math.tan((fov * Math.PI) / 360))) * 1.12,
          );
        const direction = new THREE.Vector3(0.22, 0.62, 0.76).normalize();
        if (this._compactCamera.isOrthographicCamera) {
          const verticalSpan = Math.max(
            1,
            Math.max(modelSize.x / aspect, modelSize.y, modelSize.z) * 1.24,
          );
          this._compactCamera.left = (-verticalSpan * aspect) / 2;
          this._compactCamera.right = (verticalSpan * aspect) / 2;
          this._compactCamera.top = verticalSpan / 2;
          this._compactCamera.bottom = -verticalSpan / 2;
          this._compactCamera.zoom = 1;
        } else this._compactCamera.fov = fov;
        this._compactCamera.position
          .copy(modelCenter)
          .addScaledVector(direction, distance);
        this._compactCamera.lookAt(modelCenter);
        this._compactCamera.near = 0.1;
        this._compactCamera.far = Math.max(10000, distance * 8);
        this._compactCamera.updateProjectionMatrix();
        this.dataset.mapMirrorFrame = `${Math.round(modelSize.x)}×${Math.round(modelSize.y)}×${Math.round(modelSize.z)} · ${Math.round(distance)}`;
        // O mapa comercial também é renderizado na cena, nunca capturado como
        // imagem. No compacto ele recebe a mesma caixa do GLB para que o
        // loteamento fique centralizado e ocupe o vão sem bordas sobrando.
        if (!compactModelOnly && mapSurface) {
          mapSurface.position.set(
            modelCenter.x,
            modelCenter.y,
            savedSurface?.position.z ?? SCENE_MAP_Z,
          );
          mapSurface.rotation.set(0, 0, 0);
          // O mapa comercial ocupa o hero inteiro. A margem evita bordas vazias
          // quando a câmera compacta é inclinada ou gira.
          mapSurface.scale.set(
            Math.max(modelSize.x * 3.4, 1),
            Math.max(modelSize.y * 3.4, 1),
            1,
          );
        }
      } else if (this._compactCamera.isOrthographicCamera) {
        const span = Math.max(1, Math.max(w, h) * 1.2);
        this._compactCamera.left = (-span * (w / h)) / 2;
        this._compactCamera.right = (span * (w / h)) / 2;
        this._compactCamera.top = span / 2;
        this._compactCamera.bottom = -span / 2;
        this._compactCamera.zoom = 1;
        this._compactCamera.updateProjectionMatrix();
      } else {
        this._compactCamera.fov = Math.min(58, source.camera.fov * 1.18);
        this._compactCamera.updateProjectionMatrix();
      }
      // Cards de etapa mostram só o GLB; o mapa comercial interativo reutiliza
      // a própria superfície OpenStreet já em memória. Nada é rasterizado e o
      // modelo continua sendo renderizado pelo renderer WebGL do compact.
      const hasOverlayOverride = Object.prototype.hasOwnProperty.call(
        this.dataset,
        "overlayKeys",
      );
      const overlays = hasOverlayOverride
        ? normalizeStageOverlayKeysV1(this.dataset.overlayKeys)
        : normalizeStageOverlayKeysV1(
            this.getAttribute("data-overlays") ||
              this.getAttribute("data-overlay") ||
              this.dataset.overlayKey ||
              stageOverlayKey(this.getAttribute("data-stage")),
          );
      const all = [
        ...(source.modelParts?.lots || []),
        ...(source.modelParts?.streets || []),
        ...(source.modelParts?.other || []),
      ];
      const targetSets = new Map(
          overlays.map((key) => [
            key,
            new Set(source.stageOverlayTargets?.[key] || []),
          ]),
        ),
        previous = new Map(),
        highlighted = new Set();
      const paint = (
        material,
        paintColor = blendStageOverlayColorV1(overlays),
      ) => {
        if (!material) return material;
        const key = `${overlays.join("+")}:${paintColor}:${material.uuid}`;
        this._compactStageMaterials ??= new Map();
        if (!this._compactStageMaterials.has(key)) {
          const clone = material.clone();
          clone.color?.setHex(paintColor);
          if (clone.emissive) {
            clone.emissive.setHex(paintColor);
            clone.emissiveIntensity = 0.62;
          }
          clone.transparent = true;
          clone.opacity = Math.max(0.74, Math.min(0.94, clone.opacity ?? 1));
          clone.depthWrite = false;
          this._compactStageMaterials.set(key, clone);
        }
        return this._compactStageMaterials.get(key);
      };
      all.forEach((node) => {
        previous.set(node, node.material);
        const base = node.userData.defaultMaterial || node.material;
        const matches = overlays.filter((key) => targetSets.get(key)?.has(node));
        matches.forEach(() => highlighted.add(node));
        const color = blendStageOverlayColorV1(matches);
        const special =
          matches[0] === "terraplanagem"
            ? node.userData.partKind === "streets"
              ? node.userData.gravelMaterial
              : node.userData.earthworkMaterial
            : null;
        const overlayBase = special || base;
        node.material = matches.length
          ? Array.isArray(overlayBase)
            ? overlayBase.map((material) => paint(material, color))
            : paint(overlayBase, color)
          : base;
      });
      const mapSurfaceVisible = source.mapSurface?.visible;
      if (mapSurface)
        mapSurface.visible = this.hasAttribute("data-base-map")
          ? mapSurfaceVisible
          : false;
      this._compactRenderer.setClearColor(0x0b1724, 1);
      try {
        this._compactRenderer.render(source.scene, this._compactCamera);
      } finally {
        if (mapSurface) {
          mapSurface.visible = mapSurfaceVisible;
          if (savedSurface) {
            mapSurface.position.copy(savedSurface.position);
            mapSurface.rotation.copy(savedSurface.rotation);
            mapSurface.scale.copy(savedSurface.scale);
          }
        }
        if (stage && savedStage) {
          stage.position.copy(savedStage.position);
          stage.rotation.copy(savedStage.rotation);
          stage.scale.copy(savedStage.scale);
        }
        if (modelRoot && savedRoot) {
          modelRoot.position.copy(savedRoot.position);
          modelRoot.rotation.copy(savedRoot.rotation);
          modelRoot.scale.copy(savedRoot.scale);
        }
        if (modelFrame && savedFrame) {
          modelFrame.position.copy(savedFrame.position);
          modelFrame.rotation.copy(savedFrame.rotation);
          modelFrame.scale.copy(savedFrame.scale);
        }
        source.scene?.updateMatrixWorld?.(true);
      }
      const overlaySpan = this.querySelector(".compact-map-overlay");
      if (overlaySpan)
        overlaySpan.className = `compact-map-overlay ${overlays.map((key) => `overlay-${key}`).join(" ")}`;
      this.dataset.mapMirror = "shared-webgl-live-model-only";
      this.dataset.modelRasterized = "false";
      this.dataset.modelSource = "shared-live-glb";
      this.dataset.overlayKeys = overlays.join(",");
      this.dataset.stageHighlight = stageOverlayLabelV1(overlays);
      this.dataset.overlayLayerCount = String(overlays.length);
      this.dataset.highlightTargets = String(highlighted.size);
    }
  };

  Object.defineProperty(MapScene.prototype, "renderSharedMap", {
    configurable: true,
    writable: true,
    value: CompactMapRendererMethodsV1.prototype.renderSharedMap,
  });
  return MapScene;
};
