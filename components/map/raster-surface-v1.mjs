const MAP_RASTER_SURFACE_CONFIG_V1 = Object.freeze(["DWG_SATELLITE_MOSAIC_TILES","DWG_SATELLITE_MOSAIC_TILE_SIZE","DWG_SATELLITE_MOSAIC_TILE_X0","DWG_SATELLITE_MOSAIC_TILE_Y0","DWG_SATELLITE_MOSAIC_ZOOM","MAP_RASTER_MAX","MAP_TILE_OVERSCAN","SCENE_MAP_Z"]);
const MAP_RASTER_SURFACE_METHODS_V1 = Object.freeze(["refreshMapSurface","applyMapRasterCentering","refreshOsmRaster","commitMapSurfaceTexture","projectPublicStaticPointV1"]);

export const assertMapRasterSurfaceDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Map raster surface requires injected dependencies.");
  for (const key of MAP_RASTER_SURFACE_CONFIG_V1)
    if (!Number.isFinite(dependencies.config?.[key]))
      throw new TypeError(`Map raster surface requires numeric config.${key}.`);
  if (!dependencies.mapTileSources || typeof dependencies.mapTileSources !== "object")
    throw new TypeError("Map raster surface requires mapTileSources.");
  if (typeof dependencies.browser?.Image !== "function")
    throw new TypeError("Map raster surface requires browser.Image.");
  if (typeof dependencies.logger?.warn !== "function")
    throw new TypeError("Map raster surface requires logger.warn().");
  return dependencies;
};

export const installMapRasterSurfaceV1 = (MapScene, dependencies) => {
  assertMapRasterSurfaceDependenciesV1(dependencies);
  const {
    DWG_SATELLITE_MOSAIC_TILES,
    DWG_SATELLITE_MOSAIC_TILE_SIZE,
    DWG_SATELLITE_MOSAIC_TILE_X0,
    DWG_SATELLITE_MOSAIC_TILE_Y0,
    DWG_SATELLITE_MOSAIC_ZOOM,
    MAP_RASTER_MAX,
    MAP_TILE_OVERSCAN,
    SCENE_MAP_Z,
  } = dependencies.config;
  const { mapTileSources, logger: { warn }, browser: { Image: ImageConstructor } } = dependencies;
  const MapRasterSurfaceMethodsV1 = class {
  refreshMapSurface(theme, w, h) {
    if (this.isAdminReferenceAerialV1?.()) {
      this.syncAdminReferenceAerialSurfaceV1();
      this.dataset.mapSurfaceReuse = "reference-aerial";
      return;
    }
    if (
      this.hasAttribute?.("data-public-satellite-base") &&
      this._publicGeoTheme
    ) {
      // O centro continua sendo o ponto GPS canônico do DWG. A escala, por
      // sua vez, pode vir do enquadramento físico calculado após o GLB estar
      // pronto; descartar esse zoom deixava a imagem menos detalhada e fazia
      // a leitura das vias reais parecer ampliada/desproporcional.
      const requestedZoom = Number(theme?.zoom);
      theme = {
        ...this._publicGeoTheme,
        zoom: Number.isFinite(requestedZoom)
          ? requestedZoom
          : Number(this._publicGeoTheme.zoom) || 17,
      };
    }
    if (
      this.matches?.(
        "map-scene[data-public-map],map-scene[data-public-presentation]",
      ) &&
      !this.hasAttribute("data-public-satellite-base")
    ) {
      // O fundo PDF/CSS já é a base pública. Não recompõe 64 tiles em um
      // CanvasTexture 2048² e não faz upload da textura a cada tile carregada.
      if (this.mapSurface) this.mapSurface.visible = false;
      this.dataset.mapSurfaceVisible = "false";
      this.dataset.mapTexture = "public-static-base";
      this.dataset.mapRasterMode = "public-static-base + live-glb";
      this.dataset.mapSurfaceBuilds = "0";
      return;
    }
    if (!this.mapSurfaceCanvas || !this.mapSurfaceTexture) return;
    this.dataset.mapSurfaceMaterial =
      "MeshBasicMaterial · CanvasTexture · opaque";
    // A superfície geográfica precisa exceder a moldura do canvas. A margem
    // cobre rotação, inclinação e pan sem revelar o fundo da cena nas bordas.
    // O GLB não participa deste cálculo: ambos continuam filhos do mesmo
    // grupo Three.js, mas só as tiles ganham área de segurança adicional.
    const zoom = Math.max(12, Math.min(20, Number(theme.zoom) || 15)),
      rasterW = Math.min(MAP_RASTER_MAX, Math.max(1024, Math.ceil(w))),
      rasterH = Math.min(MAP_RASTER_MAX, Math.max(1024, Math.ceil(h))),
      cols = Math.ceil(rasterW / 256) + MAP_TILE_OVERSCAN * 2,
      rows = Math.ceil(rasterH / 256) + MAP_TILE_OVERSCAN * 2,
      lat = Number(theme.center[0]),
      lon = Number(theme.center[1]),
      rad = Math.PI / 180,
      n = 2 ** zoom;
    const xf = ((lon + 180) / 360) * n,
      yf = ((1 - Math.asinh(Math.tan(lat * rad)) / Math.PI) / 2) * n,
      x0 = Math.floor(xf - cols / 2),
      y0 = Math.floor(yf - rows / 2),
      mode = this.mapTileMode || "satellite",
      key = `${mode}|${zoom}|${x0}|${y0}`;
    this.mapRasterPixelOffset = {
      x: (x0 + cols / 2 - xf) * 256,
      y: (y0 + rows / 2 - yf) * 256,
      width: cols * 256,
      height: rows * 256,
    };
    this.dataset.mapRasterGeoCenter = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    this.dataset.mapSurfaceKey = key;
    if (key === this._mapSurfaceKey) {
      this.dataset.mapSurfaceReuse = "true";
      return;
    }
    this._mapSurfaceKey = key;
    this.dataset.mapSurfaceReuse = "false";
    this.dataset.mapSurfaceBuilds = String(
      (Number(this.dataset.mapSurfaceBuilds) || 0) + 1,
    );
    // Não misture uma textura parcial com o raster DOM. A camada WebGL volta
    // somente quando o mosaico inteiro estiver pronto.
    // Preserva o mosaico anterior até que o próximo esteja completo. Assim,
    // alterar enquadramento não cria uma janela vazia no limite da área visível.
    const hadSurface = this.mapSurface.visible;
    this.dataset.mapSurfaceVisible = hadSurface ? "true" : "false";
    const canvas = this.mapSurfaceCanvas;
    canvas.width = cols * 256;
    canvas.height = rows * 256;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const token = key;
    let loaded = 0,
      total = 0;
    if (mode === "generated") {
      const image = new ImageConstructor();
      image.decoding = "async";
      total = 1;
      image.onload = () => {
        if (this._mapSurfaceKey !== token) return;
        const imageWidth = Math.max(1, image.naturalWidth);
        const imageHeight = Math.max(1, image.naturalHeight);
        // Preenche o canvas com a própria foto apenas como margem visual. A
        // faixa central abaixo é a que vale para a geometria e é posicionada
        // por coordenadas de tile, preservando a escala e o norte do mosaico.
        const coverScale = Math.max(
          canvas.width / imageWidth,
          canvas.height / imageHeight,
        );
        const coverWidth = imageWidth * coverScale;
        const coverHeight = imageHeight * coverScale;
        ctx.save();
        ctx.filter = "blur(22px) saturate(.88) brightness(.92)";
        ctx.drawImage(
          image,
          (canvas.width - coverWidth) / 2,
          (canvas.height - coverHeight) / 2,
          coverWidth,
          coverHeight,
        );
        ctx.restore();
        const mosaicLogicalWidth =
          DWG_SATELLITE_MOSAIC_TILES * DWG_SATELLITE_MOSAIC_TILE_SIZE;
        const mosaicLogicalHeight = mosaicLogicalWidth;
        const exactZoom = zoom === DWG_SATELLITE_MOSAIC_ZOOM;
        if (exactZoom) {
          const mosaicX =
            (DWG_SATELLITE_MOSAIC_TILE_X0 - x0) *
            DWG_SATELLITE_MOSAIC_TILE_SIZE;
          const mosaicY =
            (DWG_SATELLITE_MOSAIC_TILE_Y0 - y0) *
            DWG_SATELLITE_MOSAIC_TILE_SIZE;
          // A imagem final foi ampliada de 2304 para 3072 px. Reduzi-la aqui
          // ao tamanho lógico original mantém 1 px do canvas = 1 px de tile.
          ctx.drawImage(
            image,
            mosaicX,
            mosaicY,
            mosaicLogicalWidth,
            mosaicLogicalHeight,
          );
          this.dataset.mapGeneratedAerialAnchor = `tile ${DWG_SATELLITE_MOSAIC_TILE_X0}/${DWG_SATELLITE_MOSAIC_TILE_Y0} · z${DWG_SATELLITE_MOSAIC_ZOOM} → DWG site-center`;
        } else {
          const containScale = Math.min(
            canvas.width / imageWidth,
            canvas.height / imageHeight,
          );
          ctx.drawImage(
            image,
            (canvas.width - imageWidth * containScale) / 2,
            (canvas.height - imageHeight * containScale) / 2,
            imageWidth * containScale,
            imageHeight * containScale,
          );
          this.dataset.mapGeneratedAerialAnchor =
            "site-center DWG · escala de contingência fora do z18";
        }
        loaded = 1;
        this.dataset.mapTileSource = "Satélite tratado · mosaico real do DWG";
        this.dataset.mapGeneratedAerialFit =
          "mosaico satelital tratado · centro e enquadramento do DWG";
        this.dataset.mapGeneratedAerialImage = `${image.naturalWidth}x${image.naturalHeight} · escala mundial corrigida · sem distorção`;
        this.dataset.mapGeneratedAerialScale = exactZoom
          ? "1.000× tile z18 · origem geográfica preservada"
          : "escala de contingência · z fora da captura";
        this.dataset.mapTextureTiles = "1/1";
        this.dataset.mapTexture = "uploading";
        try {
          const sample = ctx.getImageData(
            Math.floor(canvas.width / 2),
            Math.floor(canvas.height / 2),
            1,
            1,
          ).data;
          this.dataset.mapSurfacePixel = `${sample[0]},${sample[1]},${sample[2]},${sample[3]}`;
        } catch {
          this.dataset.mapSurfacePixel = "unreadable";
        }
        this.commitMapSurfaceTexture(token, canvas);
        this.mapSurfaceTexture.needsUpdate = true;
        this.renderer?.render(this.scene, this.camera);
      };
      image.onerror = () => {
        if (this._mapSurfaceKey !== token) return;
        this.dataset.mapTexture = "partial";
        this.dataset.mapTextureTiles = "0/1";
        this.dataset.mapTileSource =
          "Aérea HD indisponível · satélite preservado";
      };
      this.dataset.mapTexture = "loading";
      this.dataset.mapTextureTiles = "0/1";
      image.src = mapTileSources.generated[0].url();
      this.mapSurfaceTexture.image = canvas;
      this.mapSurfaceTexture.needsUpdate = true;
      this.dataset.mapSurfaceTexture = `${canvas.width}x${canvas.height} · generated-hd`;
      return;
    }
    const sources = mapTileSources[mode] || mapTileSources.satellite;
    const drawTile = (row, col, tileX, tileY, attempt = 0) => {
      const image = new ImageConstructor();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (this._mapSurfaceKey !== token) return;
        loaded++;
        ctx.drawImage(image, col * 256, row * 256, 256, 256);
        if (String(sources[attempt]?.id || "").startsWith("satellite"))
          this.dataset.mapTileSource = "Esri World Imagery";
        else if (!this.dataset.mapTileSource)
          this.dataset.mapTileSource = "OpenStreetMap";
        ctx.fillStyle =
          mode === "satellite" ? "rgba(4,11,22,.012)" : "rgba(4,11,22,.14)";
        ctx.fillRect(col * 256, row * 256, 256, 256);
        this.dataset.mapTextureTiles = `${loaded}/${total}`;
        this.dataset.mapTexture = loaded === total ? "uploading" : "loading";
        if (loaded === total) {
          try {
            const sample = ctx.getImageData(
              Math.floor(canvas.width / 2),
              Math.floor(canvas.height / 2),
              1,
              1,
            ).data;
            this.dataset.mapSurfacePixel = `${sample[0]},${sample[1]},${sample[2]},${sample[3]}`;
          } catch {
            this.dataset.mapSurfacePixel = "unreadable";
          }
          this.commitMapSurfaceTexture(token, canvas);
        }
        this.mapSurfaceTexture.needsUpdate = true;
        this.renderer?.render(this.scene, this.camera);
      };
      image.onerror = () => {
        if (attempt + 1 < sources.length)
          drawTile(row, col, tileX, tileY, attempt + 1);
        else if (this._mapSurfaceKey === token) {
          this.dataset.mapTextureTiles = `${loaded}/${total}`;
          this.dataset.mapTexture = "partial";
        }
      };
      image.src = sources[attempt].url(zoom, tileX, tileY);
    };
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const tileX = (((x0 + col) % n) + n) % n,
          tileY = y0 + row;
        if (tileY < 0 || tileY >= n) continue;
        total++;
        drawTile(row, col, tileX, tileY);
      }
    this.dataset.mapTexture = hadSurface ? "refreshing" : "loading";
    this.dataset.mapTextureTiles = `0/${total}`;
    // Keep the WebGL source explicitly bound after resizing the backing canvas.
    // Three.js can retain the pre-resize image dimensions otherwise, which
    // leaves the sibling map plane transparent while the GLB remains visible.
    this.mapSurfaceTexture.image = this.mapSurfaceCanvas;
    this.mapSurfaceTexture.needsUpdate = true;
    this.dataset.mapSurfaceTexture = `${canvas.width}x${canvas.height} · needsUpdate`;
  }

  applyMapRasterCentering(w, h) {
    if (!this.mapSurface) return;
    if (this.isAdminReferenceAerialV1?.()) {
      this.syncAdminReferenceAerialSurfaceV1();
      this.dataset.mapRasterCenterOffset =
        "reference-aerial · semantic site window";
      return;
    }
    // A imagem gerada já tem o empreendimento centralizado pelo ponto focal
    // medido. O deslocamento fracionário existe apenas para mosaicos de tiles
    // Web Mercator; aplicá-lo aqui separava a foto do GLB/DWG.
    if (this.mapTileMode === "generated") {
      this.mapSurface.position.set(0, 0, SCENE_MAP_Z);
      this.dataset.mapRasterCenterOffset =
        "0,0 · treated satellite mosaic anchored to DWG origin";
      return;
    }
    const offset = this.mapRasterPixelOffset;
    if (!offset) return;
    const worldX = (offset.x / offset.width) * Number(w || 0),
      worldY = -(offset.y / offset.height) * Number(h || 0);
    this.mapSurface.position.set(worldX, worldY, SCENE_MAP_Z);
    this.dataset.mapRasterCenterOffset = `${offset.x.toFixed(2)},${offset.y.toFixed(2)}px · ${worldX.toFixed(2)},${worldY.toFixed(2)}world`;
  }

  refreshOsmRaster(theme, w, h) {
    if (this.isPublicCustomerExperience()) {
      // O atendimento público usa somente a captura local já servida pelo
      // projeto. Esta guarda impede que um host legado injete um raster OSM
      // caso a cena seja remontada durante a navegação.
      this.dataset.osmRaster = "disabled · public local satellite capture";
      return;
    }
    // A única superfície cartográfica visível é a textura das tiles no plano
    // Three.js. A antiga camada DOM duplicava o mapa e se desacoplava do GLB.
    const host = this.querySelector(".osm-raster");
    if (!host) return;
    host.replaceChildren();
    this.dataset.osmRaster = "disabled · single Three.js map surface";
    return;
    const zoom = Math.max(12, Math.min(20, Number(theme.zoom) || 15)),
      rasterW = Math.min(1280, Math.max(512, w)),
      rasterH = Math.min(1280, Math.max(512, h)),
      cols = Math.ceil(rasterW / 256) + 2,
      rows = Math.ceil(rasterH / 256) + 2,
      lat = Number(theme.center[0]),
      lon = Number(theme.center[1]),
      rad = Math.PI / 180,
      n = 2 ** zoom;
    const xf = ((lon + 180) / 360) * n,
      yf = ((1 - Math.asinh(Math.tan(lat * rad)) / Math.PI) / 2) * n,
      x0 = Math.floor(xf - cols / 2),
      y0 = Math.floor(yf - rows / 2),
      mode = this.mapTileMode || "satellite",
      key = `${mode}|${zoom}|${x0}|${y0}|${cols}|${rows}`;
    this.mapRasterPixelOffset = {
      x: (x0 + cols / 2 - xf) * 256,
      y: (y0 + rows / 2 - yf) * 256,
      width: cols * 256,
      height: rows * 256,
    };
    if (key === this._osmRasterKey) return;
    this._osmRasterKey = key;
    host.replaceChildren();
    host.style.width = `${cols * 256}px`;
    host.style.height = `${rows * 256}px`;
    const sources = mapTileSources[mode] || mapTileSources.satellite;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const tileX = (((x0 + col) % n) + n) % n,
          tileY = y0 + row;
        if (tileY < 0 || tileY >= n) continue;
        const image = new ImageConstructor();
        image.width = 256;
        image.height = 256;
        image.alt = "";
        image.decoding = "async";
        image.loading = "eager";
        image.style.left = `${col * 256}px`;
        image.style.top = `${row * 256}px`;
        let attempt = 0;
        const load = () => {
          image.src = sources[attempt].url(zoom, tileX, tileY);
        };
        image.onerror = () => {
          if (attempt + 1 < sources.length) {
            attempt++;
            load();
          }
        };
        image.onload = () => {
          if (sources[attempt]?.id === "satellite")
            this.dataset.mapTileSource = "Esri World Imagery";
        };
        load();
        host.append(image);
      }
    host.dataset.ready = "true";
    this.dataset.osmRaster = `${mode} · ${zoom} · ${cols}x${rows}`;
  }

  commitMapSurfaceTexture(token, canvas) {
    if (
      this._mapSurfaceKey !== token ||
      !this.mapSurfaceTexture ||
      !this.mapSurface
    )
      return;
    this.dataset.mapTexture = "uploading";
    try {
      // Upload a finalized local image to WebGL. This avoids keeping the
      // mutable tile canvas as the GPU source while tiles arrive asynchronously.
      const image = new ImageConstructor();
      image.onload = () => {
        if (this._mapSurfaceKey !== token) return;
        const texture = new this.THREE.Texture(image);
        texture.colorSpace = this.THREE?.SRGBColorSpace || texture.colorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = this.THREE?.LinearFilter || texture.minFilter;
        texture.magFilter = this.THREE?.LinearFilter || texture.magFilter;
        texture.needsUpdate = true;
        this.mapSurfaceTexture.dispose?.();
        this.mapSurfaceTexture = texture;
        this.mapSurface.material.map = texture;
        this.mapSurface.material.needsUpdate = true;
        // Marque a imagem final antes de sincronizar o relevo: a rotina de
        // sincronização usa este estado para preferir o mosaico satélite ao
        // fallback local e recalcular a máscara de vegetação.
        this.dataset.mapTexture = "ready";
        this.syncPublicTerrainRelief?.();
        // Na apresentação pública a textura definitiva vive no relevo 3D.
        // Não reexiba o plano raster depois do upload, pois ele cobria o
        // terreno e tornava invisíveis a topografia e as árvores do entorno.
        this.mapSurface.visible =
          !this.isPublicMapVisual() || !this.publicTerrainRelief;
        this.dataset.mapSurfaceVisible = this.mapSurface.visible
          ? "true"
          : "false";
        this.dataset.mapTextureUpload = "data-url-image";
        this.renderer?.render(this.scene, this.camera);
      };
      image.onerror = () => {
        this.dataset.mapTexture = "partial";
        this.dataset.mapTextureUpload = "failed";
      };
      // JPEG introduzia blocos e borrava os limites dos lotes depois que a
      // textura era ampliada para preencher a cena. PNG mantém a nitidez dos
      // tiles sem alterar a geometria ou criar uma segunda camada de mapa.
      image.src = canvas.toDataURL("image/png");
    } catch (err) {
      this.dataset.mapTexture = "partial";
      this.dataset.mapTextureUpload = "canvas-fallback";
      this.mapSurfaceTexture.image = canvas;
      this.mapSurfaceTexture.needsUpdate = true;
      this.mapSurface.material.needsUpdate = true;
      this.renderer?.render(this.scene, this.camera);
      this.syncPublicTerrainRelief?.();
      warn("Upload da base cartográfica para WebGL falhou.", err);
    }
  }

  // Projeção usada pela captura local. O raster público e os marcadores
  // compartilham Web Mercator z18 e o centro do manifesto DWG; portanto a
  // presença do Leaflet não é necessária para desenhar nem para atualizar a
  // cena pública.
  projectPublicStaticPointV1(lat, lng, mapCenter, w, h) {
    const safeLat = Math.max(-85, Math.min(85, Number(lat)));
    const safeLng = Number(lng);
    const centerLat = Number(mapCenter?.lat),
      centerLng = Number(mapCenter?.lng);
    if (
      !Number.isFinite(safeLat) ||
      !Number.isFinite(safeLng) ||
      !Number.isFinite(centerLat) ||
      !Number.isFinite(centerLng)
    )
      return { x: w / 2, y: h / 2 };
    const zoom = Math.max(
      1,
      Math.min(
        22,
        Number(this._publicGeoTheme?.zoom) || DWG_SATELLITE_MOSAIC_ZOOM,
      ),
    );
    const n = 2 ** zoom,
      rad = Math.PI / 180;
    const project = (latitude, longitude) => ({
      x: ((longitude + 180) / 360) * n,
      y: ((1 - Math.asinh(Math.tan(latitude * rad)) / Math.PI) / 2) * n,
    });
    const point = project(safeLat, safeLng),
      origin = project(centerLat, centerLng);
    const surface = this.sceneSurfaceDimensions || { width: w, height: h };
    const canvasWidth =
      Number(this.mapSurfaceCanvas?.width) || Number(surface.width) || w;
    const canvasHeight =
      Number(this.mapSurfaceCanvas?.height) || Number(surface.height) || h;
    const scaleX = Number(surface.width || w) / Math.max(1, canvasWidth),
      scaleY = Number(surface.height || h) / Math.max(1, canvasHeight);
    return {
      x: w / 2 + (point.x - origin.x) * 256 * scaleX,
      y: h / 2 + (point.y - origin.y) * 256 * scaleY,
    };
  }
  };
  for (const name of MAP_RASTER_SURFACE_METHODS_V1)
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(MapRasterSurfaceMethodsV1.prototype, name),
    );
};
