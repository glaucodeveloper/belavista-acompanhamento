const PUBLIC_DWG_GEOREFERENCE_CONFIG_KEYS_V1 = Object.freeze(["ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP","ADMIN_PDF_DISPLAY_Y_ROTATION_DEG","ADMIN_PDF_DISPLAY_Y_ROTATION_RAD","MODEL_EXTRA_Y_ROTATION_DEG","MODEL_EXTRA_Y_ROTATION_RAD","MODEL_VERTICAL_EXAGGERATION","PUBLIC_MODEL_HORIZONTAL_FLIP","PUBLIC_MODEL_NORTH_ROTATION_DEG","PUBLIC_MODEL_NORTH_ROTATION_RAD","SCENE_MODEL_BASE_Z"]);
const PUBLIC_DWG_GEOREFERENCE_METHODS_V1 = Object.freeze(["publicDwgGeoFrame","publicDwgModelAffine"]);

export const assertPublicDwgGeoreferenceDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Public DWG georeference requires injected configuration.");
  const config = dependencies.config;
  for (const key of PUBLIC_DWG_GEOREFERENCE_CONFIG_KEYS_V1)
    if (!Number.isFinite(config?.[key]))
      throw new TypeError(`Public DWG georeference requires numeric config.${key}.`);
  return dependencies;
};

export const installPublicDwgGeoreferenceV1 = (MapScene, dependencies) => {
  assertPublicDwgGeoreferenceDependenciesV1(dependencies);
  const {
    ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP,
    ADMIN_PDF_DISPLAY_Y_ROTATION_DEG,
    ADMIN_PDF_DISPLAY_Y_ROTATION_RAD,
    MODEL_EXTRA_Y_ROTATION_DEG,
    MODEL_EXTRA_Y_ROTATION_RAD,
    MODEL_VERTICAL_EXAGGERATION,
    PUBLIC_MODEL_HORIZONTAL_FLIP,
    PUBLIC_MODEL_NORTH_ROTATION_DEG,
    PUBLIC_MODEL_NORTH_ROTATION_RAD,
    SCENE_MODEL_BASE_Z,
  } = dependencies.config;
  const PublicDwgGeoreferenceMethodsV1 = class {
  publicDwgGeoFrame(theme = {}, w = 0, h = 0) {
    if (!this.isPublicMapVisual()) return null;
    const geo = this.dwgGeo || {},
      gps = geo.drawingBounds?.gps || {};
    const controls = (geo.controlPoints || [])
      .map((point) => ({
        id: point?.id,
        lat: Number(point?.lat),
        lng: Number(point?.lng),
      }))
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
      );
    const boundsValid = ["south", "west", "north", "east"].every((key) =>
      Number.isFinite(Number(gps[key])),
    );
    const latitudes = boundsValid
      ? [Number(gps.south), Number(gps.north)]
      : controls.map((point) => point.lat);
    const longitudes = boundsValid
      ? [Number(gps.west), Number(gps.east)]
      : controls.map((point) => point.lng);
    if (latitudes.length < 2 || longitudes.length < 2) return null;
    const south = Math.min(...latitudes),
      north = Math.max(...latitudes),
      west = Math.min(...longitudes),
      east = Math.max(...longitudes);
    const centerPoint =
      controls.find((point) => point.id === "site-center") ||
      geo.drawingBounds?.center ||
      {};
    const center = [Number(centerPoint.lat), Number(centerPoint.lng)];
    const centerLat = Number.isFinite(center[0])
      ? center[0]
      : (south + north) / 2;
    const centerLng = Number.isFinite(center[1])
      ? center[1]
      : (west + east) / 2;
    const zoom = Math.max(12, Math.min(20, Number(theme.zoom) || 18)),
      n = 2 ** zoom,
      rad = Math.PI / 180;
    const project = (lat, lng) => ({
      x: ((lng + 180) / 360) * n,
      y: ((1 - Math.asinh(Math.tan(lat * rad)) / Math.PI) / 2) * n,
    });
    const northWest = project(north, west),
      southEast = project(south, east);
    const widthPx = Math.abs(southEast.x - northWest.x) * 256,
      heightPx = Math.abs(southEast.y - northWest.y) * 256;
    if (
      !Number.isFinite(widthPx) ||
      !Number.isFinite(heightPx) ||
      widthPx < 1 ||
      heightPx < 1
    )
      return null;
    const source = boundsValid
      ? "DWG drawingBounds.gps + control points"
      : "DWG control points";
    this.dataset.publicGeoFrame = `${south.toFixed(7)},${west.toFixed(7)}|${north.toFixed(7)},${east.toFixed(7)}`;
    this.dataset.publicGeoFrameSource = source;
    this.dataset.publicGeoFramePixels = `${Math.round(widthPx)}x${Math.round(heightPx)} @ z${zoom}`;
    this.dataset.publicGeoFrameCenter = `${centerLat.toFixed(8)},${centerLng.toFixed(8)}`;
    this.dataset.publicGeoFitStatus =
      "DWG envelope measured before visual treatment";
    return {
      south,
      west,
      north,
      east,
      center: [centerLat, centerLng],
      zoom,
      widthPx,
      heightPx,
      source,
      viewport: [Number(w) || 0, Number(h) || 0],
    };
  }
  publicDwgModelAffine(
    THREE,
    model,
    frame,
    rasterCenter = frame?.center,
    worldPerPixelX = 1,
    worldPerPixelY = 1,
    verticalScale = MODEL_VERTICAL_EXAGGERATION,
  ) {
    if (
      !this.isPublicMapVisual() ||
      !THREE ||
      !model ||
      !frame ||
      !this.modelParts?.lots?.length ||
      !Array.isArray(this.dwgGeo?.lots)
    ) {
      this.dataset.publicAffineFailure = "precondition";
      return null;
    }
    const fields = Array.isArray(this.dwgGeo?.lotFields)
      ? this.dwgGeo.lotFields
      : null;
    const rows = this.dwgGeo.lots
      .map((row) =>
        Array.isArray(row) && fields
          ? Object.fromEntries(
              fields.map((field, index) => [field, row[index]]),
            )
          : row,
      )
      .filter((row) => row && row.glbObject != null);
    const byObject = new Map(rows.map((row) => [String(row.glbObject), row]));
    const zoom = Math.max(12, Math.min(20, Number(frame.zoom) || 18)),
      n = 2 ** zoom,
      rad = Math.PI / 180;
    const project = (lat, lng) => ({
      x: ((Number(lng) + 180) / 360) * n,
      y: ((1 - Math.asinh(Math.tan(Number(lat) * rad)) / Math.PI) / 2) * n,
    });
    const centerPoint =
      Array.isArray(rasterCenter) && rasterCenter.length >= 2
        ? rasterCenter
        : frame.center;
    const rasterOrigin = project(
      Number(centerPoint?.[0]),
      Number(centerPoint?.[1]),
    );
    if (!Number.isFinite(rasterOrigin.x) || !Number.isFinite(rasterOrigin.y)) {
      this.dataset.publicAffineFailure = "raster-origin";
      return null;
    }
    const adminPdfDisplay = this.hasAttribute("data-admin-shared-public-map");
    const horizontalFlip = adminPdfDisplay
      ? ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP
      : PUBLIC_MODEL_HORIZONTAL_FLIP;
    const extraRotationRad = adminPdfDisplay
      ? ADMIN_PDF_DISPLAY_Y_ROTATION_RAD
      : MODEL_EXTRA_Y_ROTATION_RAD;
    const extraRotationDeg = adminPdfDisplay
      ? ADMIN_PDF_DISPLAY_Y_ROTATION_DEG
      : MODEL_EXTRA_Y_ROTATION_DEG;
    // O export do GLB usa X/Z como plano da implantação. No dashboard que
    // projeta a prancha do PDF, esse frame já é o mesmo frame da imagem: uma
    // rotação/espelhamento adicional troca os eixos e cria o desalinhamento
    // visível entre lotes destacados e os lotes numerados. A apresentação
    // pública continua usando a orientação editorial legada.
    const orientationMatrix = adminPdfDisplay
      ? new THREE.Matrix4().makeRotationY(extraRotationRad)
      : new THREE.Matrix4()
          .makeScale(horizontalFlip, 1, 1)
          .multiply(
            new THREE.Matrix4().makeRotationY(PUBLIC_MODEL_NORTH_ROTATION_RAD),
          )
          .multiply(new THREE.Matrix4().makeRotationY(extraRotationRad));
    if (adminPdfDisplay) {
      // O dashboard exibe a página completa da prancha, não um mosaico
      // geográfico. Usar os pixels Web Mercator aqui misturava a cobertura
      // horizontal/vertical do raster e esticava a implantação. O frame local
      // recebido pelo chamador já foi calculado a partir do envelope do GLB;
      // aplique uma única escala uniforme diretamente em X/Z.
      const horizontalScale = Number(this._adminPdfSourceFrameScale) || 1;
      const verticalScaleValue =
        Number(verticalScale) || MODEL_VERTICAL_EXAGGERATION;
      const affineMatrix = new THREE.Matrix4().set(
        horizontalScale,
        0,
        0,
        0,
        0,
        0,
        horizontalScale,
        0,
        0,
        verticalScaleValue,
        0,
        Number(model.userData?.mapBaseLift) || SCENE_MODEL_BASE_Z,
        0,
        0,
        0,
        1,
      );
      const matrix = affineMatrix.clone().multiply(orientationMatrix);
      this.dataset.publicAffineSamples = String(this.modelParts.lots.length);
      this.dataset.publicAffineFailure = "none";
      this.dataset.publicModelScalePolicy =
        "pdf-local-frame · escala uniforme X/Z · proporção da prancha preservada";
      this.dataset.publicModelUniformScale = horizontalScale.toFixed(6);
      this.dataset.publicModelAlignmentOffset = "0,0 · PDF source frame";
      this.dataset.publicModelGuideRotation = `${extraRotationDeg}deg · PDF display orientation`;
      this.dataset.publicModelOrientation = `dwg-affine|source-xz-frame|flipX-1|y+${extraRotationDeg}deg|north=loading-reference`;
      return {
        matrix,
        affineMatrix,
        orientationMatrix,
        matched: this.modelParts.lots.length,
        rms: 0,
        xAxis: [0, horizontalScale, 0],
        yAxis: [0, 0, horizontalScale],
        residualMax: 0,
        horizontalScale,
        orientation: {
          rotationDeg: 0,
          extraRotationYDeg: extraRotationDeg,
          guideRotationDeg: 0,
          flipX: 1,
          northReference: "loading reference",
          fit: "pdf-local-frame · uniform-scale",
        },
        alignmentOffset: { x: 0, z: 0 },
      };
    }
    const samples = [];
    model.updateMatrixWorld(true);
    for (const lot of this.modelParts.lots) {
      const row = byObject.get(String(lot.userData?.partId || lot.name || ""));
      const lat = Number(row?.lat),
        lng = Number(row?.lng);
      if (!row || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const bounds = new THREE.Box3().setFromObject(lot);
      if (bounds.isEmpty()) continue;
      const world = bounds.getCenter(new THREE.Vector3());
      const local = model.worldToLocal(world.clone());
      // A orientação solicitada continua fazendo parte do frame do modelo,
      // mas entra antes do ajuste. Os centros dos lotes resolvem posição e
      // giro sem reaplicar uma rotação posterior que desloque a implantação.
      const orientedLocal = local.clone().applyMatrix4(orientationMatrix);
      const target = project(lat, lng);
      // O alvo Web Mercator cresce para baixo, enquanto o eixo Z do GLB já
      // cresce na mesma direção quando o loteamento está na orientação da
      // prancha. O sinal negativo anterior invertia a implantação no ajuste
      // afim e fazia a camada de destaque cair em outra fileira de lotes.
      const sourcePlaneY = adminPdfDisplay
        ? Number(orientedLocal.z)
        : -Number(orientedLocal.z);
      samples.push({
        sx: Number(orientedLocal.x),
        sy: sourcePlaneY,
        tx: (target.x - rasterOrigin.x) * 256 * Number(worldPerPixelX || 1),
        ty: (target.y - rasterOrigin.y) * 256 * Number(worldPerPixelY || 1),
      });
    }
    this.dataset.publicAffineSamples = String(samples.length);
    if (samples.length < 3) {
      this.dataset.publicAffineFailure = `samples-${samples.length}`;
      return null;
    }
    // O ajuste anterior resolvia duas regressões independentes. Isso permitia
    // uma escala X diferente da escala Y e cisalhamento; na prática, o GLB e
    // a página do PDF ficavam esticados para caber no retângulo geográfico.
    // Resolva agora uma similaridade 2D: translação + rotação + uma única
    // escala horizontal. A orientação pode continuar sendo refletida pela
    // orientationMatrix, mas a proporção do desenho nunca é deformada.
    let sourceX = 0,
      sourceY = 0,
      targetX = 0,
      targetY = 0;
    for (const sample of samples) {
      sourceX += sample.sx;
      sourceY += sample.sy;
      targetX += sample.tx;
      targetY += sample.ty;
    }
    sourceX /= samples.length;
    sourceY /= samples.length;
    targetX /= samples.length;
    targetY /= samples.length;
    let normalizer = 0,
      direct = 0,
      cross = 0;
    for (const sample of samples) {
      const sx = sample.sx - sourceX,
        sy = sample.sy - sourceY,
        tx = sample.tx - targetX,
        ty = sample.ty - targetY;
      normalizer += sx * sx + sy * sy;
      direct += sx * tx + sy * ty;
      cross += sx * ty - sy * tx;
    }
    if (normalizer < 1e-8) {
      this.dataset.publicAffineFailure = "singular-similarity";
      return null;
    }
    const cosScale = direct / normalizer,
      sinScale = cross / normalizer;
    const horizontalScale = Math.hypot(cosScale, sinScale);
    const xAxis = [
      targetX - cosScale * sourceX + sinScale * sourceY,
      cosScale,
      -sinScale,
    ];
    const yAxis = [
      targetY - sinScale * sourceX - cosScale * sourceY,
      sinScale,
      cosScale,
    ];
    const residuals = samples.map((sample) =>
      Math.hypot(
        xAxis[0] + xAxis[1] * sample.sx + xAxis[2] * sample.sy - sample.tx,
        yAxis[0] + yAxis[1] * sample.sx + yAxis[2] * sample.sy - sample.ty,
      ),
    );
    const rms = Math.sqrt(
      residuals.reduce((sum, value) => sum + value * value, 0) /
        Math.max(1, residuals.length),
    );
    const affineMatrix = new THREE.Matrix4().set(
      xAxis[1],
      0,
      -xAxis[2],
      xAxis[0],
      yAxis[1],
      0,
      -yAxis[2],
      yAxis[0],
      0,
      Number(verticalScale) || MODEL_VERTICAL_EXAGGERATION,
      0,
      Number(model.userData?.mapBaseLift) || SCENE_MODEL_BASE_Z,
      0,
      0,
      0,
      1,
    );
    // A matriz de similaridade é a única fonte de posição no mapa. Ela é
    // resolvida pelos centros georreferenciados dos lotes e conserva a escala
    // horizontal uniforme; offsets e giros de tela não podem ser reaplicados.
    const matrix = affineMatrix.clone().multiply(orientationMatrix);
    this.dataset.publicAffineFailure = "none";
    this.dataset.publicModelScalePolicy =
      "similarity-2d · escala horizontal uniforme · proporção do PDF preservada";
    this.dataset.publicModelUniformScale = horizontalScale.toFixed(6);
    this.dataset.publicModelAlignmentOffset = "0,0 · solved by DWG lot centers";
    this.dataset.publicModelGuideRotation = adminPdfDisplay
      ? `${extraRotationDeg}deg · PDF display orientation`
      : "0deg · disabled after georeference fit";
    this.dataset.publicModelOrientation = adminPdfDisplay
      ? `dwg-affine|source-xz-frame|flipX-1|y+${extraRotationDeg}deg|north=loading-reference`
      : `dwg-affine|orientation-before-fit|rotate-left-90deg|flipX-${horizontalFlip}|y+${extraRotationDeg}deg|north=upper-road-exit`;
    return {
      matrix,
      affineMatrix,
      orientationMatrix,
      matched: samples.length,
      rms,
      xAxis,
      yAxis,
      residualMax: Math.max(...residuals),
      horizontalScale,
      orientation: {
        rotationDeg: adminPdfDisplay ? 0 : PUBLIC_MODEL_NORTH_ROTATION_DEG,
        extraRotationYDeg: extraRotationDeg,
        guideRotationDeg: 0,
        flipX: adminPdfDisplay ? 1 : horizontalFlip,
        northReference: adminPdfDisplay
          ? "loading reference"
          : "upper road exit",
        fit: "lot-centers · similarity-uniform-scale",
      },
      alignmentOffset: { x: 0, z: 0 },
    };
  }
  };
  for (const name of PUBLIC_DWG_GEOREFERENCE_METHODS_V1)
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(PublicDwgGeoreferenceMethodsV1.prototype, name),
    );
};
