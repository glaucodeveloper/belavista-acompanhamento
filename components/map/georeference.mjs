import { runtimeRouteV1 } from "../shared/routing.mjs";

export const DWG_GEOREFERENCE_URL = runtimeRouteV1(
  "/assets/data/dwg-georeference.json",
  "v=dwg-georef-v1",
);
// BELAVISTA_ADMIN_FIXED_AERIAL_GEO_WARP_V1
// A fotografia administrativa é uma referência fixa/perspectivada. Em vez de
// girar/escalar o GLB "no olho", o chão do GLB é levado primeiro ao UTM oficial
// do DWG e, em seguida, projetado na imagem por uma homografia calibrada uma vez
// contra a própria referência aérea fornecida.
//
// Coordenadas: EPSG:31984 (Easting, Northing) -> UV da imagem (origem top-left).
const ADMIN_REFERENCE_AERIAL_UTM_TO_UV_HOMOGRAPHY_V1 = [
  [-2.94306335e-7, -6.87434193e-8, 7.15685809e-1],
  [3.56353169e-11, 3.82122918e-7, -3.27219102],
  [7.83358933e-8, -1.2079129e-7, 1],
];
// Transformação aferida entre os centróides dos 298 lotes extraídos da prancha
// PDF e a captura de satélite tratada. A origem é a imagem de referência do
// PDF (normalizada 0..1, topo-esquerdo) e o destino é a imagem satélite
// quadrada. Usar a homografia evita esticar a planta e mantém cada marcador
// dentro do lote que o originou.
const PDF_LOT_TRACE_TO_SATELLITE_UV_HOMOGRAPHY_V1 = [
  [1.0086098422894447, 0.0016134121622422126, -0.0038032196583164613],
  [0.008350177715188936, 1.0024607676404558, -0.004674004133295162],
  [0.006975914424053379, -0.0032041357221301472, 1],
];
export const PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1 =
  "298 centros PDF→DWG→satélite · erro médio 0,16% da imagem";

const projectPdfLotTraceToSatelliteUvV1 = (point, imageSize = []) => {
  const width = Math.max(1, Number(imageSize[0]) || 1),
    height = Math.max(1, Number(imageSize[1]) || 1),
    x = (Number(point?.[0]) || 0) / width,
    y = (Number(point?.[1]) || 0) / height,
    h = PDF_LOT_TRACE_TO_SATELLITE_UV_HOMOGRAPHY_V1,
    w = h[2][0] * x + h[2][1] * y + h[2][2];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-12) return null;
  return {
    u: (h[0][0] * x + h[0][1] * y + h[0][2]) / w,
    v: (h[1][0] * x + h[1][1] * y + h[1][2]) / w,
  };
};

export const polygonCentroidV1 = (polygon) => {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const px = Number(point?.[0]);
    const py = Number(point?.[1]);
    const nx = Number(next?.[0]);
    const ny = Number(next?.[1]);
    if (![px, py, nx, ny].every(Number.isFinite)) return;
    const cross = px * ny - nx * py;
    twiceArea += cross;
    x += (px + nx) * cross;
    y += (py + ny) * cross;
  });
  if (Math.abs(twiceArea) < 1e-9) {
    const valid = polygon.filter((point) => Number.isFinite(Number(point?.[0])) && Number.isFinite(Number(point?.[1])));
    if (!valid.length) return null;
    return valid.reduce((total, point) => ({ x: total.x + Number(point[0]) / valid.length, y: total.y + Number(point[1]) / valid.length }), { x: 0, y: 0 });
  }
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
};

export const projectCanonicalLotTraceToMasterplanOverlayUvV1 = (point, imageSize = []) => {
  const width = Math.max(1, Number(imageSize[0]) || 1);
  const height = Math.max(1, Number(imageSize[1]) || 1);
  const x = Number(point?.x) / width;
  const y = Number(point?.y) / height;
  const h = CANONICAL_LOT_TRACE_TO_MASTERPLAN_OVERLAY_HOMOGRAPHY_V1;
  const w = h[2][0] * x + h[2][1] * y + h[2][2];
  if (![x, y, w].every(Number.isFinite) || Math.abs(w) < 1e-12) return null;
  const u = (h[0][0] * x + h[0][1] * y + h[0][2]) / w;
  const v = (h[1][0] * x + h[1][1] * y + h[1][2]) / w;
  return u > -0.05 && u < 1.05 && v > -0.05 && v < 1.05 ? { u, v } : null;
};
export const ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1 = {
  nw: { u: 0.32090587, v: 0.08733924 },
  ne: { u: 0.68860404, v: 0.0951735 },
  se: { u: 0.71232314, v: 0.7420018 },
  sw: { u: 0.27644378, v: 0.66968067 },
};
export const ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 = {
  left: 0.2110515272100637,
  top: 0.4572318077949459,
  width: 0.24460825293243182,
  height: 0.29477393932728184,
  rotation: 0,
};
// Marcadores que a revisão visual identificou como áreas de rua, canteiro ou
// retângulos sem lote comercializável. Eles não devem ser exibidos, clicáveis
// nem permanecer disponíveis para calibração até existir geometria oficial.
export const INVALID_MASTERPLAN_LOT_IDS_V1 = new Set([
  "Lote_023",
  "Lote_041",
  "Lote_048",
  // A posição 055 na prancha é Rua A, não uma unidade comercializável.
  "Lote_055",
  "Lote_069",
  "Lote_114",
  "Lote_133",
  "Lote_164",
  "Lote_195",
  "Lote_208",
  "Lote_212",
  "Lote_283",
  "Lote_284",
]);
// Revisão visual: estes traçados são somente as bordas de retângulos que
// ficaram pouco visíveis no recorte. Não criam lote, marcador ou interação.
const MASTERPLAN_VISUAL_RECOVERY_LOT_IDS_V1 = new Set([
  "Lote_212",
  ...Array.from({ length: 42 }, (_, index) => `Lote_${String(index + 3).padStart(3, "0")}`),
]);
// Unidades cuja área precisa vir do traçado canônico da prancha, pois o
// preenchimento verde/fatiamento automático não descreve seu retângulo.
export const MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1 = new Set([
  "Lote_003", "Lote_005", "Lote_010", "Lote_030", "Lote_044", "Lote_124",
  "Lote_179", "Lote_186", "Lote_198", "Lote_223", "Lote_241",
]);
// Os polígonos abaixo fazem parte da prancha, mas não representam unidades
// comercializáveis. Eles permanecem disponíveis como áreas compartilhadas do
// empreendimento, sem receber numeração ou ações de lote.
export const MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1 = new Set([
  // IDs técnicos da segmentação da arte. Eles não são a numeração comercial
  // canônica: por isso podem coexistir com os marcadores 023, 041 e 212.
  "Lote_023",
  "Lote_041",
  "Lote_048",
  "Lote_055",
  "Lote_069",
  "Lote_114",
  "Lote_133",
  "Lote_164",
  "Lote_195",
  "Lote_208",
  "Lote_212",
  "Lote_283",
  "Lote_284",
]);
export const MASTERPLAN_COMMON_AREA_LABEL_V1 = "Área comum do loteamento";
const ADMIN_REFERENCE_AERIAL_GEO_WORLD_HEIGHT_V1 = 320;
const ADMIN_REFERENCE_AERIAL_GEO_VERTICAL_SCALE_V1 = 0.28;
export const ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1 =
  "dwg-utm-to-image-traced-lots-v1";
export const ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1 =
  "/assets/data/aerial-lot-trace-v1.json?v=2";
// Polígonos extraídos da própria arte transparente aplicada no mapa
// administrativo. Diferente do traçado aéreo (horizontal), esta fonte usa a
// mesma tela vertical do masterplan; portanto seus hit-areas não sofrem a
// distorção criada ao normalizar os dois arquivos em um mesmo retângulo.
export const ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2 =
  "/assets/data/masterplan-lot-polygons-v2.json?v=1";
// Centros de etiquetas lidos na prancha comercial oficial. Esta fonte é a
// autoridade para o número visível e substitui os IDs sequenciais do GLB,
// que também continham ruas, áreas comuns e reservas como se fossem lotes.
export const PDF_LOT_LABELS_URL_V1 = "/assets/data/pdf-lot-labels-v1.json?v=1";
// Relação entre o número oficial da prancha e a área verde correspondente.
// Os IDs do arquivo de polígonos são apenas IDs técnicos da segmentação; não
// podem ser usados como numeração comercial dos lotes.
export const PDF_LOT_GREEN_MAPPING_URL_V1 = "/assets/data/pdf-lot-green-mapping-v1.json?v=pdf-yellow-circles-v2";
// Registro geométrico entre o traçado canônico (GLB/DWG, 298 unidades) e a
// prancha vertical aplicada sobre o satélite. O mapeamento anterior partia de
// círculos extraídos do PDF e acabava associando retângulos de borda a números
// vizinhos. Este registro preserva a identidade espacial, inclusive quando a
// arte perde o preenchimento verde do lote.
const CANONICAL_LOT_TRACE_TO_MASTERPLAN_OVERLAY_HOMOGRAPHY_V1 = [
  [-1.305634578549388, -0.09262782662689444, 0.3977201474957953],
  [0.044328560352298825, -0.870047499833295, 0.04463101808400932],
  [-0.05480788446101144, -0.09718665320688509, -0.4624988534836937],
];
export const CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1 =
  "GLB/DWG → prancha masterplan · registro geométrico de 298 lotes";
export const ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1 =
  "/assets/data/aerial-road-trace-v1.json?v=18-vector-curb-normalized";
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_ENABLED_V1 = false;
export const ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1 =
  "aerial-site-mask-extrusion-v1";
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_X_V1 = 128;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_Y_V1 = 72;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_WIDTH_V1 = 512;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_HEIGHT_V1 = 288;

const projectAdminReferenceUtmToUvV1 = (east, north) => {
  const h = ADMIN_REFERENCE_AERIAL_UTM_TO_UV_HOMOGRAPHY_V1,
    e = Number(east),
    n = Number(north),
    w = h[2][0] * e + h[2][1] * n + h[2][2];
  if (!Number.isFinite(e) || !Number.isFinite(n) || Math.abs(w) < 1e-12)
    return null;
  return {
    u: (h[0][0] * e + h[0][1] * n + h[0][2]) / w,
    v: (h[1][0] * e + h[1][1] * n + h[1][2]) / w,
  };
};

// Fine-tune residual APÓS a homografia oficial.
// O georreferenciamento GLB→UTM continua sendo a base; estes deltas corrigem
// somente a pequena diferença projetiva observada na fotografia aérea fixa.
// Valores em UV: 0.01 ~= 1% da largura/altura da imagem.
const ADMIN_REFERENCE_AERIAL_RESIDUAL_WARP_V2 = {
  topLeftRight: 0.01,
  lowerLeftRight: 0.018,
  lowerLeftUp: 0.008,
  topCutoffV: 0.24,
  bottomStartV: 0.42,
  leftCutoffU: 0.42,
};

const applyAdminReferenceAerialResidualWarpV2 = (uv) => {
  if (!uv) return uv;
  const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0)),
    cfg = ADMIN_REFERENCE_AERIAL_RESIDUAL_WARP_V2,
    leftWeight = clamp01((cfg.leftCutoffU - uv.u) / cfg.leftCutoffU),
    bottomWeight = clamp01((uv.v - cfg.bottomStartV) / (1 - cfg.bottomStartV)),
    topWeight = clamp01((cfg.topCutoffV - uv.v) / cfg.topCutoffV);

  // Sobra no ponto superior esquerdo: traz a borda para dentro.
  uv.u += cfg.topLeftRight * leftWeight * topWeight;

  // Sobra na lateral inferior esquerda: traz progressivamente para dentro.
  uv.u += cfg.lowerLeftRight * leftWeight * bottomWeight;

  // Corrige a abertura angular residual na região inferior.
  uv.v -= cfg.lowerLeftUp * leftWeight * bottomWeight;

  return uv;
};

const applyAdminReferenceAerialImageTraceV1 = (uv, trace, width, height) => {
  if (!uv || !trace?.grid || !Array.isArray(trace.gridBounds)) return uv;
  const grid = trace.grid,
    rows = grid.length,
    cols = grid[0]?.length || 0,
    [x0, y0, x1, y1] = trace.gridBounds;
  if (rows < 2 || cols < 2 || x1 <= x0 || y1 <= y0) return uv;
  const x = uv.u * width,
    y = uv.v * height,
    gx = Math.max(0, Math.min(cols - 1, ((x - x0) / (x1 - x0)) * (cols - 1))),
    gy = Math.max(0, Math.min(rows - 1, ((y - y0) / (y1 - y0)) * (rows - 1))),
    ix = Math.min(cols - 2, Math.floor(gx)),
    iy = Math.min(rows - 2, Math.floor(gy)),
    fx = gx - ix,
    fy = gy - iy,
    at = (axis) =>
      (1 - fx) * (1 - fy) * Number(grid[iy][ix][axis] || 0) +
      fx * (1 - fy) * Number(grid[iy][ix + 1][axis] || 0) +
      (1 - fx) * fy * Number(grid[iy + 1][ix][axis] || 0) +
      fx * fy * Number(grid[iy + 1][ix + 1][axis] || 0);
  uv.u += at(0) / width;
  uv.v += at(1) / height;
  return uv;
};

const pointInsideAdminReferenceAerialQuadV1 = (u, v) => {
  const points = [
    ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1.nw,
    ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1.ne,
    ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1.se,
    ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1.sw,
  ];
  let sign = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index],
      next = points[(index + 1) % points.length],
      cross =
        (next.u - current.u) * (v - current.v) -
        (next.v - current.v) * (u - current.u);
    if (Math.abs(cross) < 1e-6) continue;
    const nextSign = Math.sign(cross);
    if (!sign) sign = nextSign;
    else if (nextSign !== sign) return false;
  }
  return true;
};

export const buildAdminReferenceAerialRasterMaskModelV1 = ({
  THREE,
  image,
  texture,
}) => {
  if (
    !ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_ENABLED_V1 ||
    !THREE ||
    !image ||
    !texture ||
    typeof document === "undefined"
  )
    return null;

  try {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_WIDTH_V1;
    sampleCanvas.height = ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_HEIGHT_V1;
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!sampleContext) return null;
    sampleContext.drawImage(
      image,
      0,
      0,
      sampleCanvas.width,
      sampleCanvas.height,
    );
    const pixels = sampleContext.getImageData(
      0,
      0,
      sampleCanvas.width,
      sampleCanvas.height,
    ).data;

    const maskPixels = new Uint8Array(
      sampleCanvas.width * sampleCanvas.height * 4,
    );
    const roadScores = new Float32Array(
      sampleCanvas.width * sampleCanvas.height,
    );
    for (let y = 0; y < sampleCanvas.height; y++) {
      for (let x = 0; x < sampleCanvas.width; x++) {
        const pixelIndex = y * sampleCanvas.width + x,
          sourceIndex = pixelIndex * 4,
          red = pixels[sourceIndex],
          green = pixels[sourceIndex + 1],
          blue = pixels[sourceIndex + 2],
          maximum = Math.max(red, green, blue),
          minimum = Math.min(red, green, blue),
          luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255,
          neutrality = 1 - (maximum - minimum) / 255,
          u = x / Math.max(1, sampleCanvas.width - 1),
          v = y / Math.max(1, sampleCanvas.height - 1),
          inside = pointInsideAdminReferenceAerialQuadV1(u, v),
          brightNeutralRoad =
            Math.max(0, Math.min(1, (luminance - 0.42) / 0.42)) *
            Math.max(0, Math.min(1, neutrality * 1.55));

        const lotGreen =
          red > 48 &&
          green > 54 &&
          green > blue * 1.22 &&
          green > red * 0.9 &&
          red < 150;
        const road = brightNeutralRoad > 0.16;
        maskPixels[sourceIndex] = road ? 75 : 102;
        maskPixels[sourceIndex + 1] = road ? 170 : 199;
        maskPixels[sourceIndex + 2] = road ? 245 : 105;
        // Só os lotes recebem realce. Caminhos claros fora do loteamento
        // também parecem ruas no raster e criavam manchas sobre a paisagem.
        maskPixels[sourceIndex + 3] = inside && lotGreen ? 90 : 0;
        roadScores[pixelIndex] = inside ? brightNeutralRoad : 0;
      }
    }

    const maskTexture = new THREE.DataTexture(
      maskPixels,
      sampleCanvas.width,
      sampleCanvas.height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    maskTexture.name = "BelavistaAdminReferenceAerialSiteMask";
    maskTexture.flipY = Boolean(texture.flipY);
    maskTexture.generateMipmaps = false;
    maskTexture.minFilter = THREE.LinearFilter;
    maskTexture.magFilter = THREE.LinearFilter;
    maskTexture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(
      1,
      1,
      ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_X_V1,
      ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_Y_V1,
    );
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const colors = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      const u = Number(uv.getX(index)) || 0,
        v = Number(uv.getY(index)) || 0,
        imageU = Math.max(0, Math.min(1, u)),
        imageV = Math.max(0, Math.min(1, 1 - v)),
        sampleX = Math.round(imageU * (sampleCanvas.width - 1)),
        sampleY = Math.round(imageV * (sampleCanvas.height - 1)),
        sampleIndex = sampleY * sampleCanvas.width + sampleX,
        siteMask = maskPixels[sampleIndex * 4 + 3] > 0,
        roadLift = roadScores[sampleIndex] || 0,
        sourceIndex = sampleIndex * 4,
        red = pixels[sourceIndex],
        green = pixels[sourceIndex + 1],
        blue = pixels[sourceIndex + 2],
        lotGreen =
          siteMask &&
          red > 48 &&
          green > 54 &&
          green > blue * 1.22 &&
          green > red * 0.9 &&
          red < 150,
        road = siteMask && roadLift > 0.16;
      // A textura fotográfica permanece plana: deslocar seus vértices
      // ondulava ruas e divisas que já estão desenhadas na imagem.
      position.setZ(index, 0);
      const colorIndex = index * 3;
      colors[colorIndex] = road ? 0.4 : lotGreen ? 0.67 : 1;
      colors[colorIndex + 1] = road ? 0.72 : 1;
      colors[colorIndex + 2] = road ? 1 : lotGreen ? 0.7 : 1;
    }
    position.needsUpdate = true;
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: maskTexture,
      vertexColors: false,
      alphaTest: 0.01,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "BelavistaAdminReferenceAerialRasterMaskModel";
    mesh.renderOrder = 12;
    mesh.frustumCulled = false;
    mesh.userData = {
      adminReferenceAerialRasterMask: true,
      version: ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
      source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      mask: "site quad filtered from aerial pixels",
      textureRole: "same aerial image UV used as model texture",
      extrusion: "flat image-derived road and lot tint on matching UV",
      grid: `${ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_X_V1}x${ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_Y_V1}`,
    };
    mesh.onBeforeRender = () => {
      material.map = maskTexture;
      material.needsUpdate = false;
    };
    return mesh;
  } catch (error) {
    console.warn(
      "[Aliança Park] máscara raster da implantação indisponível; mantendo o modelo semântico.",
      error,
    );
    return null;
  }
};

export const loadAdminDwgGeoreferenceV1 = async () => {
  const response = await fetch(DWG_GEOREFERENCE_URL, { cache: "no-store" });
  if (!response.ok)
    throw new Error(`DWG georeference indisponível (${response.status})`);
  const geo = await response.json();
  const matrix = geo?.alignment?.glbToDwgMatrix,
    translation = geo?.alignment?.translation;
  if (
    !Array.isArray(matrix) ||
    matrix.length < 2 ||
    !Array.isArray(matrix[0]) ||
    !Array.isArray(matrix[1]) ||
    !Array.isArray(translation) ||
    translation.length < 2
  )
    throw new Error("DWG georeference sem matriz GLB→UTM");
  return geo;
};

const cloneAdminMaterialWithoutTexturesV1 = (THREE, material) => {
  if (!material) return material;
  if (Array.isArray(material))
    return material.map((item) =>
      cloneAdminMaterialWithoutTexturesV1(THREE, item),
    );

  const clean = material.clone?.() || material;
  for (const key of [
            "map",
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
  ]) {
    if (key in clean) clean[key] = null;
  }
  // Mantém apenas as cores/propriedades materiais do GLB; nenhuma imagem é usada.
  clean.needsUpdate = true;
  return clean;
};

// A malha principal das ruas é vetorial e usa os contornos dos meio-fios como
// limites. A máscara raster fica somente como recurso auxiliar/fallback.
export const appendAdminReferenceAerialCurbPathV1 = (path, points, toPoint) => {
  if (!Array.isArray(points) || points.length < 3) return false;
  const vertices = points.map(toPoint),
    signedArea = vertices.reduce(
      (sum, current, index) => {
        const next = vertices[(index + 1) % vertices.length];
        return sum + current[0] * next[1] - next[0] * current[1];
      },
      0,
    ) / 2,
    orientation = signedArea >= 0 ? 1 : -1,
    corners = vertices.map((current, index) => {
      const previous = vertices[(index - 1 + vertices.length) % vertices.length],
        next = vertices[(index + 1) % vertices.length],
        incoming = Math.hypot(
          current[0] - previous[0],
          current[1] - previous[1],
        ),
        outgoing = Math.hypot(next[0] - current[0], next[1] - current[1]),
        cross =
          (current[0] - previous[0]) * (next[1] - current[1]) -
          (current[1] - previous[1]) * (next[0] - current[0]),
        dot =
          (previous[0] - current[0]) * (next[0] - current[0]) +
          (previous[1] - current[1]) * (next[1] - current[1]),
        turn =
          incoming > 0.001 && outgoing > 0.001
            ? Math.PI -
              Math.acos(
                Math.max(-1, Math.min(1, dot / (incoming * outgoing))),
              )
            : 0,
        convex = cross * orientation > 0,
        smooth =
          convex &&
          incoming >= 8 &&
          outgoing >= 8 &&
          turn >= (28 * Math.PI) / 180,
        trim = smooth ? Math.min(9, incoming * 0.24, outgoing * 0.24) : 0;
      return {
        current,
        before: smooth
          ? [
              current[0] + ((previous[0] - current[0]) * trim) / incoming,
              current[1] + ((previous[1] - current[1]) * trim) / incoming,
            ]
          : current,
        after: smooth
          ? [
              current[0] + ((next[0] - current[0]) * trim) / outgoing,
              current[1] + ((next[1] - current[1]) * trim) / outgoing,
            ]
          : current,
        smooth,
      };
    });
  const start = corners[corners.length - 1].smooth
    ? corners[corners.length - 1].after
    : corners[corners.length - 1].current;
  path.moveTo(start[0], start[1]);
  corners.forEach((corner) => {
    if (corner.smooth) {
      path.lineTo(corner.before[0], corner.before[1]);
      path.quadraticCurveTo(
        corner.current[0],
        corner.current[1],
        corner.after[0],
        corner.after[1],
      );
    } else {
      path.lineTo(corner.current[0], corner.current[1]);
    }
  });
  path.closePath();
  return true;
};

const createAdminReferenceAerialRoadGeometryV1 = (
  THREE,
  roadTrace,
  imageWidth,
  imageHeight,
  worldWidth,
  worldHeight,
) => {
  if (!Array.isArray(roadTrace?.roads) || !roadTrace.roads.length) return null;
  const toWorld = (point) => [
    ((Number(point[0]) || 0) / imageWidth - 0.5) * worldWidth,
    (0.5 - (Number(point[1]) || 0) / imageHeight) * worldHeight,
  ];
  const shapes = [];
  for (const road of roadTrace.roads) {
    const shape = new THREE.Shape();
    if (!appendAdminReferenceAerialCurbPathV1(shape, road.outer, toWorld))
      continue;
    for (const holePoints of road.holes || []) {
      const hole = new THREE.Path();
      if (appendAdminReferenceAerialCurbPathV1(hole, holePoints, toWorld))
        shape.holes.push(hole);
    }
    shapes.push(shape);
  }
  if (!shapes.length) return null;
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.translate(0, 0, 0.03);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

// A máscara UV continua disponível para diagnóstico e fallback de segmentos
// especiais; não é usada como limite principal das retas do loteamento.
const createAdminReferenceAerialRoadUvMaskGeometryV1 = (
  THREE,
  roadTrace,
  worldWidth,
  worldHeight,
  z = 0.03,
) => {
  const mask = roadTrace?.uvMask,
    imageWidth = Math.max(1, Number(roadTrace.imageSize?.[0]) || 1672),
    imageHeight = Math.max(1, Number(roadTrace.imageSize?.[1]) || 941),
    cellSize = Math.max(1, Number(mask?.cellSize) || 2),
    rows = Array.isArray(mask?.rows) ? mask.rows : [],
    positions = [],
    uvs = [],
    indices = [];
  if (!rows.length) return null;
  const addVertex = (x, y) => {
    positions.push(
      (x / imageWidth - 0.5) * worldWidth,
      (0.5 - y / imageHeight) * worldHeight,
      z,
    );
    uvs.push(x / imageWidth, 1 - y / imageHeight);
    return positions.length / 3 - 1;
  };
  rows.forEach((spans, gridY) => {
    if (!Array.isArray(spans)) return;
    const y0 = Math.min(imageHeight, gridY * cellSize),
      y1 = Math.min(imageHeight, y0 + cellSize);
    if (y1 <= y0) return;
    spans.forEach((span) => {
      if (!Array.isArray(span) || span.length < 2) return;
      const x0 = Math.max(0, Math.min(imageWidth, Number(span[0]) * cellSize)),
        x1 = Math.max(0, Math.min(imageWidth, Number(span[1]) * cellSize));
      if (x1 <= x0) return;
      const bottomLeft = addVertex(x0, y1),
        bottomRight = addVertex(x1, y1),
        topRight = addVertex(x1, y0),
        topLeft = addVertex(x0, y0);
      indices.push(
        bottomLeft, bottomRight, topRight,
        bottomLeft, topRight, topLeft,
      );
    });
  });
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData = {
    uvRoadMask: true,
    uvRoadMaskCellSize: cellSize,
    uvRoadMaskFaces: indices.length / 3,
  };
  return geometry;
};

// O contorno principal continua sendo o meio-fio vetorial. Estas guias são
// somente a leitura visual das mudanças de direção: ruas longas continuam
// sendo segmentos retos e fechados pelo mesmo polígono, enquanto os cantos
// recebem uma curva Bézier curta, sem transformar a vegetação em asfalto.
export const createAdminReferenceAerialBezierCurbGuidesV1 = (
  THREE,
  roadTrace,
  worldWidth,
  worldHeight,
  z = 0.06,
) => {
  if (!THREE || !Array.isArray(roadTrace?.roads)) return null;
  const imageWidth = Math.max(1, Number(roadTrace.imageSize?.[0]) || 1672),
    imageHeight = Math.max(1, Number(roadTrace.imageSize?.[1]) || 941),
    toPlane = (point) => [
      (Number(point?.[0]) || 0) / imageWidth - 0.5,
      0.5 - (Number(point?.[1]) || 0) / imageHeight,
    ],
    guides = [];
  const distance = (a, b) => Math.hypot(
    (Number(a?.[0]) || 0) - (Number(b?.[0]) || 0),
    (Number(a?.[1]) || 0) - (Number(b?.[1]) || 0),
  );
  const angleAt = (previous, current, next) => {
    const ax = (Number(previous?.[0]) || 0) - (Number(current?.[0]) || 0),
      ay = (Number(previous?.[1]) || 0) - (Number(current?.[1]) || 0),
      bx = (Number(next?.[0]) || 0) - (Number(current?.[0]) || 0),
      by = (Number(next?.[1]) || 0) - (Number(current?.[1]) || 0),
      aLength = Math.hypot(ax, ay),
      bLength = Math.hypot(bx, by);
    if (aLength < 0.001 || bLength < 0.001) return 0;
    return Math.PI - Math.acos(
      Math.max(-1, Math.min(1, (ax * bx + ay * by) / (aLength * bLength))),
    );
  };
  const addRingGuides = (points, roadIndex, ringType) => {
    if (!Array.isArray(points) || points.length < 3) return;
    for (let index = 0; index < points.length; index++) {
      const previous = points[(index - 1 + points.length) % points.length],
        current = points[index],
        next = points[(index + 1) % points.length],
        incoming = distance(previous, current),
        outgoing = distance(current, next),
        turn = angleAt(previous, current, next);
      // Segmentos menores que meia frente de lote são ruído do trace. Uma
      // esquina só vira Bézier quando as duas retas que a sustentam são
      // realmente longas; isso conserva as ruas extensas perfeitamente retas.
      if (incoming < 8 || outgoing < 8 || turn < (28 * Math.PI) / 180)
        continue;
      const trim = Math.min(9, incoming * 0.24, outgoing * 0.24),
        before = [
          (Number(current[0]) || 0) +
            (((Number(previous[0]) || 0) - (Number(current[0]) || 0)) * trim) /
              incoming,
          (Number(current[1]) || 0) +
            (((Number(previous[1]) || 0) - (Number(current[1]) || 0)) * trim) /
              incoming,
        ],
        after = [
          (Number(current[0]) || 0) +
            (((Number(next[0]) || 0) - (Number(current[0]) || 0)) * trim) /
              outgoing,
          (Number(current[1]) || 0) +
            (((Number(next[1]) || 0) - (Number(current[1]) || 0)) * trim) /
              outgoing,
        ];
      // A cubic with handles tangentes às retas é estável na curva e deixa
      // os trechos de entrada/saída alinhados ao meio-fio fotografado.
      guides.push({
        roadIndex,
        ringType,
        corner: index,
        turn,
        points: [
          before,
          [
            before[0] + (Number(current[0]) - before[0]) * 0.72,
            before[1] + (Number(current[1]) - before[1]) * 0.72,
          ],
          [
            after[0] + (Number(current[0]) - after[0]) * 0.72,
            after[1] + (Number(current[1]) - after[1]) * 0.72,
          ],
          after,
        ],
      });
    }
  };
  roadTrace.roads.forEach((road, roadIndex) => {
    addRingGuides(road.outer, roadIndex, "outer-curb");
    (road.holes || []).forEach((hole, holeIndex) =>
      addRingGuides(hole, roadIndex, `inner-curb-${holeIndex + 1}`),
    );
  });
  guides.sort((a, b) => b.turn - a.turn);
  const selected = guides.slice(0, 48),
    positions = [],
    sampleCount = 12;
  selected.forEach((guide) => {
    for (let step = 0; step <= sampleCount; step++) {
      const t = step / sampleCount,
        inverse = 1 - t,
        p0 = guide.points[0],
        p1 = guide.points[1],
        p2 = guide.points[2],
        p3 = guide.points[3],
        x =
          inverse ** 3 * p0[0] +
          3 * inverse ** 2 * t * p1[0] +
          3 * inverse * t ** 2 * p2[0] +
          t ** 3 * p3[0],
        y =
          inverse ** 3 * p0[1] +
          3 * inverse ** 2 * t * p1[1] +
          3 * inverse * t ** 2 * p2[1] +
          t ** 3 * p3[1],
        [planeX, planeY] = toPlane([x, y]);
      positions.push(planeX, planeY, z);
    }
  });
  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeBoundingSphere();
  geometry.computeLineDistances?.();
  const material = new THREE.LineDashedMaterial({
    color: 0xd9e0e3,
    dashSize: 0.006,
    gapSize: 0.004,
    transparent: true,
    opacity: 0.82,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "Asfalto_tracado_da_imagem__curvas-bezier-meio-fio";
  lines.frustumCulled = false;
  lines.renderOrder = 31;
  lines.userData = {
    publicRoadSurface: true,
    bezierCurbGuides: true,
    bezierGuideCount: selected.length,
    bezierSampling: sampleCount,
    curvePolicy: "somente esquinas; trechos longos permanecem retos",
    curbPolicy: "guias ancoradas nos dois lados do meio-fio vetorial",
    socialAreaBoundary: "limite lateral preservado pela face vetorial do asfalto",
  };
  return lines;
};

// Versão em UV do mesmo traçado. Ela é aplicada diretamente sobre o plano
// aéreo, sem herdar a matriz do GLB; assim o asfalto e a foto compartilham
// exatamente o mesmo referencial, inclusive no renderer administrativo isolado.
export const createAdminReferenceAerialRoadPlaneGeometryV1 = (THREE, roadTrace) => {
  if (!Array.isArray(roadTrace?.roads) || !roadTrace.roads.length) return null;
  const imageWidth = Math.max(1, Number(roadTrace.imageSize?.[0]) || 1672),
    imageHeight = Math.max(1, Number(roadTrace.imageSize?.[1]) || 941),
    toPlane = (point) => [
      (Number(point?.[0]) || 0) / imageWidth - 0.5,
      0.5 - (Number(point?.[1]) || 0) / imageHeight,
    ],
    shapes = [];
  for (const road of roadTrace.roads) {
    const shape = new THREE.Shape();
    if (!appendAdminReferenceAerialCurbPathV1(shape, road.outer, toPlane))
      continue;
    for (const holePoints of road.holes || []) {
      const hole = new THREE.Path();
      if (appendAdminReferenceAerialCurbPathV1(hole, holePoints, toPlane))
        shape.holes.push(hole);
    }
    shapes.push(shape);
  }
  if (!shapes.length) return null;
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.translate(0, 0, 0.035);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, imageWidth, imageHeight };
};

// A seleção de pavimentação usa a própria malha `Asfalto_tracado_do_PDF` já
// projetada no referencial aéreo. Reutilizar seus vértices no modelo escuro
// elimina a segunda triangulação que podia deixar a borda alguns pixels fora
// do contorno selecionado.
export const createAdminReferenceAerialNativeRoadGeometryV1 = (
  THREE,
  roadSource,
  surface,
) => {
  if (
    !THREE ||
    !roadSource?.geometry?.getAttribute?.("position") ||
    !surface?.matrixWorld?.clone
  )
    return null;
  roadSource.updateMatrixWorld?.(true);
  surface.updateMatrixWorld?.(true);
  const transform = surface.matrixWorld
    .clone()
    .invert()
    .multiply(roadSource.matrixWorld);
  const geometry = roadSource.geometry.clone();
  geometry.applyMatrix4(transform);
  geometry.computeBoundingBox?.();
  geometry.computeBoundingSphere?.();
  geometry.userData = {
    ...(geometry.userData || {}),
    nativeRoadContour: true,
    nativeRoadSource: roadSource.name || "Asfalto_tracado_do_PDF",
  };
  return geometry;
};

export const warpAdminGlbToFixedAerialV1 = ({ THREE, source, georef, image, trace, roadTrace }) => {
  if (!THREE || !source || !georef) return null;
  const matrix = georef.alignment.glbToDwgMatrix,
    translation = georef.alignment.translation,
    imageWidth = Math.max(
      1,
      Number(image?.naturalWidth || image?.width) || 1672,
    ),
    imageHeight = Math.max(
      1,
      Number(image?.naturalHeight || image?.height) || 941,
    ),
    // Os traçados foram medidos na referência de 1672×941. A prévia 4K
    // mantém o mesmo enquadramento UV, mas não as mesmas coordenadas em pixels.
    traceWidth = Math.max(1, Number(trace?.imageSize?.[0]) || imageWidth),
    traceHeight = Math.max(1, Number(trace?.imageSize?.[1]) || imageHeight),
    roadWidth = Math.max(1, Number(roadTrace?.imageSize?.[0]) || traceWidth),
    roadHeight = Math.max(1, Number(roadTrace?.imageSize?.[1]) || traceHeight),
    imageAspect = imageWidth / imageHeight,
    worldHeight = ADMIN_REFERENCE_AERIAL_GEO_WORLD_HEIGHT_V1,
    worldWidth = worldHeight * imageAspect,
    sourceBounds = new THREE.Box3().setFromObject(source),
    groundY = Number(sourceBounds.min.y) || 0,
    root = new THREE.Group(),
    worldPoint = new THREE.Vector3();
  let leveledLotMeshes = 0;
  let leveledStreetMeshes = 0;

  root.name = "AliancaParkFixedAerialGeoWarp";
  source.updateMatrixWorld(true);

  source.traverse((node) => {
    if (!node?.isMesh || !node.geometry?.getAttribute?.("position")) return;
    // A área de lazer já está impressa no chão fotográfico. Esta placa opaca
    // do preview cobre a textura e produz o retângulo claro visto no mapa.
    if (node.name === "Area_de_lazer_base") return;
    // Os meios-fios do PDF têm a mesma diferença de proporção da antiga malha
    // de asfalto. A fotografia já contém suas bordas; não as duplicamos.
    if (roadTrace && /^Meio_fio_\d+$/i.test(node.name)) return;
    const hierarchyNames = [];
    for (let parent = node; parent && parent !== source; parent = parent.parent)
      hierarchyNames.push(String(parent.name || ""));
    const imageRoadGeometry =
        roadTrace && node.name === "Asfalto_tracado_do_PDF"
          ? createAdminReferenceAerialRoadGeometryV1(
              THREE, roadTrace, roadWidth, roadHeight, worldWidth, worldHeight,
            )
          : null,
      geometry = imageRoadGeometry || node.geometry.clone(),
      position = geometry.getAttribute("position"),
      lotFootprint = hierarchyNames.some((name) =>
        /^Lote_\d+(?:[_ -]\d+)?$/i.test(name),
      ),
      streetFootprint = hierarchyNames.some((name) =>
        /^(?:Asfalto_tracado_do_PDF|Rua_\d+|Meio_fio_\d+)(?:[_ -]\d+)?$/i.test(name),
      ),
      tracedPolygon = lotFootprint ? trace?.lots?.[node.name] : null,
      useTracedPolygon =
        Array.isArray(tracedPolygon) && tracedPolygon.length === position.count;
    if (lotFootprint) leveledLotMeshes++;
    if (streetFootprint) leveledStreetMeshes++;
    for (let index = 0; index < position.count && !imageRoadGeometry; index++) {
      worldPoint
        .fromBufferAttribute(position, index)
        .applyMatrix4(node.matrixWorld);
      const glbX = Number(worldPoint.x) || 0,
        glbNorthAxis = -(Number(worldPoint.z) || 0),
        east =
          Number(matrix[0][0]) * glbX +
          Number(matrix[0][1]) * glbNorthAxis +
          Number(translation[0]),
        north =
          Number(matrix[1][0]) * glbX +
          Number(matrix[1][1]) * glbNorthAxis +
          Number(translation[1]),
        uv = projectAdminReferenceUtmToUvV1(east, north);
      if (!uv) continue;
      if (useTracedPolygon) {
        const point = tracedPolygon[index];
        if (Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
          uv.u = point[0] / traceWidth;
          uv.v = point[1] / traceHeight;
        } else applyAdminReferenceAerialImageTraceV1(uv, trace, traceWidth, traceHeight);
      } else if (trace) applyAdminReferenceAerialImageTraceV1(uv, trace, traceWidth, traceHeight);
      else applyAdminReferenceAerialResidualWarpV2(uv);
      position.setXYZ(
        index,
        (uv.u - 0.5) * worldWidth,
        (0.5 - uv.v) * worldHeight,
        lotFootprint
          ? 0.06
          : streetFootprint
            ? 0.03
            : (Number(worldPoint.y) - groundY) *
              ADMIN_REFERENCE_AERIAL_GEO_VERTICAL_SCALE_V1,
      );
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();

    const mesh = new THREE.Mesh(
      geometry,
      cloneAdminMaterialWithoutTexturesV1(THREE, node.material),
    );
    mesh.name = node.name;
    mesh.userData = { ...(node.userData || {}) };
    mesh.renderOrder = Number(node.renderOrder) || 0;
    mesh.visible = node.visible !== false;
    mesh.frustumCulled = node.frustumCulled !== false;
    root.add(mesh);
  });

  root.userData.adminReferenceAerialGeoWarp = {
    version: ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
    epsg: Number(georef?.crs?.epsg) || 31984,
    worldWidth,
    worldHeight,
    imageWidth,
    imageHeight,
    source: DWG_GEOREFERENCE_URL,
    leveledLotMeshes,
    leveledStreetMeshes,
  };
  root.updateMatrixWorld(true);
  return root;
};
const PDF_MASTERPLAN_UNDERLAY_ASSET =
  "/assets/public/alianca-park-masterplan-static-v535-no-photo.webp";
const PDF_MASTERPLAN_UNDERLAY_VERSION = "pdf-underlay-photo-removed-v1";
const PDF_MASTERPLAN_3D_LAYER_VERSION = "pdf-derived-elements-v1";
export const PDF_MASTERPLAN_MODEL_TEXTURE_VERSION = "semantic-model-map-texture-v1";
export const PDF_MODEL_TEXTURE_BRIGHTNESS = 1.35;
// Referência aérea aprovada pelo usuário. Ela é a única imagem de implantação
// usada no dashboard: lotes e ruas não recebem uma segunda cópia texturizada.
export const ADMIN_REFERENCE_AERIAL_ASSET_V1 =
  "/assets/public/alianca-park-aerial-realistic-preview-v2.jpg";
export const ADMIN_AERIAL_ZOOM_TILE_ROOT_V1 =
  "/assets/public/alianca-park-aerial-realistic-tiles-v2";
export const ADMIN_AERIAL_ZOOM_TILE_GRID_V1 = { cols: 5, rows: 3 };
export const ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1 = { width: 19200, height: 10805 };
export const ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2 = 1.3;
export const ADMIN_AERIAL_TILE_SWAP_RATIO_V2 = 1.5;
export const ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1 =
  "aerial-image UV 0..1 · origin top-left · world XY projected to the same base plane";
export const ADMIN_REFERENCE_AERIAL_VERSION_V1 =
  "admin-reference-aerial-realistic-preview-v2";
export const ADMIN_SEMANTIC_3D_LAYER_VERSION_V1 = "semantic-elements-only-v2";
export const ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1 =
  "full-image-3d-environment-v2";
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1 = 96;
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1 = 54;
// A implantação ocupa esta janela na referência aérea expandida. Manter a
// calibração separada da versão histórica permite comparar a cena sem
// reintroduzir o recorte estreito que deslocava os blocos inferiores.
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2 = {
  left: 0.268,
  top: 0.078,
  right: 0.721,
  bottom: 0.704,
};
// A foto aérea deve ser um plano de referência exato sob o GLB.
// Relevo sintético introduzia discrepância visual entre textura e geometria.
export const ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2 = 0;
// Janela visual do loteamento dentro da imagem 16:9. O enquadramento é
// preservado por contain/projeção, sem deformar a fotografia para o envelope
// do modelo.
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1 = {
  left: 0.315,
  top: 0.07,
  right: 0.646,
  bottom: 0.771,
};
export const ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1 = 1.15;
// Ajuste fino solicitado para encaixar os últimos lotes na borda superior.
// Como o PDF usa origem no topo, somar V faz o conteúdo da textura subir sobre
// a geometria sem deslocar o modelo 3D nem alterar suas proporções.
export const PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1 = 0.018;
// A prancha é uma página completa; o loteamento ocupa apenas a faixa central
// dela. Manter esse frame separado evita esticar logo, margens e texto até o
// envelope do GLB e permite que a página completa continue visível no mapa.
export const PDF_MASTERPLAN_PAGE_SIZE_V1 = { width: 1800, height: 2098 };
export const PDF_MASTERPLAN_SITE_FRAME_V1 = {
  left: 0.1,
  top: 0.045,
  right: 0.935,
  bottom: 0.945,
};
// Âncoras dos veículos visíveis na prancha. Cada caixa recebe um recorte da
// própria textura do PDF; a geometria nativa continua sendo a referência para
// lotes, vias, árvores e equipamentos. Coordenadas em UV da página completa.
export const PDF_MASTERPLAN_VEHICLE_ANCHORS_V1 = [
  { u: 0.442, v: 0.42, angle: -0.82 },
  { u: 0.455, v: 0.436, angle: -0.82 },
  { u: 0.469, v: 0.452, angle: -0.82 },
  { u: 0.482, v: 0.468, angle: -0.82 },
  { u: 0.558, v: 0.508, angle: 0.72 },
  { u: 0.571, v: 0.526, angle: 0.72 },
  { u: 0.584, v: 0.544, angle: 0.72 },
  { u: 0.596, v: 0.561, angle: 0.72 },
  { u: 0.358, v: 0.579, angle: -0.82 },
  { u: 0.375, v: 0.595, angle: -0.82 },
  { u: 0.392, v: 0.611, angle: -0.82 },
  { u: 0.409, v: 0.627, angle: -0.82 },
  { u: 0.427, v: 0.644, angle: -0.82 },
  { u: 0.445, v: 0.66, angle: -0.82 },
];
// Janela solar calculada a partir do centro geográfico oficial do DWG. O
// manifesto pode substituir esse fallback assim que terminar de carregar.
