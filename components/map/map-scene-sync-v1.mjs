const MAP_SCENE_SYNC_CONFIG_V1 = Object.freeze(["ADMIN_FIXED_MAP_ROTATION_DEG","ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP","ADMIN_PDF_DISPLAY_Y_ROTATION_DEG","ADMIN_PDF_DISPLAY_Y_ROTATION_RAD","ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1","DWG_PLAN_HEADING_DEG","DWG_PLAN_HEADING_RAD","DWG_SATELLITE_MOSAIC_ZOOM","MAP_RASTER_MAX","MAP_TILE_OVERSCAN","MODEL_EXTRA_Y_ROTATION_DEG","MODEL_EXTRA_Y_ROTATION_RAD","MODEL_FIT_RATIO","MODEL_PUBLIC_FIT_RATIO","MODEL_VERTICAL_EXAGGERATION","PUBLIC_MODEL_HORIZONTAL_FLIP","PUBLIC_MODEL_NORTH_ROTATION_RAD","PUBLIC_SATELLITE_VERTICAL_COVERAGE","SCENE_MAP_Z","SCENE_MODEL_BASE_Z","SCENE_SURFACE_SCALE"]);

export const assertMapSceneSyncDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Map scene synchronization requires injected dependencies.");
  for (const key of MAP_SCENE_SYNC_CONFIG_V1)
    if (!Number.isFinite(dependencies.config?.[key]))
      throw new TypeError(`Map scene synchronization requires numeric config.${key}.`);
  if (typeof dependencies.config?.MAP_CAMERA_VIEW !== "string" || !dependencies.config.MAP_CAMERA_VIEW)
    throw new TypeError("Map scene synchronization requires string config.MAP_CAMERA_VIEW.");
  if (!Number.isFinite(dependencies.mapGeoreferenceFallback?.lat) ||
      !Number.isFinite(dependencies.mapGeoreferenceFallback?.lng))
    throw new TypeError("Map scene synchronization requires map georeference fallback coordinates.");
  if (!dependencies.viewThemes?.assistant || typeof dependencies.viewThemes !== "object")
    throw new TypeError("Map scene synchronization requires viewThemes.assistant.");
  if (typeof dependencies.leaflet?.latLng !== "function")
    throw new TypeError("Map scene synchronization requires leaflet.latLng().");
  if (typeof dependencies.syncCompactMapMirrors !== "function")
    throw new TypeError("Map scene synchronization requires syncCompactMapMirrors().");
  if (typeof dependencies.logger?.warn !== "function")
    throw new TypeError("Map scene synchronization requires logger.warn().");
  return dependencies;
};

export const installMapSceneSyncV1 = (MapScene, dependencies) => {
  assertMapSceneSyncDependenciesV1(dependencies);
  const {
    ADMIN_FIXED_MAP_ROTATION_DEG,
    ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP,
    ADMIN_PDF_DISPLAY_Y_ROTATION_DEG,
    ADMIN_PDF_DISPLAY_Y_ROTATION_RAD,
    ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
    DWG_PLAN_HEADING_DEG,
    DWG_PLAN_HEADING_RAD,
    DWG_SATELLITE_MOSAIC_ZOOM,
    MAP_CAMERA_VIEW,
    MAP_RASTER_MAX,
    MAP_TILE_OVERSCAN,
    MODEL_EXTRA_Y_ROTATION_DEG,
    MODEL_EXTRA_Y_ROTATION_RAD,
    MODEL_FIT_RATIO,
    MODEL_PUBLIC_FIT_RATIO,
    MODEL_VERTICAL_EXAGGERATION,
    PUBLIC_MODEL_HORIZONTAL_FLIP,
    PUBLIC_MODEL_NORTH_ROTATION_RAD,
    PUBLIC_SATELLITE_VERTICAL_COVERAGE,
    SCENE_MAP_Z,
    SCENE_MODEL_BASE_Z,
    SCENE_SURFACE_SCALE,
  } = dependencies.config;
  const {
    leaflet,
    logger: { warn },
    mapGeoreferenceFallback: MAP_GEOREFERENCE_FALLBACK,
    syncCompactMapMirrors,
    viewThemes,
  } = dependencies;
  const MapSceneSyncMethodsV1 = class {
  syncThree() {
    const publicStaticCapture = this.isPublicCustomerExperience();
    if (
      !this.renderer ||
      (!publicStaticCapture && (!this.map || !this.map._loaded))
    )
      return;
    const host = this.querySelector(".map-host"),
      w = host?.clientWidth,
      h = host?.clientHeight;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return;
    // `THREE` é carregado por instância depois do bootstrap assíncrono. A
    // rotina era chamada corretamente, mas usava um identificador de módulo
    // que não existe neste escopo; isso interrompia o primeiro enquadramento
    // e deixava o fundo ampliado com o loteamento reduzido ao centro.
    const THREE = this.THREE;
    if (!THREE) {
      this.dataset.syncThreeGuard = "three-pending";
      return;
    }
    if (this.isPublicMapVisual())
      this.dataset.publicModelSyncState = `model:${this.masterplanModel ? "1" : "0"}|largest:${Number.isFinite(this.masterplanLargest) ? "1" : "0"}|group:${this.modelGroup ? "1" : "0"}|geo:${this.dwgGeo ? "1" : "0"}|lots:${this.modelParts?.lots?.length || 0}`;
    const publicCenter = this._publicGeoTheme?.center;
    const mapCenter = publicStaticCapture
      ? {
          lat: Number(publicCenter?.[0] ?? MAP_GEOREFERENCE_FALLBACK.lat),
          lng: Number(publicCenter?.[1] ?? MAP_GEOREFERENCE_FALLBACK.lng),
        }
      : this.map.getCenter();
    this.dataset.leafletZoom = publicStaticCapture
      ? `static-capture-z${Number(this._publicGeoTheme?.zoom) || DWG_SATELLITE_MOSAIC_ZOOM}`
      : String(this.map.getZoom());
    this.dataset.leafletCenter = `${mapCenter.lat.toFixed(6)},${mapCenter.lng.toFixed(6)}`;
    this.configurePerspectiveCamera(w, h);
    const theme = viewThemes[MAP_CAMERA_VIEW] || viewThemes.assistant;
    this.dataset.themeCenter = `${theme.center[0]},${theme.center[1]}`;
    this.dataset.themeZoom = String(theme.zoom);
    // A instância do mapa permanece montada entre páginas e pode ter sido
    // deslocada desde o último tema. A base raster e o GLB precisam usar o
    // mesmo centro geográfico atual; reconstruir a textura com theme.center
    // deixava o loteamento preso ao centro antigo e aparentando estar no canto.
    const mapTheme = { ...theme, center: [mapCenter.lat, mapCenter.lng] };
    this.dataset.mapRenderCenter = `${mapCenter.lat.toFixed(6)},${mapCenter.lng.toFixed(6)}`;
    const panX = this.sceneUserInteracted
        ? Number(this.sceneManualPan?.x) || 0
        : 0,
      panY = this.sceneUserInteracted ? Number(this.sceneManualPan?.y) || 0 : 0;
    this.sceneManualPan = { x: panX, y: panY };
    this.style.setProperty("--scene-pan-x", `${panX}px`);
    this.style.setProperty("--scene-pan-y", `${panY}px`);
    const baseCenterX = w / 2,
      baseCenterY = h / 2,
      centerX = baseCenterX,
      centerY = baseCenterY;
    let surfaceCenterX = centerX,
      surfaceCenterY = centerY;
    this.sceneBaseCenter = { x: baseCenterX, y: baseCenterY };
    this.dataset.scenePan = `${Math.round(panX)},${Math.round(panY)}`;
    // A apresentação pública pode ser vista em perspectiva; mantenha uma
    // margem de terreno bem maior que o viewport para nunca revelar o vazio
    // depois da borda do raster durante a inclinação.
    const publicTerrain = this.isPublicMapVisual();
    const surfaceCoverage = publicTerrain ? 4.2 : SCENE_SURFACE_SCALE;
    const surfaceW = w * surfaceCoverage,
      surfaceH = h * surfaceCoverage;
    this.sceneSurfaceDimensions = { width: surfaceW, height: surfaceH };
    this.dataset.mapSurfaceCoverage = String(surfaceCoverage);
    if (this.sceneStage) {
      this.sceneSharedOrigin = { x: centerX, y: centerY };
      this.sceneTransformOrigin = { x: centerX + panX, y: centerY + panY };
      this.applySceneTransformAnchor(
        this._sceneVisual?.tilt || 0,
        this._sceneVisual?.rotation || 0,
        this._sceneVisual?.scale || 1,
      );
      this.configurePerspectiveCamera(
        w,
        h,
        this.sceneSharedOrigin.x,
        this.sceneSharedOrigin.y,
      );
    }
    this.mapSurface.position.set(0, 0, SCENE_MAP_Z);
    this.mapSurface.scale.set(surfaceW, surfaceH, 1);
    this.dataset.mapSurfaceWorld = `${Math.round(surfaceW)}x${Math.round(surfaceH)} @ ${SCENE_MAP_Z}`;
    if (this.modelReady) this.applyMapRasterCentering(surfaceW, surfaceH);
    this.dataset.sceneComposition =
      "map raster + GLB siblings · shared center/scale/tilt";
    if (this.modelGroup) {
      const anchor = publicStaticCapture
        ? { x: w / 2, y: h / 2 }
        : this.map.latLngToContainerPoint(
            leaflet.latLng(Number(mapTheme.center[0]), Number(mapTheme.center[1])),
          );
      if (Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        if (anchor.x === 0 && anchor.y === 0) {
          anchor.x = w / 2;
          anchor.y = h / 2;
        }
        const anchorDeltaX = anchor.x - w / 2,
          anchorDeltaY = anchor.y - h / 2;
        this.dataset.mapModelAnchorOffset = `${anchorDeltaX.toFixed(3)},${anchorDeltaY.toFixed(3)}`;
        // Reset before recomputing the projected footprint correction. The map
        // and the model keep one shared scene transform; only the perspective
        // compensation is applied to the model's local XY position.
        this.modelGroup.position.set(0, 0, 0);
        if (this.masterplanModel && this.masterplanLargest) {
          // O enquadramento público nasce do envelope geográfico do DWG, não
          // do tamanho arbitrário do viewport. Primeiro medimos o retângulo
          // que será capturado em Web Mercator; só depois aplicamos o
          // tratamento solar e a composição da interface.
          const publicGeoFrame = this.isPublicMapVisual()
            ? this.publicDwgGeoFrame(
                {
                  zoom:
                    Number(this._publicGeoTheme?.zoom) ||
                    Number(mapTheme.zoom) ||
                    18,
                },
                w,
                h,
              )
            : null;
          const fitRatio = this.isPublicMapVisual()
            ? MODEL_PUBLIC_FIT_RATIO
            : MODEL_FIT_RATIO;
          const frame = publicGeoFrame?.heightPx
            ? Math.min(
                Math.min(w, h) * fitRatio,
                publicGeoFrame.heightPx * 1.015,
              )
            : Math.min(w, h) * fitRatio;
          const adminPdfDisplay = this.hasAttribute(
            "data-admin-shared-public-map",
          );
          const adminDisplayScale = adminPdfDisplay
            ? ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1
            : 1;
          const localFrameScale =
              (frame / this.masterplanLargest) * adminDisplayScale,
            sourceScale = this.modelSourceFootprint?.scale || localFrameScale;
          const baseFootprintX =
            (this.modelSourceFootprint?.x || this.masterplanLargest) /
            sourceScale;
          const baseFootprintY =
            (this.modelSourceFootprint?.y || this.masterplanLargest) /
            sourceScale;
          const rawFootprint = publicGeoFrame
            ? { x: publicGeoFrame.widthPx, y: publicGeoFrame.heightPx }
            : {
                x:
                  (this.modelSourceFootprint?.x || this.masterplanLargest) *
                  (localFrameScale / sourceScale),
                y:
                  (this.modelSourceFootprint?.y || this.masterplanLargest) *
                  (localFrameScale / sourceScale),
              };
          // O DWG é medido em pixels Web Mercator, enquanto o mosaico é
          // desenhado em um plano 3D que cobre o viewport. A conversão
          // precisa acontecer antes de escalar o GLB; sem ela a implantação
          // fica deslocada em relação às ruas reais da fotografia.
          const provisionalMapW = Math.max(
              w * SCENE_SURFACE_SCALE,
              rawFootprint.x * 1.18,
            ),
            provisionalMapH = Math.max(
              h * SCENE_SURFACE_SCALE * PUBLIC_SATELLITE_VERTICAL_COVERAGE,
              rawFootprint.y * 1.42,
            );
          const rasterWidth =
            Math.ceil(
              Math.min(MAP_RASTER_MAX, Math.max(1024, provisionalMapW)) / 256 +
                MAP_TILE_OVERSCAN * 2,
            ) * 256;
          const rasterHeight =
            Math.ceil(
              Math.min(MAP_RASTER_MAX, Math.max(1024, provisionalMapH)) / 256 +
                MAP_TILE_OVERSCAN * 2,
            ) * 256;
          const rasterWorldPerPixelX = publicGeoFrame
            ? provisionalMapW /
              Math.max(1, Number(this.mapSurfaceCanvas?.width) || rasterWidth)
            : 1;
          const rasterWorldPerPixelY = publicGeoFrame
            ? provisionalMapH /
              Math.max(1, Number(this.mapSurfaceCanvas?.height) || rasterHeight)
            : 1;
          // O enquadramento visual precisa usar cada lote como ponto de
          // controle, e não apenas o envelope do GLB. O envelope sozinho
          // preserva escala, mas não corrige inversão de eixo, rotação ou
          // pequeno cisalhamento acumulado no export do modelo.
          const publicScaleX = publicGeoFrame
            ? (publicGeoFrame.widthPx * rasterWorldPerPixelX) / baseFootprintX
            : localFrameScale;
          const publicScaleZ = publicGeoFrame
            ? (publicGeoFrame.heightPx * rasterWorldPerPixelY) / baseFootprintY
            : localFrameScale;
          // A escala usada na implantação e na altura parte de um único
          // fator horizontal. O ajuste X/Z independente era a fonte da
          // distorção vertical percebida sobre o PDF.
          const horizontalScale = publicGeoFrame
            ? adminPdfDisplay
              ? localFrameScale
              : Math.sqrt(
                  Math.max(0.0001, Math.abs(publicScaleX * publicScaleZ)),
                )
            : localFrameScale;
          this._adminPdfSourceFrameScale = localFrameScale;
          const publicAffine = publicGeoFrame
            ? this.publicDwgModelAffine(
                THREE,
                this.masterplanModel,
                publicGeoFrame,
                mapTheme.center,
                rasterWorldPerPixelX,
                rasterWorldPerPixelY,
                horizontalScale * MODEL_VERTICAL_EXAGGERATION,
              )
            : null;
          this.dataset.publicAffineAttempt = `geo:${publicGeoFrame ? "1" : "0"}|lots:${this.modelParts?.lots?.length || 0}`;
          if (publicAffine) {
            // A matriz liga os centros dos 298 lotes do DWG ao mesmo espaço
            // Web Mercator usado pelo mosaico. X/Z continuam sendo o plano
            // horizontal; Y permanece a altura das geometrias 3D.
            this.masterplanModel.matrixAutoUpdate = false;
            this.masterplanModel.matrix.copy(publicAffine.matrix);
            this.masterplanModel.matrixWorldNeedsUpdate = true;
            this.masterplanModel.userData.publicDwgAffine = publicAffine;
            this.dataset.publicModelGeoAffine = `${publicAffine.matched} lotes · RMS ${publicAffine.rms.toFixed(3)} world · máx ${publicAffine.residualMax.toFixed(3)}`;
            this.dataset.publicModelGeoFitScale = `similarity ${publicAffine.horizontalScale.toFixed(3)} · ${publicAffine.xAxis[1].toFixed(3)},${publicAffine.xAxis[2].toFixed(3)} · ${publicAffine.yAxis[1].toFixed(3)},${publicAffine.yAxis[2].toFixed(3)}`;
            this.dataset.modelPlanHeading = adminPdfDisplay
              ? `frame local do PDF · mapa y+${ADMIN_FIXED_MAP_ROTATION_DEG}° fixo · modelo y+${publicAffine.orientation.extraRotationYDeg}°`
              : publicAffine.orientation.extraRotationYDeg === 0
                ? "saída superior = norte · giro à esquerda 90° · flip horizontal · orientação do loading"
                : "saída superior = norte · giro à esquerda 90° · flip horizontal · y+180°";
            this.dataset.modelAerialGuide =
              "saída superior + rua lateral + rua superior · orientação 3D corrigida · 298 centros DWG";
          } else {
            this.masterplanModel.matrixAutoUpdate = true;
            this.masterplanModel.position.set(
              0,
              0,
              Number(this.masterplanModel.userData?.mapBaseLift) ||
                SCENE_MODEL_BASE_Z,
            );
            const horizontalFlip = this.hasAttribute(
              "data-admin-shared-public-map",
            )
              ? ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP
              : PUBLIC_MODEL_HORIZONTAL_FLIP;
            this.masterplanModel.scale.set(
              horizontalFlip * horizontalScale,
              horizontalScale * MODEL_VERTICAL_EXAGGERATION,
              horizontalScale,
            );
            const extraRotationRad = this.hasAttribute(
              "data-admin-shared-public-map",
            )
              ? ADMIN_PDF_DISPLAY_Y_ROTATION_RAD
              : MODEL_EXTRA_Y_ROTATION_RAD;
            const extraRotationDeg = this.hasAttribute(
              "data-admin-shared-public-map",
            )
              ? ADMIN_PDF_DISPLAY_Y_ROTATION_DEG
              : MODEL_EXTRA_Y_ROTATION_DEG;
            this.masterplanModel.rotation.set(
              Math.PI / 2,
              PUBLIC_MODEL_NORTH_ROTATION_RAD + extraRotationRad,
              DWG_PLAN_HEADING_RAD,
            );
            this.dataset.modelPlanHeading =
              extraRotationDeg === 0
                ? "fallback · saída superior = norte · orientação do loading"
                : "fallback · saída superior = norte · y+180°";
            this.dataset.publicModelOrientation = `dwg-affine-fallback|flipX-${horizontalFlip}|y+${extraRotationDeg}deg|north=upper-road-exit${extraRotationDeg === 0 ? "|loading-reference" : ""}`;
            this.dataset.publicModelGeoAffine = "fallback · envelope do DWG";
          }
          this.masterplanModel.updateMatrixWorld(true);
          // Primeiro fixa a fotografia no frame resolvido pelo DWG. Só depois
          // aplica os parâmetros opcionais do modelo, mantendo o fundo imóvel
          // enquanto o usuário testa rotação/posição pela URL.
          this.syncAdminPdfMasterplanUnderlayV1();
          if (publicAffine && adminPdfDisplay) {
            const calibratedMatrix = this.applyAdminModelCalibrationV1(
              THREE,
              this.masterplanModel,
              this.masterplanModel.matrix.clone(),
            );
            this.masterplanModel.matrixAutoUpdate = false;
            this.masterplanModel.matrix.copy(calibratedMatrix);
            this.masterplanModel.matrixWorldNeedsUpdate = true;
            if (this.adminPdfMasterplan3DGroupV1) {
              this.adminPdfMasterplan3DGroupV1.matrixAutoUpdate = false;
              this.adminPdfMasterplan3DGroupV1.matrix.copy(calibratedMatrix);
              this.adminPdfMasterplan3DGroupV1.matrixWorldNeedsUpdate = true;
            }
            this.masterplanModel.userData.publicDwgAffine = {
              ...publicAffine,
              matrix: calibratedMatrix,
            };
            this.dataset.adminModelCalibrationApplied = "true";
          } else if (adminPdfDisplay) {
            const calibratedMatrix = this.applyAdminModelCalibrationV1(
              THREE,
              this.masterplanModel,
              this.masterplanModel.matrix.clone(),
            );
            this.masterplanModel.matrixAutoUpdate = false;
            this.masterplanModel.matrix.copy(calibratedMatrix);
            this.masterplanModel.matrixWorldNeedsUpdate = true;
            if (this.adminPdfMasterplan3DGroupV1) {
              this.adminPdfMasterplan3DGroupV1.matrixAutoUpdate = false;
              this.adminPdfMasterplan3DGroupV1.matrix.copy(calibratedMatrix);
              this.adminPdfMasterplan3DGroupV1.matrixWorldNeedsUpdate = true;
            }
            this.dataset.adminModelCalibrationApplied = "true";
          }
          this.dataset.modelFit = `${Math.round(frame)}px`;
          this.dataset.modelFitRatio = String(fitRatio);
          this.dataset.modelFitProfile = adminPdfDisplay
            ? "pdf-local-frame-uniform"
            : this.isPublicMapVisual()
              ? "public-dwg-envelope-z18"
              : "standard-1.32";
          if (publicGeoFrame) {
            this.dataset.publicModelGeoFit = `${Math.round(publicGeoFrame.widthPx)}x${Math.round(publicGeoFrame.heightPx)}px · ${publicGeoFrame.source}`;
            this.dataset.publicModelGeoWorldFit = adminPdfDisplay
              ? `${Math.round(baseFootprintX * localFrameScale)}x${Math.round(baseFootprintY * localFrameScale)}world · PDF local frame`
              : `${Math.round(publicGeoFrame.widthPx * rasterWorldPerPixelX)}x${Math.round(publicGeoFrame.heightPx * rasterWorldPerPixelY)}world · raster ${rasterWorldPerPixelX.toFixed(3)}x/${rasterWorldPerPixelY.toFixed(3)}y`;
            this.dataset.publicGeoRasterScale = adminPdfDisplay
              ? "not used · PDF local frame"
              : `${rasterWorldPerPixelX.toFixed(3)}x/${rasterWorldPerPixelY.toFixed(3)} world/px`;
            if (!publicAffine)
              this.dataset.publicModelGeoFitScale = `${publicScaleX.toFixed(3)}x × ${publicScaleZ.toFixed(3)}z · heading ${DWG_PLAN_HEADING_DEG.toFixed(3)}°`;
          }
          const lat = Number(mapTheme.center[0]),
            metersPerPixel = this.masterplanLargest / frame,
            computedFitZoom = Math.max(
              12,
              Math.min(
                20,
                Math.round(
                  Math.log2(
                    (156543.033928 * Math.cos((lat * Math.PI) / 180)) /
                      metersPerPixel,
                  ),
                ),
              ),
            ),
            stableFitZoom = Number(this.dataset.mapFitZoom) || computedFitZoom;
          this.dataset.mapFitZoom = String(stableFitZoom);
          const footprint =
            publicGeoFrame && !adminPdfDisplay
              ? {
                  x: publicGeoFrame.widthPx * rasterWorldPerPixelX,
                  y: publicGeoFrame.heightPx * rasterWorldPerPixelY,
                }
              : {
                  x: baseFootprintX * localFrameScale,
                  y: baseFootprintY * localFrameScale,
                };
          const fitTheme = {
            ...mapTheme,
            zoom: Number(this.dataset.mapFitZoom) || mapTheme.zoom,
          };
          // mapW/mapH são o retângulo geográfico que acompanha o footprint do
          // GLB. Sem essa declaração o reenquadramento lança ReferenceError e
          // o renderer fica preso no canvas inicial 450x225.
          // A base cartográfica pode ser maior que a janela, mas o framebuffer
          // WebGL nunca deve acompanhar essa sobressalência. Renderizá-lo no
          // tamanho da superfície (antes chegava a 7770×9766 px) perde o
          // contexto da GPU e deixa o dashboard branco. A câmera e o canvas
          // ficam no viewport; somente o plano dentro da cena recebe overscan.
          const sceneMapW = Math.max(
              w * SCENE_SURFACE_SCALE,
              footprint.x * 1.18,
            ),
            sceneMapH = Math.max(
              h * SCENE_SURFACE_SCALE * PUBLIC_SATELLITE_VERTICAL_COVERAGE,
              footprint.y * 1.42,
            );
          surfaceCenterX = w / 2;
          surfaceCenterY = h / 2;
          this.sceneSurfaceDimensions = { width: sceneMapW, height: sceneMapH };
          this.dataset.mapOverscan = `${SCENE_SURFACE_SCALE.toFixed(2)}× horizontal · ${(SCENE_SURFACE_SCALE * PUBLIC_SATELLITE_VERTICAL_COVERAGE).toFixed(2)}× vertical · ${MAP_TILE_OVERSCAN} tiles`;
          const overlay = this.querySelector(".three-overlay");
          if (overlay) {
            overlay.style.left = "50%";
            overlay.style.top = "50%";
            overlay.style.right = "auto";
            overlay.style.bottom = "auto";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
          }
          this.renderer.setSize(w, h, false);
          this.sceneSharedOrigin = {
            x: surfaceCenterX + anchorDeltaX,
            y: surfaceCenterY + anchorDeltaY,
          };
          this.sceneTransformOrigin = {
            x: this.sceneSharedOrigin.x + panX,
            y: this.sceneSharedOrigin.y + panY,
          };
          if (this.sceneStage)
            this.applySceneTransformAnchor(
              this._sceneVisual?.tilt || 0,
              this._sceneVisual?.rotation || 0,
              this._sceneVisual?.scale || 1,
            );
          this.configurePerspectiveCamera(
            w,
            h,
            this.sceneSharedOrigin.x,
            this.sceneSharedOrigin.y,
          );
          this.mapSurface.scale.set(sceneMapW, sceneMapH, 1);
          this.dataset.mapSurfaceWorld = `${Math.round(sceneMapW)}x${Math.round(sceneMapH)} @ ${SCENE_MAP_Z}`;
          // A mudança de página altera apenas o enquadramento do shell. A
          // textura geográfica só deve ser reconstruída quando a posição/base
          // do mapa realmente mudou; caso contrário o GLB e o mapa continuam
          // sendo a mesma cena viva durante a navegação.
          const rasterSignature = `${this.mapTileMode || "satellite"}|${fitTheme.zoom}|${Number(mapTheme.center[0]).toFixed(6)}|${Number(mapTheme.center[1]).toFixed(6)}`;
          this.dataset.mapRasterSignature = rasterSignature;
          if (rasterSignature !== this._lastRasterSignature) {
            this.refreshMapSurface(fitTheme, sceneMapW, sceneMapH);
            this.refreshOsmRaster(fitTheme, sceneMapW, sceneMapH);
            this._lastRasterSignature = rasterSignature;
          } else this.dataset.mapSurfaceReuse = "true";
          this.applyMapRasterCentering(sceneMapW, sceneMapH);
          try {
            this.centerModelProjection();
          } catch (error) {
            this.dataset.modelCenterProjection = `error · ${String(error?.message || error).slice(0, 80)}`;
            warn("Falha ao centralizar o footprint do GLB.", error);
          }
          this.dataset.sceneFootprint = `${Math.round(footprint.x)}x${Math.round(footprint.y)}`;
          this.dataset.sceneMapScale = `${Math.round(sceneMapW)}x${Math.round(sceneMapH)}`;
          this.dataset.modelScreen = `centered · ${Math.round(footprint.x)}x${Math.round(footprint.y)}`;
          if (!this.initialSceneFocusApplied) {
            this.sceneManualPan = { x: 0, y: 0 };
            this.style.setProperty("--scene-pan-x", "0px");
            this.style.setProperty("--scene-pan-y", "0px");
            this.dataset.scenePan = "0,0";
            this.dataset.sceneFocus = "Centro do loteamento";
            this.dataset.leisureFocus = "0,0";
            this.initialSceneFocusApplied = true;
          }
        }
        this.modelGroup.updateMatrixWorld(true);
        this.modelGroup.visible = true;
        if (this.masterplanModel && !this.dataset.modelOffset)
          this.dataset.modelOffset = "0,0";
      }
    }
    const boundedPan = this.clampScenePan(
      this.sceneManualPan.x,
      this.sceneManualPan.y,
    );
    if (
      boundedPan.x !== this.sceneManualPan.x ||
      boundedPan.y !== this.sceneManualPan.y
    ) {
      this.sceneManualPan = boundedPan;
      this.style.setProperty("--scene-pan-x", `${boundedPan.x}px`);
      this.style.setProperty("--scene-pan-y", `${boundedPan.y}px`);
      this.dataset.scenePan = `${Math.round(boundedPan.x)},${Math.round(boundedPan.y)}`;
      if (this.sceneStage) {
        const origin = this.sceneSharedOrigin || { x: centerX, y: centerY };
        this.sceneTransformOrigin = {
          x: origin.x + boundedPan.x,
          y: origin.y + boundedPan.y,
        };
        this.applySceneTransformAnchor(
          this._sceneVisual?.tilt || 0,
          this._sceneVisual?.rotation || 0,
          this._sceneVisual?.scale || 1,
        );
      }
    }
    for (const m of this.markerGroup?.children || []) {
      const p = publicStaticCapture
        ? this.projectPublicStaticPointV1(
            Number(m.userData.latlng[0]),
            Number(m.userData.latlng[1]),
            mapCenter,
            w,
            h,
          )
        : this.map.latLngToContainerPoint(
            leaflet.latLng(
              Number(m.userData.latlng[0]),
              Number(m.userData.latlng[1]),
            ),
          );
      if (Number.isFinite(p.x) && Number.isFinite(p.y))
        m.position.set(
          p.x - baseCenterX + surfaceCenterX,
          p.y - baseCenterY + surfaceCenterY,
          0,
        );
    }
    this.syncPublicRoadOverlayTransforms?.();
    this.syncAdminPdfMasterplanUnderlayV1?.();
    this.ensurePublicTerrainRelief?.();
    this.syncPublicTerrainRelief?.();
    this.updatePublicCommercialMarkers?.();
    // O enquadramento público é calculado depois que o footprint e o relevo
    // já foram atualizados. Assim, a primeira abertura também compensa a
    // perspectiva sem exigir uma nova navegação do visitante.
    if (publicTerrain && this.masterplanModel) this.fitPublicGapView?.();
    this.updatePublicFocusFrame?.();
    this.enforcePublicTechnicalVisibility?.();
    this.renderer.render(this.scene, this.camera);
    if (this._modelGpuReady) syncCompactMapMirrors();
  }
  };
  Object.defineProperty(
    MapScene.prototype,
    "syncThree",
    Object.getOwnPropertyDescriptor(MapSceneSyncMethodsV1.prototype, "syncThree"),
  );
};
