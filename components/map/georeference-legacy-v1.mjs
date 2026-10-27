import { runtimeRouteV1 } from "../shared/routing.mjs";
import {
  appendAdminReferenceAerialCurbPathV1 as appendAdminReferenceAerialCurbPathTsV1,
  createAdminReferenceAerialBezierCurbGuidesV1 as createAdminReferenceAerialBezierCurbGuidesTsV1,
  createAdminReferenceAerialNativeRoadGeometryV1 as createAdminReferenceAerialNativeRoadGeometryTsV1,
  createAdminReferenceAerialRoadPlaneGeometryV1 as createAdminReferenceAerialRoadPlaneGeometryTsV1,
  buildAdminReferenceAerialRasterMaskModelV1 as buildAdminReferenceAerialRasterMaskModelTsV1,
  warpAdminGlbToFixedAerialV1 as warpAdminGlbToFixedAerialTsV1,
} from "../../dist/frontend/components.js";
import {
  applyAdminReferenceAerialImageTraceV1 as applyAdminReferenceAerialImageTraceTsV1,
  applyAdminReferenceAerialResidualWarpV2 as applyAdminReferenceAerialResidualWarpTsV1,
  pointInsideAdminReferenceAerialQuadV1 as pointInsideAdminReferenceAerialQuadTsV1,
  projectAdminMapGeoreferenceConfigV1,
  loadAdminDwgGeoreferenceV1 as loadAdminDwgGeoreferenceTsV1,
  projectPublicAdminUtmToUv as projectPublicAdminUtmToUvTsV1,
  projectPublicCanonicalLotTrace as projectPublicCanonicalLotTraceTsV1,
  publicMapPolygonCentroid as publicMapPolygonCentroidTsV1,
} from "../../dist/frontend/program.js";

const ADMIN_MAP_GEOREFERENCE_CONFIG_V1 = projectAdminMapGeoreferenceConfigV1();
const ADMIN_MAP_GEOREFERENCE_SCENE_V1 = ADMIN_MAP_GEOREFERENCE_CONFIG_V1.scene;
const ADMIN_MAP_PROJECTION_V1 = ADMIN_MAP_GEOREFERENCE_CONFIG_V1.projection;

export const DWG_GEOREFERENCE_URL = runtimeRouteV1(
  ADMIN_MAP_GEOREFERENCE_SCENE_V1.dwgGeoreferencePath,
  "v=dwg-georef-v1",
);
// BELAVISTA_ADMIN_FIXED_AERIAL_GEO_WARP_V1
// A fotografia administrativa é uma referência fixa/perspectivada. Em vez de
// girar/escalar o GLB "no olho", o chão do GLB é levado primeiro ao UTM oficial
// do DWG e, em seguida, projetado na imagem por uma homografia calibrada uma vez
// contra a própria referência aérea fornecida.
//
// Coordenadas: EPSG:31984 (Easting, Northing) -> UV da imagem (origem top-left).
export const PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1 = ADMIN_MAP_PROJECTION_V1.pdfLotTraceSatelliteAlignment;

export const polygonCentroidV1 = (polygon) => publicMapPolygonCentroidTsV1(polygon);

export const projectCanonicalLotTraceToMasterplanOverlayUvV1 = (point, imageSize = []) =>
  projectPublicCanonicalLotTraceTsV1({ x: Number(point?.x), y: Number(point?.y) }, imageSize);
export const ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1 = {
  ...ADMIN_MAP_PROJECTION_V1.aerialGeoQuadUv,
};
export const ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 = { ...ADMIN_MAP_PROJECTION_V1.masterplanSatelliteFrame };
// Marcadores que a revisão visual identificou como áreas de rua, canteiro ou
// retângulos sem lote comercializável. Eles não devem ser exibidos, clicáveis
// nem permanecer disponíveis para calibração até existir geometria oficial.
export const INVALID_MASTERPLAN_LOT_IDS_V1 = new Set(ADMIN_MAP_PROJECTION_V1.invalidMasterplanLotIds);
// Revisão visual: estes traçados são somente as bordas de retângulos que
// ficaram pouco visíveis no recorte. Não criam lote, marcador ou interação.
const MASTERPLAN_VISUAL_RECOVERY_LOT_IDS_V1 = new Set(ADMIN_MAP_GEOREFERENCE_CONFIG_V1.visualRecoveryLotIds);
// Unidades cuja área precisa vir do traçado canônico da prancha, pois o
// preenchimento verde/fatiamento automático não descreve seu retângulo.
export const MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1 = new Set(ADMIN_MAP_PROJECTION_V1.geometryRepairLotIds);
// Os polígonos abaixo fazem parte da prancha, mas não representam unidades
// comercializáveis. Eles permanecem disponíveis como áreas compartilhadas do
// empreendimento, sem receber numeração ou ações de lote.
export const MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1 = new Set(ADMIN_MAP_PROJECTION_V1.commonAreaSourceIds);
export const MASTERPLAN_COMMON_AREA_LABEL_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.commonAreaLabel;
const ADMIN_REFERENCE_AERIAL_GEO_WORLD_HEIGHT_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.worldHeight;
const ADMIN_REFERENCE_AERIAL_GEO_VERTICAL_SCALE_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.verticalScale;
export const ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.geoWarpVersion;
export const ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialLotTraceUrl;
// Polígonos extraídos da própria arte transparente aplicada no mapa
// administrativo. Diferente do traçado aéreo (horizontal), esta fonte usa a
// mesma tela vertical do masterplan; portanto seus hit-areas não sofrem a
// distorção criada ao normalizar os dois arquivos em um mesmo retângulo.
export const ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.masterplanLotPolygonsUrl;
// Centros de etiquetas lidos na prancha comercial oficial. Esta fonte é a
// autoridade para o número visível e substitui os IDs sequenciais do GLB,
// que também continham ruas, áreas comuns e reservas como se fossem lotes.
export const PDF_LOT_LABELS_URL_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfLotLabelsUrl;
// Relação entre o número oficial da prancha e a área verde correspondente.
// Os IDs do arquivo de polígonos são apenas IDs técnicos da segmentação; não
// podem ser usados como numeração comercial dos lotes.
export const PDF_LOT_GREEN_MAPPING_URL_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfLotGreenMappingUrl;
// Registro geométrico entre o traçado canônico (GLB/DWG, 298 unidades) e a
// prancha vertical aplicada sobre o satélite. O mapeamento anterior partia de
// círculos extraídos do PDF e acabava associando retângulos de borda a números
// vizinhos. Este registro preserva a identidade espacial, inclusive quando a
// arte perde o preenchimento verde do lote.
export const CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1 = ADMIN_MAP_PROJECTION_V1.canonicalLotTraceOverlayAlignment;
export const ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.roadTraceUrl;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_ENABLED_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.enabled;
export const ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.version;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_X_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.grid.x;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_Y_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.grid.y;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_WIDTH_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.sampleSize.width;
const ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_HEIGHT_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.rasterMask.sampleSize.height;

const projectAdminReferenceUtmToUvV1 = (east, north) => {
  if (typeof globalThis.belavistaProjectAdminUtmToUv === "function")
    return globalThis.belavistaProjectAdminUtmToUv(east, north);
  return projectPublicAdminUtmToUvTsV1(east, north);
};

// Fine-tune residual APÓS a homografia oficial.
// O georreferenciamento GLB→UTM continua sendo a base; estes deltas corrigem
// somente a pequena diferença projetiva observada na fotografia aérea fixa.
// Valores em UV: 0.01 ~= 1% da largura/altura da imagem.
const applyAdminReferenceAerialResidualWarpV2 = applyAdminReferenceAerialResidualWarpTsV1;
const applyAdminReferenceAerialImageTraceV1 = applyAdminReferenceAerialImageTraceTsV1;
const pointInsideAdminReferenceAerialQuadV1 = pointInsideAdminReferenceAerialQuadTsV1;

export const buildAdminReferenceAerialRasterMaskModelV1 = ({ THREE, image, texture }) =>
  buildAdminReferenceAerialRasterMaskModelTsV1({
    THREE,
    image,
    texture,
    enabled: ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_ENABLED_V1,
    sampleSize: {
      width: ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_WIDTH_V1,
      height: ADMIN_REFERENCE_AERIAL_RASTER_MASK_SAMPLE_HEIGHT_V1,
    },
    grid: {
      x: ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_X_V1,
      y: ADMIN_REFERENCE_AERIAL_RASTER_MASK_GRID_Y_V1,
    },
    version: ADMIN_REFERENCE_AERIAL_RASTER_MASK_MODEL_VERSION_V1,
    source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
    pointInsideQuad: pointInsideAdminReferenceAerialQuadV1,
    documentRef: globalThis.document,
    consoleRef: globalThis.console,
  });

export const loadAdminDwgGeoreferenceV1 = () =>
  loadAdminDwgGeoreferenceTsV1(DWG_GEOREFERENCE_URL);

// A malha principal das ruas é vetorial e usa os contornos dos meio-fios como
// limites. A máscara raster fica somente como recurso auxiliar/fallback.
export const appendAdminReferenceAerialCurbPathV1 = appendAdminReferenceAerialCurbPathTsV1;

// O contorno principal continua sendo o meio-fio vetorial. Estas guias são
// somente a leitura visual das mudanças de direção: ruas longas continuam
// sendo segmentos retos e fechados pelo mesmo polígono, enquanto os cantos
// recebem uma curva Bézier curta, sem transformar a vegetação em asfalto.
export const createAdminReferenceAerialBezierCurbGuidesV1 = createAdminReferenceAerialBezierCurbGuidesTsV1;

// Versão em UV do mesmo traçado. Ela é aplicada diretamente sobre o plano
// aéreo, sem herdar a matriz do GLB; assim o asfalto e a foto compartilham
// exatamente o mesmo referencial, inclusive no renderer administrativo isolado.
export const createAdminReferenceAerialRoadPlaneGeometryV1 = createAdminReferenceAerialRoadPlaneGeometryTsV1;

// A seleção de pavimentação usa a própria malha `Asfalto_tracado_do_PDF` já
// projetada no referencial aéreo. Reutilizar seus vértices no modelo escuro
// elimina a segunda triangulação que podia deixar a borda alguns pixels fora
// do contorno selecionado.
export const createAdminReferenceAerialNativeRoadGeometryV1 = createAdminReferenceAerialNativeRoadGeometryTsV1;

export const warpAdminGlbToFixedAerialV1 = (input = {}) =>
  warpAdminGlbToFixedAerialTsV1({
    ...input,
    worldHeight: ADMIN_REFERENCE_AERIAL_GEO_WORLD_HEIGHT_V1,
    verticalScale: ADMIN_REFERENCE_AERIAL_GEO_VERTICAL_SCALE_V1,
    warpVersion: ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
    dwgUrl: DWG_GEOREFERENCE_URL,
    projectUtmToUv: projectAdminReferenceUtmToUvV1,
    applyImageTrace: applyAdminReferenceAerialImageTraceV1,
    applyResidualWarp: applyAdminReferenceAerialResidualWarpV2,
  });
const PDF_MASTERPLAN_UNDERLAY_ASSET = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.underlayAsset;
const PDF_MASTERPLAN_UNDERLAY_VERSION = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.underlayVersion;
const PDF_MASTERPLAN_3D_LAYER_VERSION = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.threeDLayerVersion;
export const PDF_MASTERPLAN_MODEL_TEXTURE_VERSION = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.modelTextureVersion;
export const PDF_MODEL_TEXTURE_BRIGHTNESS = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.modelTextureBrightness;
// Referência aérea aprovada pelo usuário. Ela é a única imagem de implantação
// usada no dashboard: lotes e ruas não recebem uma segunda cópia texturizada.
export const ADMIN_REFERENCE_AERIAL_ASSET_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.asset;
export const ADMIN_AERIAL_ZOOM_TILE_ROOT_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.zoomTileRoot;
export const ADMIN_AERIAL_ZOOM_TILE_GRID_V1 = { ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.zoomTileGrid };
export const ADMIN_AERIAL_ZOOM_TILE_PIXELS_V1 = { ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.zoomTilePixels };
export const ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.tilePrefetchRatio;
export const ADMIN_AERIAL_TILE_SWAP_RATIO_V2 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.tileSwapRatio;
export const ADMIN_REFERENCE_AERIAL_SEMANTIC_COORDINATE_SYSTEM_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.semanticCoordinateSystem;
export const ADMIN_REFERENCE_AERIAL_VERSION_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.version;
export const ADMIN_SEMANTIC_3D_LAYER_VERSION_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.semanticLayerVersion;
export const ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.environmentVersion;
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.terrainSegments.x;
export const ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.terrainSegments.y;
// A implantação ocupa esta janela na referência aérea expandida. Manter a
// calibração separada da versão histórica permite comparar a cena sem
// reintroduzir o recorte estreito que deslocava os blocos inferiores.
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2 = {
  ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.siteFrameV2,
};
// A foto aérea deve ser um plano de referência exato sob o GLB.
// Relevo sintético introduzia discrepância visual entre textura e geometria.
export const ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.reliefAmplitudeV2;
// Janela visual do loteamento dentro da imagem 16:9. O enquadramento é
// preservado por contain/projeção, sem deformar a fotografia para o envelope
// do modelo.
export const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1 = {
  ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.siteFrameV1,
};
export const ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.aerialReference.displayScale;
// Ajuste fino solicitado para encaixar os últimos lotes na borda superior.
// Como o PDF usa origem no topo, somar V faz o conteúdo da textura subir sobre
// a geometria sem deslocar o modelo 3D nem alterar suas proporções.
export const PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.textureShiftUp;
// A prancha é uma página completa; o loteamento ocupa apenas a faixa central
// dela. Manter esse frame separado evita esticar logo, margens e texto até o
// envelope do GLB e permite que a página completa continue visível no mapa.
export const PDF_MASTERPLAN_PAGE_SIZE_V1 = { ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.pageSize };
export const PDF_MASTERPLAN_SITE_FRAME_V1 = {
  ...ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.siteFrame,
};
// Âncoras dos veículos visíveis na prancha. Cada caixa recebe um recorte da
// própria textura do PDF; a geometria nativa continua sendo a referência para
// lotes, vias, árvores e equipamentos. Coordenadas em UV da página completa.
export const PDF_MASTERPLAN_VEHICLE_ANCHORS_V1 = ADMIN_MAP_GEOREFERENCE_SCENE_V1.pdfMasterplan.vehicleAnchors.map((anchor) => ({ ...anchor }));
// Janela solar calculada a partir do centro geográfico oficial do DWG. O
// manifesto pode substituir esse fallback assim que terminar de carregar.
