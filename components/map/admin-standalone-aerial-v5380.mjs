/** Installs the complete reference-aerial loading, alignment and texture behavior on MapScene. */
export const installAdminStandaloneAerialV5380 = (MapScene, {
  ADMIN_REFERENCE_AERIAL_ASSET_V1,
  ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
  ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
  ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
  ADMIN_REFERENCE_AERIAL_VERSION_V1,
  ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
  ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1,
  ADMIN_STANDALONE_MODEL_STREET_DROP_V1,
  ADMIN_STANDALONE_MODEL_TURN_DEG_V1,
  MODEL_EXTRA_Y_ROTATION_DEG,
  SCENE_MAP_Z,
  buildAdminReferenceAerialRasterMaskModelV1,
  runtimeRouteV1,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("Admin aerial methods require MapScene.prototype.");
  for (const [name, value] of Object.entries({
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
    ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
    ADMIN_REFERENCE_AERIAL_VERSION_V1,
    ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
    ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1,
    ADMIN_STANDALONE_MODEL_STREET_DROP_V1,
    ADMIN_STANDALONE_MODEL_TURN_DEG_V1,
    MODEL_EXTRA_Y_ROTATION_DEG,
    SCENE_MAP_Z,
    buildAdminReferenceAerialRasterMaskModelV1,
    runtimeRouteV1,
  })) if (value === undefined) throw new TypeError(`Admin aerial methods require ${name}.`);

  class AdminStandaloneAerialMethodsV5380 {
  async prepareAdminStandaloneAerialPreviewV5380({
    THREE,
    stage,
    camera,
    canvas,
  }) {
    if (this._adminStandaloneAerialPreviewPromiseV5380) {
      return this._adminStandaloneAerialPreviewPromiseV5380;
    }

    const run = async () => {
      let image = this.adminReferenceAerialImageV1;
      if (!image) {
        image = await new Promise((resolve, reject) => {
          const asset = new Image();
          asset.decoding = "async";
          asset.onload = () => resolve(asset);
          asset.onerror = () =>
            reject(new Error("Imagem aérea de referência indisponível"));
          asset.src = runtimeRouteV1(
            ADMIN_REFERENCE_AERIAL_ASSET_V1,
            `v=${ADMIN_REFERENCE_AERIAL_VERSION_V1}`,
          );
        });
      }

      let texture = this.adminReferenceAerialTextureV1;
      if (!texture) {
        texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      } else {
        texture.image = image;
      }
      const textureRenderer =
        this._adminStandaloneRendererV5370 || this.renderer;
      texture.anisotropy = Math.max(
        1,
        Number(textureRenderer?.capabilities?.getMaxAnisotropy?.()) || 1,
      );
      texture.needsUpdate = true;
      this.adminReferenceAerialImageV1 = image;
      this.adminReferenceAerialTextureV1 = texture;

      let terrain = this.adminReferenceAerialTerrainV1;
      if (!terrain) {
        terrain = new THREE.Mesh(
          new THREE.PlaneGeometry(
            1,
            1,
            ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
            ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
          ),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            side: THREE.DoubleSide,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            toneMapped: false,
          }),
        );
        terrain.name = "BelavistaAdminReferenceAerialBasePlane";
        terrain.userData = {
          adminReferenceEnvironment: true,
          kind: "terrain",
          source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
          textureRole:
            "full aerial image · ground base only · never projected on GLB",
          geometry: "subdivided relief from aerial luminance and vegetation",
          reliefProfile: "deterministic rolling undulation · presentation-only",
          reliefAmplitude: ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
        };
        this.adminReferenceAerialTerrainV1 = terrain;
      }

      if (terrain.parent !== stage) stage.add(terrain);
      if (terrain.material?.type !== "MeshBasicMaterial") {
        const previousMaterial = terrain.material;
        terrain.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: texture,
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: true,
          depthWrite: true,
          toneMapped: false,
        });
        if (Array.isArray(previousMaterial))
          previousMaterial.forEach((item) => item?.dispose?.());
        else previousMaterial?.dispose?.();
      }
      terrain.material.map = texture;
      terrain.material.color?.setRGB?.(1, 1, 1);
      terrain.material.toneMapped = false;
      terrain.material.transparent = false;
      terrain.material.depthTest = true;
      terrain.material.depthWrite = true;
      terrain.material.needsUpdate = true;

      const viewHeight = Math.max(
          2,
          Number(this._adminStandaloneOrthoViewHeightV5370) || 320,
        ),
        viewWidth =
          Math.abs(Number(camera.right) - Number(camera.left)) || viewHeight,
        imageAspect = Math.max(
          0.2,
          (Number(image.naturalWidth || image.width) || 1672) /
            (Number(image.naturalHeight || image.height) || 941),
        ),
        previewWidth = Math.max(240, viewWidth * 1.22),
        previewHeight = Math.max(180, previewWidth / imageAspect);
      terrain.position.set(0, 0, SCENE_MAP_Z - 0.06);
      terrain.rotation.set(0, 0, 0);
      terrain.scale.set(previewWidth, previewHeight, 1);
      terrain.renderOrder = -30;
      terrain.frustumCulled = false;
      terrain.visible = true;

      this.dataset.adminSatelliteState = "ready-three-terrain-preview";
      this.dataset.adminSatelliteTiles = "three-scene-texture-preview";
      this.dataset.adminSatelliteProvider = "local-reference-aerial";
      this.dataset.adminSatelliteGround =
        "single Three.js terrain mesh · aerial image is base and texture";
      this.dataset.adminSatelliteTexture = "active on preview terrain mesh";
      this.dataset.adminReferenceAerialTerrain =
        "preview plane · will be fitted to the GLB site envelope";
      this.dataset.mapSurfaceVisible = "false";

      const host = this.querySelector(".map-host");
      if (host) {
        host.style.setProperty("background-image", "none", "important");
        host.style.visibility = "hidden";
        host.style.opacity = "0";
        host.style.pointerEvents = "none";
        host.dataset.backgroundRole = "three-terrain-texture-active";
      }
      if (canvas) {
        canvas.style.opacity = "1";
        canvas.style.visibility = "visible";
        canvas.style.display = "block";
      }
      this._adminStandaloneRendererV5370?.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370 || camera,
      );
      return terrain;
    };

    this._adminStandaloneAerialPreviewPromiseV5380 = run().finally(() => {
      this._adminStandaloneAerialPreviewPromiseV5380 = null;
    });
    return this._adminStandaloneAerialPreviewPromiseV5380;
  }

  async loadAdminStandaloneSatelliteBaseV5380({
    THREE,
    stage,
    fitBox,
    fitCenter,
  }) {
    if (this._adminStandaloneSatellitePromiseV5380) {
      return this._adminStandaloneSatellitePromiseV5380;
    }

    const run = async () => {
      this.dataset.adminSatelliteState = "loading";
      this.dataset.adminSatelliteSource = `${ADMIN_REFERENCE_AERIAL_ASSET_V1} · Three.js terrain texture · loading`;

      // A imagem não é a decoração do host. Ela é carregada como textura de
      // uma malha que pertence à cena e compartilha o mesmo envelope do GLB.
      // O host só oferece uma fotografia transitória enquanto essa malha é
      // construída; ele é ocultado assim que a textura entra no renderer.
      let image = this.adminReferenceAerialImageV1;
      if (!image) {
        image = await new Promise((resolve, reject) => {
          const asset = new Image();
          asset.decoding = "async";
          asset.onload = () => resolve(asset);
          asset.onerror = () =>
            reject(new Error("Imagem aérea de referência indisponível"));
          asset.src = runtimeRouteV1(
            ADMIN_REFERENCE_AERIAL_ASSET_V1,
            `v=${ADMIN_REFERENCE_AERIAL_VERSION_V1}`,
          );
        });
      }
      let texture = this.adminReferenceAerialTextureV1;
      if (!texture) {
        texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      } else {
        texture.image = image;
      }
      const textureRenderer =
        this._adminStandaloneRendererV5370 || this.renderer;
      texture.anisotropy = Math.max(
        1,
        Number(textureRenderer?.capabilities?.getMaxAnisotropy?.()) || 1,
      );
      texture.needsUpdate = true;

      this.dataset.adminSatelliteTextureSource =
        ADMIN_REFERENCE_AERIAL_ASSET_V1;
      this.dataset.adminSatelliteTextureResolution =
        `${image.naturalWidth || image.width || 0}x${image.naturalHeight || image.height || 0} · prévia realista da cena · base 4K`;

      const frame = this.adminReferenceAerialFrameV1();
      let aerialAnchorFitBox = fitBox.clone();
      let aerialAnchorFitCenter = fitCenter.clone();
      const wrapper = this._adminStandaloneWrapperV5370;
      const camera = this._adminStandaloneCameraV5370;
      const canvas = this.querySelector(".three-overlay");
      const standaloneAlignment = ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
        alignmentRotation = standaloneAlignment.rotationDeg || {},
        alignmentTranslation = standaloneAlignment.translation || {},
        alignmentScaleXY = standaloneAlignment.scaleXY || {},
        alignmentScale = Math.max(
          0.5,
          Math.min(1.5, Number(standaloneAlignment.scale) || 1),
        ),
        alignmentScaleX = Math.max(
          0.5,
          Math.min(2, Number(alignmentScaleXY.x) || 1),
        ),
        alignmentScaleY = Math.max(
          0.5,
          Math.min(2, Number(alignmentScaleXY.y) || 1),
        );

      // A referência aérea histórica usa `background-size: cover` para
      // calcular a janela de implantação. Esse cálculo agora posiciona a
      // superfície texturizada da cena, não um background independente.
      // Ajuste a câmera do
      // modelo para a mesma janela UV da implantação, em vez de centralizar
      // o GLB no viewport inteiro. Assim a planta cai sobre os lotes da foto
      // e o entorno permanece na mesma textura do terreno.
      if (
        wrapper &&
        camera &&
        canvas &&
        !wrapper.userData?.adminReferenceAerialGeoWarp
      ) {
        // O mapa pode iniciar enquanto o shell ainda está saindo de
        // `display: none`. Calcular o encaixe nesse instante usa 2×2 como
        // viewport e grava uma escala inválida para toda a cena. Aguarde o
        // primeiro layout real do canvas antes de projetar o modelo na foto.
        let viewportWidth = 0;
        let viewportHeight = 0;
        let previousWidth = 0;
        let previousHeight = 0;
        let stableFrames = 0;
        for (let attempt = 0; attempt < 12; attempt++) {
          const canvasRect = canvas.getBoundingClientRect();
          const nextWidth = Math.round(
            canvasRect.width || canvas.clientWidth || this.clientWidth || 0,
          );
          const nextHeight = Math.round(
            canvasRect.height || canvas.clientHeight || this.clientHeight || 0,
          );
          viewportWidth = nextWidth;
          viewportHeight = nextHeight;
          if (nextWidth > 100 && nextHeight > 100) {
            stableFrames =
              nextWidth === previousWidth && nextHeight === previousHeight
                ? stableFrames + 1
                : 0;
            if (stableFrames >= 2) break;
          }
          previousWidth = nextWidth;
          previousHeight = nextHeight;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        viewportWidth = Math.max(2, viewportWidth);
        viewportHeight = Math.max(2, viewportHeight);
        this.dataset.adminReferenceAerialViewport = `${viewportWidth}x${viewportHeight}`;
        const imageWidth = Math.max(1, image.naturalWidth || image.width || 1);
        const imageHeight = Math.max(
          1,
          image.naturalHeight || image.height || 1,
        );
        const coverScale = Math.max(
          viewportWidth / imageWidth,
          viewportHeight / imageHeight,
        );
        const drawnWidth = imageWidth * coverScale;
        const drawnHeight = imageHeight * coverScale;
        const imageOffsetX = (viewportWidth - drawnWidth) / 2;
        const imageOffsetY = (viewportHeight - drawnHeight) / 2;
        const target = {
          left: imageOffsetX + frame.left * drawnWidth,
          top: imageOffsetY + frame.top * drawnHeight,
          right: imageOffsetX + frame.right * drawnWidth,
          bottom: imageOffsetY + frame.bottom * drawnHeight,
        };
        target.width = Math.max(2, target.right - target.left);
        target.height = Math.max(2, target.bottom - target.top);
        target.centerX = (target.left + target.right) / 2;
        target.centerY = (target.top + target.bottom) / 2;

        const projectedBounds = () => {
          wrapper.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(wrapper);
          const points = [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z),
          ];
          let left = Infinity,
            top = Infinity,
            right = -Infinity,
            bottom = -Infinity;
          points.forEach((point) => {
            const ndc = point.project(camera);
            const x = (ndc.x * 0.5 + 0.5) * viewportWidth;
            const y = (-ndc.y * 0.5 + 0.5) * viewportHeight;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          });
          return {
            left,
            top,
            right,
            bottom,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top),
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2,
          };
        };

        let projected = projectedBounds();
        for (let pass = 0; pass < 2; pass++) {
          const fitScale = Math.min(
            (target.width * 0.96) / projected.width,
            (target.height * 0.96) / projected.height,
          );
          if (Number.isFinite(fitScale) && fitScale > 0) {
            camera.zoom = Math.max(
              0.12,
              Math.min(10, (Number(camera.zoom) || 1) * fitScale),
            );
            camera.updateProjectionMatrix();
          }
          projected = projectedBounds();
        }

        const modelBox = new THREE.Box3().setFromObject(wrapper);
        const modelCenter = modelBox.getCenter(new THREE.Vector3());
        camera.updateMatrixWorld(true);
        const cameraRight = new THREE.Vector3()
            .setFromMatrixColumn(camera.matrixWorld, 0)
            .normalize(),
          cameraUp = new THREE.Vector3()
            .setFromMatrixColumn(camera.matrixWorld, 1)
            .normalize(),
          groundRight = new THREE.Vector3(cameraRight.x, cameraRight.y, 0),
          groundUp = new THREE.Vector3(cameraUp.x, cameraUp.y, 0),
          groundUpScale = Math.max(0.12, groundUp.length());
        groundRight.normalize();
        groundUp.multiplyScalar(1 / groundUpScale);
        // A calibração é sempre uma translação no plano do mapa. O vetor
        // cameraUp inclui Z quando a vista está inclinada; usá-lo diretamente
        // levantava o GLB e criava a falsa inclinação conjunta com a textura.
        this.dataset.adminReferenceAerialCalibration =
          "screen fit projected to ground XY · no cameraUp translation";
        const depth = Math.max(1, camera.position.distanceTo(modelCenter)),
          worldPerPixelY = camera.isOrthographicCamera
            ? (camera.top - camera.bottom) /
              (viewportHeight * Math.max(0.12, Number(camera.zoom) || 1))
            : (2 *
                depth *
                Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) /
              (viewportHeight * Math.max(0.12, Number(camera.zoom) || 1)),
          worldPerPixelX = camera.isOrthographicCamera
            ? (camera.right - camera.left) /
              (viewportWidth * Math.max(0.12, Number(camera.zoom) || 1))
            : worldPerPixelY * camera.aspect,
          shiftX = (target.centerX - projected.centerX) * worldPerPixelX,
          shiftY = (target.centerY - projected.centerY) * worldPerPixelY;
        wrapper.position.addScaledVector(groundRight, shiftX);
        // `shiftY` já está em unidades do mundo; multiplicá-lo novamente
        // por `worldPerPixelY` comprimía o ajuste vertical e deixava o GLB
        // deslocado em relação às ruas da imagem aérea.
        wrapper.position.addScaledVector(groundUp, -shiftY);
        // Correção final em coordenadas de tela, preservando o chão texturizado.
        wrapper.position.addScaledVector(
          groundRight,
          viewportWidth *
            Number(ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1.x || 0) *
            worldPerPixelX,
        );
        wrapper.position.addScaledVector(
          groundUp,
          -viewportHeight *
            Number(ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1.y || 0) *
            worldPerPixelY,
        );
        wrapper.updateMatrixWorld(true);
        // Desce o GLB em direção à rua sem mover o terreno texturizado. A
        // âncora da foto é salva antes deste deslocamento logo abaixo.
        aerialAnchorFitBox = new THREE.Box3().setFromObject(wrapper);
        aerialAnchorFitCenter = aerialAnchorFitBox.getCenter(
          new THREE.Vector3(),
        );
        wrapper.position.addScaledVector(
          groundUp,
          -viewportHeight *
            ADMIN_STANDALONE_MODEL_STREET_DROP_V1 *
            worldPerPixelY,
        );
        wrapper.updateMatrixWorld(true);
        fitBox = new THREE.Box3().setFromObject(wrapper);
        fitCenter = fitBox.getCenter(new THREE.Vector3());
        this._adminStandaloneFitBoxV5370 = fitBox.clone();
        this._adminStandaloneFitCenterV5370 = fitCenter.clone();
        this._adminStandaloneFitRadiusV5370 = fitBox.getBoundingSphere(
          new THREE.Sphere(),
        ).radius;
        this.sceneManualZoom = Number(camera.zoom) || 1;
        this.dataset.adminReferenceAerialModelFit = `${Math.round(target.left)},${Math.round(target.top)} → ${Math.round(target.right)},${Math.round(target.bottom)}`;
        this.dataset.adminReferenceAerialModelPlacement =
          "semantic GLB fitted to reference aerial site window · cover-aware";
        this.dataset.adminReferenceAerialModelRotation = `${ADMIN_STANDALONE_MODEL_TURN_DEG_V1}deg additional · effective ${Math.round(MODEL_EXTRA_Y_ROTATION_DEG + ADMIN_STANDALONE_MODEL_TURN_DEG_V1)}deg · manual ${Number(alignmentRotation.x) || 0}/${Number(alignmentRotation.y) || 0}/${Number(alignmentRotation.z) || 0}deg`;
        this.dataset.adminReferenceAerialModelScale = `${alignmentScaleX},${alignmentScaleY},${alignmentScale}`;
        this.dataset.adminReferenceAerialModelStreetDrop = `${Math.round(ADMIN_STANDALONE_MODEL_STREET_DROP_V1 * 100)}% viewport · somente GLB`;
        this.dataset.adminReferenceAerialModelScreenShift = `${ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1.x},${ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1.y}`;
        this.dataset.adminReferenceAerialRoadAlignment =
          "lower aerial road line · rotation and position anchored to background";
      }

      // No modo georreferenciado a própria homografia já coloca cada vértice
      // no UV correto da fotografia. Portanto a superfície da imagem é o plano
      // 0..1 completo, não um retângulo inferido da caixa visual do GLB.
      const geoWarp = wrapper?.userData?.adminReferenceAerialGeoWarp || null;
      const footprint = aerialAnchorFitBox.getSize(new THREE.Vector3());
      const groundWidth = Math.max(1, Number(footprint.x) || 1),
        groundDepth = Math.max(1, Number(footprint.y) || 1),
        surfaceWidth = geoWarp
          ? Math.max(1, Number(geoWarp.worldWidth) || 1)
          : Math.max(1, groundWidth / frame.siteWidth),
        surfaceHeight = geoWarp
          ? Math.max(1, Number(geoWarp.worldHeight) || 1)
          : Math.max(1, groundDepth / frame.siteDepth);
      const surface = new THREE.Object3D();
      if (geoWarp) {
        surface.position.set(
          Number(geoWarp.surfaceCenterX) || 0,
          Number(geoWarp.surfaceCenterY) || 0,
          0,
        );
      } else {
        surface.position.set(
          aerialAnchorFitCenter.x - (frame.siteCenterU - 0.5) * surfaceWidth,
          aerialAnchorFitCenter.y + (0.5 - frame.siteCenterV) * surfaceHeight,
          0,
        );
      }
      surface.scale.set(surfaceWidth, surfaceHeight, 1);
      // O chão já está ancorado no envelope original. Só agora aplicamos a
      // translação manual, preservando a possibilidade de mover o GLB sem
      // arrastar a fotografia junto.
      if (!wrapper.userData?.adminReferenceAerialGeoWarp) {
        wrapper.position.x += Number(alignmentTranslation.x) || 0;
        wrapper.position.y += Number(alignmentTranslation.y) || 0;
        wrapper.position.z += Number(alignmentTranslation.z) || 0;
      }
      wrapper.updateMatrixWorld(true);
      fitBox = new THREE.Box3().setFromObject(wrapper);
      fitCenter = fitBox.getCenter(new THREE.Vector3());
      this._adminStandaloneFitBoxV5370 = fitBox.clone();
      this._adminStandaloneFitCenterV5370 = fitCenter.clone();
      this._adminStandaloneFitRadiusV5370 = fitBox.getBoundingSphere(
        new THREE.Sphere(),
      ).radius;
      this.dataset.adminReferenceAerialModelTranslation = `${Number(alignmentTranslation.x) || 0},${Number(alignmentTranslation.y) || 0},${Number(alignmentTranslation.z) || 0}`;
      this.dataset.adminReferenceAerialSurfaceSize = `${surfaceWidth.toFixed(3)}x${surfaceHeight.toFixed(3)}`;
      this.dataset.adminReferenceAerialSurfaceAspect = (
        surfaceWidth / Math.max(0.001, surfaceHeight)
      ).toFixed(3);
      this.dataset.adminReferenceAerialFootprint = `${groundWidth.toFixed(3)}x${groundDepth.toFixed(3)}`;
      // A foto é o chão da cena no mesmo plano XY do modelo convertido. A
      // inclinação da visão vem da câmera; ela não deve ser copiada para a
      // malha da textura, pois isso faria o raster sair do plano do terreno.
      surface.rotation.set(0, 0, 0);
      surface.visible = false;
      this.dataset.adminReferenceAerialTerrainPlane =
        "shared world XY plane · GLB X/Z converted to Z-up · aerial texture base";
      this.dataset.adminReferenceAerialBasePlane =
        "BelavistaAdminReferenceAerialBasePlane · UV 0..1 · shared by terrain and semantic areas";

      this.adminReferenceAerialTextureV1 = texture;
      this.adminReferenceAerialImageV1 = image;

      // Reserve uma única malha subdividida antes da classificação raster.
      // Assim, mesmo se o Canvas 2D não puder amostrar a imagem, a fotografia
      // ainda será uma textura real do renderer; árvores/casas/veículos são
      // uma camada semântica adicional, nunca outra cópia do chão.
      let rasterTerrain = this.adminReferenceAerialTerrainV1;
      if (!rasterTerrain) {
        rasterTerrain = new THREE.Mesh(
          new THREE.PlaneGeometry(
            1,
            1,
            ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
            ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
          ),
          // A foto precisa permanecer legível mesmo antes/depois da iluminação
          // do cenário. O relevo continua sendo geometria real; a iluminação
          // dos elementos semânticos fica separada para não escurecer a base.
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            side: THREE.DoubleSide,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            toneMapped: false,
          }),
        );
        rasterTerrain.name = "BelavistaAdminReferenceAerialBasePlane";
        rasterTerrain.renderOrder = -30;
        rasterTerrain.frustumCulled = false;
        rasterTerrain.receiveShadow = true;
        rasterTerrain.userData = {
          adminReferenceEnvironment: true,
          kind: "terrain",
          source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
          textureRole:
            "full aerial image · shared 3D base plane and semantic area texture",
          geometry: "subdivided relief from aerial luminance and vegetation",
          reliefProfile: "deterministic rolling undulation · presentation-only",
          reliefAmplitude: ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
        };
        stage.add(rasterTerrain);
        this.adminReferenceAerialTerrainV1 = rasterTerrain;
      }
      rasterTerrain.position.copy(surface.position);
      rasterTerrain.rotation.copy(surface.rotation);
      rasterTerrain.scale.copy(surface.scale);
      // Keep the terrain at the same world floor as the model. The relief
      // contact correction is applied in syncAdminReferenceAerialEnvironmentV1;
      // a fixed z offset here made the photo float below the GLB whenever the
      // semantic pass was delayed or skipped.
      rasterTerrain.position.z = Number(surface.position.z || SCENE_MAP_Z);
      // Um carregamento legado pode ter criado a mesma malha em outro
      // sceneStage. Reparentar é obrigatório: esconder o host sem mover a
      // malha para o renderer isolado deixava apenas o background visível.
      if (rasterTerrain.parent !== stage) stage.add(rasterTerrain);
      // Uma montagem legada pode ter deixado esta mesma malha com material
      // dependente de luz. A textura é a base visual da cena e deve aparecer
      // mesmo quando a iluminação/loop semântico ainda está sendo preparado.
      if (rasterTerrain.material?.type !== "MeshBasicMaterial") {
        const previousMaterial = rasterTerrain.material;
        rasterTerrain.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: texture,
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: true,
          depthWrite: true,
          toneMapped: false,
        });
        if (Array.isArray(previousMaterial))
          previousMaterial.forEach((item) => item?.dispose?.());
        else previousMaterial?.dispose?.();
      }
      rasterTerrain.material.map = texture;
      rasterTerrain.material.color?.setRGB?.(1, 1, 1);
      rasterTerrain.material.toneMapped = false;
      rasterTerrain.material.needsUpdate = true;
      rasterTerrain.visible = true;
      this._adminStandaloneAerialSurfaceV5380 = surface;
      this._adminStandaloneAerialBasePlaneV5380 = rasterTerrain;
      const rasterMaskModel = buildAdminReferenceAerialRasterMaskModelV1({
        THREE,
        image,
        texture,
      });
      if (rasterMaskModel && wrapper?.userData?.adminReferenceAerialGeoWarp) {
        rasterMaskModel.position.copy(surface.position);
        rasterMaskModel.rotation.copy(surface.rotation);
        rasterMaskModel.scale.copy(surface.scale);
        rasterMaskModel.position.z =
          Number(surface.position.z || SCENE_MAP_Z) + 0.15;
        if (rasterMaskModel.parent !== stage) stage.add(rasterMaskModel);
        this._adminStandaloneRasterMaskModelV1 = rasterMaskModel;
        this.dataset.adminReferenceAerialRasterMask =
          ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1;
        this.dataset.adminReferenceAerialModelSource =
          "raster mask from aerial image · GLB semantic source hidden";
      } else {
        this._adminStandaloneRasterMaskModelV1 = null;
        this.dataset.adminReferenceAerialRasterMask =
          "disabled · pixel filter removed";
        this.dataset.adminReferenceAerialModelSource =
          "native semantic lot/street polygons with aerial texture";
      }

      // A partir deste ponto existe uma malha aérea real para medir.
      // Faz o primeiro cover antes de liberar o mapa ao operador.
      requestAnimationFrame(() => {
        this.ensureAdminStandaloneAerialCoverV9?.({
          clampPan: true,
          render: true,
        });
      });

      // Reaproveita a classificação raster já usada no mapa público para
      // extrudar árvores e veículos sobre essa mesma malha, sem casas extras.
      const previousSceneStage = this.sceneStage;
      const previousMapSurface = this.mapSurface;
      const previousRenderer = this.renderer;
      const previousScene = this.scene;
      const previousCamera = this.camera;
      this.sceneStage = stage;
      this.mapSurface = surface;
      this.renderer = this._adminStandaloneRendererV5370;
      this.scene = this._adminStandaloneSceneV5370;
      this.camera = this._adminStandaloneCameraV5370;
      let environmentReady = false;
      try {
        // A superfície standalone já foi construída acima a partir do mesmo
        // wrapper visível. Não chamar o helper legado aqui: ele espera um
        // Mesh com material, enquanto esta superfície é um Object3D de
        // referência para o terreno texturizado.
        environmentReady =
          this.syncAdminReferenceAerialEnvironmentV1() === true;
      } finally {
        this.sceneStage = previousSceneStage;
        this.mapSurface = previousMapSurface;
        this.renderer = previousRenderer;
        this.scene = previousScene;
        this.camera = previousCamera;
      }

      const terrainReady = Boolean(rasterTerrain?.isMesh);
      if (terrainReady) {
        // Esta é a base real da cena: a foto vive na malha subdividida,
        // recebe relevo quando a classificação termina e participa do depth
        // buffer junto com o GLB. O DOM deixa de desenhar a imagem.
        rasterTerrain.visible = true;
        rasterTerrain.renderOrder = -30;
        rasterTerrain.material.map = texture;
        rasterTerrain.material.transparent = false;
        rasterTerrain.material.depthTest = true;
        rasterTerrain.material.depthWrite = true;
        rasterTerrain.material.needsUpdate = true;
        rasterTerrain.userData.textureRole =
          "full aerial image · 3D ground base and scene texture";
        const terrainBounds = new THREE.Box3().setFromObject(rasterTerrain);
        let modelBounds = new THREE.Box3().setFromObject(wrapper);
        // O ajuste de implantação acima usa o vetor vertical da câmera para
        // casar a janela da foto. Em uma câmera inclinada esse vetor também
        // contém Z, então o GLB pode terminar visualmente correto em tela,
        // porém flutuando muitos metros acima do chão texturizado. Depois que
        // o terreno real existe, ancoramos a base do modelo no plano Z=0 e
        // movemos a câmera pelo mesmo delta para preservar o enquadramento.
        const terrainClearance = 0;
        const modelElevation = modelBounds.min.z - terrainBounds.max.z;
        const modelZCorrection = terrainClearance - modelElevation;
        if (
          wrapper &&
          camera &&
          Number.isFinite(modelZCorrection) &&
          Math.abs(modelZCorrection) > 0.001
        ) {
          wrapper.position.z += modelZCorrection;
          camera.position.z += modelZCorrection;
          wrapper.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);
          modelBounds = new THREE.Box3().setFromObject(wrapper);
          fitBox = modelBounds.clone();
          fitCenter = modelBounds.getCenter(new THREE.Vector3());
          const groundFocus = new THREE.Vector3(
            fitCenter.x,
            fitCenter.y,
            terrainBounds.max.z + terrainClearance,
          );
          camera.lookAt(groundFocus);
          camera.updateProjectionMatrix();
          this._adminStandaloneFitBoxV5370 = fitBox.clone();
          this._adminStandaloneFitCenterV5370 = groundFocus.clone();
          this._adminStandaloneFocusPointV5370 = groundFocus.clone();
          this._adminStandaloneFitRadiusV5370 = fitBox.getBoundingSphere(
            new THREE.Sphere(),
          ).radius;
          this._adminStandaloneCameraDistanceV5370 =
            camera.position.distanceTo(groundFocus);
        }
        const finalModelElevation = modelBounds.min.z - terrainBounds.max.z;
        this.dataset.adminReferenceAerialModelZCorrection =
          modelZCorrection.toFixed(3);
        this.dataset.adminReferenceAerialWorldZ =
          "0 · imagem e modelo no mesmo plano";
        this.dataset.adminReferenceAerialTerrainTop =
          terrainBounds.max.z.toFixed(3);
        this.dataset.adminReferenceAerialModelBase =
          modelBounds.min.z.toFixed(3);
        this.dataset.adminReferenceAerialModelElevation =
          finalModelElevation.toFixed(3);
        const host = this.querySelector(".map-host");
        if (host) {
          host.style.setProperty("background-image", "none", "important");
          host.style.visibility = "hidden";
          host.style.opacity = "0";
          host.style.pointerEvents = "none";
          host.dataset.backgroundRole = "three-terrain-texture-active";
        }
        const canvas = this.querySelector(".three-overlay");
        if (canvas) {
          canvas.style.setProperty("transform", "none", "important");
          canvas.style.setProperty(
            "transform-origin",
            "center center",
            "important",
          );
          canvas.style.opacity = "1";
          canvas.style.visibility = "visible";
          canvas.style.display = "block";
        }
        this._adminStandaloneAerialReliefV5380 = rasterTerrain;
      }

      this.dwgGeo = {
        source: "reference aerial · Three.js terrain texture",
        sourceAsset: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      };
      this.dataset.adminSatelliteState = terrainReady
        ? "ready-three-terrain"
        : "terrain-unavailable";
      this.dataset.adminSatelliteTiles = terrainReady
        ? "three-scene-texture"
        : "none";
      this.dataset.adminSatelliteProvider = "local-reference-aerial";
      this.dataset.adminSatelliteGround = terrainReady
        ? "single Three.js terrain mesh · aerial image is base and texture"
        : "Three.js terrain unavailable · no DOM background fallback";
      this.dataset.adminSatelliteTexture = environmentReady
        ? "active on subdivided terrain mesh"
        : terrainReady
          ? "active on subdivided terrain mesh · semantic extrusions unavailable"
          : "pending";
      this.dataset.adminAerialExtrusions = environmentReady
        ? "trees + vehicles · synthetic houses disabled · flat aerial ground"
        : "terrain texture active · semantic extrusions pending";
      this._adminStandaloneRendererV5370?.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
      return this._adminStandaloneAerialReliefV5380 || true;
    };

    this._adminStandaloneSatellitePromiseV5380 = run().finally(() => {
      this._adminStandaloneSatellitePromiseV5380 = null;
    });
    return this._adminStandaloneSatellitePromiseV5380;
  }

  bindAdminStandaloneAerialTextureV5380({
    THREE,
    texture,
    surface,
    wrapper,
    meshes = [],
  } = {}) {
    // A foto é tanto o chão quanto a textura dos polígonos nativos do GLB.
    // Os círculos impressos na foto não entram na definição dos lotes.
    if (!THREE || !texture || !surface || !wrapper) return 0;

    const width = Math.max(0.001, Math.abs(Number(surface.scale.x) || 1)),
      height = Math.max(0.001, Math.abs(Number(surface.scale.y) || 1));

    wrapper.updateMatrixWorld(true);

    const worldPoint = new THREE.Vector3();
    const lotIdentities = new Set();
    let bound = 0,
      lotCount = 0,
      streetCount = 0,
      semanticMinU = Infinity,
      semanticMinV = Infinity,
      semanticMaxU = -Infinity,
      semanticMaxV = -Infinity;

    for (const node of meshes) {
      const kind = String(node?.userData?.partKind || "").toLowerCase();

      if (
        !node?.isMesh ||
        (kind !== "lots" && kind !== "streets") ||
        /^divisa(?:[_\s-]|$)/i.test(String(node.name || ""))
      ) continue;

      const position = node.geometry?.getAttribute?.("position");
      if (!position?.count) continue;

      // Cada malha de lote/rua tem o seu próprio polígono integral. O UV é
      // calculado no plano mundial compartilhado com o chão fotográfico.
      const geometry = node.geometry.clone(),
        clonedPosition = geometry.getAttribute("position"),
        uv = new THREE.Float32BufferAttribute(clonedPosition.count * 2, 2);

      let minU = Infinity,
        minV = Infinity,
        maxU = -Infinity,
        maxV = -Infinity;

      for (let index = 0; index < clonedPosition.count; index++) {
        worldPoint.fromBufferAttribute(clonedPosition, index);
        node.localToWorld(worldPoint);

        const u =
            (worldPoint.x - Number(surface.position.x || 0)) / width + 0.5,
          v = 0.5 - (worldPoint.y - Number(surface.position.y || 0)) / height;

        uv.setXY(index, u, 1 - v);

        minU = Math.min(minU, u);
        minV = Math.min(minV, v);
        maxU = Math.max(maxU, u);
        maxV = Math.max(maxV, v);
      }

      geometry.setAttribute("uv", uv);
      node.geometry = geometry;

      node.material = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false,
      });
      node.renderOrder = 13;

      node.userData.defaultMaterial = node.material;
      node.userData.aerialTextureBinding =
        "native complete lot/street polygon · aerial image UV";
      node.userData.aerialTextureSource = ADMIN_REFERENCE_AERIAL_ASSET_V1;
      node.userData.geometrySource =
        "canonical GLB lot/street polygon with aerial texture";

      const imageBounds = {
        left: Number(minU.toFixed(6)),
        top: Number(minV.toFixed(6)),
        right: Number(maxU.toFixed(6)),
        bottom: Number(maxV.toFixed(6)),
      };

      node.userData.aerialSemanticCoordinateSystem =
        ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1;
      node.userData.aerialImageBounds = imageBounds;
      node.userData.mapArea = {
        partId: String(node.userData.partId || node.name || ""),
        partKind: kind,
        coordinateSpace: "aerial-image-uv",
        u: Number(((minU + maxU) / 2).toFixed(6)),
        v: Number(((minV + maxV) / 2).toFixed(6)),
        bounds: imageBounds,
      };

      semanticMinU = Math.min(semanticMinU, minU);
      semanticMinV = Math.min(semanticMinV, minV);
      semanticMaxU = Math.max(semanticMaxU, maxU);
      semanticMaxV = Math.max(semanticMaxV, maxV);

      if (kind === "lots") {
        lotCount++;
        const lotNumber = String(node.name || "").match(
          /Lote[_ -]?(\d+)/i,
        )?.[1];
        if (lotNumber) lotIdentities.add(lotNumber);
      } else streetCount++;

      bound++;
    }

    this.dataset.adminReferenceAerialTextureBinding = `${bound} native lot/street meshes mapped to aerial image`;
    this.dataset.adminReferenceAerialTextureSource =
      ADMIN_REFERENCE_AERIAL_ASSET_V1;
    this.dataset.adminReferenceAerialSemanticCoordinateSystem =
      ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1;
    this.dataset.adminReferenceAerialSemanticParts = `${lotIdentities.size} lotes · ${lotCount} malhas de lote · ${streetCount} malhas de rua · polígonos texturizados`;
    this.dataset.adminReferenceAerialSemanticBounds = Number.isFinite(
      semanticMinU,
    )
      ? `${semanticMinU.toFixed(6)},${semanticMinV.toFixed(
          6,
        )} → ${semanticMaxU.toFixed(6)},${semanticMaxV.toFixed(6)}`
      : "none";
    this.dataset.adminModelAerialTextureV13 = "native-polygons-enabled";

    return bound;
  }
  }
  for (const name of Object.getOwnPropertyNames(AdminStandaloneAerialMethodsV5380.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(MapScene.prototype, name, Object.getOwnPropertyDescriptor(AdminStandaloneAerialMethodsV5380.prototype, name));
  }
};
